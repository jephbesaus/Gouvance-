// Google Apps Script : envoie les codes de vérification depuis votre Gmail (gratuit, 100 emails/jour).
// Remplacez CLE par un mot secret long (le même que MAIL_WEBHOOK_KEY sur Render).
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  if (d.key !== 'CLE') return ContentService.createTextOutput('refus');
  MailApp.sendEmail(d.to, d.subject, d.text);
  return ContentService.createTextOutput('ok');
}
