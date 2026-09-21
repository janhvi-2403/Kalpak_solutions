// ==============================================================================
// Standard API Request & Response Contracts (RFC 7807 compatible)
// ==============================================================================

export interface StandardApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: ApiErrorDetail[];
  timestamp: string;
  path: string;
  correlationId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
