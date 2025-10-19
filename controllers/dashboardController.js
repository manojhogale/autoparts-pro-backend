const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Udhari = require('../models/Udhari');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// @desc    Get dashboard stats
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: today, $lt: tomorrow },
          isDraft: false
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: { $toDouble: '$totalProfit' } },
          count: { $sum: 1 }
        }
      }
    ]);

    // This month's sales
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlySales = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startOfMonth, $lte: endOfMonth },
          isDraft: false
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: { $toDouble: '$totalProfit' } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Pending payments (Udhari)
    const pendingPayments = await Udhari.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'partial', 'overdue'] },
          type: 'sale'
        }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pendingAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Low stock items
    const lowStock = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$minStock'] },
      isActive: true
    });

    // Out of stock items
    const outOfStock = await Product.countDocuments({
      stock: 0,
      isActive: true
    });

    // Recent sales
    const recentSales = await Sale.find({ isDraft: false })
      .sort('-saleDate')
      .limit(5)
      .select('billNo customer.name totalAmount saleDate paymentStatus');

    // Top selling products (this month)
    const topProducts = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startOfMonth, $lte: endOfMonth },
          isDraft: false
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        today: {
          sales: todaySales[0]?.totalSales || 0,
          profit: todaySales[0]?.totalProfit || 0,
          count: todaySales[0]?.count || 0
        },
        month: {
          sales: monthlySales[0]?.totalSales || 0,
          profit: monthlySales[0]?.totalProfit || 0,
          count: monthlySales[0]?.count || 0
        },
        pending: {
          amount: pendingPayments[0]?.totalPending || 0,
          count: pendingPayments[0]?.count || 0
        },
        stock: {
          lowStock,
          outOfStock
        },
        recentSales,
        topProducts
      }
    });

  } catch (error) {
    logger.error(`Get dashboard error: ${error.message}`);
    next(error);
  }
};

// @desc    Get sales chart data
// @route   GET /api/dashboard/charts/sales
// @access  Private
exports.getSalesChart = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query; // week, month, year

    let startDate;
    let groupBy;

    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } };
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } };
    } else if (period === 'year') {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupBy = { $dateToString: { format: '%Y-%m', date: '$saleDate' } };
    }

    const chartData = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate },
          isDraft: false
        }
      },
      {
        $group: {
          _id: groupBy,
          sales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: chartData
    });

  } catch (error) {
    logger.error(`Get sales chart error: ${error.message}`);
    next(error);
  }
};