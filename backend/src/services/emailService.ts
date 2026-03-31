import nodemailer from 'nodemailer';
import logger from '@common/utils/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface WelcomeEmailUser {
  email: string;
  firstName?: string | null;
  first_name?: string | null;
}

export interface PasswordResetUser {
  email: string;
  firstName?: string | null;
  first_name?: string | null;
}

export interface PaymentEmailUser {
  email: string;
  firstName?: string | null;
  first_name?: string | null;
}

export interface PaymentEmailData {
  amount: number | string;
  transactionId?: string | null;
  transaction_id?: string | null;
}

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const getDisplayName = (user: {
  firstName?: string | null;
  first_name?: string | null;
}): string => {
  return user.firstName || user.first_name || 'there';
};

// Epistulam simplicem mittit
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: EmailPayload): Promise<{ messageId: string }> => {
  if (process.env.NODE_ENV === 'test') {
    return { messageId: 'test-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SaaS Admin" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent: ${info.messageId}`);
    return { messageId: info.messageId };
  } catch (error) {
    logger.error(
      'Email send failed:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};

// Epistulam salutis mittit
export const sendWelcomeEmail = async (
  user: WelcomeEmailUser
): Promise<{ messageId: string }> => {
  const displayName = getDisplayName(user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return sendEmail({
    to: user.email,
    subject: 'Welcome to SaaS Admin!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome, ${displayName}!</h1>
        <p>Your account has been created successfully.</p>
        <p>You can now log in to your dashboard and start exploring all the features.</p>
        <a href="${frontendUrl}/dashboard"
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Go to Dashboard
        </a>
      </div>
    `,
  });
};

// Epistulam restitutionis clavii mittit
export const sendPasswordResetEmail = async (
  user: PasswordResetUser,
  resetToken: string
): Promise<{ messageId: string }> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Reset Your Password</h1>
        <p>You requested a password reset. Click the link below (expires in 1 hour):</p>
        <a href="${frontendUrl}/reset-password?token=${resetToken}"
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Reset Password
        </a>
        <p style="color: #888; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

// Epistulam confirmationis solutionis mittit
export const sendPaymentConfirmEmail = async (
  user: PaymentEmailUser,
  payment: PaymentEmailData
): Promise<{ messageId: string }> => {
  const transactionId = payment.transactionId || payment.transaction_id || '-';

  return sendEmail({
    to: user.email,
    subject: `Payment Confirmed - ${payment.amount} BDT`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e;">Payment Successful!</h1>
        <p>Your payment of <strong>${payment.amount} BDT</strong> has been confirmed.</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Transaction ID</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Amount</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">${payment.amount} BDT</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e5e7eb;">Date</td>
            <td style="padding:8px; border:1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `,
  });
};