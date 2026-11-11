// Envoi d'images (JPEG/PNG/WebP) et de messages vocaux (m4a/ogg/mp3), 6 Mo max, en base64.
// Par défaut les fichiers sont gardés dans la base de données (permanent). Si CLOUDINARY_* est défini, ils vont chez Cloudinary.
const r = require('express').Router(); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { wrap, fail, auth } = require('../util'); const db = require('../db');
const DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'); fs.mkdirSync(DIR, { recursive: true });
const kind = b => b[0] === 0xFF && b[1] === 0xD8 ? 'jpg' : b.slice(1, 4).toString() === 'PNG' ? 'png' : b.slice(0, 4).toString() === 'RIFF' ? 'webp' : b.slice(4, 8).toString() === 'ftyp' ? 'm4a' : b.slice(0, 4).toString() === 'OggS' ? 'ogg' : b.slice(0, 3).toString() === 'ID3' ? 'mp3' : null;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', m4a: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg' };
const cloud = () => process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
async function toCloudinary(b, ext) {
  const ts = Math.floor(Date.now() / 1000), sig = crypto.createHash('sha1').update('timestamp=' + ts + process.env.CLOUDINARY_API_SECRET).digest('hex');
  const body = new URLSearchParams({ file: 'data:' + MIME[ext] + ';base64,' + b.toString('base64'), api_key: process.env.CLOUDINARY_API_KEY, timestamp: String(ts), signature: sig });
  const res = await fetch('https://api.cloudinary.com/v1_1/' + process.env.CLOUDINARY_CLOUD_NAME + '/auto/upload', { method: 'POST', body });
  const j = await res.json().catch(() => ({})); if (!res.ok || !j.secure_url) throw fail(502, "Envoi du fichier impossible"); return j.secure_url;
}
r.post('/', auth, wrap(async (q, s) => {
  const b = Buffer.from(String(q.body.data || ''), 'base64'); const ext = b.length > 12 && kind(b);
  if (!ext || b.length > 6 * 1024 * 1024) throw fail(400, 'Image invalide ou trop lourde');
  if (cloud()) return s.json({ url: await toCloudinary(b, ext) });
  const name = crypto.randomBytes(12).toString('hex') + '.' + ext;
  await db.query('INSERT INTO files(name,mime,data) VALUES($1,$2,$3)', [name, MIME[ext], b]); s.json({ url: '/files/' + name });
}));
r.DIR = DIR; module.exports = r;
