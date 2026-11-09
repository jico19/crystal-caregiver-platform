import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import type { Page } from "../../api/types";
import { Loading } from "../../components/Loading";
import { Failure } from "../../components/Failure";
import { useSession } from "../auth/session";
import { Checklist } from "./components/Checklist";
import { FixtureUpload } from "./components/FixtureUpload";
import { DocumentHistory } from "./components/DocumentHistory";
import type { Onboarding, DocumentRecord } from "./types";

export default function OnboardingPage() {
  const { id } = useParams();
  const session = useSession();
  const onboarding = useQuery({
    queryKey: ["private", "onboarding", id],
    enabled: !!session.data,
    queryFn: async () => (await api.get<Onboarding>(`caregivers/${id}/onboarding/`)).data,
  });
  const documents = useQuery({
    queryKey: ["private", "documents", id],
    enabled: !!session.data,
    queryFn: async () => (await api.get<Page<DocumentRecord>>(`caregivers/${id}/documents/`)).data,
  });
  if (session.isPending) return <Loading />;
  if (session.error) return <Failure error={session.error} />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (onboarding.isPending) return <Loading />;
  if (onboarding.error) return <Failure error={onboarding.error} />;
  const value = onboarding.data;
  return (
    <section className="page-section">
      <Link to="/portal">Your portal</Link>
      <h1 className="my-6 font-serif text-title">{value.name}</h1>
      <p>
        {value.state_code} ·{" "}
        {value.status === "eligible" ? "Demo onboarding complete" : value.status}
      </p>
      <p className="mt-3">
        Application approved: {value.application_approved ? "Yes" : "No"}. Current readiness:{" "}
        {value.ready_to_complete ? "Ready" : "Requirements pending"}.
      </p>
      <Checklist value={value} />
      {value.allowed_actions.upload ? (
        <FixtureUpload caregiver={value.caregiver} requirements={value.requirements} />
      ) : null}
      {documents.isPending ? <Loading /> : null}
      <Failure error={documents.error} />
      {documents.data ? (
        <DocumentHistory
          documents={documents.data.results}
          canReview={value.allowed_actions.review}
        />
      ) : null}
      <h2 className="my-6 font-serif text-section">Onboarding milestone history</h2>
      {value.history.length === 0 ? <p>No onboarding milestones yet.</p> : null}
      {value.history.map((event) => (
        <p key={event.public_id}>
          {event.new_status === "eligible" ? "Demo onboarding complete" : event.new_status} ·{" "}
          {new Date(event.occurred_at).toLocaleString()}
        </p>
      ))}
    </section>
  );
}
