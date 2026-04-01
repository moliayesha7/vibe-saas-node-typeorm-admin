import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '@common/utils/response.util';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  private getContext(req: Request): { role: string; tenantId: string | null } {
    return {
      role: req.user?.role ?? 'viewer',
      tenantId: req.user?.tenantId ?? null,
    };
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const stats = await analyticsService.getDashboardStats(role, tenantId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  async getSalesTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const period = (req.query.period as string) || '30d';
      const data = await analyticsService.getSalesTrend(period, role, tenantId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getUserActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const period = (req.query.period as string) || '30d';
      const data = await analyticsService.getUserActivity(period, role, tenantId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getPaymentDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const data = await analyticsService.getPaymentDistribution(role, tenantId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getTopMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const data = await analyticsService.getTopMetrics(role, tenantId);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async exportAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, tenantId } = this.getContext(req);
      const type = (req.query.type as string) || 'payments';
      const csv = await analyticsService.exportData(type, role, tenantId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
