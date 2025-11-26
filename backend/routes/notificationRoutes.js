const express = require('express');
const controller = require('../controllers/notificationsController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticate, controller.addNotification);
router.get('/', authenticate, controller.getNotifications);
router.put('/mark-read', authenticate, controller.markAllAsRead);
router.get('/unread', authenticate, controller.getUnreadCount);

module.exports = router;
