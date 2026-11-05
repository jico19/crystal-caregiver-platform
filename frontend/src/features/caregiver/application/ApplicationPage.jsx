import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatBusinessDaysAgo } from '@/shared/utils/businessDays';
import { STATUS_META, milestoneMeta } from '@/shared/utils/caregiverStatus';
import { packetUrl, STATE_PACKET_CODE } from '@/shared/utils/packets';
import { getStateName } from './applicationConstants.js';
import { useCaregiverApplication } from './useCaregiverApplication.js';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingState from '@/shared/components/common/LoadingState';
import ApplicationSuccessScreen from './ApplicationSuccessScreen.jsx';
import ApplicationRoadmapCard from './ApplicationRoadmapCard.jsx';
import ApplicationSummaryCard from './ApplicationSummaryCard.jsx';
import ApplicationFormFields from './ApplicationFormFields.jsx';

export default function ApplicationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const app = useCaregiverApplication(auth);

  if (app.loading) {
    return (
      <LoadingState
        title="Loading Application Details..."
        subtitle="Retrieving candidate onboarding records and registration form..."
        variant="page"
      />
    );
  }

  const appStatus = app.application?.status || null;
  const meta = (appStatus && STATUS_META[appStatus]) || STATUS_META.draft;
  const formLocked = !!(app.application && meta.locked);
  const isRejected = appStatus === 'rejected';
  const submittedAt = app.application?.submitted_at || app.application?.created_at || null;
  const daysAgoText = formatBusinessDaysAgo(submittedAt);
  const rejectionReason = isRejected && (app.application?.rejection_reason || app.application?.notes)
    ? (app.application.rejection_reason || app.application.notes)
    : null;
  const milestone = milestoneMeta(appStatus);

  const values = app.watch();
  const firstName = values.first_name || '';
  const lastName = values.last_name || '';
  const stateId = values.state_id;
  const signatureValue = values.signature_data;

  if (app.isSuccessSubmitted) {
    return (
      <ApplicationSuccessScreen
        successMode={app.successMode}
        onNavigateDashboard={() => navigate('/caregiver/dashboard')}
        onNavigateDocuments={() => navigate('/caregiver/documents')}
      />
    );
  }

  return (
    <PageContainer size="narrow">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-800 border-emerald-200 bg-emerald-50 text-xs font-normal">
            Direct Candidate Onboarding
          </Badge>
          <span className="text-xs text-slate-500 font-medium">
            Florida • Indiana • Georgia
          </span>
        </div>

        {!auth.user && (
          <Link to="/caregiver/login" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
            Already registered? Sign In <ArrowRight size={11} />
          </Link>
        )}

        {auth.user && (
          <Button variant="outline" size="sm" asChild className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
            <a
              href={packetUrl(STATE_PACKET_CODE[stateId])}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={12} />
              Download Employment Packet (PDF)
            </a>
          </Button>
        )}
      </div>

      <PageHeader
        title="Caregiver Employment Application"
        subtitle="Apply to provide state-licensed home care services. Fill out your candidate details below — no preliminary registration required."
      />

      {app.errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{app.errorMsg}</AlertDescription>
        </Alert>
      )}

      {app.successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">Success</AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">{app.successMsg}</AlertDescription>
        </Alert>
      )}

      <ApplicationRoadmapCard
        appStatus={appStatus}
        meta={meta}
        milestone={milestone}
        rejectionReason={rejectionReason}
        submittedAt={submittedAt}
        daysAgoText={daysAgoText}
      />

      {formLocked ? (
        <ApplicationSummaryCard
          firstName={firstName}
          lastName={lastName}
          phone={values.phone}
          stateName={getStateName(stateId)}
          submittedAt={submittedAt}
          notes={values.notes}
          milestone={milestone}
        />
      ) : (
        <ApplicationFormFields
          user={auth.user}
          register={app.register}
          control={app.control}
          errors={app.errors}
          isSubmitting={app.isSubmitting}
          isRejected={isRejected}
          signatureValue={signatureValue}
          draftSavedAt={app.draftSavedAt}
          onClearDraft={app.handleClearDraft}
          onSubmit={app.submitHandler}
        />
      )}
    </PageContainer>
  );
}