import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { requirePermission } from '@common/middleware/rbac.middleware';

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Business intelligence and reporting endpoints
 */

const router = Router();
router.use(authenticate);
router.use(requirePermission('analytics:read'));

router.get('/dashboard',              analyticsController.getDashboardStats.bind(analyticsController));
router.get('/sales-trend',            analyticsController.getSalesTrend.bind(analyticsController));
router.get('/user-activity',          analyticsController.getUserActivity.bind(analyticsController));
router.get('/payment-distribution',   analyticsController.getPaymentDistribution.bind(analyticsController));
router.get('/top-metrics',            analyticsController.getTopMetrics.bind(analyticsController));
router.get('/export',                 requirePermission('analytics:export'), analyticsController.exportAnalytics.bind(analyticsController));

export default router;
