const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
  deleteImage,
  bulkUpdateStock,
  getLowStock,
  getOutOfStock
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validation');
const upload = require('../config/multer');

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Manage product inventory, stock, and details
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', protect, getProducts);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Products with low stock
 */
router.get('/low-stock', protect, getLowStock);

/**
 * @swagger
 * /products/out-of-stock:
 *   get:
 *     summary: Get out of stock products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Products that are out of stock
 */
router.get('/out-of-stock', protect, getOutOfStock);

/**
 * @swagger
 * /products/barcode/{code}:
 *   get:
 *     summary: Get product by barcode
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: code
 *         schema: { type: string }
 *         required: true
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/barcode/:code', protect, getProductByBarcode);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 */
router.get('/:id', protect, getProduct);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 */
router.post('/', protect, checkPermission('canAddProduct'), validate(schemas.product), createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product details
 *     tags: [Products]
 */
router.put('/:id', protect, checkPermission('canEditProduct'), updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 */
router.delete('/:id', protect, authorize('admin'), deleteProduct);

/**
 * @swagger
 * /products/{id}/images:
 *   post:
 *     summary: Upload product images
 *     tags: [Products]
 */
router.post('/:id/images', protect, checkPermission('canEditProduct'), upload.array('images', 5), uploadImages);

/**
 * @swagger
 * /products/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete specific product image
 *     tags: [Products]
 */
router.delete('/:id/images/:imageId', protect, checkPermission('canEditProduct'), deleteImage);

/**
 * @swagger
 * /products/bulk-update-stock:
 *   post:
 *     summary: Bulk update product stock
 *     tags: [Products]
 */
router.post('/bulk-update-stock', protect, checkPermission('canEditProduct'), bulkUpdateStock);

module.exports = router;