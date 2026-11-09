import { z } from "zod";

export const applicationSchema = (extended: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, "Enter a synthetic name.").max(200),
      email: z.email("Enter a valid email."),
      password: z.string(),
      experience: z.string(),
      availability: z.array(z.string()),
      demo_acknowledged: z.boolean().refine(Boolean, "Acknowledge synthetic data only."),
    })
    .superRefine((value, context) => {
      if (extended && !value.experience)
        context.addIssue({ code: "custom", path: ["experience"], message: "Select experience." });
      if (extended && !value.availability.length)
        context.addIssue({
          code: "custom",
          path: ["availability"],
          message: "Select availability.",
        });
    });
export type ApplicationValues = z.infer<ReturnType<typeof applicationSchema>>;
