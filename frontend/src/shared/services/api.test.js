import { test, vi, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { api, ApiError, setUnauthorizedHandler } from './api';

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.useRealTimers();
});

test('certificate downloads preserve PDF bytes and authentication', async () => {
  values.set('selected_state', 'indiana');
  vi.spyOn(globalThis, 'fetch').mockImplementation( async (url, options) => {
    assert.equal(url, 'http://localhost:8000/api/v1/training/courses/4/certificate');
    assert.equal(options.headers.Authorization, 'Bearer access');
    assert.equal(options.headers['X-Agency-State'], 'IN');
    return new Response('%PDF-1.4\ncertificate', { headers: { 'Content-Type': 'application/pdf' } });
  });
  const blob = await api.getBlob('/training/courses/4/certificate', 'access');
  assert.equal(blob.type, 'application/pdf');
  assert.equal(await blob.text(), '%PDF-1.4\ncertificate');
});

test('PDF request errors remain API errors instead of downloaded JSON', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation( async () => new Response(JSON.stringify({ detail: 'Course is incomplete.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(api.getBlob('/training/courses/4/certificate', 'access'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.detail, 'Course is incomplete.');
    return true;
  });
});

test('PDF requests retry with refreshed authentication and retain binary parsing', async () => {
  values.set('refresh', 'refresh-token');
  let calls = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation( async (url, options) => {
    calls += 1;
    if (calls === 1) return new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/auth/token/refresh/')) {
      return new Response(JSON.stringify({ access: 'renewed-access' }), { headers: { 'Content-Type': 'application/json' } });
    }
    assert.equal(options.headers.Authorization, 'Bearer renewed-access');
    return new Response('%PDF-renewed', { headers: { 'Content-Type': 'application/pdf' } });
  });
  assert.equal(await (await api.getBlob('/training/courses/4/certificate', 'expired-access')).text(), '%PDF-renewed');
  assert.equal(calls, 3);
});

test('serializer field errors remain visible to form callers', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation( async () => new Response(JSON.stringify({ email: ['An account with this email already exists. Sign in to continue.'] }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(api.post('/caregivers/apply-public', { email: 'existing@example.com' }), (error) => {
    assert.match(error.detail, /An account with this email already exists/);
    assert.deepEqual(error.fieldErrors.email, ['An account with this email already exists. Sign in to continue.']);
    return true;
  });
});

test('JSON methods preserve payloads, parsed return values and per-request headers', async () => {
  const calls = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    calls.push({ url, ...options });
    return new Response('{"saved":true}', { headers: { 'Content-Type': 'application/json' } });
  });
  values.set('selected_state', 'Florida');
  assert.deepEqual(await api.post('/example/', { active: false }, 'access'), { saved: true });
  values.set('selected_state', 'Georgia');
  await api.put('/example/1/', { count: 0 }, 'access');
  await api.patch('/example/1/', { name: '' }, 'access');
  values.set('selected_state', 'ALL');
  await api.get('/example/');
  await api.delete('/example/1/', 'access');

  assert.deepEqual(calls.map(call => call.method), ['POST', 'PUT', 'PATCH', 'GET', 'DELETE']);
  assert.deepEqual(calls.slice(0, 3).map(call => JSON.parse(call.body)), [{ active: false }, { count: 0 }, { name: '' }]);
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.equal(calls[0].headers.Authorization, 'Bearer access');
  assert.equal(calls[0].headers['X-Agency-State'], 'FL');
  assert.equal(calls[1].headers['X-Agency-State'], 'GA');
  assert.equal(calls[3].headers['X-Agency-State'], undefined);
  assert.equal(calls[3].headers.Authorization, undefined);
});

test('empty and non-JSON successful responses return null', async () => {
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response('OK', { headers: { 'Content-Type': 'text/plain' } }));
  assert.equal(await api.delete('/example/1/', 'access'), null);
  assert.equal(await api.get('/example/', 'access'), null);
});

test('uploads retry FormData without a JSON content type or losing authentication', async () => {
  values.set('refresh', 'refresh-token');
  values.set('selected_state', 'georgia');
  const form = new FormData();
  form.append('file', new Blob(['document bytes'], { type: 'application/pdf' }), 'document.pdf');
  let uploads = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (url.endsWith('/auth/token/refresh/')) {
      assert.deepEqual(JSON.parse(options.body), { refresh: 'refresh-token' });
      return new Response('{"access":"renewed-access"}', { headers: { 'Content-Type': 'application/json' } });
    }
    uploads += 1;
    assert.equal(options.body, form);
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.headers['X-Agency-State'], 'GA');
    assert.equal(options.headers.Authorization, uploads === 1 ? 'Bearer old' : 'Bearer renewed-access');
    assert.equal(await options.body.get('file').text(), 'document bytes');
    return new Response(uploads === 1 ? '{}' : '{"id":7}', {
      status: uploads === 1 ? 401 : 201,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  assert.deepEqual(await api.upload('/documents/', form, 'old'), { id: 7 });
  assert.equal(uploads, 2);
});

test('concurrent unauthorized requests share refresh, rotate tokens and notify the session', async () => {
  values.set('refresh', 'refresh-token');
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('CustomEvent', class {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  });
  let finishRefresh;
  const refreshResponse = new Promise(resolve => { finishRefresh = resolve; });
  let refreshes = 0;
  let requests = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (url.endsWith('/auth/token/refresh/')) {
      refreshes += 1;
      return refreshResponse;
    }
    requests += 1;
    return new Response('{}', {
      status: options.headers.Authorization === 'Bearer renewed' ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const first = api.get('/caregivers/', 'expired');
  const second = api.get('/clients/', 'expired');
  await vi.waitFor(() => assert.equal(refreshes, 1));
  finishRefresh(new Response('{"access":"renewed","refresh":"rotated"}', { headers: { 'Content-Type': 'application/json' } }));
  await Promise.all([first, second]);
  assert.equal(refreshes, 1);
  assert.equal(requests, 4);
  assert.equal(values.get('caregiver_access_token'), 'renewed');
  assert.equal(values.get('refresh'), 'rotated');
  assert.equal(dispatchEvent.mock.calls[0][0].type, 'auth:token-refreshed');
  assert.deepEqual(dispatchEvent.mock.calls[0][0].detail, { token: 'renewed' });
});

test('failed refresh clears credentials and reports unauthorized without retrying indefinitely', async () => {
  values.set('caregiver_access_token', 'expired');
  values.set('refresh', 'bad-refresh');
  const unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', {
    status: 401, headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(api.get('/clients/', 'expired'), error => error instanceof ApiError && error.status === 401);
  assert.equal(fetcher.mock.calls.length, 2);
  assert.equal(values.has('caregiver_access_token'), false);
  assert.equal(values.has('refresh'), false);
  assert.ok(unauthorized.mock.calls.length > 0);
});

test('a retried 401 and auth endpoints do not trigger another refresh', async () => {
  values.set('refresh', 'refresh-token');
  const unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => new Response(
    url.endsWith('/auth/token/refresh/') ? '{"access":"renewed"}' : '{}',
    { status: url.endsWith('/auth/token/refresh/') ? 200 : 401, headers: { 'Content-Type': 'application/json' } },
  ));
  await assert.rejects(api.get('/clients/', 'expired'), error => error.status === 401);
  assert.equal(fetcher.mock.calls.length, 3);
  await assert.rejects(api.get('/auth/me/', 'expired'), error => error.status === 401);
  assert.equal(fetcher.mock.calls.length, 4);
  assert.equal(unauthorized.mock.calls.length, 2);
});

test('network failures keep the shared error contract', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
  await assert.rejects(api.get('/clients/', 'access'), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    assert.equal(error.code, 'NETWORK_ERROR');
    return true;
  });
});

test('timeouts retain REQUEST_ABORTED and caller cancellation retains AbortError', async () => {
  vi.useFakeTimers();
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }));
  const timedOut = assert.rejects(api.get('/clients/', 'access'), error => error instanceof ApiError && error.code === 'REQUEST_ABORTED');
  await vi.advanceTimersByTimeAsync(15000);
  await timedOut;

  const controller = new AbortController();
  const cancelled = assert.rejects(api.get('/clients/', 'access', controller.signal), error => error.name === 'AbortError');
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await cancelled;
  const callsBefore = fetcher.mock.calls.length;
  await assert.rejects(api.get('/clients/', 'access', controller.signal), error => error.name === 'AbortError');
  assert.equal(fetcher.mock.calls.length, callsBefore);
});
