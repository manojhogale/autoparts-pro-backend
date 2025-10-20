// models/Settings.js
// ======================================================================
// Settings Schema - AutoParts Pro
// ----------------------------------------------------------------------
// Global application settings - company info, billing, etc.
// Only one settings document should exist
// ======================================================================

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    company: {
      name: {
        type: String,
        required: true,
        default: 'AutoParts Pro',
      },
      address: {
        type: String,
        default: '',
      },
      phone: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please enter valid 10-digit phone'],
      },
      email: {
        type: String,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter valid email'],
      },
      gst: {
        type: String,
        uppercase: true,
      },
      logo: {
        url: String,
        publicId: String,
      },
    },

    billing: {
      taxEnabled: {
        type: Boolean,
        default: true,
      },
      defaultTax: {
        type: Number,
        default: 18,
        min: 0,
        max: 28,
      },
      invoicePrefix: {
        type: String,
        default: 'INV',
        uppercase: true,
      },
      termsConditions: {
        type: String,
        default: 'All sales are final. No refunds.',
      },
    },

    notifications: {
      lowStockAlert: {
        type: Boolean,
        default: true,
      },
      paymentReminders: {
        type: Boolean,
        default: true,
      },
      smsEnabled: {
        type: Boolean,
        default: false,
      },
      whatsappEnabled: {
        type: Boolean,
        default: false,
      },
    },

    backup: {
      autoBackup: {
        type: Boolean,
        default: true,
      },
      backupTime: {
        type: String,
        default: '02:00',
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document
settingsSchema.pre('save', async function (next) {
  const count = await this.constructor.countDocuments();
  if (count > 0 && this.isNew) {
    throw new Error('Settings document already exists');
  }
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);