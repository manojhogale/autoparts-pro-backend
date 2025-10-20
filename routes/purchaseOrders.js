// routes/purchaseOrders.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: PurchaseOrders
 *   description: Purchase order APIs
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Purchase orders - Coming soon' });
});

module.exports = router;