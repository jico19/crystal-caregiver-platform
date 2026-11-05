// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import { queryClient } from '@/shared/lib/queryClient';
import ReferralsPage from './ReferralsPage';
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
let fetcher;
let referral;
let failSave;
let paged;
beforeEach(() => {
  queryClient.clear(); localStorage.clear(); failSave = false; paged = false;
  referral = { id: 5, first_name: 'Test', last_name: 'Referral', status: 'new', state_id: 2, state_code: 'IN', phone: '5550100', handled_notes: 'Previous note' };
  fetcher = vi.fn(async (url, options) => {
    if (options?.method === 'PATCH') {
      if (failSave) return new Response(JSON.stringify({ detail: 'Save failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      referral = { ...referral, ...JSON.parse(options.body) }; return json({ client_id: 9 });
    }
    if (url.includes('/states')) return json([{ id: 1, code: 'FL', name: 'Florida' }, { id: 2, code: 'IN', name: 'Indiana' }]);
    if (url.includes('/analytics')) return json({ total_referrals: 1, by_status: { new: 1 }, by_source: [], conversion_rate_pct: 0 });
    if (url.includes('/admin/referrals')) {
      const page = Number(new URL(url).searchParams.get('page')) || 1;
      return json({ referrals: paged && page === 2 ? [{ ...referral, id: 6, first_name: 'Second' }] : [referral], total: paged ? 21 : 1, pages: paged ? 2 : 1, page });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
  // jsdom has no scrolling layout; Radix calls this when focusing a list option.
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); queryClient.clear(); delete window.HTMLElement.prototype.scrollIntoView; vi.unstubAllGlobals(); });
async function open() {
  render(<QueryClientProvider client={queryClient}><MemoryRouter><AuthContext.Provider value={{ user: { id: 1, role: 'administrator', state_id: 2 }, token: 'fixture' }}><ReferralsPage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>);
  await screen.findByText('Test Referral');
}
test('assigned-state reads, search and notes save refresh the real list and analytics', async () => {
  await open();
  expect(fetcher.mock.calls.some(([url]) => url.includes('state_id=2'))).toBe(true);
  await userEvent.click(screen.getByTitle('Edit Notes'));
  const editor = screen.getByRole('textbox', { name: '' });
  await userEvent.clear(editor); await userEvent.type(editor, 'Updated note');
  await userEvent.click(screen.getByRole('button', { name: 'Save Notes' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('Updated note')).toBeTruthy();
  expect(fetcher.mock.calls.filter(([url]) => url.includes('/analytics')).length).toBeGreaterThan(1);
});
test('failed notes save preserves the draft and dialog for retry', async () => {
  await open(); await userEvent.click(screen.getByTitle('Edit Notes'));
  const editor = screen.getByRole('textbox', { name: '' });
  await userEvent.clear(editor); await userEvent.type(editor, 'Keep this draft'); failSave = true;
  await userEvent.click(screen.getByRole('button', { name: 'Save Notes' }));
  await waitFor(() => expect(fetcher.mock.calls.some(([, options]) => options.method === 'PATCH')).toBe(true));
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(editor.value).toBe('Keep this draft');
});

test('conversion requires confirmation, then refreshes and links the saved client', async () => {
  await open();
  // Keyboard interaction uses the real Radix select and its existing conversion gate.
  const stage = screen.getAllByRole('combobox').find(el => el.textContent.includes('New Lead'));
  fireEvent.keyDown(stage, { key: 'ArrowDown' });
  await userEvent.click(await screen.findByRole('option', { name: 'Converted to Client' }));
  expect(await screen.findByRole('dialog')).toBeTruthy();
  expect(fetcher.mock.calls.some(([, opts]) => opts.method === 'PATCH')).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.keyDown(stage, { key: 'ArrowDown' });
  await userEvent.click(await screen.findByRole('option', { name: 'Converted to Client' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm & Convert to Client' }));
  expect(await screen.findByText(/converted to client profile/)).toBeTruthy();
  const request = fetcher.mock.calls.find(([, opts]) => opts.method === 'PATCH');
  expect(JSON.parse(request[1].body)).toEqual({ status: 'converted' });
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/admin/clients/9')).toBe(true);
});

test('roster pagination requests page two and filter changes reset to page one', async () => {
  paged = true;
  await open();
  await userEvent.click(screen.getByRole('tab', { name: 'Roster Table' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(await screen.findByText('Second Referral')).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => url.includes('page=2'))).toBe(true);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Unassigned Only' }));
  await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes('unassigned=true') && url.includes('page=1'))).toBe(true));
});
