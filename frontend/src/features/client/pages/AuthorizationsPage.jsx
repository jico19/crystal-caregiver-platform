import { Link } from 'react-router-dom';
import { Plus, X, AlertCircle, ArrowRight, Info } from 'lucide-react';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Toast from '../../../shared/components/common/Toast';
import LoadingState from '../../../shared/components/common/LoadingState';

import useAuthorizationsData from '../hooks/useAuthorizationsData';
import useAuthorizationUpload from '../hooks/useAuthorizationUpload';
import AuthorizationSummary from '../components/AuthorizationSummary';
import AuthorizationUploadForm from '../components/AuthorizationUploadForm';
import AuthorizationRecords from '../components/AuthorizationRecords';

export default function AuthorizationsPage() {
  const data = useAuthorizationsData();
  const upload = useAuthorizationUpload(data);
  const { showUpload, setShowUpload, errorMsg, toastMsg, setToastMsg } = upload;
  const { fetchError } = data;
  if (data.loading) {
    return (
      <LoadingState
        title="Loading Care Coverage..."
        subtitle="Retrieving Medicaid authorization approvals and covered hours..."
        variant="page"
      />
    );
  }
  return (
    <PageContainer>
      <PageHeader
        title="Care Coverage & Approved Hours"
        subtitle="Track Medicaid waiver allowances, authorized care hours, and covered service plans."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
          >
            {showUpload ? (
              <>
                <X size={13} /> Close Upload
              </>
            ) : (
              <>
                <Plus size={13} /> Upload Approval Letter
              </>
            )}
          </Button>
        }
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      <Toast
        message={toastMsg}
        type="success"
        onClose={() => setToastMsg('')}
      />

      {/* Reassuring Educational Banner */}
      <div className="mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
        <div className="text-xs text-emerald-950 leading-relaxed">
          <strong className="block mb-0.5 font-semibold text-emerald-900">
            How Care Authorizations Work:
          </strong>
          An authorization is an official state approval issued by Medicaid or
          your insurance provider specifying how many hours of care services are
          covered. Your care coordinator schedules caregiver shifts within these
          approved hours. When an authorization nears expiration, our agency
          submits renewal requests on your behalf.
        </div>
      </div>

      <AuthorizationSummary {...data} />
      {showUpload && (
        <AuthorizationUploadForm
          upload={upload}
          onCancel={() => setShowUpload(false)}
        />
      )}
      <AuthorizationRecords
        authorizations={data.authorizations}
        openDocument={data.openDocument}
        setShowUpload={setShowUpload}
      />

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link
          to="/client/care-plan"
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to Care Plan
        </Link>
        <Link
          to="/client/schedule"
          className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
        >
          Next: Care Schedule <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
