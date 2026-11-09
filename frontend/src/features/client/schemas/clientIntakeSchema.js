import { z } from 'zod';
import { validatePhone } from '../../../shared/utils/validation';

export function clientIntakeDefaults(profile, user) {
  return {
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    dateOfBirth: profile?.date_of_birth || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    medicaidNumber: profile?.medicaid_number || '',
    stateId: String(profile?.state_id || user?.state_id || '1'),
    signatureData: null,
    signedName:
      profile?.signed_name ||
      `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
  };
}

export const clientIntakeSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    phone: z.string(),
    address: z.string(),
    medicaidNumber: z.string(),
    stateId: z.string(),
    signatureData: z.string().nullable(),
    signedName: z.string(),
  })
  .superRefine((values, ctx) => {
    const fail = (field, message) =>
      ctx.addIssue({ code: 'custom', path: [field], message });
    if (!values.signatureData) {
      return fail(
        'signatureData',
        'Please draw your signature to verify and authorize this intake submission.'
      );
    }
    if (!values.signedName.trim()) {
      return fail(
        'signedName',
        'Please enter your full legal name to complete the signature.'
      );
    }
    if (values.dateOfBirth && new Date(values.dateOfBirth) > new Date()) {
      return fail('dateOfBirth', 'Date of birth cannot be in the future.');
    }
    const phoneCheck = validatePhone(values.phone);
    if (!phoneCheck.valid) return fail('phone', phoneCheck.error);
    if (values.medicaidNumber.trim().length > 50) {
      fail(
        'medicaidNumber',
        'Medicaid ID / Insurance number must not exceed 50 characters.'
      );
    }
  });
