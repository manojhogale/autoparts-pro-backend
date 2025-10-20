// =============================================================================
// routes/vouchers.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Vouchers
 *   description: Voucher management and accounting entries
 */

/**
 * @swagger
 * /vouchers:
 *   get:
 *     summary: Get all vouchers (placeholder)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vouchers endpoint (coming soon)
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Vouchers - Coming soon' });
});

module.exports = router;