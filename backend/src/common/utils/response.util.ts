import { Response } from 'express';
import { PaginationMeta } from './pagination.util';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200,
  pagination?: PaginationMeta
): Response => {
  const body: ApiResponse<T> = { success: true, message };
  if (data !== undefined) body.data = data;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(
  res: Response,
  data?: T,
  message = 'Created successfully'
): Response => sendSuccess(res, data, message, 201);

export const sendPaginated = <T>(
  res: Response,
  data: T,
  pagination: PaginationMeta,
  message = 'Success'
): Response => sendSuccess(res, data, message, 200, pagination);
