import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Clock, Award, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { api } from '../../../shared/services/api';
import { queryClient } from '../../../shared/lib/queryClient';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import LoadingState from '../../../shared/components/common/LoadingState';

export default function TrainingPage() {
  const { token } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data, isLoading: loading, error: loadError } = useFetch('/training/courses', { enabled: !!token, defaultData: [] });
  const courses = data?.courses || [];
  const listError = loadError || '';

  async function handleEnroll(courseId) {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(courseId);

    try {
      await api.post(`/training/courses/${courseId}/enroll`, null, token);
      setSuccessMsg('You have enrolled in the training course.');
      queryClient.invalidateQueries({ queryKey: ['/training/courses'] });
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
      queryClient.invalidateQueries({ queryKey: ['/training/courses'] });
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to complete course.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading In-Service Training Modules..."
        subtitle="Retrieving mandatory compliance education modules..."
        variant="page"
      />
    );
  }

  const completedCount = courses.filter((c) => c.enrollment_status === 'completed').length;
  const inProgressCount = courses.filter((c) => c.enrollment_status === 'in_progress').length;

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Caregiver In-Service Training"
        subtitle="Mandatory compliance education covering client safety, privacy standards, and state healthcare regulations."
      />

      {(errorMsg || listError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || listError}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">Success</AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Total Modules
          </div>
          <div className="text-2xl font-bold text-slate-900">{courses.length}</div>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-sm p-4">
          <div className="text-xs text-amber-800 font-medium mb-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            In Progress
          </div>
          <div className="text-2xl font-bold text-amber-900">{inProgressCount}</div>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm p-4">
          <div className="text-xs text-emerald-800 font-medium mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Completed
          </div>
          <div className="text-2xl font-bold text-emerald-900">{completedCount}</div>
        </Card>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => {
          const status = course.enrollment_status;
          const isBusy = actionLoading === course.id;

          return (
            <Card
              key={course.id}
              className={`p-5 flex flex-col justify-between bg-white border-slate-200 shadow-sm ${
                status === 'completed' ? 'border-emerald-200 bg-emerald-50/10' : ''
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h2 className="font-semibold text-sm text-slate-900 m-0 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
                    {course.name}
                  </h2>
                  <StatusBadge
                    status={status}
                    label={status.replace('_', ' ')}
                    size="xs"
                  />
                </div>

                <div className="text-xs text-emerald-700 font-medium mb-2 flex items-center gap-1">
                  <Clock size={12} className="text-emerald-600" />
                  Duration: {course.duration_hours} hour{course.duration_hours > 1 ? 's' : ''}
                </div>

                <p className="text-slate-600 text-xs leading-normal mb-4">
                  {course.description}
                </p>
              </div>

              <div>
                {status === 'not_started' && (
                  <Button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleEnroll(course.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-8 text-xs gap-1.5"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      'Enroll Module'
                    )}
                  </Button>
                )}

                {status === 'in_progress' && (
                  <Button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleComplete(course.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-8 text-xs gap-1.5"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Mark as Completed'
                    )}
                  </Button>
                )}

                {status === 'completed' && (
                  <div className="space-y-2">
                    <div className="text-center font-medium text-xs text-emerald-700 bg-emerald-50 py-1.5 px-2 rounded-md border border-emerald-200 inline-flex items-center justify-center gap-1 w-full">
                      <CheckCircle2 size={13} /> Completed on {course.completed_at ? new Date(course.completed_at).toLocaleDateString() : 'Record'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                    >
                      <Link to={`/caregiver/training-certificate/${course.id}`}>
                        <Award size={13} className="text-emerald-600" />
                        View Certificate
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
