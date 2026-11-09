import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_CONFIG, STATE_BADGE_STYLES } from './referralConfig';

export default function ReferralPipeline({
  pipelineNew,
  pipelineContacted,
  pipelineConverted,
  pipelineClosed,
  updatingId,
  handleStatusSelect,
  onOpenNotes,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 items-start">
      {/* Column 1: New Referrals */}
      <PipelineColumn
        title="1. New Inquiries"
        count={pipelineNew.length}
        config={STATUS_CONFIG.new}
        emptyMessage="No new inquiries waiting"
      >
        {pipelineNew.map((r) => (
          <ReferralPipelineCard
            key={r.id}
            referral={r}
            updatingId={updatingId}
            onStatusChange={handleStatusSelect}
            onOpenNotes={onOpenNotes}
          />
        ))}
      </PipelineColumn>

      {/* Column 2: In Evaluation / Contacted */}
      <PipelineColumn
        title="2. In Evaluation"
        count={pipelineContacted.length}
        config={STATUS_CONFIG.contacted}
        emptyMessage="No intakes in evaluation"
      >
        {pipelineContacted.map((r) => (
          <ReferralPipelineCard
            key={r.id}
            referral={r}
            updatingId={updatingId}
            onStatusChange={handleStatusSelect}
            onOpenNotes={onOpenNotes}
          />
        ))}
      </PipelineColumn>

      {/* Column 3: Converted to Client */}
      <PipelineColumn
        title="3. Converted"
        count={pipelineConverted.length}
        config={STATUS_CONFIG.converted}
        emptyMessage="No converted clients yet"
      >
        {pipelineConverted.map((r) => (
          <ReferralPipelineCard
            key={r.id}
            referral={r}
            updatingId={updatingId}
            onStatusChange={handleStatusSelect}
            onOpenNotes={onOpenNotes}
          />
        ))}
      </PipelineColumn>

      {/* Column 4: Closed / Archived */}
      <PipelineColumn
        title="4. Closed / Archived"
        count={pipelineClosed.length}
        config={STATUS_CONFIG.closed}
        emptyMessage="No closed records"
      >
        {pipelineClosed.map((r) => (
          <ReferralPipelineCard
            key={r.id}
            referral={r}
            updatingId={updatingId}
            onStatusChange={handleStatusSelect}
            onOpenNotes={onOpenNotes}
          />
        ))}
      </PipelineColumn>
    </div>
  );
}

// Subcomponent: Pipeline Column
function PipelineColumn({ title, count, config, emptyMessage, children }) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90 flex flex-col min-h-[480px]">
      <div
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border mb-3 font-semibold text-xs tracking-wide uppercase ${config.headerBg}`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${config.dot}`} />
          {title}
        </span>
        <span className="tabular-nums px-1.5 py-0.2 rounded-full bg-white/70 text-slate-800 font-bold text-[11px]">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
        {count === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Subcomponent: Pipeline Card
function ReferralPipelineCard({
  referral: r,
  updatingId,
  onStatusChange,
  onOpenNotes,
}) {
  const stCode = r.states?.code || r.state_code || 'FL';
  const badgeClass =
    STATE_BADGE_STYLES[stCode] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <Card
      className={`p-3 border bg-white shadow-2xs transition-all ${STATUS_CONFIG[r.status]?.border || 'border-slate-200'}`}
    >
      {/* Top Header: Name & State */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div>
          <span className="font-bold text-xs text-slate-900 block leading-tight">
            {r.first_name} {r.last_name}
          </span>
          <span className="text-[10px] text-slate-400 font-normal inline-flex items-center gap-1 mt-0.5">
            <Calendar size={10} />{' '}
            {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold uppercase px-1.5 py-0 border ${badgeClass}`}
        >
          {stCode}
        </Badge>
      </div>

      {/* Contact Details */}
      <div className="bg-slate-50/75 rounded-md p-2 mb-2 flex flex-col gap-1 border border-slate-100">
        {r.phone ? (
          <a
            href={`tel:${r.phone}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-800 hover:text-emerald-700 font-medium"
          >
            <Phone size={11} className="text-slate-400 shrink-0" /> {r.phone}
          </a>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            No phone on file
          </span>
        )}
        {r.email && (
          <a
            href={`mailto:${r.email}`}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-700 truncate"
          >
            <Mail size={11} className="text-slate-400 shrink-0" /> {r.email}
          </a>
        )}
      </div>

      {/* Notes preview */}
      {r.handled_notes ? (
        <div className="text-[11px] text-slate-600 bg-amber-50/40 border border-amber-100/60 rounded p-1.5 mb-2 line-clamp-2">
          {r.handled_notes}
        </div>
      ) : r.notes ? (
        <div className="text-[11px] text-slate-500 italic bg-slate-50 rounded p-1.5 mb-2 line-clamp-2">
          "{r.notes}"
        </div>
      ) : null}

      {/* Source & Actions Toolbar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          {r.referral_source || 'Website'}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenNotes(r)}
            className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900"
            title="Edit Notes"
          >
            <FileText size={12} />
          </Button>

          {/* Quick Stage Transition Dropdown */}
          <Select
            value={r.status}
            onValueChange={(val) => onStatusChange(r, val)}
            disabled={updatingId === r.id}
          >
            <SelectTrigger className="h-6 px-2 text-[10px] bg-white border-slate-200 font-medium w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {r.status === 'converted' && r.converted_client_id && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-6 px-1.5 text-[10px] border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Link
                to={`/admin/clients/${r.converted_client_id}`}
                title="View Client File"
              >
                <ArrowRight size={11} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
