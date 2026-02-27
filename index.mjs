// index.mjs – גרסה ESM מלאה

import express from 'express';
import https from 'https';
import { URLSearchParams } from 'url';
import { YemotRouter } from 'yemot-router2';

const app = express();
const router = YemotRouter();  // יוצר את ה-router (לפי התיעוד של v6+)

app.use(router);

const TOKEN = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const TEMPLATE_ID = '1387640';
const BASE_URL = 'https://www.call2all.co.il/ym/api/';
const FOLDER_PATH = '/3/';   // ← שנה אם התיקייה אחרת

router.get('/', async (call) => {
  try {
    // זיהוי לחיצה במהלך השמעת קובץ
    let currentFile = null;
    if (call.query.what) {
      const match = call.query.what.match(/\/(\d+)\.wav$/i);
      if (match) currentFile = match[1];
    }

    if (currentFile) {
      console.log(`לחיצה זוהתה על קובץ: ${currentFile}`);

      const txtUrl = `${BASE_URL}DownloadFile?token=${TOKEN}&path=ivr2:${FOLDER_PATH}${currentFile}.txt`;
      const txtContent = await fetchText(txtUrl);

      const phone = extractPhone(txtContent);
      if (!phone) {
        return call.say_hebrew('לא נמצא מספר טלפון תקין בקובץ').hangup('no');
      }

      const members = await getMembers();
      const entry = members.entries?.find(e => e.phone === phone);

      let msg = '';
      if (!entry) {
        await updateEntry(null, 0, phone);
        msg = 'המספר נוסף בהצלחה לרשימה';
      } else {
        await updateEntry(entry.rowid, 1, phone);
        msg = 'המספר נחסם בהצלחה';
      }

      // השמע הודעה + המשך מאותו מקום (hangup=no חשוב!)
      return call.say_hebrew(msg)
                 .say_hebrew('ממשיכים...')
                 .hangup('no');
    }

    // תפריט ראשי
    return call.id_list_message([
      't-שלום! ברוך הבא למערכת GROK',
      't-במהלך השמעת קובץ – לחץ כל מקש כדי לעדכן סטטוס',
      't-לחץ 9 לניתוק'
    ]);

  } catch (err) {
    console.error('שגיאה:', err);
    return call.say_hebrew('שגיאה במערכת').hangup('no');
  }
});

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractPhone(text) {
  const match = text.match(/Phone-(\d+)/);
  return match ? match[1] : null;
}

async function getMembers() {
  const url = `${BASE_URL}GetTemplateEntries?token=${TOKEN}&templateId=${TEMPLATE_ID}`;
  const data = await fetchText(url);
  return JSON.parse(data);
}

async function updateEntry(rowid, blocked, phone) {
  const params = new URLSearchParams({
    token: TOKEN,
    templateId: TEMPLATE_ID,
    blocked: String(blocked)
  });
  if (rowid) params.append('rowid', rowid);
  if (phone) params.append('phone', phone);

  await fetchText(`${BASE_URL}UpdateTemplateEntry?${params.toString()}`);
}

app.get('/health', (req, res) => res.send('✅ GROK עובד – ' + new Date().toISOString().slice(0,19)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
