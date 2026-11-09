import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import {
  clientIntakePaths,
  getIntakeProfile,
  getIntakeDocumentStatus,
  getIntakeAgreements,
} from '../services/clientIntakeService';

export default function useClientIntakeData() {
  const { token, user } = useAuth();
  const profileQuery = useFetch(clientIntakePaths.profile, {
    enabled: !!token,
    fetcher: getIntakeProfile,
  });
  const { data: docStatus } = useFetch(clientIntakePaths.documentStatus, {
    enabled: !!token,
    fetcher: getIntakeDocumentStatus,
  });
  const { data: agreeRes } = useFetch(clientIntakePaths.agreements, {
    enabled: !!token,
    fetcher: getIntakeAgreements,
  });
  const profile = profileQuery.data?.profile || profileQuery.data || null;
  const agreements =
    agreeRes?.agreements || (Array.isArray(agreeRes) ? agreeRes : []);
  return {
    profile,
    token,
    user,
    docStatus,
    agreements,
    isIntakeComplete: Boolean(profile?.first_name && profile?.last_name),
    loading:
      profileQuery.isLoading || (!profileQuery.data && profileQuery.isFetching),
    fetchError: profileQuery.error,
    onRefetch: profileQuery.refetch,
  };
}
