const express = require('express');
const router = express.Router();
const {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  generatePDF,
  sendWhatsApp,
  getDrafts,
  recallDraft
} = require('../controllers/saleController');
const { protect } = require('../middleware/auth');
const { authorize, checkPermission } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Manage sales, invoices, and drafts
 */

router.get('/', protect, getSales);
router.get('/drafts', protect, getDrafts);
router.get('/:id', protect, getSale);
router.post('/', protect, checkPermission('canMakeSale'), validate(schemas.sale), createSale);
router.put('/:id', protect, updateSale);
router.delete('/:id', protect, authorize('admin'), deleteSale);
router.post('/:id/pdf', protect, generatePDF);
router.post('/:id/whatsapp', protect, sendWhatsApp);
router.post('/drafts/:id/recall', protect, recallDraft);

module.exports = router;