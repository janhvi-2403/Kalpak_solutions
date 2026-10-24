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
  _retryCount?: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, _retryCount = 0, ...restOptions } = options;

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

  // Direct API base resolution to prevent Next.js proxy rewrite timeout/500 errors on Render
  const isRenderWeb = typeof window !== 'undefined' && window.location.hostname.includes('onrender.com');
  const apiHost = isRenderWeb
    ? 'https://kalpak-api.onrender.com'
    : (process.env.NEXT_PUBLIC_API_URL || '');

  const normalizedPath = url.startsWith('/api/v1') ? url : `/api/v1${url}`;
  const fullUrl = apiHost ? `${apiHost}${normalizedPath}` : normalizedPath;

  // Generate correlation ID
  const correlationId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `web-${Date.now()}`;

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (!requestHeaders.has('Content-Type') && restOptions.body && !(restOptions.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  requestHeaders.set('x-correlation-id', correlationId);

  // Automatically attach tenant slug header if running on a tenant subdomain
  const subdomain = getTenantSubdomain();
  if (subdomain && !requestHeaders.has('x-tenant-slug')) {
    requestHeaders.set('x-tenant-slug', subdomain);
  }

  // Attach Bearer token from localStorage for resilience against cross-domain/Render cookie restrictions
  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('kalpak_session_token');
    if (sessionToken && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
    }
  }

  // Setup safety timeout to accommodate cloud cold starts (up to 75s)
  let timeoutId: NodeJS.Timeout | undefined;
  let signal = restOptions.signal;
  if (!signal) {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 75000);
    signal = controller.signal;
  }

  const RETRY_DELAYS = [2000, 3000, 4500, 6000, 8000];
  const MAX_COLD_START_RETRIES = 5;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include', // Ensure HttpOnly session cookies are transmitted
      signal,
    });
  } catch (fetchErr: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Auto-retry on network glitch, cold start abort, or connection dropped during boot
    if (
      _retryCount < MAX_COLD_START_RETRIES &&
      (fetchErr?.name === 'TypeError' || fetchErr?.name === 'AbortError' || fetchErr?.message?.includes('fetch failed'))
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('kalpak:server-warming', {
            detail: { retryCount: _retryCount + 1, maxRetries: MAX_COLD_START_RETRIES },
          })
        );
      }
      const delay = RETRY_DELAYS[_retryCount] || 5000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient<T>(endpoint, { ...options, _retryCount: _retryCount + 1 });
    }
    throw fetchErr;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  // Handle Render / Cloud cold-start (502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout) with auto-retry
  if ([502, 503, 504].includes(response.status) && _retryCount < MAX_COLD_START_RETRIES) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kalpak:server-warming', {
          detail: { retryCount: _retryCount + 1, maxRetries: MAX_COLD_START_RETRIES },
        })
      );
    }
    const delay = RETRY_DELAYS[_retryCount] || 5000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClient<T>(endpoint, { ...options, _retryCount: _retryCount + 1 });
  }

  if (typeof window !== 'undefined' && _retryCount > 0 && response.ok) {
    window.dispatchEvent(new CustomEvent('kalpak:server-ready'));
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    // If unauthorized, clear local token so state doesn't stay in an invalid loop
    if (response.status === 401 && typeof window !== 'undefined' && !url.includes('/auth/login')) {
      localStorage.removeItem('kalpak_session_token');
    }

    let errorData: ApiErrorResponse;
    if (isJson) {
      errorData = await response.json();
    } else {
      const rawText = await response.text();
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let userFriendlyMessage = 'An unexpected server error occurred. Please try again.';
      if ([502, 503, 504].includes(response.status)) {
        userFriendlyMessage = isLocalhost
          ? 'Backend API server is not running or unreachable on port 4000. Please start the backend service (pnpm --filter @kalpak/api run start:dev).'
          : 'The server is waking up from sleep on the Render free tier (cold start). Please wait a few seconds and try again.';
      } else if (rawText && !rawText.trim().startsWith('<') && !rawText.includes('<html') && rawText.length < 300) {
        userFriendlyMessage = rawText;
      }
      errorData = {
        success: false,
        statusCode: response.status,
        error: response.statusText || 'Gateway Error',
        message: userFriendlyMessage,
        timestamp: new Date().toISOString(),
        path: url,
        correlationId,
      };
    }

    // Safety: ensure no raw HTML ever leaks into the error message
    if (
      typeof errorData.message === 'string' &&
      (errorData.message.trim().startsWith('<') || errorData.message.includes('<html') || errorData.message.includes('<!DOCTYPE'))
    ) {
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      errorData.message =
        response.status >= 500
          ? isLocalhost
            ? 'Backend API server is not running or unreachable on port 4000. Please start the backend service (pnpm --filter @kalpak/api run start:dev).'
            : 'The server is waking up from sleep on the Render free tier (cold start). Please wait a few seconds and try again.'
          : 'An unexpected response was received from the server. Please try again.';
    }

    throw new ApiClientError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (isJson) {
    const result: StandardApiResponse<T> = await response.json();
    const data = result.data !== undefined ? result.data : (result as unknown as T);

    // Automatically persist session token if returned by authentication response
    if (typeof window !== 'undefined' && data && typeof data === 'object' && 'token' in (data as any)) {
      const returnedToken = (data as any).token;
      if (typeof returnedToken === 'string' && returnedToken) {
        localStorage.setItem('kalpak_session_token', returnedToken);
      }
    }

    // Clear local token on logout
    if (typeof window !== 'undefined' && url.includes('/auth/logout')) {
      localStorage.removeItem('kalpak_session_token');
    }

    return data;
  }

  return (await response.text()) as unknown as T;
}

apiClient.get = function <T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'GET' });
};

apiClient.post = function <T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined,
  });
};

apiClient.patch = function <T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined,
  });
};

apiClient.put = function <T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined,
  });
};

apiClient.delete = function <T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
};

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('kalpak_session_token', token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kalpak_session_token');
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('kalpak_session_token');
  }
  return null;
}

/**
 * Pre-warms the backend server on initial page visit
 * to wake up Render free-tier containers asynchronously.
 */
export function prewarmServer(): void {
  if (typeof window === 'undefined') return;
  fetch('/health', { method: 'GET', credentials: 'omit' }).catch(() => {});
}

