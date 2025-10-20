// routes/quotations.js
const express = require('express');
const router = express.Router();
const {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToSale,
  generatePDF
} = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

/**
 * @swagger
 * tags:
 *   name: Quotations
 *   description: Manage quotations, generate PDFs and convert to sales.
 */

/**
 * @swagger
 * /quotations:
 *   get:
 *     summary: Get all quotations
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of quotations
 */
router.get('/', protect, getQuotations);

/**
 * @swagger
 * /quotations/{id}:
 *   get:
 *     summary: Get a single quotation by ID
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation details
 */
router.get('/:id', protect, getQuotation);

/**
 * @swagger
 * /quotations:
 *   post:
 *     summary: Create a new quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     rate:
 *                       type: number
 *               note:
 *                 type: string
 *               discountPercent:
 *                 type: number
 *     responses:
 *       201:
 *         description: Quotation created successfully
 */
router.post('/', protect, createQuotation);

/**
 * @swagger
 * /quotations/{id}:
 *   put:
 *     summary: Update a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               note: "Updated quotation note"
 *               discountPercent: 10
 *     responses:
 *       200:
 *         description: Quotation updated successfully
 */
router.put('/:id', protect, updateQuotation);

/**
 * @swagger
 * /quotations/{id}:
 *   delete:
 *     summary: Delete a quotation
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quotation deleted successfully
 */
router.delete('/:id', protect, deleteQuotation);

/**
 * @swagger
 * /quotations/{id}/convert:
 *   post:
 *     summary: Convert a quotation to a sale
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation converted to sale
 */
router.post('/:id/convert', protect, convertToSale);

/**
 * @swagger
 * /quotations/{id}/pdf:
 *   post:
 *     summary: Generate quotation PDF
 *     tags: [Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation PDF generated successfully
 */
router.post('/:id/pdf', protect, generatePDF);

module.exports = router;