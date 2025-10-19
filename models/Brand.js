// models/Brand.js
// ==========================================================
// Brand Schema for AutoParts Pro
// ----------------------------------------------------------
// Each product is associated with a brand.
// Supports logo uploads (via Cloudinary) and status toggling.
// ==========================================================

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    logo: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },

    countryOfOrigin: {
      type: String,
      trim: true,
      default: 'India',
    },

    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },

    website: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.+)?$/,
        'Please enter a valid website URL',
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Index for faster brand name search
brandSchema.index({ name: 1 });

// ✅ Middleware: auto-trim fields before save
brandSchema.pre('save', function (next) {
  if (this.name) this.name = this.name.trim();
  if (this.description) this.description = this.description.trim();
  next();
});

// ✅ Middleware: soft delete hook (when deactivated)
brandSchema.pre('findOneAndDelete', async function (next) {
  const brand = await this.model.findOne(this.getQuery());
  if (brand) {
    await brand.updateOne({ isActive: false });
  }
  next();
});

module.exports = mongoose.model('Brand', brandSchema);