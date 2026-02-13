const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function parsePagination(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page || '') || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || '') || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginateResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
