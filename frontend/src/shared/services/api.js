const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, detail = message, code = null, fieldErrors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function getErrorDetails(payload, fallback) {
  if (typeof payload === 'string') {
    return { detail: payload, message: payload };
  }

  if (Array.isArray(payload)) {
    return {
      detail: 'Request validation failed.',
      message: 'Request validation failed.',
      fieldErrors: payload,
    };
  }

  const fieldErrors = Array.isArray(payload?.detail)
    ? payload.detail
    : payload?.field_errors || (payload && !payload.detail && !payload.message ? payload : null);
  const fieldMessage = fieldErrors && !Array.isArray(fieldErrors)
    ? Object.entries(fieldErrors).flatMap(([field, errors]) =>
        (Array.isArray(errors) ? errors : [errors])
          .filter((error) => typeof error === 'string')
          .map((error) => `${field.replaceAll('_', ' ')}: ${error}`)
      ).join(' ')
    : '';
  const detail = payload?.detail || payload?.message || fieldMessage || fallback;
  return {
    detail: typeof detail === 'string' ? detail : fallback,
    message: typeof detail === 'string' ? detail : fallback,
    code: payload?.code || null,
    fieldErrors,
  };
}

async function parseResponseBody(res) {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return res.json();
}

let unauthorizedHandler = null;
let refreshPromise = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function handleStatus(status) {
  if (status === 401 && unauthorizedHandler) {
    unauthorizedHandler();
  }
}

async function refreshAccessToken() {
  const refreshToken = (localStorage.getItem('refresh') || '').trim();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (!res.ok) {
          throw new Error('Refresh token invalid');
        }
        const data = await res.json();
        const newAccess = data.access || data.access_token;
        if (newAccess) {
          localStorage.setItem('caregiver_access_token', newAccess);
          if (data.refresh) {
            localStorage.setItem('refresh', data.refresh);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('auth:token-refreshed', { detail: { token: newAccess } })
            );
          }
          return newAccess;
        }
        return null;
      } catch {
        localStorage.removeItem('caregiver_access_token');
        localStorage.removeItem('refresh');
        if (unauthorizedHandler) unauthorizedHandler();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function resolveAgencyStateHeader() {
  const raw = (localStorage.getItem('selected_state') || '').trim();
  if (!raw) return null;

  const key = raw.toLowerCase();
  const byKey = {
    fl: 'FL',
    florida: 'FL',
    in: 'IN',
    indiana: 'IN',
    ga: 'GA',
    georgia: 'GA',
    all: null,
    'all states': null,
  };
  if (key in byKey) return byKey[key];
  if (raw.length === 2) return raw.toUpperCase();
  return null;
}

function stateHeader() {
  const value = resolveAgencyStateHeader();
  return value ? { 'X-Agency-State': value } : {};
}

async function request(method, path, body, token, signal, isRetry = false, responseType = 'json') {
  const headers = { 'Content-Type': 'application/json', ...stateHeader() };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest, { once: true });

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return request(method, path, body, newToken, signal, true, responseType);
        }
      }
      handleStatus(res.status);
      const payload = await parseResponseBody(res).catch(() => null);
      const details = getErrorDetails(payload, res.statusText || 'Request failed.');
      throw new ApiError(details.message, { status: res.status, ...details });
    }

    return responseType === 'blob' ? res.blob() : parseResponseBody(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new ApiError('Request timed out or was cancelled.', { code: 'REQUEST_ABORTED' });
    }
    throw new ApiError('Network request failed.', { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortRequest);
  }
}

async function upload(path, formData, token, signal, isRetry = false) {
  const headers = { ...stateHeader() };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest, { once: true });

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return upload(path, formData, newToken, signal, true);
        }
      }
      handleStatus(res.status);
      const payload = await parseResponseBody(res).catch(() => null);
      const details = getErrorDetails(payload, res.statusText || 'Upload failed.');
      throw new ApiError(details.message, { status: res.status, ...details });
    }

    return parseResponseBody(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new ApiError('Request timed out or was cancelled.', { code: 'REQUEST_ABORTED' });
    }
    throw new ApiError('Network request failed.', { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortRequest);
  }
}

export const api = {
  get: (path, token, signal) => request('GET', path, null, token, signal),
  getBlob: (path, token, signal) => request('GET', path, null, token, signal, false, 'blob'),
  post: (path, body, token, signal) => request('POST', path, body, token, signal),
  put: (path, body, token, signal) => request('PUT', path, body, token, signal),
  patch: (path, body, token, signal) => request('PATCH', path, body, token, signal),
  delete: (path, token, signal) => request('DELETE', path, null, token, signal),
  upload: (path, formData, token, signal) => upload(path, formData, token, signal),
};

