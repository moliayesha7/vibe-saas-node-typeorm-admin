const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { cacheMiddleware } = require('../middleware/cache');

router.use(authenticate);

router.get('/dashboard', requirePermission('analytics:read'), cacheMiddleware(60, 'analytics'), analyticsController.getDashboardStats);
router.get('/sales-trend', requirePermission('analytics:read'), cacheMiddleware(120, 'analytics'), analyticsController.getSalesTrend);
router.get('/user-activity', requirePermission('analytics:read'), analyticsController.getUserActivity);
router.get('/payment-distribution', requirePermission('analytics:read'), analyticsController.getPaymentDistribution);
router.get('/top-metrics', requirePermission('analytics:read'), analyticsController.getTopMetrics);
router.get('/export', requirePermission('analytics:export'), analyticsController.exportAnalytics);

module.exports = router;
