const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  addPayment
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Purchases
 *   description: Manage purchase entries and vendor payments
 */

router.get('/', protect, getPurchases);
router.get('/:id', protect, getPurchase);
router.post('/', protect, checkPermission('canMakePurchase'), validate(schemas.purchase), createPurchase);
router.put('/:id', protect, checkPermission('canMakePurchase'), updatePurchase);
router.post('/:id/payments', protect, validate(schemas.payment), addPayment);

module.exports = router;