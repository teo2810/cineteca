/**
 * Cineteca — Google Apps Script (foglio collegato).
 * Incolla questo file nel progetto Apps Script del foglio, non in un progetto vuoto separato.
 * Sostituisci il TOKEN prima di pubblicare. Non committare il token vero nel repository.
 */
var TOKEN = "CAMBIA-QUESTO-TOKEN";
var SHEET_NAME = "Archivio";
var TZ = "Europe/Rome";

function doGet(e) {
  try {
    assertToken_(tokenFrom_(e, null));
    return json_({ ok: true, items: readAll_() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (parseErr) {
      return json_({ ok: false, error: "JSON non valido" });
    }
    assertToken_(tokenFrom_(e, body));
    if (!body.items || !Array.isArray(body.items)) {
      return json_({ ok: false, error: "Manca l'elenco items" });
    }
    return json_(upsert_(body.items));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function tokenFrom_(e, body) {
  if (body && body.token) return String(body.token);
  if (e && e.parameter && e.parameter.token) return String(e.parameter.token);
  return "";
}

function assertToken_(token) {
  if (!TOKEN || TOKEN === "CAMBIA-QUESTO-TOKEN") {
    throw new Error("Apri Code.gs e sostituisci CAMBIA-QUESTO-TOKEN con una frase segreta tua.");
  }
  if (!token || token !== TOKEN) throw new Error("Token non valido");
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Nessun foglio attivo. Incolla lo script dentro il foglio (Estensioni, Apps Script).");
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(["id", "updated", "del", "json"]);
    sh.setFrozenRows(1);
  } else if (String(sh.getRange(1, 1).getValue()) !== "id") {
    sh.insertRowBefore(1);
    sh.getRange(1, 1, 1, 4).setValues([["id", "updated", "del", "json"]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_() {
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < values.length; i++) {
    var raw = values[i][3];
    if (!raw) continue;
    try {
      var obj = JSON.parse(raw);
      if (obj && obj.id) items.push(obj);
    } catch (err) {
      /* riga illeggibile: si salta, non si cancella */
    }
  }
  return items;
}

function upsert_(items) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = sheet_();
    var values = sh.getDataRange().getValues();
    var rowById = {};
    for (var i = 1; i < values.length; i++) {
      if (values[i][0]) rowById[String(values[i][0])] = i + 1;
    }
    var written = 0;
    var skipped = 0;
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      if (!item || !item.id) continue;
      var id = String(item.id);
      var updated = Number(item.updated) || 0;
      var del = item.del ? true : false;
      var payload = JSON.stringify(item);
      var row = rowById[id];
      if (row) {
        var prev = Number(values[row - 1][1]) || 0;
        if (updated < prev) {
          skipped++;
          continue;
        }
        sh.getRange(row, 1, 1, 4).setValues([[id, updated, del, payload]]);
        values[row - 1] = [id, updated, del, payload];
      } else {
        sh.appendRow([id, updated, del, payload]);
        rowById[id] = sh.getLastRow();
      }
      written++;
    }
    return { ok: true, written: written, skipped: skipped };
  } finally {
    lock.releaseLock();
  }
}

/** Copia il foglio in una cartella di Drive. Da collegare a un trigger settimanale. */
function backup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = "Cineteca backup";
  var folders = DriveApp.getFoldersByName(name);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  var stamp = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd-HHmm");
  DriveApp.getFileById(ss.getId()).makeCopy("cineteca-" + stamp, folder);
}
