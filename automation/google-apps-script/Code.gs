/** Irenic Consulting business inquiries. Use a NEW Consulting Apps Script project. */
var BUSINESS = 'Irenic Consulting & Wellness Solutions LLC';
var HEADERS = ['Submission ID', 'Received UTC', 'Name', 'Email', 'Organization', 'Role', 'Service', 'Team size', 'Timeframe', 'Goals', 'Lead status', 'Owner notification', 'Notification attempts', 'Follow-up date', 'Notes'];

function setupConsultingInquiries() {
  var properties = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!properties.getProperty('SHARED_SECRET')) {
      properties.setProperty('SHARED_SECRET', Utilities.getUuid() + Utilities.getUuid());
    }
    if (!properties.getProperty('NOTIFICATION_EMAIL')) {
      var ownerEmail = Session.getEffectiveUser().getEmail();
      if (!ownerEmail) throw new Error('Set NOTIFICATION_EMAIL in Script Properties to your direct inbox, then run setup again.');
      // Send directly to the owning Google inbox; sending through its own forwarding alias can be suppressed.
      properties.setProperty('NOTIFICATION_EMAIL', ownerEmail);
    }
    if (!properties.getProperty('SHEET_ID')) {
      var book = SpreadsheetApp.create('Irenic Consulting — Business Inquiries');
      var sheet = book.getSheets()[0];
      sheet.setName('Inquiries');
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.getRange('C:J').setNumberFormat('@');
      sheet.getRange('O:O').setNumberFormat('@');
      var choices = SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Reviewing', 'Contacted', 'Proposal', 'Won', 'Closed'], true).build();
      sheet.getRange('K2:K1000').setDataValidation(choices);
      properties.setProperty('SHEET_ID', book.getId());
    }
    var exists = ScriptApp.getProjectTriggers().some(function (trigger) { return trigger.getHandlerFunction() === 'processPendingMail'; });
    if (!exists) ScriptApp.newTrigger('processPendingMail').timeBased().everyMinutes(5).create();
    // Never log the shared secret or any lead details.
    console.log('Setup complete. Lead log: https://docs.google.com/spreadsheets/d/' + properties.getProperty('SHEET_ID'));
  } finally { lock.releaseLock(); }
}

function json_(status, extra) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ status: status }, extra || {}))).setMimeType(ContentService.MimeType.JSON);
}
function sameSecret_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function safeCell_(value) {
  var text = String(value || '');
  // A browser submission must never become a spreadsheet formula.
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? "'" + text : text;
}
function originalCell_(value) {
  var text = String(value || '');
  return /^'[\s\u0000-\u001f]*[=+\-@]/.test(text) ? text.slice(1) : text;
}
function inquiryColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!HEADERS.every(function (name) { return headers.indexOf(name) >= 0; })) throw new Error('Invalid inquiry log headers.');
  return { headers: headers, status: headers.indexOf('Owner notification') + 1, attempts: headers.indexOf('Notification attempts') + 1 };
}
function validLead_(data) {
  if (!data || typeof data !== 'object' || !/^[a-f0-9-]{36}$/i.test(String(data.id || ''))) return false;
  var limits = { name: 100, email: 254, organization: 160, role: 100, service: 80, size: 40, timeframe: 50, message: 2000 };
  for (var key in limits) {
    if (typeof data[key] !== 'string' || data[key].length > limits[key]) return false;
  }
  if (!data.name.trim() || !data.organization.trim() || !data.message.trim() || /[\r\n]/.test(data.name + data.email + data.organization + data.role + data.service)) return false;
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(data.email)) return false;
  return ['Leadership development', 'Workplace mental health', 'Culture & psychological safety', 'Workshops & training', 'Organizational assessment', 'Ongoing consulting', 'Help choosing the right approach'].indexOf(data.service) >= 0;
}
function doGet() {
  var properties = PropertiesService.getScriptProperties();
  return json_(properties.getProperty('SHARED_SECRET') && properties.getProperty('SHEET_ID') ? 'consulting_inquiries_ready' : 'not_configured');
}
function doPost(event) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('SHARED_SECRET');
  if (!secret || secret.length < 32 || !props.getProperty('SHEET_ID')) return json_('not_configured');
  var raw = event && event.postData && event.postData.contents;
  if (!raw || raw.length > 12000) return json_('invalid_body');
  var data;
  try { data = JSON.parse(raw); } catch (_) { return json_('invalid_json'); }
  if (!sameSecret_(data.token, secret)) return json_('unauthorized');
  if (!validLead_(data)) return json_('invalid_lead');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_('busy');
  try {
    var sheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('Inquiries');
    var row = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(data.id).matchEntireCell(true).findNext() : null;
    if (row) return json_('accepted', { id: data.id, duplicate: true });
    var columns = inquiryColumns_(sheet);
    var values = [data.id, new Date().toISOString(), safeCell_(data.name), safeCell_(data.email),
      safeCell_(data.organization), safeCell_(data.role), safeCell_(data.service), safeCell_(data.size),
      safeCell_(data.timeframe), safeCell_(data.message), 'New', 'queued', 0, '', ''];
    // Reuse an earlier log safely if setup was already run; visitor email is disabled.
    sheet.appendRow(columns.headers.map(function (header) {
      if (header === 'Acknowledgement') return 'disabled';
      if (header === 'Ack attempts') return 0;
      var index = HEADERS.indexOf(header);
      return index >= 0 ? values[index] : '';
    }));
    SpreadsheetApp.flush();
    // Acceptance means the lead is saved. The authorized timer delivers mail separately.
    return json_('accepted', { id: data.id });
  } catch (_) {
    console.error('Consulting inquiry persistence failed.');
    return json_('save_failed');
  } finally { lock.releaseLock(); }
}

function processPendingMail() {
  var props = PropertiesService.getScriptProperties();
  var notify = String(props.getProperty('NOTIFICATION_EMAIL') || '').trim();
  if (!props.getProperty('SHEET_ID') || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(notify)) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var sheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('Inquiries');
    if (sheet.getLastRow() < 2) return;
    var columns = inquiryColumns_(sheet);
    var statusCol = columns.status;
    var attemptCol = columns.attempts;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, columns.headers.length).getValues();
    var processed = 0;
    for (var i = 0; i < rows.length && processed < 25; i++) {
      var row = rows[i];
      // Restore text if the spreadsheet retains our formula-neutralizing apostrophe.
      for (var cell = 2; cell < 10; cell++) row[cell] = originalCell_(row[cell]);
      // 'sending' is deliberately not retried: a crash may have happened after mail acceptance.
      var current = row[statusCol - 1];
      var attempts = Number(row[attemptCol - 1]) || 0;
      if ((current !== 'queued' && current !== 'failed') || attempts >= 3) continue;
      if (MailApp.getRemainingDailyQuota() < 1) return;
      sheet.getRange(i + 2, statusCol).setValue('sending');
      sheet.getRange(i + 2, attemptCol).setValue(attempts + 1);
      SpreadsheetApp.flush();
      var message = {
        to: notify, subject: 'New consulting inquiry — ' + row[6], name: BUSINESS, replyTo: String(row[3]),
        body: ['A business inquiry was saved.', '', 'Name: ' + row[2], 'Email: ' + row[3],
          'Organization: ' + row[4], 'Role: ' + row[5], 'Service: ' + row[6], 'Team size: ' + row[7],
          'Timeframe: ' + row[8], '', 'Goals:', String(row[9]), '',
          'Lead log: https://docs.google.com/spreadsheets/d/' + props.getProperty('SHEET_ID'),
          'Reference: ' + row[0], '', 'Review the lead and confirm scope, pricing, and scheduling directly.'].join('\n')
      };
      try {
        MailApp.sendEmail(message);
        sheet.getRange(i + 2, statusCol).setValue('sent');
      } catch (_) {
        sheet.getRange(i + 2, statusCol).setValue('failed');
        console.error('Consulting notification delivery failed; see lead log status.');
      }
      SpreadsheetApp.flush();
      processed++;
    }
  } finally { lock.releaseLock(); }
}
