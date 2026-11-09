import { api } from '../../../shared/services/api';

export const clientIntakePaths = {
  profile: '/clients/me',
  documentStatus: '/clients/me/document-status',
  agreements: '/clients/me/agreements',
};

export const getIntakeProfile = ({ token, signal }) =>
  api.get(clientIntakePaths.profile, token, signal);
export const getIntakeDocumentStatus = ({ token, signal }) =>
  api.get(clientIntakePaths.documentStatus, token, signal);
export const getIntakeAgreements = ({ token, signal }) =>
  api.get(clientIntakePaths.agreements, token, signal);

export function toClientIntakePayload(values) {
  return {
    state_id: parseInt(values.stateId, 10),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    date_of_birth: values.dateOfBirth || null,
    phone: values.phone.trim() || null,
    address: values.address.trim() || null,
    medicaid_number: values.medicaidNumber.trim() || null,
    signature_data: values.signatureData,
    signed_name: values.signedName.trim(),
  };
}

export function submitClientIntake(values, token) {
  return api.post('/clients/intake', toClientIntakePayload(values), token);
}
