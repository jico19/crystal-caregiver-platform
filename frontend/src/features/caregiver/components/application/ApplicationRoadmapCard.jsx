import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '../../../../shared/components/common/StatusBadge';
import { ROADMAP_STEPS } from '../../../../shared/utils/caregiverStatus';

export default function ApplicationRoadmapCard({
  appStatus,
  meta,
  milestone,
  rejectionReason,
  submittedAt,
  daysAgoText,
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6">
      <CardContent className="p-5">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
          <h2 className="font-semibold text-base text-slate-900 m-0">
            Onboarding Roadmap
          </h2>
          {appStatus && (
            <StatusBadge status={meta.group || appStatus} label={meta.label} />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {ROADMAP_STEPS.map((step, i) => (
            <span key={step.key} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={13} className="text-slate-400" />}
              <Badge
                variant="outline"
                asChild
                className="text-slate-700 hover:text-emerald-800 border-slate-200 text-xs px-2.5 py-0.5 font-normal hover:bg-slate-50 transition-colors"
              >
                <Link to={step.to}>
                  {step.label}
                </Link>
              </Badge>
            </span>
          ))}
        </div>

        {!appStatus && (
          <div className="p-3.5 rounded-md bg-emerald-50/50 border border-emerald-200">
            <h3 className="font-semibold text-sm text-slate-900 mb-1">Not Started Yet</h3>
            <p className="text-xs text-slate-600 leading-normal m-0">
              Fill out the form below — it auto-saves as you type, so you can leave and come back within 7 days without losing progress.
            </p>
          </div>
        )}

        {appStatus && (
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 mb-1">
              {milestone.title}
            </h3>
            <p className="text-xs text-slate-600 leading-normal mb-2">
              {milestone.message}
            </p>

            {rejectionReason && (
              <div className="text-xs text-rose-700 p-2.5 bg-rose-50 border border-rose-200 rounded mb-2">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}

            {submittedAt && (
              <p className="text-xs text-slate-400 mb-2">
                {daysAgoText} · Submitted on {new Date(submittedAt).toLocaleDateString()}
              </p>
            )}

            <Link to={milestone.nextAction.to} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
              {milestone.nextAction.label} <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
