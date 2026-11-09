import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import type { Role } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";
import { useSession } from "../auth/session";
import { Applications } from "./Applications";
import { InvitationForm } from "./InvitationForm";
import { RecordList } from "./RecordList";

const titles: Record<Role, string> = {
  "super-admin": "Agency overview",
  "state-admin": "State administration",
  caregiver: "Caregiver portal",
  client: "Client portal",
};
export default function PortalPage() {
  const session = useSession();
  const { role } = useParams<{ role: Role }>();
  const [params] = useSearchParams();
  const [state, setState] = useState("");

  if (session.isPending) return <Loading />;
  if (session.error) return <Failure error={session.error} />;
  if (!session.data) return <Navigate to="/login" replace />;

  const user = session.data;
  if (!role) {
    if (!user.roles.length) {
      return (
        <section>
          <h1>Access unavailable</h1>
          <p>Your account has no active portal assignment. Contact your demo administrator.</p>
        </section>
      );
    }
    return <Navigate to={`/portal/${user.roles[0]}`} replace />;
  }
  if (!user.roles.includes(role)) {
    return (
      <section>
        <h1>Access denied</h1>
        <p>Your account does not have this portal role.</p>
        <Link to="/portal">Open your portal</Link>
      </section>
    );
  }

  const admin = role === "super-admin" || role === "state-admin";

  return (
    <section>
      <p className="eyebrow">Your workspace / {user.email}</p>
      <h1>{titles[role]}</h1>
      <nav className="portal-nav" aria-label="Your portals">
        {user.roles.map((item) => (
          <Link key={item} to={`/portal/${item}`}>
            {titles[item]}
          </Link>
        ))}
      </nav>
      <p>
        Authorized branches:{" "}
        {user.branches.map((branch) => branch.display_name).join(", ") || "None"}
      </p>
      {params.has("submitted") ? (
        <output className="notice">
          Application submitted. Your portal account is ready. Agency review is a later demo phase.
        </output>
      ) : null}
      {role === "super-admin" ? (
        <label className="field">
          Filter accessible records by state
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">All authorized states</option>
            {user.branches.map((branch) => (
              <option key={branch.public_id} value={branch.state_code}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="portal-grid">
        {admin || role === "caregiver" ? (
          <RecordList
            key={`caregivers-${state}`}
            endpoint="caregivers/"
            title={admin ? "Caregiver directory" : "Your caregiver profiles"}
            state={state}
          />
        ) : null}
        {admin || role === "client" ? (
          <RecordList
            key={`clients-${state}`}
            endpoint="clients/"
            title={admin ? "Client directory" : "Your client profiles"}
            state={state}
          />
        ) : null}
        {role === "caregiver" ? <Applications /> : null}
        {admin ? (
          <InvitationForm session={user} />
        ) : (
          <div className="panel">
            <h2>{role === "caregiver" ? "Onboarding" : "Your care information"}</h2>
            <p>
              {role === "caregiver"
                ? "Document submission, agency review, and training are planned for later phases."
                : "Intake, authorizations, care plans, and schedules are planned for later phases."}
            </p>
            <p>No sensitive documents are accepted in this foundation.</p>
          </div>
        )}
      </div>
    </section>
  );
}
