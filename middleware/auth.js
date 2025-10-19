const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const logger = require('../config/logger');

// Protect routes - Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return next(new AppError('User not found', 404));
      }

      if (!req.user.isActive) {
        return next(new AppError('User account is deactivated', 403));
      }

      // Store device info
      req.deviceInfo = {
        deviceId: req.headers['x-device-id'],
        deviceName: req.headers['x-device-name'],
        os: req.headers['x-device-os'],
        appVersion: req.headers['x-app-version']
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401));
      }
      return next(new AppError('Invalid token', 401));
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    next(error);
  }
};

// Optional auth (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (err) {
        // Continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};