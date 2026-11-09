import { CheckCircle2, ArrowRight, Upload } from 'lucide-react';
import PageContainer from '../../../../shared/components/common/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ApplicationSuccessScreen({ successMode, onNavigateDashboard, onNavigateDocuments }) {
  const isResubmit = successMode === 'resubmit';

  return (
    <PageContainer size="narrow">
      <Card className="text-center p-8 border-emerald-200 bg-emerald-50/20 shadow-sm">
        <CardContent className="p-0">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isResubmit ? 'Application Resubmitted Successfully!' : 'Application Submitted Successfully!'}
          </h1>
          <p className="text-slate-600 text-xs leading-normal max-w-lg mx-auto mb-6">
            {isResubmit
              ? 'Your updated application details have been received and are now back under review by our state compliance team.'
              : 'Welcome to the CarePlatform clinical team! Your onboarding profile has been created and your application is now under review by our state compliance team.'}
          </p>

          <div className="p-4 rounded-md border border-slate-200 bg-white mb-6 text-left shadow-sm">
            <h3 className="font-semibold text-xs text-slate-900 mb-2">
              Next Steps in Your Onboarding:
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 pl-4 list-disc">
              <li><strong>Upload Credentials:</strong> Provide your CPR certificate, Driver's License, and CNA/HHA license in the portal.</li>
              <li><strong>Administrative Review:</strong> A clinical supervisor will verify your information within 1–2 business days.</li>
              <li><strong>In-Service Training:</strong> Access online orientation and safety modules once approved.</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              type="button"
              onClick={onNavigateDashboard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
            >
              Go to Caregiver Dashboard <ArrowRight size={13} />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onNavigateDocuments}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 text-xs gap-1.5"
            >
              <Upload size={13} /> Upload Credentials
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
