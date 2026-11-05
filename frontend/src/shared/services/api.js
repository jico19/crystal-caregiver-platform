import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;
const REQUEST_TIMEOUT_MS = 15000;

const client = axios.create({
  baseURL: BASE_URL,
  allowAbsoluteUrls: false,
  timeout: REQUEST_TIMEOUT_MS,
  // Keep HTTP failures in the shared ApiError/refresh flow below.
  validateStatus: () => true,
  responseType: 'text',
});

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
  const text = res.data instanceof Blob ? await res.data.text() : res.data;
  return JSON.parse(text);
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
        const res = await client.post('/auth/token/refresh/', { refresh: refreshToken }, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.status < 200 || res.status >= 300) {
          throw new Error('Refresh token invalid');
        }
        const data = await parseResponseBody(res);
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
  const isUpload = body instanceof FormData;
  // false prevents Axios defaults from overriding the browser's multipart boundary.
  const headers = { 'Content-Type': isUpload ? false : 'application/json', ...stateHeader() };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await client.request({
      url: path,
      method,
      headers,
      data: body ?? undefined,
      signal,
      responseType: responseType === 'blob' ? 'blob' : 'text',
    });

    if (res.status < 200 || res.status >= 300) {
      if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return request(method, path, body, newToken, signal, true, responseType);
        }
      }
      handleStatus(res.status);
      const payload = await parseResponseBody(res).catch(() => null);
      const details = getErrorDetails(payload, res.statusText || (isUpload ? 'Upload failed.' : 'Request failed.'));
      throw new ApiError(details.message, { status: res.status, ...details });
    }

    return responseType === 'blob' ? res.data : await parseResponseBody(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (axios.isCancel(err) && signal?.aborted) {
      throw new DOMException('The request was aborted.', 'AbortError');
    }
    if (axios.isCancel(err) || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      throw new ApiError('Request timed out or was cancelled.', { code: 'REQUEST_ABORTED' });
    }
    throw new ApiError('Network request failed.', { code: 'NETWORK_ERROR' });
  }
}

export const api = {
  get: (path, token, signal) => request('GET', path, null, token, signal),
  getBlob: (path, token, signal) => request('GET', path, null, token, signal, false, 'blob'),
  post: (path, body, token, signal) => request('POST', path, body, token, signal),
  put: (path, body, token, signal) => request('PUT', path, body, token, signal),
  patch: (path, body, token, signal) => request('PATCH', path, body, token, signal),
  delete: (path, token, signal) => request('DELETE', path, null, token, signal),
  upload: (path, formData, token, signal) => request('POST', path, formData, token, signal),
};

