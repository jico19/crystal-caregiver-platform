import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingState from '../../../shared/components/common/LoadingState';

import useClientIntakeData from '../hooks/useClientIntakeData';
import useClientIntake from '../hooks/useClientIntake';
import ClientIntakeProgress from '../components/ClientIntakeProgress';
import ClientIntakeStatus from '../components/ClientIntakeStatus';
import ClientIntakeForm from '../components/ClientIntakeForm';

export default function IntakePage() {
  const data = useClientIntakeData();
  if (data.loading) {
    return (
      <LoadingState
        title="Loading Client Admission..."
        subtitle="Retrieving care recipient identification and admission status..."
        variant="page"
      />
    );
  }
  return <ClientIntakeContent {...data} />;
}

function ClientIntakeContent(data) {
  const intake = useClientIntake(data);
  const { profile, isIntakeComplete, fetchError } = data;
  const { errorMsg, successMsg } = intake;
  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Admission & Service Intake"
        subtitle="Manage care recipient registration, state admission packets, and onboarding progress."
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">
            Intake Recorded
          </AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">
            {successMsg}
          </AlertDescription>
        </Alert>
      )}

      <ClientIntakeProgress isIntakeComplete={isIntakeComplete} {...intake} />
      {isIntakeComplete && !intake.isEditing ? (
        <ClientIntakeStatus profile={profile} {...intake} />
      ) : (
        <ClientIntakeForm
          isIntakeComplete={isIntakeComplete}
          form={intake.form}
          setIsEditing={intake.setIsEditing}
        />
      )}

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link
          to="/client/dashboard"
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>
        <Link
          to="/client/forms"
          className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
        >
          Next: Sign Agreements <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
