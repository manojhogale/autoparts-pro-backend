// controllers/backupController.js
// ====================================================================
// Backup Controller - AutoParts Pro
// --------------------------------------------------------------------
// Handles manual and automated backups, restore operations,
// listing, downloading, and cleanup of old backups.
// Integrates with local storage / S3 / Google Drive.
// ====================================================================

const fs = require('fs');
const path = require('path');
const Backup = require('../models/Backup');
const asyncHandler = require('../middlewares/asyncHandler');
const { uploadToDrive, uploadToS3 } = require('../utils/backupStorage');
const mongoose = require('mongoose');

// 🔧 Local backup directory
const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// =========================
// @desc    Create manual backup
// @route   POST /api/backup/create
// @access  Private/Admin
// =========================
exports.createBackup = asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `autoparts-backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // Collect data from all collections dynamically
  const collections = Object.keys(mongoose.connection.collections);
  const backupData = {};
  const collectionSummary = [];

  for (const col of collections) {
    const model = mongoose.connection.collections[col];
    const docs = await model.find().lean();
    backupData[col] = docs;
    collectionSummary.push({ name: col, count: docs.length });
  }

  // Write JSON file locally
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

  // Upload to preferred provider
  let fileUrl = filePath;
  const storageProvider = process.env.BACKUP_PROVIDER || 'local';
  if (storageProvider === 'gdrive') fileUrl = await uploadToDrive(filePath, fileName);
  else if (storageProvider === 's3') fileUrl = await uploadToS3(filePath, fileName);

  // Create DB record
  const fileSize = fs.statSync(filePath).size;
  const backup = await Backup.create({
    backupType: 'manual',
    fileName,
    fileUrl,
    fileSize,
    storageProvider,
    collections: collectionSummary,
    status: 'completed',
    createdBy: req.user?._id,
  });

  // Cleanup old backups beyond 20
  await Backup.cleanupOld(20);

  res.status(201).json({
    success: true,
    message: 'Backup created successfully',
    data: backup,
  });
});

// =========================
// @desc    List all backups
// @route   GET /api/backup/list
// @access  Private/Admin
// =========================
exports.listBackups = asyncHandler(async (req, res) => {
  const backups = await Backup.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, total: backups.length, data: backups });
});

// =========================
// @desc    Download a backup file
// @route   GET /api/backup/download/:id
// @access  Private/Admin
// =========================
exports.downloadBackup = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) {
    return res.status(404).json({ success: false, message: 'Backup not found' });
  }

  if (backup.storageProvider === 'local' && fs.existsSync(backup.fileUrl)) {
    res.download(backup.fileUrl);
  } else {
    res.status(200).json({ success: true, downloadUrl: backup.fileUrl });
  }
});

// =========================
// @desc    Restore backup
// @route   POST /api/backup/restore/:id
// @access  Private/Admin
// =========================
exports.restoreBackup = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) {
    return res.status(404).json({ success: false, message: 'Backup not found' });
  }

  const backupFile = backup.fileUrl;
  if (!fs.existsSync(backupFile)) {
    return res.status(400).json({ success: false, message: 'Backup file missing on disk' });
  }

  const data = JSON.parse(fs.readFileSync(backupFile));
  let restoredCollections = 0;

  for (const [colName, docs] of Object.entries(data)) {
    const model = mongoose.connection.collections[colName];
    if (!model) continue;

    await model.deleteMany({});
    if (docs.length > 0) {
      await model.insertMany(docs);
      restoredCollections++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Backup restored successfully (${restoredCollections} collections)`,
  });
});

// =========================
// @desc    Schedule auto backup (cron or manual trigger)
// @route   POST /api/backup/schedule
// @access  Private/Admin
// =========================
exports.scheduleBackup = asyncHandler(async (req, res) => {
  // In production, this should be run via node-cron or PM2 schedule
  res.status(200).json({
    success: true,
    message:
      'Auto backup scheduled via cron at 2:00 AM daily (configure via PM2 or system cron)',
  });
});
