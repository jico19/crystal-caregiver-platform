import { expect, test } from 'vitest';
import { homePathFor, isAdmin, isStateAdmin, isSuperAdmin, stateLabelFor } from './roles';

test.each([
  ['super_admin', '/admin/dashboard'], ['administrator', '/admin/dashboard'],
  ['caregiver', '/caregiver/dashboard'], ['client', '/client/dashboard'],
])('%s lands in the proper portal', (role, path) => expect(homePathFor({ role })).toBe(path));

test('state staff authority differs from executive authority', () => {
  const staff = { role: 'administrator', state_id: 2 };
  const executive = { role: 'super_admin', state_id: null };
  expect(isAdmin(staff)).toBe(true); expect(isAdmin(executive)).toBe(true);
  expect(isStateAdmin(staff)).toBe(true); expect(isSuperAdmin(staff)).toBe(false);
  expect(isStateAdmin(executive)).toBe(false); expect(isSuperAdmin(executive)).toBe(true);
  expect(stateLabelFor(staff)).toBe('IN'); expect(stateLabelFor(executive)).toBe('All States');
  expect(stateLabelFor(null)).toBe('Unassigned');
});
