const r = require('express').Router(); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth, need, activate } = require('../util');
r.use(auth, need('admin'));

r.get('/pending', wrap(async (q, s) => s.json((await db.query(`SELECT id,full_name,email,gender,commune,avenue,created_at FROM users WHERE status='pending' AND email_verified ORDER BY created_at`)).rows)));
// Approuver ET régénérer les codes (peut être rappelé autant de fois que nécessaire)
r.post('/users/:id/approve', wrap(async (q, s) => {
  const { rows: [u] } = await db.query('SELECT status FROM users WHERE id=$1', [q.params.id]); if (!u) throw fail(404, 'Utilisateur introuvable');
  if (u.status === 'blocked') throw fail(400, "Compte bloqué : débloquez-le d'abord"); s.json(await activate(db, q.params.id));
}));
r.post('/users/:id/block', wrap(async (q, s) => { await db.query(`UPDATE users SET status='blocked' WHERE id=$1`, [q.params.id]); s.json({ ok: true }); }));
r.post('/users/:id/unblock', wrap(async (q, s) => { await db.query(`UPDATE users SET status='active' WHERE id=$1`, [q.params.id]); s.json({ ok: true }); }));

// Nommer / retirer : bourgmestre (scope=commune), chef_avenue (scope=nom de l'avenue), chef_quartier, recenseur
const ROLES = ['bourgmestre', 'chef_avenue', 'chef_quartier', 'recenseur', 'agent_salongo'];
r.post('/roles', wrap(async (q, s) => {
  const { gouvance_id, role, scope = '*' } = q.body;
  if (!ROLES.includes(role)) throw fail(400, 'Rôle invalide');
  const { rowCount } = await db.query(`INSERT INTO user_roles(user_id,role,scope) SELECT id,$2,lower($3) FROM users WHERE gouvance_id=$1 ON CONFLICT DO NOTHING`, [gouvance_id, role, scope]);
  s.json({ ok: true, created: rowCount });
}));
r.delete('/roles', wrap(async (q, s) => {
  await db.query(`DELETE FROM user_roles WHERE role=$2 AND scope=lower($3) AND user_id=(SELECT id FROM users WHERE gouvance_id=$1)`, [q.body.gouvance_id, q.body.role, q.body.scope || '*']);
  s.json({ ok: true });
}));

// Stock virtuel : l'admin envoie de l'argent à un ID
r.post('/wallet/credit', wrap(async (q, s) => {
  const amount = parseInt(q.body.amount, 10); if (!(amount > 0)) throw fail(400, 'Montant invalide');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [u] } = await c.query(`SELECT id FROM users WHERE gouvance_id=$1 AND status='active'`, [q.body.gouvance_id]);
    if (!u) throw fail(404, 'ID introuvable');
    const code = await L.mint(c, u.id, amount); await c.query('COMMIT'); s.json({ ok: true, code });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
// Vérifications d'identité en attente (contrôle manuel)
r.get('/kyc', wrap(async (q, s) => s.json((await db.query(`SELECT id,full_name,gouvance_id,kyc_review FROM users WHERE kyc_status='review' ORDER BY created_at LIMIT 50`)).rows)));
r.post('/kyc/:id', wrap(async (q, s) => {
  const okv = !!q.body.approve;
  await db.query('UPDATE users SET kyc_status=$1 WHERE id=$2', [okv ? 'verified' : 'rejected', q.params.id]);
  await db.query('INSERT INTO notifications(user_id,title,body) VALUES($1,$2,$3)', [q.params.id, okv ? 'Compte vérifié' : 'Vérification refusée', okv ? 'Votre identité a été vérifiée.' : 'Vos documents ont été refusés. Envoyez de nouvelles photos nettes.']);
  s.json({ ok: true });
}));
r.post('/tabs', wrap(async (q, s) => {
  if (!q.body.title) throw fail(400, 'Titre requis');
  await db.query('INSERT INTO admin_tabs(title,body) VALUES($1,$2)', [q.body.title.trim(), q.body.body || '']); s.json({ ok: true });
}));
r.delete('/tabs/:id', wrap(async (q, s) => { await db.query('DELETE FROM admin_tabs WHERE id=$1', [q.params.id]); s.json({ ok: true }); }));
const rt = require('../realtime'); const L2 = require('../ledger');
r.get('/users', wrap(async (q, s) => s.json((await db.query(`SELECT u.id,u.full_name,u.gouvance_id,u.email,u.photo_url,u.status,u.kyc_status,u.restricted,u.gender,u.avenue,u.quartier,COALESCE(w.balance,0) AS balance,
  (SELECT string_agg(role,',') FROM user_roles x WHERE x.user_id=u.id) AS roles FROM users u LEFT JOIN wallets w ON w.user_id=u.id
  WHERE ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.gouvance_id ILIKE $1||'%' OR u.email ILIKE '%'||$1||'%') ORDER BY u.created_at DESC LIMIT 30 OFFSET $2`, [q.query.q || null, (parseInt(q.query.page, 10) || 0) * 30])).rows)));
r.get('/users/count', wrap(async (q, s) => s.json((await db.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='active')::int AS actifs, count(*) FILTER (WHERE gender='M')::int AS hommes, count(*) FILTER (WHERE gender='F')::int AS femmes FROM users`)).rows[0])));
r.post('/users/:id/restrict', wrap(async (q, s) => { await db.query('UPDATE users SET restricted=$1 WHERE id=$2', [!!q.body.restricted, q.params.id]); s.json({ ok: true }); }));
r.post('/users/:id/verify', wrap(async (q, s) => { await db.query("UPDATE users SET kyc_status='verified' WHERE id=$1", [q.params.id]); s.json({ ok: true }); }));
r.get('/online', wrap(async (q, s) => s.json({ online: rt.onlineIds().length })));
// Message de l'administration à des personnes choisies ou à tout le monde
r.post('/broadcast', wrap(async (q, s) => {
  const { ids, all, title, body } = q.body; if (!title || !body) throw fail(400, 'Titre et message requis');
  const { rows } = await db.query(all ? `SELECT id FROM users WHERE status='active'` : 'SELECT id FROM users WHERE id=ANY($1::uuid[]) AND status=\'active\'', all ? [] : [ids || []]);
  if (rows.length) await db.query(`INSERT INTO notifications(user_id,title,body,data) SELECT unnest($1::uuid[]),$2,$3,'{"type":"admin"}'::jsonb`, [rows.map(x => x.id), title, body]);
  rows.forEach(x => rt.push(x.id, { t: 'notif' })); s.json({ ok: true, sent: rows.length });
}));
r.get('/roles/list', wrap(async (q, s) => s.json((await db.query('SELECT x.role,x.scope,u.full_name,u.gouvance_id FROM user_roles x JOIN users u ON u.id=x.user_id ORDER BY x.role,u.full_name')).rows)));
r.get('/money', wrap(async (q, s) => s.json((await db.query(`SELECT m.id,m.kind,m.operator,m.phone,m.amount,m.fee,m.net,m.status,m.created_at,u.full_name,u.gouvance_id FROM money_requests m JOIN users u ON u.id=m.user_id WHERE m.status='pending' ORDER BY m.id LIMIT 100`)).rows)));
r.post('/money/:id/:act', wrap(async (q, s) => {
  const act = q.params.act; if (!['done', 'reject'].includes(act)) throw fail(400, 'Action invalide');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [m] } = await c.query("SELECT * FROM money_requests WHERE id=$1 AND status='pending' FOR UPDATE", [q.params.id]); if (!m) throw fail(404, 'Demande introuvable');
    if (act === 'done' && m.kind === 'deposit') await L2.mint(c, m.user_id, m.amount);
    if (act === 'reject' && m.kind === 'withdraw') await L2.refund(c, m.user_id, m.amount);
    await c.query('UPDATE money_requests SET status=$1 WHERE id=$2', [act === 'done' ? 'done' : 'rejected', m.id]);
    await c.query('INSERT INTO notifications(user_id,title,body,data) VALUES($1,$2,$3,$4::jsonb)', [m.user_id, act === 'done' ? (m.kind === 'deposit' ? 'Dépôt confirmé' : 'Retrait effectué') : 'Demande refusée', `${m.kind === 'deposit' ? 'Dépôt' : 'Retrait'} de ${m.amount} FC : ${act === 'done' ? 'traité' : 'refusé, votre solde a été rétabli'}.`, JSON.stringify({ type: 'wallet' })]);
    await c.query('COMMIT'); rt.push(m.user_id, { t: 'notif' }); s.json({ ok: true });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
r.post('/settings', wrap(async (q, s) => { await db.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2', [q.body.key, String(q.body.value)]); s.json({ ok: true }); }));
module.exports = r;
