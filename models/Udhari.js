const mongoose = require('mongoose');

const udhariSchema = new mongoose.Schema({
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party'
  },
  
  partyName: {
    type: String,
    required: true
  },
  
  phone: {
    type: String,
    required: true,
    index: true
  },
  
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'billType'
  },
  
  billType: {
    type: String,
    enum: ['Sale', 'Purchase']
  },
  
  billNo: String,
  
  type: {
    type: String,
    enum: ['sale', 'purchase'],
    default: 'sale',
    index: true
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'],
      default: 'Cash'
    },
    date: {
      type: Date,
      default: Date.now
    },
    referenceNo: String,
    remarks: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending',
    index: true
  },
  
  dueDate: {
    type: Date,
    index: true
  },
  
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  lastReminderDate: Date,
  
  reminderCount: {
    type: Number,
    default: 0
  },
  
  notes: String,
  
  createdBy: {
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
  timestamps: true
});

// Update status based on payment
udhariSchema.pre('save', function(next) {
  // Calculate paid amount from payments array
  if (this.payments && this.payments.length > 0) {
    this.paidAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }
  
  // Calculate pending amount
  this.pendingAmount = this.totalAmount - this.paidAmount;
  
  // Update status
  if (this.pendingAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (this.dueDate && this.dueDate < new Date()) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
  
  next();
});

// Indexes
udhariSchema.index({ phone: 1, status: 1 });
udhariSchema.index({ dueDate: 1 });
udhariSchema.index({ type: 1, status: 1 });
udhariSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Udhari', udhariSchema);