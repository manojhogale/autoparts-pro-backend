const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  billNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  customer: {
    name: {
      type: String,
      default: 'Walk-in Customer'
    },
    phone: String,
    email: String,
    address: String,
    gstNo: String,
    vehicleNo: String,
    vehicleModel: String
  },
  
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    barcode: String,
    sku: String,
    batchNo: String,
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    mrp: Number,
    purchasePrice: Number, // For profit calculation
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    gstPercent: {
      type: Number,
      default: 18
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  gstAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  roundOff: {
    type: Number,
    default: 0
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer', 'Credit'],
    default: 'Cash'
  },
  
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Paid',
    index: true
  },
  
  // Split payment
  splitPayments: [{
    mode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer']
    },
    amount: {
      type: Number,
      min: 0
    },
    referenceNo: String,
    transactionId: String
  }],
  
  // Payment details
  upiTransactionId: String,
  cardTransactionId: String,
  chequeNo: String,
  chequeDate: Date,
  bankName: String,
  
  // Bill PDF
  billPdfUrl: String,
  billPdfPublicId: String,
  billTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillTemplate'
  },
  
  saleDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  notes: String,
  
  // Return/Exchange
  isReturned: {
    type: Boolean,
    default: false
  },
  
  returnDate: Date,
  
  returnAmount: {
    type: Number,
    default: 0
  },
  
  // Draft/Hold
  isDraft: {
    type: Boolean,
    default: false,
    index: true
  },
  
  draftSavedAt: Date,
  
  // Branch
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Auto-generate bill number
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.billNo = `BILL${year}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Virtual: Total Profit
saleSchema.virtual('totalProfit').get(function() {
  let profit = 0;
  this.items.forEach(item => {
    if (item.purchasePrice) {
      const itemProfit = (item.price - item.purchasePrice) * item.quantity - item.discount;
      profit += itemProfit;
    }
  });
  return profit.toFixed(2);
});

// Virtual: Profit Margin
saleSchema.virtual('profitMargin').get(function() {
  if (this.totalAmount === 0) return 0;
  return ((this.totalProfit / this.totalAmount) * 100).toFixed(2);
});

// Indexes
saleSchema.index({ billNo: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ 'customer.phone': 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ isDraft: 1 });
saleSchema.index({ createdBy: 1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);