import { ApiErrorResponse, StandardApiResponse } from '@kalpak/types';
import { getTenantSubdomain } from './subdomain';

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorResponse: ApiErrorResponse
  ) {
    super(errorResponse.message || 'API request failed');
    this.name = 'ApiClientError';
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Prepend API prefix if not present
  const fullUrl = url.startsWith('/api/v1') ? url : `/api/v1${url}`;

  // Generate correlation ID
  const correlationId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `web-${Date.now()}`;

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (!requestHeaders.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  requestHeaders.set('x-correlation-id', correlationId);

  // Automatically attach tenant slug header if running on a tenant subdomain
  const subdomain = getTenantSubdomain();
  if (subdomain && !requestHeaders.has('x-tenant-slug')) {
    requestHeaders.set('x-tenant-slug', subdomain);
  }


  // Setup safety timeout to avoid hanging network calls
  let timeoutId: NodeJS.Timeout | undefined;
  let signal = restOptions.signal;
  if (!signal) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 6000);
    signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include', // Ensure HttpOnly session cookies are transmitted
      signal,
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    if (isJson) {
      errorData = await response.json();
    } else {
      errorData = {
        success: false,
        statusCode: response.status,
        error: response.statusText,
        message: await response.text(),
        timestamp: new Date().toISOString(),
        path: url,
        correlationId,
      };
    }
    throw new ApiClientError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    const result: StandardApiResponse<T> = await response.json();
    // Return extracted data payload if formatted as StandardApiResponse
    return result.data !== undefined ? result.data : (result as unknown as T);
  }

  return (await response.text()) as unknown as T;
}
