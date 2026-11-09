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
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <span className="error">{error.message}</span> : null}
    </label>
  );
}
