// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import FormsPage from './FormsPage';
vi.mock('@/shared/components/common/SignaturePad', () => ({ default: ({ onChange }) => <button type="button" onClick={() => onChange('data:image/png;base64,fixture')}>Draw test signature</button> }));
let client;
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
test('signature submission binds the reviewed form version and rejects stale terms', async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let terms = 'original-hash';
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn(async (url, options) => {
    if (options.method === 'POST') { terms = 'new-hash'; return json({ detail: 'Terms changed; review again.' }, 409); }
    return json({ agreements: [{ id: 9, agreement_key: 'synthetic_terms', title: 'Synthetic agreement', body: 'Synthetic terms for a frontend test', terms_hash: terms }] });
  });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => null });
  render(<QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={{ user: { id: 1, state_id: 2, name: 'Test Signer' }, token: 'fixture' }}><FormsPage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>);
  await userEvent.click(await screen.findByRole('button', { name: 'Review & Sign' }));
  await userEvent.click(screen.getByText('Draw test signature'));
  await userEvent.click(screen.getByRole('button', { name: 'Sign & Submit Agreement' }));
  expect(await screen.findByText('Terms changed; review again.')).toBeTruthy();
  expect(screen.queryByText('Draw test signature')).toBeNull();
  const request = fetcher.mock.calls.find(([, options]) => options.method === 'POST');
  expect(JSON.parse(request[1].body)).toMatchObject({ agreement_id: 9, terms_hash: 'original-hash', signature_data: 'data:image/png;base64,fixture', signed_name: 'Test Signer' });
  await userEvent.click(screen.getByRole('button', { name: 'Review & Sign' }));
  expect(screen.getByRole('button', { name: 'Sign & Submit Agreement' })).toBeTruthy();
});
