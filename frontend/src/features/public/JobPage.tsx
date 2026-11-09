import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, queryClient } from "../../api/client";
import type { Job, Session } from "../../api/types";
import { useSession } from "../auth/session";
import { Failure } from "../../components/Failure";
import { Field } from "../../components/Field";
import { Loading } from "../../components/Loading";

const schema = z.object({
  name: z.string().min(1, "Enter a synthetic name.").max(200),
  email: z.email("Enter a valid email."),
  password: z.string(),
  demo_acknowledged: z.boolean().refine(Boolean, "Acknowledge synthetic data only."),
});
type Values = z.infer<typeof schema>;

export default function JobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await api.get<Job>(`jobs/${id}/`)).data,
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", demo_acknowledged: false },
  });
  const submit = useMutation({
    mutationFn: async (values: Values) =>
      (
        await api.post<{ user: Session }>(
          `jobs/${id}/apply/`,
          session.data
            ? {
                name: values.name,
                email: session.data.email,
                demo_acknowledged: values.demo_acknowledged,
              }
            : values,
        )
      ).data,
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(["session"], data.user);
      navigate("/portal/caregiver?submitted=1");
    },
  });

  if (job.isPending || session.isPending) return <Loading />;
  if (job.error || session.error) return <Failure error={job.error || session.error} />;

  return (
    <section className="page-section min-h-[70vh] max-w-3xl">
      <p className="mb-6 text-caption text-muted-foreground">Careers / {job.data?.state_code}</p>
      <h1 className="mb-6 font-serif text-title max-md:text-4xl">{job.data?.title}</h1>
      <p className="mb-6 max-w-[62ch]">{job.data?.description}</p>
      <h2 className="mb-6 font-serif text-section">Submit a demo application</h2>
      <p className="mb-6 max-w-[62ch]">
        Submission creates your caregiver portal account. It does not approve you for work.
      </p>
      <form
        className="my-8 grid gap-5.5"
        onSubmit={form.handleSubmit((values) => submit.mutate(values))}
      >
        <Field label="Synthetic name" error={form.formState.errors.name}>
          <input className="form-control" {...form.register("name")} required />
        </Field>
        <Field label="Email" error={form.formState.errors.email}>
          <input
            className="form-control"
            type="email"
            {...form.register("email")}
            defaultValue={session.data?.email}
            readOnly={!!session.data}
            required
          />
        </Field>
        {!session.data ? (
          <Field label="Create password" error={form.formState.errors.password}>
            <input
              className="form-control"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              {...form.register("password")}
            />
          </Field>
        ) : null}
        <Field label="Demo data acknowledgement" error={form.formState.errors.demo_acknowledged}>
          <span className="flex items-start gap-3 font-normal">
            <input
              className="mt-0.5 size-5 shrink-0 accent-primary"
              type="checkbox"
              {...form.register("demo_acknowledged")}
            />
            I will use synthetic data only. This is an illustrative application.
          </span>
        </Field>
        <Failure error={submit.error} />
        <button className="button button-primary" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit demo application"}
        </button>
      </form>
    </section>
  );
}
