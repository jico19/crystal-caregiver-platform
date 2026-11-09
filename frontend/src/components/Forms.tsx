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
    <label className="grid gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {error ? <span className="text-[#8c2929]">{error.message}</span> : null}
    </label>
  );
}
