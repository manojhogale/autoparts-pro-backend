// controllers/categoryController.js
// ======================================================================
// Category Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Handles CRUD operations for product categories.
// Supports nested parent categories, pagination, search, and soft delete.
// ======================================================================

const Category = require('../models/Category');
const asyncHandler = require('../middlewares/asyncHandler');

// =========================
// @desc    Get all categories (with pagination & search)
// @route   GET /api/categories
// @access  Private
// =========================
exports.getCategories = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;

  const filter = search
    ? { name: { $regex: search, $options: 'i' }, isActive: true }
    : { isActive: true };

  const categories = await Category.find(filter)
    .populate('parentCategory', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Category.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: categories,
  });
});

// =========================
// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Private
// =========================
exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate(
    'parentCategory',
    'name'
  );

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  res.status(200).json({ success: true, data: category });
});

// =========================
// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
// =========================
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, parentCategory, description, image } = req.body;

  const existing = await Category.findOne({ name: name.trim() });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: 'Category with this name already exists' });
  }

  const category = await Category.create({
    name: name.trim(),
    parentCategory: parentCategory || null,
    description,
    image,
    isActive: true,
    createdAt: new Date(),
  });

  res.status(201).json({ success: true, data: category });
});

// =========================
// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
// =========================
exports.updateCategory = asyncHandler(async (req, res) => {
  const updates = req.body;

  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  Object.assign(category, updates, { updatedAt: new Date() });
  await category.save();

  res.status(200).json({ success: true, data: category });
});

// =========================
// @desc    Delete (soft delete) category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
// =========================
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  category.isActive = false;
  await category.save();

  res.status(200).json({ success: true, message: 'Category deactivated successfully' });
});

// =========================
// @desc    Get subcategories of a category
// @route   GET /api/categories/:id/subcategories
// @access  Private
// =========================
exports.getSubCategories = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subCategories = await Category.find({
    parentCategory: id,
    isActive: true,
  }).sort({ name: 1 });

  res.status(200).json({ success: true, data: subCategories });
});

// =========================
// @desc    Restore soft-deleted category
// @route   PATCH /api/categories/:id/restore
// @access  Admin
// =========================
exports.restoreCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  category.isActive = true;
  await category.save();

  res.status(200).json({ success: true, message: 'Category restored successfully' });
});