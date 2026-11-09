import type { ReactNode } from "react";
import type { FieldError } from "react-hook-form";
import { errorMessage } from "../api/client";

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

export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p className="error notice" role="alert">
      {errorMessage(error)}
    </p>
  ) : null;
}

export function Loading() {
  return <output>Loading…</output>;
}
