// models/SyncConflict.js
// ======================================================================
// Sync Conflict Schema - AutoParts Pro
// ----------------------------------------------------------------------
// Stores record-level conflicts that occur during sync between
// offline devices and server data. Helps prevent data loss by allowing
// admins or AI rules to decide which version to keep.
// ======================================================================

const mongoose = require('mongoose');

const conflictDetailSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },          // e.g. "price", "quantity"
    localValue: { type: mongoose.Schema.Types.Mixed },
    serverValue: { type: mongoose.Schema.Types.Mixed },
    localTimestamp: { type: Date },
    serverTimestamp: { type: Date },
    deviceId: { type: String, trim: true },
  },
  { _id: false }
);

const syncConflictSchema = new mongoose.Schema(
  {
    // 🔹 Entity information
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: [
        'Product',
        'Sale',
        'Purchase',
        'Udhari',
        'Quotation',
        'Category',
        'Brand',
        'User',
      ],
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },

    // 🔹 Conflicting fields
    conflicts: [conflictDetailSchema],

    // 🔹 Resolution status
    resolution: {
      type: String,
      enum: ['pending', 'auto-local', 'auto-server', 'manual', 'resolved'],
      default: 'pending',
    },

    // 🔹 Resolution details
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String, trim: true },

    // 🔹 Metadata
    deviceInfo: {
      localDeviceId: { type: String, trim: true },
      localDeviceName: { type: String, trim: true },
      serverDeviceId: { type: String, trim: true },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes for fast lookups
syncConflictSchema.index({ entityType: 1, entityId: 1 });
syncConflictSchema.index({ resolution: 1, createdAt: -1 });

// ✅ Virtual helper
syncConflictSchema.virtual('isUnresolved').get(function () {
  return this.resolution === 'pending' || this.resolution === 'manual';
});

// ✅ Auto-update updatedAt
syncConflictSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SyncConflict', syncConflictSchema);
