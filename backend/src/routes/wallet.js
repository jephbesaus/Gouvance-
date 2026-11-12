const r = require('express').Router(); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger');
const { wrap, fail, auth } = require('../util');
r.use(auth);
r.get('/balance', wrap(async (q, s) => s.json((await db.query('SELECT balance FROM wallets WHERE user_id=$1', [q.user.id])).rows[0] || { balance: 0 })));
r.post('/set-pin', wrap(async (q, s) => {
  if (!/^\d{4}$/.test(q.body.pin || '')) throw fail(400, 'Le PIN du portefeuille doit avoir 4 chiffres');
  await db.query('UPDATE users SET wallet_pin_hash=$1 WHERE id=$2', [await bcrypt.hash(q.body.pin, 10), q.user.id]); s.json({ ok: true });
}));
// Étape 1 : saisir l'ID -> affiche nom + photo pour confirmation
r.post('/lookup', wrap(async (q, s) => {
  const { rows: [u] } = await db.query(`SELECT full_name,photo_url,gouvance_id FROM users WHERE gouvance_id=$1 AND status='active'`, [q.body.gouvance_id]);
  if (!u) throw fail(404, 'ID introuvable'); s.json(u);
}));
// Étape 2 : confirmer + montant + PIN wallet
r.post('/transfer', wrap(async (q, s) => {
  const amount = parseInt(q.body.amount, 10); if (!(amount > 0)) throw fail(400, 'Montant invalide');
  const { rows: [me] } = await db.query('SELECT wallet_pin_hash FROM users WHERE id=$1', [q.user.id]);
  if (!me.wallet_pin_hash || !(await bcrypt.compare(String(q.body.wallet_pin), me.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [to] } = await c.query(`SELECT id,full_name FROM users WHERE gouvance_id=$1 AND status='active'`, [q.body.to]);
    if (!to || to.id === q.user.id) throw fail(400, 'Destinataire invalide');
    const code = await L.transfer(c, q.user.id, to.id, amount); await c.query('COMMIT');
    s.json({ ok: true, code, to: q.body.to, name: to.full_name, amount, date: new Date().toISOString() });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));
r.get('/history', wrap(async (q, s) => s.json((await db.query('SELECT code,kind,from_user,to_user,amount,created_at FROM transactions WHERE from_user=$1 OR to_user=$1 ORDER BY id DESC LIMIT 100', [q.user.id])).rows)));
module.exports = r;
