// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import IntakePage from './IntakePage';
// Canvas drawing is a separate shared capability; emit synthetic image evidence at that boundary.
vi.mock('@/shared/components/common/SignaturePad', () => ({ default: ({ onChange }) => <button type="button" onClick={() => onChange('data:image/png;base64,fixture')}>Draw test signature</button> }));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let profile;
let fail;
let client;
let fetcher;
let context;
beforeEach(() => {
  localStorage.clear(); fail = false;
  profile = { id: 4, first_name: 'Test', last_name: 'Client', state_id: 2, status: 'pending', signed_name: 'Test Client', signed_at: '2026-01-01', date_of_birth: '1960-01-01' };
  context = { user: { id: 1, role: 'client', state_id: 2 }, token: 'fixture' };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/clients/intake')) {
      if (fail) return json({ detail: 'Intake not saved' }, 400);
      profile = { ...profile, ...JSON.parse(options.body) }; return json({ profile });
    }
    if (url.endsWith('/clients/me')) return json({ profile });
    if (url.endsWith('/document-status')) return json({ summary: { missing: 0 } });
    if (url.endsWith('/agreements')) return json({ agreements: [] });
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
function view() { return <QueryClientProvider client={client}><MemoryRouter><AuthContext.Provider value={context}><IntakePage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>; }
async function edit() { const mounted = render(view()); await userEvent.click(await screen.findByRole('button', { name: 'Edit Intake Submission' })); return mounted; }

test('keeps state packet, cancel, signature validation, payload and saved feedback', async () => {
  render(view());
  const link = await screen.findByRole('link', { name: 'Download Complete Packet (PDF)' });
  expect(link.getAttribute('href')).toBe('/packets/IN-Admission-Packet.pdf');
  await userEvent.click(screen.getByRole('button', { name: 'Edit Intake Submission' }));
  await userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
  expect(screen.getByText('Intake Profile on File')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Edit Intake Submission' }));
  const submit = screen.getByRole('button', { name: 'Sign & Submit Admission Intake' });
  fireEvent.submit(submit.closest('form'));
  expect(await screen.findByText('Please draw your signature to verify and authorize this intake submission.')).toBeTruthy();
  await userEvent.click(screen.getByText('Draw test signature'));
  await userEvent.clear(screen.getByLabelText(/First Name/)); await userEvent.type(screen.getByLabelText(/First Name/), 'Changed');
  await userEvent.click(submit);
  expect(await screen.findByText('Your admission intake has been saved and signed successfully.')).toBeTruthy();
  const request = fetcher.mock.calls.find(([url]) => url.endsWith('/clients/intake'));
  expect(JSON.parse(request[1].body)).toMatchObject({ state_id: 2, first_name: 'Changed', signature_data: 'data:image/png;base64,fixture', signed_name: 'Test Client' });
});

test('failed save retains draft and signature for retry; identity change discards the old editor', async () => {
  const mounted = await edit();
  await userEvent.click(screen.getByText('Draw test signature'));
  await userEvent.clear(screen.getByLabelText(/First Name/)); await userEvent.type(screen.getByLabelText(/First Name/), 'Retained');
  fail = true;
  await userEvent.click(screen.getByRole('button', { name: 'Sign & Submit Admission Intake' }));
  expect(await screen.findByText('Intake not saved')).toBeTruthy();
  expect(screen.getByLabelText(/First Name/).value).toBe('Retained');
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Sign & Submit Admission Intake' }));
  await screen.findByText('Your admission intake has been saved and signed successfully.');
  await userEvent.click(screen.getByRole('button', { name: 'Edit Intake Submission' }));
  context = { user: { id: 2, role: 'client', state_id: 3 }, token: 'other' };
  profile = { id: 9, first_name: 'Other', last_name: 'Person', state_id: 3, signed_at: '2026-01-01' };
  mounted.rerender(view());
  await waitFor(() => expect(screen.queryByLabelText(/First Name/)).toBeNull());
  expect((await screen.findAllByText('Other Person')).length).toBeGreaterThan(0);
});
