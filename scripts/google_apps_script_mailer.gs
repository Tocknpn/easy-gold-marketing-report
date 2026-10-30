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

    var subject = data.subject || "Daily Easy Gold Marketing BI report";
    var htmlBody = data.html || "<p>Daily Report Dispatch</p>";
    var plainBody = data.body || "Please open in an HTML-compatible email client.";

    // Attach exact pixel-perfect Visual PDF (from web canvas screenshot)
    var attachments = [];
    if (data.pdfBase64) {
      var cleanBase64 = String(data.pdfBase64)
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s/g, '');
      var decodedBytes = Utilities.base64Decode(cleanBase64);
      var safeDate = String(data.reportDate || 'Daily').replace(/\//g, '-');
      var fileName = data.pdfFilename || ('Easy_Gold_Executive_Report_' + safeDate + '.pdf');
      var visualPdfBlob = Utilities.newBlob(decodedBytes, 'application/pdf', fileName);
      attachments.push(visualPdfBlob);
    }

    // Prepare inline CID images for GmailApp
    var inlineImages = {};
    if (data.quickBriefBase64) {
      var qbBytes = Utilities.base64Decode(String(data.quickBriefBase64).replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, ''));
      inlineImages["quick_brief"] = Utilities.newBlob(qbBytes, 'image/jpeg', 'quick_brief.jpg');
    }
    if (data.dailyVelocityBase64) {
      var dvBytes = Utilities.base64Decode(String(data.dailyVelocityBase64).replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, ''));
      inlineImages["daily_velocity"] = Utilities.newBlob(dvBytes, 'image/jpeg', 'daily_velocity.jpg');
    }

    var options = {
      htmlBody: htmlBody,
      name: "Easy Gold Executive Report"
    };
    if (attachments.length > 0) {
      options.attachments = attachments;
    }
    if (Object.keys(inlineImages).length > 0) {
      options.inlineImages = inlineImages;
    }

    // Send email using native GmailApp
    GmailApp.sendEmail(recipients, subject, plainBody, options);

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
