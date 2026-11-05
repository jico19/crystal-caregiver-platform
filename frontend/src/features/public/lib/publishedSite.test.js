import assert from 'node:assert/strict';
import { test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { emptyPublicSite, loadPublishedSite, validatePublicSite } from './publishedSite.js';

test('all three public states have independent bundled fallback data', () => {
  for (const [slug, code] of [['florida', 'FL'], ['indiana', 'IN'], ['georgia', 'GA']]) {
    const content = emptyPublicSite(slug);
    assert.equal(content.state.code, code);
    assert.equal(content.services.length, 0);
    assert.doesNotThrow(() => validatePublicSite(content, slug));
  }
});

test('public content loads a static file without credentials or an API request', async () => {
  const calls = [];
  const result = await loadPublishedSite('indiana', { fetcher: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(emptyPublicSite('indiana')), { status: 200 });
  } });
  assert.equal(result.state.code, 'IN');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/published-site/indiana.json');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.headers, undefined);
});

test('every bootstrap publication is valid and contains no fabricated records', async () => {
  for (const slug of ['florida', 'indiana', 'georgia']) {
    const file = new URL(`../../../../public/published-site/${slug}.json`, import.meta.url);
    const content = JSON.parse(await readFile(file, 'utf8'));
    assert.doesNotThrow(() => validatePublicSite(content, slug));
    assert.equal(content.published_at, null);
    assert.equal(content.licensing.length, 0);
  }
});

test('mismatched states, malformed records, and private file links are rejected', () => {
  assert.throws(() => validatePublicSite(emptyPublicSite('florida'), 'indiana'));
  const malformed = emptyPublicSite('georgia');
  malformed.services = [{ id: 'service', title: { bad: 'object' }, description: '' }];
  assert.throws(() => validatePublicSite(malformed, 'georgia'));
  const unsafe = emptyPublicSite('georgia');
  unsafe.forms = [{ id: 'form', title: 'Private', description: '', category: 'general', file_url: '/api/v1/documents/record/file/' }];
  assert.throws(() => validatePublicSite(unsafe, 'georgia'));
});

test('unknown states and unavailable static files fail without falling back to the database', async () => {
  let calls = 0;
  await assert.rejects(() => loadPublishedSite('unknown', { fetcher: () => { calls += 1; } }));
  assert.equal(calls, 0);
  await assert.rejects(() => loadPublishedSite('florida', { fetcher: async () => {
    calls += 1; return new Response('', { status: 503 });
  } }));
  assert.equal(calls, 1);
});
