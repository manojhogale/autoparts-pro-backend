const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const admin = require('../config/firebase');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRE || '30d' }
  );

  return { accessToken, refreshToken };
};

// @desc    Send OTP to phone
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return next(new AppError('Please provide a valid 10-digit phone number', 400));
    }

    // Check if user exists
    const user = await User.findOne({ phone });

    // Note: Actual OTP sending is handled by Firebase on client side
    // This endpoint just checks if user exists
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      userExists: !!user,
      data: user ? {
        name: user.name,
        role: user.role
      } : null
    });

  } catch (error) {
    logger.error(`Send OTP error: ${error.message}`);
    next(error);
  }
};

// @desc    Verify OTP and login/register
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, firebaseToken, name, deviceId, deviceInfo } = req.body;

    if (!phone || !firebaseToken) {
      return next(new AppError('Phone and Firebase token are required', 400));
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    } catch (error) {
      return next(new AppError('Invalid or expired Firebase token', 401));
    }

    // Verify phone number matches
    const tokenPhone = decodedToken.phone_number?.replace('+91', '');
    if (tokenPhone !== phone) {
      return next(new AppError('Phone number mismatch', 401));
    }

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      // Register new user
      if (!name) {
        return next(new AppError('Name is required for new user', 400));
      }

      user = await User.create({
        phone,
        name,
        role: 'cashier', // Default role
        isActive: true
      });

      logger.info(`New user registered: ${phone}`);
    } else {
      // Check if user is active
      if (!user.isActive) {
        return next(new AppError('Your account has been deactivated', 403));
      }

      // Check if account is locked
      if (user.isLocked) {
        return next(new AppError('Account is locked. Please try again later', 423));
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      user.deviceId = deviceId;
      await user.save();

      logger.info(`User logged in: ${phone}`);
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      deviceId,
      deviceInfo,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    res.status(200).json({
      success: true,
      message: user.isNew ? 'Registration successful' : 'Login successful',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '15m'
        }
      }
    });

  } catch (error) {
    logger.error(`Verify OTP error: ${error.message}`);
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Check if token exists in database
    const tokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      userId: decoded.id,
      isRevoked: false
    });

    if (!tokenDoc) {
      return next(new AppError('Refresh token not found or revoked', 401));
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      return next(new AppError('Refresh token expired', 401));
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        expiresIn: '15m'
      }
    });

  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await RefreshToken.updateOne(
        { token: refreshToken, userId: req.user._id },
        { isRevoked: true }
      );
    }

    logger.info(`User logged out: ${req.user.phone}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    logger.error(`Get me error: ${error.message}`);
    next(error);
  }
};

// @desc    Update FCM token
// @route   PUT /api/auth/fcm-token
// @access  Private
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return next(new AppError('FCM token is required', 400));
    }

    await User.findByIdAndUpdate(req.user._id, { fcmToken });

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully'
    });

  } catch (error) {
    logger.error(`Update FCM token error: ${error.message}`);
    next(error);
  }
};