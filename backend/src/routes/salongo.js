const r = require('express').Router(); const jwt = require('jsonwebtoken'); const crypto = require('crypto'); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth, need } = require('../util');
const famId = t => { try { return jwt.verify(t, process.env.JWT_SECRET).family; } catch { throw fail(401, 'Session famille expirée'); } };
const scopeOf = q => { const ro = q.user.roles; return [ro.some(x => ['admin', 'bourgmestre', 'agent_salongo'].includes(x.role)), ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), ro.filter(x => x.role === 'chef_quartier').map(x => x.scope)]; };

r.post('/sessions', auth, need('admin', 'bourgmestre', 'chef_avenue'), wrap(async (q, s) => {
  const { rows: [x] } = await db.query('INSERT INTO salongo_sessions(day,fine) VALUES($1,$2) RETURNING *', [q.body.day, q.body.fine || 1000]); s.json(x);
}));
r.get('/sessions', auth, wrap(async (q, s) => s.json((await db.query('SELECT * FROM salongo_sessions ORDER BY day DESC LIMIT 20')).rows)));

// L'agent Salongo enregistre la personne présente (ID famille, nom, photo prise sur place) et remet un jeton
r.post('/checkin', auth, need('agent_salongo', 'admin', 'chef_avenue'), wrap(async (q, s) => {
  const { session_id, family_code, person_name, photo_url } = q.body;
  if (!person_name || !photo_url) throw fail(400, 'Nom et photo de la personne requis');
  const { rows: [ss] } = await db.query('SELECT closed FROM salongo_sessions WHERE id=$1', [session_id]); if (!ss || ss.closed) throw fail(400, 'Session fermée ou inconnue');
  const { rows: [f] } = await db.query('SELECT id,family_name FROM families WHERE code=$1', [String(family_code || '').trim().toUpperCase()]); if (!f) throw fail(404, 'Famille introuvable');
  const token = 'SL' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const { rowCount } = await db.query('INSERT INTO salongo_checkins(session_id,family_id,agent_id,person_name,photo_url,token) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [session_id, f.id, q.user.id, person_name, photo_url, token]);
  if (!rowCount) throw fail(400, 'Cette famille est déjà enregistrée pour ce Salongo');
  s.json({ ok: true, token, family_name: f.family_name });
}));
// La famille valide sa présence avec le jeton remis par l'agent
r.post('/confirm', wrap(async (q, s) => {
  const fam = famId(q.body.family_token); const sid = q.body.session_id; const tok = String(q.body.token || '').trim().toUpperCase();
  const { rows: [ss] } = await db.query('SELECT closed FROM salongo_sessions WHERE id=$1', [sid]); if (!ss || ss.closed) throw fail(400, 'Session fermée ou inconnue');
  const { rows: [ck] } = await db.query('SELECT token FROM salongo_checkins WHERE session_id=$1 AND family_id=$2', [sid, fam]);
  if (!ck || ck.token !== tok) throw fail(400, 'Jeton Salongo invalide');
  const { rowCount } = await db.query('INSERT INTO salongo_attendance(session_id,family_id,token) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [sid, fam, ck.token]);
  if (!rowCount) throw fail(400, 'Déjà confirmé'); s.json({ ok: true });
}));
r.post('/family/status', wrap(async (q, s) => {
  const fam = famId(q.body.family_token);
  s.json((await db.query(`SELECT ss.id,ss.day,ss.closed,ss.fine,(a.family_id IS NOT NULL) AS confirmed,(c.family_id IS NOT NULL) AS checked FROM salongo_sessions ss LEFT JOIN salongo_attendance a ON a.session_id=ss.id AND a.family_id=$1 LEFT JOIN salongo_checkins c ON c.session_id=ss.id AND c.family_id=$1 ORDER BY ss.day DESC LIMIT 8`, [fam])).rows);
}));
// Clôture : amende + message pour chaque famille recensée absente (lancée aussi automatiquement chaque samedi à 15 h)
const closeSession = async id => {
  const { rows } = await db.query(`WITH ss AS (UPDATE salongo_sessions SET closed=true WHERE id=$1 RETURNING id,day,fine),
   fi AS (INSERT INTO salongo_fines(session_id,family_id,amount) SELECT ss.id,f.id,ss.fine FROM families f, ss WHERE f.paid
     AND NOT EXISTS(SELECT 1 FROM salongo_attendance a WHERE a.session_id=ss.id AND a.family_id=f.id) ON CONFLICT DO NOTHING RETURNING family_id,amount,session_id),
   n AS (INSERT INTO notifications(family_id,title,body) SELECT fi.family_id,'Salongo non effectué','Votre famille n''a pas fait le Salongo du '||ss.day||'. Sanction : '||fi.amount||' FC.' FROM fi,ss RETURNING 1)
   SELECT count(*)::int AS amendes FROM fi`, [id]);
  return rows[0];
};
r.closeSession = closeSession;
r.post('/sessions/:id/close', auth, need('admin', 'bourgmestre', 'chef_avenue'), wrap(async (q, s) => s.json(await closeSession(q.params.id))));
// Liste du Salongo (vert = présent, rouge = absent), limitée à l'avenue du chef
r.get('/report/:id', auth, need('admin', 'bourgmestre', 'chef_avenue', 'chef_quartier', 'agent_salongo'), wrap(async (q, s) => s.json((await db.query(`SELECT f.code,f.family_name,f.avenue,f.quartier,(a.family_id IS NOT NULL) AS present,c.person_name,c.photo_url,fi.amount,fi.paid,fi.note
  FROM families f LEFT JOIN salongo_attendance a ON a.family_id=f.id AND a.session_id=$1 LEFT JOIN salongo_checkins c ON c.family_id=f.id AND c.session_id=$1 LEFT JOIN salongo_fines fi ON fi.family_id=f.id AND fi.session_id=$1
  WHERE f.paid AND ($2 OR lower(f.avenue)=ANY($3) OR lower(f.quartier)=ANY($4)) ORDER BY f.avenue,f.family_name`, [q.params.id, ...scopeOf(q)])).rows)));
// Sanction décidée par le chef d'avenue (montant libre) : la famille reçoit une notification
r.post('/sanction', auth, need('admin', 'chef_avenue', 'chef_quartier'), wrap(async (q, s) => {
  const { session_id, family_code, note } = q.body; const amount = parseInt(q.body.amount, 10); if (!(amount > 0)) throw fail(400, 'Montant invalide');
  const [wide, av, qu] = scopeOf(q);
  const { rows: [f] } = await db.query('SELECT id,family_name FROM families WHERE code=$1 AND ($2 OR lower(avenue)=ANY($3) OR lower(quartier)=ANY($4))', [String(family_code || '').trim().toUpperCase(), q.user.roles.some(x => x.role === 'admin'), av, qu]);
  if (!f) throw fail(404, 'Famille introuvable dans votre zone');
  await db.query('INSERT INTO salongo_fines(session_id,family_id,amount,note) VALUES($1,$2,$3,$4) ON CONFLICT(session_id,family_id) DO UPDATE SET amount=$3, note=$4, paid=false', [session_id, f.id, amount, note || null]);
  await db.query('INSERT INTO notifications(family_id,title,body) VALUES($1,$2,$3)', [f.id, 'Sanction Salongo', `Vous avez été sanctionné de ${amount} FC.${note ? ' ' + note : ''} Un agent passera chez vous pour régler cela.`]);
  s.json({ ok: true });
}));
r.post('/family/notifications', wrap(async (q, s) => s.json((await db.query('SELECT id,title,body,created_at FROM notifications WHERE family_id=$1 ORDER BY id DESC LIMIT 50', [famId(q.body.family_token)])).rows)));
r.post('/family/fines', wrap(async (q, s) => s.json((await db.query('SELECT id,session_id,amount,paid,note FROM salongo_fines WHERE family_id=$1 ORDER BY id DESC', [famId(q.body.family_token)])).rows)));
r.post('/fines/:id/pay', auth, wrap(async (q, s) => {
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(q.body.wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [f] } = await c.query('SELECT * FROM salongo_fines WHERE id=$1 FOR UPDATE', [q.params.id]);
    if (!f || f.paid) throw fail(400, 'Amende introuvable ou déjà payée');
    const code = await L.pay(c, q.user.id, f.amount, 'salongo_fine', f.family_id);
    await c.query('UPDATE salongo_fines SET paid=true, paid_at=now() WHERE id=$1', [f.id]); await c.query('COMMIT'); s.json({ ok: true, code });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
module.exports = r;
