// =============================================================================
// routes/audit.js
// =============================================================================
const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
  getLogsByUser,
  getLogsByEntity,
  cleanupOldLogs,
} = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: View system logs and user activity
 */

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get all audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all audit logs
 */
router.get('/', protect, authorize('admin', 'manager'), getAuditLogs);

/**
 * @swagger
 * /audit/{id}:
 *   get:
 *     summary: Get single audit log by ID
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log details
 */
router.get('/:id', protect, authorize('admin'), getAuditLogById);

/**
 * @swagger
 * /audit/user/{userId}:
 *   get:
 *     summary: Get logs for a specific user
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Logs filtered by user
 */
router.get('/user/:userId', protect, authorize('admin'), getLogsByUser);

/**
 * @swagger
 * /audit/entity/{entity}:
 *   get:
 *     summary: Get logs by entity name (e.g., Product, Quotation)
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: entity
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Logs filtered by entity
 */
router.get('/entity/:entity', protect, authorize('admin'), getLogsByEntity);

/**
 * @swagger
 * /audit/cleanup:
 *   delete:
 *     summary: Delete old audit logs
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Old logs cleaned successfully
 */
router.delete('/cleanup', protect, authorize('admin'), cleanupOldLogs);

module.exports = router;