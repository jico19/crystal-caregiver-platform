import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, queryClient } from "../../api/client";
import { Failure } from "../../components/Failure";
import { Field } from "../../components/Forms";
import type { Session } from "../../api/types";

const schema = z.object({
  email: z.email("Enter a valid email.").or(z.literal("")),
  password: z.string(),
  name: z.string(),
});
type Values = z.infer<typeof schema>;
type Mode = "login" | "reset" | "confirm" | "invite";

const titles: Record<Mode, string> = {
  login: "Sign in to your portal",
  reset: "Reset your password",
  confirm: "Choose a new password",
  invite: "Accept your invitation",
};

export default function AccountPage({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", name: "" },
  });
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const routes = {
        login: "auth/login/",
        reset: "auth/password-reset/",
        confirm: "auth/password-reset/confirm/",
        invite: "auth/invitations/accept/",
      };
      const body =
        mode === "login"
          ? { email: values.email, password: values.password }
          : mode === "reset"
            ? { email: values.email }
            : mode === "confirm"
              ? {
                  password: values.password,
                  uid: params.get("uid") ?? "",
                  token: params.get("token") ?? "",
                }
              : {
                  name: values.name,
                  password: values.password,
                  token: params.get("token") ?? "",
                };

      return (await api.post<{ user?: Session; detail?: string }>(routes[mode], body)).data;
    },
    onSuccess: (data) => {
      if (data.user) {
        queryClient.clear();
        queryClient.setQueryData(["session"], data.user);
        navigate("/portal");
      }
    },
  });

  return (
    <section className="min-h-[70vh] max-w-[750px]">
      <p className="mb-6 text-[13px] text-[#4b6456]">Crystal Care / Account access</p>
      <h1 className="mb-6 font-serif text-[44px] leading-[1.08] tracking-[-1.8px] max-md:text-4xl">
        {titles[mode]}
      </h1>
      {mode === "invite" ? (
        <p className="mb-6 max-w-[62ch]">
          Already have an account? <Link to="/login">Sign in</Link>, then reopen this invitation to
          link it safely.
        </p>
      ) : null}
      <form
        className="my-8 grid gap-[22px]"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        {mode === "login" || mode === "reset" ? (
          <Field label="Email" error={form.formState.errors.email}>
            <input
              className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
              type="email"
              autoComplete="email"
              required
              {...form.register("email")}
            />
          </Field>
        ) : null}
        {mode === "invite" ? (
          <Field label="Synthetic name" error={form.formState.errors.name}>
            <input
              className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
              required
              autoComplete="name"
              {...form.register("name")}
            />
          </Field>
        ) : null}
        {mode !== "reset" ? (
          <Field label="Password" error={form.formState.errors.password}>
            <input
              className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...form.register("password")}
            />
          </Field>
        ) : null}
        <Failure error={mutation.error} />
        {mutation.data?.detail ? (
          <output className="border-l-[3px] border-[#577451] bg-[#edf0e9] p-[18px]">
            {mutation.data.detail}
          </output>
        ) : null}
        <button
          className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-semibold text-white transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Submitting…"
            : mode === "login"
              ? "Sign in"
              : mode === "reset"
                ? "Request reset link"
                : mode === "confirm"
                  ? "Save password"
                  : "Accept invitation"}
        </button>
      </form>
      <p className="mb-6 max-w-[62ch]">
        {mode === "login" ? (
          <Link to="/forgot-password">Forgot your password?</Link>
        ) : (
          <Link to="/login">Return to sign in</Link>
        )}
      </p>
      {mode === "login" ? (
        <p className="mb-6 max-w-[62ch]">
          New caregivers register by <Link to="/states/FL">applying to a public job posting</Link>.
        </p>
      ) : null}
    </section>
  );
}
