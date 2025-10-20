// =============================================================================
// routes/templates.js
// =============================================================================
const express = require('express');
const router7 = express.Router();
const { protect: protect7 } = require('../middleware/auth');

router7.get('/', protect7, (req, res) => {
  res.json({ success: true, message: 'Templates - Coming soon' });
});

module.exports = router7;