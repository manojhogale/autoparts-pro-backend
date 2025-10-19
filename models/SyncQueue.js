// models/SyncQueue.js
// ======================================================================
// Sync Queue Schema - AutoParts Pro
// ----------------------------------------------------------------------
// Stores all offline CRUD operations queued for synchronization.
// Each record represents a local change (CREATE/UPDATE/DELETE)
// waiting to sync with the cloud database.
// ======================================================================

const mongoose = require('mongoose');

const syncQueueSchema = new mongoose.Schema(
  {
    // 🔹 Entity info
    entity: {
      type: String,
      required: [true, 'Entity name is required'],
      trim: true,
      enum: [
        'User',
        'Product',
        'Sale',
        'Purchase',
        'Udhari',
        'Quotation',
        'Category',
        'Brand',
        'Notification',
      ],
    },

    // 🔹 Action to perform on server
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'UPDATE', 'DELETE'],
    },

    // 🔹 Entity reference ID (for UPDATE/DELETE)
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    // 🔹 Full payload data (used for CREATE/UPDATE)
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Sync data payload is required'],
    },

    // 🔹 Device / Client info
    deviceId: { type: String, trim: true },
    deviceName: { type: String, trim: true },
    appVersion: { type: String, trim: true },

    // 🔹 Sync status
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
    },

    // 🔹 Error details (if failed)
    error: { type: String, trim: true },

    // 🔹 Retry count
    retries: { type: Number, default: 0 },

    // 🔹 Timestamp of sync
    syncedAt: { type: Date },

    // 🔹 User performing the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes for faster lookups
syncQueueSchema.index({ entity: 1, status: 1 });
syncQueueSchema.index({ deviceId: 1 });
syncQueueSchema.index({ createdAt: -1 });

// ✅ Virtual helper to check if eligible for retry
syncQueueSchema.virtual('canRetry').get(function () {
  return this.status === 'failed' && this.retries < 3;
});

// ✅ Auto-update retries count
syncQueueSchema.pre('save', function (next) {
  if (this.status === 'failed') {
    this.retries = (this.retries || 0) + 1;
  }
  next();
});

module.exports = mongoose.model('SyncQueue', syncQueueSchema);
