import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { emptyPublicSite, loadPublishedSite } from '../src/features/public/lib/publishedSite.js';

test('frontend hosting serves all state publications and PDFs while the API is unavailable', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'caregiver-public-hosting-'));
  let server;
  let apiRequests = 0;
  const assetKey = `${'a'.repeat(64)}.pdf`;
  const pdf = '%PDF-1.4\nPublic blank form';
  try {
    await mkdir(path.join(directory, 'published-site', 'assets'), { recursive: true });
    await writeFile(path.join(directory, 'published-site', 'assets', assetKey), pdf);
    for (const slug of ['florida', 'indiana', 'georgia']) {
      const site = emptyPublicSite(slug);
      site.overview.title = `Published ${site.state.name} office`;
      site.forms = [{ id: 'public-form', title: 'Agency form', description: '', category: 'general', file_url: `/published-site/assets/${assetKey}` }];
      await writeFile(path.join(directory, 'published-site', `${slug}.json`), JSON.stringify(site));
    }
    server = await createServer({
      publicDir: directory,
      server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
      logLevel: 'silent',
      plugins: [{ name: 'unavailable-api', configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (!request.url.startsWith('/api/')) return next();
          apiRequests += 1; response.statusCode = 503; response.end('Database unavailable');
        });
      } }],
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    assert.equal((await fetch(`${origin}/api/health/`)).status, 503);
    apiRequests = 0;
    for (const slug of ['florida', 'indiana', 'georgia']) {
      const site = await loadPublishedSite(slug, { fetcher: (url, options) => fetch(`${origin}${url}`, options) });
      assert.equal(site.state.slug, slug);
      assert.match(site.overview.title, /^Published /);
      const download = await fetch(`${origin}${site.forms[0].file_url}`);
      assert.equal(download.status, 200);
      assert.equal(await download.text(), pdf);
      const page = await fetch(`${origin}/${slug}`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /<div id="root"><\/div>/);
    }
    assert.equal(apiRequests, 0, 'Public browsing must not issue API requests');
  } finally {
    if (server) await server.close();
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.match(path.basename(directory), /^caregiver-public-hosting-/);
    await rm(directory, { recursive: true, force: true });
  }
});
