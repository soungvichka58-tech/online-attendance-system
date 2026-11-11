// Talks to the platform API gateway. Sign-in uses auth-service's cookies, so every request
// includes credentials and writes send the CSRF header that matches the csrf_token cookie.
// In development the base is empty and Vite proxies /api and /ws to the local platform.
export const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '');

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const readCookie = (name) => {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
};

async function send(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (UNSAFE.has(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Unable to reach the server. Check your internet connection and try again.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error || {};
    throw new ApiError(
      response.status,
      error.code || 'error',
      error.message || data?.detail || `Request failed (${response.status}).`,
      error.details,
    );
  }
  return data;
}

let refreshing = null;

// Access tokens are short-lived; the refresh cookie issues a new one. Concurrent requests
// share one refresh so the rotated refresh token is not used twice.
export function refreshSession() {
  if (!refreshing) {
    refreshing = send('/api/v1/auth/refresh', { method: 'POST' }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api(path, options = {}) {
  try {
    return await send(path, options);
  } catch (err) {
    const retry = err.status === 401 && !options.noRefresh && !path.startsWith('/api/v1/auth/');
    if (!retry) throw err;
    await refreshSession();
    return send(path, options);
  }
}
