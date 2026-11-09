import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../api/client";
import type { Session } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Field } from "../../components/Forms";
import { Panel } from "../../components/Panel";

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
    <Panel>
      <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
        Invite a portal user
      </h2>
      <p className="mb-6 max-w-[62ch]">
        Invitations are recorded in the local demo email transport. No external email is sent.
      </p>
      <form
        className="my-8 grid gap-[22px]"
        onSubmit={form.handleSubmit((data) => send.mutate(data))}
      >
        <Field label="Synthetic email" error={form.formState.errors.email}>
          <input
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            type="email"
            required
            {...form.register("email")}
          />
        </Field>
        <Field label="Branch" error={form.formState.errors.branch}>
          <select
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            {...form.register("branch")}
          >
            {session.branches.map((branch) => (
              <option key={branch.public_id} value={branch.public_id}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Portal role">
          <select
            className="w-full rounded border border-[#a6b7a7] bg-white p-3 text-[#263832] focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
            {...form.register("role")}
          >
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
        <button
          className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-semibold text-white transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
          disabled={send.isPending}
        >
          Create demo invitation
        </button>
      </form>
    </Panel>
  );
}
