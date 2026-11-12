require('dotenv').config();
const express = require('express'), helmet = require('helmet'), cors = require('cors'), rate = require('express-rate-limit');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) { console.error('JWT_SECRET manquant ou trop court (24 caractères minimum)'); process.exit(1); }
const app = express(); const up = require('./routes/upload');
app.use('/upload', express.json({ limit: '9mb' }), up); app.get('/files/:name', async (q, s, n) => {
  try {
    if (!/^[a-f0-9]{24}\.(jpg|png|webp|m4a|ogg|mp3|mp4)$/.test(q.params.name)) return n();
    const { rows: [f] } = await require('./db').query('SELECT mime,data FROM files WHERE name=$1', [q.params.name]); if (!f) return n();
    s.set({ 'Content-Type': f.mime, 'Cache-Control': 'public, max-age=604800', 'Accept-Ranges': 'bytes' });
    const m = /^bytes=(\d*)-(\d*)$/.exec(q.headers.range || ''); const len = f.data.length;
    if (m && (m[1] || m[2])) { const a = m[1] ? +m[1] : Math.max(len - +m[2], 0), z = m[1] && m[2] ? Math.min(+m[2], len - 1) : len - 1; s.status(206).set('Content-Range', `bytes ${a}-${z}/${len}`).send(f.data.subarray(a, z + 1)); }
    else s.send(f.data);
  } catch (e) { n(e); }
});
app.use('/files', express.static(up.DIR, { maxAge: '7d' }));
app.set('trust proxy', 1); app.use(helmet(), cors({ origin: process.env.CORS_ORIGIN || true }), express.json({ limit: '1mb' }));
app.use(rate({ windowMs: 60000, limit: 120 }));
app.use('/auth', rate({ windowMs: 60000, limit: 10 }), require('./routes/auth'));
app.use('/admin', require('./routes/admin')); app.use('/wallet', require('./routes/wallet'));
app.use('/census/family-login', rate({ windowMs: 15 * 60000, limit: 10 })); app.use('/wallet/transfer', rate({ windowMs: 60000, limit: 10 }));
app.use('/census', require('./routes/census')); app.use('/stats', require('./routes/stats'));
app.use('/kyc', require('./routes/kyc')); app.use('/salongo', require('./routes/salongo')); app.use('/me', require('./routes/me'));
app.use('/', require('./routes/feed')); app.use('/chat', require('./routes/chat')); app.use('/geo', require('./routes/geo'));
app.get('/health', (q, s) => s.json({ ok: true }));
app.use((e, q, s, n) => { console.error(e); s.status(500).json({ error: 'Erreur serveur' }); });
const server = require('http').createServer(app); require('./realtime').attach(server);
require('./migrate')().then(() => server.listen(process.env.PORT || 3000, () => console.log('Gouvance API prête'))).catch(e => { console.error('Migration échouée', e); process.exit(1); });
