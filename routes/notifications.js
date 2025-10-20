// =============================================================================
// routes/notifications.js
// =============================================================================
const express = require('express');
const router = express.Router();
const {
  sendNotification,
  scheduleNotification,
  listNotifications,
  markAsRead,
  cleanupOldNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Send and manage system notifications
 */

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send a new notification immediately
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification sent successfully
 */
router.post('/send', protect, authorize('admin', 'manager'), sendNotification);

/**
 * @swagger
 * /notifications/schedule:
 *   post:
 *     summary: Schedule a notification for later
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification scheduled
 */
router.post('/schedule', protect, authorize('admin'), scheduleNotification);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', protect, listNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', protect, markAsRead);

/**
 * @swagger
 * /notifications/cleanup:
 *   delete:
 *     summary: Delete old notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.delete('/cleanup', protect, authorize('admin'), cleanupOldNotifications);

module.exports = router;