// controllers/notificationController.js
// ======================================================================
// Notification Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Handles all outgoing notifications: Push (FCM), SMS (MSG91/Twilio),
// WhatsApp (via Business API or wa.me), and in-app logs.
// Supports templates, scheduling, and error tracking.
// ======================================================================

const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendSMS } = require('../utils/smsService');
const { sendWhatsAppMessage } = require('../utils/whatsappService');
const schedule = require('node-schedule');

// ✅ Firebase Admin initialized globally in config/firebase.js
// import '../config/firebase';


// =========================
// @desc    Send instant notification (Push + SMS + WhatsApp)
// @route   POST /api/notifications/send
// @access  Private/Admin
// =========================
exports.sendNotification = asyncHandler(async (req, res) => {
  const { userId, title, body, data = {}, channels = ['push'], phone } = req.body;

  const results = {};
  const errors = [];

  // 🔸 1. Push Notification (Firebase)
  if (channels.includes('push')) {
    try {
      if (!req.user?.fcmToken) throw new Error('No FCM token available');
      await admin.messaging().send({
        token: req.user.fcmToken,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      });
      results.push = '✅ Push sent';
    } catch (err) {
      errors.push(`Push failed: ${err.message}`);
    }
  }

  // 🔸 2. SMS Notification
  if (channels.includes('sms') && phone) {
    try {
      await sendSMS(phone, `${title}\n${body}`);
      results.sms = '✅ SMS sent';
    } catch (err) {
      errors.push(`SMS failed: ${err.message}`);
    }
  }

  // 🔸 3. WhatsApp Notification
  if (channels.includes('whatsapp') && phone) {
    try {
      await sendWhatsAppMessage(phone, `${title}\n${body}`);
      results.whatsapp = '✅ WhatsApp sent';
    } catch (err) {
      errors.push(`WhatsApp failed: ${err.message}`);
    }
  }

  // 🔸 4. Save Notification Log
  const log = await Notification.create({
    userId,
    type: 'custom',
    title,
    body,
    data,
    channels,
    status: errors.length ? 'partial' : 'sent',
    sentAt: new Date(),
  });

  res.status(200).json({
    success: true,
    message: errors.length ? 'Sent with some errors' : 'All notifications sent successfully',
    results,
    errors,
    logId: log._id,
  });
});


// =========================
// @desc    Schedule notification for future delivery
// @route   POST /api/notifications/schedule
// @access  Private/Admin
// =========================
exports.scheduleNotification = asyncHandler(async (req, res) => {
  const { userId, title, body, data = {}, channels, phone, scheduleAt } = req.body;

  if (!scheduleAt) {
    return res.status(400).json({ success: false, message: 'scheduleAt time required' });
  }

  const when = new Date(scheduleAt);
  const job = schedule.scheduleJob(when, async () => {
    await exports.sendNotification({
      body: { userId, title, body, data, channels, phone },
    });
  });

  await Notification.create({
    userId,
    type: 'scheduled',
    title,
    body,
    data,
    channels,
    status: 'scheduled',
    sentAt: when,
  });

  res.status(200).json({
    success: true,
    message: `Notification scheduled for ${when.toLocaleString()}`,
  });
});


// =========================
// @desc    List all notifications (latest first)
// @route   GET /api/notifications
// @access  Private
// =========================
exports.listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, userId } = req.query;

  const filter = {};
  if (userId) filter.userId = userId;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: notifications,
  });
});


// =========================
// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
// =========================
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  notification.readAt = new Date();
  await notification.save();

  res.status(200).json({ success: true, message: 'Notification marked as read' });
});


// =========================
// @desc    Clean up failed notifications (> 30 days)
// @route   DELETE /api/notifications/cleanup
// @access  Private/Admin
// =========================
exports.cleanupOldNotifications = asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  res.status(200).json({
    success: true,
    message: `Deleted ${deleted.deletedCount} old notifications`,
  });
});
