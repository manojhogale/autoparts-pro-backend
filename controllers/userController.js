// controllers/userController.js
// ======================================================================
// User Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Handles user management, roles, profile updates, password resets,
// and audit logging. Integrated with JWT authentication & email/WhatsApp
// notifications for onboarding.
// ======================================================================

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middlewares/asyncHandler');
const { sendWhatsAppMessage } = require('../utils/whatsappService');

// =========================
// @desc    Get all users (with filters, pagination)
// @route   GET /api/users
// @access  Admin
// =========================
exports.getUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, role, search, status } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.isActive = status === 'active';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('-password')
    .sort('-createdAt')
    .limit(Number(limit))
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: users,
  });
});

// =========================
// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Admin
// =========================
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json({ success: true, data: user });
});

// =========================
// @desc    Create new user
// @route   POST /api/users
// @access  Admin
// =========================
exports.createUser = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) return next(new AppError('Email or phone already registered', 400));

  const hashedPassword = await bcrypt.hash(password || '123456', 10);

  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    role: role || 'staff',
    createdBy: req.user?._id,
  });

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'CREATE',
    entity: 'User',
    entityId: user._id,
    metadata: { success: true },
  });

  logger.info(`New user created: ${user.name} (${user.role})`);

  try {
    await sendWhatsAppMessage(user.phone, `👋 Hello ${user.name}, your AutoParts account is ready.\nEmail: ${user.email}\nPassword: ${password || '123456'}`);
  } catch (err) {
    logger.warn(`Failed to send WhatsApp onboarding message: ${err.message}`);
  }

  res.status(201).json({ success: true, data: user });
});

// =========================
// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Admin
// =========================
exports.updateUser = asyncHandler(async (req, res, next) => {
  const updates = { ...req.body };
  delete updates.password;

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) return next(new AppError('User not found', 404));

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'UPDATE',
    entity: 'User',
    entityId: user._id,
    changes: { after: updates },
  });

  logger.info(`User updated: ${user.name}`);

  res.status(200).json({ success: true, data: user });
});

// =========================
// @desc    Change user password (self-service)
// @route   PATCH /api/users/change-password
// @access  Private
// =========================
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) return next(new AppError('User not found', 404));

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) return next(new AppError('Old password is incorrect', 400));

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  logger.info(`Password changed for user: ${user.name}`);

  res.status(200).json({ success: true, message: 'Password updated successfully' });
});

// =========================
// @desc    Reset password (Admin action)
// @route   PATCH /api/users/:id/reset-password
// @access  Admin
// =========================
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { newPassword = '123456' } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  logger.info(`Password reset for ${user.name} by Admin`);

  try {
    await sendWhatsAppMessage(user.phone, `🔐 Your AutoParts password has been reset.\nNew Password: ${newPassword}`);
  } catch (err) {
    logger.warn(`Failed to send password reset message: ${err.message}`);
  }

  res.status(200).json({ success: true, message: 'Password reset successfully' });
});

// =========================
// @desc    Deactivate user
// @route   PATCH /api/users/:id/deactivate
// @access  Admin
// =========================
exports.deactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  user.isActive = false;
  await user.save();

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'DELETE',
    entity: 'User',
    entityId: user._id,
  });

  logger.info(`User deactivated: ${user.name}`);
  res.status(200).json({ success: true, message: 'User deactivated successfully' });
});

// =========================
// @desc    Reactivate user
// @route   PATCH /api/users/:id/reactivate
// @access  Admin
// =========================
exports.reactivateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  user.isActive = true;
  await user.save();

  logger.info(`User reactivated: ${user.name}`);
  res.status(200).json({ success: true, message: 'User reactivated successfully' });
});
