import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { api } from '@/shared/services/api';
import { queryClient } from '@/shared/lib/queryClient';
import useFetch from '@/shared/hooks/useFetch';

export function useTrainingRecords() {
  const { token } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data, isLoading: coursesLoading, error: loadError } = useFetch('/training/courses', { enabled: !!token });
  const { data: enrollmentData, isLoading: enrollmentsLoading, error: enrollmentError } = useFetch('/training/my-enrollments', { enabled: !!token });
  const enrollments = Array.isArray(enrollmentData) ? enrollmentData : [];
  const courses = (Array.isArray(data) ? data : []).map((course) => {
    const enrollment = enrollments.find((item) => String(item.course_id) === String(course.id));
    return {
      ...course,
      enrollment_status: enrollment?.status || 'not_started',
      completed_at: enrollment?.completed_at,
      due_at: enrollment?.due_at,
    };
  });
  const loading = coursesLoading || enrollmentsLoading;
  const listError = loadError || enrollmentError || '';

  async function handleEnroll(courseId) {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(courseId);

    try {
      await api.post(`/training/courses/${courseId}/enroll`, null, token);
      setSuccessMsg('You have enrolled in the training course.');
      await queryClient.invalidateQueries({ queryKey: ['/training/my-enrollments'] });
    } catch (err) {
      setErrorMsg(err.detail || 'Enrollment failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete(courseId) {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(courseId);

    try {
      await api.post(`/training/courses/${courseId}/complete`, null, token);
      setSuccessMsg('Course successfully marked as completed.');
      await queryClient.invalidateQueries({ queryKey: ['/training/my-enrollments'] });
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to complete course.');
    } finally {
      setActionLoading(null);
    }
  }

  return {
    courses,
    loading,
    listError,
    errorMsg,
    successMsg,
    actionLoading,
    handleEnroll,
    handleComplete,
  };
}
