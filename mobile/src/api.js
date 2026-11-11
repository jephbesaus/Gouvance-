import * as SecureStore from 'expo-secure-store';
export const APP_URL = 'https://VOTRE-LIEN-DE-TELECHARGEMENT'; // lien Play Store / App Store ou page de téléchargement
const DEFAULT_API = 'https://togetherwecan.fr-host.fr'; // domaine WebGate -> serveur
// Fichier public qui indique l'adresse actuelle du serveur : on change l'adresse sans refaire l'application.
export const CONFIG_URL = 'https://raw.githubusercontent.com/jephbesaus/gouvance-config/main/server.json';
export let API = DEFAULT_API;
export async function initApi() {
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(CONFIG_URL + '?t=' + Date.now(), { signal: ctl.signal }); clearTimeout(tm);
    const j = await r.json();
    if (j && /^https?:\/\//.test(j.api)) { API = j.api.replace(/\/$/, ''); await SecureStore.setItemAsync('api', API); return; }
  } catch (e) {}
  try { const s = await SecureStore.getItemAsync('api'); if (s) API = s; } catch (e) {}
}
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
