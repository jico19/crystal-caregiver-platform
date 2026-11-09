import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingState from '../../../shared/components/common/LoadingState';

export default function TrainingCertificatePage() {
  const { courseId } = useParams();
  const { token } = useAuth();
  const { data, isLoading: loading, error: errorMsg } = useFetch(
    `/training/courses/${courseId}/certificate`,
    {
      enabled: !!token && !!courseId,
      defaultData: { certificate: null },
    }
  );
  const cert = data?.certificate || null;

  if (loading) {
    return (
      <LoadingState
        title="Preparing Completion Certificate..."
        subtitle="Verifying course completion record and generating credential..."
        variant="page"
      />
    );
  }

  if (errorMsg || !cert) {
    return (
      <PageContainer size="narrow" className="mt-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg || 'Certificate not found.'}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" asChild className="w-full h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
          <Link to="/caregiver/training">
            <ArrowLeft size={13} /> Back to In-Service Training
          </Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <div className="print-hidden flex justify-between items-center flex-wrap gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 gap-1.5 -ml-2">
          <Link to="/caregiver/training">
            <ArrowLeft size={13} /> Back to In-Service Training
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
        >
          <Printer size={13} /> Print / Save as PDF
        </Button>
      </div>

      <Card className="p-8 border-2 border-emerald-800/30 bg-white shadow-sm text-center">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Award size={24} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Certificate of Completion
        </h1>
        <p className="text-slate-500 text-xs mb-8">
          CarePlatform In-Service Continuing Education
        </p>

        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
          This certifies that
        </p>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 font-serif">
          {cert.caregiver_name}
        </h2>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
          has successfully completed the in-service training course
        </p>
        <h3 className="text-base font-semibold text-slate-800 mb-8">
          {cert.course_name}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100 text-left">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Certificate Number</div>
            <div className="text-xs font-mono font-semibold text-slate-800">{cert.certificate_number}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-slate-400 mb-0.5">Date Completed</div>
            <div className="text-xs font-semibold text-slate-800">
              {new Date(cert.completed_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400 mt-4 print-hidden">
        This certificate is for record-keeping and compliance review. Save it as a PDF and upload a copy to your credential stack if requested.
      </p>
    </PageContainer>
  );
}
