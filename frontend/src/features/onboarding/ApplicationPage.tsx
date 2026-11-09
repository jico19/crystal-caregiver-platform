import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { Loading } from "../../components/Loading";
import { Failure } from "../../components/Failure";
import { useSession } from "../auth/session";
import { DownloadButton } from "./components/DownloadButton";
import { ReviewActions } from "./components/ReviewActions";
import type { ApplicationDetail } from "./types";

export default function ApplicationPage() {
  const { id } = useParams();
  const session = useSession();
  const application = useQuery({
    queryKey: ["private", "application", id],
    enabled: !!session.data,
    queryFn: async () => (await api.get<ApplicationDetail>(`applications/${id}/`)).data,
  });
  if (session.isPending) return <Loading />;
  if (session.error) return <Failure error={session.error} />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (application.isPending) return <Loading />;
  if (application.error) return <Failure error={application.error} />;
  const value = application.data;
  return (
    <section className="page-section">
      <Link to="/portal">Your portal</Link>
      <h1 className="my-6 font-serif text-title">{value.state_code} application</h1>
      <p className="mb-6">
        {value.status} · Form version {value.form.version_number}
      </p>
      <Link to={`/caregivers/${value.caregiver}/onboarding`}>Open caregiver onboarding</Link>
      {value.packet_available ? (
        <DownloadButton
          path={`applications/${value.public_id}/packet/`}
          filename={`demo-packet-${value.state_code}-v${value.form.version_number}.pdf`}
          label="Download synthetic employment packet"
        />
      ) : (
        <p className="my-4">Packet unavailable for this legacy form.</p>
      )}
      {session.data.roles.some((role) => role === "super-admin" || role === "state-admin") ? (
        <ReviewActions
          key={value.status}
          id={value.public_id}
          status={value.status}
          kind="application"
        />
      ) : null}
      <dl className="mb-8 grid max-w-3xl gap-4">
        {Object.entries(value.submitted_answers).map(([key, answer]) => {
          const choices = value.form.field_schema.choices?.[key] ?? {};
          const readable = Array.isArray(answer)
            ? answer.map((item) => choices[item] ?? item).join(", ")
            : (choices[String(answer)] ?? String(answer));
          return (
            <div key={key}>
              <dt className="font-semibold capitalize">{key.replaceAll("_", " ")}</dt>
              <dd>{readable}</dd>
            </div>
          );
        })}
      </dl>
      <h2 className="mb-6 font-serif text-section">Review history</h2>
      {value.reviews.length === 0 ? <p>No review decisions yet.</p> : null}
      {value.reviews.map((review) => (
        <p key={review.public_id} className="mb-4">
          {review.previous_status} → {review.new_status} · {review.comment || "No comment"}
        </p>
      ))}
    </section>
  );
}
