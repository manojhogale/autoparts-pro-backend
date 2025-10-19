const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Udhari = require('../models/Udhari');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      paymentStatus,
      supplier
    } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (supplier) {
      query['supplier.name'] = { $regex: supplier, $options: 'i' };
    }

    const purchases = await Purchase.find(query)
      .sort('-purchaseDate')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name');

    const count = await Purchase.countDocuments(query);

    res.status(200).json({
      success: true,
      count: purchases.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: purchases
    });

  } catch (error) {
    logger.error(`Get purchases error: ${error.message}`);
    next(error);
  }
};

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private
exports.getPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('items.productId', 'name barcode sku')
      .populate('createdBy', 'name');

    if (!purchase) {
      return next(new AppError('Purchase not found', 404));
    }

    res.status(200).json({
      success: true,
      data: purchase
    });

  } catch (error) {
    logger.error(`Get purchase error: ${error.message}`);
    next(error);
  }
};

// @desc    Create purchase
// @route   POST /api/purchases
// @access  Private (Manager/Admin)
exports.createPurchase = async (req, res, next) => {
  try {
    const {
      supplier,
      items,
      discount = 0,
      otherCharges = 0,
      paymentMode = 'Cash',
      paidAmount = 0,
      invoiceNo,
      invoiceDate,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return next(new AppError('Please add items to purchase', 400));
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

      const itemPrice = item.price;
      const itemSubtotal = itemPrice * item.quantity;

      // Calculate GST
      const gstPercent = product.gstDetails?.taxSlab || 18;
      const gstAmount = (itemSubtotal * gstPercent) / 100;

      totalGstAmount += gstAmount;

      const itemTotal = itemSubtotal + gstAmount;

      subtotal += itemSubtotal;

      processedItems.push({
        productId: product._id,
        productName: product.name,
        barcode: product.barcode,
        batchNo: item.batchNo,
        quantity: item.quantity,
        price: itemPrice,
        gst: gstPercent,
        gstAmount,
        total: itemTotal
      });

      // Update stock
      product.stock += item.quantity;
      
      // Update purchase price
      product.purchasePrice = itemPrice;
      
      // Add batch if tracking
      if (product.batchTracking && item.batchNo) {
        product.currentBatches.push({
          batchNo: item.batchNo,
          quantity: item.quantity,
          mfgDate: item.mfgDate,
          expiryDate: item.expiryDate,
          purchasePrice: itemPrice
        });
      }
      
      await product.save();
    }

    const totalAmount = subtotal + totalGstAmount + otherCharges - discount;
    const pendingAmount = totalAmount - paidAmount;
    const paymentStatus = pendingAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending');

    // Create purchase
    const purchase = await Purchase.create({
      supplier,
      items: processedItems,
      subtotal,
      gstAmount: totalGstAmount,
      otherCharges,
      discount,
      totalAmount,
      paidAmount,
      pendingAmount,
      paymentMode,
      paymentStatus,
      payments: paidAmount > 0 ? [{
        amount: paidAmount,
        paymentMode,
        date: new Date()
      }] : [],
      invoiceNo,
      invoiceDate,
      purchaseDate: new Date(),
      notes,
      createdBy: req.user._id
    });

    // Create Udhari for supplier if pending
    if (pendingAmount > 0) {
      await Udhari.create({
        partyName: supplier.name,
        phone: supplier.phone,
        billId: purchase._id,
        billType: 'Purchase',
        billNo: purchase.purchaseNo,
        type: 'purchase',
        totalAmount,
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

    logger.info(`Purchase created: ${purchase.purchaseNo} by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: purchase
    });

  } catch (error) {
    logger.error(`Create purchase error: ${error.message}`);
    next(error);
  }
};

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Private (Manager/Admin)
exports.updatePurchase = async (req, res, next) => {
  try {
    let purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return next(new AppError('Purchase not found', 404));
    }

    // Only allow updating within 24 hours
    if (Date.now() - purchase.createdAt > 24 * 60 * 60 * 1000) {
      return next(new AppError('Cannot edit purchase after 24 hours', 403));
    }

    purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    logger.info(`Purchase updated: ${purchase.purchaseNo} by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: 'Purchase updated successfully',
      data: purchase
    });

  } catch (error) {
    logger.error(`Update purchase error: ${error.message}`);
    next(error);
  }
};

// @desc    Add payment to purchase
// @route   POST /api/purchases/:id/payments
// @access  Private
exports.addPayment = async (req, res, next) => {
  try {
    const { amount, paymentMode, referenceNo, remarks } = req.body;

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return next(new AppError('Purchase not found', 404));
    }

    if (amount > purchase.pendingAmount) {
      return next(new AppError('Payment amount exceeds pending amount', 400));
    }

    // Add payment
    purchase.payments.push({
      amount,
      paymentMode,
      referenceNo,
      remarks,
      date: new Date()
    });

    purchase.paidAmount += amount;
    purchase.pendingAmount -= amount;

    if (purchase.pendingAmount <= 0) {
      purchase.paymentStatus = 'Paid';
    } else {
      purchase.paymentStatus = 'Partial';
    }

    await purchase.save();

    // Update Udhari
    await Udhari.findOneAndUpdate(
      { billId: purchase._id, type: 'purchase' },
      {
        $push: {
          payments: {
            amount,
            paymentMode,
            referenceNo,
            remarks,
            date: new Date()
          }
        },
        $inc: {
          paidAmount: amount,
          pendingAmount: -amount
        }
      }
    );

    logger.info(`Payment added to purchase: ${purchase.purchaseNo}`);

    res.status(200).json({
      success: true,
      message: 'Payment added successfully',
      data: purchase
    });

  } catch (error) {
    logger.error(`Add payment error: ${error.message}`);
    next(error);
  }
};