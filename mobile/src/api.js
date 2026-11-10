export const APP_URL = 'https://VOTRE-LIEN-DE-TELECHARGEMENT'; // lien Play Store / App Store ou page de téléchargement
export const API = 'http://127.0.0.1:3000'; // adresse de votre serveur Gouvance (HTTPS)
let token = null; export const setToken = t => { token = t; };
export async function api(path, method = 'GET', body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Erreur');
  return j;
}
export const fileUrl = u => (u && u.startsWith('/') ? API + u : u);
export async function uploadBase64(b64) { return (await api('/upload', 'POST', { data: b64 })).url; }
export const getToken = () => token;
export const wsUrl = () => API.replace('http', 'ws') + '/ws?token=' + token;
