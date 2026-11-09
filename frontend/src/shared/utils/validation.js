import { z } from 'zod';

const optionalTrimmedString = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined));

const trimName = (label, max) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

// Mirrors Pydantic rules in backend/app/schemas/caregivers.py, plus the
// signature requirement enforced in caregivers.py (_validate_signature).
export const caregiverApplicationSchema = z
  .object({
    state_id: z.coerce.number().int().min(1).max(3),
    first_name: trimName('First name', 100),
    last_name: trimName('Last name', 100),
    phone: optionalTrimmedString(20),
    address: z.string().trim().optional().or(z.literal('')),
    date_of_birth: z.string().optional().or(z.literal('')),
    ssn_last4: z
      .string()
      .regex(/^\d{4}$/, 'SSN last 4 must be exactly 4 digits.')
      .optional()
      .or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Portal password must be at least 8 characters.')
      .max(128)
      .optional()
      .or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
    signature_data: z
      .string({ required_error: 'Please draw your signature.' })
      .min(1, 'Please draw your signature.')
      .refine((v) => v.startsWith('data:image/'), 'Signature must be a drawn image.'),
    signed_name: trimName('Full legal name', 200),
  })
  .superRefine((values, ctx) => {
    if (values.password && values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export const applicationDefaultValues = {
  state_id: 1,
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  date_of_birth: '',
  ssn_last4: '',
  notes: '',
  email: '',
  password: '',
  confirmPassword: '',
  signature_data: '',
  signed_name: '',
};

export function toApplicationPayload(values, { includeAuth }) {
  const payload = {
    state_id: Number(values.state_id),
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone || null,
    address: values.address || null,
    date_of_birth: values.date_of_birth || null,
    ssn_last4: values.ssn_last4 || null,
    notes: values.notes || null,
    signature_data: values.signature_data,
    signed_name: values.signed_name,
  };
  if (includeAuth) {
    payload.email = values.email;
    payload.password = values.password;
  }
  return payload;
}

/**
 * Validates a password string against platform policy (min 8, max 128).
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters.' };
  }
  return { valid: true };
}

/**
 * Validates an email address.
 */
export function validateEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, value: trimmed.toLowerCase() };
}

/**
 * Validates US telephone number (optional or 10-11 digits).
 */
export function validatePhone(phone, required = false) {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    if (required) return { valid: false, error: 'Phone number is required.' };
    return { valid: true, value: null };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
    return { valid: true, value: trimmed };
  }
  return { valid: false, error: 'Please enter a valid 10-digit phone number.' };
}

/**
 * Validates SSN Last 4 digits (strict 4 numeric digits).
 */
export function validateSsnLast4(ssn, required = false) {
  const trimmed = (ssn || '').trim();
  if (!trimmed) {
    if (required) return { valid: false, error: 'SSN last 4 is required.' };
    return { valid: true, value: null };
  }
  if (!/^\d{4}$/.test(trimmed)) {
    return { valid: false, error: 'SSN last 4 must be exactly 4 numeric digits.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validates uploaded files by size and MIME/extension.
 */
export function validateUploadedFile(file, options = {}) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }
  const maxBytes = (options.maxSizeMB || 10) * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size exceeds the ${(options.maxSizeMB || 10)}MB maximum allowed limit.`,
    };
  }

  const allowedExts = options.allowedExtensions || ['.pdf', '.png', '.jpg', '.jpeg'];
  const name = (file.name || '').toLowerCase();
  const hasAllowedExt = allowedExts.some((ext) => name.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload a ${allowedExts.join(', ')} file.`,
    };
  }

  return { valid: true };
}

/**
 * Validates that visit start time is before end time.
 */
export function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) {
    return { valid: false, error: 'Both start time and end time are required.' };
  }
  if (startTime >= endTime) {
    return { valid: false, error: 'Visit end time must be after start time.' };
  }
  return { valid: true };
}

/**
 * Validates date range where start must precede end.
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Both start date and end date are required.' };
  }
  if (new Date(startDate) >= new Date(endDate)) {
    return { valid: false, error: 'End date must be after start date.' };
  }
  return { valid: true };
}