export default function StatusBadge({
  status,
  variant,
  label,
  size = 'sm',
  className = '',
}) {
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase().replace(/\s+/g, '_') : '';

  const STATUS_VARIANT_MAP = {
    active: 'success',
    approved: 'success',
    completed: 'success',
    pass: 'success',
    valid: 'success',
    signed: 'success',
    hired: 'success',

    pending: 'warning',
    draft: 'warning',
    submitted: 'warning',
    in_review: 'warning',
    under_review: 'warning',
    expiring_soon: 'warning',
    warning: 'warning',

    rejected: 'error',
    expired: 'error',
    suspended: 'error',
    terminated: 'error',
    discharged: 'error',
    failed: 'error',

    info: 'neutral',
    not_started: 'neutral',
    archived: 'neutral',
  };

  const resolvedVariant = variant || STATUS_VARIANT_MAP[normalizedStatus] || 'neutral';

  const variantClass =
    resolvedVariant === 'success'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : resolvedVariant === 'warning'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : resolvedVariant === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  const sizeClass =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'md'
      ? 'text-xs px-2.5 py-1'
      : 'text-xs px-2 py-0.5';

  const displayLabel = label ?? status ?? 'Unknown';

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium capitalize shrink-0 ${variantClass} ${sizeClass} ${className}`.trim()}
    >
      {displayLabel}
    </span>
  );
}
