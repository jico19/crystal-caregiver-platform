import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';

export function useCaregiverDashboard() {
  const { token, user } = useAuth();

  const { data: profileRes, isLoading: profileLoading } = useFetch('/caregivers/me', { enabled: !!token });
  const { data: appRes, isLoading: appLoading } = useFetch('/caregivers/me/application', { enabled: !!token });
  const { data: docRes, isLoading: docsLoading } = useFetch('/documents/me', { enabled: !!token });
  const { data: credStatusRaw, isLoading: credLoading } = useFetch('/caregivers/me/credential-status', { enabled: !!token });
  const { data: annRes, isLoading: annLoading } = useFetch('/announcements', { enabled: !!token });
  const { data: trainingRes, isLoading: trainingLoading } = useFetch('/training/my-enrollments', { enabled: !!token });

  const profile = profileRes || null;
  const application = appRes || null;
  const documents = docRes?.documents || [];
  const announcements = annRes?.announcements || (Array.isArray(annRes) ? annRes : []);
  const enrollmentList = trainingRes?.enrollments || trainingRes?.results || (Array.isArray(trainingRes) ? trainingRes : []);
  const courses = enrollmentList.map((enr) => ({
    id: enr.id,
    name: enr.course_name || enr.training_courses?.name,
    enrollment_status: enr.status,
  }));
  const completedTrainingCount = courses.filter((c) => c.enrollment_status === 'completed').length;

  const credentialStatus = credStatusRaw
    ? {
        summary: {
          expired: credStatusRaw.expired?.length || 0,
          expiring_soon: credStatusRaw.expiring_soon?.length || 0,
          missing: credStatusRaw.missing_requirements?.length || 0,
          compliant: credStatusRaw.compliant || false,
        },
        expired: (credStatusRaw.expired || []).map((name) => ({ name })),
        expiring_soon: (credStatusRaw.expiring_soon || []).map((name) => ({ name })),
        missing: (credStatusRaw.missing_requirements || []).map((name) => ({ name })),
      }
    : null;

  const loading = profileLoading || appLoading || docsLoading || credLoading || annLoading || trainingLoading;

  return {
    user,
    profile,
    application,
    documents,
    announcements,
    courses,
    completedTrainingCount,
    credentialStatus,
    loading,
  };
}
