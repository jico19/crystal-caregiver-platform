import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Page, Person } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";
import { Panel } from "../../components/Panel";

export function RecordList({
  endpoint,
  title,
  state,
}: {
  endpoint: string;
  title: string;
  state: string;
}) {
  const [page, setPage] = useState(1);
  const records = useQuery({
    queryKey: ["private", endpoint, state, page],
    queryFn: async () =>
      (
        await api.get<Page<Person>>(endpoint, {
          params: { page, ...(state ? { branch__state_code: state } : {}) },
        })
      ).data,
  });

  return (
    <Panel>
      <h2 className="mb-6 font-serif text-section">{title}</h2>
      {records.isPending ? <Loading /> : null}
      <Failure error={records.error} />
      {records.data?.results.map((person) => (
        <div
          className="flex justify-between gap-3 border-t border-border py-4"
          key={person.public_id}
        >
          <span className="min-w-0">
            {endpoint === "caregivers/" ? (
              <Link to={`/caregivers/${person.public_id}/onboarding`}>{person.name}</Link>
            ) : (
              person.name
            )}
          </span>
          <span className="shrink-0">{person.state_code}</span>
        </div>
      ))}
      {records.data?.count === 0 ? (
        <p className="mb-6 max-w-[62ch]">No accessible records.</p>
      ) : null}
      {records.data && records.data.count > 25 ? (
        <nav className="mt-4 flex flex-wrap items-center gap-3" aria-label={`${title} pages`}>
          <button
            className="button button-primary"
            disabled={!records.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </button>
          <span>Page {page}</span>
          <button
            className="button button-primary"
            disabled={!records.data.next}
            onClick={() => setPage(page + 1)}
          >
            Next page
          </button>
        </nav>
      ) : null}
    </Panel>
  );
}
