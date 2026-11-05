// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/shared/contexts/authContextDef';
import { queryClient } from '@/shared/lib/queryClient';
import TrainingPage from './TrainingPage';
afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals(); });
test('enrollment and completion refresh saved status and retain the certificate deep link', async () => {
  let status = null;
  const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  const fetcher = vi.fn(async (url) => {
    if (url.endsWith('/training/courses')) return json([{ id: 3, name: 'Synthetic course', duration_hours: 1 }]);
    if (url.endsWith('/training/my-enrollments')) return json(status ? [{ course_id: 3, status, completed_at: status === 'completed' ? '2026-01-01' : null }] : []);
    if (url.endsWith('/enroll')) { status = 'in_progress'; return json({}); }
    if (url.endsWith('/complete')) { status = 'completed'; return json({}); }
    throw new Error(`Unexpected URL ${url}`);
  });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('localStorage', { getItem: () => null });
  render(<QueryClientProvider client={queryClient}><MemoryRouter><AuthContext.Provider value={{ user: { id: 1, role: 'caregiver' }, token: 'fixture' }}><TrainingPage /></AuthContext.Provider></MemoryRouter></QueryClientProvider>);
  await userEvent.click(await screen.findByRole('button', { name: 'Enroll Module' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Mark as Completed' }));
  expect((await screen.findByRole('link', { name: 'View Certificate' })).getAttribute('href')).toBe('/caregiver/training-certificate/3');
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/training/my-enrollments')).length).toBeGreaterThanOrEqual(3);
});
