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

router.get('/', protect, getProducts);
router.get('/low-stock', protect, getLowStock);
router.get('/out-of-stock', protect, getOutOfStock);
router.get('/barcode/:code', protect, getProductByBarcode);
router.get('/:id', protect, getProduct);

router.post(
  '/',
  protect,
  checkPermission('canAddProduct'),
  validate(schemas.product),
  createProduct
);

router.put(
  '/:id',
  protect,
  checkPermission('canEditProduct'),
  updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteProduct
);

router.post(
  '/:id/images',
  protect,
  checkPermission('canEditProduct'),
  upload.array('images', 5),
  uploadImages
);

router.delete(
  '/:id/images/:imageId',
  protect,
  checkPermission('canEditProduct'),
  deleteImage
);

router.post(
  '/bulk-update-stock',
  protect,
  checkPermission('canEditProduct'),
  bulkUpdateStock
);

module.exports = router;