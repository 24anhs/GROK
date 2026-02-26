import express from 'express';
import { YemotRouter } from 'yemot-router2';

const app = express();
const router = YemotRouter({
  printLog: true,
  timeout: '30s',
  removeInvalidChars: true
});

// Health check
app.get('/', (req, res) => res.send('✅ שרת ימות המשיח של GROK עובד!'));

// ====================== הלוגיקה ======================
router.get('/', async (call) => {
    console.log('שיחה חדשה מ:', call.phone);

    await call.id_list_message([
        { type: 'text', data: 'שלום! ברוך הבא למערכת GROK' }
    ]);

    const choice = await call.read(
        [{ type: 'text', data: 'לחץ 1 להזמנה\nלחץ 2 למידע\nלחץ 9 לניתוק' }],
        'tap',
        { max_digits: 1 }
    );

    if (choice === '1') {
        await call.id_list_message([{ type: 'text', data: 'מעביר להזמנות...' }]);
        call.go_to_folder('/orders');
    } 
    else if (choice === '2') {
        await call.id_list_message([{ type: 'text', data: 'המידע כאן...' }]);
    } 
    else if (choice === '9') {
        call.hangup();
    } 
    else {
        await call.id_list_message([{ type: 'text', data: 'לא הבנתי, נסה שוב' }]);
        call.go_to_folder('/');
    }
});

router.get('/orders', async (call) => {
    await call.id_list_message([{ type: 'text', data: 'בחר מוצר: 1-מוצר A, 2-מוצר B' }]);
    call.hangup();
});

// הרצה
app.use(router);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 שרת רץ על פורט ${PORT}`));
