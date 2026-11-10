const nm = require('nodemailer');
const t = nm.createTransport({ host: process.env.SMTP_HOST, port: 465, secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
exports.sendMail = (to, subject, text) =>
  t.sendMail({ from: `Gouvance <${process.env.SMTP_USER}>`, to, subject, text });
