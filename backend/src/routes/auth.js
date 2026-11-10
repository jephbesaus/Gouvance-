const r = require('express').Router(); const bcrypt = require('bcryptjs'); const crypto = require('crypto');
const db = require('../db'); const { sendMail } = require('../mail');
const { wrap, fail, sign, auth, activate } = require('../util');
const admins = () => (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim());

r.post('/register', wrap(async (req, res) => {
  const { full_name, email, gender, commune, avenue, quartier, phone, birth_date } = req.body;
  if (!full_name || !email || !['M', 'F'].includes(gender)) throw fail(400, 'Champs invalides');
  const e = email.trim().toLowerCase();
  await db.query(`INSERT INTO users(full_name,email,gender,commune,avenue,quartier,phone,birth_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(email) DO NOTHING`, [full_name.trim(), e, gender, commune, avenue, quartier, phone, /^\d{4}-\d{2}-\d{2}$/.test(birth_date || '') ? birth_date : null]);
  const code = String(crypto.randomInt(100000, 1000000));
  await db.query(`INSERT INTO email_otps(email,code_hash,expires_at) VALUES($1,$2,now()+interval '10 minutes')`, [e, await bcrypt.hash(code, 8)]);
  await sendMail(e, 'Code de vérification Gouvance', `Votre code Gouvance : ${code} (valable 10 minutes)`);
  res.json({ ok: true });
}));

r.post('/verify-email', wrap(async (req, res) => {
  const e = (req.body.email || '').trim().toLowerCase();
  const { rows: [o] } = await db.query(`SELECT * FROM email_otps WHERE email=$1 AND NOT used AND expires_at>now() ORDER BY id DESC LIMIT 1`, [e]);
  if (!o || o.attempts >= 5) throw fail(400, 'Code expiré, redemandez-en un');
  if (!(await bcrypt.compare(String(req.body.code), o.code_hash))) { await db.query('UPDATE email_otps SET attempts=attempts+1 WHERE id=$1', [o.id]); throw fail(400, 'Code incorrect'); }
  await db.query('UPDATE email_otps SET used=true WHERE id=$1', [o.id]);
  const { rows: [u] } = await db.query('UPDATE users SET email_verified=true WHERE email=$1 RETURNING id', [e]);
  if (admins().includes(e)) { // email admin configuré dans .env : activation directe
    const creds = await activate(db, u.id);
    await db.query(`INSERT INTO user_roles(user_id,role) VALUES($1,'admin') ON CONFLICT DO NOTHING`, [u.id]);
    return res.json({ status: 'active', ...creds });
  }
  res.json({ status: 'pending', message: "Compte en attente d'approbation par l'administrateur." });
}));

// space: citizen | bourgmestre | chef_avenue | chef_quartier | recenseur | admin
r.post('/login', wrap(async (req, res) => {
  const { gouvance_id, pin, space = 'citizen' } = req.body;
  const { rows: [u] } = await db.query('SELECT * FROM users WHERE gouvance_id=$1', [gouvance_id]);
  const bad = fail(401, 'ID ou code PIN incorrect');
  if (!u || u.status !== 'active') throw bad;
  if (u.locked_until && u.locked_until > new Date()) throw fail(429, 'Compte verrouillé 15 minutes');
  if (!(await bcrypt.compare(String(pin), u.pin_hash))) {
    await db.query(`UPDATE users SET failed_attempts=failed_attempts+1, locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' END WHERE id=$1`, [u.id]); throw bad;
  }
  await db.query('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=$1', [u.id]);
  const { rows: roles } = await db.query('SELECT role,scope FROM user_roles WHERE user_id=$1', [u.id]);
  if (space !== 'citizen' && !roles.some(x => x.role === space)) throw fail(403, "Vous n'avez pas accès à cet espace");
  res.json({ token: sign({ id: u.id, roles }), space, user: { id: u.id, name: u.full_name, gouvance_id: u.gouvance_id }, roles });
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
