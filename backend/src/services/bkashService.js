const axios = require('axios');
const logger = require('../utils/logger');

const BKASH_BASE_URL = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';

let bkashToken = null;
let tokenExpiry = null;

// Get Bkash grant token
const grantToken = async () => {
  if (bkashToken && tokenExpiry && Date.now() < tokenExpiry) {
    return bkashToken;
  }
  try {
    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
      {
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      },
      {
        headers: {
          username: process.env.BKASH_USERNAME,
          password: process.env.BKASH_PASSWORD,
          'Content-Type': 'application/json',
        },
      }
    );
    bkashToken = response.data.id_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return bkashToken;
  } catch (error) {
    logger.error('Bkash grant token failed:', error.response?.data || error.message);
    throw new Error('Payment gateway authentication failed');
  }
};

// Create payment
const createPayment = async ({ amount, orderId, intent = 'sale', currency = 'BDT' }) => {
  const token = await grantToken();
  try {
    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: orderId,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/bkash/callback`,
        amount: amount.toString(),
        currency,
        intent,
        merchantInvoiceNumber: orderId,
      },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Bkash create payment failed:', error.response?.data || error.message);
    throw new Error('Failed to create payment');
  }
};

// Execute payment after user confirmation
const executePayment = async (paymentID) => {
  const token = await grantToken();
  try {
    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Bkash execute payment failed:', error.response?.data || error.message);
    throw new Error('Failed to execute payment');
  }
};

// Query payment status
const queryPayment = async (paymentID) => {
  const token = await grantToken();
  try {
    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/payment/status`,
      { paymentID },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Bkash query payment failed:', error.response?.data || error.message);
    throw new Error('Failed to query payment status');
  }
};

// Refund payment
const refundPayment = async ({ paymentID, amount, trxID, sku, reason }) => {
  const token = await grantToken();
  try {
    const response = await axios.post(
      `${BKASH_BASE_URL}/tokenized/checkout/payment/refund`,
      { paymentID, amount: amount.toString(), trxID, sku, reason },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': process.env.BKASH_APP_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Bkash refund failed:', error.response?.data || error.message);
    throw new Error('Failed to process refund');
  }
};

module.exports = { createPayment, executePayment, queryPayment, refundPayment };
