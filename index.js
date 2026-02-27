// index.js – גרסה ESM

import express from 'express';
import https from 'https';
import { URLSearchParams } from 'url';
import yemotRouterInit from 'yemot-router2';

const app = express();
const router = express.Router();
const call = yemotRouterInit(router);

app.use(router);

const TOKEN = 'WU1BUElL.apik_owJJz4IQ1z0pa_O-scE6rw.NTXls1kFwOLUwwYefyEXXFszW7y-qYl29gQVsVZU4d4';
const TEMPLATE_ID = '1387640';
const BASE_URL = 'https://www.call2all.co.il/ym/api/';
const FOLDER_PATH = '/3/';   // שנה אם צריך

router.get('/', async (req, res) => {
    try {
        // זיהוי לחיצה במהלך השמעת קובץ
        let currentFile = null;
        if (req.query.what) {
            const match = req.query.what.match(/\/(\d+)\.wav$/i);
            if (match) currentFile = match[1];
        }

        if (currentFile) {
            console.log(`לחיצה זוהתה בקובץ: ${currentFile}`);

            const txtUrl = `${BASE_URL}DownloadFile?token=${TOKEN}&path=ivr2:${FOLDER_PATH}${currentFile}.txt`;
            const txtContent = await downloadText(txtUrl);

            const phone = extractPhone(txtContent);
            if (!phone) {
                return res.send('say_hebrew^לא נמצא מספר טלפון תקין בקובץ^hangup=no');
            }

            const members = await getDistributionListMembers();
            const existing = members.entries?.find(e => e.phone === phone);

            let message = '';
            if (!existing) {
                await updateDistributionEntry(null, 0, phone);
                message = 'המספר נוסף בהצלחה לרשימה';
            } else {
                await updateDistributionEntry(existing.rowid, 1, phone);
                message = 'המספר נחסם בהצלחה';
            }

            // השמעת הודעה + המשך ההשמעה
            return res.send(
                `say_hebrew^${message}^say_hebrew^ממשיכים...^hangup=no`
            );
        }

        // תפריט ראשי אם אין לחיצה
        return res.send(
            'id_list_message^' +
            't-שלום! ברוך הבא למערכת GROK^t-' +
            'במהלך ההשמעה לחץ כל מקש כדי לבדוק ולעדכן סטטוס^t-' +
            'לחץ 9 לניתוק'
        );

    } catch (err) {
        console.error(err);
        return res.send('say_hebrew^שגיאה במערכת, אנא נסה שוב^hangup=no');
    }
});

// פונקציות עזר
async function downloadText(url) {
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

async function getDistributionListMembers() {
    const url = `${BASE_URL}GetTemplateEntries?token=${TOKEN}&templateId=${TEMPLATE_ID}`;
    const raw = await downloadText(url);
    return JSON.parse(raw);
}

async function updateDistributionEntry(rowid, blocked, phone) {
    const params = new URLSearchParams({
        token: TOKEN,
        templateId: TEMPLATE_ID,
        blocked: String(blocked)
    });
    if (rowid) params.append('rowid', rowid);
    if (phone) params.append('phone', phone);

    const url = `${BASE_URL}UpdateTemplateEntry?${params.toString()}`;
    await downloadText(url);
}

// health
app.get('/health', (req, res) => {
    res.send('✅ GROK עובד – ' + new Date().toISOString().slice(0, 19));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
