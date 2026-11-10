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
const ROLES = ['bourgmestre', 'chef_avenue', 'chef_quartier', 'recenseur'];
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
module.exports = r;
