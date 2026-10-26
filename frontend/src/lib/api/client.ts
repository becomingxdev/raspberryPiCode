import { ApiError } from './errors';
import type { ApiErrorBody } from './types';
import { apiUrl } from './baseUrl';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetch wrapper that:
 *  - Prepends the dynamic backend URL (set via setBackendUrl)
 *  - Handles timeouts and network errors
 *  - Parses API error envelopes
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : apiUrl(path);
  const { timeoutMs = 8000, signal, ...rest } = options;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  if (signal) {
    if (signal.aborted) { if (timer) clearTimeout(timer); throw signal.reason || new Error('Aborted'); }
    signal.addEventListener('abort', () => controller.abort(signal.reason));
  }

  try {
    const config: RequestInit = {
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      ...rest,
      signal: controller.signal,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      if (controller.signal.aborted) throw new ApiError(0, { code: 'TIMEOUT', message: `Timed out after ${timeoutMs}ms` });
      throw new ApiError(0, { code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : 'Network error' });
    }

    const ct = response.headers.get('content-type') || '';
    let body: unknown = null;
    if (ct.includes('application/json')) {
      try { body = await response.json(); } catch { throw new ApiError(response.status, { code: 'INVALID_JSON', message: 'Invalid JSON' }); }
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      if (body && typeof body === 'object' && 'error' in body) {
        throw new ApiError(response.status, (body as ApiErrorBody).error);
      }
      throw new ApiError(response.status, { code: `HTTP_${response.status}`, message: typeof body === 'string' ? body : response.statusText });
    }
    return body as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
