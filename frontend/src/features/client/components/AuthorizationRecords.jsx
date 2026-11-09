import { Link } from 'react-router-dom';
import {
  Plus,
  ShieldCheck,
  Download,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '../../../shared/components/common/DataTable';
import EmptyState from '../../../shared/components/common/EmptyState';
import StatusBadge from '../../../shared/components/common/StatusBadge';

import { authorizationAllowance } from '../utils/authorizationUnits';
const PROCEDURE_LABELS = {
  T1019: 'Personal Care Assistance (In-Home Aide)',
  S5150: 'Respite Care (Family Relief)',
  S5130: 'Homemaker & Chore Services',
  T1001: 'Nursing Assessment & Care Management',
  T1021: 'Home Health Aide Care',
};

export default function AuthorizationRecords({
  authorizations,
  openDocument,
  setShowUpload,
}) {
  const columns = [
    {
      key: 'procedure',
      label: 'Approved Service & Description',
      render: (_, row) => {
        const code = row.hcpcs_code || 'T1019';
        const friendlyName =
          PROCEDURE_LABELS[code] ||
          row.service_description ||
          'Personal Care Services';
        return (
          <div>
            <div className="font-semibold text-slate-900 text-xs">
              {friendlyName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant="outline"
                className="font-mono text-emerald-800 border-emerald-200 bg-emerald-50 text-[10px] py-0 px-1.5 font-bold"
              >
                {code}
              </Badge>
              {row.max_weekly_hours ? (
                <span className="text-[11px] text-slate-500">
                  Up to {row.max_weekly_hours} hrs/week
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'allowance',
      label: 'Hours Balance & Usage',
      render: (_, row) => {
        const { remaining, remHours, totalHours, pct, progressBg } =
          authorizationAllowance(row);

        return (
          <div className="w-44">
            <div className="flex justify-between items-center text-xs mb-1">
              <span
                className={`font-bold ${remHours < 0 ? 'text-rose-600' : 'text-slate-900'}`}
              >
                {remHours < 0
                  ? `${Math.abs(remHours).toFixed(1)}h over limit`
                  : `${remHours.toFixed(1)} hrs remaining`}
              </span>
              <span className="text-slate-500 text-[11px]">
                of {totalHours.toFixed(1)}h
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressBg} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
              <span>{pct}% utilized</span>
              <span>({remaining} billing units left)</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'dates',
      label: 'Effective Period',
      render: (_, row) => {
        const isExpiringSoon =
          row.days_until_expiration !== null && row.days_until_expiration <= 30;
        return (
          <div className="text-slate-600 text-xs">
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              <span>
                {row.start_date} to {row.end_date}
              </span>
            </div>
            {isExpiringSoon &&
              row.days_until_expiration !== null &&
              row.status === 'active' && (
                <span className="block text-[11px] font-semibold text-amber-600 mt-0.5">
                  Renews in {row.days_until_expiration} days
                </span>
              )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Approval Status',
      render: (val) => <StatusBadge status={val} size="xs" />,
    },
    {
      key: 'document',
      label: 'Notice File',
      render: (_, row) =>
        row.document_id ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openDocument(row.document_id)}
            className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold gap-1"
          >
            <Download size={11} />
            View Notice
          </Button>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Service Approvals on File ({authorizations.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {authorizations.length === 0 ? (
          <EmptyState
            title="No Service Approvals on File"
            description="Approvals are issued once your Medicaid enrollment and physician care plan are finalized by your agency coordinator."
            action={
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowUpload(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                >
                  <Plus size={13} />
                  Upload Approval Letter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1"
                >
                  <Link to="/client/schedule">
                    View Care Schedule <ArrowRight size={12} />
                  </Link>
                </Button>
              </div>
            }
          />
        ) : (
          <DataTable columns={columns} data={authorizations} keyField="id" />
        )}
      </CardContent>
    </Card>
  );
}
