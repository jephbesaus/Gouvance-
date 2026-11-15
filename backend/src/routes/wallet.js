const r = require('express').Router(); const bcrypt = require('bcryptjs');
const db = require('../db'); const L = require('../ledger'); const rt = require('../realtime');
const { wrap, fail, auth } = require('../util');
r.use(auth);
const FEE_RATE = 0.07; // 7 % sur chaque retrait
const OPS = ['orange', 'vodacom', 'airtel', 'africell'];
const who = async id => (await db.query('SELECT full_name,gouvance_id,kyc_status,restricted,wallet_pin_hash FROM users WHERE id=$1', [id])).rows[0];
// Un compte non vérifié n'a pas accès au portefeuille (le personnel de l'administration est dispensé)
async function guard(q) {
  const u = await who(q.user.id);
  if (u.kyc_status !== 'verified' && !q.user.roles.length) throw fail(403, 'Vérifiez votre compte pour accéder à cette fonctionnalité');
  if (u.restricted) throw fail(403, "Cette fonction est restreinte par l'administration"); return u;
}
const pinOk = async (u, pin) => { if (!u.wallet_pin_hash || !(await bcrypt.compare(String(pin), u.wallet_pin_hash))) throw fail(401, 'PIN du portefeuille incorrect'); };
const notify = async (uid, title, body, data) => { await db.query('INSERT INTO notifications(user_id,title,body,data) VALUES($1,$2,$3,$4::jsonb)', [uid, title, body, JSON.stringify(data || { type: 'wallet' })]); rt.push(uid, { t: 'notif' }); };

r.get('/balance', wrap(async (q, s) => {
  const u = await who(q.user.id); const b = (await db.query('SELECT balance FROM wallets WHERE user_id=$1', [q.user.id])).rows[0] || { balance: 0 };
  s.json({ balance: b.balance, has_pin: !!u.wallet_pin_hash, verified: u.kyc_status === 'verified' || q.user.roles.length > 0, restricted: !!u.restricted });
}));
r.post('/set-pin', wrap(async (q, s) => {
  if (!/^\d{4}$/.test(q.body.pin || '')) throw fail(400, 'Le PIN du portefeuille doit avoir 4 chiffres');
  const u = await who(q.user.id); if (u.wallet_pin_hash) await pinOk(u, q.body.old_pin);
  await db.query('UPDATE users SET wallet_pin_hash=$1 WHERE id=$2', [await bcrypt.hash(q.body.pin, 10), q.user.id]); s.json({ ok: true });
}));
r.post('/lookup', wrap(async (q, s) => {
  const { rows: [u] } = await db.query(`SELECT full_name,photo_url,gouvance_id FROM users WHERE gouvance_id=$1 AND status='active'`, [String(q.body.gouvance_id || '').trim().toUpperCase()]);
  if (!u) throw fail(404, 'ID introuvable'); s.json(u);
}));
r.post('/transfer', wrap(async (q, s) => {
  const amount = parseInt(q.body.amount, 10); if (!(amount > 0)) throw fail(400, 'Montant invalide');
  const me = await guard(q); await pinOk(me, q.body.wallet_pin);
  const c = await db.connect(); let to, code;
  try {
    await c.query('BEGIN');
    ({ rows: [to] } = await c.query(`SELECT id,full_name FROM users WHERE gouvance_id=$1 AND status='active'`, [String(q.body.to || '').trim().toUpperCase()]));
    if (!to || to.id === q.user.id) throw fail(400, 'Destinataire invalide');
    code = await L.transfer(c, q.user.id, to.id, amount); await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  await notify(to.id, 'Vous avez reçu ' + amount + ' FC', 'De la part de ' + me.full_name + ' (' + me.gouvance_id + ')');
  s.json({ ok: true, code, to: q.body.to, name: to.full_name, amount, date: new Date().toISOString() });
}));
// Retrait : 7 % de frais retenus ; la demande est traitée par l'administration (ou par l'API de paiement une fois branchée)
r.post('/withdraw', wrap(async (q, s) => {
  const amount = parseInt(q.body.amount, 10); const { operator, phone } = q.body;
  if (!(amount >= 1000)) throw fail(400, 'Montant minimum : 1000 FC'); if (!OPS.includes(operator) || !/^\+?\d{9,15}$/.test(String(phone || '').replace(/\s/g, ''))) throw fail(400, 'Opérateur ou numéro invalide');
  const me = await guard(q); await pinOk(me, q.body.wallet_pin);
  const fee = Math.ceil(amount * FEE_RATE), net = amount - fee; const c = await db.connect();
  try {
    await c.query('BEGIN'); await L.pay(c, q.user.id, amount, 'withdraw', null);
    await c.query('INSERT INTO money_requests(user_id,kind,operator,phone,amount,fee,net) VALUES($1,$2,$3,$4,$5,$6,$7)', [q.user.id, 'withdraw', operator, String(phone).replace(/\s/g, ''), amount, fee, net]); await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  await notify(q.user.id, 'Retrait demandé', `Vous recevrez ${net} FC (frais de 7 % : ${fee} FC) sur ${operator}.`);
  s.json({ ok: true, net, fee });
}));
r.post('/deposit', wrap(async (q, s) => {
  const amount = parseInt(q.body.amount, 10); const { operator, phone } = q.body;
  if (!(amount >= 1000)) throw fail(400, 'Montant minimum : 1000 FC'); if (!OPS.includes(operator) || !/^\+?\d{9,15}$/.test(String(phone || '').replace(/\s/g, ''))) throw fail(400, 'Opérateur ou numéro invalide');
  await guard(q);
  await db.query('INSERT INTO money_requests(user_id,kind,operator,phone,amount,fee,net) VALUES($1,$2,$3,$4,$5,0,$5)', [q.user.id, 'deposit', operator, String(phone).replace(/\s/g, ''), amount]);
  await notify(q.user.id, 'Dépôt demandé', `Votre demande de dépôt de ${amount} FC est en cours de traitement.`); s.json({ ok: true });
}));
r.get('/numbers', wrap(async (q, s) => s.json((await db.query('SELECT operator,phone FROM user_numbers WHERE user_id=$1', [q.user.id])).rows)));
r.post('/numbers', wrap(async (q, s) => {
  const { operator, phone } = q.body; if (!OPS.includes(operator) || !/^\+?\d{9,15}$/.test(String(phone || '').replace(/\s/g, ''))) throw fail(400, 'Opérateur ou numéro invalide');
  await db.query('INSERT INTO user_numbers(user_id,operator,phone) VALUES($1,$2,$3) ON CONFLICT(user_id,operator) DO UPDATE SET phone=$3', [q.user.id, operator, String(phone).replace(/\s/g, '')]); s.json({ ok: true });
}));
r.get('/history', wrap(async (q, s) => s.json((await db.query('SELECT code,kind,from_user,to_user,amount,created_at FROM transactions WHERE from_user=$1 OR to_user=$1 ORDER BY id DESC LIMIT 100', [q.user.id])).rows)));
module.exports = r;
