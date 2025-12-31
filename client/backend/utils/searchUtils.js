/**
 * Build search query for text fields
 * @param {string} searchTerm - Search term
 * @param {string[]} fields - Fields to search in
 * @returns {object} MongoDB query object
 */
const buildTextSearchQuery = (searchTerm, fields) => {
  if (!searchTerm || !fields || fields.length === 0) {
    return {}
  }

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: searchTerm, $options: "i" },
    })),
  }
}

/**
 * Build range filter for numeric fields
 * @param {string} range - Range string (e.g., "0-50k", "1m+")
 * @param {string} field - Field name
 * @returns {object} MongoDB query object
 */
const buildRangeFilter = (range, field) => {
  if (!range) return {}

  const rangeMap = {
    "0-50k": { $gte: 0, $lte: 50000 },
    "50k-250k": { $gte: 50000, $lte: 250000 },
    "250k-1m": { $gte: 250000, $lte: 1000000 },
    "1m+": { $gte: 1000000 },
    "1-5": { $gte: 1, $lte: 5 },
    "6-20": { $gte: 6, $lte: 20 },
    "21-50": { $gte: 21, $lte: 50 },
    "50+": { $gte: 50 },
  }

  return rangeMap[range] ? { [field]: rangeMap[range] } : {}
}

/**
 * Build pagination info
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination info
 */
const buildPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit)

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    itemsPerPage: limit,
  }
}

/**
 * Sanitize search input
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeSearchInput = (input) => {
  if (!input || typeof input !== "string") return ""

  // Remove special regex characters and limit length
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .trim()
    .substring(0, 100)
}

module.exports = {
  buildTextSearchQuery,
  buildRangeFilter,
  buildPaginationInfo,
  sanitizeSearchInput,
}
