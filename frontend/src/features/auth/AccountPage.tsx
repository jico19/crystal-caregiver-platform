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
    <section className="form-page">
      <p className="eyebrow">Crystal Care / Account access</p>
      <h1>{titles[mode]}</h1>
      {mode === "invite" ? (
        <p>
          Already have an account? <Link to="/login">Sign in</Link>, then reopen this invitation to
          link it safely.
        </p>
      ) : null}
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        {mode === "login" || mode === "reset" ? (
          <Field label="Email" error={form.formState.errors.email}>
            <input type="email" autoComplete="email" required {...form.register("email")} />
          </Field>
        ) : null}
        {mode === "invite" ? (
          <Field label="Synthetic name" error={form.formState.errors.name}>
            <input required autoComplete="name" {...form.register("name")} />
          </Field>
        ) : null}
        {mode !== "reset" ? (
          <Field label="Password" error={form.formState.errors.password}>
            <input
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...form.register("password")}
            />
          </Field>
        ) : null}
        <Failure error={mutation.error} />
        {mutation.data?.detail ? <output className="notice">{mutation.data.detail}</output> : null}
        <button disabled={mutation.isPending}>
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
      <p>
        {mode === "login" ? (
          <Link to="/forgot-password">Forgot your password?</Link>
        ) : (
          <Link to="/login">Return to sign in</Link>
        )}
      </p>
      {mode === "login" ? (
        <p>
          New caregivers register by <Link to="/states/FL">applying to a public job posting</Link>.
        </p>
      ) : null}
    </section>
  );
}
