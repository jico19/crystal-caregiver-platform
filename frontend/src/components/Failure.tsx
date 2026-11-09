import { errorMessage } from "../api/client";

export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p className="error notice" role="alert">
      {errorMessage(error)}
    </p>
  ) : null;
}
