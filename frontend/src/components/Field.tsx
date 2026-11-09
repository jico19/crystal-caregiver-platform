import type { ReactNode } from "react";
import type { FieldError } from "react-hook-form";

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: FieldError;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {error ? <span className="text-destructive">{error.message}</span> : null}
    </label>
  );
}
