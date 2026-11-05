// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAssignmentEditor } from './useAssignmentEditor';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('a late compliance result cannot authorize the newly selected caregiver', async () => {
  const pending = new Map();
  vi.stubGlobal('localStorage', { getItem: () => null });
  vi.stubGlobal('fetch', vi.fn(url => new Promise(resolve => pending.set(url, resolve))));
  const { result } = renderHook(() => useAssignmentEditor({ id: 1, token: 'fixture',
    setAvailableCaregivers: () => {}, refreshDetail: () => {}, setErrorMsg: () => {}, setSuccessMsg: () => {} }));
  let first, second;
  act(() => { first = result.current.setSelectedCaregiverId('old'); });
  act(() => { second = result.current.setSelectedCaregiverId('new'); });
  const response = compliant => new Response(JSON.stringify({ compliant }), { headers: { 'Content-Type': 'application/json' } });
  await act(async () => { pending.get('http://localhost:8000/api/v1/admin/caregivers/new/compliance')(response(false)); await second; });
  await act(async () => { pending.get('http://localhost:8000/api/v1/admin/caregivers/old/compliance')(response(true)); await first; });
  expect(result.current.selectedCaregiverId).toBe('new');
  expect(result.current.caregiverCompliance.compliant).toBe(false);
});
