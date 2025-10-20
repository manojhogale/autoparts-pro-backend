const express = require('express');
const router = express.Router();
const {
  getUdhariList,
  getUdhari,
  addPayment,
  sendReminder,
  sendBulkReminders,
  getOverdue,
  getAgingReport
} = require('../controllers/udhariController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Udhari
 *   description: Manage credit transactions, reminders, and payments
 */

/**
 * @swagger
 * /udhari:
 *   get:
 *     summary: Get all udhari (credit) records
 *     tags: [Udhari]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', protect, getUdhariList);

/**
 * @swagger
 * /udhari/overdue:
 *   get:
 *     summary: Get overdue udhari records
 *     tags: [Udhari]
 */
router.get('/overdue', protect, getOverdue);

/**
 * @swagger
 * /udhari/aging-report:
 *   get:
 *     summary: Get aging report of all credit accounts
 *     tags: [Udhari]
 */
router.get('/aging-report', protect, getAgingReport);

/**
 * @swagger
 * /udhari/{id}:
 *   get:
 *     summary: Get single udhari record by ID
 *     tags: [Udhari]
 */
router.get('/:id', protect, getUdhari);

/**
 * @swagger
 * /udhari/{id}/payments:
 *   post:
 *     summary: Add payment entry for specific udhari
 *     tags: [Udhari]
 */
router.post('/:id/payments', protect, validate(schemas.payment), addPayment);

/**
 * @swagger
 * /udhari/{id}/reminder:
 *   post:
 *     summary: Send payment reminder for a specific udhari
 *     tags: [Udhari]
 */
router.post('/:id/reminder', protect, sendReminder);

/**
 * @swagger
 * /udhari/bulk-reminder:
 *   post:
 *     summary: Send bulk payment reminders to all overdue customers
 *     tags: [Udhari]
 */
router.post('/bulk-reminder', protect, authorize('admin', 'manager'), sendBulkReminders);

module.exports = router;