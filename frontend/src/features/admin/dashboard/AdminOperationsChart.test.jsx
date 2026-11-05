// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AdminOperationsChart from './AdminOperationsChart';
afterEach(cleanup);
test('missing history stays explicitly unavailable instead of showing invented monthly trends', () => {
  render(<AdminOperationsChart selectedState="indiana" />);
  expect(screen.getByText(/Historical admission and recruitment trends are not available/)).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});
