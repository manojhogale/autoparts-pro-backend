const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  type: {
    type: String,
    enum: [
      'lowStock',
      'outOfStock',
      'reorder',
      'paymentDue',
      'paymentOverdue',
      'newSale',
      'dailySummary',
      'backup',
      'system',
      'other'
    ],
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  body: {
    type: String,
    required: true
  },
  
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  
  channels: [{
    type: String,
    enum: ['push', 'sms', 'whatsapp', 'email']
  }],
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  
  sentAt: Date,
  
  readAt: Date,
  
  error: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);