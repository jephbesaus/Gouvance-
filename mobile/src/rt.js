// Connexion temps réel unique pour toute l'application (messages, lecture, présence)
import { wsUrl } from './api';
const subs = new Set(); let ws = null, stop = true, timer = null;
function open() {
  try { ws = new WebSocket(wsUrl()); } catch (e) { return; }
  ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } subs.forEach(fn => fn(d)); };
  ws.onclose = () => { if (!stop) timer = setTimeout(open, 4000); };
  ws.onerror = () => {};
}
export function rtConnect() { stop = false; clearTimeout(timer); open(); }
export function rtClose() { stop = true; clearTimeout(timer); if (ws) { try { ws.close(); } catch (e) {} ws = null; } }
export function rtSubscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; }
