// =============================================================================
// routes/vouchers.js
// =============================================================================
const express = require('express');
const router5 = express.Router();
const { protect: protect5 } = require('../middleware/auth');

router5.get('/', protect5, (req, res) => {
  res.json({ success: true, message: 'Vouchers - Coming soon' });
});

module.exports = router5;