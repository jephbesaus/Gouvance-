const r = require('express').Router(); const jwt = require('jsonwebtoken'); const crypto = require('crypto'); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth, need } = require('../util');
const famId = t => { try { return jwt.verify(t, process.env.JWT_SECRET).family; } catch { throw fail(401, 'Session famille expirée'); } };

r.post('/sessions', auth, need('admin', 'bourgmestre'), wrap(async (q, s) => {
  const { rows: [x] } = await db.query('INSERT INTO salongo_sessions(day,fine) VALUES($1,$2) RETURNING *', [q.body.day, q.body.fine || 1000]); s.json(x);
}));
r.get('/sessions', auth, wrap(async (q, s) => s.json((await db.query('SELECT * FROM salongo_sessions ORDER BY day DESC LIMIT 20')).rows)));

// La famille confirme "j'ai fait le Salongo" -> reçoit un jeton pour la maison
r.post('/confirm', wrap(async (q, s) => {
  const fam = famId(q.body.family_token); const token = 'SL' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const { rows: [ss] } = await db.query('SELECT closed FROM salongo_sessions WHERE id=$1', [q.body.session_id]);
  if (!ss || ss.closed) throw fail(400, 'Session fermée ou inconnue');
  const { rowCount } = await db.query('INSERT INTO salongo_attendance(session_id,family_id,token) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [q.body.session_id, fam, token]);
  if (!rowCount) throw fail(400, 'Déjà confirmé'); s.json({ ok: true, token });
}));

// Clôture : amende + message automatique pour chaque famille recensée qui n'a pas confirmé
r.post('/sessions/:id/close', auth, need('admin', 'bourgmestre'), wrap(async (q, s) => {
  const { rows } = await db.query(`WITH ss AS (UPDATE salongo_sessions SET closed=true WHERE id=$1 RETURNING id,day,fine),
   fi AS (INSERT INTO salongo_fines(session_id,family_id,amount) SELECT ss.id,f.id,ss.fine FROM families f, ss WHERE f.paid
     AND NOT EXISTS(SELECT 1 FROM salongo_attendance a WHERE a.session_id=ss.id AND a.family_id=f.id) ON CONFLICT DO NOTHING RETURNING family_id,amount,session_id),
   n AS (INSERT INTO notifications(family_id,title,body) SELECT fi.family_id,'Salongo non effectué','Votre famille n''a pas fait le Salongo du '||ss.day||'. Amende : '||fi.amount||' FC.' FROM fi,ss RETURNING 1)
   SELECT count(*)::int AS amendes FROM fi`, [q.params.id]);
  s.json(rows[0]);
}));

r.post('/family/notifications', wrap(async (q, s) => s.json((await db.query('SELECT id,title,body,created_at FROM notifications WHERE family_id=$1 ORDER BY id DESC LIMIT 50', [famId(q.body.family_token)])).rows)));
r.post('/family/fines', wrap(async (q, s) => s.json((await db.query('SELECT id,session_id,amount,paid FROM salongo_fines WHERE family_id=$1 ORDER BY id DESC', [famId(q.body.family_token)])).rows)));

// Paiement de l'amende depuis le wallet du citoyen connecté
r.post('/fines/:id/pay', auth, wrap(async (q, s) => {
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(q.body.wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN wallet incorrect');
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
