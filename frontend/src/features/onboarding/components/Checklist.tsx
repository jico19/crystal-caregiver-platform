import { useMutation } from "@tanstack/react-query";
import { api, queryClient } from "../../../api/client";
import { Failure } from "../../../components/Failure";
import type { Onboarding } from "../types";

export function Checklist({ value }: { value: Onboarding }) {
  const complete = useMutation({
    mutationFn: () =>
      api.post(`caregivers/${value.caregiver}/onboarding/complete/`, {
        expected_status: "onboarding",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["private"] }),
  });
  return (
    <section className="my-8">
      <h2 className="mb-4 font-serif text-section">Demo onboarding checklist</h2>
      <p className="mb-4">
        Required approvals: {value.counts.completed}/{value.counts.total}. These are illustrative
        branch requirements.
      </p>
      <dl className="mb-6 flex flex-wrap gap-5">
        {Object.entries(value.counts).map(([key, count]) => (
          <div key={key}>
            <dt className="capitalize">{key}</dt>
            <dd className="font-semibold">{count}</dd>
          </div>
        ))}
      </dl>
      <ul className="grid gap-4 md:grid-cols-2">
        {value.requirements.map((row) => (
          <li key={row.document_type} className="rounded-control border border-border bg-card p-5">
            <h3 className="font-semibold">{row.label}</h3>
            <p>
              {row.required ? "Required by demo configuration" : "Optional"} · {row.state}
            </p>
            <p>Latest review: {row.latest_version?.review_status ?? "No submission"}</p>
            <p>Expires: {row.expires_on ?? "Not tracked / not approved"}</p>
          </li>
        ))}
      </ul>
      {value.allowed_actions.review ? (
        <div className="mt-6">
          <p className="mb-3">
            Complete only after application approval and all required, unexpired document approvals.
            Completion is a historical demo milestone, not work authorization.
          </p>
          <button
            className="button button-primary"
            disabled={!value.allowed_actions.complete || complete.isPending}
            onClick={() => complete.mutate()}
          >
            Complete demo onboarding
          </button>
          <Failure error={complete.error} />
          {complete.error ? (
            <button
              className="button button-outline mt-3"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["private"] })}
            >
              Refresh checklist
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
