export default function AuthorizationMetrics({ metrics, filterStatus, onSelectStatus }) {
  const items = [
    {
      id: 'all',
      label: 'Total Authorizations',
      value: metrics.total,
      hint: 'View all records →',
    },
    {
      id: 'active',
      label: 'Active (Current)',
      value: metrics.active,
      hint: '> 30 days remaining',
    },
    {
      id: 'expiring_soon',
      label: 'Expiring Soon',
      value: metrics.expiringSoon,
      hint: 'Within 30 days',
    },
    {
      id: 'expired',
      label: 'Expired',
      value: metrics.expired,
      hint: 'Requires re-authorization',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item) => {
        const isActive = filterStatus === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectStatus(item.id)}
            className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
              isActive
                ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {item.label}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {item.value}
            </div>
            <div className={`text-xs mt-1 ${isActive ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              {item.hint}
            </div>
          </button>
        );
      })}
    </div>
  );
}
