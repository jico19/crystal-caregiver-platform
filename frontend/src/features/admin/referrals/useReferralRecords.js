import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import usePaginatedFetch from '@/shared/hooks/usePaginatedFetch';

export function useReferralRecords({ isSuperAdminUser, adminStateId, filterState, filterStatus, filterUnassigned }) {
  const { token } = useAuth();
  // Fetch states
  const { data: statesData } = useFetch('/states', { defaultData: [] });
  const allStates = Array.isArray(statesData) ? statesData : statesData?.states || [];
  const states = isSuperAdminUser ? allStates : allStates.filter((st) => String(st.id) === String(adminStateId));

  // Analytics
  const { data: analyticsData, refetch: reloadAnalytics } = useFetch('/admin/referrals/analytics', {
    params: {
      ...(filterState !== 'all' ? { state_id: filterState } : {}),
    },
    enabled: !!token,
  });

  const analytics = analyticsData || {
    total_referrals: 0,
    by_status: { new: 0, contacted: 0, converted: 0, closed: 0 },
    by_source: [],
    conversion_rate_pct: 0,
  };

  const params = {
    status: filterStatus === 'all' ? '' : filterStatus,
    state_id: filterState === 'all' ? '' : filterState,
    ...(filterUnassigned ? { unassigned: 'true' } : {}),
  };

  const {
    items: referrals,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    reload: reloadTable,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/referrals',
    token,
    params,
    listKey: 'referrals',
  });

  return { states, analytics, referrals, total, pages, page, pageSize, loading, error, reloadTable, reloadAnalytics, setPage, setPageSize };
}
