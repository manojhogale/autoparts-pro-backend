// =============================================================================
// routes/purchaseOrders.js
// =============================================================================
const express = require('express');
const router3 = express.Router();
const { protect: protect3 } = require('../middleware/auth');

router3.get('/', protect3, (req, res) => {
  res.json({ success: true, message: 'Purchase orders - Coming soon' });
});

module.exports = router3;