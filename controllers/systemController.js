// controllers/systemController.js
// ======================================================================
// System Controller - AutoParts Pro
// ----------------------------------------------------------------------
// Provides global system metrics, health checks, and analytics
// for admin dashboard and monitoring panels.
// ======================================================================

const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Udhari = require('../models/Udhari');
const Backup = require('../models/Backup');
const logger = require('../config/logger');

// ----------------------------------------------------------------------
// @desc    System Health Check
// @route   GET /api/system/health
// @access  Private (Admin)
// ----------------------------------------------------------------------
exports.healthCheck = async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const uptime = process.uptime();
    const memory = process.memoryUsage().rss / 1024 / 1024;

    res.status(200).json({
      success: true,
      status: 'ok',
      uptime: `${uptime.toFixed(0)}s`,
      memory: `${memory.toFixed(2)} MB`,
      mongo: states[mongoState],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Health check error: ${err.message}`);
    res.status(500).json({
      success: false,
      status: 'error',
      message: err.message,
    });
  }
};

// ----------------------------------------------------------------------
// @desc    Get System Stats Summary
// @route   GET /api/system/stats
// @access  Private (Admin/Manager)
// ----------------------------------------------------------------------
exports.getSystemStats = async (req, res) => {
  try {
    const [productCount, userCount, saleCount, lowStock, overdueCount, backupCount] =
      await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Sale.countDocuments(),
        Product.countDocuments({ stock: { $lte: 5 } }),
        Udhari.countDocuments({
          status: { $in: ['pending', 'partial', 'overdue'] },
          dueDate: { $lt: new Date() },
        }),
        Backup.countDocuments(),
      ]);

    const recentSales = await Sale.find()
      .sort('-createdAt')
      .limit(5)
      .select('billNo totalAmount saleDate customer.name')
      .lean();

    const recentBackups = await Backup.find()
      .sort('-createdAt')
      .limit(3)
      .select('fileName backupType status createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totals: {
          products: productCount,
          users: userCount,
          sales: saleCount,
          lowStock,
          overdueUdhari: overdueCount,
          backups: backupCount,
        },
        recent: {
          sales: recentSales,
          backups: recentBackups,
        },
      },
    });
  } catch (err) {
    logger.error(`Get system stats error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching system stats',
      error: err.message,
    });
  }
};

// ----------------------------------------------------------------------
// @desc    Database Collection Summary
// @route   GET /api/system/collections
// @access  Private (Admin)
// ----------------------------------------------------------------------
exports.getCollectionSummary = async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();

    const stats = await Promise.all(
      collections.map(async (col) => {
        const count = await mongoose.connection.db
          .collection(col.name)
          .countDocuments();
        return {
          name: col.name,
          count,
        };
      })
    );

    res.status(200).json({
      success: true,
      collections: stats,
    });
  } catch (err) {
    logger.error(`Get collection summary error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to load collection stats',
    });
  }
};

// ----------------------------------------------------------------------
// @desc    System Info (Node + Env + Versions)
// @route   GET /api/system/info
// @access  Private (Admin)
// ----------------------------------------------------------------------
exports.getSystemInfo = async (req, res) => {
  try {
    const info = {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV,
      mongoURI: process.env.MONGO_URI ? 'Connected ✅' : 'Not Set ⚠️',
      firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      cloudinary: !!process.env.CLOUDINARY_URL,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cpuCores: require('os').cpus().length,
      memoryMB: (require('os').totalmem() / 1024 / 1024).toFixed(0),
    };

    res.status(200).json({
      success: true,
      data: info,
    });
  } catch (err) {
    logger.error(`Get system info error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: 'Error retrieving system info',
    });
  }
};
