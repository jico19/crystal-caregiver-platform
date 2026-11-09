export function authorizationAllowance(authorization) {
  const total = authorization.total_units_authorized ?? 0;
  const used = authorization.units_used ?? 0;
  const remaining = authorization.units_remaining ?? total - used;
  const factor = (authorization.unit_type || '15_min') === '15_min' ? 0.25 : 1;
  const remHours =
    authorization.remaining_hours !== undefined
      ? Number(authorization.remaining_hours)
      : remaining * factor;
  const totalHours =
    authorization.total_hours !== undefined
      ? Number(authorization.total_hours)
      : total * factor;
  const usedHours =
    authorization.hours_used !== undefined
      ? Number(authorization.hours_used)
      : used * factor;
  const pct =
    total > 0
      ? Math.max(0, Math.min(100, Math.round((used / total) * 100)))
      : 0;
  return {
    remaining,
    remHours,
    totalHours,
    usedHours,
    pct,
    progressBg:
      used > total || pct >= 90
        ? 'bg-rose-500'
        : pct >= 75
          ? 'bg-amber-500'
          : 'bg-emerald-600',
  };
}

export function authorizationTotals(authorizations) {
  const totals = {
    totalRemainingHours: 0,
    totalAuthorizedHours: 0,
    totalUsedHours: 0,
    totalRemainingUnits: 0,
  };
  for (const authorization of authorizations) {
    const allowance = authorizationAllowance(authorization);
    totals.totalRemainingHours += Number(allowance.remHours) || 0;
    totals.totalAuthorizedHours += Number(allowance.totalHours) || 0;
    totals.totalUsedHours += Number(allowance.usedHours) || 0;
    totals.totalRemainingUnits += Number(allowance.remaining) || 0;
  }
  return {
    ...totals,
    overallPercent:
      totals.totalAuthorizedHours > 0
        ? Math.min(
            100,
            Math.round(
              (totals.totalUsedHours / totals.totalAuthorizedHours) * 100
            )
          )
        : 0,
  };
}
