// Envoi d'emails : par relais HTTPS (MAIL_WEBHOOK_URL, pour Render qui bloque le SMTP) ou par SMTP classique.
const nm = require('nodemailer');
const t = nm.createTransport({ host: process.env.SMTP_HOST, port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
exports.sendMail = async (to, subject, text) => {
  if (process.env.MAIL_WEBHOOK_URL) {
    const r = await fetch(process.env.MAIL_WEBHOOK_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: process.env.MAIL_WEBHOOK_KEY, to, subject, text }) });
    if ((await r.text()).trim() !== 'ok') throw new Error('Envoi email refusé'); return;
  }
  return t.sendMail({ from: `Gouvance <${process.env.SMTP_USER}>`, to, subject, text });
};
