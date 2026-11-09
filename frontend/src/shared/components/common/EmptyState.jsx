export default function EmptyState({
  title = 'No records found',
  description = null,
  icon = null,
  action = null,
  className = '',
}) {
  return (
    <div
      className={`bg-white border border-dashed border-slate-200 rounded-lg p-8 sm:p-10 text-center flex flex-col items-center justify-center ${className}`.trim()}
    >
      {icon && <div className="text-slate-400 mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-900 m-0">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1.5 mb-0 leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
