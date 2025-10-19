const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier'],
    default: 'cashier'
  },
  
  permissions: {
    canAddProduct: { type: Boolean, default: false },
    canEditProduct: { type: Boolean, default: false },
    canDeleteProduct: { type: Boolean, default: false },
    canMakeSale: { type: Boolean, default: true },
    canMakePurchase: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageUdhari: { type: Boolean, default: false },
    canGiveDiscount: { type: Boolean, default: false },
    maxDiscountPercent: { type: Number, default: 0 }
  },
  
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: Date,
  
  fcmToken: String,
  
  deviceId: String,
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  
  profileImage: {
    url: String,
    publicId: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Set permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch(this.role) {
      case 'admin':
        this.permissions = {
          canAddProduct: true,
          canEditProduct: true,
          canDeleteProduct: true,
          canMakeSale: true,
          canMakePurchase: true,
          canViewReports: true,
          canManageUdhari: true,
          canGiveDiscount: true,
          maxDiscountPercent: 100
        };
        break;
      
      case 'manager':
        this.permissions = {
          canAddProduct: true,
          canEditProduct: true,
          canDeleteProduct: false,
          canMakeSale: true,
          canMakePurchase: true,
          canViewReports: true,
          canManageUdhari: true,
          canGiveDiscount: true,
          maxDiscountPercent: 20
        };
        break;
      
      case 'cashier':
        this.permissions = {
          canAddProduct: false,
          canEditProduct: false,
          canDeleteProduct: false,
          canMakeSale: true,
          canMakePurchase: false,
          canViewReports: false,
          canManageUdhari: false,
          canGiveDiscount: true,
          maxDiscountPercent: 5
        };
        break;
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockTime = parseInt(process.env.LOCK_TIME) || 15 * 60 * 1000; // 15 minutes
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);