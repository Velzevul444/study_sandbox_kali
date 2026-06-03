const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const levelRoutes = require('./routes/levels');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend запущен на http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Ошибка инициализации БД:', err);
    process.exit(1);
  });
