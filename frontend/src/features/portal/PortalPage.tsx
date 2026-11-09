import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import type { Role } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";
import { Panel } from "../../components/Panel";
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
        <section className="px-[max(24px,6vw)] py-16 max-md:py-10">
          <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
            Access unavailable
          </h1>
          <p className="mb-6 max-w-[62ch]">
            Your account has no active portal assignment. Contact your demo administrator.
          </p>
        </section>
      );
    }
    return <Navigate to={`/portal/${user.roles[0]}`} replace />;
  }
  if (!user.roles.includes(role)) {
    return (
      <section className="px-[max(24px,6vw)] py-16 max-md:py-10">
        <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
          Access denied
        </h1>
        <p className="mb-6 max-w-[62ch]">Your account does not have this portal role.</p>
        <Link to="/portal">Open your portal</Link>
      </section>
    );
  }

  const admin = role === "super-admin" || role === "state-admin";

  return (
    <section className="px-[max(24px,6vw)] py-16 max-md:py-10">
      <p className="mb-6 text-[13px] text-[#4b6456]">Your workspace / {user.email}</p>
      <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
        {titles[role]}
      </h1>
      <nav className="mb-6 flex flex-wrap items-center gap-6" aria-label="Your portals">
        {user.roles.map((item) => (
          <Link key={item} to={`/portal/${item}`}>
            {titles[item]}
          </Link>
        ))}
      </nav>
      <p className="mb-6 max-w-[62ch]">
        Authorized branches:{" "}
        {user.branches.map((branch) => branch.display_name).join(", ") || "None"}
      </p>
      {params.has("submitted") ? (
        <output className="border-l-[3px] border-[#577451] bg-[#edf0e9] p-[18px]">
          Application submitted. Your portal account is ready. Agency review is a later demo phase.
        </output>
      ) : null}
      {role === "super-admin" ? (
        <label className="grid gap-2 text-sm">
          Filter accessible records by state
          <select
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">All authorized states</option>
            {user.branches.map((branch) => (
              <option key={branch.public_id} value={branch.state_code}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="mt-10 grid grid-cols-2 gap-6 max-md:grid-cols-1">
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
          <Panel>
            <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
              {role === "caregiver" ? "Onboarding" : "Your care information"}
            </h2>
            <p className="mb-6 max-w-[62ch]">
              {role === "caregiver"
                ? "Document submission, agency review, and training are planned for later phases."
                : "Intake, authorizations, care plans, and schedules are planned for later phases."}
            </p>
            <p className="mb-6 max-w-[62ch]">
              No sensitive documents are accepted in this foundation.
            </p>
          </Panel>
        )}
      </div>
    </section>
  );
}
