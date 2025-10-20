// utils/smsService.js
// ======================================================================
// SMS Service - AutoParts Pro
// ----------------------------------------------------------------------
// Handles SMS sending via MSG91, Twilio, or Fast2SMS
// ======================================================================

const axios = require('axios');
const logger = require('../config/logger');

// ======================================================================
// Main SMS Sending Function
// ======================================================================
exports.sendSMS = async (phone, message) => {
  try {
    const provider = process.env.SMS_PROVIDER || 'msg91';
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if SMS is enabled
    if (!process.env.MSG91_AUTH_KEY && !process.env.TWILIO_ACCOUNT_SID) {
      logger.warn('⚠️ SMS service not configured, skipping SMS');
      return {
        success: false,
        message: 'SMS service not configured',
      };
    }

    let result;

    switch (provider.toLowerCase()) {
      case 'msg91':
        result = await exports.sendViaMSG91(cleanPhone, message);
        break;
      
      case 'twilio':
        result = await exports.sendViaTwilio(cleanPhone, message);
        break;
      
      case 'fast2sms':
        result = await exports.sendViaFast2SMS(cleanPhone, message);
        break;
      
      default:
        logger.warn(`Unknown SMS provider: ${provider}`);
        return {
          success: false,
          message: 'Invalid SMS provider',
        };
    }

    return result;
  } catch (error) {
    logger.error(`❌ SMS error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ======================================================================
// MSG91 SMS Provider
// ======================================================================
exports.sendViaMSG91 = async (phone, message) => {
  try {
    if (!process.env.MSG91_AUTH_KEY) {
      throw new Error('MSG91 not configured');
    }

    const url = 'https://api.msg91.com/api/v5/flow/';
    
    const response = await axios.post(
      url,
      {
        flow_id: process.env.MSG91_FLOW_ID || '',
        sender: process.env.MSG91_SENDER_ID || 'AUTOPRT',
        mobiles: `91${phone}`,
        VAR1: message, // Variable for template
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          'content-type': 'application/json',
        },
        timeout: 10000,
      }
    );

    logger.info(`✅ SMS sent via MSG91 to ${phone}`);
    
    return {
      success: true,
      provider: 'MSG91',
      data: response.data,
    };
  } catch (error) {
    logger.error(`❌ MSG91 error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Twilio SMS Provider
// ======================================================================
exports.sendViaTwilio = async (phone, message) => {
  try {
    const twilio = require('twilio');
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio not configured');
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`,
    });

    logger.info(`✅ SMS sent via Twilio to ${phone}`);
    
    return {
      success: true,
      provider: 'Twilio',
      data: result,
    };
  } catch (error) {
    logger.error(`❌ Twilio error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Fast2SMS Provider
// ======================================================================
exports.sendViaFast2SMS = async (phone, message) => {
  try {
    if (!process.env.FAST2SMS_API_KEY) {
      throw new Error('Fast2SMS not configured');
    }

    const url = 'https://www.fast2sms.com/dev/bulkV2';
    
    const response = await axios.get(url, {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        message: message,
        numbers: phone,
        route: 'q',
        sender_id: process.env.FAST2SMS_SENDER_ID || 'TXTIND',
      },
      timeout: 10000,
    });

    logger.info(`✅ SMS sent via Fast2SMS to ${phone}`);
    
    return {
      success: true,
      provider: 'Fast2SMS',
      data: response.data,
    };
  } catch (error) {
    logger.error(`❌ Fast2SMS error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send OTP via SMS
// ======================================================================
exports.sendOTP = async (phone, otp) => {
  try {
    const message = `Your OTP for AutoParts Pro is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
    
    return await exports.sendSMS(phone, message);
  } catch (error) {
    logger.error(`❌ Send OTP error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send Payment Reminder via SMS
// ======================================================================
exports.sendPaymentReminder = async (phone, billNo, amount) => {
  try {
    const message = `Payment reminder: Your payment of Rs.${amount} is pending for Bill ${billNo}. Please pay soon. ${process.env.COMPANY_NAME || 'AutoParts Pro'}`;
    
    return await exports.sendSMS(phone, message);
  } catch (error) {
    logger.error(`❌ Send payment reminder error: ${error.message}`);
    throw error;
  }
};

// ======================================================================
// Send Bulk SMS
// ======================================================================
exports.sendBulkSMS = async (recipients) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const recipient of recipients) {
      try {
        await exports.sendSMS(recipient.phone, recipient.message);
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

    logger.info(`📊 Bulk SMS: ${results.success} sent, ${results.failed} failed`);
    
    return results;
  } catch (error) {
    logger.error(`❌ Bulk SMS error: ${error.message}`);
    throw error;
  }
};

module.exports = exports;