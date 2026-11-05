import { Link } from 'react-router-dom';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
export default function IntakeProgress({ isIntakeComplete, docStatus, agreements, profile }) {
  const docsUploaded = docStatus?.summary?.missing === 0;
  const agreementsSigned = agreements.length > 0 && agreements.every(a => Boolean(a.signed || a.signed_at));
  const serviceActive = profile?.status === 'active' || profile?.status === 'approved';
  return (<>
      {/* 4-Step Onboarding Lifecycle Stepper */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Admission & Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Step 1 */}
            <div className={`p-3 rounded-lg border text-xs ${isIntakeComplete ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">1. Intake Details</span>
                {isIntakeComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">Action Needed</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {isIntakeComplete ? 'Profile & demographics on file' : 'Submit recipient identification'}
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-lg border text-xs ${docsUploaded ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">2. Documents</span>
                {docsUploaded ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link to="/client/documents" className="text-[10px] text-emerald-700 font-semibold hover:underline">
                    Upload
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {docsUploaded ? 'All required files received' : 'Insurance & Medicaid cards'}
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-lg border text-xs ${agreementsSigned ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">3. Agreements</span>
                {agreementsSigned ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Link to="/client/forms" className="text-[10px] text-emerald-700 font-semibold hover:underline">
                    Sign
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {agreementsSigned ? 'All agreements signed' : 'Electronic consent forms'}
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-lg border text-xs ${serviceActive ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">4. Active Care</span>
                {serviceActive ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Pending</span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                {serviceActive ? 'Services scheduled & active' : 'Nurse assessment & scheduling'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

  </>);
}
