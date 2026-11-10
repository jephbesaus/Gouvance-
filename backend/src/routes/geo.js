const r = require('express').Router(); const db = require('../db'); const { wrap, fail, auth, need } = require('../util');
r.use(auth);
r.get('/communes', wrap(async (q, s) => s.json((await db.query(`SELECT c.id,c.name,c.lat,c.lng,(SELECT count(*)::int FROM users u WHERE u.status='active' AND lower(u.commune)=lower(c.name)) AS habitants FROM communes c ORDER BY c.name`)).rows)));
r.post('/communes', need('admin'), wrap(async (q, s) => {
  const { name, lat, lng } = q.body; if (!name || isNaN(lat) || isNaN(lng)) throw fail(400, 'Nom et coordonnées requis');
  await db.query('INSERT INTO communes(name,lat,lng) VALUES($1,$2,$3) ON CONFLICT(name) DO UPDATE SET lat=$2,lng=$3', [name.trim(), lat, lng]); s.json({ ok: true });
}));
r.get('/communes/:id/places', wrap(async (q, s) => s.json((await db.query('SELECT id,name,kind FROM places WHERE commune_id=$1 ORDER BY kind,name', [q.params.id])).rows)));
// Personnes de la commune (nom + photo + avenue seulement)
r.get('/communes/:id/people', wrap(async (q, s) => s.json((await db.query(`SELECT u.full_name,u.gouvance_id,u.photo_url,u.avenue FROM users u JOIN communes c ON lower(u.commune)=lower(c.name) WHERE c.id=$1 AND u.status='active' AND ($2::text IS NULL OR u.full_name ILIKE '%'||$2||'%') ORDER BY u.full_name LIMIT 30 OFFSET $3`, [q.params.id, q.query.q || null, (parseInt(q.query.page, 10) || 0) * 30])).rows)));
// Le bourgmestre crée quartiers/avenues de SA commune ; l'admin partout
const allowed = async (q, communeId) => {
  const ro = q.user.roles; if (ro.some(x => x.role === 'admin')) return true;
  const { rows: [c] } = await db.query('SELECT lower(name) AS n FROM communes WHERE id=$1', [communeId]);
  return !!c && ro.some(x => x.role === 'bourgmestre' && (x.scope === '*' || x.scope === c.n));
};
r.post('/places', need('admin', 'bourgmestre'), wrap(async (q, s) => {
  const { commune_id, name, kind } = q.body; if (!name || !['quartier', 'avenue'].includes(kind)) throw fail(400, 'Nom et type requis');
  if (!(await allowed(q, commune_id))) throw fail(403, "Ce n'est pas votre commune");
  await db.query('INSERT INTO places(commune_id,name,kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [commune_id, name.trim(), kind]); s.json({ ok: true });
}));
r.delete('/places/:id', need('admin', 'bourgmestre'), wrap(async (q, s) => {
  const { rows: [p] } = await db.query('SELECT commune_id FROM places WHERE id=$1', [q.params.id]);
  if (!p || !(await allowed(q, p.commune_id))) throw fail(403, 'Suppression impossible'); await db.query('DELETE FROM places WHERE id=$1', [q.params.id]); s.json({ ok: true });
}));
module.exports = r;
