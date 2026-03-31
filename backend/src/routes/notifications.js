const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate);

// Get user notifications
router.get('/', async (req, res) => {
  const { limit = 20, unreadOnly } = req.query;
  let where = 'WHERE user_id = $1';
  const params = [req.user.id];
  if (unreadOnly === 'true') where += ' AND is_read = false';

  const result = await query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2`,
    [...params, parseInt(limit)]
  );
  res.json({ success: true, data: result.rows });
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
});

// Create notification (admin/system use)
router.post('/', async (req, res) => {
  const { userId, title, message, type = 'info' } = req.body;
  const result = await query(
    'INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [uuidv4(), userId || req.user.id, title, message, type]
  );
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId || req.user.id}`).emit('notification', result.rows[0]);
  }
  res.status(201).json({ success: true, data: result.rows[0] });
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  const result = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
    [req.user.id]
  );
  res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
});

module.exports = router;
