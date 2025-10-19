// models/Backup.js
// ============================================================
// Backup Schema for AutoParts Pro
// ------------------------------------------------------------
// Used for tracking all auto/manual backups of the system.
// Each record logs file details, type, size, status & errors.
// ============================================================

const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema(
  {
    backupType: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'manual',
      required: true,
    },

    fileName: {
      type: String,
      required: [true, 'Backup file name is required'],
      trim: true,
    },

    fileUrl: {
      type: String,
      required: [true, 'Backup file URL is required'],
      trim: true,
    },

    fileSize: {
      type: Number, // in bytes
      default: 0,
    },

    storageProvider: {
      type: String,
      enum: ['local', 's3', 'gdrive'],
      default: 'local',
    },

    // ✅ List of backed-up collections (name + count)
    collections: [
      {
        name: { type: String, trim: true },
        count: { type: Number, default: 0 },
      },
    ],

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },

    error: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Index for faster date-wise queries
backupSchema.index({ createdAt: -1 });

// ✅ Virtual field: human-readable size
backupSchema.virtual('sizeInMB').get(function () {
  return this.fileSize ? (this.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';
});

// ✅ Static method: cleanup old backups (keep last N)
backupSchema.statics.cleanupOld = async function (limit = 20) {
  const total = await this.countDocuments();
  if (total > limit) {
    const oldBackups = await this.find().sort({ createdAt: 1 }).limit(total - limit);
    for (const b of oldBackups) {
      await b.deleteOne();
    }
  }
  return true;
};

// ✅ Middleware: mark completed time automatically
backupSchema.pre('save', function (next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Backup', backupSchema);
