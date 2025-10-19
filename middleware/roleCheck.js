const { AppError } = require('./errorHandler');

// Authorize by role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

// Check specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    if (!req.user.permissions[permission]) {
      return next(
        new AppError(
          `You don't have permission to ${permission}`,
          403
        )
      );
    }

    next();
  };
};

// Check discount permission
exports.checkDiscountPermission = (discountPercent) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    if (!req.user.permissions.canGiveDiscount) {
      return next(new AppError('You are not allowed to give discounts', 403));
    }

    if (discountPercent > req.user.permissions.maxDiscountPercent) {
      return next(
        new AppError(
          `You can give maximum ${req.user.permissions.maxDiscountPercent}% discount`,
          403
        )
      );
    }

    next();
  };
};