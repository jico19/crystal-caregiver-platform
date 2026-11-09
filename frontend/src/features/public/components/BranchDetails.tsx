import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../../api/client";
import type { Page } from "../../../api/types";
import { Failure } from "../../../components/Failure";
import { Loading } from "../../../components/Loading";
import type { BranchContent } from "../types";

export function BranchDetails({ state, name }: { state: string; name: string }) {
  const content = useQuery({
    queryKey: ["branch-content", state],
    queryFn: async () =>
      (
        await api.get<Page<BranchContent>>("branch-content/", {
          params: { branch__state_code: state },
        })
      ).data,
  });
  return (
    <div className="rounded-md bg-accent p-7 md:p-12">
      <p className="mb-6 text-caption text-muted-foreground">Your public branch</p>
      <h2 className="mb-6 font-serif text-section">{name}</h2>
      <p className="mb-6 text-caption">Demo workflow — pending agency confirmation.</p>
      {content.isPending ? <Loading /> : null}
      <Failure error={content.error} />
      {content.data?.results
        .filter((item) => item.state_code === state)
        .map((item) => (
          <div key={item.public_id} className="mb-6 border-t border-border pt-4">
            <h3 className="mb-2 font-semibold">{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      {content.data?.count === 0 ? (
        <p className="mb-6">Branch information awaits agency confirmation.</p>
      ) : null}
      <Link to="/login">Open your portal →</Link>
    </div>
  );
}
