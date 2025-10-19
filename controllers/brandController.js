// controllers/brandController.js
// ====================================================================
// Brand Controller - AutoParts Pro
// --------------------------------------------------------------------
// Handles CRUD operations for Brands including image upload/delete.
// Integrates with Cloudinary for logo management and supports
// pagination, search, status toggling, and soft delete.
// ====================================================================

const Brand = require('../models/Brand');
const asyncHandler = require('../middlewares/asyncHandler');
const cloudinary = require('../config/cloudinary');

// =========================
// @desc    Get all brands (search + pagination)
// @route   GET /api/brands
// @access  Private
// =========================
exports.getBrands = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;

  const filter = search
    ? { name: { $regex: search, $options: 'i' }, isActive: true }
    : { isActive: true };

  const brands = await Brand.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Brand.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: brands,
  });
});

// =========================
// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Private
// =========================
exports.getBrandById = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }
  res.status(200).json({ success: true, data: brand });
});

// =========================
// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private/Admin
// =========================
exports.createBrand = asyncHandler(async (req, res) => {
  const { name, description, countryOfOrigin, establishedYear, website } = req.body;

  const existing = await Brand.findOne({ name: name.trim() });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: 'Brand with this name already exists' });
  }

  let logo = {};
  if (req.file) {
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'autoparts/brands',
      resource_type: 'image',
    });
    logo = { url: upload.secure_url, publicId: upload.public_id };
  }

  const brand = await Brand.create({
    name: name.trim(),
    description,
    logo,
    countryOfOrigin,
    establishedYear,
    website,
    createdBy: req.user?._id,
  });

  res.status(201).json({ success: true, data: brand });
});

// =========================
// @desc    Update a brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
// =========================
exports.updateBrand = asyncHandler(async (req, res) => {
  const { name, description, countryOfOrigin, establishedYear, website, isActive } = req.body;

  const brand = await Brand.findById(req.params.id);
  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }

  // Update logo if new image provided
  if (req.file) {
    // Delete old logo if exists
    if (brand.logo?.publicId) {
      await cloudinary.uploader.destroy(brand.logo.publicId);
    }
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'autoparts/brands',
      resource_type: 'image',
    });
    brand.logo = { url: upload.secure_url, publicId: upload.public_id };
  }

  brand.name = name || brand.name;
  brand.description = description || brand.description;
  brand.countryOfOrigin = countryOfOrigin || brand.countryOfOrigin;
  brand.establishedYear = establishedYear || brand.establishedYear;
  brand.website = website || brand.website;
  brand.isActive = typeof isActive === 'boolean' ? isActive : brand.isActive;
  brand.updatedBy = req.user?._id;
  await brand.save();

  res.status(200).json({ success: true, data: brand });
});

// =========================
// @desc    Delete (soft delete) a brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
// =========================
exports.deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }

  brand.isActive = false;
  await brand.save();

  res.status(200).json({ success: true, message: 'Brand deactivated successfully' });
});

// =========================
// @desc    Restore deactivated brand
// @route   PATCH /api/brands/:id/restore
// @access  Admin
// =========================
exports.restoreBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }

  brand.isActive = true;
  await brand.save();

  res.status(200).json({ success: true, message: 'Brand restored successfully' });
});
