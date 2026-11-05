import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  authorizationUsage,
  summarizeAuthorizationHours,
  scheduleHours,
  scheduleTime,
  weeklyCareHours,
} from './careMetrics.js';

test('an empty schedule has no invented staffing hours', () => {
  const days = weeklyCareHours([]);
  assert.equal(days.length, 7);
  assert.equal(days.reduce((total, day) => total + day.hours, 0), 0);
  assert.equal(scheduleHours({}), null);
  assert.equal(scheduleTime({}), 'Time not available');
});

test('recorded shift times determine weekly care hours', () => {
  const morning = { day_of_week: 'Monday', start_time: '09:00:00', end_time: '11:30:00' };
  const afternoon = { day_of_week: 'Monday', start_time: '14:00', end_time: '15:00' };
  assert.equal(scheduleHours(morning), 2.5);
  assert.equal(scheduleTime(morning), '09:00 to 11:30');
  assert.deepEqual(weeklyCareHours([morning, afternoon])[0], { day: 'Mon', hours: 3.5 });
});

test('overnight shifts use elapsed time across midnight', () => {
  const overnight = { day_of_week: 'Friday', start_time: '23:00', end_time: '01:00' };
  assert.equal(scheduleHours(overnight), 2);
  assert.deepEqual(weeklyCareHours([overnight])[4], { day: 'Fri', hours: 2 });
});

test('cancelled shifts do not contribute care hours', () => {
  const cancelled = { day_of_week: 'Monday', start_time: '09:00', end_time: '13:00', status: 'cancelled' };
  assert.equal(scheduleHours(cancelled), 0);
  assert.equal(weeklyCareHours([cancelled])[0].hours, 0);
});

test('invalid shift times are not treated as four hour visits', () => {
  assert.equal(scheduleHours({ start_time: '25:00', end_time: '26:00' }), null);
  assert.equal(scheduleHours({ start_time: '09:60', end_time: '12:00' }), null);
  assert.equal(scheduleTime({ start_time: '09:00', end_time: null }), 'Time not available');
});

test('visit allowances retain their unit balance without becoming hours', () => {
  assert.deepEqual(authorizationUsage({ unit_type: 'visit', total_units_authorized: 10, units_used: 2 }), {
    total: 10, used: 2, remaining: 8, totalHours: null, usedHours: null, remainingHours: null,
  });
});

test('hour summaries convert supported units and exclude visits', () => {
  assert.deepEqual(summarizeAuthorizationHours([
    { unit_type: '15_min', total_units_authorized: 40, units_used: 12 },
    { unit_type: 'hourly', total_units_authorized: 8, units_used: 2 },
    { unit_type: 'visit', total_units_authorized: 100, units_used: 50 },
  ]), { totalAuthorizedHours: 18, totalUsedHours: 5, totalRemainingHours: 13 });
  assert.deepEqual(summarizeAuthorizationHours([]), {
    totalAuthorizedHours: 0, totalUsedHours: 0, totalRemainingHours: 0,
  });
});
