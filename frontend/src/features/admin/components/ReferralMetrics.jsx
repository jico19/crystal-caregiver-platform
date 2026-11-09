import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ReferralMetrics({ analytics }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Total Leads
        </div>
        <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
          {analytics.total_referrals}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          All received inquiries
        </div>
      </Card>

      <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wide">
            New Inquiries
          </span>
          <span className="size-2 rounded-full bg-amber-500" />
        </div>
        <div className="text-xl font-bold text-amber-700 mt-1 tabular-nums">
          {analytics.by_status?.new || 0}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Awaiting initial call
        </div>
      </Card>

      <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-sky-700 uppercase tracking-wide">
            In Evaluation
          </span>
          <span className="size-2 rounded-full bg-sky-500" />
        </div>
        <div className="text-xl font-bold text-sky-700 mt-1 tabular-nums">
          {analytics.by_status?.contacted || 0}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Intake underway</div>
      </Card>

      <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide">
            Converted
          </span>
          <span className="size-2 rounded-full bg-emerald-500" />
        </div>
        <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
          {analytics.by_status?.converted || 0}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Admitted as clients
        </div>
      </Card>

      <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
            Funnel Rate
          </span>
          <Sparkles size={13} className="text-slate-400" />
        </div>
        <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
          {analytics.conversion_rate_pct}%
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Lead-to-client admission
        </div>
      </Card>
    </div>
  );
}
