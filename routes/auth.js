const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  refreshToken,
  logout,
  getMe,
  updateFCMToken
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/send-otp', otpLimiter, sendOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/fcm-token', protect, updateFCMToken);

module.exports = router;