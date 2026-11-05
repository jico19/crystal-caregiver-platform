import { expect, test } from 'vitest';
import { caregiverApplicationSchema, applicationDefaultValues, toApplicationPayload } from './applicationModel';

const values = { ...applicationDefaultValues, state_id: '2', first_name: 'Test', last_name: 'Applicant',
  email: 'applicant@example.test', password: 'example-password', confirmPassword: 'example-password',
  signature_data: 'data:image/png;base64,fixture', signed_name: 'Test Applicant' };

test('signature evidence and jurisdiction survive payload mapping; credentials are public-submission only', () => {
  const valid = caregiverApplicationSchema.parse(values);
  expect(toApplicationPayload(valid, { includeAuth: true })).toMatchObject({ state_id: 2,
    signature_data: values.signature_data, signed_name: values.signed_name, email: values.email, password: values.password });
  const privatePayload = toApplicationPayload(valid, { includeAuth: false });
  expect(privatePayload).not.toHaveProperty('password');
  expect(privatePayload).not.toHaveProperty('email');
  expect(privatePayload).not.toHaveProperty('confirmPassword');
});

test('missing image signature and mismatched credentials remain invalid', () => {
  expect(caregiverApplicationSchema.safeParse({ ...values, signature_data: 'typed signature' }).success).toBe(false);
  expect(caregiverApplicationSchema.safeParse({ ...values, confirmPassword: 'different' }).success).toBe(false);
});
