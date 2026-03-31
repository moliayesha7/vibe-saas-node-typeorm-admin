import axios, { AxiosError } from 'axios';
import logger from '@common/utils/logger';

const BKASH_BASE_URL =
  process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';

let bkashToken: string | null = null;
let tokenExpiry: number | null = null;

export interface BkashBaseResponse {
  statusCode?: string;
  statusMessage?: string;
  message?: string;
  [key: string]: unknown;
}

export interface GrantTokenResponse extends BkashBaseResponse {
  id_token: string;
  expires_in: number | string;
}

export interface CreatePaymentParams {
  amount: number | string;
  orderId: string;
  intent?: 'sale' | 'authorization';
  currency?: string;
}

export interface CreatePaymentResponse extends BkashBaseResponse {
  bkashURL?: string;
  paymentID?: string;
}

export interface ExecutePaymentResponse extends BkashBaseResponse {
  paymentID?: string;
  trxID?: string;
}

export interface QueryPaymentResponse extends BkashBaseResponse {
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
}

export interface RefundPaymentParams {
  paymentID: string;
  amount: number | string;
  trxID: string;
  sku: string;
  reason: string;
}

export interface RefundPaymentResponse extends BkashBaseResponse {
  refundTrxID?: string;
}

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getBkashConfig = () => ({
  appKey: getRequiredEnv('BKASH_APP_KEY'),
  appSecret: getRequiredEnv('BKASH_APP_SECRET'),
  username: getRequiredEnv('BKASH_USERNAME'),
  password: getRequiredEnv('BKASH_PASSWORD'),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
});

const getAxiosErrorMessage = (error: unknown): unknown => {
  if (axios.isAxiosError(error)) {
    return error.response?.data || error.message;
  }
  return error instanceof Error ? error.message : error;
};

// Tokenium petit aut cache reddit
export const grantToken = async (): Promise<string> => {
  if (bkashToken && tokenExpiry && Date.now() < tokenExpiry) {
    return bkashToken;
  }

  const config = getBkashConfig();

  try {
    const response = await axios.post<GrantTokenResponse>(
      `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
      {
        app_key: config.appKey,
        app_secret: config.appSecret,
      },
      {
        headers: {
          username: config.username,
          password: config.password,
          'Content-Type': 'application/json',
        },
      }
    );

    bkashToken = response.data.id_token;

    const expiresInSeconds =
      typeof response.data.expires_in === 'string'
        ? parseInt(response.data.expires_in, 10)
        : response.data.expires_in;

    tokenExpiry = Date.now() + Math.max(expiresInSeconds - 60, 30) * 1000;

    return bkashToken;
  } catch (error) {
    logger.error('Bkash grant token failed:', getAxiosErrorMessage(error));
    throw new Error('Payment gateway authentication failed');
  }
};

// Solutionem creat
export const createPayment = async ({
  amount,
  orderId,
  intent = 'sale',
  currency = 'BDT',
}: CreatePaymentParams): Promise<CreatePaymentResponse> => {
  const token = await grantToken();
  const config = getBkashConfig();

  try {
    const response = await axios.post<CreatePaymentResponse>(
      `${BKASH_BASE_URL}/tokenized/checkout/create`,
      {
        mode: '0011',
        payerReference: orderId,
        callbackURL: `${config.backendUrl}/api/payments/bkash/callback`,
        amount: amount.toString(),
        currency,
        intent,
        merchantInvoiceNumber: orderId,
      },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': config.appKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Bkash create payment failed:', getAxiosErrorMessage(error));
    throw new Error('Failed to create payment');
  }
};

// Solutionem confirmat
export const executePayment = async (
  paymentID: string
): Promise<ExecutePaymentResponse> => {
  const token = await grantToken();
  const config = getBkashConfig();

  try {
    const response = await axios.post<ExecutePaymentResponse>(
      `${BKASH_BASE_URL}/tokenized/checkout/execute`,
      { paymentID },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': config.appKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Bkash execute payment failed:', getAxiosErrorMessage(error));
    throw new Error('Failed to execute payment');
  }
};

// Statum solutionis quaerit
export const queryPayment = async (
  paymentID: string
): Promise<QueryPaymentResponse> => {
  const token = await grantToken();
  const config = getBkashConfig();

  try {
    const response = await axios.post<QueryPaymentResponse>(
      `${BKASH_BASE_URL}/tokenized/checkout/payment/status`,
      { paymentID },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': config.appKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Bkash query payment failed:', getAxiosErrorMessage(error));
    throw new Error('Failed to query payment status');
  }
};

// Pecuniam reddit
export const refundPayment = async ({
  paymentID,
  amount,
  trxID,
  sku,
  reason,
}: RefundPaymentParams): Promise<RefundPaymentResponse> => {
  const token = await grantToken();
  const config = getBkashConfig();

  try {
    const response = await axios.post<RefundPaymentResponse>(
      `${BKASH_BASE_URL}/tokenized/checkout/payment/refund`,
      {
        paymentID,
        amount: amount.toString(),
        trxID,
        sku,
        reason,
      },
      {
        headers: {
          Authorization: token,
          'X-APP-Key': config.appKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Bkash refund failed:', getAxiosErrorMessage(error));
    throw new Error('Failed to process refund');
  }
};