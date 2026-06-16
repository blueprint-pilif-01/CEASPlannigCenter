const { getDatabase } = require('../config/database');

/**
 * Get notifications for current user
 */
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 20, unread } = req.query;
    const db = getDatabase();

    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (unread === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(parseInt(limit));

    const notifications = await db.prepare(query).all(...params);

    res.json({ notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const db = getDatabase();

    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `).get(req.user.id);

    res.json({ count: parseInt(result?.count || 0) });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count', count: 0 });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const notification = await db.prepare('SELECT * FROM notifications WHERE id = $1').get(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    await db.prepare(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `).run(id);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const db = getDatabase();

    await db.prepare(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `).run(req.user.id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const notification = await db.prepare('SELECT * FROM notifications WHERE id = $1').get(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your notification' });
    }

    await db.prepare('DELETE FROM notifications WHERE id = $1').run(id);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
