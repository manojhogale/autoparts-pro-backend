// =============================================================================
// routes/expenses.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management APIs
 */

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Get all expense records (coming soon)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense placeholder
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Expenses - Coming soon' });
});

module.exports = router;