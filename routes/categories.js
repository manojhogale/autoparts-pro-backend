const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

// Get all categories
router.get('/', protect, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category
router.post('/', protect, checkPermission('canAddProduct'), async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;