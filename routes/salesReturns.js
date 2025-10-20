// =============================================================================
// routes/salesReturns.js
// =============================================================================
const express = require('express');
const router4 = express.Router();
const { protect: protect4 } = require('../middleware/auth');

router4.get('/', protect4, (req, res) => {
  res.json({ success: true, message: 'Sales returns - Coming soon' });
});

module.exports = router4;