const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

// Generate unique bill number
exports.generateBillNo = async (type = 'BILL') => {
  const year = new Date().getFullYear();
  
  let Model;
  if (type === 'BILL') {
    Model = Sale;
  } else if (type === 'PUR') {
    Model = Purchase;
  }

  const count = await Model.countDocuments({
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });

  return `${type}${year}${(count + 1).toString().padStart(6, '0')}`;
};

// Generate SKU
exports.generateSKU = async () => {
  const Product = require('../models/Product');
  const count = await Product.countDocuments();
  return `SKU${(count + 1).toString().padStart(6, '0')}`;
};