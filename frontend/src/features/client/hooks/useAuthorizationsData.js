import { useMemo } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import { downloadDocument } from '../../../shared/utils/documentUtils';
import {
  authorizationsPath,
  getAuthorizations,
} from '../services/authorizationService';
import { authorizationTotals } from '../utils/authorizationUnits';

export default function useAuthorizationsData() {
  const { token } = useAuth();
  const query = useFetch(authorizationsPath, {
    enabled: !!token,
    defaultData: { authorizations: [] },
    fetcher: getAuthorizations,
  });
  const authorizations = useMemo(
    () =>
      query.data?.authorizations ||
      (Array.isArray(query.data) ? query.data : []),
    [query.data]
  );
  const activeAuths = useMemo(
    () =>
      authorizations.filter(
        (a) => a.status === 'active' || a.status === 'expiring_soon'
      ),
    [authorizations]
  );
  const totals = useMemo(() => authorizationTotals(activeAuths), [activeAuths]);
  return {
    token,
    authorizations,
    activeAuths,
    ...totals,
    loading: query.isLoading,
    fetchError: query.error,
    onUploaded: query.refetch,
    openDocument: (id) => {
      if (id) downloadDocument(id, token);
    },
  };
}
