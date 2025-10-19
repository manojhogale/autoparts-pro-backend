const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test connection
cloudinary.api.ping((error, result) => {
  if (error) {
    logger.error(`❌ Cloudinary connection failed: ${error.message}`);
  } else {
    logger.info('✅ Cloudinary connected');
    console.log('✅ Cloudinary connected');
  }
});

module.exports = cloudinary;