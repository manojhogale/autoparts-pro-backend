// =============================================================================
// routes/backup.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  createBackup,
  getBackups,
  restoreBackup,
  downloadBackup,
} = require('../services/backupService');

/**
 * @swagger
 * tags:
 *   name: Backup
 *   description: Database backup, restore, and download APIs
 */

/**
 * @swagger
 * /backup/create:
 *   post:
 *     summary: Create a manual database backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created successfully
 */
router.post('/create', protect, authorize('admin'), async (req, res) => {
  try {
    const backup = await createBackup('manual', req.user._id);
    res.json({ success: true, data: backup });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /backup/list:
 *   get:
 *     summary: Get all backup entries
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backups
 */
router.get('/list', protect, authorize('admin'), async (req, res) => {
  try {
    const backups = await getBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /backup/restore/{id}:
 *   post:
 *     summary: Restore database from backup
 *     tags: [Backup]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Backup restored successfully
 */
router.post('/restore/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await restoreBackup(req.params.id);
    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /backup/download/{id}:
 *   get:
 *     summary: Download a backup file
 *     tags: [Backup]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Backup file downloaded
 */
router.get('/download/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const filePath = await downloadBackup(req.params.id);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;