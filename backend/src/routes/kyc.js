// Vérification d'identité MANUELLE : l'utilisateur envoie recto, verso et selfie ; l'admin contrôle et valide.
const r = require('express').Router(); const db = require('../db'); const { wrap, fail, auth } = require('../util');
r.use(auth);
const ok = u => typeof u === 'string' && u.startsWith('/files/');
r.post('/submit', wrap(async (q, s) => {
  const { id_front_url, id_back_url, selfie_url } = q.body;
  if (![id_front_url, id_back_url, selfie_url].every(ok)) throw fail(400, 'Recto, verso et selfie requis');
  await db.query(`UPDATE users SET kyc_status='review', kyc_review=$1, photo_url=COALESCE(photo_url,$2) WHERE id=$3`, [JSON.stringify({ id_front_url, id_back_url, selfie_url }), selfie_url, q.user.id]);
  s.json({ status: 'review', message: 'Documents reçus. Votre compte sera vérifié par un administrateur.' });
}));
r.get('/status', wrap(async (q, s) => s.json((await db.query('SELECT kyc_status FROM users WHERE id=$1', [q.user.id])).rows[0])));
module.exports = r;
