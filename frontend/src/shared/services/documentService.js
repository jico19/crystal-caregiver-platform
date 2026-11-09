import { api } from './api';

export const documentTypesPath = '/documents/types';

export function getDocumentTypes({ params, token, signal }) {
  const query = new URLSearchParams(params);
  return api.get(`${documentTypesPath}?${query}`, token, signal);
}

export function getMyDocuments(token) {
  return api
    .get('/documents/me', token)
    .then((response) => response?.documents || []);
}

export async function downloadDocument(docId, token) {
  try {
    const res = await api.get(`/documents/${docId}/download-url`, token);
    if (res?.download_url) {
      window.open(res.download_url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    alert(err?.detail || 'Could not retrieve download link. Please refresh.');
  }
}

export async function uploadDocument({
  file,
  documentTypeId,
  expirationDate,
  token,
}) {
  const intent = await api.post(
    '/documents/upload-intent',
    {
      document_type_id: documentTypeId,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      expiration_date: expirationDate || undefined,
    },
    token
  );

  if (!intent?.upload_url) {
    throw new Error('Upload authorization failed. Please try again.');
  }

  const putRes = await fetch(intent.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error('File upload to secure storage failed. Please re-submit.');
  }

  return intent.document_id;
}
