const notificationsService = require('../services/notificationsService');

async function addNotification(req, res) {
  try {
    const { user_id, title, message } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const targetUserId = req.user?.is_admin && user_id ? user_id : req.user?.id;
    if (!targetUserId) {
      return res.status(400).json({ message: 'User not specified' });
    }

    const created = await notificationsService.addNotification(targetUserId, title, message);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add notification' });
  }
}

async function getNotifications(req, res) {
  try {
    const notifications = await notificationsService.getNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load notifications' });
  }
}

async function markAllAsRead(req, res) {
  try {
    const unread = await notificationsService.markAllAsRead(req.user.id);
    res.json({ unread });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notifications' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const unread = await notificationsService.getUnreadCount(req.user.id);
    res.json({ unread });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load notification count' });
  }
}

module.exports = { addNotification, getNotifications, markAllAsRead, getUnreadCount };
