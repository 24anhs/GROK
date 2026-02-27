const express = require('express');
const https = require('https');
const urlModule = require('url'); // לעבודה עם URLSearchParams

const app = express();
const router = express.Router();
const yemotRouter = require('yemot-router2')(router);

app.use(router);

const token = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const templateId = '1387640';
const baseUrl = 'https://www.call2all.co.il/ym/api/';
const folderPath = '/1/'; // הנחה: שנה לתיקייה האמיתית של הקבצים, ללא סיומת

router.get('/', async (call) => {
  try {
    if (call.hangup_reason === 'tap_during_message') {
      const dtmf = call.values.tap; // המקש שהוקש (אפשר לסנן מקש ספציפי אם צריך)
      const currentFile = call.values.message_id; // שם הקובץ הנוכחי (למשל '000')

      // הורד קובץ TXT מקביל
      const txtPath = folderPath + currentFile + '.txt';
      const txtUrl = baseUrl + 'DownloadFile?token=' + token + '&path=ivr2:' + txtPath;
      const txtContent = await getFile(txtUrl);

      // חלץ מספר טלפון
      const phone = extractPhone(txtContent);
      if (!phone) {
        return call.hangup(); // אם אין מספר, נתק
      }

      // בדוק חברים ברשימה
      const members = await getMembers(templateId);
      const existing = members.entries.find(e => e.phone === phone);

      if (!existing) {
        // הוסף חדש (רגיל, blocked=0)
        await updateEntry(templateId, null, 0, phone);
      } else {
        // חסום (blocked=1)
        await updateEntry(templateId, existing.rowid, 1, phone);
      }

      // המשך או נתק (כאן: נתק אחרי פעולה)
      return call.hangup();
    } else {
      // לוגיקה רגילה: השמע רשימת קבצים (שנה לרשימה האמיתית)
      return call.id_list_message([
        'f-000', // קובץ 000
        'f-001', // וכו'
        'f-002'
      ]);
    }
  } catch (error) {
    console.error(error);
    return call.hangup();
  }
});

// פונקציה להורדת קובץ כטקסט
function getFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// חלץ מספר טלפון מהטקסט
function extractPhone(text) {
  const match = text.match(/Phone-(\d+)/);
  return match ? match[1] : null;
}

// קבל רשימת חברים
async function getMembers(templateId) {
  const url = baseUrl + 'GetTemplateEntries?token=' + token + '&templateId=' + templateId;
  const data = await getFile(url);
  return JSON.parse(data);
}

// עדכן/הוסף חבר (אם rowid null - הוסף חדש)
async function updateEntry(templateId, rowid, blocked, phone) {
  const params = new urlModule.URLSearchParams({
    token,
    templateId,
    blocked: blocked.toString()
  });
  if (rowid) params.append('rowid', rowid.toString());
  if (phone) params.append('phone', phone);

  const url = baseUrl + 'UpdateTemplateEntry?' + params.toString();
  await getFile(url); // התגובה היא JSON, אבל אנחנו לא צריכים אותה אם OK
}

// בריאות
app.get('/health', (req, res) => res.send('✅'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
