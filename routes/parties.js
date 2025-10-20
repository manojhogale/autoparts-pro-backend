// =============================================================================
// routes/parties.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Parties
 *   description: Customer / Vendor management (coming soon)
 */

/**
 * @swagger
 * /parties:
 *   get:
 *     summary: Get all parties (placeholder)
 *     tags: [Parties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Party routes - coming soon
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Party routes - Coming soon' });
});

module.exports = router;