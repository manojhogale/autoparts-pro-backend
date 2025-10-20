const express = require('express');
const router = express.Router();
const { getDashboard, getSalesChart } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard analytics and charts
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get overall dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
 */
router.get('/', protect, getDashboard);

/**
 * @swagger
 * /dashboard/charts/sales:
 *   get:
 *     summary: Get sales performance chart
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales chart data
 */
router.get('/charts/sales', protect, getSalesChart);

module.exports = router;