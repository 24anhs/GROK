const express = require('express');
const https = require('https');
const urlModule = require('url');

const app = express();

const token = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const templateId = '1387640';
const baseUrl = 'https://www.call2all.co.il/ym/api/';
const folderPath = '/3/';   // ← שים לב: 3/ כמו בשלוחה שלך

app.get('/', async (req, res) => {
  try {
    const what = req.query.what || '';
    const match = what.match(/\/(\d+)\.wav$/);
    const currentFile = match ? match[1] : '';

    if (currentFile) {
      console.log(`🔑 זוהתה הקשה על קובץ ${currentFile}`);

      const txtUrl = `${baseUrl}DownloadFile?token=${token}&path=ivr2:${folderPath}${currentFile}.txt`;
      const txtContent = await getFile(txtUrl);

      const phone = extractPhone(txtContent);
      if (!phone) return res.send('say_hebrew^לא נמצא מספר טלפון');

      const members = await getMembers();
      const existing = members.entries.find(e => e.phone === phone);

      if (!existing) {
        await updateEntry(null, 0, phone);
        return res.send('say_hebrew^המספר נוסף בהצלחה לרשימה^hangup');
      } else {
        await updateEntry(existing.rowid, 1, phone);
        return res.send('say_hebrew^המספר חוסם בהצלחה^hangup');
      }
    }

    // תפריט רגיל
    return res.send('id_list_message^t-שלום! ברוך הבא למערכת GROK^t-לחץ 7 במהלך ההשמעה לבדיקה');

  } catch (e) {
    console.error(e);
    return res.send('say_hebrew^שגיאה במערכת^hangup');
  }
});

function getFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function extractPhone(t) {
  const m = t.match(/Phone-(\d+)/);
  return m ? m[1] : null;
}

async function getMembers() {
  const d = await getFile(`${baseUrl}GetTemplateEntries?token=${token}&templateId=${templateId}`);
  return JSON.parse(d);
}

async function updateEntry(rowid, blocked, phone) {
  const p = new urlModule.URLSearchParams({ token, templateId, blocked: blocked.toString() });
  if (rowid) p.append('rowid', rowid);
  if (phone) p.append('phone', phone);
  await getFile(`${baseUrl}UpdateTemplateEntry?${p}`);
}

app.get('/health', (req, res) => res.send('✅ GROK עובד!'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('✅ Server ready'));
