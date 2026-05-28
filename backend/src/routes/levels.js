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

function isAuthenticated(req) {
  return Boolean(getUserFromToken(req));
}

router.get('/', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    const firstLevel = levels.filter((level) => level.id === 1);
    return res.json(firstLevel);
  }

  const progressResult = await pool.query(
    'SELECT level_id, best_time_seconds, attempts FROM progress WHERE user_id = $1',
    [user.id]
  );
  const progressMap = new Map(progressResult.rows.map((row) => [row.level_id, row]));

  return res.json(
    levels.map((level) => {
      const progress = progressMap.get(level.id);
      return {
        id: level.id,
        title: level.title,
        summary: level.summary,
        best_time_seconds: progress?.best_time_seconds ?? null,
        completed: Boolean(progress?.best_time_seconds),
        attempts: progress?.attempts ?? 0,
      };
    })
  );
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const level = levels.find((item) => item.id === id);
  if (!level) {
    return res.status(404).json({ message: 'Уровень не найден' });
  }

  if (!isAuthenticated(req) && id !== 1) {
    return res.status(403).json({ message: 'Только первый уровень доступен без входа' });
  }

  const user = getUserFromToken(req);
  if (!user) {
    return res.json(level);
  }

  const progressResult = await pool.query(
    'SELECT best_time_seconds, attempts FROM progress WHERE user_id = $1 AND level_id = $2',
    [user.id, id]
  );
  const progress = progressResult.rows[0];

  return res.json({
    ...level,
    best_time_seconds: progress?.best_time_seconds ?? null,
    completed: Boolean(progress?.best_time_seconds),
    attempts: progress?.attempts ?? 0,
  });
});

router.get('/:id/best', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const levelId = Number(req.params.id);
  const result = await pool.query(
    'SELECT best_time_seconds, attempts, updated_at FROM progress WHERE user_id = $1 AND level_id = $2',
    [user.id, levelId]
  );

  if (!result.rows.length) {
    return res.json({ best_time_seconds: null, attempts: 0 });
  }

  return res.json(result.rows[0]);
});

router.post('/:id/record', async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const levelId = Number(req.params.id);
  const durationSeconds = Number(req.body.durationSeconds);
  if (!levelId || levelId < 1 || Number.isNaN(durationSeconds) || durationSeconds <= 0) {
    return res.status(400).json({ message: 'Неверное время или уровень' });
  }

  const level = levels.find((item) => item.id === levelId);
  if (!level) {
    return res.status(404).json({ message: 'Уровень не найден' });
  }

  await pool.query(
    `INSERT INTO progress (user_id, level_id, best_time_seconds, attempts)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, level_id) DO UPDATE SET
       best_time_seconds = CASE
         WHEN progress.best_time_seconds IS NULL THEN EXCLUDED.best_time_seconds
         ELSE LEAST(progress.best_time_seconds, EXCLUDED.best_time_seconds)
       END,
       attempts = progress.attempts + 1,
       updated_at = CURRENT_TIMESTAMP`,
    [user.id, levelId, durationSeconds]
  );

  const saved = await pool.query(
    'SELECT best_time_seconds AS best_time_seconds, attempts, updated_at FROM progress WHERE user_id = $1 AND level_id = $2',
    [user.id, levelId]
  );

  return res.json(saved.rows[0]);
});

module.exports = router;
