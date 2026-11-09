import { errorMessage } from "../api/client";

export function Failure({ error }: { error: unknown }) {
  return error ? (
    <p
      className="border-l-[3px] border-[#8c2929] bg-[#f9ece8] p-[18px] text-[#8c2929]"
      role="alert"
    >
      {errorMessage(error)}
    </p>
  ) : null;
}
