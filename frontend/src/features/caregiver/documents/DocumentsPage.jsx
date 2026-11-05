import { useAuth } from '@/shared/hooks/useAuth';
import { stateLabelFor } from '@/shared/lib/roles';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import LoadingState from '@/shared/components/common/LoadingState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentsList from './DocumentsList';
import { useCaregiverDocuments } from './useCaregiverDocuments';

export default function DocumentsPage() {
  const { user } = useAuth();
  const scope = `${user?.id ?? 'anon'}:${stateLabelFor(user)}:${localStorage.getItem('selected_state') || ''}`;
  return <DocumentsSession key={scope} scope={scope} />;
}

function DocumentsSession({ scope }) {
  const { token } = useAuth();
  const { docTypes, documents, loading, error, reload, upload } = useCaregiverDocuments(scope);
  if (loading) return <LoadingState title="Loading Document Records..." subtitle="Retrieving state certifications and compliance files..." variant="page" />;
  return (
    <PageContainer size="wide">
      <PageHeader title="Caregiver Credentials & Compliance" subtitle="Upload required professional certifications and state background check records. All files are securely encrypted." />
      {error && <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
        <Button type="button" variant="outline" onClick={reload}>Retry loading documents</Button>
      </Alert>}
      <DocumentUploadForm docTypes={docTypes} onUpload={upload} />
      <DocumentsList documents={documents} token={token} />
    </PageContainer>
  );
}
