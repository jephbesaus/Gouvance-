import QRCode from 'qrcode'; import * as Print from 'expo-print'; import * as Sharing from 'expo-sharing'; import * as FileSystem from 'expo-file-system'; import { Asset } from 'expo-asset';
import { fileUrl } from './api';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SIL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#D6E2F1"/><circle cx="50" cy="38" r="17" fill="#96AAC4"/><path d="M16 100a34 34 0 0 1 68 0z" fill="#96AAC4"/></svg>');
const d10 = d => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');
const logo64 = async () => { const a = Asset.fromModule(require('../assets/logo.png')); await a.downloadAsync(); return FileSystem.readAsStringAsync(a.localUri, { encoding: 'base64' }); };
const starPts = (cx, cy, R) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.4 : R; p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } return p.join(' '); };
const FLAG = `<svg width="84" height="56" viewBox="0 0 120 80"><rect width="120" height="80" fill="#00A3DD"/><line x1="-6" y1="86" x2="126" y2="-6" stroke="#F7D618" stroke-width="17"/><line x1="-6" y1="86" x2="126" y2="-6" stroke="#CE1021" stroke-width="10"/><polygon points="${starPts(20, 19, 11)}" fill="#F7D618"/></svg>`;
const share = async (html, title) => { const { uri } = await Print.printToFileAsync({ html }); await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title }); };

// Carte de recensement familial en PDF (QR signé uniquement si la carte est vérifiée)
export async function familyCardPdf(f) {
  const logo = await logo64(); const qr = f.paid && f.qr ? await QRCode.toString(f.qr, { type: 'svg', margin: 1 }) : '';
  const father = (f.members || []).find(m => m.kind === 'father'), mother = (f.members || []).find(m => m.kind === 'mother'); const head = father || (f.members || [])[0] || {};
  const html = `<html><body style="background:#fff;font-family:Arial;margin:0;padding:22px"><div style="width:560px;border:3px solid #0B5FC4;border-radius:20px;overflow:hidden">
  <table style="width:100%;padding:12px"><tr><td style="width:96px">${FLAG}</td><td style="padding-left:10px"><div style="font-size:11px;font-weight:bold">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</div><div style="font-size:17px;font-weight:bold;color:#0B5FC4">CARTE DE RECENSEMENT FAMILIAL</div><div style="font-size:12px;color:#5B6B7F">Ville de Bukavu</div></td><td style="width:54px;text-align:right"><img src="data:image/png;base64,${logo}" style="width:46px"/></td></tr></table>
  <div style="height:2px;background:#12263F;margin:0 12px"></div>
  <table style="width:100%;padding:12px"><tr><td style="vertical-align:top">
    <div style="display:inline-block;background:#E8C05A;border:1px solid #B98B22;border-radius:10px;padding:8px 12px;margin-bottom:10px"><div style="font-size:10px;color:#6A4E0F">Numéro</div><div style="font-size:20px;font-weight:bold;color:#3F2E05;letter-spacing:1px">${esc(f.code)}</div></div>
    <div style="font-size:10px;color:#6B7A8F">Nom de la famille</div><div style="font-weight:bold;margin-bottom:6px">${esc(f.family_name)}</div>
    <div style="font-size:10px;color:#6B7A8F">Père</div><div style="font-weight:bold;margin-bottom:6px">${esc(father && father.full_name) || '-'}</div>
    <div style="font-size:10px;color:#6B7A8F">Mère</div><div style="font-weight:bold;margin-bottom:6px">${esc(mother && mother.full_name) || '-'}</div>
    <div style="font-size:10px;color:#6B7A8F">Commune / Avenue / Quartier</div><div style="font-weight:bold;margin-bottom:6px">${esc([f.commune, f.avenue, f.quartier].filter(Boolean).join(' / '))}</div>
    <div style="font-size:10px;color:#6B7A8F">Enregistrée le ${d10(f.created_at)} - ${f.paid ? 'Vérifiée le ' + d10(f.paid_at) : 'Non vérifiée'}</div></td>
  <td style="width:130px;vertical-align:top;text-align:center"><img src="${head.photo_url ? fileUrl(head.photo_url) : SIL}" style="width:110px;height:134px;object-fit:cover;border-radius:12px"/>
    ${qr ? `<div style="width:96px;height:96px;margin:10px auto 0">${qr}</div><div style="font-size:11px;color:#5B6B7F">Scanner</div>` : '<div style="font-size:10px;color:#B3261E;margin-top:10px">Carte non vérifiée : pas de QR</div>'}</td></tr></table>
  <div style="padding:0 12px">${(f.members || []).slice(0, 8).map(m => `<img src="${m.photo_url ? fileUrl(m.photo_url) : SIL}" style="width:36px;height:36px;border-radius:18px;object-fit:cover;margin-right:6px"/>`).join('')}</div>
  <table style="width:100%;padding:12px"><tr><td>${f.signature ? `<svg width="150" height="60" viewBox="0 0 300 120"><path d="${esc(f.signature)}" stroke="#12263F" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '<div style="height:60px"></div>'}<div style="border-top:1px solid #9AA7B6;width:150px;font-size:10px;color:#6B7A8F;padding-top:2px">Recenseur : ${esc(f.recenseur) || '-'}</div></td>
    <td style="text-align:right;vertical-align:bottom"><div style="border-top:1px solid #9AA7B6;width:140px;margin-left:auto;font-size:10px;color:#6B7A8F;padding-top:2px">Responsable de la famille</div></td></tr></table>
  <div style="background:#0B2A5B;color:#fff;text-align:center;font-size:12px;font-weight:bold;padding:8px">Gouvance - NEXTI GIB</div></div></body></html>`;
  await share(html, 'Carte ' + f.code);
}

// Carte Gouvance du citoyen en PDF (verre clair, photo carrée, QR et « Scanner »)
export async function citizenCardPdf(p) {
  const logo = await logo64(); const qr = await QRCode.toString('GVID:' + p.gouvance_id, { type: 'svg', margin: 1 });
  const html = `<html><body style="background:#fff;font-family:Arial;padding:24px"><div style="width:520px;border-radius:30px;padding:4px;background:linear-gradient(135deg,#2E9E3F,#0B5FC4)"><div style="border-radius:27px;padding:20px;background:linear-gradient(135deg,#FFFFFF,#E9F3FF)">
  <table style="width:100%"><tr><td style="width:130px"><img src="${p.photo_url ? fileUrl(p.photo_url) : SIL}" style="width:120px;height:120px;object-fit:cover;border-radius:26px;border:3px solid #fff"/></td>
  <td style="padding-left:14px"><div style="font-size:34px;font-weight:bold"><span style="color:#2E9E3F">Gou</span><span style="color:#0B5FC4">vance</span></div><div style="color:#5B6B7F">Carte citoyen</div></td><td style="width:50px;text-align:right"><img src="data:image/png;base64,${logo}" style="width:44px"/></td></tr></table>
  <table style="width:100%;margin-top:18px"><tr><td style="vertical-align:bottom"><div style="font-size:21px;font-weight:bold;color:#12263F">${esc(p.full_name)}</div><div style="font-size:24px;font-weight:bold;color:#0B5FC4;margin-top:4px">${esc(p.gouvance_id)}</div></td>
  <td style="width:110px;text-align:center"><div style="width:96px;height:96px;margin:0 auto;background:#fff;padding:6px;border-radius:12px">${qr}</div><div style="font-size:12px;color:#5B6B7F;margin-top:4px">Scanner</div></td></tr></table></div></div></body></html>`;
  await share(html, 'Carte Gouvance');
}
