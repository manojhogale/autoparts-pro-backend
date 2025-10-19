const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Udhari = require('../models/Udhari');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    let groupByFormat;
    if (groupBy === 'day') {
      groupByFormat = '%Y-%m-%d';
    } else if (groupBy === 'month') {
      groupByFormat = '%Y-%m';
    } else if (groupBy === 'year') {
      groupByFormat = '%Y';
    }

    const salesData = await Sale.aggregate([
      {
        $match: {
          saleDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          isDraft: false
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$saleDate' } },
          totalSales: { $sum: '$totalAmount' },
          totalProfit: { $sum: { $toDouble: '$totalProfit' } },
          totalDiscount: { $sum: '$discount' },
          billCount: { $sum: 1 },
          itemCount: { $sum: { $size: '$items' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate totals
    const totals = salesData.reduce((acc, curr) => ({
      totalSales: acc.totalSales + curr.totalSales,
      totalProfit: acc.totalProfit + curr.totalProfit,
      totalDiscount: acc.totalDiscount + curr.totalDiscount,
      billCount: acc.billCount + curr.billCount,
      itemCount: acc.itemCount + curr.itemCount
    }), {
      totalSales: 0,
      totalProfit: 0,
      totalDiscount: 0,
      billCount: 0,
      itemCount: 0
    });

    res.status(200).json({
      success: true,
      period: { startDate, endDate },
      groupBy,
      totals,
      data: salesData
    });

  } catch (error) {
    logger.error(`Get sales report error: ${error.message}`);
    next(error);
  }
};

// @desc    Get profit/loss report
// @route   GET /api/reports/profit-loss
// @access  Private
exports.getProfitLossReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    // Sales revenue
    const salesData = await Sale.aggregate([
      {
        $match: {
          saleDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          isDraft: false
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalProfit: { $sum: { $toDouble: '$totalProfit' } },
          totalDiscount: { $sum: '$discount' }
        }
      }
    ]);

    // Purchase cost
    const purchaseData = await Purchase.aggregate([
      {
        $match: {
          purchaseDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Expenses (if expense model exists)
    // const expenseData = await Expense.aggregate([...]);

    const revenue = salesData[0]?.totalRevenue || 0;
    const grossProfit = salesData[0]?.totalProfit || 0;
    const totalDiscount = salesData[0]?.totalDiscount || 0;
    const purchaseCost = purchaseData[0]?.totalPurchase || 0;
    // const expenses = expenseData[0]?.totalExpenses || 0;

    // const netProfit = grossProfit - expenses;
    const netProfit = grossProfit; // Without expenses for now

    res.status(200).json({
      success: true,
      period: { startDate, endDate },
      data: {
        revenue,
        purchaseCost,
        grossProfit,
        totalDiscount,
        // expenses,
        netProfit,
        profitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    logger.error(`Get profit/loss report error: ${error.message}`);
    next(error);
  }
};

// @desc    Get stock report
// @route   GET /api/reports/stock
// @access  Private
exports.getStockReport = async (req, res, next) => {
  try {
    const { category, brand, stockStatus } = req.query;

    const query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = { $regex: brand, $options: 'i' };

    if (stockStatus) {
      if (stockStatus === 'low') {
        query.$expr = { $lte: ['$stock', '$minStock'] };
      } else if (stockStatus === 'out') {
        query.stock = 0;
      }
    }

    const products = await Product.find(query).select(
      'name sku barcode category brand stock minStock purchasePrice sellingPrice'
    );

    const stockValue = products.reduce((sum, product) => {
      return sum + (product.stock * product.purchasePrice);
    }, 0);

    res.status(200).json({
      success: true,
      count: products.length,
      stockValue,
      data: products
    });

  } catch (error) {
    logger.error(`Get stock report error: ${error.message}`);
    next(error);
  }
};

// @desc    Get top selling products
// @route   GET /api/reports/top-selling
// @access  Private
exports.getTopSelling = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const matchStage = { isDraft: false };

    if (startDate && endDate) {
      matchStage.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const topProducts = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          salesCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.status(200).json({
      success: true,
      count: topProducts.length,
      data: topProducts
    });

  } catch (error) {
    logger.error(`Get top selling error: ${error.message}`);
    next(error);
  }
};

// @desc    Get GST report
// @route   GET /api/reports/gst
// @access  Private
exports.getGSTReport = async (req, res, next) => {
  try {
    const { startDate, endDate, reportType = 'gstr1' } = req.query;

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    const sales = await Sale.find({
      saleDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isDraft: false
    });

    let b2bSales = [];
    let b2cSales = [];
    let hsnSummary = {};

    sales.forEach(sale => {
      const isB2B = sale.customer?.gstNo ? true : false;

      if (isB2B) {
        b2bSales.push({
          billNo: sale.billNo,
          billDate: sale.saleDate,
          customerName: sale.customer.name,
          gstNo: sale.customer.gstNo,
          taxableValue: sale.subtotal,
          gstAmount: sale.gstAmount,
          totalAmount: sale.totalAmount
        });
      } else {
        b2cSales.push({
          billNo: sale.billNo,
          billDate: sale.saleDate,
          taxableValue: sale.subtotal,
          gstAmount: sale.gstAmount,
          totalAmount: sale.totalAmount
        });
      }

      // HSN Summary
      sale.items.forEach(item => {
        const hsn = item.hsnCode || 'N/A';
        const gstRate = item.gstPercent;

        const key = `${hsn}_${gstRate}`;

        if (!hsnSummary[key]) {
          hsnSummary[key] = {
            hsn,
            gstRate,
            taxableValue: 0,
            gstAmount: 0,
            totalAmount: 0,
            quantity: 0
          };
        }

        hsnSummary[key].taxableValue += item.total - item.gstAmount;
        hsnSummary[key].gstAmount += item.gstAmount;
        hsnSummary[key].totalAmount += item.total;
        hsnSummary[key].quantity += item.quantity;
      });
    });

    res.status(200).json({
      success: true,
      period: { startDate, endDate },
      data: {
        b2b: {
          count: b2bSales.length,
          sales: b2bSales
        },
        b2c: {
          count: b2cSales.length,
          sales: b2cSales
        },
        hsnSummary: Object.values(hsnSummary)
      }
    });

  } catch (error) {
    logger.error(`Get GST report error: ${error.message}`);
    next(error);
  }
};

// @desc    Export report to Excel
// @route   GET /api/reports/export/excel
// @access  Private
exports.exportToExcel = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate } = req.query;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers and data based on reportType
    if (reportType === 'sales') {
      worksheet.columns = [
        { header: 'Bill No', key: 'billNo', width: 15 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Customer', key: 'customer', width: 20 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Payment Status', key: 'status', width: 15 }
      ];

      const sales = await Sale.find({
        saleDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        isDraft: false
      });

      sales.forEach(sale => {
        worksheet.addRow({
          billNo: sale.billNo,
          date: sale.saleDate.toLocaleDateString(),
          customer: sale.customer?.name || 'Walk-in',
          amount: sale.totalAmount,
          status: sale.paymentStatus
        });
      });
    }

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${reportType}_report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    logger.error(`Export to Excel error: ${error.message}`);
    next(error);
  }
};