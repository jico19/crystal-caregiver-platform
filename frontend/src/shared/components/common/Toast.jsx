import { useEffect } from 'react';

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 4000,
  className = '',
}) {
  useEffect(() => {
    if (!onClose || !duration) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  const typeStyles =
    type === 'success'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : type === 'warning'
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : type === 'error'
      ? 'bg-red-50 text-red-900 border-red-200'
      : 'bg-white text-slate-800 border-slate-200';

  return (
    <div className={`fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`.trim()}>
      <div className={`text-xs shadow-md flex items-center justify-between gap-3 py-2.5 px-4 rounded-lg border ${typeStyles}`}>
        <span className="font-medium">{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss message"
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
