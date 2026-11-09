import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, queryClient } from "../../../api/client";
import { Failure } from "../../../components/Failure";
import { Field } from "../../../components/Field";
import { Loading } from "../../../components/Loading";
import { uploadSchema, type UploadValues } from "../schemas";
import type { Fixture, Requirement } from "../types";

export function FixtureUpload({
  caregiver,
  requirements,
}: {
  caregiver: string;
  requirements: Requirement[];
}) {
  const fixtures = useQuery({
    queryKey: ["demo-fixtures"],
    queryFn: async () => {
      const response = await fetch("/demo-fixtures/manifest.json");
      if (!response.ok) throw new Error("Fixture catalog unavailable.");
      return (await response.json()) as Fixture[];
    },
  });
  const form = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      document_type: requirements[0]?.document_type ?? "",
      fixture_id: "",
      issued_on: "",
      expires_on: "",
      demo_acknowledged: false,
    },
  });
  const selected = useWatch({ control: form.control, name: "document_type" });
  const requirement = requirements.find((item) => item.document_type === selected);
  const upload = useMutation({
    mutationFn: async (values: UploadValues) => {
      const fixture = fixtures.data?.find(
        (item) => item.fixture_id === values.fixture_id && item.category === values.document_type,
      );
      if (!fixture) throw new Error("Choose a fixture for this category.");
      const response = await fetch(`/demo-fixtures/${fixture.filename}`);
      if (!response.ok) throw new Error("Fixture unavailable.");
      const data = new FormData();
      data.set("file", await response.blob(), fixture.filename);
      data.set("document_type", values.document_type);
      data.set("fixture_id", values.fixture_id);
      data.set("demo_acknowledged", String(values.demo_acknowledged));
      if (requirement?.tracks_expiration) {
        if (values.issued_on) data.set("issued_on", values.issued_on);
        if (values.expires_on) data.set("expires_on", values.expires_on);
      }
      return api.post(`caregivers/${caregiver}/documents/`, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["private"] }),
  });
  if (fixtures.isPending) return <Loading />;
  if (fixtures.error) return <Failure error={fixtures.error} />;
  return (
    <form
      className="my-8 grid max-w-xl gap-4"
      onSubmit={form.handleSubmit((values) => upload.mutate(values))}
    >
      <h2 className="font-serif text-section">Upload a synthetic fixture</h2>
      <p>Generated placeholders only. No real documents or local files are accepted.</p>
      <Field label="Document category">
        <select
          className="form-control"
          {...form.register("document_type", { onChange: () => form.setValue("fixture_id", "") })}
        >
          {requirements.map((item) => (
            <option key={item.document_type} value={item.document_type}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Generated fixture" error={form.formState.errors.fixture_id}>
        <select className="form-control" required {...form.register("fixture_id")}>
          <option value="">Select a generated fixture</option>
          {fixtures.data
            .filter((item) => item.category === selected)
            .map((item) => (
              <option key={item.fixture_id} value={item.fixture_id}>
                {item.filename}
              </option>
            ))}
        </select>
      </Field>
      {requirement?.tracks_expiration ? (
        <>
          <Field label="Issued on (optional)">
            <input className="form-control" type="date" {...form.register("issued_on")} />
          </Field>
          <Field label="Expires on">
            <input className="form-control" type="date" required {...form.register("expires_on")} />
          </Field>
        </>
      ) : null}
      <Field
        label="Synthetic fixture acknowledgement"
        error={form.formState.errors.demo_acknowledged}
      >
        <input
          className="size-5 accent-primary"
          type="checkbox"
          {...form.register("demo_acknowledged")}
        />
      </Field>
      <Failure error={upload.error} />
      {upload.isSuccess ? <output>Fixture uploaded for review.</output> : null}
      <button className="button button-primary" disabled={upload.isPending}>
        {upload.isPending ? "Uploading…" : "Upload generated fixture"}
      </button>
    </form>
  );
}
