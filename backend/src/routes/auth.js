const r = require('express').Router(); const bcrypt = require('bcryptjs'); const crypto = require('crypto'); const jwt = require('jsonwebtoken');
const db = require('../db'); const { sendMail } = require('../mail');
const { wrap, fail, sign, auth, activate, pin6 } = require('../util');
const admins = () => (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim());
const hm = s => crypto.createHmac('sha256', process.env.JWT_SECRET).update(s).digest('hex').slice(0, 20);
const rolesOf = async id => (await db.query('SELECT role,scope FROM user_roles WHERE user_id=$1', [id])).rows;

// Étape 1 : nom + email -> code de vérification par email
r.post('/register', wrap(async (req, res) => {
  const { full_name, email } = req.body;
  if (!full_name || !email) throw fail(400, 'Champs invalides');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail(400, 'Adresse email invalide');
  const e = email.trim().toLowerCase();
  await db.query('INSERT INTO users(full_name,email) VALUES($1,$2) ON CONFLICT(email) DO NOTHING', [full_name.trim(), e]);
  const code = String(crypto.randomInt(100000, 1000000));
  await db.query(`INSERT INTO email_otps(email,code_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [e, await bcrypt.hash(code, 8)]);
  await sendMail(e, 'Code de vérification Gouvance', `Votre code Gouvance : ${code} (valable 10 minutes)`);
  res.json({ ok: true });
}));
// Étape 2 : vérification du code -> jeton d'inscription
r.post('/verify-email', wrap(async (req, res) => {
  const e = (req.body.email || '').trim().toLowerCase();
  const { rows: [o] } = await db.query(`SELECT * FROM email_otps WHERE email=$1 AND NOT used AND expires_at>now() ORDER BY id DESC LIMIT 1`, [e]);
  if (!o || o.attempts >= 5) throw fail(400, 'Code expiré, redemandez-en un');
  if (!(await bcrypt.compare(String(req.body.code), o.code_hash))) { await db.query('UPDATE email_otps SET attempts=attempts+1 WHERE id=$1', [o.id]); throw fail(400, 'Code incorrect'); }
  await db.query('UPDATE email_otps SET used=true WHERE id=$1', [o.id]);
  const { rows: [u] } = await db.query('UPDATE users SET email_verified=true WHERE email=$1 RETURNING id', [e]);
  res.json({ ok: true, reg_token: sign({ reg: u.id }, '2h') });
}));
// Test « je ne suis pas un robot » : petite opération signée par le serveur
r.get('/captcha', (req, res) => { const a = crypto.randomInt(2, 10), b = crypto.randomInt(2, 10), ts = Date.now(); res.json({ question: `${a} + ${b} = ?`, ts, sig: hm(`${a + b}:${ts}`) }); });
// Étape 3 : mot de passe + captcha -> compte activé automatiquement, identifiants générés
r.post('/complete', wrap(async (req, res) => {
  let uid; try { uid = jwt.verify(String(req.body.reg_token), process.env.JWT_SECRET).reg; } catch { throw fail(401, 'Session expirée'); }
  const { password, captcha } = req.body;
  if (!uid) throw fail(401, 'Session expirée');
  if (!password || String(password).length < 6) throw fail(400, 'Mot de passe trop court (6 caractères minimum)');
  const c = captcha || {};
  if (!c.ts || Date.now() - c.ts > 600000 || hm(`${String(c.answer).trim()}:${c.ts}`) !== c.sig) throw fail(400, 'Vérification anti-robot incorrecte');
  const { rows: [u0] } = await db.query('SELECT gouvance_id,status,email FROM users WHERE id=$1', [uid]);
  if (!u0) throw fail(404, 'Compte introuvable'); if (u0.status === 'blocked') throw fail(403, 'Ce compte est bloqué');
  let creds;
  if (u0.gouvance_id) { const pin = pin6(); await db.query('UPDATE users SET pin_hash=$1 WHERE id=$2', [await bcrypt.hash(pin, 10), uid]); creds = { gouvance_id: u0.gouvance_id, pin }; }
  else { creds = await activate(db, uid); await db.query('UPDATE users SET delivery_pin=NULL WHERE id=$1', [uid]); }
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(String(password), 10), uid]);
  if (admins().includes(u0.email)) await db.query(`INSERT INTO user_roles(user_id,role) VALUES($1,'admin') ON CONFLICT DO NOTHING`, [uid]);
  const roles = await rolesOf(uid); const { rows: [u] } = await db.query('SELECT full_name FROM users WHERE id=$1', [uid]);
  res.json({ ...creds, token: sign({ id: uid, roles }, '90d'), roles, user: { id: uid, name: u.full_name, gouvance_id: creds.gouvance_id } });
}));

r.post('/login', wrap(async (req, res) => {
  const { gouvance_id, pin, space = 'citizen' } = req.body;
  const { rows: [u] } = await db.query('SELECT * FROM users WHERE gouvance_id=$1', [gouvance_id]);
  const bad = fail(401, 'ID ou code PIN incorrect');
  if (!u || u.status !== 'active') throw bad;
  if (u.locked_until && u.locked_until > new Date()) throw fail(429, 'Compte verrouillé 15 minutes');
  if (!(await bcrypt.compare(String(pin), u.pin_hash))) {
    await db.query(`UPDATE users SET failed_attempts=failed_attempts+1, locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' END WHERE id=$1`, [u.id]); throw bad;
  }
  await db.query('UPDATE users SET failed_attempts=0, locked_until=NULL, delivery_pin=NULL WHERE id=$1', [u.id]);
  const roles = await rolesOf(u.id);
  if (space !== 'citizen' && !roles.some(x => x.role === space)) throw fail(403, "Vous n'avez pas accès à cet espace");
  res.json({ token: sign({ id: u.id, roles }, '90d'), space, user: { id: u.id, name: u.full_name, gouvance_id: u.gouvance_id }, roles });
}));
// Reprise de session : l'utilisateur reste connecté tant qu'il ne se déconnecte pas lui-même
r.get('/me', auth, wrap(async (req, res) => {
  const { rows: [u] } = await db.query('SELECT id,full_name,gouvance_id,status FROM users WHERE id=$1', [req.user.id]);
  if (!u || u.status !== 'active') throw fail(401, 'Session expirée');
  const roles = await rolesOf(u.id); res.json({ user: { id: u.id, name: u.full_name, gouvance_id: u.gouvance_id }, roles });
}));
r.post('/change-pin', auth, wrap(async (req, res) => {
  const { old_pin, new_pin } = req.body;
  if (!/^\d{4,8}$/.test(new_pin || '')) throw fail(400, 'PIN invalide (4 à 8 chiffres)');
  const { rows: [u] } = await db.query('SELECT pin_hash FROM users WHERE id=$1', [req.user.id]);
  if (!(await bcrypt.compare(String(old_pin), u.pin_hash))) throw fail(401, 'Ancien PIN incorrect');
  await db.query('UPDATE users SET pin_hash=$1 WHERE id=$2', [await bcrypt.hash(new_pin, 10), req.user.id]);
  res.json({ ok: true });
}));
module.exports = r;
