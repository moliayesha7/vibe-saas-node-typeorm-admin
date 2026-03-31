const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { paymentRateLimiter } = require('../middleware/rateLimiter');
const { validate, paymentSchema } = require('../utils/validators');

// Bkash callback - no auth needed (called by Bkash servers)
router.get('/bkash/callback', paymentController.bkashCallback);

// Auth required for all other routes
router.use(authenticate);

router.get('/', requirePermission('payments:read'), paymentController.getPayments);
router.get('/stats', requirePermission('payments:read'), paymentController.getPaymentStats);
router.post('/', paymentRateLimiter, validate(paymentSchema), paymentController.createPayment);
router.post('/:id/refund', requirePermission('payments:refund'), paymentController.refundPayment);

module.exports = router;
