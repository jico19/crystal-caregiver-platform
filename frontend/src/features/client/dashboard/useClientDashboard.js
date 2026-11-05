import { useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import { summarizeAuthorizationHours } from '../lib/careMetrics';

export function useClientDashboard() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: profileLoading } = useFetch('/clients/me', { enabled: !!token });
  const { data: authRes, isLoading: authLoading } = useFetch('/clients/me/authorizations', { enabled: !!token, defaultData: [] });
  const { data: docStatusRes, isLoading: docStatusLoading } = useFetch('/clients/me/document-status', { enabled: !!token });
  const { data: schedRes, isLoading: schedLoading } = useFetch('/clients/me/schedule', { enabled: !!token });
  const { data: planRes, isLoading: planLoading } = useFetch('/clients/me/care-plan', { enabled: !!token });
  const { data: agreeRes, isLoading: agreeLoading } = useFetch('/clients/me/agreements', { enabled: !!token });
  const { data: _notifyRes, isLoading: notifyLoading } = useFetch('/clients/me/notifications', { enabled: !!token });
  const { data: annRes } = useFetch('/announcements', { enabled: !!token });

  const profile = profileRes?.profile || profileRes || null;
  const schedule = schedRes?.schedule || (Array.isArray(schedRes) ? schedRes : []);
  const carePlan = planRes?.care_plan || (planRes?.id ? planRes : null);
  const agreements = agreeRes?.agreements || (Array.isArray(agreeRes) ? agreeRes : []);
  const announcements = annRes?.announcements || (Array.isArray(annRes) ? annRes : []);

  const authorizations = useMemo(() => {
    return authRes?.authorizations || (Array.isArray(authRes) ? authRes : []);
  }, [authRes]);

  // Compute coverage hours
  const activeAuths = useMemo(() => {
    return authorizations.filter((a) => a.status === 'active' || a.status === 'expiring_soon');
  }, [authorizations]);

  const { totalRemainingHours, totalAuthorizedHours, totalUsedHours } = useMemo(
    () => summarizeAuthorizationHours(activeAuths), [activeAuths]
  );
  const visitApprovals = activeAuths.filter((authorization) => authorization.unit_type === 'visit');

  const overallPercent = totalAuthorizedHours > 0
    ? Math.min(100, Math.round((totalUsedHours / totalAuthorizedHours) * 100))
    : 0;

  return {
    user,
    profile,
    schedule,
    carePlan,
    agreements,
    announcements,
    activeAuths,
    totalRemainingHours,
    totalAuthorizedHours,
    totalUsedHours,
    visitApprovals,
    overallPercent,
    docStatusRes,
    profileLoading,
    authLoading,
    docStatusLoading,
    schedLoading,
    planLoading,
    agreeLoading,
    notifyLoading,
  };
}
