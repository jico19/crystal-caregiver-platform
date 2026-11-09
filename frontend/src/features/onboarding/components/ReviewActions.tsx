import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, queryClient } from "../../../api/client";
import { Failure } from "../../../components/Failure";
import { Field } from "../../../components/Field";
import { reviewSchema, type ReviewValues } from "../schemas";

export function ReviewActions({
  id,
  status,
  kind,
}: {
  id: string;
  status: string;
  kind: "application" | "document";
}) {
  const targets =
    kind === "document"
      ? status === "pending"
        ? ["approved", "rejected"]
        : []
      : status === "submitted"
        ? ["under_review"]
        : status === "under_review"
          ? ["approved", "rejected"]
          : [];
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { decision: targets[0] ?? "", comment: "" },
  });
  const mutation = useMutation({
    mutationFn: (value: ReviewValues) =>
      api.post(
        kind === "application"
          ? `applications/${id}/transitions/`
          : `document-versions/${id}/reviews/`,
        kind === "application"
          ? { expected_status: status, new_status: value.decision, comment: value.comment }
          : { expected_status: status, ...value },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["private"] }),
  });
  if (!targets.length) return <p className="my-4 text-muted-foreground">This review is final.</p>;
  return (
    <form
      className="my-6 grid max-w-xl gap-4"
      onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
    >
      <Field label="Review decision" error={form.formState.errors.decision}>
        <select className="form-control" {...form.register("decision")}>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Review reason (required for rejection)" error={form.formState.errors.comment}>
        <textarea className="form-control" maxLength={2000} {...form.register("comment")} />
      </Field>
      <Failure error={mutation.error} />
      {mutation.error ? (
        <button
          type="button"
          className="button button-outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["private"] })}
        >
          Refresh current status
        </button>
      ) : null}
      <button className="button button-primary" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
