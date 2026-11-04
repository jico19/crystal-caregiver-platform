import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

// Replace only Vite's environment expression so the real wrapper runs in Node.
const source = (await readFile(new URL('./api.js', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_API_URL', 'undefined');
const { api, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};

test('certificate downloads preserve PDF bytes and authentication', async (t) => {
  values.set('selected_state', 'indiana');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://localhost:8000/api/v1/training/courses/4/certificate');
    assert.equal(options.headers.Authorization, 'Bearer access');
    assert.equal(options.headers['X-Agency-State'], 'IN');
    return new Response('%PDF-1.4\ncertificate', { headers: { 'Content-Type': 'application/pdf' } });
  });
  const blob = await api.getBlob('/training/courses/4/certificate', 'access');
  assert.equal(blob.type, 'application/pdf');
  assert.equal(await blob.text(), '%PDF-1.4\ncertificate');
});

test('PDF request errors remain API errors instead of downloaded JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ detail: 'Course is incomplete.' }), {
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

test('PDF requests retry with refreshed authentication and retain binary parsing', async (t) => {
  values.set('refresh', 'refresh-token');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
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

test('serializer field errors remain visible to form callers', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ email: ['An account with this email already exists. Sign in to continue.'] }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(api.post('/caregivers/apply-public', { email: 'existing@example.com' }), (error) => {
    assert.match(error.detail, /An account with this email already exists/);
    assert.deepEqual(error.fieldErrors.email, ['An account with this email already exists. Sign in to continue.']);
    return true;
  });
});
