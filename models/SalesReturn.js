const mongoose = require('mongoose');

const salesReturnSchema = new mongoose.Schema({
  returnNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  
  billNo: String,
  
  customer: {
    name: String,
    phone: String
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
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      enum: ['Defective', 'Wrong Item', 'Not Satisfied', 'Damaged', 'Other'],
      required: true
    },
    reasonDetails: String
  }],
  
  totalAmount: {
    type: Number,
    required: true
  },
  
  refundMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit Note'],
    default: 'Cash'
  },
  
  refundStatus: {
    type: String,
    enum: ['Pending', 'Refunded'],
    default: 'Pending'
  },
  
  isExchange: {
    type: Boolean,
    default: false
  },
  
  exchangeSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  
  returnDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  notes: String,
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-generate return number
salesReturnSchema.pre('save', async function(next) {
  if (this.isNew && !this.returnNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.returnNo = `SRT${year}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

salesReturnSchema.index({ returnNo: 1 });
salesReturnSchema.index({ returnDate: -1 });

module.exports = mongoose.model('SalesReturn', salesReturnSchema);