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
      <h2>Your applications</h2>
      {applications.isPending ? <Loading /> : null}
      <Failure error={applications.error} />
      {applications.data?.results.map((app) => (
        <div className="record-row" key={app.public_id}>
          <span>{app.state_code} application</span>
          <span className="status">{app.status}</span>
        </div>
      ))}
      {applications.data?.count === 0 ? (
        <p>
          You have no submitted applications.{" "}
          <Link to="/states/FL">See caregiver opportunities</Link>.
        </p>
      ) : null}
    </Panel>
  );
}
