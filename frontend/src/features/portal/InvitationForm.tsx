import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../api/client";
import type { Session } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Field } from "../../components/Forms";

const invitationSchema = z.object({
  email: z.email(),
  branch: z.uuid(),
  role: z.enum(["client", "administrator"]),
});
type Invitation = z.infer<typeof invitationSchema>;

export function InvitationForm({ session }: { session: Session }) {
  const form = useForm<Invitation>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      branch: session.branches[0]?.public_id ?? "",
      role: "client",
    },
  });
  const send = useMutation({
    mutationFn: (data: Invitation) => api.post("auth/invitations/", data),
    onSuccess: () => form.resetField("email"),
  });

  return (
    <div className="panel">
      <h2>Invite a portal user</h2>
      <p>Invitations are recorded in the local demo email transport. No external email is sent.</p>
      <form onSubmit={form.handleSubmit((data) => send.mutate(data))}>
        <Field label="Synthetic email" error={form.formState.errors.email}>
          <input type="email" required {...form.register("email")} />
        </Field>
        <Field label="Branch" error={form.formState.errors.branch}>
          <select {...form.register("branch")}>
            {session.branches.map((branch) => (
              <option key={branch.public_id} value={branch.public_id}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Portal role">
          <select {...form.register("role")}>
            <option value="client">Client</option>
            {session.roles.includes("super-admin") ? (
              <option value="administrator">State administrator</option>
            ) : null}
          </select>
        </Field>
        <Failure error={send.error} />
        {send.isSuccess ? (
          <output>Invitation recorded. Open the link from the backend console.</output>
        ) : null}
        <button disabled={send.isPending}>Create demo invitation</button>
      </form>
    </div>
  );
}
