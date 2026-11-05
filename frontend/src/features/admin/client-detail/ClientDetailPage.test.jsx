// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthContext } from '@/shared/contexts/authContextDef';
import ClientDetailPage from './ClientDetailPage';

const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
let fetcher;
let failAdmission;
beforeEach(() => {
  localStorage.clear(); failAdmission = false;
  fetcher = vi.fn(async (url, options) => {
    if (url.endsWith('/admission') && options.method === 'POST') {
      if (failAdmission) return new Response(JSON.stringify({ detail: 'Admission save failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      return json({});
    }
    if (url.endsWith('/care-plan')) return json({ care_plan: { id: 1, status: 'active', primary_nurse: 'Saved nurse', activities: [] } });
    if (url.endsWith('/schedule')) return json({ schedule: [] });
    if (url.endsWith('/assignments')) return json({ assignments: [] });
    if (url.includes('/admin/caregivers')) return json({ caregivers: [] });
    const id = url.endsWith('/2') ? 2 : 1;
    return json({ client: { id, first_name: id === 1 ? 'First' : 'Second', last_name: 'Client', state_id: 2, status: 'pending', admission_notes: 'Saved note' } });
  });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/admin/clients/2')}>Next client</button>;
}
async function open() {
  render(<MemoryRouter initialEntries={['/admin/clients/1']}>
    <AuthContext.Provider value={{ user: { id: 5, role: 'administrator', state_id: 2 }, token: 'fixture' }}>
      <Navigation /><Routes><Route path="/admin/clients/:id" element={<ClientDetailPage />} /></Routes>
    </AuthContext.Provider>
  </MemoryRouter>);
  await screen.findByRole('heading', { name: 'First Client' });
}

test('saving admission preserves an unrelated care-plan draft; navigating clients resets editors', async () => {
  await open();
  const nurse = screen.getByLabelText('Clinical Supervisor');
  await userEvent.clear(nurse); await userEvent.type(nurse, 'Unsaved nurse draft');
  const notes = screen.getByLabelText('Admission Review Notes');
  await userEvent.clear(notes); await userEvent.type(notes, 'New admission note');
  await userEvent.click(screen.getByRole('button', { name: 'Approve Admission' }));
  await screen.findByText(/Client admission status updated/);
  expect(nurse.value).toBe('Unsaved nurse draft');
  await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/care-plan')).length).toBeGreaterThan(1));
  expect(nurse.value).toBe('Unsaved nurse draft');
  const request = fetcher.mock.calls.find(([url]) => url.endsWith('/admission'));
  expect(JSON.parse(request[1].body)).toMatchObject({ status: 'approved', notes: 'New admission note' });
  await userEvent.click(screen.getByRole('button', { name: 'Next client' }));
  expect(screen.queryByRole('heading', { name: 'First Client' })).toBeNull();
  await screen.findByRole('heading', { name: 'Second Client' });
  expect(screen.getByLabelText('Clinical Supervisor').value).toBe('Saved nurse');
  expect(screen.getByLabelText('Admission Review Notes').value).toBe('Saved note');
});

test('failed admission save retains draft and reports the server error', async () => {
  await open(); failAdmission = true;
  const notes = screen.getByLabelText('Admission Review Notes');
  await userEvent.clear(notes); await userEvent.type(notes, 'Retain draft');
  await userEvent.click(screen.getByRole('button', { name: 'Approve Admission' }));
  expect(await screen.findByText('Admission save failed')).toBeTruthy();
  expect(notes.value).toBe('Retain draft');
});
