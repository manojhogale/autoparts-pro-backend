const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: Manage product brands
 */

/**
 * @swagger
 * /brands:
 *   get:
 *     summary: Get all active brands
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of brands
 */
router.get('/', protect, async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort('name');
    res.json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Brand created successfully
 */
router.post('/', protect, checkPermission('canAddProduct'), async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;