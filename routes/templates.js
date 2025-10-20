// =============================================================================
// routes/templates.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Print and document template APIs
 */
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Templates - Coming soon' });
});

module.exports = router;