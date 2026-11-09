import { api } from '../../../shared/services/api';
import { getMyDocuments } from '../../../shared/services/documentService';

export async function getClientDocumentRecords(token) {
  const [documents, docStatus] = await Promise.all([
    getMyDocuments(token),
    api.get('/clients/me/document-status', token),
  ]);
  return { documents, docStatus: docStatus || null };
}
