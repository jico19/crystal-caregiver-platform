// Focused schema, payload, and unit-conversion checks. Run: node scripts/verify-workflow-contracts.mjs
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { middlewareMode: true },
});
let checks = 0;
function check(name, assertion) {
  assertion();
  checks += 1;
  console.log(`PASS ${name}`);
}
const firstError = (schema, values) =>
  schema.safeParse(values).error?.issues[0]?.message;

try {
  const { clientIntakeDefaults, clientIntakeSchema } =
    await server.ssrLoadModule(
      '/src/features/client/schemas/clientIntakeSchema.js'
    );
  const { toClientIntakePayload, submitClientIntake } =
    await server.ssrLoadModule(
      '/src/features/client/services/clientIntakeService.js'
    );
  const { authorizationUploadSchema } = await server.ssrLoadModule(
    '/src/features/client/schemas/authorizationUploadSchema.js'
  );
  const { toAuthorizationFormData, uploadAuthorization } =
    await server.ssrLoadModule(
      '/src/features/client/services/authorizationService.js'
    );
  const { documentUploadSchema } = await server.ssrLoadModule(
    '/src/shared/schemas/documentUploadSchema.js'
  );
  const { authorizationAllowance, authorizationTotals } =
    await server.ssrLoadModule(
      '/src/features/client/utils/authorizationUnits.js'
    );
  const { api } = await server.ssrLoadModule('/src/shared/services/api.js');

  const defaults = clientIntakeDefaults(null, { state_id: 2 });
  const intake = {
    ...defaults,
    firstName: ' Synthetic ',
    lastName: ' Recipient ',
    signatureData: 'data:image/png;base64,synthetic',
    signedName: ' Synthetic Signer ',
    phone: ' (555) 123-4567 ',
  };
  check('intake profile and user defaults', () => {
    assert.equal(defaults.stateId, '2');
    assert.equal(
      clientIntakeDefaults(
        { state_id: 3, first_name: 'Synthetic', last_name: 'Recipient' },
        { state_id: 2 }
      ).signedName,
      'Synthetic Recipient'
    );
    assert.equal(
      clientIntakeDefaults({ state_id: 3 }, { state_id: 2 }).stateId,
      '3'
    );
  });
  check('intake schema retains validation messages and order', () => {
    assert.equal(
      firstError(clientIntakeSchema, {
        ...intake,
        signatureData: null,
        phone: '123',
      }),
      'Please draw your signature to verify and authorize this intake submission.'
    );
    assert.equal(
      firstError(clientIntakeSchema, { ...intake, signedName: ' ' }),
      'Please enter your full legal name to complete the signature.'
    );
    assert.equal(
      firstError(clientIntakeSchema, { ...intake, dateOfBirth: '2099-01-01' }),
      'Date of birth cannot be in the future.'
    );
    assert.equal(
      firstError(clientIntakeSchema, { ...intake, phone: '123' }),
      'Please enter a valid 10-digit phone number.'
    );
    assert.equal(
      firstError(clientIntakeSchema, {
        ...intake,
        medicaidNumber: 'x'.repeat(51),
      }),
      'Medicaid ID / Insurance number must not exceed 50 characters.'
    );
    assert.equal(
      clientIntakeSchema.safeParse({
        ...intake,
        medicaidNumber: 'x'.repeat(50),
      }).success,
      true
    );
  });
  check('intake payload trims values and preserves nulls', () => {
    assert.deepEqual(toClientIntakePayload(intake), {
      state_id: 2,
      first_name: 'Synthetic',
      last_name: 'Recipient',
      date_of_birth: null,
      phone: '(555) 123-4567',
      address: null,
      medicaid_number: null,
      signature_data: intake.signatureData,
      signed_name: 'Synthetic Signer',
    });
    assert.equal(
      toClientIntakePayload({
        ...intake,
        phone: ' ',
        address: ' ',
        medicaidNumber: ' ',
      }).phone,
      null
    );
  });

  const file = new File(['synthetic'], 'synthetic.pdf', {
    type: 'application/pdf',
  });
  const authorization = {
    file,
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    notes: ' Synthetic renewal ',
  };
  check('authorization file and date requirements', () => {
    assert.equal(
      firstError(authorizationUploadSchema, { ...authorization, file: null }),
      'Please select your official authorization document or letter.'
    );
    assert.equal(
      firstError(authorizationUploadSchema, {
        ...authorization,
        startDate: '',
      }),
      'Coverage start and end dates are required.'
    );
    assert.equal(
      firstError(authorizationUploadSchema, {
        ...authorization,
        endDate: '2026-12-31',
      }),
      'End date must be on or after start date.'
    );
    assert.equal(
      authorizationUploadSchema.safeParse(authorization).success,
      true
    );
  });
  check('authorization multipart fields and optional notes', () => {
    const form = toAuthorizationFormData(authorization);
    assert.deepEqual(
      [...form.keys()],
      ['file', 'start_date', 'end_date', 'notes']
    );
    assert.equal(form.get('file').name, file.name);
    assert.equal(form.get('notes'), 'Synthetic renewal');
    assert.equal(
      toAuthorizationFormData({ ...authorization, notes: ' ' }).has('notes'),
      false
    );
  });
  const requiredType = {
    name: 'Synthetic Required Card',
    requires_expiration: true,
  };
  const required = documentUploadSchema(
    requiredType,
    'Please select a file to upload.'
  );
  const optional = documentUploadSchema(
    { requires_expiration: false },
    'Please select a PDF or image file to upload.'
  );
  const upload = { documentTypeId: '1', file, expirationDate: '2099-01-01' };
  check(
    'shared document validation keeps role messages and expiry rules',
    () => {
      assert.equal(
        firstError(required, { ...upload, file: null }),
        'Please select a file to upload.'
      );
      assert.equal(
        firstError(optional, { ...upload, file: null }),
        'Please select a PDF or image file to upload.'
      );
      assert.equal(
        firstError(required, { ...upload, expirationDate: '' }),
        'An expiration date is required for Synthetic Required Card.'
      );
      assert.equal(
        firstError(required, { ...upload, expirationDate: '2000-01-01' }),
        'Document expiration date cannot be in the past.'
      );
      assert.equal(
        optional.safeParse({ ...upload, expirationDate: '' }).success,
        true
      );
    }
  );
  check('shared document file extension and exact 10 MiB boundary', () => {
    assert.equal(
      firstError(required, {
        ...upload,
        file: { name: 'synthetic.exe', size: 1 },
      }),
      'Unsupported file type. Please upload a .pdf, .png, .jpg, .jpeg file.'
    );
    assert.equal(
      required.safeParse({
        ...upload,
        file: { name: 'synthetic.PDF', size: 10 * 1024 * 1024 },
      }).success,
      true
    );
    assert.equal(
      firstError(required, {
        ...upload,
        file: { name: 'synthetic.pdf', size: 10 * 1024 * 1024 + 1 },
      }),
      'File size exceeds the 10MB maximum allowed limit.'
    );
  });
  check('authorization quarter-hour and hour totals', () => {
    const totals = authorizationTotals([
      { total_units_authorized: 100, units_used: 20 },
      { total_units_authorized: 10, units_used: 3, unit_type: 'hour' },
    ]);
    assert.deepEqual(totals, {
      totalRemainingHours: 27,
      totalAuthorizedHours: 35,
      totalUsedHours: 8,
      totalRemainingUnits: 87,
      overallPercent: 23,
    });
  });
  check(
    'authorization server overrides, zero, null and over-limit behavior',
    () => {
      const override = authorizationAllowance({
        total_units_authorized: 100,
        units_used: 120,
        units_remaining: -20,
        total_hours: '30',
        remaining_hours: '0',
        hours_used: '30',
      });
      assert.equal(override.remHours, 0);
      assert.equal(override.totalHours, 30);
      assert.equal(override.usedHours, 30);
      assert.equal(override.pct, 100);
      assert.equal(override.progressBg, 'bg-rose-500');
      assert.equal(
        authorizationAllowance({ remaining_hours: null }).remHours,
        0
      );
      assert.equal(authorizationTotals([]).overallPercent, 0);
    }
  );

  const calls = [];
  api.post = async (...args) => {
    calls.push(['POST', ...args]);
  };
  api.upload = async (...args) => {
    calls.push(['UPLOAD', ...args]);
  };
  await submitClientIntake(intake, 'synthetic-token');
  await uploadAuthorization(authorization, 'synthetic-token');
  check(
    'intake and authorization services retain paths, methods and auth',
    () => {
      assert.deepEqual(calls[0], [
        'POST',
        '/clients/intake',
        toClientIntakePayload(intake),
        'synthetic-token',
      ]);
      assert.equal(calls[1][0], 'UPLOAD');
      assert.equal(calls[1][1], '/clients/me/authorizations');
      assert.equal(calls[1][3], 'synthetic-token');
    }
  );
  console.log(`Completed ${checks} focused workflow contract checks.`);
} finally {
  await server.close();
}
