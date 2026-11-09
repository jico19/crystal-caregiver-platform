import type { UseFormReturn } from "react-hook-form";
import { Field } from "../../../components/Field";
import type { ApplicationValues } from "../schemas";

export function ExtendedAnswers({
  form,
  choices,
}: {
  form: UseFormReturn<ApplicationValues>;
  choices: Record<string, Record<string, string>>;
}) {
  return (
    <>
      <Field label="Experience" error={form.formState.errors.experience}>
        <select className="form-control" required {...form.register("experience")}>
          <option value="">Select experience</option>
          {Object.entries(choices.experience ?? {}).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-semibold">Availability (select at least one)</legend>
        {Object.entries(choices.availability ?? {}).map(([value, label]) => (
          <label key={value} className="flex items-center gap-3">
            <input
              className="size-5 accent-primary"
              type="checkbox"
              value={value}
              {...form.register("availability")}
            />
            {label}
          </label>
        ))}
        {form.formState.errors.availability ? (
          <p role="alert" className="text-destructive">
            {form.formState.errors.availability.message}
          </p>
        ) : null}
      </fieldset>
    </>
  );
}
