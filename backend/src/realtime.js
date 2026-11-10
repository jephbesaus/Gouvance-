// Temps réel (WebSocket). Une instance = mémoire locale ; avec plusieurs serveurs, relier via Redis pub/sub.
const { WebSocketServer } = require('ws'); const jwt = require('jsonwebtoken'); const db = require('./db');
const conns = new Map();
exports.attach = server => {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
  wss.on('connection', (ws, req) => {
    let id; try { id = jwt.verify(new URL(req.url, 'http://x').searchParams.get('token'), process.env.JWT_SECRET).id; } catch { return ws.close(4001); }
    if (!id) return ws.close(4001);
    if (!conns.has(id)) conns.set(id, new Set()); conns.get(id).add(ws); ws.alive = true; ws.on('pong', () => { ws.alive = true; });
    ws.on('close', () => { const s = conns.get(id); s.delete(ws); if (!s.size) { conns.delete(id); db.query('UPDATE users SET last_seen=now() WHERE id=$1', [id]).catch(() => {}); } });
  });
  setInterval(() => wss.clients.forEach(c => { if (!c.alive) return c.terminate(); c.alive = false; c.ping(); }), 30000);
};
exports.online = id => conns.has(id);
exports.push = (id, p) => (conns.get(id) || []).forEach(w => w.send(JSON.stringify(p)));
