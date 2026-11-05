import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, Table2, ArrowRight, Search, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { isSuperAdmin } from '@/shared/lib/roles';
import { api } from '@/shared/services/api';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_CONFIG } from './referralPresentation';
import { PipelineColumn, ReferralPipelineCard } from './ReferralPipeline';
import ReferralTable from './ReferralTable';
import ReferralConversionDialog from './ReferralConversionDialog';
import ReferralNotesDialog from './ReferralNotesDialog';
import { useReferralRecords } from './useReferralRecords';

export default function ReferralsPage() {
  const { user } = useAuth();
  return <ReferralsSession key={`${user?.id ?? 'anon'}:${user?.state_id ?? ''}:${user?.role ?? ''}`} />;
}

function ReferralsSession() {
  const { token, user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user);
  const adminStateId = isSuperAdminUser ? null : user?.state_id;

  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState, setFilterState] = useState(isSuperAdminUser ? 'all' : String(adminStateId || ''));
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [convertedClientId, setConvertedClientId] = useState(null);

  // Modals state
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);

  function openNotes(referral) { setNotesTarget(referral); }

  const { states, analytics, referrals, total, pages, page, pageSize, loading, error,
    reloadTable, reloadAnalytics, setPage, setPageSize } = useReferralRecords({
      isSuperAdminUser, adminStateId, filterState, filterStatus, filterUnassigned,
    });

  function reloadAll() {
    reloadTable();
    reloadAnalytics();
  }

  function handleResetFilters() {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterState(isSuperAdminUser ? 'all' : String(adminStateId || ''));
    setFilterUnassigned(false);
    setErrorMsg('');
    setSuccessMsg('');
    setConvertedClientId(null);
  }

  async function executeStatusChange(referral, targetStatus) {
    if (referral.status === targetStatus) return;
    setUpdatingId(referral.id);
    setErrorMsg('');
    setSuccessMsg('');
    setConvertedClientId(null);
    try {
      const res = await api.patch(`/admin/referrals/${referral.id}`, { status: targetStatus }, token);
      if (targetStatus === 'converted' && res?.client_id) {
        setConvertedClientId(res.client_id);
        setSuccessMsg(`Referral for ${referral.first_name} ${referral.last_name} converted to client profile.`);
      } else {
        setSuccessMsg(`Referral marked as "${STATUS_CONFIG[targetStatus]?.label || targetStatus}".`);
      }
      reloadAll();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update referral status.');
    } finally {
      setUpdatingId(null);
      setConfirmTarget(null);
    }
  }

  function handleStatusSelect(referral, targetStatus) {
    if (targetStatus === 'converted') {
      setConfirmTarget(referral);
    } else {
      executeStatusChange(referral, targetStatus);
    }
  }

  async function handleSaveNotes(notesDraft) {
    if (!notesTarget) return;
    try {
      await api.patch(`/admin/referrals/${notesTarget.id}`, { handled_notes: notesDraft }, token);
      setSuccessMsg(`Intake notes updated for ${notesTarget.first_name} ${notesTarget.last_name}.`);
      setNotesTarget(null);
      reloadAll();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to save intake notes.');
    }
  }

  // Client-side search filtering
  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase().trim();
    return referrals.filter((r) => {
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
      const phone = (r.phone || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const source = (r.referral_source || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || source.includes(q);
    });
  }, [referrals, searchQuery]);

  // Grouped for pipeline
  const pipelineNew = filteredReferrals.filter((r) => r.status === 'new');
  const pipelineContacted = filteredReferrals.filter((r) => r.status === 'contacted');
  const pipelineConverted = filteredReferrals.filter((r) => r.status === 'converted');
  const pipelineClosed = filteredReferrals.filter((r) => r.status === 'closed');

  const hasActiveFilters = filterStatus !== 'all' || filterState !== (isSuperAdminUser ? 'all' : String(adminStateId || '')) || filterUnassigned || searchQuery.trim() !== '';

  return (
    <PageContainer>
      <PageHeader
        title="CRM & Referrals Pipeline"
        subtitle="Manage inbound patient inquiries, conversion funnel, and care admissions across state jurisdictions."
        badge={`${analytics.total_referrals} Total Leads`}
        badgeVariant="primary"
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="h-9 p-1 bg-slate-100">
                <TabsTrigger value="pipeline" className="text-xs flex items-center gap-1.5 h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <Kanban size={13} /> Pipeline View
                </TabsTrigger>
                <TabsTrigger value="table" className="text-xs flex items-center gap-1.5 h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  <Table2 size={13} /> Roster Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4 text-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="destructive" className="mb-4 text-xs">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="mb-4 flex items-center justify-between text-xs border-emerald-200 bg-emerald-50 text-emerald-900 shadow-xs">
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> {successMsg}
            </span>
            {convertedClientId && (
              <Link to={`/admin/clients/${convertedClientId}`} className="font-semibold ml-3 hover:underline inline-flex items-center gap-1 text-emerald-800">
                Admit Client Record <ArrowRight size={12} />
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* High-Density CRM Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Leads</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{analytics.total_referrals}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All received inquiries</div>
        </Card>

        <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wide">New Inquiries</span>
            <span className="size-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{analytics.by_status?.new || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting initial call</div>
        </Card>

        <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-sky-700 uppercase tracking-wide">In Evaluation</span>
            <span className="size-2 rounded-full bg-sky-500" />
          </div>
          <div className="text-xl font-bold text-sky-700 mt-1 tabular-nums">{analytics.by_status?.contacted || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Intake underway</div>
        </Card>

        <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide">Converted</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{analytics.by_status?.converted || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Admitted as clients</div>
        </Card>

        <Card className="p-3 border-slate-200/90 shadow-2xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Funnel Rate</span>
            <Sparkles size={13} className="text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{analytics.conversion_rate_pct}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lead-to-client admission</div>
        </Card>
      </div>

      {/* Dense Filter & Search Toolbar */}
      <Card className="p-2.5 mb-5 border-slate-200 shadow-2xs bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Instant Search Bar */}
            <div className="relative min-w-[220px] max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs w-full bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* Jurisdiction Dropdown */}
            <Select value={filterState} onValueChange={(val) => { setFilterState(val); setPage(1); }}>
              <SelectTrigger className="h-8 w-40 text-xs bg-white border-slate-200">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {isSuperAdminUser && <SelectItem value="all">All Jurisdictions</SelectItem>}
                  {states.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name} ({st.code})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Stage Dropdown (Table view) */}
            {viewMode === 'table' && (
              <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Stages</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                      <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}

            {/* Unassigned Filter Checkbox */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer border border-slate-200 rounded-md px-2.5 py-1.5 bg-white hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={filterUnassigned}
                onChange={(e) => setFilterUnassigned(e.target.checked)}
                className="accent-slate-900 size-3.5"
              />
              Unassigned Only
            </label>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2"
              >
                <RotateCcw size={12} /> Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-center">
            Showing <strong className="text-slate-900 tabular-nums">{filteredReferrals.length}</strong> of <strong className="text-slate-900 tabular-nums">{total}</strong> leads
          </div>
        </div>
      </Card>

      {/* Main View Area */}
      {viewMode === 'pipeline' ? (
        /* Visual Kanban Pipeline */
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
                onOpenNotes={openNotes}
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
                onOpenNotes={openNotes}
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
                onOpenNotes={openNotes}
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
                onOpenNotes={openNotes}
              />
            ))}
          </PipelineColumn>
        </div>
      ) : (
        <ReferralTable loading={loading} referrals={filteredReferrals} updatingId={updatingId}
          onStatusChange={handleStatusSelect} onOpenNotes={openNotes}
          pagination={{ page, pages, total, pageSize, setPage, setPageSize }} />
      )}

      <ReferralConversionDialog target={confirmTarget} updatingId={updatingId}
        onClose={() => setConfirmTarget(null)} onConfirm={() => executeStatusChange(confirmTarget, 'converted')} />

      {notesTarget && <ReferralNotesDialog key={notesTarget.id} target={notesTarget}
        onClose={() => setNotesTarget(null)} onSave={handleSaveNotes} />}
    </PageContainer>
  );
}

