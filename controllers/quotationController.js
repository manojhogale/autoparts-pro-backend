// controllers/quotationController.js
// ======================================================================
// Quotation Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Handles quotation creation, update, tax/discount calculation,
// PDF generation, sharing via WhatsApp/SMS, and status tracking.
// Integrated with logger, audit log, and Cloudinary for PDF storage.
// ======================================================================

const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');
const { AppError } = require('../middleware/errorHandler');
const { generateQuotationPDF } = require('../utils/pdfGenerator');
const { sendWhatsAppMessage } = require('../utils/whatsappService');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../middlewares/asyncHandler');
const fs = require('fs');

// =========================
// @desc    Get all quotations (filter + pagination)
// @route   GET /api/quotations
// @access  Private
// =========================
exports.getQuotations = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { quotationNo: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const quotations = await Quotation.find(filter)
    .populate('createdBy', 'name')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Quotation.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data: quotations,
  });
});

// =========================
// @desc    Get quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
// =========================
exports.getQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('items.productId', 'name hsnCode gstPercent')
    .populate('createdBy', 'name');

  if (!quotation) return next(new AppError('Quotation not found', 404));

  res.status(200).json({ success: true, data: quotation });
});

// =========================
// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
// =========================
exports.createQuotation = asyncHandler(async (req, res, next) => {
  const { customerName, customerPhone, items, note, discountPercent } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return next(new AppError('At least one product is required', 400));

  // Calculate totals
  let subtotal = 0;
  const detailedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

    const gst = (product.gstPercent / 100) * (item.quantity * item.rate);
    const total = item.quantity * item.rate + gst;
    subtotal += total;

    detailedItems.push({
      productId: product._id,
      productName: product.name,
      quantity: item.quantity,
      rate: item.rate,
      gstPercent: product.gstPercent,
      gstAmount: gst,
      total,
    });
  }

  const discount = discountPercent ? (subtotal * discountPercent) / 100 : 0;
  const grandTotal = subtotal - discount;

  // Generate Quotation No
  const last = await Quotation.findOne().sort({ createdAt: -1 });
  const quotationNo = last
    ? `QT-${(parseInt(last.quotationNo.split('-')[1]) + 1).toString().padStart(4, '0')}`
    : 'QT-0001';

  const quotation = await Quotation.create({
    quotationNo,
    customerName,
    customerPhone,
    items: detailedItems,
    subtotal,
    discountPercent,
    discountAmount: discount,
    totalAmount: grandTotal,
    note,
    status: 'draft',
    createdBy: req.user?._id,
  });

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'CREATE',
    entity: 'Quotation',
    entityId: quotation._id,
    metadata: { success: true },
  });

  res.status(201).json({ success: true, data: quotation });
});

// =========================
// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
// =========================
exports.updateQuotation = asyncHandler(async (req, res, next) => {
  const updates = req.body;
  const quotation = await Quotation.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!quotation) return next(new AppError('Quotation not found', 404));

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'UPDATE',
    entity: 'Quotation',
    entityId: quotation._id,
    changes: { after: updates },
  });

  logger.info(`Quotation updated: ${quotation.quotationNo}`);

  res.status(200).json({ success: true, data: quotation });
});

// =========================
// @desc    Generate PDF and upload to Cloudinary
// @route   GET /api/quotations/:id/pdf
// @access  Private
// =========================
exports.generatePDF = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id).populate('items.productId');
  if (!quotation) return next(new AppError('Quotation not found', 404));

  const pdfPath = await generateQuotationPDF(quotation);
  const upload = await cloudinary.uploader.upload(pdfPath, {
    folder: 'autoparts/quotations',
    resource_type: 'auto',
  });

  fs.unlinkSync(pdfPath);

  quotation.pdfUrl = upload.secure_url;
  quotation.status = 'generated';
  await quotation.save();

  logger.info(`Quotation PDF generated: ${quotation.quotationNo}`);
  res.status(200).json({ success: true, pdfUrl: upload.secure_url });
});

// =========================
// @desc    Send quotation via WhatsApp
// @route   POST /api/quotations/:id/share
// @access  Private
// =========================
exports.shareQuotation = asyncHandler(async (req, res, next) => {
  const { channel = 'whatsapp' } = req.body;
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return next(new AppError('Quotation not found', 404));

  if (channel === 'whatsapp') {
    await sendWhatsAppMessage(
      quotation.customerPhone,
      `📄 AutoParts Quotation: ${quotation.quotationNo}\nTotal: ₹${quotation.totalAmount}\n${quotation.pdfUrl}`
    );
  }

  quotation.status = 'sent';
  await quotation.save();

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'EXPORT',
    entity: 'Quotation',
    entityId: quotation._id,
  });

  res.status(200).json({ success: true, message: 'Quotation sent successfully' });
});

// =========================
// @desc    Change quotation status (approve/reject)
// @route   PATCH /api/quotations/:id/status
// @access  Private
// =========================
exports.updateStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return next(new AppError('Quotation not found', 404));

  quotation.status = status;
  await quotation.save();

  await AuditLog.logAction({
    userId: req.user?._id,
    action: 'UPDATE',
    entity: 'Quotation',
    entityId: quotation._id,
    changes: { after: { status } },
  });

  res.status(200).json({ success: true, message: `Quotation marked as ${status}` });
});
