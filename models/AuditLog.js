// models/AuditLog.js
// ==================================================================
// Audit Log Schema for AutoParts Pro
// ------------------------------------------------------------------
// Tracks every critical user/system action — CREATE, UPDATE, DELETE,
// LOGIN, LOGOUT, VIEW, EXPORT, SYNC, etc.
// Includes before/after snapshots, device info & network metadata.
// ==================================================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // 🔹 Who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    // 🔹 What action was performed
    action: {
      type: String,
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'VIEW',
        'EXPORT',
        'SYNC',
      ],
      required: true,
    },

    // 🔹 Which entity was affected
    entity: {
      type: String,
      required: [true, 'Entity name is required'],
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    // 🔹 Data changes (before/after)
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },

    // 🔹 Device metadata
    deviceInfo: {
      deviceId: { type: String, trim: true },
      deviceName: { type: String, trim: true },
      os: { type: String, trim: true },
      platform: { type: String, trim: true },
      appVersion: { type: String, trim: true },
    },

    // 🔹 Network metadata
    networkInfo: {
      ipAddress: { type: String, trim: true },
      isOffline: { type: Boolean, default: false },
      syncedAt: { type: Date },
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
    },

    // 🔹 Other technical metadata
    metadata: {
      userAgent: { type: String },
      referrer: { type: String },
      duration: { type: Number }, // API call duration
      success: { type: Boolean, default: true },
      errorMessage: { type: String, trim: true },
    },

    // 🔹 Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes for faster analytics
auditLogSchema.index({ userId: 1, action: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ 'networkInfo.ipAddress': 1 });

// ✅ Static method: create log easily
auditLogSchema.statics.logAction = async function (logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (err) {
    console.error('Error saving audit log:', err.message);
  }
};

// ✅ Middleware: auto trim errorMessage if too long
auditLogSchema.pre('save', function (next) {
  if (this.metadata?.errorMessage && this.metadata.errorMessage.length > 500) {
    this.metadata.errorMessage = this.metadata.errorMessage.substring(0, 500);
  }
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);