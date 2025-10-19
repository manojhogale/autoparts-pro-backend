const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: 'text'
  },
  
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  
  sku: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    index: true
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Engine Parts',
      'Body Parts',
      'Electrical',
      'Brake System',
      'Suspension',
      'Filters',
      'Oils',
      'Lubricants',
      'Accessories',
      'Tyres',
      'Batteries',
      'Other'
    ],
    index: true
  },
  
  subCategory: String,
  
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    index: true
  },
  
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Pricing
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  
  // GST Details
  gstDetails: {
    taxSlab: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 18
    },
    hsnCode: {
      type: String,
      trim: true
    },
    cessPercent: {
      type: Number,
      default: 0,
      min: 0
    },
    isTaxInclusive: {
      type: Boolean,
      default: false
    },
    igstApplicable: {
      type: Boolean,
      default: false
    }
  },
  
  // Stock
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  
  minStock: {
    type: Number,
    default: 5,
    min: 0
  },
  
  maxStock: {
    type: Number,
    default: 100,
    min: 0
  },
  
  unit: {
    type: String,
    enum: ['piece', 'liter', 'kg', 'meter', 'set', 'pair', 'box'],
    default: 'piece'
  },
  
  // Multi-branch stock (for future use)
  stockByBranch: [{
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    quantity: {
      type: Number,
      default: 0
    },
    location: String // e.g., "Shelf A-5"
  }],
  
  // Vehicle compatibility
  vehicleType: [{
    type: String,
    enum: ['Car', 'Bike', 'Truck', 'Auto', 'Tractor', 'All']
  }],
  
  compatibleModels: [String],
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  
  // Batch tracking
  batchTracking: {
    type: Boolean,
    default: false
  },
  
  currentBatches: [{
    batchNo: String,
    quantity: Number,
    mfgDate: Date,
    expiryDate: Date,
    purchasePrice: Number
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Supplier
  supplier: {
    name: String,
    phone: String,
    address: String
  },
  
  warrantyPeriod: {
    type: Number,
    default: 0 // in months
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Auto-generate SKU if not provided
productSchema.pre('save', async function(next) {
  if (!this.sku || this.isNew) {
    const count = await this.constructor.countDocuments();
    this.sku = `SKU${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Virtual: Profit Margin
productSchema.virtual('profitMargin').get(function() {
  if (this.purchasePrice === 0) return 0;
  return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice * 100).toFixed(2);
});

// Virtual: Profit Amount
productSchema.virtual('profitAmount').get(function() {
  return (this.sellingPrice - this.purchasePrice).toFixed(2);
});

// Virtual: Is Low Stock
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStock;
});

// Virtual: Is Out of Stock
productSchema.virtual('isOutOfStock').get(function() {
  return this.stock === 0;
});

// Virtual: Stock Status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low_stock';
  if (this.stock >= this.maxStock) return 'overstock';
  return 'in_stock';
});

// Indexes
productSchema.index({ name: 'text', brand: 'text', category: 'text' });
productSchema.index({ barcode: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);