// Envoi d'emails : Brevo (API HTTPS) > relais Google (webhook) > SMTP classique
const nm = require('nodemailer');
const t = nm.createTransport({ host: process.env.SMTP_HOST, port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
exports.sendMail = async (to, subject, text) => {
  if (process.env.BREVO_API_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Gouvance', email: process.env.BREVO_SENDER }, to: [{ email: to }], subject, textContent: text }) });
    if (!r.ok) throw new Error("Envoi de l'email refusé"); return;
  }
  if (process.env.MAIL_WEBHOOK_URL) {
    const r = await fetch(process.env.MAIL_WEBHOOK_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: process.env.MAIL_WEBHOOK_KEY, to, subject, text }) });
    if ((await r.text()).trim() !== 'ok') throw new Error("Envoi de l'email refusé"); return;
  }
  return t.sendMail({ from: `Gouvance <${process.env.SMTP_USER}>`, to, subject, text });
};
