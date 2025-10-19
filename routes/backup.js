const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const {
  createBackup,
  getBackups,
  restoreBackup,
  downloadBackup
} = require('../services/backupService');

// Create manual backup
router.post('/create', protect, authorize('admin'), async (req, res) => {
  try {
    const backup = await createBackup('manual', req.user._id);
    res.json({ success: true, data: backup });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all backups
router.get('/list', protect, authorize('admin'), async (req, res) => {
  try {
    const backups = await getBackups();
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore backup
router.post('/restore/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await restoreBackup(req.params.id);
    res.json({ success: true, message: 'Backup restored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download backup
router.get('/download/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const filePath = await downloadBackup(req.params.id);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;