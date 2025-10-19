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

// Quotation Controller (create this)
router.get('/', protect, getQuotations);
router.get('/:id', protect, getQuotation);
router.post('/', protect, createQuotation);
router.put('/:id', protect, updateQuotation);
router.delete('/:id', protect, deleteQuotation);
router.post('/:id/convert', protect, convertToSale);
router.post('/:id/pdf', protect, generatePDF);

module.exports = router;