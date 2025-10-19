const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Udhari = require('../models/Udhari');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { generateBillPDF } = require('../utils/pdfGenerator');
const { sendWhatsAppBill } = require('../services/whatsappService');
const { sendNotification } = require('../services/notificationService');

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      paymentStatus,
      search,
      isDraft
    } = req.query;

    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) query.saleDate.$lte = new Date(endDate);
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (isDraft !== undefined) {
      query.isDraft = isDraft === 'true';
    }

    if (search) {
      query.$or = [
        { billNo: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const sales = await Sale.find(query)
      .sort('-saleDate')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name');

    const count = await Sale.countDocuments(query);

    res.status(200).json({
      success: true,
      count: sales.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: sales
    });

  } catch (error) {
    logger.error(`Get sales error: ${error.message}`);
    next(error);
  }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.productId', 'name barcode sku')
      .populate('createdBy', 'name');

    if (!sale) {
      return next(new AppError('Sale not found', 404));
    }

    res.status(200).json({
      success: true,
      data: sale
    });

  } catch (error) {
    logger.error(`Get sale error: ${error.message}`);
    next(error);
  }
};

// @desc    Create sale
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res, next) => {
  try {
    const {
      customer,
      items,
      discount = 0,
      discountPercent = 0,
      paymentMode,
      paidAmount,
      notes,
      isDraft = false
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return next(new AppError('Please add items to the bill', 400));
    }

    // Calculate totals
    let subtotal = 0;
    let totalGstAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return next(new AppError(`Product not found: ${item.productId}`, 404));
      }

      if (!product.isActive) {
        return next(new AppError(`Product is inactive: ${product.name}`, 400));
      }

      if (product.stock < item.quantity) {
        return next(new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          400
        ));
      }

      const itemPrice = item.price || product.sellingPrice;
      const itemDiscount = item.discount || 0;
      const itemSubtotal = itemPrice * item.quantity - itemDiscount;

      // Calculate GST
      const gstPercent = product.gstDetails?.taxSlab || 18;
      const gstAmount = product.gstDetails?.isTaxInclusive
        ? (itemSubtotal * gstPercent) / (100 + gstPercent)
        : (itemSubtotal * gstPercent) / 100;

      totalGstAmount += gstAmount;

      const itemTotal = product.gstDetails?.isTaxInclusive
        ? itemSubtotal
        : itemSubtotal + gstAmount;

      subtotal += itemSubtotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        barcode: product.barcode,
        sku: product.sku,
        quantity: item.quantity,
        price: itemPrice,
        mrp: product.mrp,
        purchasePrice: product.purchasePrice,
        discount: itemDiscount,
        gstPercent,
        gstAmount,
        total: itemTotal
      });

      // Update stock (if not draft)
      if (!isDraft) {
        product.stock -= item.quantity;
        await product.save();

        // Low stock alert
        if (product.stock <= product.minStock) {
          await sendNotification({
            type: 'lowStock',
            title: 'Low Stock Alert',
            body: `${product.name} is running low. Current stock: ${product.stock}`,
            data: { productId: product._id }
          });
        }
      }
    }

    // Apply bill-level discount
    const billDiscount = discountPercent > 0
      ? (subtotal * discountPercent) / 100
      : discount;

    const totalAmount = subtotal - billDiscount + totalGstAmount;
    const roundOff = Math.round(totalAmount) - totalAmount;
    const finalAmount = Math.round(totalAmount);

    const pendingAmount = finalAmount - paidAmount;
    const paymentStatus = pendingAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending');

    // Create sale
    const sale = await Sale.create({
      customer,
      items: processedItems,
      subtotal,
      discount: billDiscount,
      discountPercent,
      gstAmount: totalGstAmount,
      roundOff,
      totalAmount: finalAmount,
      paidAmount,
      pendingAmount,
      paymentMode,
      paymentStatus,
      saleDate: new Date(),
      notes,
      isDraft,
      draftSavedAt: isDraft ? new Date() : undefined,
      createdBy: req.user._id
    });

    // Create Udhari if pending amount
    if (!isDraft && pendingAmount > 0 && customer?.phone) {
      await Udhari.create({
        partyName: customer.name || 'Walk-in Customer',
        phone: customer.phone,
        billId: sale._id,
        billType: 'Sale',
        billNo: sale.billNo,
        type: 'sale',
        totalAmount: finalAmount,
        paidAmount,
        pendingAmount,
        payments: paidAmount > 0 ? [{
          amount: paidAmount,
          paymentMode,
          date: new Date()
        }] : [],
        status: paidAmount > 0 ? 'partial' : 'pending',
        createdBy: req.user._id
      });
    }

    logger.info(`Sale created: ${sale.billNo} by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: isDraft ? 'Bill saved as draft' : 'Sale created successfully',
      data: sale
    });

  } catch (error) {
    logger.error(`Create sale error: ${error.message}`);
    next(error);
  }
};

// @desc    Update sale
// @route   PUT /api/sales/:id
// @access  Private
exports.updateSale = async (req, res, next) => {
  try {
    let sale = await Sale.findById(req.params.id);

    if (!sale) {
      return next(new AppError('Sale not found', 404));
    }

    // Only allow updating drafts or within 24 hours
    if (!sale.isDraft && (Date.now() - sale.createdAt > 24 * 60 * 60 * 1000)) {
      return next(new AppError('Cannot edit sale after 24 hours', 403));
    }

    sale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    logger.info(`Sale updated: ${sale.billNo} by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: 'Sale updated successfully',
      data: sale
    });

  } catch (error) {
    logger.error(`Update sale error: ${error.message}`);
    next(error);
  }
};

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private (Admin only)
exports.deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return next(new AppError('Sale not found', 404));
    }

    // Only allow deleting drafts
    if (!sale.isDraft) {
      return next(new AppError('Cannot delete completed sales', 403));
    }

    await sale.deleteOne();

    logger.info(`Sale deleted: ${sale.billNo} by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete sale error: ${error.message}`);
    next(error);
  }
};

// @desc    Generate bill PDF
// @route   POST /api/sales/:id/pdf
// @access  Private
exports.generatePDF = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.productId', 'name')
      .populate('createdBy', 'name');

    if (!sale) {
      return next(new AppError('Sale not found', 404));
    }

    const pdfBuffer = await generateBillPDF(sale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${sale.billNo}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error(`Generate PDF error: ${error.message}`);
    next(error);
  }
};

// @desc    Send bill via WhatsApp
// @route   POST /api/sales/:id/whatsapp
// @access  Private
exports.sendWhatsApp = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return next(new AppError('Sale not found', 404));
    }

    if (!sale.customer?.phone) {
      return next(new AppError('Customer phone number not found', 400));
    }

    await sendWhatsAppBill(sale);

    logger.info(`Bill sent via WhatsApp: ${sale.billNo}`);

    res.status(200).json({
      success: true,
      message: 'Bill sent via WhatsApp successfully'
    });

  } catch (error) {
    logger.error(`Send WhatsApp error: ${error.message}`);
    next(error);
  }
};

// @desc    Get draft bills
// @route   GET /api/sales/drafts
// @access  Private
exports.getDrafts = async (req, res, next) => {
  try {
    const drafts = await Sale.find({ isDraft: true })
      .sort('-draftSavedAt')
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: drafts.length,
      data: drafts
    });

  } catch (error) {
    logger.error(`Get drafts error: ${error.message}`);
    next(error);
  }
};

// @desc    Recall draft bill
// @route   POST /api/sales/drafts/:id/recall
// @access  Private
exports.recallDraft = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return next(new AppError('Draft not found', 404));
    }

    if (!sale.isDraft) {
      return next(new AppError('This is not a draft', 400));
    }

    res.status(200).json({
      success: true,
      data: sale
    });

  } catch (error) {
    logger.error(`Recall draft error: ${error.message}`);
    next(error);
  }
};