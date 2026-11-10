const r = require('express').Router(); const db = require('../db'); const { wrap, auth, need } = require('../util');
r.use(auth, need('admin', 'bourgmestre', 'chef_avenue', 'chef_quartier'));
// Périmètre : admin et bourgmestre = toute la ville ; chef d'avenue / de quartier = leur zone uniquement
const sc = q => { const ro = q.user.roles; return [ro.some(x => x.role === 'admin' || x.role === 'bourgmestre'), ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), ro.filter(x => x.role === 'chef_quartier').map(x => x.scope)]; };
const W = '($1 OR lower(avenue)=ANY($2) OR lower(quartier)=ANY($3))';
r.get('/summary', wrap(async (q, s) => {
  const a = sc(q);
  const u = (await db.query(`SELECT count(*)::int AS citoyens, count(*) FILTER (WHERE gender='M')::int AS hommes, count(*) FILTER (WHERE gender='F')::int AS femmes FROM users WHERE status='active' AND ${W}`, a)).rows[0];
  const f = (await db.query(`SELECT count(*)::int AS familles, count(*) FILTER (WHERE paid)::int AS familles_verifiees FROM families WHERE ${W}`, a)).rows[0];
  const m = (await db.query(`SELECT count(*)::int AS personnes_recensees, count(*) FILTER (WHERE m.kind='child')::int AS enfants, count(*) FILTER (WHERE m.deceased)::int AS decedes FROM family_members m JOIN families families ON families.id=m.family_id WHERE ${W.replace(/avenue/g, 'families.avenue').replace(/quartier/g, 'families.quartier')}`, a)).rows[0];
  s.json({ ...u, ...f, ...m });
}));
r.get('/population', wrap(async (q, s) => s.json((await db.query(`SELECT lower(avenue) AS avenue, gender, count(*)::int AS total FROM users WHERE status='active' AND ${W} GROUP BY 1,2 ORDER BY 1`, sc(q))).rows)));
r.get('/people', wrap(async (q, s) => s.json((await db.query(`SELECT full_name,gender,avenue,quartier,photo_url,gouvance_id FROM users WHERE status='active' AND ${W} AND ($4::text IS NULL OR full_name ILIKE '%'||$4||'%') ORDER BY full_name LIMIT 30 OFFSET $5`, [...sc(q), q.query.q || null, (parseInt(q.query.page, 10) || 0) * 30])).rows)));
module.exports = r;
