// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/shared/contexts/authContextDef';
import DocumentsPage from './DocumentsPage';

const type = { id: 1, name: 'CPR Certificate', requires_expiration: true };
const record = { id: 8, document_types: type, status: 'pending_review', uploaded_at: '2026-01-01', expiration_date: '2099-01-01' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let client;
let fetcher;
let records;
let failList;
let failPut;
let failIntent;
let failTypes;
let failDownload;
let pendingPut;
let context;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('selected_state', 'FL');
  records = []; failList = false; failPut = false; failIntent = false; failTypes = false; failDownload = false; pendingPut = null;
  context = { user: { id: 1, role: 'caregiver', state_id: 1 }, token: 'access' };
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/documents/types?role=caregiver')) return json(failTypes ? {} : [type], failTypes ? 503 : 200);
    if (url.endsWith('/documents/me')) return json(failList ? {} : { documents: records }, failList ? 503 : 200);
    if (url.endsWith('/documents/upload-intent')) return json(failIntent ? {} : { upload_url: 'https://storage.test/signed', document_id: 8 }, failIntent ? 403 : 200);
    if (url === 'https://storage.test/signed') {
      if (pendingPut) await pendingPut;
      if (!failPut) records = [record];
      return new Response('', { status: failPut ? 503 : 200 });
    }
    if (url.endsWith('/documents/8/download-url')) return json(failDownload ? { detail: 'Download unavailable' } : { download_url: 'https://storage.test/download' }, failDownload ? 403 : 200);
    throw new Error(`Unexpected request ${url} ${options?.method}`);
  });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
function view() {
  return <QueryClientProvider client={client}><AuthContext.Provider value={context}><DocumentsPage /></AuthContext.Provider></QueryClientProvider>;
}
async function open() {
  const result = render(view());
  await screen.findByRole('button', { name: 'Submit Credential' });
  return result;
}
async function fill() {
  const file = new File(['%PDF-1.4'], 'credential.pdf', { type: 'application/pdf' });
  await userEvent.upload(screen.getByLabelText(/File \(PDF/), file);
  fireEvent.change(screen.getByLabelText(/Expiration Date/), { target: { value: '2099-01-01' } });
  // jsdom native required-file validation cannot see user-event's FileList.
  // Exercise React validation here; native validation needs browser evidence.
  screen.getByRole('button', { name: 'Submit Credential' }).closest('form').noValidate = true;
  return file;
}

test('shows loading then an honest empty list', async () => {
  render(view());
  expect(screen.getByText('Loading Document Records...')).toBeTruthy();
  expect(await screen.findByText('No documents uploaded yet')).toBeTruthy();
});

test('list and type failures are visible and retryable', async () => {
  failList = true; failTypes = true;
  await open();
  expect(screen.getByText('Failed to load credentials and required document types.')).toBeTruthy();
  failList = false; failTypes = false; records = [record];
  await userEvent.click(screen.getByRole('button', { name: 'Retry loading documents' }));
  expect(await screen.findByText('Submitted Documents (1)')).toBeTruthy();
});

test('validates missing file, required expiration and file format without sending uploads', async () => {
  await open();
  const form = screen.getByRole('button', { name: 'Submit Credential' }).closest('form');
  fireEvent.submit(form);
  expect(await screen.findByText('Please select a file to upload.')).toBeTruthy();
  await userEvent.upload(screen.getByLabelText(/File \(PDF/), new File(['pdf'], 'cpr.pdf', { type: 'application/pdf' }));
  fireEvent.submit(form);
  expect(await screen.findByText('An expiration date is required for CPR Certificate.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/File \(PDF/), { target: { files: [new File(['text'], 'bad.txt', { type: 'text/plain' })] } });
  fireEvent.submit(form);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/format|type|allowed|PDF/i));
  expect(fetcher.mock.calls.some(([url]) => url.endsWith('upload-intent'))).toBe(false);
});

test.each(['intent', 'put'])('%s failure keeps draft and never reports success', async (failure) => {
  await open(); await fill();
  failIntent = failure === 'intent'; failPut = failure === 'put';
  await userEvent.click(screen.getByRole('button', { name: 'Submit Credential' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Error/));
  expect(screen.queryByText(/uploaded successfully/)).toBeNull();
  expect(screen.getByLabelText(/File \(PDF/).files[0].name).toBe('credential.pdf');
});

test('uploads signed bytes once, refreshes list and clears the successful draft', async () => {
  await open(); const file = await fill();
  let resolvePut;
  pendingPut = new Promise(resolve => { resolvePut = resolve; });
  await userEvent.click(screen.getByRole('button', { name: 'Submit Credential' }));
  expect(screen.getByRole('button', { name: 'Uploading...' }).disabled).toBe(true);
  fireEvent.submit(screen.getByRole('button', { name: 'Uploading...' }).closest('form'));
  resolvePut();
  expect(await screen.findByText(/uploaded successfully/)).toBeTruthy();
  expect(await screen.findByText('Submitted Documents (1)')).toBeTruthy();
  expect(screen.getByLabelText(/File \(PDF/).files.length).toBe(0);
  const transfers = fetcher.mock.calls.filter(([url]) => url === 'https://storage.test/signed');
  expect(transfers).toHaveLength(1);
  expect(transfers[0][1]).toMatchObject({ method: 'PUT', body: file });
  expect(transfers[0][1].headers.Authorization).toBeUndefined();
  const intent = fetcher.mock.calls.find(([url]) => url.endsWith('/upload-intent'));
  expect(JSON.parse(intent[1].body)).toMatchObject({ document_type_id: '1', expiration_date: '2099-01-01' });
  expect(intent[1].headers['X-Agency-State']).toBe('FL');
});

test('successful upload with failed refresh reports both outcomes', async () => {
  await open(); await fill(); failList = true;
  await userEvent.click(screen.getByRole('button', { name: 'Submit Credential' }));
  expect(await screen.findByText(/Upload succeeded, but/)).toBeTruthy();
  expect(screen.getByText(/uploaded successfully/)).toBeTruthy();
});

test('list refresh does not wipe a draft; account change clears private rows and draft', async () => {
  records = [record];
  const mounted = await open(); await fill();
  await client.invalidateQueries({ queryKey: ['caregiver-documents'] });
  expect(screen.getByLabelText(/File \(PDF/).files[0].name).toBe('credential.pdf');
  records = []; context = { user: { id: 2, role: 'caregiver', state_id: 2 }, token: 'other' };
  localStorage.setItem('selected_state', 'IN');
  mounted.rerender(view());
  expect(screen.queryByText('Submitted Documents (1)')).toBeNull();
  await screen.findByText('No documents uploaded yet');
  expect(screen.getByLabelText(/File \(PDF/).files.length).toBe(0);
  expect(screen.getByLabelText(/Expiration Date/).value).toBe('');
});

test('opens only the protected download URL and reports download failure', async () => {
  records = [record];
  const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  await open(); await userEvent.click(screen.getByRole('button', { name: 'View File' }));
  await waitFor(() => expect(openWindow).toHaveBeenCalledWith('https://storage.test/download', '_blank', 'noopener,noreferrer'));
  failDownload = true;
  await userEvent.click(screen.getByRole('button', { name: 'View File' }));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Download unavailable'));
  expect(openWindow).toHaveBeenCalledTimes(1);
});
