const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getProfitLossReport,
  getStockReport,
  getTopSelling,
  getGSTReport,
  exportToExcel
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Business analytics and report APIs
 */

router.get('/sales', protect, checkPermission('canViewReports'), getSalesReport);
router.get('/profit-loss', protect, checkPermission('canViewReports'), getProfitLossReport);
router.get('/stock', protect, checkPermission('canViewReports'), getStockReport);
router.get('/top-selling', protect, checkPermission('canViewReports'), getTopSelling);
router.get('/gst', protect, checkPermission('canViewReports'), getGSTReport);
router.get('/export/excel', protect, checkPermission('canViewReports'), exportToExcel);

module.exports = router;