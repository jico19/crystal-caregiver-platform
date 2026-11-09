import { api } from '../../../shared/services/api';

export const authorizationsPath = '/clients/me/authorizations';
export const getAuthorizations = ({ token, signal }) =>
  api.get(authorizationsPath, token, signal);

export function toAuthorizationFormData({ file, startDate, endDate, notes }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('start_date', startDate);
  formData.append('end_date', endDate);
  if (notes.trim()) formData.append('notes', notes.trim());
  return formData;
}

export function uploadAuthorization(values, token) {
  return api.upload(authorizationsPath, toAuthorizationFormData(values), token);
}
