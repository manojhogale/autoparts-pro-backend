const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const cron = require('node-cron');
require('dotenv').config();

// Import configurations
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import services
const { scheduleBackup } = require('./services/backupService');
const { sendScheduledReminders } = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const purchaseRoutes = require('./routes/purchases');
const purchaseReturnRoutes = require('./routes/purchaseReturns');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const saleRoutes = require('./routes/sales');
const salesReturnRoutes = require('./routes/salesReturns');
const quotationRoutes = require('./routes/quotations');
const partyRoutes = require('./routes/parties');
const udhariRoutes = require('./routes/udhari');
const voucherRoutes = require('./routes/vouchers');
const expenseRoutes = require('./routes/expenses');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const templateRoutes = require('./routes/templates');
const notificationRoutes = require('./routes/notifications');
const backupRoutes = require('./routes/backup');
const syncRoutes = require('./routes/sync');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const auditRoutes = require('./routes/audit');

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// ========================================
// MIDDLEWARE
// ========================================

// Security headers
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Static files
app.use('/uploads', express.static('uploads'));

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AutoParts Pro API is running',
    version: process.env.APP_VERSION,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/sales-returns', salesReturnRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/udhari', udhariRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// ========================================
// CRON JOBS
// ========================================

// Daily backup at 2 AM
if (process.env.BACKUP_ENABLED === 'true') {
  const backupTime = process.env.BACKUP_TIME || '02:00';
  const [hour, minute] = backupTime.split(':');

  cron.schedule(`${minute} ${hour} * * *`, async () => {
    logger.info('Running scheduled backup...');
    await scheduleBackup();
  });
}

// Send payment reminders at 9 AM
cron.schedule('0 9 * * *', async () => {
  logger.info('Sending scheduled reminders...');
  await sendScheduledReminders();
});

// Clean expired tokens every hour
cron.schedule('0 * * * *', async () => {
  const RefreshToken = require('./models/RefreshToken');
  await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
  logger.info('Cleaned expired refresh tokens');
});

// ========================================
// SERVER
// ========================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║          🚀 AUTOPARTS PRO API SERVER 🚀              ║
║                                                       ║
║  Status:    Running                                   ║
║  Port:      ${PORT}                                   ║
║  Mode:      ${process.env.NODE_ENV}                   ║
║  Version:   ${process.env.APP_VERSION}                ║
║                                                       ║
║  API Docs:  http://localhost:${PORT}/api-docs         ║
║  Health:    http://localhost:${PORT}/health           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  logger.info(`Server started on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;