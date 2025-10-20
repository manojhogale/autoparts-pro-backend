// =============================================================================
// routes/ai.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered prediction and analytics APIs
 */

/**
 * @swagger
 * /ai/predict-demand:
 *   get:
 *     summary: Predict product demand using AI
 *     description: Returns AI-based demand prediction (demo endpoint)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI prediction (placeholder)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/predict-demand', protect, (req, res) => {
  res.json({ success: true, message: 'AI features - Coming soon' });
});

module.exports = router;