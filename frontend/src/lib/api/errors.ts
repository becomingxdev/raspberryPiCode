import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, errorBody?: ApiErrorBody['error'] | null, fallbackMessage?: string) {
    const code = errorBody?.code || (status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR');
    const message = errorBody?.message || fallbackMessage || `Request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = errorBody?.details;
  }
}
