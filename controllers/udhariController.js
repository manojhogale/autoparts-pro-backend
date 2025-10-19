const Udhari = require('../models/Udhari');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { sendWhatsAppReminder, sendSMSReminder } = require('../services/notificationService');

// @desc    Get all udhari
// @route   GET /api/udhari
// @access  Private
exports.getUdhariList = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search
    } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { billNo: { $regex: search, $options: 'i' } }
      ];
    }

    const udhariList = await Udhari.find(query)
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name');

    const count = await Udhari.countDocuments(query);

    // Calculate totals
    const totals = await Udhari.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          totalPending: { $sum: '$pendingAmount' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: udhariList.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totals: totals[0] || { totalAmount: 0, totalPending: 0, totalPaid: 0 },
      data: udhariList
    });

  } catch (error) {
    logger.error(`Get udhari list error: ${error.message}`);
    next(error);
  }
};

// @desc    Get single udhari
// @route   GET /api/udhari/:id
// @access  Private
exports.getUdhari = async (req, res, next) => {
  try {
    const udhari = await Udhari.findById(req.params.id)
      .populate('billId')
      .populate('createdBy', 'name');

    if (!udhari) {
      return next(new AppError('Udhari record not found', 404));
    }

    res.status(200).json({
      success: true,
      data: udhari
    });

  } catch (error) {
    logger.error(`Get udhari error: ${error.message}`);
    next(error);
  }
};

// @desc    Add payment to udhari
// @route   POST /api/udhari/:id/payments
// @access  Private
exports.addPayment = async (req, res, next) => {
  try {
    const { amount, paymentMode, referenceNo, remarks } = req.body;

    const udhari = await Udhari.findById(req.params.id);

    if (!udhari) {
      return next(new AppError('Udhari record not found', 404));
    }

    if (amount > udhari.pendingAmount) {
      return next(new AppError('Payment amount exceeds pending amount', 400));
    }

    // Add payment
    udhari.payments.push({
      amount,
      paymentMode,
      referenceNo,
      remarks,
      date: new Date(),
      receivedBy: req.user._id
    });

    await udhari.save(); // Pre-save hook will update amounts and status

    logger.info(`Payment collected for udhari: ${udhari.billNo}`);

    res.status(200).json({
      success: true,
      message: 'Payment collected successfully',
      data: udhari
    });

  } catch (error) {
    logger.error(`Add payment to udhari error: ${error.message}`);
    next(error);
  }
};

// @desc    Send reminder
// @route   POST /api/udhari/:id/reminder
// @access  Private
exports.sendReminder = async (req, res, next) => {
  try {
    const { channel = 'whatsapp' } = req.body; // whatsapp, sms, both

    const udhari = await Udhari.findById(req.params.id);

    if (!udhari) {
      return next(new AppError('Udhari record not found', 404));
    }

    if (udhari.status === 'paid') {
      return next(new AppError('This udhari is already paid', 400));
    }

    let sent = false;

    if (channel === 'whatsapp' || channel === 'both') {
      await sendWhatsAppReminder(udhari);
      sent = true;
    }

    if (channel === 'sms' || channel === 'both') {
      await sendSMSReminder(udhari);
      sent = true;
    }

    if (sent) {
      udhari.reminderSent = true;
      udhari.lastReminderDate = new Date();
      udhari.reminderCount += 1;
      await udhari.save();
    }

    logger.info(`Reminder sent for udhari: ${udhari.billNo} via ${channel}`);

    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully'
    });

  } catch (error) {
    logger.error(`Send reminder error: ${error.message}`);
    next(error);
  }
};

// @desc    Send bulk reminders
// @route   POST /api/udhari/bulk-reminder
// @access  Private (Manager/Admin)
exports.sendBulkReminders = async (req, res, next) => {
  try {
    const { channel = 'whatsapp', status = 'overdue' } = req.body;

    const query = {
      status: { $in: [status] },
      type: 'sale'
    };

    const udhariList = await Udhari.find(query);

    let sentCount = 0;

    for (const udhari of udhariList) {
      try {
        if (channel === 'whatsapp' || channel === 'both') {
          await sendWhatsAppReminder(udhari);
        }

        if (channel === 'sms' || channel === 'both') {
          await sendSMSReminder(udhari);
        }

        udhari.reminderSent = true;
        udhari.lastReminderDate = new Date();
        udhari.reminderCount += 1;
        await udhari.save();

        sentCount++;
      } catch (err) {
        logger.error(`Failed to send reminder for ${udhari.billNo}: ${err.message}`);
      }
    }

    logger.info(`Bulk reminders sent: ${sentCount} out of ${udhariList.length}`);

    res.status(200).json({
      success: true,
      message: `Reminders sent to ${sentCount} customers`,
      data: {
        total: udhariList.length,
        sent: sentCount
      }
    });

  } catch (error) {
    logger.error(`Send bulk reminders error: ${error.message}`);
    next(error);
  }
};

// @desc    Get overdue udhari
// @route   GET /api/udhari/overdue
// @access  Private
exports.getOverdue = async (req, res, next) => {
  try {
    const overdueList = await Udhari.find({
      dueDate: { $lt: new Date() },
      status: { $in: ['pending', 'partial'] },
      type: 'sale'
    }).sort('dueDate');

    const totalOverdue = overdueList.reduce((sum, item) => sum + item.pendingAmount, 0);

    res.status(200).json({
      success: true,
      count: overdueList.length,
      totalOverdue,
      data: overdueList
    });

  } catch (error) {
    logger.error(`Get overdue error: ${error.message}`);
    next(error);
  }
};

// @desc    Get aging report
// @route   GET /api/udhari/aging-report
// @access  Private
exports.getAgingReport = async (req, res, next) => {
  try {
    const today = new Date();

    const agingData = await Udhari.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'partial', 'overdue'] },
          type: 'sale'
        }
      },
      {
        $addFields: {
          daysOverdue: {
            $dateDiff: {
              startDate: '$dueDate',
              endDate: today,
              unit: 'day'
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: '$daysOverdue',
          boundaries: [-Infinity, 0, 30, 60, 90, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$pendingAmount' },
            records: { $push: '$$ROOT' }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        current: agingData.find(a => a._id === -Infinity) || { count: 0, totalAmount: 0 },
        '0-30': agingData.find(a => a._id === 0) || { count: 0, totalAmount: 0 },
        '30-60': agingData.find(a => a._id === 30) || { count: 0, totalAmount: 0 },
        '60-90': agingData.find(a => a._id === 60) || { count: 0, totalAmount: 0 },
        '90+': agingData.find(a => a._id === 90) || { count: 0, totalAmount: 0 }
      }
    });

  } catch (error) {
    logger.error(`Get aging report error: ${error.message}`);
    next(error);
  }
};