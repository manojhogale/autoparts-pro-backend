// =============================================================================
// routes/audit.js
// =============================================================================
const express = require('express');
const router9 = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getLogsByUser,
  getLogsByEntity,
  cleanupOldLogs,
} = require('../controllers/auditLogController');
const { protect: protect9 } = require('../middleware/auth');
const { authorize: authorize9 } = require('../middleware/roleCheck');

router9.get('/', protect9, authorize9('admin', 'manager'), getAuditLogs);
router9.get('/:id', protect9, authorize9('admin'), getAuditLogById);
router9.get('/user/:userId', protect9, authorize9('admin'), getLogsByUser);
router9.get('/entity/:entity', protect9, authorize9('admin'), getLogsByEntity);
router9.delete('/cleanup', protect9, authorize9('admin'), cleanupOldLogs);

module.exports = router9;