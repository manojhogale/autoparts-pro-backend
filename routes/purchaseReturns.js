// =============================================================================
// routes/purchaseReturns.js
// =============================================================================
const express = require('express');
const router2 = express.Router();
const { protect: protect2 } = require('../middleware/auth');

router2.get('/', protect2, (req, res) => {
  res.json({ success: true, message: 'Purchase returns - Coming soon' });
});

module.exports = router2;