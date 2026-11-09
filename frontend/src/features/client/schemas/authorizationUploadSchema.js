import { z } from 'zod';
import { validateUploadedFile } from '../../../shared/utils/validation';

export const authorizationUploadSchema = z
  .object({
    file: z.any(),
    startDate: z.string(),
    endDate: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    const fail = (field, message) =>
      ctx.addIssue({ code: 'custom', path: [field], message });
    if (!values.file)
      return fail(
        'file',
        'Please select your official authorization document or letter.'
      );
    const fileCheck = validateUploadedFile(values.file, { maxSizeMB: 10 });
    if (!fileCheck.valid) return fail('file', fileCheck.error);
    if (!values.startDate || !values.endDate)
      return fail('startDate', 'Coverage start and end dates are required.');
    if (new Date(values.endDate) < new Date(values.startDate)) {
      fail('endDate', 'End date must be on or after start date.');
    }
  });

export const authorizationUploadDefaults = {
  file: null,
  startDate: '',
  endDate: '',
  notes: '',
};
