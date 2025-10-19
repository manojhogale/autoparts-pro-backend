const mongoose = require('mongoose');

const billTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: String,
  
  paperSize: {
    type: String,
    enum: ['A4', 'A5', 'Letter', 'Thermal-80mm', 'Thermal-58mm', 'Custom'],
    default: 'A4'
  },
  
  header: {
    showLogo: { type: Boolean, default: true },
    logoUrl: String,
    logoPublicId: String,
    companyName: String,
    companyAddress: String,
    companyPhone: String,
    companyEmail: String,
    companyGST: String
  },
  
  footer: {
    termsConditions: String,
    thankYouMessage: { type: String, default: 'Thank you for your business!' },
    showSignature: { type: Boolean, default: true }
  },
  
  colors: {
    primary: { type: String, default: '#000000' },
    secondary: { type: String, default: '#666666' }
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
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

// Only one default template
billTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('BillTemplate', billTemplateSchema);