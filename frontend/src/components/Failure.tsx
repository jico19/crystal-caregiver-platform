import { errorMessage } from "../api/client";

export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p
      className="border-l-[3px] border-destructive bg-destructive-muted p-4.5 text-destructive"
      role="alert"
    >
      {errorMessage(error)}
    </p>
  ) : null;
}
