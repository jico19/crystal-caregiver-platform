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
      <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
        {title}
      </h2>
      {records.isPending ? <Loading /> : null}
      <Failure error={records.error} />
      {records.data?.results.map((person) => (
        <div
          className="flex justify-between gap-3 border-t border-[#e0e6dc] py-4"
          key={person.public_id}
        >
          <span>{person.name}</span>
          <span>{person.state_code}</span>
        </div>
      ))}
      {records.data?.count === 0 ? (
        <p className="mb-6 max-w-[62ch]">No accessible records.</p>
      ) : null}
      {records.data && records.data.count > 25 ? (
        <nav aria-label={`${title} pages`}>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-semibold text-white transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            disabled={!records.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </button>
          <span>Page {page}</span>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-semibold text-white transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
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
