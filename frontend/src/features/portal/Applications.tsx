import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Application, Page } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";
import { Panel } from "../../components/Panel";

export function Applications({ state = "", admin = false }: { state?: string; admin?: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const applications = useQuery({
    queryKey: ["private", "applications", state, status, page],
    queryFn: async () =>
      (
        await api.get<Page<Application>>("applications/", {
          params: { branch__state_code: state || undefined, status: status || undefined, page },
        })
      ).data,
  });

  return (
    <Panel>
      <h2 className="mb-6 font-serif text-section">
        {admin ? "Application review queue" : "Your applications"}
      </h2>
      {admin ? (
        <label className="mb-4 grid gap-2">
          Application status filter
          <select
            className="form-control"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["submitted", "under_review", "approved", "rejected"].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {applications.isPending ? <Loading /> : null}
      <Failure error={applications.error} />
      {applications.data?.results.map((app) => (
        <div
          className="flex flex-wrap items-start justify-between gap-3 border-t border-border py-4"
          key={app.public_id}
        >
          <Link to={`/applications/${app.public_id}`}>{app.state_code} application</Link>
          <span className="rounded-sm bg-accent px-2 py-0.75 text-caption">{app.status}</span>
        </div>
      ))}
      {applications.data?.count === 0 ? (
        <p className="mb-6 max-w-[62ch]">
          You have no submitted applications.{" "}
          <Link to="/states/FL">See caregiver opportunities</Link>.
        </p>
      ) : null}
      {applications.data && applications.data.count > 25 ? (
        <nav className="mt-4 flex flex-wrap items-center gap-3" aria-label="Application pages">
          <button
            className="button button-outline"
            disabled={!applications.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button button-outline"
            disabled={!applications.data.next}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </Panel>
  );
}
