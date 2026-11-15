// Outils : âge calculé à partir de la date de naissance (JJ/MM/AAAA ou AAAA-MM-JJ)
export const toIso = d => { const s = String(d || '').trim(); let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (m) return m[3] + '-' + m[2] + '-' + m[1]; m = /^\d{4}-\d{2}-\d{2}/.exec(s); return m ? m[0] : null; };
export const ageOf = d => { const i = toIso(d); if (!i) return null; const b = new Date(i), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a >= 0 && a < 130 ? a : null; };
export const fmtDate = d => { const i = toIso(d); return i ? i.slice(8, 10) + '/' + i.slice(5, 7) + '/' + i.slice(0, 4) : '-'; };
