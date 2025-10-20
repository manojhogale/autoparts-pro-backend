// routes/purchaseReturns.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: PurchaseReturns
 *   description: Manage purchase return operations
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Purchase returns - Coming soon' });
});

module.exports = router;