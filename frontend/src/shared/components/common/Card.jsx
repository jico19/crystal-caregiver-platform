export default function Card({
  children,
  title,
  subtitle,
  actions,
  compact = false,
  className = '',
}) {
  const paddingClass = compact ? 'p-3.5 sm:p-4' : 'p-5 sm:p-6';
  const hasHeader = title || subtitle || actions;

  return (
    <div className={`bg-white border border-slate-200 rounded-lg shadow-xs ${paddingClass} ${className}`.trim()}>
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            {title && (
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight m-0">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 m-0 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
