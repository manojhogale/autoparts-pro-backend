const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  changes: [{
    from: {
      type: Number,
      required: true
    },
    to: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['purchase', 'selling', 'mrp'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

priceHistorySchema.index({ productId: 1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);