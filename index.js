const express = require('express');
const https = require('https');
const urlModule = require('url');

const app = express();
const router = express.Router();
const yemotRouter = require('yemot-router2')(router);

app.use(router);

const token = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const templateId = '1387640';
const baseUrl = 'https://www.call2all.co.il/ym/api/';
const folderPath = '/3/'; // שנה אם התיקייה שלך אחרת (למשל /1/ או /5/)

router.get('/', async (call) => {
  try {
    // === זיהוי הקשה במהלך השמעת קובץ (PressKey + what) ===
    let isTapDuringPlayback = false;
    let currentFile = '';
    let pressedKey = '';

    if (call.query.PressKey || call.values.PressKey || call.query.what) {
      isTapDuringPlayback = true;
      pressedKey = call.query.PressKey || call.values.PressKey || call.values.tap || '7';

      // חילוץ שם הקובץ מה-what (ivr2:/3/000.wav)
      if (call.query.what) {
        const match = call.query.what.match(/\/(\d+)\.wav$/);
        if (match) currentFile = match[1];
      }
    }

    if (isTapDuringPlayback && currentFile) {
      console.log(`🔑 הקשה ${pressedKey} במהלך קובץ: ${currentFile}`);

      // הורדת TXT
      const txtUrl = baseUrl + 'DownloadFile?token=' + token + '&path=ivr2:' + folderPath + currentFile + '.txt';
      const txtContent = await getFile(txtUrl);

      const phone = extractPhone(txtContent);
      if (!phone) {
        return call.say_hebrew('לא נמצא מספר טלפון תקין בקובץ הטקסט').hangup();
      }

      // בדיקה והוספה/חסימה
      const members = await getMembers(templateId);
      const existing = members.entries.find(e => e.phone === phone);

      let actionMsg = '';
      if (!existing) {
        await updateEntry(templateId, null, 0, phone);
        actionMsg = 'המספר נוסף בהצלחה לרשימת התפוצה';
      } else {
        await updateEntry(templateId, existing.rowid, 1, phone);
        actionMsg = 'המספר חוסם בהצלחה';
      }

      // הודעה קולית + ניתוק
      return call.say_hebrew(actionMsg + '. תודה ולהתראות').hangup();
    } 

    // === אם אין הקשה – משמיע תפריט רגיל (לשלוחה 5) ===
    return call.id_list_message([
      't-שלום! ברוך הבא למערכת GROK',
      't-לחץ 1 להזמנה',
      't-לחץ 2 למידע',
      't-לחץ 9 לניתוק'
    ]);

  } catch (error) {
    console.error('שגיאה:', error);
    return call.say_hebrew('שגיאה במערכת').hangup();
  }
});

// === פונקציות עזר (אותו דבר כמו קודם) ===
function getFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractPhone(text) {
  const match = text.match(/Phone-(\d+)/);
  return match ? match[1] : null;
}

async function getMembers(templateId) {
  const url = `${baseUrl}GetTemplateEntries?token=${token}&templateId=${templateId}`;
  const data = await getFile(url);
  return JSON.parse(data);
}

async function updateEntry(templateId, rowid, blocked, phone) {
  const params = new urlModule.URLSearchParams({ token, templateId, blocked: blocked.toString() });
  if (rowid) params.append('rowid', rowid);
  if (phone) params.append('phone', phone);

  await getFile(`${baseUrl}UpdateTemplateEntry?${params.toString()}`);
}

// בריאות
app.get('/health', (req, res
