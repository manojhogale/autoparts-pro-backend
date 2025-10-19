const twilio = require('twilio');
const axios = require('axios');
const logger = require('../config/logger');

// Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Send SMS
exports.sendSMS = async (phone, message) => {
  try {
    const provider = process.env.SMS_PROVIDER || 'twilio';

    if (provider === 'twilio' && twilioClient) {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phone}`
      });

      logger.info(`SMS sent via Twilio to: ${phone}`);
    } else if (provider === 'msg91') {
      await exports.sendViaMSG91(phone, message);
    } else if (provider === 'fast2sms') {
      await exports.sendViaFast2SMS(phone, message);
    } else {
      logger.warn('No SMS provider configured');
    }

  } catch (error) {
    logger.error(`Send SMS error: ${error.message}`);
    throw error;
  }
};

// Send via MSG91
exports.sendViaMSG91 = async (phone, message) => {
  try {
    const url = 'https://api.msg91.com/api/v5/flow/';

    const response = await axios.post(url, {
      flow_id: 'YOUR_FLOW_ID',
      sender: process.env.MSG91_SENDER_ID,
      mobiles: `91${phone}`,
      message: message
    }, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'content-type': 'application/json'
      }
    });

    logger.info(`SMS sent via MSG91 to: ${phone}`);
    return response.data;

  } catch (error) {
    logger.error(`MSG91 SMS error: ${error.message}`);
    throw error;
  }
};

// Send via Fast2SMS
exports.sendViaFast2SMS = async (phone, message) => {
  try {
    const url = 'https://www.fast2sms.com/dev/bulkV2';

    const response = await axios.get(url, {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        message: message,
        numbers: phone,
        route: 'q'
      }
    });

    logger.info(`SMS sent via Fast2SMS to: ${phone}`);
    return response.data;

  } catch (error) {
    logger.error(`Fast2SMS error: ${error.message}`);
    throw error;
  }
};

// Send OTP
exports.sendOTP = async (phone, otp) => {
  const message = `Your OTP for AutoParts Pro is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
  return await exports.sendSMS(phone, message);
};