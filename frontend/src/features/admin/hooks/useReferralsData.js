import { useState, useMemo } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import useFetch from '../../../shared/hooks/useFetch';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';

import {
  referralPaths,
  getReferralStates,
  getReferralAnalytics,
  getReferrals,
} from '../services/referralService';

export default function useReferralsData() {
  const { token, user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user);
  const adminStateId = isSuperAdminUser ? null : user?.state_id;

  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatusValue] = useState('all');
  const [filterState, setFilterStateValue] = useState(
    isSuperAdminUser ? 'all' : String(adminStateId || '')
  );
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  // Fetch states
  const { data: statesData } = useFetch(referralPaths.states, {
    fetcher: getReferralStates,
    defaultData: [],
  });
  const allStates = Array.isArray(statesData)
    ? statesData
    : statesData?.states || [];
  const states = isSuperAdminUser
    ? allStates
    : allStates.filter((st) => String(st.id) === String(adminStateId));

  // Analytics
  const { data: analyticsData, refetch: reloadAnalytics } = useFetch(
    referralPaths.analytics,
    {
      fetcher: getReferralAnalytics,
      params: {
        ...(filterState !== 'all' ? { state_id: filterState } : {}),
      },
      enabled: !!token,
    }
  );

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
    url: referralPaths.list,
    fetchPage: getReferrals,
    token,
    params,
    listKey: 'referrals',
  });

  function reloadAll() {
    reloadTable();
    reloadAnalytics();
  }

  function handleResetFilters() {
    setSearchQuery('');
    setFilterStatusValue('all');
    setFilterStateValue(isSuperAdminUser ? 'all' : String(adminStateId || ''));
    setFilterUnassigned(false);
  }

  // Client-side search filtering
  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase().trim();
    return referrals.filter((r) => {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
      const phone = (r.phone || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const source = (r.referral_source || '').toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        source.includes(q)
      );
    });
  }, [referrals, searchQuery]);

  // Grouped for pipeline
  const pipelineNew = filteredReferrals.filter((r) => r.status === 'new');
  const pipelineContacted = filteredReferrals.filter(
    (r) => r.status === 'contacted'
  );
  const pipelineConverted = filteredReferrals.filter(
    (r) => r.status === 'converted'
  );
  const pipelineClosed = filteredReferrals.filter((r) => r.status === 'closed');

  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterState !== (isSuperAdminUser ? 'all' : String(adminStateId || '')) ||
    filterUnassigned ||
    searchQuery.trim() !== '';

  function setFilterState(value) {
    setFilterStateValue(value);
    setPage(1);
  }
  function setFilterStatus(value) {
    setFilterStatusValue(value);
    setPage(1);
  }

  return {
    token,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterState,
    setFilterState,
    filterUnassigned,
    setFilterUnassigned,
    states,
    isSuperAdminUser,
    analytics,
    filteredReferrals,
    pipelineNew,
    pipelineContacted,
    pipelineConverted,
    pipelineClosed,
    hasActiveFilters,
    handleResetFilters,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
    reloadAll,
  };
}
