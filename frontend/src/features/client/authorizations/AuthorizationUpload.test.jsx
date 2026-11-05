// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthorizationUpload from './AuthorizationUpload';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('failed record creation retries the uploaded document without a second transfer', async () => {
  let fail = true;
  const fetcher = vi.fn(async (url) => {
    if (url.endsWith('/upload-intent')) return json({ document_id: 9, upload_url: 'https://storage.test/upload' });
    if (url === 'https://storage.test/upload') return new Response('', { status: 200 });
    if (url.endsWith('/clients/me/authorizations')) return fail ? json({ detail: 'Save failed' }, 400) : json({ id: 2 });
    throw new Error(`Unexpected URL ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => null });
  const onError = vi.fn(), onSaved = vi.fn();
  render(<AuthorizationUpload token="fixture" documentTypes={[{ id: 1, name: 'Authorizations', for_role: 'client' }]}
    onError={onError} onSaved={onSaved} onBegin={() => {}} onCancel={() => {}} />);
  await userEvent.upload(screen.getByLabelText(/Authorization Document/), new File(['pdf'], 'notice.pdf', { type: 'application/pdf' }));
  fireEvent.change(screen.getByLabelText(/Coverage Start Date/), { target: { value: '2026-01-01' } });
  fireEvent.change(screen.getByLabelText(/Coverage End Date/), { target: { value: '2027-01-01' } });
  const submit = screen.getByRole('button', { name: 'Submit for Verification' });
  fireEvent.submit(submit.closest('form'));
  await waitFor(() => expect(onError).toHaveBeenCalledWith('Save failed'));
  expect(onSaved).not.toHaveBeenCalled();
  fail = false;
  fireEvent.submit(submit.closest('form'));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls.filter(([url]) => url === 'https://storage.test/upload')).toHaveLength(1);
  const posts = fetcher.mock.calls.filter(([url]) => url.endsWith('/clients/me/authorizations'));
  expect(JSON.parse(posts[1][1].body)).toMatchObject({ document: 9, start_date: '2026-01-01', end_date: '2027-01-01' });
});
