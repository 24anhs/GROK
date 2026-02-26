import express from 'express';
import { YemotRouter, ExitError } from 'yemot-router2';

const app = express();
const router = YemotRouter({
  printLog: true,
  timeout: 60000,
  removeInvalidChars: true,
  uncaughtErrorHandler: (error, call) => {
    console.error('שגיאה לא מטופלת:', error);
    call.id_list_message([{ type: 'text', data: 'שגיאה במערכת, נסה שוב.' }]);
    call.hangup();
  }
});

// ====================== הלוגיקה ======================
router.get('/', async (call) => {
    try {
        console.log('שיחה חדשה מ:', call.phone);

        await call.id_list_message([
            { type: 'text', data: 'שלום! ברוך הבא למערכת GROK' }
        ], { prependToNextAction: true });

        const choice = await call.read([
            { type: 'text', data: 'לחץ 1 להזמנה' },
            { type: 'text', data: 'לחץ 2 למידע' },
            { type: 'text', data: 'לחץ 9 לניתוק' }
        ], 'tap', { max_digits: 1 });

        console.log('choice:', choice);

        if (choice === '1') {
            await call.id_list_message([{ type: 'text', data: 'מעביר להזמנות...' }]);
            call.go_to_folder('/orders');
        } else if (choice === '2') {
            await call.id_list_message([{ type: 'text', data: 'המידע כאן...' }]);
            call.hangup();
        } else if (choice === '9') {
            call.hangup();
        } else {
            await call.id_list_message([{ type: 'text', data: 'לא הבנתי, נסה שוב' }]);
            call.go_to_folder('/');
        }
    } catch (error) {
        if (error instanceof ExitError) {
            // נורמלי, להתעלם
        } else {
            console.error('שגיאה בלוגיקה:', error);
            await call.id_list_message([{ type: 'text', data: 'אוי, שגיאה! נסה שוב מאוחר יותר.' }]);
            call.hangup();
        }
    }
});

router.get('/orders', async (call) => {
    try {
        await call.id_list_message([{ type: 'text', data: 'בחר מוצר: 1-מוצר A, 2-מוצר B' }]);
        call.hangup();
    } catch (error) {
        console.error('שגיאה בהזמנות:', error);
        call.hangup();
    }
});

// ====================== הרצה ======================
app.use(router);

// Health check
app.get('/health', (req, res) => res.send('✅ שרת ימות המשיח של GROK עובד!'));

// Handler לשגיאות כלליות (מונע HTML)
app.use((err, req, res, next) => {
    console.error('שגיאה Express:', err);
    res.status(500).send('שגיאה פנימית');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 שרת רץ על פורט ${PORT}`);
});
