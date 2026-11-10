import QRCode from 'qrcode'; import * as Print from 'expo-print'; import * as Sharing from 'expo-sharing'; import * as FileSystem from 'expo-file-system'; import { Asset } from 'expo-asset';
import { fileUrl } from './api';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SIL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#D6E2F1"/><circle cx="50" cy="38" r="17" fill="#96AAC4"/><path d="M16 100a34 34 0 0 1 68 0z" fill="#96AAC4"/></svg>');
const KIND = { father: 'Père', mother: 'Mère', child: 'Enfant' };
// Carte de recensement familial en PDF. Le QR n'est présent que si la carte est vérifiée (payée).
export async function familyCardPdf(f) {
  const a = Asset.fromModule(require('../assets/logo.png')); await a.downloadAsync();
  const logo = await FileSystem.readAsStringAsync(a.localUri, { encoding: 'base64' });
  const qr = f.paid ? await QRCode.toString('GVFAM:' + f.code, { type: 'svg', margin: 1 }) : '';
  const d = new Date(f.paid_at || Date.now());
  const html = `<html><body style="background:#fff;font-family:Arial;margin:0;padding:24px"><div style="border:3px solid #0B5FC4;border-radius:18px;padding:22px">
  <table style="width:100%"><tr><td style="width:90px"><img src="data:image/png;base64,${logo}" style="width:80px;border-radius:16px"/></td>
  <td><div style="font-size:26px;font-weight:bold"><span style="color:#2E9E3F">Gou</span><span style="color:#0B5FC4">vance</span></div><div style="color:#444">Carte de recensement familial - Ville de Bukavu</div></td>
  <td style="width:130px;text-align:right">${qr ? '<div style="width:120px;height:120px">' + qr + '</div>' : '<div style="font-size:12px;color:#B3261E">Carte non vérifiée</div>'}</td></tr></table>
  <div style="font-size:30px;font-weight:bold;color:#0B5FC4;margin:14px 0 4px">${esc(f.code)}</div>
  <div style="font-size:20px">Famille ${esc(f.family_name)}</div>
  <div style="color:#444;margin:4px 0 14px">${esc(f.commune)} - ${esc(f.avenue)} - ${esc(f.quartier)}</div>
  <table style="width:100%"><tr>${f.members.map(m => `<td style="text-align:center;padding:6px;vertical-align:top;width:25%"><img src="${m.photo_url ? fileUrl(m.photo_url) : SIL}" style="width:70px;height:70px;border-radius:35px;object-fit:cover"/><div style="font-size:12px"><b>${KIND[m.kind] || ''}</b><br/>${esc(m.full_name)}</div></td>`).join('')}</tr></table>
  <div style="margin-top:16px;font-size:13px;color:#444">${f.paid ? 'Vérifiée le ' + d.toLocaleDateString('fr-FR') + ' - Année ' + d.getFullYear() : 'Année ' + d.getFullYear()}</div></div></body></html>`;
  const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Carte ' + f.code });
}

// Carte Gouvance individuelle du citoyen
export async function citizenCardPdf(p) {
  const a = Asset.fromModule(require('../assets/logo.png')); await a.downloadAsync();
  const logo = await FileSystem.readAsStringAsync(a.localUri, { encoding: 'base64' });
  const qr = await QRCode.toString('GVID:' + p.gouvance_id, { type: 'svg', margin: 1 });
  const html = `<html><body style="background:#fff;font-family:Arial;padding:24px"><div style="width:520px;border:3px solid #0B5FC4;border-radius:18px;padding:20px">
  <table style="width:100%"><tr><td style="width:80px"><img src="data:image/png;base64,${logo}" style="width:70px;border-radius:14px"/></td><td><div style="font-size:24px;font-weight:bold"><span style="color:#2E9E3F">Gou</span><span style="color:#0B5FC4">vance</span></div><div style="color:#444">Carte citoyen - Ville de Bukavu</div></td></tr></table>
  <table style="width:100%;margin-top:14px"><tr><td style="width:110px"><img src="${p.photo_url ? fileUrl(p.photo_url) : SIL}" style="width:100px;height:120px;object-fit:cover;border-radius:10px"/></td>
  <td style="vertical-align:top"><div style="font-size:20px;font-weight:bold">${esc(p.full_name)}</div><div>Né(e) le ${p.birth_date ? esc(String(p.birth_date).slice(0, 10)) : '-'}</div><div style="margin-top:10px;font-size:22px;font-weight:bold;color:#0B5FC4">${esc(p.gouvance_id)}</div></td>
  <td style="width:100px"><div style="width:96px;height:96px">${qr}</div></td></tr></table></div></body></html>`;
  const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Carte Gouvance' });
}
