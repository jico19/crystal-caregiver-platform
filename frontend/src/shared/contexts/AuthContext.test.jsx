// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { queryClient } from '../lib/queryClient';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function Session() {
  const { user, token, loading, logout } = useAuth();
  return <><span>{loading ? 'restoring' : user?.email || 'signed out'}</span><output>{token}</output><button onClick={logout}>Log out</button></>;
}
beforeEach(() => { localStorage.clear(); queryClient.clear(); });
afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals(); });

test('restores an assigned state and logout clears tokens and cached private records despite request failure', async () => {
  localStorage.setItem('caregiver_access_token', 'access'); localStorage.setItem('refresh', 'refresh');
  queryClient.setQueryData(['private'], { confidential: true });
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url.endsWith('/auth/me/')) return json({ id: 1, role: 'administrator', state_id: 2, email: 'staff@example.test' });
    if (url.endsWith('/auth/logout/')) throw new Error('offline');
    throw new Error(`Unexpected URL ${url}`);
  }));
  render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText('staff@example.test')).toBeTruthy();
  expect(localStorage.getItem('selected_state')).toBe('IN');
  await userEvent.click(screen.getByText('Log out'));
  expect(await screen.findByText('signed out')).toBeTruthy();
  expect(localStorage.getItem('caregiver_access_token')).toBeNull();
  expect(localStorage.getItem('refresh')).toBeNull();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

test('keeps the compatibility profile endpoint and updates the live token on refresh events', async () => {
  localStorage.setItem('caregiver_access_token', 'access');
  const fetcher = vi.fn(async url => url.endsWith('/auth/me/') ? json({}, 404) : json({ id: 2, role: 'super_admin', email: 'executive@example.test' }));
  vi.stubGlobal('fetch', fetcher);
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText('executive@example.test');
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['http://localhost:8000/api/v1/auth/me/', 'http://localhost:8000/api/v1/auth/me']);
  expect(localStorage.getItem('selected_state')).toBe('ALL');
  act(() => window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { token: 'renewed' } })));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('renewed'));
});

test('does not restore an invalid profile', async () => {
  localStorage.setItem('caregiver_access_token', 'bad');
  vi.stubGlobal('fetch', vi.fn(async () => json({}, 401)));
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText('signed out');
  expect(localStorage.getItem('caregiver_access_token')).toBeNull();
});
