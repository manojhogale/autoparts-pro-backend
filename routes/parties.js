// =============================================================================
// routes/parties.js
// =============================================================================
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Placeholder - implement party management later
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'Party routes - Coming soon' });
});

module.exports = router;