import type { DocumentRecord } from "../types";
import { DownloadButton } from "./DownloadButton";
import { ReviewActions } from "./ReviewActions";

export function DocumentHistory({
  documents,
  canReview,
}: {
  documents: DocumentRecord[];
  canReview: boolean;
}) {
  return (
    <section className="my-10">
      <h2 className="mb-6 font-serif text-section">Document versions and reviews</h2>
      {documents.length === 0 ? <p>No documents uploaded.</p> : null}
      {documents.map((document) => (
        <article
          key={document.public_id}
          className="mb-8 rounded-control border border-border bg-card p-6"
        >
          <h3 className="mb-4 text-xl font-semibold">{document.label}</h3>
          {document.versions.map((version) => (
            <div key={version.public_id} className="border-t border-border py-4">
              <p>
                Version {version.version_number} · {version.review_status}
                {document.effective_version === version.public_id
                  ? " · Effective approved version"
                  : ""}
              </p>
              <p>Expires: {version.expires_on ?? "Not tracked"}</p>
              {version.reviews.map((review) => (
                <p key={review.public_id} className="my-2">
                  {review.decision}: {review.comment || "No comment"}
                </p>
              ))}
              <DownloadButton
                path={`document-versions/${version.public_id}/download/`}
                filename={`synthetic-${document.document_type}-v${version.version_number}`}
                label={`Download ${document.label} version ${version.version_number}`}
              />
              {canReview ? (
                <ReviewActions
                  key={version.review_status}
                  id={version.public_id}
                  status={version.review_status}
                  kind="document"
                />
              ) : null}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
