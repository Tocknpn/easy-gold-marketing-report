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

    // If full PDF report HTML is provided, convert to PDF attachment
    var attachments = [];
    var reportContent = data.pdfHtml || null;
    if (reportContent) {
      var htmlBlob = Utilities.newBlob(reportContent, 'text/html', 'report.html');
      var pdfBlob = htmlBlob.getAs('application/pdf').setName('Easy_Gold_Executive_Report_' + (data.reportDate || 'Daily') + '.pdf');
      attachments.push(pdfBlob);
    }

    var options = {
      htmlBody: htmlBody,
      name: "Easy Gold Executive Report"
    };
    if (attachments.length > 0) {
      options.attachments = attachments;
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
