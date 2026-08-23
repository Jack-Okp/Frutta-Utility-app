/**
 * ==============================================================================
 * FRUTTA UTILITY - GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ==============================================================================
 * Copy and paste this complete script into your Google Sheet:
 * 1. Open your Google Sheet (named "Frutta Utility DB")
 * 2. Click Extensions > Apps Script
 * 3. Delete any default code in Code.gs and paste this entire code below.
 * 4. Click Deploy > New deployment.
 * 5. Select type: Web app.
 * 6. Set "Execute as": Me (your email).
 * 7. Set "Who has access": Anyone.
 * 8. Click Deploy, authorize access, and copy the Web App URL!
 * 9. Paste the URL into your project's .env file:
 *    VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 * ==============================================================================
 */

function doGet(e) {
  var sheetName = e.parameter.sheet;
  if (!sheetName) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet parameter missing' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasValue = false;
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val !== "" && val !== null) hasValue = true;
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          obj[headers[j]] = JSON.parse(val);
        } else {
          obj[headers[j]] = val;
        }
      } catch (err) {
        obj[headers[j]] = val;
      }
    }
    if (hasValue) rows.push(obj);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var sheetName = contents.sheet;
    var action = contents.action; // 'insert' | 'update'
    var itemData = contents.data;
    var idField = contents.idField;
    var idValue = contents.idValue;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var values = sheet.getDataRange().getValues();
    var headers = [];

    if (values.length === 0 || values[0].length === 0 || (values.length === 1 && values[0][0] === "")) {
      headers = Object.keys(itemData);
      sheet.appendRow(headers);
    } else {
      headers = values[0];
      var currentKeys = Object.keys(itemData);
      currentKeys.forEach(function(k) {
        if (headers.indexOf(k) === -1) {
          headers.push(k);
          sheet.getRange(1, headers.length).setValue(k);
        }
      });
    }

    var rowToAppend = headers.map(function(h) {
      var val = itemData[h];
      if (val === undefined || val === null) return "";
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });

    if (action === 'update' && idField && idValue) {
      var idColIndex = headers.indexOf(idField);
      var updated = false;
      if (idColIndex !== -1 && values.length > 1) {
        for (var r = 1; r < values.length; r++) {
          if (String(values[r][idColIndex]) === String(idValue)) {
            for (var c = 0; c < headers.length; c++) {
              var val = itemData[headers[c]];
              var cellVal = (val === undefined || val === null) ? "" : (typeof val === 'object' ? JSON.stringify(val) : val);
              sheet.getRange(r + 1, c + 1).setValue(cellVal);
            }
            updated = true;
            break;
          }
        }
      }
      if (!updated) {
        sheet.appendRow(rowToAppend);
      }
    } else {
      sheet.appendRow(rowToAppend);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
