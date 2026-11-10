// Envoi d'images en base64 (JPEG/PNG/WebP) et messages vocaux (m4a/ogg/mp3), 6 Mo max. Pour la montée en charge : remplacer par un stockage objet (S3/MinIO).
const r = require('express').Router(); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { wrap, fail, auth } = require('../util');
const DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'); fs.mkdirSync(DIR, { recursive: true });
const kind = b => b[0] === 0xFF && b[1] === 0xD8 ? 'jpg' : b.slice(1, 4).toString() === 'PNG' ? 'png' : b.slice(0, 4).toString() === 'RIFF' ? 'webp' : b.slice(4, 8).toString() === 'ftyp' ? 'm4a' : b.slice(0, 4).toString() === 'OggS' ? 'ogg' : b.slice(0, 3).toString() === 'ID3' ? 'mp3' : null;
r.post('/', auth, wrap(async (q, s) => {
  const b = Buffer.from(String(q.body.data || ''), 'base64'); const ext = b.length > 12 && kind(b);
  if (!ext || b.length > 6 * 1024 * 1024) throw fail(400, 'Image invalide ou trop lourde');
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext; fs.writeFileSync(path.join(DIR, name), b); s.json({ url: '/files/' + name });
}));
r.DIR = DIR; module.exports = r;
