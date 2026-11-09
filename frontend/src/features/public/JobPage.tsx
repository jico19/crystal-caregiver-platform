import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, queryClient } from "../../api/client";
import type { Job, Session } from "../../api/types";
import { useSession } from "../auth/session";
import { Failure } from "../../components/Failure";
import { Field } from "../../components/Forms";
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
    <section className="form-page">
      <p className="eyebrow">Careers / {job.data?.state_code}</p>
      <h1>{job.data?.title}</h1>
      <p>{job.data?.description}</p>
      <h2>Submit a demo application</h2>
      <p>Submission creates your caregiver portal account. It does not approve you for work.</p>
      <form onSubmit={form.handleSubmit((values) => submit.mutate(values))}>
        <Field label="Synthetic name" error={form.formState.errors.name}>
          <input {...form.register("name")} required />
        </Field>
        <Field label="Email" error={form.formState.errors.email}>
          <input
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
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              {...form.register("password")}
            />
          </Field>
        ) : null}
        <Field label="Demo data acknowledgement" error={form.formState.errors.demo_acknowledged}>
          <span className="check">
            <input type="checkbox" {...form.register("demo_acknowledged")} />
            I will use synthetic data only. This is an illustrative application.
          </span>
        </Field>
        <Failure error={submit.error} />
        <button disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit demo application"}
        </button>
      </form>
    </section>
  );
}
