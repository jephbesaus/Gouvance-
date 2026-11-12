const r = require('express').Router(); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth, need, pin6, sign, qrSig } = require('../util');
// Périmètre de l'utilisateur : [accès large, avenues, quartiers]
const scopeOf = q => { const ro = q.user.roles; return [ro.some(x => ['admin', 'bourgmestre', 'recenseur'].includes(x.role)), ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), ro.filter(x => x.role === 'chef_quartier').map(x => x.scope)]; };
const STAFF = ['recenseur', 'admin', 'bourgmestre', 'chef_avenue', 'chef_quartier'];

// Le recenseur enregistre une famille -> code G+9 chiffres + PIN (affiché une seule fois)
r.post('/families', auth, need('recenseur'), wrap(async (q, s) => {
  const { family_name, commune, avenue, quartier, phone, members } = q.body;
  if (!family_name || !Array.isArray(members) || !members.length) throw fail(400, 'Données famille incomplètes');
  const pin = pin6(); const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [f] } = await c.query('INSERT INTO families(pin_hash,family_name,commune,avenue,quartier,phone,enumerator_id,signature) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,code', [await bcrypt.hash(pin, 10), family_name, commune, avenue, quartier, phone, q.user.id, String(q.body.signature || '').slice(0, 20000)]);
    for (const m of members) await c.query('INSERT INTO family_members(family_id,kind,full_name,gender,birth_date,photo_url) VALUES($1,$2,$3,$4,$5,$6)', [f.id, m.kind, m.full_name, m.gender, m.birth_date, m.photo_url]);
    await c.query('COMMIT'); s.json({ code: f.code, pin });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

// Recherche par code famille ou par téléphone (récupération), limitée à la zone de l'utilisateur
r.get('/search', auth, need(...STAFF), wrap(async (q, s) => {
  const { code, phone } = q.query;
  const { rows } = await db.query(`SELECT code,family_name,commune,avenue,quartier,paid FROM families WHERE (($1::text IS NOT NULL AND code=$1) OR ($2::text IS NOT NULL AND phone=$2)) AND ($3 OR lower(avenue)=ANY($4) OR lower(quartier)=ANY($5)) LIMIT 20`, [code || null, phone || null, ...scopeOf(q)]);
  s.json(rows.length ? rows : { message: 'Aucun résultat trouvé' });
}));
r.get('/families/:code', auth, need(...STAFF), wrap(async (q, s) => {
  const { rows: [f] } = await db.query('SELECT id,code,family_name,commune,avenue,quartier,phone,paid FROM families WHERE code=$1 AND ($2 OR lower(avenue)=ANY($3) OR lower(quartier)=ANY($4))', [q.params.code, ...scopeOf(q)]);
  if (!f) throw fail(404, 'Aucun résultat trouvé');
  const { rows: members } = await db.query('SELECT id,kind,full_name,photo_url,deceased FROM family_members WHERE family_id=$1 ORDER BY kind DESC', [f.id]); s.json({ ...f, members });
}));

// Déclarer un décès (l'enregistrement reste dans le système) : limité à la zone du chef
r.post('/members/:id/deceased', auth, need(...STAFF), wrap(async (q, s) => {
  const ro = q.user.roles; const wide = ro.some(x => ['admin', 'bourgmestre', 'recenseur'].includes(x.role));
  const av = ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), qu = ro.filter(x => x.role === 'chef_quartier').map(x => x.scope);
  const { rowCount } = await db.query('UPDATE family_members m SET deceased=true FROM families f WHERE m.id=$1 AND f.id=m.family_id AND ($2 OR lower(f.avenue)=ANY($3) OR lower(f.quartier)=ANY($4))', [q.params.id, wide, av, qu]);
  if (!rowCount) throw fail(403, 'Introuvable ou hors de votre zone'); s.json({ ok: true });
}));

// Scan QR du recenseur : "Actif" si payé/vérifié, sinon aucun résultat
r.get('/verify/:code', auth, need(...STAFF), wrap(async (q, s) => {
  const [code, sig] = String(q.params.code).split('.');
  if (!code || sig !== qrSig(code)) return s.json({ message: 'Aucun résultat trouvé' }); // QR falsifié ou invalide
  const { rows: [f] } = await db.query('SELECT code,family_name,avenue,quartier FROM families WHERE code=$1 AND paid', [code]);
  s.json(f ? { status: 'Actif', ...f } : { message: 'Aucun résultat trouvé' });
}));

// Connexion de la famille (ID famille + PIN) -> carte + montant à payer
r.post('/family-login', wrap(async (q, s) => {
  const { rows: [f] } = await db.query('SELECT f.*, u.full_name AS recenseur FROM families f LEFT JOIN users u ON u.id=f.enumerator_id WHERE f.code=$1', [q.body.code]);
  if (!f || !(await bcrypt.compare(String(q.body.pin), f.pin_hash))) throw fail(401, 'ID ou PIN de la famille incorrect');
  const { rows: members } = await db.query('SELECT kind,full_name,photo_url FROM family_members WHERE family_id=$1', [f.id]);
  s.json({ code: f.code, family_name: f.family_name, commune: f.commune, avenue: f.avenue, quartier: f.quartier, paid_at: f.paid_at, paid: f.paid, signature: f.signature, recenseur: f.recenseur, created_at: f.created_at, qr: f.paid ? 'GVFAM:' + f.code + '.' + qrSig(f.code) : null, fee: +process.env.CENSUS_FEE_CDF || 2000, members, token: sign({ family: f.id }, '12h') });
}));

// Paiement des 2000 FC depuis le wallet du citoyen connecté (+ PIN wallet) pour vérifier la carte
r.post('/pay', auth, wrap(async (q, s) => {
  const { family_token, wallet_pin } = q.body; let fam;
  try { fam = require('jsonwebtoken').verify(family_token, process.env.JWT_SECRET).family; } catch { throw fail(401, 'Session famille expirée'); }
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [f] } = await c.query('SELECT id,code,paid FROM families WHERE id=$1 FOR UPDATE', [fam]);
    if (f.paid) throw fail(400, 'Carte déjà vérifiée');
    const code = await L.pay(c, q.user.id, +process.env.CENSUS_FEE_CDF || 2000, 'census_fee', f.id);
    await c.query('UPDATE families SET paid=true, paid_at=now() WHERE id=$1', [f.id]);
    const { rows: [n] } = await c.query('SELECT count(*)::int AS n FROM families WHERE paid');
    if (n.n % 100 === 0) await c.query(`INSERT INTO posts(user_id,kind,body) SELECT user_id,'post',$1 FROM user_roles WHERE role='admin' LIMIT 1`, [n.n + ' familles sont maintenant recensées dans la ville de Bukavu. Merci à tous.']);
    await c.query('COMMIT');
    s.json({ ok: true, message: `Félicitations, vous avez payé pour le recensement. Famille ${f.code}`, code });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
// Familles déjà recensées (le PIN n'est jamais communiqué)
r.get('/public-families', auth, wrap(async (q, s) => s.json((await db.query(`SELECT f.code,f.family_name,f.commune,f.avenue,f.quartier,f.paid,(SELECT count(*)::int FROM family_members m WHERE m.family_id=f.id) AS membres FROM families f WHERE ($1::text IS NULL OR f.family_name ILIKE '%'||$1||'%' OR f.code=$1) ORDER BY f.created_at DESC LIMIT 40`, [q.query.q || null])).rows)));
// Publication au nom de la famille (session famille + utilisateur connecté)
r.post('/family/post', auth, wrap(async (q, s) => {
  let fam; try { fam = require('jsonwebtoken').verify(q.body.family_token, process.env.JWT_SECRET).family; } catch { throw fail(401, 'Session famille expirée'); }
  const { body, image_url } = q.body; if (!fam || (!body && !image_url)) throw fail(400, 'Publication vide');
  await db.query("INSERT INTO posts(user_id,family_id,kind,body,image_url) VALUES(NULL,$1,'post',$2,$3)", [fam, body, image_url]); s.json({ ok: true });
}));
// Onglets créés par l'administrateur (affichés dans Recensement)
r.get('/tabs', auth, wrap(async (q, s) => s.json((await db.query('SELECT id,title,body FROM admin_tabs ORDER BY id')).rows)));
module.exports = r;
