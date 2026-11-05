import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { api } from '@/shared/services/api';
import { uploadDocument } from '@/shared/utils/documentUtils';

// Both API shapes are normalized here, never by presentation components.
export function useCaregiverDocuments(scope) {
  const { token, user } = useAuth();
  const enabled = Boolean(token && user?.id);
  const types = useQuery({
    queryKey: ['caregiver-documents', scope, 'types'],
    queryFn: ({ signal }) => api.get('/documents/types?role=caregiver', token, signal),
    enabled,
    staleTime: Infinity,
  });
  const records = useQuery({
    queryKey: ['caregiver-documents', scope, 'records'],
    queryFn: ({ signal }) => api.get('/documents/me', token, signal),
    enabled,
  });
  async function upload(draft) {
    await uploadDocument({ ...draft, token });
    try {
      await records.refetch({ throwOnError: true });
      return '';
    } catch {
      return 'Upload succeeded, but the document list could not be refreshed. Please reload the page.';
    }
  }
  return {
    docTypes: Array.isArray(types.data) ? types.data : types.data?.document_types || [],
    documents: records.data?.documents || [],
    loading: enabled && (types.isPending || records.isPending),
    error: types.isError || records.isError ? 'Failed to load credentials and required document types.' : '',
    reload: () => { types.refetch(); records.refetch(); },
    upload,
  };
}
