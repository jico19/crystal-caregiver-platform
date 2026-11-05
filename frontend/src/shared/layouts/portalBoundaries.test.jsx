// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../contexts/authContextDef';
import AdminLayout from './AdminLayout';
import CaregiverLayout from './CaregiverLayout';
import ClientLayout from './ClientLayout';

let client;
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); localStorage.clear(); });
function mount(Layout, user) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })));
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{ user, token: user ? 'fixture' : null, loading: false, logout: () => {} }}>
    <MemoryRouter initialEntries={['/protected']}><Routes>
      <Route path="/protected" element={<Layout />} />
      <Route path="/admin/dashboard" element={<span>Admin destination</span>} />
      <Route path="/client/dashboard" element={<span>Client destination</span>} />
      <Route path="/caregiver/dashboard" element={<span>Caregiver destination</span>} />
      <Route path="/caregiver/login" element={<span>Caregiver login destination</span>} />
      <Route path="/client/login" element={<span>Client login destination</span>} />
    </Routes></MemoryRouter>
  </AuthContext.Provider></QueryClientProvider>);
}
test.each([CaregiverLayout, ClientLayout])('executives entering another portal return to administration', async Layout => {
  mount(Layout, { id: 1, role: 'super_admin' });
  expect(await screen.findByText('Admin destination')).toBeTruthy();
});
test('caregivers cannot enter administration', async () => {
  mount(AdminLayout, { id: 1, role: 'caregiver', state_id: 2 });
  expect(await screen.findByText('Caregiver destination')).toBeTruthy();
});
test('anonymous clients are sent to login', async () => {
  mount(ClientLayout, null);
  expect(await screen.findByText('Client login destination')).toBeTruthy();
});
test('state staff navigation has assigned-state public link and no platform authority links', async () => {
  mount(AdminLayout, { id: 1, role: 'administrator', state_id: 2, email: 'staff@example.test' });
  expect(screen.queryByRole('link', { name: /User & Staff Access/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /Website Content/ })).toBeNull();
  expect(screen.getAllByRole('link').filter(link => link.getAttribute('href') === '/indiana').length).toBeGreaterThan(0);
  expect(screen.queryByRole('combobox')).toBeNull();
});
