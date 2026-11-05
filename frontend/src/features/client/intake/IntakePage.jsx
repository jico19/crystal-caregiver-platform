import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import LoadingState from '@/shared/components/common/LoadingState';
import ClientIntakeContent from './ClientIntakeContent';

export default function IntakePage() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: loading, error: fetchError, refetch } = useFetch('/clients/me', {
    enabled: !!token,
  });
  const { data: docStatus } = useFetch('/clients/me/document-status', { enabled: !!token });
  const { data: agreeRes } = useFetch('/clients/me/agreements', { enabled: !!token });

  const profile = profileRes?.profile || profileRes || null;
  const isIntakeComplete = Boolean(profile?.first_name && profile?.last_name);

  if (loading) {
    return (
      <LoadingState
        title="Loading Client Admission..."
        subtitle="Retrieving care recipient identification and admission status..."
        variant="page"
      />
    );
  }

  return (
    <ClientIntakeContent
      key={`${user?.id ?? 'anon'}:${profile?.id ?? 'new'}:${profile?.state_id || user?.state_id || ''}`}
      profile={profile}
      isIntakeComplete={isIntakeComplete}
      docStatus={docStatus}
      agreements={agreeRes?.agreements || (Array.isArray(agreeRes) ? agreeRes : [])}
      token={token}
      user={user}
      fetchError={fetchError}
      onRefetch={refetch}
    />
  );
}

