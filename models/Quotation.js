const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  quotationNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: String,
    email: String,
    address: String,
    vehicleNo: String,
    vehicleModel: String
  },
  
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    gstPercent: {
      type: Number,
      default: 18
    },
    total: {
      type: Number,
      required: true
    }
  }],
  
  subtotal: {
    type: Number,
    required: true
  },
  
  discount: {
    type: Number,
    default: 0
  },
  
  gstAmount: {
    type: Number,
    default: 0
  },
  
  totalAmount: {
    type: Number,
    required: true
  },
  
  validUntil: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'],
    default: 'Draft',
    index: true
  },
  
  pdfUrl: String,
  pdfPublicId: String,
  
  convertedToSale: {
    type: Boolean,
    default: false
  },
  
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  
  quotationDate: {
    type: Date,
    default: Date.now
  },
  
  notes: String,
  termsConditions: String,
  
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

// Auto-generate quotation number
quotationSchema.pre('save', async function(next) {
  if (this.isNew && !this.quotationNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.quotationNo = `QUO${year}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Auto-expire quotations
quotationSchema.pre('save', function(next) {
  if (this.validUntil < new Date() && this.status !== 'Converted' && this.status !== 'Accepted') {
    this.status = 'Expired';
  }
  next();
});

quotationSchema.index({ quotationNo: 1 });
quotationSchema.index({ quotationDate: -1 });
quotationSchema.index({ status: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);