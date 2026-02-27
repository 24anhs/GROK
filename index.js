const express = require('express');
const https = require('https');
const urlModule = require('url');

const app = express();
const router = express.Router();
const yemotRouter = require('yemot-router2')(router);

app.use(router);

const TOKEN = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const TEMPLATE_ID = '1387640';
const BASE_URL = 'https://www.call2all.co.il/ym/api/';
const FOLDER_PATH = '/3/';   // שנה אם התיקייה שלך שונה

router.get('/', async (call) => {
  try {
    // ───────────────────────────────────────────────
    // זיהוי לחיצה במהלך השמעת קובץ
    // ───────────────────────────────────────────────
    let currentFile = null;

    if (call.query.what) {
      const match = call.query.what.match(/\/(\d+)\.wav$/i);
      if (match) currentFile = match[1];
    }

    if (currentFile) {
      console.log(`[TAP] זוהתה לחיצה במהלך קובץ: ${currentFile}`);

      // הורדת קובץ הטקסט המקביל
      const txtUrl = `${BASE_URL}DownloadFile?token=${TOKEN}&path=ivr2:${FOLDER_PATH}${currentFile}.txt`;
      const txtContent = await fetchText(txtUrl);

      const phone = extractPhone(txtContent);
      if (!phone) {
        return call.say_hebrew('לא נמצא מספר טלפון תקין בקובץ')
                   .hangup('no');
      }

      // בדיקת קיום ברשימת התפוצה
      const members = await getMembers();
      const existingEntry = members.entries?.find(e => e.phone === phone);

      let message = '';

      if (!existingEntry) {
        // הוספה (לא חסום)
        await updateEntry(null, 0, phone);
        message = 'המספר נוסף בהצלחה לרשימת התפוצה';
      } else {
        // חסימה
        await updateEntry(existingEntry.rowid, 1, phone);
        message = 'המספר נחסם בהצלחה';
      }

      // השמעת ההודעה + המשך ההשמעה מהמקום שבו הופסקה
      return call.say_hebrew(message)
                 .say_hebrew('ממשיכים...')
                 .hangup('no');   // חשוב! מאפשר המשך ההשמעה
    }

    // ───────────────────────────────────────────────
    // מצב רגיל – תפריט ראשי
    // ───────────────────────────────────────────────
    return call.id_list_message([
      't-שלום! ברוך הבא למערכת GROK',
      't-במהלך ההשמעה של הקובץ – לחץ כל מקש כדי לבדוק ולעדכן את הסטטוס של המספר',
      't-לחץ 9 לניתוק'
    ]);

  } catch (err) {
    console.error('שגיאה:', err.message || err);
    return call.say_hebrew('שגיאה טכנית במערכת, אנא נסה שוב מאוחר יותר')
               .hangup('no');
  }
});

// ───────────────────────────────────────────────
// פונקציות עזר
// ───────────────────────────────────────────────

async function fetchText(url) {
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

async function getMembers() {
  const url = `${BASE_URL}GetTemplateEntries?token=${TOKEN}&templateId=${TEMPLATE_ID}`;
  const jsonStr = await fetchText(url);
  return JSON.parse(jsonStr);
}

async function updateEntry(rowid, blocked, phone) {
  const params = new urlModule.URLSearchParams({
    token: TOKEN,
    templateId: TEMPLATE_ID,
    blocked: blocked.toString()
  });

  if (rowid) params.append('rowid', rowid);
  if (phone) params.append('phone', phone);

  const updateUrl = `${BASE_URL}UpdateTemplateEntry?${params.toString()}`;
  await fetchText(updateUrl);  // אנחנו לא בודקים תגובה – רק מבצעים
}

// Health check
app.get('/health', (req, res) => {
  res.send('✅ GROK עובד – ' + new Date().toISOString().slice(0,19));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
