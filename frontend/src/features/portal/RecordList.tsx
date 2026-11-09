import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Page, Person } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";

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
    <div className="panel">
      <h2>{title}</h2>
      {records.isPending ? <Loading /> : null}
      <Failure error={records.error} />
      {records.data?.results.map((person) => (
        <div className="record-row" key={person.public_id}>
          <span>{person.name}</span>
          <span>{person.state_code}</span>
        </div>
      ))}
      {records.data?.count === 0 ? <p>No accessible records.</p> : null}
      {records.data && records.data.count > 25 ? (
        <nav aria-label={`${title} pages`}>
          <button disabled={!records.data.previous} onClick={() => setPage(page - 1)}>
            Previous page
          </button>
          <span>Page {page}</span>
          <button disabled={!records.data.next} onClick={() => setPage(page + 1)}>
            Next page
          </button>
        </nav>
      ) : null}
    </div>
  );
}
