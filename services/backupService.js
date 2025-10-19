const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Backup = require('../models/Backup');
const logger = require('../config/logger');

// Create backup
exports.createBackup = async (type = 'manual', userId = null) => {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const backupPath = path.join(__dirname, '../backups', fileName);

    // Ensure backup directory exists
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};
    const collectionStats = [];

    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      backupData[collectionName] = data;
      
      collectionStats.push({
        name: collectionName,
        count: data.length
      });
    }

    // Write to file
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    // Create backup record
    const backup = await Backup.create({
      backupType: type,
      fileName,
      fileSize: fs.statSync(backupPath).size,
      collections: collectionStats,
      status: 'completed',
      createdBy: userId
    });

    logger.info(`Backup created: ${fileName}`);

    return backup;

  } catch (error) {
    logger.error(`Backup creation failed: ${error.message}`);
    
    await Backup.create({
      backupType: type,
      status: 'failed',
      error: error.message,
      createdBy: userId
    });

    throw error;
  }
};

// Get all backups
exports.getBackups = async () => {
  try {
    const backups = await Backup.find()
      .sort('-createdAt')
      .populate('createdBy', 'name');

    return backups;
  } catch (error) {
    logger.error(`Get backups error: ${error.message}`);
    throw error;
  }
};

// Restore backup
exports.restoreBackup = async (backupId) => {
  try {
    const backup = await Backup.findById(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    const backupPath = path.join(__dirname, '../backups', backup.fileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    // Restore each collection
    for (const [collectionName, data] of Object.entries(backupData)) {
      if (data && data.length > 0) {
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        await mongoose.connection.db.collection(collectionName).insertMany(data);
        logger.info(`Restored collection: ${collectionName} (${data.length} documents)`);
      }
    }

    logger.info(`Backup restored: ${backup.fileName}`);

  } catch (error) {
    logger.error(`Restore backup error: ${error.message}`);
    throw error;
  }
};

// Download backup
exports.downloadBackup = async (backupId) => {
  try {
    const backup = await Backup.findById(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    const backupPath = path.join(__dirname, '../backups', backup.fileName);

    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    return backupPath;

  } catch (error) {
    logger.error(`Download backup error: ${error.message}`);
    throw error;
  }
};

// Scheduled backup (called by cron)
exports.scheduleBackup = async () => {
  try {
    logger.info('Starting scheduled backup...');
    await exports.createBackup('auto');
    logger.info('Scheduled backup completed');

    // Clean old backups (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBackups = await Backup.find({
      createdAt: { $lt: thirtyDaysAgo }
    });

    for (const backup of oldBackups) {
      const backupPath = path.join(__dirname, '../backups', backup.fileName);
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      await backup.deleteOne();
      logger.info(`Deleted old backup: ${backup.fileName}`);
    }

  } catch (error) {
    logger.error(`Scheduled backup error: ${error.message}`);
  }
};