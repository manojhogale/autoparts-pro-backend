const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Validate request body
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    req.body = value;
    next();
  };
};

// Validation schemas
const schemas = {
  // Product validation
  product: Joi.object({
    name: Joi.string().required().max(200),
    barcode: Joi.string().optional(),
    category: Joi.string().required(),
    brand: Joi.string().required(),
    description: Joi.string().optional().max(1000),
    purchasePrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    mrp: Joi.number().min(0).required(),
    stock: Joi.number().min(0).required(),
    minStock: Joi.number().min(0).optional(),
    maxStock: Joi.number().min(0).optional(),
    unit: Joi.string().valid('piece', 'liter', 'kg', 'meter', 'set', 'pair', 'box').optional(),
    gstDetails: Joi.object({
      taxSlab: Joi.number().valid(0, 5, 12, 18, 28).optional(),
      hsnCode: Joi.string().optional(),
      cessPercent: Joi.number().min(0).optional()
    }).optional(),
    vehicleType: Joi.array().items(Joi.string()).optional()
  }),

  // Sale validation
  sale: Joi.object({
    customer: Joi.object({
      name: Joi.string().optional(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
      email: Joi.string().email().optional(),
      vehicleNo: Joi.string().optional()
    }).optional(),
    
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().min(0).required(),
        discount: Joi.number().min(0).optional()
      })
    ).min(1).required(),
    
    discount: Joi.number().min(0).optional(),
    paymentMode: Joi.string().valid('Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer', 'Credit').required(),
    paidAmount: Joi.number().min(0).required(),
    notes: Joi.string().optional()
  }),

  // Purchase validation
  purchase: Joi.object({
    supplier: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
      address: Joi.string().optional(),
      gstNo: Joi.string().optional()
    }).required(),
    
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().min(0).required()
      })
    ).min(1).required(),
    
    paymentMode: Joi.string().valid('Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer', 'Credit').optional(),
    paidAmount: Joi.number().min(0).optional(),
    invoiceNo: Joi.string().optional(),
    notes: Joi.string().optional()
  }),

  // User validation
  user: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    name: Joi.string().required().max(100),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    role: Joi.string().valid('admin', 'manager', 'cashier').optional()
  }),

  // Payment validation
  payment: Joi.object({
    amount: Joi.number().min(0).required(),
    paymentMode: Joi.string().valid('Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer').required(),
    referenceNo: Joi.string().optional(),
    remarks: Joi.string().optional()
  })
};

module.exports = { validate, schemas };