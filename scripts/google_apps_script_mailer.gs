/**
 * Easy Gold Executive BI Report - Google Apps Script Email Gateway
 * 
 * Instructions:
 * 1. Open https://script.google.com in your browser (logged in with tockppd@gmail.com or tock.easygold@gmail.com).
 * 2. Click "New Project" and paste this code.
 * 3. Click "Deploy" > "New deployment".
 * 4. Select type: "Web app".
 * 5. Configuration:
 *    - Description: "Easy Gold Report Mailer"
 *    - Execute as: "Me (your email address)"
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", authorize permissions when prompted.
 * 7. Copy the "Web app URL" (starts with https://script.google.com/macros/s/.../exec).
 * 8. Add it as an environment variable in Cloudflare Worker (and GitHub Secrets):
 *    - Name: GOOGLE_APPS_SCRIPT_URL
 *    - Value: <paste the URL>
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var recipients = Array.isArray(data.to) ? data.to.join(', ') : (data.to || "");
    if (!recipients) {
      throw new Error("Missing 'to' recipient address");
    }

    var subject = data.subject || "Easy Gold Executive Daily BI Report";
    var htmlBody = data.html || "<p>Daily Report Dispatch</p>";
    var plainBody = data.body || "Please open in an HTML-compatible email client.";

    // Send email using native GmailApp
    GmailApp.sendEmail(recipients, subject, plainBody, {
      htmlBody: htmlBody,
      name: "Easy Gold Executive Report"
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      recipients: recipients,
      sentAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Easy Gold Executive Report Google Mailer",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
