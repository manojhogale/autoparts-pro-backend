const admin = require('../config/firebase');
const logger = require('../config/logger');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSMS } = require('./smsService');
const { sendWhatsApp } = require('./whatsappService');

// Send push notification
exports.sendPushNotification = async (userId, notification) => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      logger.warn(`No FCM token for user: ${userId}`);
      return;
    }

    const message = {
      token: user.fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'autoparts_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    await admin.messaging().send(message);
    logger.info(`Push notification sent to user: ${userId}`);

    // Save notification to database
    await Notification.create({
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      channels: ['push'],
      status: 'sent',
      sentAt: new Date()
    });

  } catch (error) {
    logger.error(`Send push notification error: ${error.message}`);
  }
};

// Send notification to all admins
exports.sendNotificationToAdmins = async (notification) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true });

    for (const admin of admins) {
      await exports.sendPushNotification(admin._id, notification);
    }

  } catch (error) {
    logger.error(`Send notification to admins error: ${error.message}`);
  }
};

// Send topic notification
exports.sendTopicNotification = async (topic, notification) => {
  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {}
    };

    await admin.messaging().send(message);
    logger.info(`Topic notification sent to: ${topic}`);

  } catch (error) {
    logger.error(`Send topic notification error: ${error.message}`);
  }
};

// Send low stock alert
exports.sendLowStockAlert = async (product) => {
  try {
    const notification = {
      type: 'lowStock',
      title: 'Low Stock Alert',
      body: `${product.name} is running low. Current stock: ${product.stock}`,
      data: {
        productId: product._id.toString(),
        productName: product.name,
        stock: product.stock.toString()
      }
    };

    await exports.sendNotificationToAdmins(notification);

  } catch (error) {
    logger.error(`Send low stock alert error: ${error.message}`);
  }
};

// Send payment reminder (WhatsApp)
exports.sendWhatsAppReminder = async (udhari) => {
  try {
    const message = `⏰ Payment Reminder\n\nDear ${udhari.partyName},\n\nYour payment of ₹${udhari.pendingAmount} is pending.\n\nBill No: ${udhari.billNo}\nDue Date: ${udhari.dueDate ? udhari.dueDate.toLocaleDateString() : 'N/A'}\n\nPlease make payment at your earliest convenience.\n\nThank you!\n${process.env.COMPANY_NAME}`;

    await sendWhatsApp(udhari.phone, message);
    logger.info(`WhatsApp reminder sent to: ${udhari.phone}`);

  } catch (error) {
    logger.error(`Send WhatsApp reminder error: ${error.message}`);
  }
};

// Send payment reminder (SMS)
exports.sendSMSReminder = async (udhari) => {
  try {
    const message = `Payment reminder: Your payment of Rs.${udhari.pendingAmount} is pending for Bill ${udhari.billNo}. Please pay soon. ${process.env.COMPANY_NAME}`;

    await sendSMS(udhari.phone, message);
    logger.info(`SMS reminder sent to: ${udhari.phone}`);

  } catch (error) {
    logger.error(`Send SMS reminder error: ${error.message}`);
  }
};

// Send scheduled reminders (Cron job)
exports.sendScheduledReminders = async () => {
  try {
    const Udhari = require('../models/Udhari');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get udhari records due tomorrow
    const dueTomorrow = await Udhari.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['pending', 'partial'] },
      type: 'sale'
    });

    for (const udhari of dueTomorrow) {
      await exports.sendWhatsAppReminder(udhari);
    }

    logger.info(`Scheduled reminders sent: ${dueTomorrow.length}`);

  } catch (error) {
    logger.error(`Send scheduled reminders error: ${error.message}`);
  }
};

// Send notification (generic)
exports.sendNotification = async (notification) => {
  try {
    // Save to database
    await Notification.create(notification);

    // Send based on type
    if (notification.type === 'lowStock') {
      await exports.sendLowStockAlert(notification.data);
    }

  } catch (error) {
    logger.error(`Send notification error: ${error.message}`);
  }
};