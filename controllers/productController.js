const Product = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const cloudinary = require('../config/cloudinary');
const PriceHistory = require('../models/PriceHistory');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      stockStatus,
      isActive,
      sortBy = '-createdAt'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (stockStatus) {
      if (stockStatus === 'low_stock') {
        query.$expr = { $lte: ['$stock', '$minStock'] };
      } else if (stockStatus === 'out_of_stock') {
        query.stock = 0;
      } else if (stockStatus === 'in_stock') {
        query.$expr = { $gt: ['$stock', '$minStock'] };
      }
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name');

    const count = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: products
    });

  } catch (error) {
    logger.error(`Get products error: ${error.message}`);
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error(`Get product error: ${error.message}`);
    next(error);
  }
};

// @desc    Get product by barcode
// @route   GET /api/products/barcode/:code
// @access  Private
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      $or: [
        { barcode: req.params.code },
        { sku: req.params.code }
      ],
      isActive: true
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error(`Get product by barcode error: ${error.message}`);
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin/Manager)
exports.createProduct = async (req, res, next) => {
  try {
    // Add created by
    req.body.createdBy = req.user._id;

    const product = await Product.create(req.body);

    logger.info(`Product created: ${product.sku} by ${req.user.name}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });

  } catch (error) {
    logger.error(`Create product error: ${error.message}`);
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin/Manager)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Track price changes
    if (req.body.purchasePrice && req.body.purchasePrice !== product.purchasePrice) {
      await PriceHistory.findOneAndUpdate(
        { productId: product._id },
        {
          $push: {
            changes: {
              from: product.purchasePrice,
              to: req.body.purchasePrice,
              type: 'purchase',
              date: new Date(),
              changedBy: req.user._id
            }
          }
        },
        { upsert: true }
      );
    }

    if (req.body.sellingPrice && req.body.sellingPrice !== product.sellingPrice) {
      await PriceHistory.findOneAndUpdate(
        { productId: product._id },
        {
          $push: {
            changes: {
              from: product.sellingPrice,
              to: req.body.sellingPrice,
              type: 'selling',
              date: new Date(),
              changedBy: req.user._id
            }
          }
        },
        { upsert: true }
      );
    }

    // Update product
    req.body.updatedBy = req.user._id;
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    logger.info(`Product updated: ${product.sku} by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });

  } catch (error) {
    logger.error(`Update product error: ${error.message}`);
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    // Soft delete - just deactivate
    product.isActive = false;
    await product.save();

    logger.info(`Product deleted: ${product.sku} by ${req.user.name}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete product error: ${error.message}`);
    next(error);
  }
};

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private (Admin/Manager)
exports.uploadImages = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    if (!req.files || req.files.length === 0) {
      return next(new AppError('Please upload images', 400));
    }

    const uploadedImages = [];

    // Upload to Cloudinary
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'autoparts/products',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      });

      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id
      });

      // Delete local file
      const fs = require('fs');
      fs.unlinkSync(file.path);
    }

    // Add images to product
    product.images.push(...uploadedImages);
    await product.save();

    logger.info(`Images uploaded for product: ${product.sku}`);

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadedImages
    });

  } catch (error) {
    logger.error(`Upload images error: ${error.message}`);
    next(error);
  }
};

// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private (Admin/Manager)
exports.deleteImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const imageIndex = product.images.findIndex(
      img => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return next(new AppError('Image not found', 404));
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(product.images[imageIndex].publicId);

    // Remove from product
    product.images.splice(imageIndex, 1);
    await product.save();

    logger.info(`Image deleted from product: ${product.sku}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete image error: ${error.message}`);
    next(error);
  }
};

// @desc    Bulk update stock
// @route   POST /api/products/bulk-update-stock
// @access  Private (Admin/Manager)
exports.bulkUpdateStock = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{productId, stock}]

    if (!updates || !Array.isArray(updates)) {
      return next(new AppError('Invalid updates format', 400));
    }

    const bulkOps = updates.map(item => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $set: { stock: item.stock } }
      }
    }));

    const result = await Product.bulkWrite(bulkOps);

    logger.info(`Bulk stock update: ${result.modifiedCount} products updated`);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: {
        modified: result.modifiedCount
      }
    });

  } catch (error) {
    logger.error(`Bulk update stock error: ${error.message}`);
    next(error);
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$minStock'] },
      isActive: true
    }).sort('stock');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    logger.error(`Get low stock error: ${error.message}`);
    next(error);
  }
};

// @desc    Get out of stock products
// @route   GET /api/products/out-of-stock
// @access  Private
exports.getOutOfStock = async (req, res, next) => {
  try {
    const products = await Product.find({
      stock: 0,
      isActive: true
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    logger.error(`Get out of stock error: ${error.message}`);
    next(error);
  }
};