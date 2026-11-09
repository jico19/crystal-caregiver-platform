import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Application, Page } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";
import { Panel } from "../../components/Panel";

export function Applications() {
  const applications = useQuery({
    queryKey: ["private", "applications"],
    queryFn: async () => (await api.get<Page<Application>>("applications/")).data,
  });

  return (
    <Panel>
      <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
        Your applications
      </h2>
      {applications.isPending ? <Loading /> : null}
      <Failure error={applications.error} />
      {applications.data?.results.map((app) => (
        <div
          className="flex justify-between gap-3 border-t border-[#e0e6dc] py-4"
          key={app.public_id}
        >
          <span>{app.state_code} application</span>
          <span className="rounded-sm bg-[#e7ede2] px-2 py-[3px] text-[13px]">{app.status}</span>
        </div>
      ))}
      {applications.data?.count === 0 ? (
        <p className="mb-6 max-w-[62ch]">
          You have no submitted applications.{" "}
          <Link to="/states/FL">See caregiver opportunities</Link>.
        </p>
      ) : null}
    </Panel>
  );
}
