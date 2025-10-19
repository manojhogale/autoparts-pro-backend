const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

// Get all brands
router.get('/', protect, async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort('name');
    res.json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create brand
router.post('/', protect, checkPermission('canAddProduct'), async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;