import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import EmptyState from '@/shared/components/common/EmptyState';
import StatusBadge from '@/shared/components/common/StatusBadge';
import { getAuthStatusDetails, calculateUnitProgress } from './authorizationConstants.js';
import { downloadDocument } from '@/shared/utils/documentUtils';

export default function AuthorizationsTable({
  loading,
  token,
  totalCount,
  filteredAuthorizations,
  copiedAuthId,
  onCopyAuthNumber,
  reviewingId,
  reviewAction,
  onReview,
  onEdit,
  onOpenForm,
  onResetFilters,
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          <div className="text-sm">Loading Medicaid authorizations...</div>
        </div>
      ) : filteredAuthorizations.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={totalCount === 0 ? 'No Authorizations on Record' : 'No Matching Authorizations Found'}
            message={
              totalCount === 0
                ? 'Issue your first Medicaid service authorization using the form above.'
                : 'Try adjusting your search terms, state, or status filters.'
            }
            action={
              totalCount === 0 ? (
                <Button
                  type="button"
                  onClick={onOpenForm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                >
                  + Issue First Authorization
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResetFilters}
                  className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Clear Search & Filters
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent bg-slate-50/50">
                <TableHead className="text-slate-500 font-semibold text-xs">Authorization #</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Client</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">State</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Procedure (HCPCS)</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Units & Balance</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Start Date</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">End Date</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Status</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Covered Services / Notes</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuthorizations.map((a) => {
                const statusInfo = getAuthStatusDetails(a.start_date, a.end_date, a.status);
                const isCopied = copiedAuthId === a.id;
                const totalUnits = a.total_units_authorized ?? 0;
                const unitsUsed = a.units_used ?? 0;
                const remainingHours = a.remaining_hours ?? (a.unit_type === '15_min' ? ((totalUnits - unitsUsed) * 0.25).toFixed(1) : (totalUnits - unitsUsed));
                const progress = calculateUnitProgress(totalUnits, unitsUsed);
                const isOver = Number(remainingHours) < 0;
                const pct = progress.percent || 0;
                const progressBg = isOver || pct >= 90 ? 'bg-rose-500' : (pct >= 75 ? 'bg-amber-500' : 'bg-emerald-600');

                return (
                  <TableRow key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    {/* Auth Number + Copy Button */}
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {a.authorization_number}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onCopyAuthNumber(a.authorization_number, a.id)}
                          title="Copy Authorization #"
                          className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full"
                        >
                          {isCopied ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </Button>
                      </div>
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <div className="font-medium text-slate-900 text-xs">
                        {a.clients?.first_name} {a.clients?.last_name}
                      </div>
                      {a.clients?.medicaid_number && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {a.clients.medicaid_number}
                        </div>
                      )}
                    </TableCell>

                    {/* State */}
                    <TableCell>
                      <Badge variant="secondary" className="font-medium text-[11px]">
                        {a.states?.code || 'FL'}
                      </Badge>
                    </TableCell>

                    {/* Procedure & Code */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 text-[10px] py-0 px-1.5">
                          {a.hcpcs_code || 'T1019'}
                        </Badge>
                        <span className="text-xs text-slate-700">
                          {a.service_description || 'Personal Care'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Units & Balance Progress */}
                    <TableCell>
                      <div className="w-36">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-medium text-slate-800">
                            {unitsUsed} / {totalUnits} u
                          </span>
                          <span className={`font-medium ${isOver ? 'text-rose-600 font-semibold' : 'text-emerald-700'}`}>
                            {isOver ? `${Math.abs(Number(remainingHours))}h over` : `${remainingHours}h left`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${progressBg} rounded-full transition-all`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
                          <span>{pct}% used</span>
                          {a.max_weekly_hours ? <span>Cap: {a.max_weekly_hours}h/wk</span> : null}
                        </div>
                      </div>
                    </TableCell>

                    {/* Start Date */}
                    <TableCell className="text-slate-500 whitespace-nowrap text-xs">
                      {a.start_date}
                    </TableCell>

                    {/* End Date + Days countdown */}
                    <TableCell className="whitespace-nowrap">
                      <div className="text-slate-900 font-medium text-xs">{a.end_date}</div>
                      <div className="text-[11px] text-slate-500">
                        {statusInfo.daysText}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={statusInfo.statusKey} label={statusInfo.label} size="xs" />
                    </TableCell>

                    {/* Notes & Document */}
                    <TableCell className="max-w-xs text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {a.notes ? (
                          <span className="truncate text-slate-600 max-w-[180px]" title={a.notes}>
                            {a.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Standard authorization</span>
                        )}
                        {a.document_id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(a.document_id, token)}
                            className="h-5 px-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold gap-0.5"
                            title="View uploaded authorization document"
                          >
                            Doc <ExternalLink size={10} />
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="whitespace-nowrap">
                      {a.status === 'pending' ? (
                        <div className="inline-flex items-center gap-1.5">
                          {onEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(a)}
                              className="h-7 px-2 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onReview(a.id, 'approved')}
                            disabled={reviewingId === a.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-xs"
                          >
                            {reviewingId === a.id && reviewAction === 'approved' ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onReview(a.id, 'rejected')}
                            disabled={reviewingId === a.id}
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 h-7 px-2.5 text-xs"
                          >
                            {reviewingId === a.id && reviewAction === 'rejected' ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          {onEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(a)}
                              className="h-7 px-2 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </Button>
                          )}
                          <Link
                            to={`/admin/clients/${a.client_id}`}
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
