import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../../api/client";
import type { Page } from "../../../api/types";
import { Panel } from "../../../components/Panel";
import { Loading } from "../../../components/Loading";
import { Failure } from "../../../components/Failure";
import type { Onboarding } from "../types";

export function OnboardingQueue({ state }: { state: string }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const queue = useQuery({
    queryKey: ["private", "onboarding-queue", state, status, page],
    queryFn: async () =>
      (
        await api.get<Page<Onboarding> & { counts: Record<string, number> }>("staff/onboarding/", {
          params: { state: state || undefined, status: status || undefined, page },
        })
      ).data,
  });
  return (
    <Panel>
      <h2 className="mb-6 font-serif text-section">Onboarding and compliance queue</h2>
      <label className="grid gap-2">
        Milestone filter
        <select
          className="form-control"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All milestones</option>
          <option value="pending">Pending</option>
          <option value="onboarding">Onboarding</option>
          <option value="eligible">Demo onboarding complete</option>
        </select>
      </label>
      {queue.isPending ? <Loading /> : null}
      <Failure error={queue.error} />
      {queue.data ? (
        <p className="my-4">
          Required documents across this filtered queue: {queue.data.counts.completed}/
          {queue.data.counts.total}; missing {queue.data.counts.missing}; expired{" "}
          {queue.data.counts.expired}; expiring {queue.data.counts.expiring}.
        </p>
      ) : null}
      {queue.data?.results.map((person) => (
        <div key={person.caregiver} className="border-t border-border py-4">
          <Link to={`/caregivers/${person.caregiver}/onboarding`}>
            {person.name} · {person.state_code}
          </Link>
          <p>
            {person.status === "eligible" ? "Demo onboarding complete" : person.status} ·{" "}
            {person.counts.completed}/{person.counts.total} required approvals
          </p>
        </div>
      ))}
      {queue.data?.count === 0 ? (
        <p className="my-4">No accessible caregivers match these filters.</p>
      ) : null}
      {queue.data && queue.data.count > 25 ? (
        <nav className="mt-4 flex flex-wrap items-center gap-3" aria-label="Onboarding queue pages">
          <button
            className="button button-outline"
            disabled={!queue.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button-outline"
            disabled={!queue.data.next}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </Panel>
  );
}
