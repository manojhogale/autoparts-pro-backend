const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// Get settings
router.get('/', protect, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings
      settings = await Settings.create({
        company: {
          name: process.env.COMPANY_NAME,
          address: process.env.COMPANY_ADDRESS,
          phone: process.env.COMPANY_PHONE,
          email: process.env.COMPANY_EMAIL,
          gst: process.env.COMPANY_GST
        }
      });
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update settings
router.put('/', protect, authorize('admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findOneAndUpdate({}, req.body, {
        new: true,
        runValidators: true
      });
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;