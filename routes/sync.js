const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SyncQueue = require('../models/SyncQueue');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const logger = require('../config/logger');

// Bulk sync from offline device
router.post('/bulk', protect, async (req, res) => {
  try {
    const { sales = [], purchases = [], products = [] } = req.body;
    const results = {
      sales: { synced: 0, failed: 0 },
      purchases: { synced: 0, failed: 0 },
      products: { synced: 0, failed: 0 }
    };

    // Sync sales
    for (const saleData of sales) {
      try {
        await Sale.create({ ...saleData, createdBy: req.user._id });
        results.sales.synced++;
      } catch (error) {
        logger.error(`Failed to sync sale: ${error.message}`);
        results.sales.failed++;
      }
    }

    // Sync purchases
    for (const purchaseData of purchases) {
      try {
        await Purchase.create({ ...purchaseData, createdBy: req.user._id });
        results.purchases.synced++;
      } catch (error) {
        logger.error(`Failed to sync purchase: ${error.message}`);
        results.purchases.failed++;
      }
    }

    // Sync products
    for (const productData of products) {
      try {
        await Product.findByIdAndUpdate(
          productData._id,
          { stock: productData.stock },
          { new: true }
        );
        results.products.synced++;
      } catch (error) {
        logger.error(`Failed to sync product: ${error.message}`);
        results.products.failed++;
      }
    }

    logger.info(`Bulk sync completed by ${req.user.name}: ${JSON.stringify(results)}`);

    res.json({
      success: true,
      message: 'Bulk sync completed',
      data: results
    });

  } catch (error) {
    logger.error(`Bulk sync error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sync queue
router.get('/queue', protect, async (req, res) => {
  try {
    const queue = await SyncQueue.find({
      userId: req.user._id,
      status: 'pending'
    }).sort('-createdAt');

    res.json({ success: true, count: queue.length, data: queue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;