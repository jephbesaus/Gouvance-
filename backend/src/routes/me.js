const r = require('express').Router(); const db = require('../db'); const { wrap, fail, auth } = require('../util');
r.use(auth);
r.patch('/lang', wrap(async (q, s) => { if (!['fr', 'sw', 'en'].includes(q.body.lang)) throw fail(400, 'Langue invalide'); await db.query('UPDATE users SET lang=$1 WHERE id=$2', [q.body.lang, q.user.id]); s.json({ ok: true }); }));
r.get('/notifications', wrap(async (q, s) => s.json((await db.query('SELECT id,title,body,read,created_at FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [q.user.id])).rows)));
r.post('/notifications/read', wrap(async (q, s) => { await db.query('UPDATE notifications SET read=true WHERE user_id=$1', [q.user.id]); s.json({ ok: true }); }));
r.post('/follow', wrap(async (q, s) => {
  const { rows: [u] } = await db.query(`SELECT id FROM users WHERE gouvance_id=$1 AND status='active'`, [q.body.gouvance_id]);
  if (!u || u.id === q.user.id) throw fail(400, 'Utilisateur invalide');
  const d = await db.query('DELETE FROM follows WHERE follower=$1 AND followee=$2', [q.user.id, u.id]);
  if (!d.rowCount) await db.query('INSERT INTO follows(follower,followee) VALUES($1,$2)', [q.user.id, u.id]); s.json({ following: !d.rowCount });
}));
const F = ['bio', 'phone', 'commune', 'avenue', 'quartier', 'birth_date', 'photo_url'];
r.get('/profile', wrap(async (q, s) => {
  const { rows: [u] } = await db.query(`SELECT full_name,gouvance_id,email,gender,bio,phone,commune,avenue,quartier,birth_date,photo_url,lang,kyc_status,
    (SELECT count(*)::int FROM likes l JOIN posts p ON p.id=l.post_id WHERE p.user_id=$1) AS likes_received, (SELECT count(*)::int FROM follows f WHERE f.followee=$1) AS followers, (SELECT count(*)::int FROM follows f WHERE f.follower=$1) AS following FROM users WHERE id=$1`, [q.user.id]); s.json(u);
}));
r.patch('/profile', wrap(async (q, s) => {
  const k = F.filter(x => q.body[x] !== undefined); if (!k.length) throw fail(400, 'Rien à modifier');
  await db.query(`UPDATE users SET ${k.map((x, i) => x + '=$' + (i + 2)).join(',')} WHERE id=$1`, [q.user.id, ...k.map(x => q.body[x])]); s.json({ ok: true });
}));
module.exports = r;
