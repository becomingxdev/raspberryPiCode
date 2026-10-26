/**
 * Globally shared backend base URL.
 * Set once when the user connects; read everywhere.
 */
let _baseUrl = '';

export function setBackendUrl(url: string) {
  _baseUrl = url.replace(/\/$/, '');
  localStorage.setItem('agrebot_backend_url', _baseUrl);
}

export function getBackendUrl(): string {
  if (!_baseUrl) {
    _baseUrl = localStorage.getItem('agrebot_backend_url') || '';
  }
  return _baseUrl;
}

export function clearBackendUrl() {
  _baseUrl = '';
  localStorage.removeItem('agrebot_backend_url');
}

/** Build an absolute URL by prepending the stored backend URL. */
export function apiUrl(path: string): string {
  return `${getBackendUrl()}${path}`;
}
