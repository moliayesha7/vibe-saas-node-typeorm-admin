/**
 * Build paginated query parameters
 * @param {Object} query - Express request query
 * @returns {Object} - { limit, offset, page }
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build pagination metadata
 * @param {number} total - Total record count
 * @param {number} page - Current page
 * @param {number} limit - Records per page
 * @returns {Object} - Pagination metadata
 */
const getPaginationMeta = (total, page, limit) => {
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

/**
 * Build ORDER BY clause safely
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - asc or desc
 * @param {string[]} allowedFields - Whitelisted sort fields
 * @returns {string} - SQL ORDER BY clause
 */
const buildOrderBy = (sortBy, sortOrder, allowedFields) => {
  const field = allowedFields.includes(sortBy) ? sortBy : allowedFields[0];
  const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${field} ${order}`;
};

module.exports = { getPagination, getPaginationMeta, buildOrderBy };
