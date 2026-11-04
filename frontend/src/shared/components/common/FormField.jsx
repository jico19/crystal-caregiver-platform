export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className = '',
}) {
  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`.trim()}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-slate-500 mt-0.5 mb-0 leading-normal">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[11px] text-red-600 font-medium mt-0.5 mb-0 leading-normal">
          {error}
        </p>
      )}
    </div>
  );
}
