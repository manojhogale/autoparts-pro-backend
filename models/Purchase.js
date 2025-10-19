const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  purchaseNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  supplier: {
    name: {
      type: String,
      required: [true, 'Supplier name is required']
    },
    phone: {
      type: String,
      required: [true, 'Supplier phone is required']
    },
    address: String,
    gstNo: String
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
    gst: {
      type: Number,
      default: 0
    },
    gstAmount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  }],
  
  // Amounts
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  gstAmount: {
    type: Number,
    default: 0
  },
  
  otherCharges: {
    type: Number,
    default: 0
  },
  
  discount: {
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
    default: 'Pending',
    index: true
  },
  
  payments: [{
    amount: {
      type: Number,
      min: 0
    },
    paymentMode: String,
    date: {
      type: Date,
      default: Date.now
    },
    referenceNo: String,
    remarks: String
  }],
  
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  invoiceNo: String,
  invoiceDate: Date,
  
  notes: String,
  
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
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
  timestamps: true
});

// Auto-generate purchase number
purchaseSchema.pre('save', async function(next) {
  if (this.isNew && !this.purchaseNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.purchaseNo = `PUR${year}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Indexes
purchaseSchema.index({ purchaseNo: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ 'supplier.phone': 1 });
purchaseSchema.index({ paymentStatus: 1 });
purchaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);