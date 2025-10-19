const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getSalesChart
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getDashboard);
router.get('/charts/sales', protect, getSalesChart);

module.exports = router;