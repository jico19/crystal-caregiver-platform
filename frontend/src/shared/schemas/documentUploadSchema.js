import { z } from 'zod';
import { validateUploadedFile } from '../utils/validation';

export function documentUploadSchema(documentType, missingFileMessage) {
  return z
    .object({
      documentTypeId: z.string(),
      expirationDate: z.string(),
      file: z.any(),
    })
    .superRefine((values, ctx) => {
      const fail = (field, message) =>
        ctx.addIssue({ code: 'custom', path: [field], message });
      if (!values.file) return fail('file', missingFileMessage);
      const fileCheck = validateUploadedFile(values.file, { maxSizeMB: 10 });
      if (!fileCheck.valid) return fail('file', fileCheck.error);
      if (documentType?.requires_expiration && !values.expirationDate) {
        return fail(
          'expirationDate',
          `An expiration date is required for ${documentType.name}.`
        );
      }
      if (values.expirationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(values.expirationDate) < today) {
          fail(
            'expirationDate',
            'Document expiration date cannot be in the past.'
          );
        }
      }
    });
}
