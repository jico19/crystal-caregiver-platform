export type PublishedForm = {
  public_id: string;
  version_number: number;
  field_schema: { fields: string[]; choices?: Record<string, Record<string, string>> };
};
export type Review = {
  public_id: string;
  previous_status: string;
  new_status: string;
  comment: string;
  reviewed_at: string;
};
export type ApplicationDetail = {
  public_id: string;
  caregiver: string;
  state_code: string;
  status: string;
  submitted_at: string;
  submitted_answers: Record<string, string | string[] | boolean>;
  form: PublishedForm;
  reviews: Review[];
  packet_available: boolean;
};

export type Fixture = {
  fixture_id: string;
  category: string;
  filename: string;
  media_type: string;
  byte_size: number;
  sha256: string;
};
export type Requirement = {
  document_type: string;
  label: string;
  required: boolean;
  tracks_expiration: boolean;
  state: string;
  expires_on: string | null;
  effective_version: string | null;
  latest_version: { public_id: string; version_number: number; review_status: string } | null;
};
export type Onboarding = {
  caregiver: string;
  name: string;
  state_code: string;
  status: string;
  ready_to_complete: boolean;
  application_approved: boolean;
  requirements: Requirement[];
  counts: Record<string, number>;
  history: {
    public_id: string;
    new_status: string;
    occurred_at: string;
    evidence: Record<string, unknown>;
  }[];
  allowed_actions: { upload: boolean; complete: boolean; review: boolean };
};
export type DocumentVersion = {
  public_id: string;
  version_number: number;
  review_status: string;
  issued_on: string | null;
  expires_on: string | null;
  submitted_at: string;
  reviews: { public_id: string; decision: string; comment: string; reviewed_at: string }[];
};
export type DocumentRecord = {
  public_id: string;
  document_type: string;
  label: string;
  effective_version: string | null;
  versions: DocumentVersion[];
};
