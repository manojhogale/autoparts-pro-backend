// =============================================================================
// routes/expenses.js
// =============================================================================
const express = require('express');
const router6 = express.Router();
const { protect: protect6 } = require('../middleware/auth');

router6.get('/', protect6, (req, res) => {
  res.json({ success: true, message: 'Expenses - Coming soon' });
});

module.exports = router6;