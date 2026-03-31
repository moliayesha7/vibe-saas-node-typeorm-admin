const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const bkashService = require('../services/bkashService');
const { sendPaymentConfirmEmail } = require('../services/emailService');
const { emitToUser, emitToTenant, emitToAdmins } = require('../services/socketService');

exports.getPayments = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { status, startDate, endDate } = req.query;
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;

  let conditions = [];
  let params = [];
  let idx = 1;

  if (tenantId) { conditions.push(`p.tenant_id = $${idx++}`); params.push(tenantId); }
  if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }
  if (startDate) { conditions.push(`p.created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`p.created_at <= $${idx++}`); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM payments p ${where}`, params);
  const paymentsResult = await query(
    `SELECT p.*, u.email as user_email, u.first_name, u.last_name
     FROM payments p LEFT JOIN users u ON u.id = p.user_id
     ${where} ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: paymentsResult.rows,
    pagination: getPaginationMeta(parseInt(countResult.rows[0].count), page, limit),
  });
};

exports.createPayment = async (req, res) => {
  const { amount, description } = req.body;
  const orderId = `ORDER-${uuidv4().slice(0, 8).toUpperCase()}`;

  const paymentData = await bkashService.createPayment({ amount, orderId, intent: 'sale' });

  if (paymentData.statusCode !== '0000') {
    throw new AppError(paymentData.statusMessage || 'Payment creation failed', 400);
  }

  // Store pending payment
  await query(
    `INSERT INTO payments (id, user_id, tenant_id, amount, currency, status, bkash_payment_id, order_id, description)
     VALUES ($1, $2, $3, $4, 'BDT', 'pending', $5, $6, $7)`,
    [uuidv4(), req.user.id, req.user.tenant_id, amount, paymentData.paymentID, orderId, description]
  );

  res.json({
    success: true,
    data: {
      bkashURL: paymentData.bkashURL,
      paymentID: paymentData.paymentID,
      orderId,
    },
  });
};

exports.bkashCallback = async (req, res) => {
  const { paymentID, status } = req.query;

  if (status === 'cancel' || status === 'failure') {
    await query("UPDATE payments SET status = $1 WHERE bkash_payment_id = $2", [status, paymentID]);
    return res.redirect(`${process.env.FRONTEND_URL}/payments?status=${status}`);
  }

  try {
    const executeData = await bkashService.executePayment(paymentID);

    if (executeData.statusCode === '0000') {
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE payments SET status = 'completed', transaction_id = $1, executed_at = NOW()
           WHERE bkash_payment_id = $2`,
          [executeData.trxID, paymentID]
        );

        const paymentResult = await client.query(
          'SELECT p.*, u.email, u.first_name, u.last_name FROM payments p JOIN users u ON u.id = p.user_id WHERE p.bkash_payment_id = $1',
          [paymentID]
        );
        const payment = paymentResult.rows[0];

        if (payment) {
          emitToUser(payment.user_id, 'payment:completed', { payment });
          emitToAdmins('payment:completed', { payment });
          sendPaymentConfirmEmail({ email: payment.email, first_name: payment.first_name }, payment)
            .catch(() => {});
        }
      });

      return res.redirect(`${process.env.FRONTEND_URL}/payments?status=success&trxID=${executeData.trxID}`);
    } else {
      await query("UPDATE payments SET status = 'failed' WHERE bkash_payment_id = $1", [paymentID]);
      return res.redirect(`${process.env.FRONTEND_URL}/payments?status=failed`);
    }
  } catch (error) {
    await query("UPDATE payments SET status = 'failed' WHERE bkash_payment_id = $1", [paymentID]);
    return res.redirect(`${process.env.FRONTEND_URL}/payments?status=failed`);
  }
};

exports.refundPayment = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await query('SELECT * FROM payments WHERE id = $1', [id]);
  const payment = result.rows[0];
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== 'completed') throw new AppError('Only completed payments can be refunded', 400);
  if (payment.refunded_at) throw new AppError('Payment already refunded', 400);

  const refundData = await bkashService.refundPayment({
    paymentID: payment.bkash_payment_id,
    amount: payment.amount,
    trxID: payment.transaction_id,
    sku: payment.order_id,
    reason: reason || 'Customer refund request',
  });

  if (refundData.statusCode === '0000') {
    await query(
      "UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE id = $1",
      [id]
    );
    emitToAdmins('payment:refunded', { paymentId: id });
  } else {
    throw new AppError('Refund failed: ' + refundData.statusMessage, 400);
  }

  res.json({ success: true, message: 'Payment refunded successfully' });
};

exports.getPaymentStats = async (req, res) => {
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;
  const tenantFilter = tenantId ? 'AND tenant_id = $1' : '';
  const params = tenantId ? [tenantId] : [];

  const stats = await query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
       COUNT(*) FILTER (WHERE status = 'refunded') as refunded_count,
       COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_this_month,
       COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as revenue_this_week
     FROM payments WHERE 1=1 ${tenantFilter}`,
    params
  );

  res.json({ success: true, data: stats.rows[0] });
};
