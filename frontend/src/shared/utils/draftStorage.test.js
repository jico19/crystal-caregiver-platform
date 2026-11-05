// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { saveDraft, loadDraft, DRAFT_STORAGE_KEY, DRAFT_TTL_MS } from './draftStorage';
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
test('drafts never cross accounts and stale drafts expire', () => {
  let now = 1000000000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  expect(saveDraft('first-account', { firstName: 'Synthetic' })).toBe(true);
  expect(loadDraft('other-account')).toBeNull();
  expect(loadDraft('first-account')).toEqual({ firstName: 'Synthetic' });
  now += DRAFT_TTL_MS + 1;
  expect(loadDraft('first-account')).toBeNull();
  expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
});
