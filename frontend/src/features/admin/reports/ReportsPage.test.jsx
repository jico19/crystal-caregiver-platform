// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/shared/contexts/authContextDef';
import ReportsPage from './ReportsPage';
let client;
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
test('six reports remain available and render real response records', async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal('localStorage', { getItem: () => null });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    state_codes: ['IN'], generated_at: '2026-01-01',
    caregiver_compliance: { rows: [{ caregiver_id: 1, name: 'Synthetic Caregiver', state_code: 'IN', missing: 1, expired: 0, expiring_soon: 0, valid: 2, compliant: false }], compliant: 0, total: 1 },
  }), { headers: { 'Content-Type': 'application/json' } })));
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{ user: { id: 1 }, token: 'fixture' }}><ReportsPage /></AuthContext.Provider></QueryClientProvider>);
  expect(await screen.findByText('Synthetic Caregiver')).toBeTruthy();
  for (const title of ['Caregiver Compliance', 'Expiring Credentials', 'In-Service Training Completion', 'Client Authorizations', 'Referral Sources', 'Website Inquiries']) {
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  }
});
