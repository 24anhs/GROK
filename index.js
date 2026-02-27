const express = require('express');
const https = require('https');
const url = require('url');

const app = express();

const TOKEN = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const TEMPLATE_ID = '1387640';
const BASE_URL = 'https://www.call2all.co.il/ym/api/';
const FOLDER = '/3/';  // שנה אם התיקייה שונה

function fetchUrl(fullUrl) {
  return new Promise((resolve, reject) => {
    https.get(fullUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

app.get('/', async (req, res) => {
  try {
    const what = req.query.what || '';
    const fileMatch = what.match(/\/(\d+)\.wav$/i);
    const fileName = fileMatch ? fileMatch[1] : '';

    if (fileName) {
      console.log(`Detected tap on file: ${fileName}`);

      const txtPath = `ivr2:${FOLDER}${fileName}.txt`;
      const txtUrl = `${BASE_URL}DownloadFile?token=${TOKEN}&path=${encodeURIComponent(txtPath)}`;
      const txt = await fetchUrl(txtUrl);

      const phoneMatch = txt.match(/Phone-(\d+)/);
      const phone = phoneMatch ? phoneMatch[1] : null;

      if (!phone) {
        return res.send('say_hebrew^לא נמצא מספר תקין בקובץ^hangup^yes');
      }

      // בדוק חברים
      const membersUrl = `${BASE_URL}GetTemplateEntries?token=${TOKEN}&templateId=${TEMPLATE_ID}`;
      const membersJson = await fetchUrl(membersUrl);
      let members;
      try {
        members = JSON.parse(membersJson);
      } catch (e) {
        return res.send('say_hebrew^שגיאה בקריאת הרשימה^hangup^yes');
      }

      const entry = members.entries ? members.entries.find(e => e.phone === phone) : null;

      let message = '';
      if (!entry) {
        // הוסף חדש - blocked=0
        const addParams = new url.URLSearchParams({
          token: TOKEN,
          templateId: TEMPLATE_ID,
          phone: phone,
          blocked: '0'
        });
        await fetchUrl(`${BASE_URL}UpdateTemplateEntry?${addParams.toString()}`);
        message = 'המספר נוסף בהצלחה לרשימה';
      } else {
        // חסום - blocked=1
        const blockParams = new url.URLSearchParams({
          token: TOKEN,
          templateId: TEMPLATE_ID,
          rowid: entry.rowid,
          blocked: '1'
        });
        await fetchUrl(`${BASE_URL}UpdateTemplateEntry?${blockParams.toString()}`);
        message = 'המספר חוסם בהצלחה';
      }

      return res.send(`say_hebrew^${message}. תודה ולהתראות^hangup^yes`);
    }

    // ברירת מחדל - תפריט פשוט
    return res.send('id_list_message^t-שלום! ברוך הבא^t-במהלך ההשמעה לחץ כל מקש לבדיקה וחסימה');

  } catch (err) {
    console.error(err);
    return res.send('say_hebrew^שגיאה טכנית במערכת^hangup^yes');
  }
});

app.get('/health', (req, res) => {
  res.send('✅ GROK עובד - ' + new Date().toISOString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
