// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import DocumentsPage from './DocumentsPage';

let client;
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
test.each([false, true])('client PDF upload preserves signed transfer and refresh outcome (refresh fails: %s)', async failRefresh => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const type = { id: 4, name: 'Insurance Cards', requires_expiration: false };
  let uploaded = false;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn(async (url) => {
    if (url.includes('/documents/types')) return json([type]);
    if (url.endsWith('/documents/me')) return uploaded && failRefresh ? json({}, 503) : json({ documents: uploaded ? [{ id: 8, document_types: type, file_name: 'insurance.pdf', status: 'pending_review', uploaded_at: '2026-01-01' }] : [] });
    if (url.endsWith('/document-status')) return json({ missing: [], summary: { compliant: true } });
    if (url.endsWith('/upload-intent')) return json({ document_id: 8, upload_url: 'https://storage.test/client-upload' });
    if (url === 'https://storage.test/client-upload') { uploaded = true; return new Response('', { status: 200 }); }
    throw new Error(`Unexpected URL ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => 'IN' });
  render(<QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={{ user: { id: 1, role: 'client', state_id: 2 }, token: 'fixture' }}><DocumentsPage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>);
  const input = await screen.findByLabelText(/Select File/);
  const file = new File(['%PDF-1.4'], 'insurance.pdf', { type: 'application/pdf' });
  await userEvent.upload(input, file);
  expect(input.files[0]).toBe(file);
  // jsdom cannot model native FileList validity; the browser fixture covers native controls.
  fireEvent.submit(screen.getByRole('button', { name: 'Submit for Review' }).closest('form'));
  expect(await screen.findByText(/uploaded successfully/)).toBeTruthy();
  if (failRefresh) expect(await screen.findByText(/Upload succeeded, but the document list/)).toBeTruthy();
  else expect(await screen.findByText('insurance.pdf')).toBeTruthy();
  await waitFor(() => expect(input.files.length).toBe(0));
  const intent = fetcher.mock.calls.find(([url]) => url.endsWith('/upload-intent'));
  expect(JSON.parse(intent[1].body)).toMatchObject({ document_type_id: '4', filename: 'insurance.pdf' });
  expect(intent[1].headers['X-Agency-State']).toBe('IN');
  const transfer = fetcher.mock.calls.find(([url]) => url === 'https://storage.test/client-upload');
  expect(transfer[1]).toMatchObject({ method: 'PUT', body: file });
  expect(transfer[1].headers.Authorization).toBeUndefined();
});
