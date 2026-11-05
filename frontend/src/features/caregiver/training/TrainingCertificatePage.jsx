import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { api } from '@/shared/services/api';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingState from '@/shared/components/common/LoadingState';

export default function TrainingCertificatePage() {
  const { courseId } = useParams();
  const { token } = useAuth();
  const [certificateUrl, setCertificateUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token || !courseId) return;
    const controller = new AbortController();
    let objectUrl;

    async function loadCertificate() {
      setLoading(true);
      setErrorMsg('');
      setCertificateUrl('');
      try {
        const blob = await api.getBlob(`/training/courses/${courseId}/certificate`, token, controller.signal);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setCertificateUrl(objectUrl);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMsg(error.detail || 'Could not load the certificate.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCertificate();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, courseId]);

  if (loading) {
    return <LoadingState title="Preparing Completion Certificate..." subtitle="Loading your course completion certificate..." variant="page" />;
  }

  return (
    <PageContainer>
      <PageHeader title="Certificate of Completion" />
      <div className="flex justify-between items-center flex-wrap gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs text-slate-600 gap-1.5">
          <Link to="/caregiver/training"><ArrowLeft size={13} /> Back to In-Service Training</Link>
        </Button>
        {certificateUrl && (
          <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5">
            <a href={certificateUrl} download={`training-certificate-${courseId}.pdf`}><Download size={13} /> Download PDF</a>
          </Button>
        )}
      </div>
      {errorMsg ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Certificate unavailable</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : certificateUrl && (
        <Card className="overflow-hidden border-slate-200">
          <iframe title="Course completion certificate PDF" src={certificateUrl} className="w-full h-[75vh] min-h-[480px]" />
          <p className="text-xs text-slate-600 p-4">If your browser cannot preview the certificate, use Download PDF to save it.</p>
        </Card>
      )}
    </PageContainer>
  );
}
