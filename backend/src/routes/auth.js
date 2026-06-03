const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.AUTH_SECRET || 'secret';

function getUserFromToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

router.get('/me', async (req, res) => {
  const tokenUser = getUserFromToken(req);
  if (!tokenUser) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const result = await pool.query('SELECT id, email, is_admin FROM users WHERE id = $1', [tokenUser.id]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Пользователь не найден' });
  }

  return res.json({ user });
});

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, is_admin',
      [email, hashed]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: 'Пользователь уже существует или данные неверны' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }

  const result = await pool.query('SELECT id, email, password_hash, is_admin FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } });
});

module.exports = router;
