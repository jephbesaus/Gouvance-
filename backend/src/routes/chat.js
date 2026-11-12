const r = require('express').Router(); const db = require('../db'); const rt = require('../realtime'); const { wrap, fail, auth } = require('../util');
r.use(auth);
const norm = x => String(x || '').replace(/\D/g, '').slice(-9);
const byGid = async g => { const { rows: [u] } = await db.query(`SELECT id,full_name,gouvance_id,photo_url,bio,CASE WHEN EXISTS(SELECT 1 FROM user_roles x WHERE x.user_id=users.id) THEN 'admin' WHEN kyc_status='verified' THEN 'verified' END AS badge FROM users WHERE gouvance_id=$1 AND status='active'`, [g]); if (!u) throw fail(404, 'Utilisateur introuvable'); return u; };

// Trouver quelqu'un par ID Gouvance ou par numéro (comme WhatsApp)
r.post('/find', wrap(async (q, s) => {
  const { gouvance_id, phone } = q.body; let rows;
  if (gouvance_id) rows = (await db.query(`SELECT full_name,gouvance_id,photo_url,bio FROM users WHERE gouvance_id=$1 AND status='active'`, [gouvance_id])).rows;
  else if (norm(phone).length >= 9) rows = (await db.query(`SELECT full_name,gouvance_id,photo_url,bio FROM users WHERE status='active' AND right(regexp_replace(coalesce(phone,''),'\\D','','g'),9)=$1 LIMIT 5`, [norm(phone)])).rows;
  else throw fail(400, 'ID ou numéro requis');
  s.json(rows.length ? rows : { message: "Cette personne n'est pas sur Gouvance" });
}));
// Répertoire du téléphone : renvoie les contacts qui ont un compte Gouvance
r.post('/match', wrap(async (q, s) => {
  const ph = [...new Set((q.body.phones || []).slice(0, 1000).map(norm).filter(x => x.length === 9))];
  s.json((await db.query(`SELECT full_name,gouvance_id,photo_url,right(regexp_replace(phone,'\\D','','g'),9) AS p FROM users WHERE status='active' AND phone IS NOT NULL AND right(regexp_replace(phone,'\\D','','g'),9)=ANY($1)`, [ph])).rows);
}));
r.get('/conversations', wrap(async (q, s) => {
  const { rows } = await db.query(`WITH m AS (SELECT *, CASE WHEN sender=$1 THEN receiver ELSE sender END AS peer FROM messages WHERE sender=$1 OR receiver=$1)
    SELECT DISTINCT ON (m.peer) u.full_name,u.gouvance_id,u.photo_url,CASE WHEN EXISTS(SELECT 1 FROM user_roles x WHERE x.user_id=u.id) THEN 'admin' WHEN u.kyc_status='verified' THEN 'verified' END AS badge,m.kind,m.body,m.created_at,
    (SELECT count(*)::int FROM messages x WHERE x.sender=m.peer AND x.receiver=$1 AND x.read_at IS NULL) AS unread
    FROM m JOIN users u ON u.id=m.peer ORDER BY m.peer, m.id DESC`, [q.user.id]);
  s.json(rows.sort((a, b) => b.created_at - a.created_at));
}));
r.get('/with/:gid', wrap(async (q, s) => {
  const p = await byGid(q.params.gid);
  const { rows } = await db.query(`SELECT id,(sender=$1) AS mine,kind,body,media_url,created_at,read_at FROM messages WHERE ((sender=$1 AND receiver=$2) OR (sender=$2 AND receiver=$1)) AND ($3::bigint IS NULL OR id<$3) ORDER BY id DESC LIMIT 50`, [q.user.id, p.id, q.query.before || null]);
  const { rows: [pr] } = await db.query('SELECT last_seen FROM users WHERE id=$1', [p.id]);
  s.json({ peer: { full_name: p.full_name, badge: p.badge, gouvance_id: p.gouvance_id, photo_url: p.photo_url, bio: p.bio, online: rt.online(p.id), last_seen: pr.last_seen }, messages: rows.reverse() });
}));
r.post('/send', wrap(async (q, s) => {
  const { to, kind = 'text', body, media_url } = q.body; const p = await byGid(to);
  if (!['text', 'image', 'voice'].includes(kind) || p.id === q.user.id) throw fail(400, 'Message invalide');
  if (kind === 'text' ? !body || body.length > 4000 : !/^(\/files\/|https:\/\/res\.cloudinary\.com\/)/.test(String(media_url || ''))) throw fail(400, 'Message vide ou invalide');
  const { rows: [m] } = await db.query('INSERT INTO messages(sender,receiver,kind,body,media_url) VALUES($1,$2,$3,$4,$5) RETURNING id,kind,body,media_url,created_at,read_at', [q.user.id, p.id, kind, body, media_url]);
  const { rows: [me] } = await db.query('SELECT gouvance_id,full_name FROM users WHERE id=$1', [q.user.id]);
  const prev = kind === 'text' ? String(body).slice(0, 80) : kind === 'image' ? 'Photo' : 'Message vocal';
  await db.query(`INSERT INTO notifications(user_id,title,body,data) SELECT $1,$2,$3,$4::jsonb WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=$1 AND read=false AND data->>'from'=$5)`, [p.id, me.full_name, prev, JSON.stringify({ type: 'message', from: me.gouvance_id }), me.gouvance_id]);
  rt.push(p.id, { t: 'msg', from: me.gouvance_id, name: me.full_name, m: { ...m, mine: false } }); s.json({ ...m, mine: true });
}));
r.post('/read', wrap(async (q, s) => {
  const p = await byGid(q.body.from);
  const { rowCount } = await db.query('UPDATE messages SET read_at=now() WHERE sender=$1 AND receiver=$2 AND read_at IS NULL', [p.id, q.user.id]);
  if (rowCount) { const { rows: [me] } = await db.query('SELECT gouvance_id FROM users WHERE id=$1', [q.user.id]); rt.push(p.id, { t: 'read', by: me.gouvance_id }); }
  s.json({ ok: true });
}));
module.exports = r;
