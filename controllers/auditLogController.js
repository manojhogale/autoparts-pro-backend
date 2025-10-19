// controllers/auditLogController.js
// ======================================================================
// Audit Log Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Provides endpoints for viewing and filtering audit logs.
// Supports search by user, entity, action, and date range.
// ======================================================================

const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middlewares/asyncHandler');

// =========================
// @desc    Get all audit logs (paginated, filtered)
// @route   GET /api/audit-logs
// @access  Private/Admin
// =========================
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    userId,
    entity,
    action,
    startDate,
    endDate,
    search = '',
  } = req.query;

  const filter = {};

  if (userId) filter.userId = userId;
  if (entity) filter.entity = entity;
  if (action) filter.action = action;

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { 'changes.before': { $regex: search, $options: 'i' } },
      { 'changes.after': { $regex: search, $options: 'i' } },
      { 'metadata.errorMessage': { $regex: search, $options: 'i' } },
    ];
  }

  const logs = await AuditLog.find(filter)
    .populate('userId', 'name phone role')
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// =========================
// @desc    Get audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private/Admin
// =========================
exports.getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).populate('userId', 'name phone role');
  if (!log) {
    return res.status(404).json({ success: false, message: 'Log not found' });
  }
  res.status(200).json({ success: true, data: log });
});

// =========================
// @desc    Get logs by user
// @route   GET /api/audit-logs/user/:userId
// @access  Private/Admin
// =========================
exports.getLogsByUser = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { userId } = req.params;

  const logs = await AuditLog.find({ userId })
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await AuditLog.countDocuments({ userId });

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// =========================
// @desc    Get logs by entity type (e.g., 'Sale', 'Product')
// @route   GET /api/audit-logs/entity/:entity
// @access  Private/Admin
// =========================
exports.getLogsByEntity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { entity } = req.params;

  const logs = await AuditLog.find({ entity })
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await AuditLog.countDocuments({ entity });

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// =========================
// @desc    Delete old logs (cleanup > 90 days)
// @route   DELETE /api/audit-logs/cleanup
// @access  Private/Admin
// =========================
exports.cleanupOldLogs = asyncHandler(async (req, res) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await AuditLog.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });

  res.status(200).json({
    success: true,
    message: `Old logs deleted successfully (${result.deletedCount} records)`,
  });
});
