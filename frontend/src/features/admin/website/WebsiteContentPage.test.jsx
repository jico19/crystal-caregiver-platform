// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import WebsiteContentPage from './WebsiteContentPage';
let client;
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
test('public PDF upload accepts an actual PDF and keeps publishing a separate action', async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn(async url => url.endsWith('/assets/')
    ? json({ asset_key: 'synthetic-asset', filename: 'blank-form.PDF' })
    : json({ revision: 1, saved_at: '2026-01-01', publication: { published_at: null, has_changes: false }, draft: {
      overview: { title: 'Synthetic website', description: '' }, contact: {}, services: [], licensing: [], careers: [],
      forms: [{ id: 'form', title: 'Blank form', description: '', category: 'general', asset_key: '', filename: '' }],
    } }));
  vi.stubGlobal('fetch', fetcher); vi.stubGlobal('localStorage', { getItem: () => null });
  render(<QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={{ user: { id: 1, role: 'super_admin' }, token: 'fixture' }}><WebsiteContentPage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>);
  const input = await screen.findByLabelText('Public PDF');
  const file = new File(['%PDF-1.4'], 'blank-form.PDF', { type: 'application/pdf' });
  await userEvent.upload(input, file);
  expect(await screen.findByText('blank-form.PDF')).toBeTruthy();
  const upload = fetcher.mock.calls.find(([url]) => url.endsWith('/assets/'));
  expect(upload[1].body.get('file').name).toBe('blank-form.PDF');
  expect(screen.getByRole('button', { name: 'Publish saved draft' }).disabled).toBe(true);
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('/publish/'))).toBe(false);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save draft' }).disabled).toBe(false));
});
