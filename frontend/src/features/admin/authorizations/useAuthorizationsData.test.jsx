// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthorizationsData } from './useAuthorizationsData';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test.each([7, '7'])('deep-link client %s, review and refresh preserve the unrelated editor draft', async clientId => {
  let fail = false;
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/review')) return fail ? json({ detail: 'Review failed' }, 400) : json({});
    if (url.includes('/admin/clients')) return json({ clients: [{ id: clientId, first_name: 'Test', last_name: 'Client', state_id: 2, states: { code: 'IN' } }] });
    if (url.includes('/admin/authorizations')) return json({ authorizations: [{ id: 1, status: 'pending_review', state_id: 2, authorization_number: 'FIXTURE-1', end_date: '2099-01-01' }] });
    throw new Error(`Unexpected URL ${url} ${options?.method}`);
  });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => null });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const wrapper = ({ children }) => <MemoryRouter initialEntries={['/admin/authorizations?client_id=7&state_id=2']}>{children}</MemoryRouter>;
  const { result } = renderHook(() => useAuthorizationsData('fixture'), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.editor.showForm).toBe(true);
  expect(String(result.current.editor.clientId)).toBe('7');
  expect(result.current.editor.selectedClient.id).toBe(clientId);
  act(() => result.current.editor.handleClientChange(String(clientId)));
  expect(result.current.editor.selectedClient.id).toBe(clientId);
  act(() => result.current.editor.setNotes('Unsaved authorization draft'));
  await act(() => result.current.handleReview(1, 'approved'));
  expect(result.current.editor.notes).toBe('Unsaved authorization draft');
  expect(result.current.successMsg).toBe('Authorization approved and activated.');
  fail = true;
  await act(() => result.current.handleReview(1, 'rejected'));
  expect(result.current.errorMsg).toBe('Review failed');
  expect(result.current.editor.notes).toBe('Unsaved authorization draft');
  const reviews = fetcher.mock.calls.filter(([url]) => url.endsWith('/review'));
  expect(JSON.parse(reviews[0][1].body)).toEqual({ status: 'approved' });
});
