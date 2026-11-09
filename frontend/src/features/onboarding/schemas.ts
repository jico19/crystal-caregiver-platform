import { z } from "zod";

export const reviewSchema = z
  .object({ decision: z.string().min(1), comment: z.string().max(2000) })
  .superRefine((value, context) => {
    if (value.decision === "rejected" && !value.comment.trim())
      context.addIssue({ code: "custom", path: ["comment"], message: "Enter a rejection reason." });
  });
export type ReviewValues = z.infer<typeof reviewSchema>;
export const uploadSchema = z.object({
  document_type: z.string().min(1),
  fixture_id: z.string().min(1),
  issued_on: z.string(),
  expires_on: z.string(),
  demo_acknowledged: z.boolean().refine(Boolean, "Acknowledge synthetic data only."),
});
export type UploadValues = z.infer<typeof uploadSchema>;
