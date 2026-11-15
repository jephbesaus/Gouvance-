const r = require('express').Router(); const bcrypt = require('bcryptjs'); const crypto = require('crypto'); const jwt = require('jsonwebtoken');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth, need, pin6, sign, qrSig } = require('../util');
const scopeOf = q => { const ro = q.user.roles; return [ro.some(x => ['admin', 'bourgmestre', 'recenseur'].includes(x.role)), ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), ro.filter(x => x.role === 'chef_quartier').map(x => x.scope)]; };
const STAFF = ['recenseur', 'admin', 'bourgmestre', 'chef_avenue', 'chef_quartier'];
const FEE = () => +process.env.CENSUS_FEE_CDF || 1000;
const kindOf = p => { const x = String(p || '').toLowerCase().trim(); if (/^p[eè]re/.test(x)) return 'father'; if (/^m[eè]re/.test(x)) return 'mother'; if (/^enfant/.test(x)) return 'child'; return 'other'; };
const isoDate = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null);
// Code famille : FM + 9 chiffres tirés au hasard (impossible à deviner de proche en proche)
const genCode = async c => { for (let i = 0; i < 12; i++) { const code = 'FM' + String(crypto.randomInt(0, 1e9)).padStart(9, '0'); if (!(await c.query('SELECT 1 FROM families WHERE code=$1', [code])).rowCount) return code; } throw fail(500, 'Réessayez'); };
const famFromToken = t => { try { return jwt.verify(t, process.env.JWT_SECRET).family; } catch { throw fail(401, 'Session famille expirée'); } };

// Le recenseur enregistre une famille : la fiche est payée avec SON portefeuille (1000 FC par défaut)
r.post('/families', auth, need('recenseur'), wrap(async (q, s) => {
  const b = q.body; const { family_name, members } = b;
  if (!family_name || !Array.isArray(members) || !members.length) throw fail(400, 'Données famille incomplètes');
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(b.wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect');
  const pin = pin6(); const c = await db.connect();
  try {
    await c.query('BEGIN');
    const code = await genCode(c);
    const { rows: [f] } = await c.query(`INSERT INTO families(code,pin_hash,family_name,province,ville,commune,avenue,quartier,phone,occupant,photo_url,chef_name,fait_a,enumerator_id,signature,paid,paid_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,now()) RETURNING id,code`,
      [code, await bcrypt.hash(pin, 10), family_name, b.province, b.ville, b.commune, b.avenue, b.quartier, b.phone, b.occupant, b.photo_url, b.chef_name, b.fait_a, q.user.id, String(b.signature || '').slice(0, 20000)]);
    for (const m of members) {
      if (!m.full_name) continue;
      await c.query('INSERT INTO family_members(family_id,kind,position,full_name,gender,birth_date,birth_place,profession,nationality,observation,photo_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [f.id, kindOf(m.position), m.position, m.full_name, ['M', 'F'].includes(m.gender) ? m.gender : null, isoDate(m.birth_date), m.birth_place, m.profession, m.nationality || 'Congolaise', m.observation, m.photo_url]);
    }
    const tx = await L.pay(c, q.user.id, FEE(), 'census_fee', f.id);
    await c.query(`INSERT INTO notifications(user_id,title,body,data) SELECT user_id,'Nouvelle famille recensée',$1,$2::jsonb FROM user_roles WHERE role='chef_avenue' AND scope=lower($3)`, [family_name + ' (' + code + ')', JSON.stringify({ type: 'census' }), b.avenue || '']);
    await c.query('COMMIT'); s.json({ code: f.code, pin, fee: FEE(), tx });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
// Historique des recensements du recenseur (l'admin voit tout) + recherche
r.get('/history', auth, need('recenseur', 'admin'), wrap(async (q, s) => s.json((await db.query(`SELECT f.code,f.family_name,f.avenue,f.quartier,f.created_at,(SELECT count(*)::int FROM family_members m WHERE m.family_id=f.id) AS membres FROM families f WHERE ($2 OR f.enumerator_id=$1) AND ($3::text IS NULL OR f.family_name ILIKE '%'||$3||'%' OR f.code ILIKE $3||'%') ORDER BY f.created_at DESC LIMIT 60`, [q.user.id, q.user.roles.some(x => x.role === 'admin'), q.query.q || null])).rows)));
// Vérifier si une famille a déjà été recensée (même par un autre recenseur)
r.get('/check/:code', auth, need(...STAFF), wrap(async (q, s) => {
  const { rows: [f] } = await db.query('SELECT f.code,f.family_name,f.avenue,f.quartier,f.commune,f.created_at,u.full_name AS recenseur FROM families f LEFT JOIN users u ON u.id=f.enumerator_id WHERE f.code=$1', [String(q.params.code).trim().toUpperCase()]);
  s.json(f ? { found: true, ...f } : { found: false, message: "Cette famille n'a pas encore été recensée" });
}));
r.get('/search', auth, need(...STAFF), wrap(async (q, s) => {
  const { code, phone } = q.query;
  const { rows } = await db.query(`SELECT code,family_name,commune,avenue,quartier,paid FROM families WHERE (($1::text IS NOT NULL AND code=$1) OR ($2::text IS NOT NULL AND phone=$2)) AND ($3 OR lower(avenue)=ANY($4) OR lower(quartier)=ANY($5)) LIMIT 20`, [code ? code.trim().toUpperCase() : null, phone || null, ...scopeOf(q)]);
  s.json(rows.length ? rows : { message: 'Aucun résultat trouvé' });
}));
const MCOLS = 'id,kind,position,full_name,gender,birth_date,birth_place,profession,nationality,observation,photo_url,deceased';
const ORD = "ORDER BY CASE kind WHEN 'father' THEN 1 WHEN 'mother' THEN 2 WHEN 'child' THEN 3 ELSE 4 END, id";
r.get('/families/:code', auth, need(...STAFF), wrap(async (q, s) => {
  const { rows: [f] } = await db.query('SELECT f.id,f.code,f.family_name,f.province,f.ville,f.commune,f.avenue,f.quartier,f.phone,f.occupant,f.photo_url,f.chef_name,f.fait_a,f.signature,f.paid,f.paid_at,f.created_at,u.full_name AS recenseur FROM families f LEFT JOIN users u ON u.id=f.enumerator_id WHERE f.code=$1 AND ($2 OR lower(f.avenue)=ANY($3) OR lower(f.quartier)=ANY($4))', [q.params.code, ...scopeOf(q)]);
  if (!f) throw fail(404, 'Aucun résultat trouvé');
  const { rows: members } = await db.query(`SELECT ${MCOLS} FROM family_members WHERE family_id=$1 ${ORD}`, [f.id]);
  s.json({ ...f, members, qr: f.paid ? 'GVFAM:' + f.code + '.' + qrSig(f.code) : null });
}));
r.post('/members/:id/deceased', auth, need(...STAFF), wrap(async (q, s) => {
  const [wide, av, qu] = scopeOf(q);
  const { rowCount } = await db.query('UPDATE family_members m SET deceased=true FROM families f WHERE m.id=$1 AND f.id=m.family_id AND ($2 OR lower(f.avenue)=ANY($3) OR lower(f.quartier)=ANY($4))', [q.params.id, wide, av, qu]);
  if (!rowCount) throw fail(403, 'Introuvable ou hors de votre zone'); s.json({ ok: true });
}));
// Scan d'un QR (famille ou personne) : le QR est signé, un QR falsifié ne donne rien
r.get('/verify/:code', auth, need(...STAFF, 'agent_salongo'), wrap(async (q, s) => {
  const [code, sig] = String(q.params.code).split('.');
  if (!code || !sig || sig !== qrSig(code)) return s.json({ message: 'Aucun résultat trouvé' });
  if (/^M[0-9a-f-]{36}$/.test(code)) {
    const { rows: [m] } = await db.query('SELECT m.full_name,m.position,m.gender,m.birth_date,m.photo_url,f.code,f.family_name,f.avenue,f.quartier FROM family_members m JOIN families f ON f.id=m.family_id WHERE m.id=$1 AND f.paid', [code.slice(1)]);
    return s.json(m ? { status: 'Actif', type: 'person', ...m } : { message: 'Aucun résultat trouvé' });
  }
  const { rows: [f] } = await db.query('SELECT code,family_name,avenue,quartier FROM families WHERE code=$1 AND paid', [code]);
  s.json(f ? { status: 'Actif', type: 'family', ...f } : { message: 'Aucun résultat trouvé' });
}));
// Connexion de la famille (ID FM + PIN)
r.post('/family-login', wrap(async (q, s) => {
  const { rows: [f] } = await db.query('SELECT f.*, u.full_name AS recenseur FROM families f LEFT JOIN users u ON u.id=f.enumerator_id WHERE f.code=$1', [String(q.body.code || '').trim().toUpperCase()]);
  if (!f || !(await bcrypt.compare(String(q.body.pin), f.pin_hash))) throw fail(401, 'ID ou PIN de la famille incorrect');
  const { rows: members } = await db.query(`SELECT ${MCOLS} FROM family_members WHERE family_id=$1 ${ORD}`, [f.id]);
  s.json({ code: f.code, family_name: f.family_name, province: f.province, ville: f.ville, commune: f.commune, avenue: f.avenue, quartier: f.quartier, occupant: f.occupant, photo_url: f.photo_url, chef_name: f.chef_name, fait_a: f.fait_a,
    signature: f.signature, recenseur: f.recenseur, created_at: f.created_at, paid: f.paid, paid_at: f.paid_at, qr: f.paid ? 'GVFAM:' + f.code + '.' + qrSig(f.code) : null, fee: FEE(),
    members: members.map(m => ({ ...m, qr: f.paid ? 'GVMEM:M' + m.id + '.' + qrSig('M' + m.id) : null })), token: sign({ family: f.id }, '12h') });
}));
r.post('/pay', auth, wrap(async (q, s) => {
  const fam = famFromToken(q.body.family_token);
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(q.body.wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [f] } = await c.query('SELECT id,code,paid FROM families WHERE id=$1 FOR UPDATE', [fam]);
    if (f.paid) throw fail(400, 'Carte déjà vérifiée');
    const code = await L.pay(c, q.user.id, FEE(), 'census_fee', f.id);
    await c.query('UPDATE families SET paid=true, paid_at=now() WHERE id=$1', [f.id]); await c.query('COMMIT');
    s.json({ ok: true, message: `Félicitations, la carte de la famille ${f.code} est vérifiée.`, code });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
r.get('/public-families', auth, wrap(async (q, s) => s.json((await db.query(`SELECT f.code,f.family_name,f.commune,f.avenue,f.quartier,f.paid,(SELECT count(*)::int FROM family_members m WHERE m.family_id=f.id) AS membres FROM families f WHERE ($1::text IS NULL OR f.family_name ILIKE '%'||$1||'%' OR f.code=$1) ORDER BY f.created_at DESC LIMIT 40`, [q.query.q || null])).rows)));
r.post('/family/post', auth, wrap(async (q, s) => {
  const fam = famFromToken(q.body.family_token); const { body, image_url } = q.body; if (!fam || (!body && !image_url)) throw fail(400, 'Publication vide');
  await db.query("INSERT INTO posts(user_id,family_id,kind,body,image_url) VALUES(NULL,$1,'post',$2,$3)", [fam, body, image_url]); s.json({ ok: true });
}));
// Contacter le chef d'avenue : problème, décès, naissance, mariage, incendie, innovation...
const KINDS = ['probleme', 'deces', 'naissance', 'mariage', 'incendie', 'innovation', 'autre'];
r.post('/family/report', auth, wrap(async (q, s) => {
  const fam = famFromToken(q.body.family_token); const { kind, body } = q.body;
  if (!KINDS.includes(kind) || !String(body || '').trim()) throw fail(400, 'Message invalide');
  const { rows: [f] } = await db.query('SELECT family_name,code,avenue,quartier,commune FROM families WHERE id=$1', [fam]);
  await db.query('INSERT INTO reports(family_id,kind,body,avenue,quartier,commune) VALUES($1,$2,$3,$4,$5,$6)', [fam, kind, String(body).trim(), f.avenue, f.quartier, f.commune]);
  await db.query(`INSERT INTO notifications(user_id,title,body,data) SELECT user_id,$1,$2,$3::jsonb FROM user_roles WHERE (role='chef_avenue' AND scope=lower($4)) OR (role='chef_quartier' AND scope=lower($5))`, ['Message de la famille ' + f.family_name, String(body).trim().slice(0, 120), JSON.stringify({ type: 'report' }), f.avenue || '', f.quartier || '']);
  s.json({ ok: true });
}));
r.get('/tabs', auth, wrap(async (q, s) => s.json((await db.query('SELECT id,title,body FROM admin_tabs ORDER BY id')).rows)));
module.exports = r;
