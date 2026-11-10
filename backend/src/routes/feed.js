const r = require('express').Router(); const db = require('../db'); const { wrap, fail, auth } = require('../util');
r.use(auth);
r.get('/feed', wrap(async (q, s) => {
  const { q: term, before, kind } = q.query;
  const { rows } = await db.query(`SELECT p.id,p.kind,p.body,p.image_url,p.price,p.created_at,u.id AS author_id,u.gouvance_id,u.bio,u.full_name,u.photo_url,
    EXISTS(SELECT 1 FROM user_roles x WHERE x.user_id=u.id AND x.role='admin') AS certified,
    (SELECT count(*)::int FROM likes l WHERE l.post_id=p.id) AS likes, (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comments,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked
    FROM posts p JOIN users u ON u.id=p.user_id
    WHERE ($2::text IS NULL OR p.body ILIKE '%'||$2||'%' OR u.full_name ILIKE '%'||$2||'%') AND ($3::bigint IS NULL OR p.id<$3) AND ($4::text IS NULL OR p.kind=$4)
    ORDER BY p.id DESC LIMIT 20`, [q.user.id, term || null, before || null, kind || null]);
  s.json(rows);
}));
// Un article du marketplace est aussi visible dans le fil (kind='market')
r.post('/posts', wrap(async (q, s) => {
  const { body, image_url, price, kind = 'post' } = q.body;
  if (!['post', 'market'].includes(kind) || (!body && !image_url)) throw fail(400, 'Publication vide');
  if (kind === 'market' && !(price > 0)) throw fail(400, 'Prix requis');
  const { rows: [p] } = await db.query('INSERT INTO posts(user_id,kind,body,image_url,price) VALUES($1,$2,$3,$4,$5) RETURNING id', [q.user.id, kind, body, image_url, kind === 'market' ? price : null]); s.json(p);
}));
r.delete('/posts/:id', wrap(async (q, s) => {
  const admin = q.user.roles.some(x => x.role === 'admin');
  const { rowCount } = await db.query('DELETE FROM posts WHERE id=$1 AND ($3 OR user_id=$2)', [q.params.id, q.user.id, admin]);
  if (!rowCount) throw fail(403, 'Suppression impossible'); s.json({ ok: true });
}));
r.post('/posts/:id/like', wrap(async (q, s) => {
  const d = await db.query('DELETE FROM likes WHERE post_id=$1 AND user_id=$2', [q.params.id, q.user.id]);
  if (!d.rowCount) await db.query('INSERT INTO likes(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [q.params.id, q.user.id]); s.json({ liked: !d.rowCount });
}));
r.get('/posts/:id/comments', wrap(async (q, s) => s.json((await db.query('SELECT c.id,c.body,c.created_at,u.full_name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.id LIMIT 100', [q.params.id])).rows)));
r.post('/posts/:id/comments', wrap(async (q, s) => {
  if (!q.body.body) throw fail(400, 'Commentaire vide'); await db.query('INSERT INTO comments(post_id,user_id,body) VALUES($1,$2,$3)', [q.params.id, q.user.id, q.body.body]); s.json({ ok: true });
}));
module.exports = r;
