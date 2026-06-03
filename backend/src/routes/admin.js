const express = require('express');
const jwt = require('jsonwebtoken');
const levels = require('../data/levels');
const { pool } = require('../db');

const router = express.Router();
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

async function requireAdmin(req, res, next) {
  const tokenUser = getUserFromToken(req);
  if (!tokenUser) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const result = await pool.query('SELECT id, email, is_admin FROM users WHERE id = $1', [tokenUser.id]);
  const user = result.rows[0];
  if (!user || !user.is_admin) {
    return res.status(403).json({ message: 'Доступ только для администратора' });
  }

  req.user = user;
  return next();
}

router.get('/results', requireAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT
       users.id AS user_id,
       users.email,
       progress.level_id,
       progress.best_time_seconds,
       progress.attempts,
       progress.completed_at,
       progress.updated_at
     FROM progress
     JOIN users ON users.id = progress.user_id
     ORDER BY users.email ASC, progress.level_id ASC`
  );

  const levelTitleMap = new Map(levels.map((level) => [level.id, level.title]));

  return res.json(
    result.rows.map((row) => ({
      ...row,
      level_title: levelTitleMap.get(row.level_id) || `Уровень ${row.level_id}`,
    }))
  );
});

module.exports = router;
