import { AlertCircle, CheckCircle2 } from 'lucide-react';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingState from '../../../shared/components/common/LoadingState';

import useCaregiverDocuments from '../hooks/useCaregiverDocuments';
import CaregiverDocumentUpload from '../components/CaregiverDocumentUpload';
import CaregiverDocumentRecords from '../components/CaregiverDocumentRecords';

export default function DocumentsPage() {
  const data = useCaregiverDocuments();
  const { errorMsg, successMsg } = data;
  if (data.loading) {
    return (
      <LoadingState
        title="Loading Document Records..."
        subtitle="Retrieving state certifications and compliance files..."
        variant="page"
      />
    );
  }
  return (
    <PageContainer size="wide">
      <PageHeader
        title="Caregiver Credentials & Compliance"
        subtitle="Upload required professional certifications and state background check records. All files are securely encrypted."
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-950 font-semibold">
            Success
          </AlertTitle>
          <AlertDescription className="text-emerald-800 text-xs">
            {successMsg}
          </AlertDescription>
        </Alert>
      )}

      <CaregiverDocumentUpload upload={data.upload} />
      <CaregiverDocumentRecords documents={data.documents} token={data.token} />
    </PageContainer>
  );
}
