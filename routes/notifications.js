// =============================================================================
// routes/notifications.js
// =============================================================================
const express = require('express');
const router8 = express.Router();
const {
  sendNotification,
  scheduleNotification,
  listNotifications,
  markAsRead,
  cleanupOldNotifications,
} = require('../controllers/notificationController');
const { protect: protect8 } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router8.post('/send', protect8, authorize('admin', 'manager'), sendNotification);
router8.post('/schedule', protect8, authorize('admin'), scheduleNotification);
router8.get('/', protect8, listNotifications);
router8.patch('/:id/read', protect8, markAsRead);
router8.delete('/cleanup', protect8, authorize('admin'), cleanupOldNotifications);

module.exports = router8;