// utils/whatsappService.js
// ======================================================================
// WhatsApp Service - AutoParts Pro
// ----------------------------------------------------------------------
// Handles WhatsApp message sending via Business API or wa.me links
// ======================================================================

const axios = require('axios');
const logger = require('../config/logger');

// ======================================================================
// Send WhatsApp Message (wa.me link generation)
// ======================================================================
exports.sendWhatsAppMessage = async (phone, message) => {
  try {
    // Generate wa.me link (works without Business API)
    const cleanPhone = phone.replace(/\D/g, '');
    const link = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    logger.info(`✅ WhatsApp link generated for ${phone}`);
    
    return {
      success: true,
      link,
      message: 'WhatsApp link generated successfully',
    };
  } catch (error) {
    logger.error(`❌ WhatsApp error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ======================================================================
// Send WhatsApp via Business API (Optional - needs API setup)
// ======================================================================
exports.sendWhatsAppViaAPI = async (phone, message) => {
  try {
    if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) {
      logger.warn('⚠️ WhatsApp Business API not configured');
      // Fallback to wa.me link
      return exports.sendWhatsAppMessage(phone, message);
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    const response = await axios.post(
      process.env.WHATSAPP_API_URL,
      {
        phone: `91${cleanPhone}`,
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    logger.info(`✅ WhatsApp sent via API to ${phone}`);
    
    return {
      success: true,
      data: response.data,
      message: 'WhatsApp sent successfully',
    };
  } catch (error) {
    logger.error(`❌ WhatsApp API error: ${error.message}`);
    
    // Fallback to wa.me link
    return exports.sendWhatsAppMessage(phone, message);
  }
};

// ======================================================================
// Send WhatsApp Bill/Invoice
// ======================================================================
exports.sendWhatsAppBill = async (sale) => {
  try {
    if (!sale.customer?.phone) {
      throw new Error('Customer phone number not found');
    }

    const message = `
✅ *${process.env.COMPANY_NAME || 'AutoParts Pro'}*

*Bill No:* ${sale.billNo}
*Date:* ${new Date(sale.saleDate).toLocaleDateString('en-IN')}
*Amount:* ₹${sale.totalAmount.toFixed(2)}

*Items:*
${sale.items.map((item, i) => 
  `${i + 1}. ${item.productName} x${item.quantity} - ₹${item.total.toFixed(2)}`
).join('\n')}

*Payment Status:* ${sale.paymentStatus}
${sale.pendingAmount > 0 ? `*Pending:* ₹${sale.pendingAmount.toFixed(2)}` : ''}

Thank you for your business! 😊

${process.env.COMPANY_PHONE ? `📞 ${process.env.COMPANY_PHONE}` : ''}
    `.trim();

    return await exports.sendWhatsAppMessage(sale.customer.phone, message);
  } catch (error) {
    logger.error(`❌ Send WhatsApp bill error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send WhatsApp Payment Reminder
// ======================================================================
exports.sendWhatsAppReminder = async (udhari) => {
  try {
    if (!udhari.phone) {
      throw new Error('Phone number not found');
    }

    const message = `
⏰ *Payment Reminder*

Dear ${udhari.partyName},

Your payment of *₹${udhari.pendingAmount.toFixed(2)}* is pending.

*Bill No:* ${udhari.billNo}
${udhari.dueDate ? `*Due Date:* ${new Date(udhari.dueDate).toLocaleDateString('en-IN')}` : ''}

Please make payment at your earliest convenience.

Thank you!
*${process.env.COMPANY_NAME || 'AutoParts Pro'}*
${process.env.COMPANY_PHONE ? `📞 ${process.env.COMPANY_PHONE}` : ''}
    `.trim();

    return await exports.sendWhatsAppMessage(udhari.phone, message);
  } catch (error) {
    logger.error(`❌ Send WhatsApp reminder error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send WhatsApp Quotation
// ======================================================================
exports.sendWhatsAppQuotation = async (quotation, pdfUrl = null) => {
  try {
    if (!quotation.customer?.phone) {
      throw new Error('Customer phone number not found');
    }

    const message = `
📄 *Quotation - ${process.env.COMPANY_NAME || 'AutoParts Pro'}*

*Quotation No:* ${quotation.quotationNo}
*Date:* ${new Date(quotation.quotationDate).toLocaleDateString('en-IN')}
*Valid Until:* ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}

*Customer:* ${quotation.customer.name}

*Items:*
${quotation.items.map((item, i) => 
  `${i + 1}. ${item.productName} x${item.quantity} - ₹${item.total.toFixed(2)}`
).join('\n')}

*Total Amount:* ₹${quotation.totalAmount.toFixed(2)}

${pdfUrl ? `\n📎 Download PDF: ${pdfUrl}` : ''}

${quotation.note ? `\n*Note:* ${quotation.note}` : ''}

Thank you!
${process.env.COMPANY_PHONE ? `📞 ${process.env.COMPANY_PHONE}` : ''}
    `.trim();

    return await exports.sendWhatsAppMessage(quotation.customer.phone, message);
  } catch (error) {
    logger.error(`❌ Send WhatsApp quotation error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send Bulk WhatsApp Messages
// ======================================================================
exports.sendBulkWhatsApp = async (recipients) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const recipient of recipients) {
      try {
        await exports.sendWhatsAppMessage(recipient.phone, recipient.message);
        results.success++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: recipient.phone,
          error: error.message,
        });
      }
    }

    logger.info(`📊 Bulk WhatsApp: ${results.success} sent, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    logger.error(`❌ Bulk WhatsApp error: ${error.message}`);
    throw error;
  }
};

module.exports = exports;