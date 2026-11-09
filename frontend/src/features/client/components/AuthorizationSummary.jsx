import { ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthorizationSummary({
  activeAuths,
  totalRemainingHours,
  totalAuthorizedHours,
  totalUsedHours,
  totalRemainingUnits,
  overallPercent,
}) {
  return (
    <>
      {activeAuths.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card
            className={`border shadow-sm ${totalRemainingHours < 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/40 border-emerald-200'}`}
          >
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Remaining Covered Hours
              </div>
              <div
                className={`text-2xl font-bold ${totalRemainingHours < 0 ? 'text-rose-600' : 'text-emerald-700'} mt-1`}
              >
                {totalRemainingHours.toFixed(1)}{' '}
                <span className="text-sm font-normal text-slate-600">
                  Hours
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalRemainingUnits} billing units remaining (1 unit = 15
                minutes)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                Total Authorized Hours
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalAuthorizedHours.toFixed(1)}{' '}
                <span className="text-sm font-normal text-slate-600">
                  Hours
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Across {activeAuths.length} active service approval
                {activeAuths.length > 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                Hours Delivered
              </div>
              <div className="text-2xl font-bold text-slate-700 mt-1">
                {totalUsedHours.toFixed(1)}{' '}
                <span className="text-sm font-normal text-slate-600">
                  Hours
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {overallPercent}% care service utilization
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
