import type { PageMeta } from "@/api/generated/model";

/**
 * The offset-style pagination shape the legacy UI code assumes
 * (`{ total, limit, offset, has_more }`), plus the raw page/pages for
 * page-based controls.
 */
export interface OffsetPagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  page: number;
  pages: number;
}

/**
 * Adapts the backend's page-based `{ page, size, total, pages }` meta to the
 * offset shape the existing tables/components expect. One adapter for every
 * paginated list response.
 */
export function toOffsetPagination(meta?: PageMeta | null): OffsetPagination {
  const page = meta?.page ?? 1;
  const limit = meta?.size ?? 0;
  const total = meta?.total ?? 0;
  const pages = meta?.pages ?? 0;
  return {
    total,
    limit,
    offset: (page - 1) * limit,
    has_more: page < pages,
    page,
    pages,
  };
}
