const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function authorizationUsage(authorization) {
  const total = Number(authorization.total_units_authorized) || 0;
  const used = Number(authorization.units_used) || 0;
  const remaining = total - used;
  const hoursPerUnit = { '15_min': 0.25, hourly: 1 }[authorization.unit_type];
  return {
    total, used, remaining,
    totalHours: hoursPerUnit === undefined ? null : total * hoursPerUnit,
    usedHours: hoursPerUnit === undefined ? null : used * hoursPerUnit,
    remainingHours: hoursPerUnit === undefined ? null : remaining * hoursPerUnit,
  };
}

export function summarizeAuthorizationHours(authorizations) {
  return authorizations.reduce((summary, authorization) => {
    const usage = authorizationUsage(authorization);
    if (usage.totalHours !== null) {
      summary.totalAuthorizedHours += usage.totalHours;
      summary.totalUsedHours += usage.usedHours;
      summary.totalRemainingHours += usage.remainingHours;
    }
    return summary;
  }, { totalAuthorizedHours: 0, totalUsedHours: 0, totalRemainingHours: 0 });
}

function timeMinutes(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [hour, minute, second = 0] = value.split(':').map(Number);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return hour * 60 + minute + second / 60;
}

export function scheduleHours(item) {
  if (item.status === 'cancelled') return 0;
  const start = timeMinutes(item.start_time);
  const end = timeMinutes(item.end_time);
  if (start === null || end === null) return null;
  return ((end - start + 1440) % 1440) / 60;
}

export function scheduleTime(item) {
  if (timeMinutes(item.start_time) === null || timeMinutes(item.end_time) === null) return 'Time not available';
  return `${item.start_time.slice(0, 5)} to ${item.end_time.slice(0, 5)}`;
}

export function weeklyCareHours(schedule) {
  return DAYS.map((day) => ({
    day,
    hours: schedule.reduce((total, item) => {
      const itemDay = (item.day_of_week || '').slice(0, 3);
      return itemDay === day ? total + (scheduleHours(item) ?? 0) : total;
    }, 0),
  }));
}
