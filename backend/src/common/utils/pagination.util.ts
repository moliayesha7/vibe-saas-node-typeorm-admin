import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const getPagination = (query: Request['query']): PaginationOptions => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const buildSortOptions = <T extends Record<string, string>>(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowedFields: string[],
  defaultField: string
): { field: string; order: 'ASC' | 'DESC' } => {
  const field = allowedFields.includes(sortBy ?? '')
    ? (sortBy as string)
    : defaultField;
  const order: 'ASC' | 'DESC' =
    sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { field, order };
};
