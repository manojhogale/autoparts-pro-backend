// models/Category.js
// ========================================
// Category Schema for AutoParts Pro
// Supports multi-level (parent-child) categories
// Example: Engine > Filters > Oil Filter
// ========================================

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    image: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
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

// ✅ Index for faster lookup by name
categorySchema.index({ name: 1 });

// ✅ Virtual: subcategories count
categorySchema.virtual('subcategoriesCount', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
  count: true,
});

// ✅ Middleware: cascading soft delete
categorySchema.pre('remove', async function (next) {
  const Category = this.model('Category');
  await Category.updateMany(
    { parentCategory: this._id },
    { $set: { isActive: false } }
  );
  next();
});

module.exports = mongoose.model('Category', categorySchema);