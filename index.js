import express from 'express';
import { YemotRouter } from 'yemot-router2';

const app = express();
const router = YemotRouter({
  printLog: true,
  timeout: '30s',
  removeInvalidChars: true
});

// ====================== הרצה את ה-router קודם ======================
app.use(router);

// Health check - אחרי ה-router, כדי לא להפריע לבקשות ימות
app.get('/', (req, res) => {
  if (Object.keys(req.query).length > 0) {
    // אם יש פרמטרים (כמו ימות) – העבר ל-next, אבל מאחר שה-router כבר טיפל
    return res.status(404).send('Not found');
  }
  res.send('✅ שרת ימות המשיח של GROK עובד!');
});

// ======================
