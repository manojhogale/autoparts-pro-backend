// controllers/syncController.js
// ======================================================================
// Sync Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Handles offline-to-cloud synchronization logic.
// Supports queue listing, bulk sync, conflict detection, retry logic,
// and sync history logging.
// ======================================================================

const SyncQueue = require('../models/SyncQueue');
const SyncConflict = require('../models/SyncConflict');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middlewares/asyncHandler');
const mongoose = require('mongoose');

// =========================
// @desc    Get pending sync queue
// @route   GET /api/sync/queue
// @access  Private
// =========================
exports.getSyncQueue = asyncHandler(async (req, res) => {
  const { status = 'pending', deviceId } = req.query;

  const filter = { status };
  if (deviceId) filter.deviceId = deviceId;

  const queue = await SyncQueue.find(filter)
    .sort({ createdAt: 1 })
    .limit(100);

  res.status(200).json({
    success: true,
    total: queue.length,
    data: queue,
  });
});

// =========================
// @desc    Perform bulk sync (client → server)
// @route   POST /api/sync/bulk
// @access  Private
// =========================
exports.bulkSync = asyncHandler(async (req, res) => {
  const { records = [], deviceId, userId } = req.body;

  if (!records.length)
    return res.status(400).json({ success: false, message: 'No records to sync' });

  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const { entity, action, data, entityId } = record;

      // Resolve model dynamically
      const model = mongoose.models[entity];
      if (!model) throw new Error(`Unknown entity: ${entity}`);

      if (action === 'CREATE') {
        await model.create(data);
      } else if (action === 'UPDATE') {
        await model.findByIdAndUpdate(entityId, data, { new: true });
      } else if (action === 'DELETE') {
        await model.findByIdAndDelete(entityId);
      }

      await SyncQueue.updateOne({ _id: record._id }, { status: 'synced', syncedAt: new Date() });
      await AuditLog.logAction({
        userId,
        action,
        entity,
        entityId,
        metadata: { success: true, referrer: 'syncEngine' },
      });
      synced++;
    } catch (err) {
      failed++;
      await SyncQueue.updateOne(
        { _id: record._id },
        { status: 'failed', error: err.message, retries: (record.retries || 0) + 1 }
      );

      // Detect conflicts if applicable
      if (err.message.includes('version conflict')) {
        await SyncConflict.create({
          entityType: record.entity,
          entityId: record.entityId,
          conflicts: [
            {
              field: 'unknown',
              localValue: record.data,
              serverValue: 'different on server',
              localTimestamp: new Date(),
              deviceId,
            },
          ],
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `Sync completed: ${synced} success, ${failed} failed.`,
  });
});

// =========================
// @desc    Retry failed sync items
// @route   POST /api/sync/retry
// @access  Private
// =========================
exports.retryFailed = asyncHandler(async (req, res) => {
  const failedItems = await SyncQueue.find({ status: 'failed', retries: { $lt: 3 } });
  if (!failedItems.length)
    return res.status(200).json({ success: true, message: 'No failed items to retry' });

  let retried = 0;
  for (const item of failedItems) {
    try {
      const model = mongoose.models[item.entity];
      if (!model) continue;

      if (item.action === 'CREATE') await model.create(item.data);
      else if (item.action === 'UPDATE') await model.findByIdAndUpdate(item.entityId, item.data);
      else if (item.action === 'DELETE') await model.findByIdAndDelete(item.entityId);

      await item.updateOne({ status: 'synced', syncedAt: new Date() });
      retried++;
    } catch (err) {
      await item.updateOne({ error: err.message, retries: item.retries + 1 });
    }
  }

  res.status(200).json({
    success: true,
    message: `Retried ${retried} failed items successfully.`,
  });
});

// =========================
// @desc    Resolve sync conflict manually
// @route   POST /api/sync/resolve-conflict
// @access  Private/Admin
// =========================
exports.resolveConflict = asyncHandler(async (req, res) => {
  const { conflictId, resolution, resolvedBy } = req.body;
  const conflict = await SyncConflict.findById(conflictId);
  if (!conflict) return res.status(404).json({ success: false, message: 'Conflict not found' });

  conflict.resolution = resolution;
  conflict.resolvedBy = resolvedBy;
  conflict.resolvedAt = new Date();
  await conflict.save();

  res.status(200).json({ success: true, message: 'Conflict resolved successfully' });
});

// =========================
// @desc    View sync history (recent 50)
// @route   GET /api/sync/history
// @access  Private
// =========================
exports.getSyncHistory = asyncHandler(async (req, res) => {
  const recent = await SyncQueue.find({ status: 'synced' })
    .sort({ syncedAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, total: recent.length, data: recent });
});
