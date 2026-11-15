const r = require('express').Router(); const db = require('../db'); const { wrap, auth, need } = require('../util');
r.use(auth, need('admin', 'bourgmestre', 'chef_avenue', 'chef_quartier'));
// Périmètre : admin et bourgmestre = tout ; chef d'avenue / de quartier = leur zone uniquement
const sc = q => { const ro = q.user.roles; return [ro.some(x => x.role === 'admin' || x.role === 'bourgmestre'), ro.filter(x => x.role === 'chef_avenue').map(x => x.scope), ro.filter(x => x.role === 'chef_quartier').map(x => x.scope)]; };
const W = '($1 OR lower(avenue)=ANY($2) OR lower(quartier)=ANY($3))';
const WF = W.replace(/avenue/g, 'f.avenue').replace(/quartier/g, 'f.quartier');
r.get('/summary', wrap(async (q, s) => {
  const a = sc(q);
  const u = (await db.query(`SELECT count(*)::int AS citoyens, count(*) FILTER (WHERE gender='M')::int AS hommes, count(*) FILTER (WHERE gender='F')::int AS femmes FROM users WHERE status='active' AND ${W}`, a)).rows[0];
  const f = (await db.query(`SELECT count(*)::int AS familles, count(*) FILTER (WHERE paid)::int AS familles_verifiees FROM families WHERE ${W}`, a)).rows[0];
  const m = (await db.query(`SELECT count(*)::int AS personnes_recensees, count(*) FILTER (WHERE m.kind='child')::int AS enfants, count(*) FILTER (WHERE m.deceased)::int AS decedes, count(*) FILTER (WHERE m.gender='M')::int AS m_hommes, count(*) FILTER (WHERE m.gender='F')::int AS m_femmes FROM family_members m JOIN families f ON f.id=m.family_id WHERE ${WF}`, a)).rows[0];
  s.json({ ...u, ...f, ...m });
}));
r.get('/population', wrap(async (q, s) => s.json((await db.query(`SELECT lower(avenue) AS avenue, gender, count(*)::int AS total FROM users WHERE status='active' AND ${W} GROUP BY 1,2 ORDER BY 1`, sc(q))).rows)));
r.get('/people', wrap(async (q, s) => s.json((await db.query(`SELECT full_name,gender,avenue,quartier,photo_url,gouvance_id FROM users WHERE status='active' AND ${W} AND ($4::text IS NULL OR full_name ILIKE '%'||$4||'%') ORDER BY full_name LIMIT 30 OFFSET $5`, [...sc(q), q.query.q || null, (parseInt(q.query.page, 10) || 0) * 30])).rows)));
// Effectif recensé : nom, sexe, âge, photo passeport
r.get('/members', wrap(async (q, s) => s.json((await db.query(`SELECT m.full_name,m.position,m.gender,m.birth_date,m.photo_url,m.deceased,f.code,f.family_name FROM family_members m JOIN families f ON f.id=m.family_id WHERE ${WF} AND ($4::text IS NULL OR m.full_name ILIKE '%'||$4||'%') ORDER BY f.family_name,m.id LIMIT 40 OFFSET $5`, [...sc(q), q.query.q || null, (parseInt(q.query.page, 10) || 0) * 40])).rows)));
r.get('/families', wrap(async (q, s) => s.json((await db.query(`SELECT f.code,f.family_name,f.avenue,f.quartier,f.paid,f.created_at,u.full_name AS recenseur,(SELECT count(*)::int FROM family_members m WHERE m.family_id=f.id) AS membres FROM families f LEFT JOIN users u ON u.id=f.enumerator_id WHERE ${WF} AND ($4::text IS NULL OR f.family_name ILIKE '%'||$4||'%' OR f.code ILIKE $4||'%') ORDER BY f.created_at DESC LIMIT 40 OFFSET $5`, [...sc(q), q.query.q || null, (parseInt(q.query.page, 10) || 0) * 40])).rows)));
// Décès, naissances, mariages, incendies, problèmes... : jour / semaine / mois / année
r.get('/reports', wrap(async (q, s) => {
  const a = sc(q);
  const counts = (await db.query(`SELECT kind, count(*) FILTER (WHERE created_at>now()-interval '1 day')::int AS jour, count(*) FILTER (WHERE created_at>now()-interval '7 days')::int AS semaine, count(*) FILTER (WHERE created_at>now()-interval '30 days')::int AS mois, count(*) FILTER (WHERE created_at>now()-interval '365 days')::int AS annee FROM reports WHERE ${W} GROUP BY kind`, a)).rows;
  const latest = (await db.query(`SELECT r.kind,r.body,r.created_at,f.family_name,f.code FROM reports r LEFT JOIN families f ON f.id=r.family_id WHERE ${W.replace(/avenue/g, 'r.avenue').replace(/quartier/g, 'r.quartier')} ORDER BY r.id DESC LIMIT 50`, a)).rows;
  s.json({ counts, latest });
}));
module.exports = r;
