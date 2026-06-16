/**
 * Utility pentru crearea notificărilor
 */

function createNotification(db, { userId, type, title, message, actionUrl, actionLabel, relatedId }) {
  const result = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, action_url, action_label, related_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, type, title, message, actionUrl || null, actionLabel || null, relatedId || null);

  return result.lastInsertRowid;
}

function createBulkNotifications(db, userIds, { type, title, message, actionUrl, actionLabel, relatedId }) {
  for (const userId of userIds) {
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, action_url, action_label, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, title, message, actionUrl || null, actionLabel || null, relatedId || null);
  }
}

module.exports = {
  createNotification,
  createBulkNotifications
};

