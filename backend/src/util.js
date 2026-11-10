const crypto = require('crypto'); const bcrypt = require('bcryptjs'); const jwt = require('jsonwebtoken');
exports.wrap = fn => (req, res, next) => fn(req, res).catch(e => e.status ? res.status(e.status).json({ error: e.message }) : next(e));
exports.fail = (status, message) => Object.assign(new Error(message), { status });
exports.pin6 = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
exports.txCode = () => 'TX' + crypto.randomBytes(5).toString('hex').toUpperCase();
exports.sign = (p, exp = '12h') => jwt.sign(p, process.env.JWT_SECRET, { expiresIn: exp });
exports.auth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Non authentifié' }); } };
exports.need = (...roles) => (req, res, next) => (req.user.roles || []).some(r => roles.includes(r.role)) ? next() : res.status(403).json({ error: 'Accès refusé' });
// Active un compte: génère ID Gouvance + PIN par défaut + wallet (à 0 FC)
exports.activate = async (c, userId) => {
  const pin = exports.pin6();
  const { rows } = await c.query(`UPDATE users SET status='active', gouvance_id='GV'||nextval('user_seq'), pin_hash=$2, failed_attempts=0 WHERE id=$1 RETURNING gouvance_id`, [userId, await bcrypt.hash(pin, 10)]);
  await c.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING', [userId]);
  return { gouvance_id: rows[0].gouvance_id, pin };
};
