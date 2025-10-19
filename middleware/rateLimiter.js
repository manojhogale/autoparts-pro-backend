const rateLimit = require('express-rate-limit');

// General API rate limiter
exports.rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator (can use user ID instead of IP)
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false
});

// Strict rate limiter for auth routes
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// OTP rate limiter
exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTPs per minute
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});