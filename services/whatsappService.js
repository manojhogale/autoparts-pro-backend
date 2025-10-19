const axios = require('axios');
const logger = require('../config/logger');

// Send WhatsApp message (using wa.me link)
exports.sendWhatsApp = async (phone, message) => {
  try {
    // For basic implementation, we'll just return the wa.me link
    // For actual sending, you'll need WhatsApp Business API

    const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    
    logger.info(`WhatsApp link generated for: ${phone}`);
    return waLink;

  } catch (error) {
    logger.error(`Send WhatsApp error: ${error.message}`);
    throw error;
  }
};

// Send WhatsApp bill
exports.sendWhatsAppBill = async (sale) => {
  try {
    const message = `✅ Thank you for shopping at ${process.env.COMPANY_NAME}!\n\nBill No: ${sale.billNo}\nDate: ${sale.saleDate.toLocaleDateString()}\nAmount: ₹${sale.totalAmount}\n\nItems:\n${sale.items.map(item => `• ${item.productName} x${item.quantity} - ₹${item.total}`).join('\n')}\n\nFor queries: ${process.env.COMPANY_PHONE}\nVisit again! 😊`;

    if (sale.customer?.phone) {
      return await exports.sendWhatsApp(sale.customer.phone, message);
    }

  } catch (error) {
    logger.error(`Send WhatsApp bill error: ${error.message}`);
    throw error;
  }
};

// Send WhatsApp using Business API (if configured)
exports.sendWhatsAppViaAPI = async (phone, message) => {
  try {
    if (!process.env.WHATSAPP_API_URL) {
      throw new Error('WhatsApp API not configured');
    }

    const response = await axios.post(process.env.WHATSAPP_API_URL, {
      phone: `91${phone}`,
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`WhatsApp sent via API to: ${phone}`);
    return response.data;

  } catch (error) {
    logger.error(`WhatsApp API error: ${error.message}`);
    throw error;
  }
};