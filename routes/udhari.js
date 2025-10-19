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

router.get('/', protect, getUdhariList);
router.get('/overdue', protect, getOverdue);
router.get('/aging-report', protect, getAgingReport);
router.get('/:id', protect, getUdhari);

router.post(
  '/:id/payments',
  protect,
  validate(schemas.payment),
  addPayment
);

router.post('/:id/reminder', protect, sendReminder);

router.post(
  '/bulk-reminder',
  protect,
  authorize('admin', 'manager'),
  sendBulkReminders
);

module.exports = router;