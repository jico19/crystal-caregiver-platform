import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Kanban,
  Table2,
  ArrowRight,
  Search,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  RotateCcw,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import { api } from '../../../shared/services/api';
import useFetch from '../../../shared/hooks/useFetch';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import Pagination from '../../../shared/components/common/Pagination';
import EmptyState from '../../../shared/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_CONFIG = {
  new: {
    label: 'New Lead',
    border: 'border-amber-200 hover:border-amber-400',
    headerBg: 'bg-amber-500/10 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  contacted: {
    label: 'In Evaluation',
    border: 'border-sky-200 hover:border-sky-400',
    headerBg: 'bg-sky-500/10 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    icon: Phone,
  },
  converted: {
    label: 'Converted to Client',
    border: 'border-emerald-200 hover:border-emerald-400',
    headerBg: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: UserCheck,
  },
  closed: {
    label: 'Closed / Archived',
    border: 'border-slate-200 hover:border-slate-300',
    headerBg: 'bg-slate-500/10 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: XCircle,
  },
};

const STATE_BADGE_STYLES = {
  FL: 'bg-amber-50 text-amber-900 border-amber-200',
  IN: 'bg-sky-50 text-sky-900 border-sky-200',
  GA: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

export default function ReferralsPage() {
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
  const [notesDraft, setNotesDraft] = useState('');

  // Fetch states
  const { data: statesData } = useFetch('/states', { defaultData: [] });
  const allStates = Array.isArray(statesData) ? statesData : statesData?.states || [];
  const states = isSuperAdminUser ? allStates : allStates.filter((st) => String(st.id) === String(adminStateId));

  // Analytics
  const { data: analyticsData, reload: reloadAnalytics } = useFetch('/admin/referrals/analytics', {
    params: {
      ...(filterState !== 'all' ? { state_id: filterState } : {}),
    },
    enabled: !!token,
  });

  const analytics = analyticsData || {
    total_referrals: 0,
    by_status: { new: 0, contacted: 0, converted: 0, closed: 0 },
    by_source: [],
    conversion_rate_pct: 0,
  };

  const params = {
    status: filterStatus === 'all' ? '' : filterStatus,
    state_id: filterState === 'all' ? '' : filterState,
    ...(filterUnassigned ? { unassigned: 'true' } : {}),
  };

  const {
    items: referrals,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    reload: reloadTable,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/referrals',
    token,
    params,
    listKey: 'referrals',
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

  async function handleSaveNotes() {
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
                onOpenNotes={(ref) => { setNotesTarget(ref); setNotesDraft(ref.handled_notes || ''); }}
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
                onOpenNotes={(ref) => { setNotesTarget(ref); setNotesDraft(ref.handled_notes || ''); }}
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
                onOpenNotes={(ref) => { setNotesTarget(ref); setNotesDraft(ref.handled_notes || ''); }}
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
                onOpenNotes={(ref) => { setNotesTarget(ref); setNotesDraft(ref.handled_notes || ''); }}
              />
            ))}
          </PipelineColumn>
        </div>
      ) : (
        /* Roster Table View */
        <Card className="border-slate-200 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading referrals roster...</div>
            ) : filteredReferrals.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No referrals found"
                  description="Adjust your search query or filter parameters."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/75">
                    <TableHead className="text-xs font-semibold text-slate-700">Client Lead</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Jurisdiction</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Stage</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Source</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Contact</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Intake Notes</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((r) => {
                    const stCode = r.states?.code || r.state_code || 'FL';
                    const badgeClass = STATE_BADGE_STYLES[stCode] || 'bg-slate-50 text-slate-700 border-slate-200';
                    return (
                      <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {r.first_name} {r.last_name}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Recv: {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold border ${badgeClass}`}>
                            {stCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.status}
                            onValueChange={(val) => handleStatusSelect(r, val)}
                            disabled={updatingId === r.id}
                          >
                            <SelectTrigger className="h-7 w-32 text-[11px] bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                  <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {r.referral_source || 'Website'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            {r.phone && (
                              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700">
                                <Phone size={10} className="text-slate-400" /> {r.phone}
                              </a>
                            )}
                            {r.email && (
                              <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 text-[11px]">
                                <Mail size={10} className="text-slate-400" /> {r.email}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                          {r.handled_notes || <span className="text-slate-300 italic">No notes</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setNotesTarget(r); setNotesDraft(r.handled_notes || ''); }}
                              className="h-7 text-xs border-slate-200 hover:bg-slate-50"
                            >
                              <FileText size={11} className="mr-1" /> Notes
                            </Button>
                            {r.status === 'converted' && r.converted_client_id && (
                              <Button variant="outline" size="sm" asChild className="h-7 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                                <Link to={`/admin/clients/${r.converted_client_id}`}>
                                  Client <ArrowRight size={10} className="ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="p-3 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pages}
                total={total}
                pageSize={pageSize}
                listLabel="referrals"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal for Client Conversion */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Client Admission Conversion</DialogTitle>
            <DialogDescription>
              {confirmTarget
                ? `Converting ${confirmTarget.first_name} ${confirmTarget.last_name} will automatically provision an active client profile and intake file mapped to state jurisdiction ${confirmTarget.states?.code || confirmTarget.state_code || 'assigned'}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updatingId === confirmTarget?.id}
              onClick={() => executeStatusChange(confirmTarget, 'converted')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updatingId === confirmTarget?.id ? 'Converting...' : 'Confirm & Convert to Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesTarget} onOpenChange={(open) => !open && setNotesTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Intake & Coordination Notes</DialogTitle>
            <DialogDescription>
              {notesTarget ? `${notesTarget.first_name} ${notesTarget.last_name} · ${notesTarget.phone || 'No phone'}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Internal Intake Notes</label>
            <textarea
              rows={4}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Record phone contact outcomes, care requirements, physician details, or follow-up dates..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotesTarget(null)}>
              Close
            </Button>
            <Button size="sm" onClick={handleSaveNotes} className="bg-slate-900 hover:bg-slate-800 text-white">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Subcomponent: Pipeline Column
function PipelineColumn({ title, count, config, emptyMessage, children }) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90 flex flex-col min-h-[480px]">
      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border mb-3 font-semibold text-xs tracking-wide uppercase ${config.headerBg}`}>
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
function ReferralPipelineCard({ referral: r, updatingId, onStatusChange, onOpenNotes }) {
  const stCode = r.states?.code || r.state_code || 'FL';
  const badgeClass = STATE_BADGE_STYLES[stCode] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <Card className={`p-3 border bg-white shadow-2xs transition-all ${STATUS_CONFIG[r.status]?.border || 'border-slate-200'}`}>
      {/* Top Header: Name & State */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div>
          <span className="font-bold text-xs text-slate-900 block leading-tight">
            {r.first_name} {r.last_name}
          </span>
          <span className="text-[10px] text-slate-400 font-normal inline-flex items-center gap-1 mt-0.5">
            <Calendar size={10} /> {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
          </span>
        </div>
        <Badge variant="outline" className={`text-[10px] font-semibold uppercase px-1.5 py-0 border ${badgeClass}`}>
          {stCode}
        </Badge>
      </div>

      {/* Contact Details */}
      <div className="bg-slate-50/75 rounded-md p-2 mb-2 flex flex-col gap-1 border border-slate-100">
        {r.phone ? (
          <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-xs text-slate-800 hover:text-emerald-700 font-medium">
            <Phone size={11} className="text-slate-400 shrink-0" /> {r.phone}
          </a>
        ) : (
          <span className="text-[11px] text-slate-400 italic">No phone on file</span>
        )}
        {r.email && (
          <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-700 truncate">
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
                  <SelectItem key={k} value={k} className="text-xs">{cfg.label}</SelectItem>
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
              <Link to={`/admin/clients/${r.converted_client_id}`} title="View Client File">
                <ArrowRight size={11} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
