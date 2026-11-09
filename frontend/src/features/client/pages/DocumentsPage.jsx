import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import Toast from '../../../shared/components/common/Toast';
import LoadingState from '../../../shared/components/common/LoadingState';

import useClientDocuments from '../hooks/useClientDocuments';
import ClientDocumentUpload from '../components/ClientDocumentUpload';
import ClientDocumentRecords from '../components/ClientDocumentRecords';
import ClientDocumentStatus from '../components/ClientDocumentStatus';

export default function DocumentsPage() {
  const data = useClientDocuments();
  const { errorMsg, successMsg, setSuccessMsg, isCompliant, missingList } =
    data;
  if (data.loading) {
    return (
      <LoadingState
        title="Loading Client Records..."
        subtitle="Retrieving insurance, Medicaid, and clinical documents..."
        variant="page"
      />
    );
  }
  return (
    <PageContainer>
      <PageHeader
        title="Documents & File Uploads"
        subtitle="Submit Medicaid ID cards, insurance verification, and physician care orders required for service authorization."
        badge={
          <StatusBadge
            status={isCompliant ? 'completed' : 'pending'}
            label={
              isCompliant
                ? 'Documents Compliant'
                : `${missingList.length} Action Needed`
            }
          />
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Toast
        message={successMsg}
        type="success"
        onClose={() => setSuccessMsg('')}
      />

      {/* Action Center: Missing Documents Alert Card */}
      <ClientDocumentStatus {...data} />
      <ClientDocumentUpload
        upload={data.upload}
        uploadCardRef={data.uploadCardRef}
      />
      <ClientDocumentRecords documents={data.documents} token={data.token} />

      {/* Navigation footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
        <Link
          to="/client/forms"
          className="text-slate-600 hover:text-slate-900"
        >
          ← Back to Agreements & Consents
        </Link>
        <Link
          to="/client/authorizations"
          className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
        >
          Next: Coverage & Hours <ArrowRight size={11} />
        </Link>
      </div>
    </PageContainer>
  );
}
