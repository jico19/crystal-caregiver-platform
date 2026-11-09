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
    <section className="min-h-[70vh] max-w-[750px]">
      <p className="mb-6 text-[13px] text-[#4b6456]">Careers / {job.data?.state_code}</p>
      <h1 className="mb-6 font-serif text-[44px] leading-[1.08] tracking-[-1.8px] max-md:text-4xl">
        {job.data?.title}
      </h1>
      <p className="mb-6 max-w-[62ch]">{job.data?.description}</p>
      <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
        Submit a demo application
      </h2>
      <p className="mb-6 max-w-[62ch]">
        Submission creates your caregiver portal account. It does not approve you for work.
      </p>
      <form
        className="my-8 grid gap-[22px]"
        onSubmit={form.handleSubmit((values) => submit.mutate(values))}
      >
        <Field label="Synthetic name" error={form.formState.errors.name}>
          <input
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            {...form.register("name")}
            required
          />
        </Field>
        <Field label="Email" error={form.formState.errors.email}>
          <input
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
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
              className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
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
              className="h-5 w-5 accent-[#27543f]"
              type="checkbox"
              {...form.register("demo_acknowledged")}
            />
            I will use synthetic data only. This is an illustrative application.
          </span>
        </Field>
        <Failure error={submit.error} />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-semibold text-white transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
          disabled={submit.isPending}
        >
          {submit.isPending ? "Submitting…" : "Submit demo application"}
        </button>
      </form>
    </section>
  );
}
