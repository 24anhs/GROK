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
const folderPath = '/3/';   // <--- שים לב: שיניתי ל-3/ כי זה מה שרואים בלוגים שלך

router.get('/', async (call) => {
  try {
    // זיהוי הקשה במהלך השמעת קובץ (הכי נפוץ בשלוחת השמעת קבצים)
    let currentFile = '';
    if (call.query.what) {
      const match = call.query.what.match(/\/(\d+)\.wav$/);
      if (match) currentFile = match[1];
    }

    if (currentFile) {
      console.log(`🔑 זוהתה הקשה במהלך קובץ: ${currentFile}`);

      const txtUrl = `${baseUrl}DownloadFile?token=${token}&path=ivr2:${folderPath}${currentFile}.txt`;
      const txtContent = await getFile(txtUrl);

      const phone = extractPhone(txtContent);
      if (!phone) {
        return call.say_hebrew('לא נמצא מספר טלפון תקין').hangup();
      }

      const members = await getMembers(templateId);
      const existing = members.entries.find(e => e.phone === phone);

      let msg = '';
      if (!existing) {
        await updateEntry(templateId, null, 0, phone);
        msg = 'המספר נוסף בהצלחה לרשימת התפוצה';
      } else {
        await updateEntry(templateId, existing.rowid, 1, phone);
        msg = 'המספר חוסם בהצלחה';
      }

      return call.say_hebrew(msg + '. תודה ולהתראות').hangup();
    }

    // אם אין הקשה – תפריט רגיל
    return call.id_list_message([
      't-שלום! ברוך הבא למערכת GROK',
      't-לחץ 1 להזמנה',
      't-לחץ 2 למידע',
      't-לחץ 9 לניתוק'
    ]);

  } catch (error) {
    console.error(error);
    return call.say_hebrew('שגיאה במערכת').hangup();
  }
});

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

app.get('/health', (req, res) => res.send('✅ שרת GROK עובד!'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
