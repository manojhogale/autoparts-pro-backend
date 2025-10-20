// =============================================================================
// routes/ai.js
// =============================================================================
const express = require('express');
const router10 = express.Router();
const { protect: protect10 } = require('../middleware/auth');

router10.get('/predict-demand', protect10, (req, res) => {
  res.json({ success: true, message: 'AI features - Coming soon' });
});

module.exports = router10;