const r = require('express').Router(); const db = require('../db'); const { wrap, fail, auth } = require('../util');
r.use(auth);
const BADGE = `CASE WHEN u.id IS NOT NULL AND EXISTS(SELECT 1 FROM user_roles x WHERE x.user_id=u.id) THEN 'admin' WHEN u.kyc_status='verified' OR (u.id IS NULL AND fam.paid) THEN 'verified' END`;
r.get('/feed', wrap(async (q, s) => {
  const { q: term, before, kind } = q.query;
  const { rows } = await db.query(`SELECT p.id,p.kind,p.body,p.image_url,p.price,p.created_at,
    COALESCE(u.id, fam.id) AS author_id, COALESCE(u.gouvance_id, fam.code) AS gouvance_id, u.bio,
    COALESCE(u.full_name, 'Famille ' || fam.family_name) AS full_name, u.photo_url, (u.id IS NULL) AS is_family,
    p.views, ${BADGE} AS badge,
    (SELECT count(*)::int FROM likes l WHERE l.post_id=p.id) AS likes, (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id) AS comments,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked
    FROM posts p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN families fam ON fam.id=p.family_id
    WHERE ($2::text IS NULL OR p.body ILIKE '%'||$2||'%' OR COALESCE(u.full_name, fam.family_name) ILIKE '%'||$2||'%') AND ($3::bigint IS NULL OR p.id<$3) AND ($4::text IS NULL OR p.kind=$4)
    ORDER BY p.id DESC LIMIT 20`, [q.user.id, term || null, before || null, kind || null]);
  if (rows.length) { // une vue par personne et par publication
    const ins = await db.query('INSERT INTO post_views(post_id,user_id) SELECT unnest($1::bigint[]), $2 ON CONFLICT DO NOTHING RETURNING post_id', [rows.map(x => x.id), q.user.id]);
    if (ins.rowCount) await db.query('UPDATE posts SET views=views+1 WHERE id=ANY($1::bigint[])', [ins.rows.map(x => x.post_id)]);
  }
  s.json(rows);
}));
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
r.get('/people', wrap(async (q, s) => {
  const t = (q.query.q || '').trim(); if (t.length < 2) return s.json([]);
  s.json((await db.query(`SELECT u.full_name,u.gouvance_id,u.photo_url,u.bio, CASE WHEN EXISTS(SELECT 1 FROM user_roles x WHERE x.user_id=u.id) THEN 'admin' WHEN u.kyc_status='verified' THEN 'verified' END AS badge FROM users u WHERE u.status='active' AND (u.full_name ILIKE '%'||$1||'%' OR u.gouvance_id ILIKE $1||'%') ORDER BY u.full_name LIMIT 20`, [t])).rows);
}));
module.exports = r;
