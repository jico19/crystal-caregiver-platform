import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  FileCheck,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { stateLabelFor, stateOfficeTitleFor } from '../../../shared/lib/roles';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const STATE_NAMES = {
  FL: 'Florida',
  IN: 'Indiana',
  GA: 'Georgia',
};

export default function StateAdminDashboardPage() {
  const { token, user } = useAuth();
  const stateCode = stateLabelFor(user);
  const stateName = STATE_NAMES[stateCode] || stateCode;
  const officeTitle = stateOfficeTitleFor(user);

  const { data, isLoading, error } = useFetch('/admin/dashboard', {
    enabled: !!token,
  });

  const metrics = data?.metrics || {
    total_caregivers: 0,
    total_clients: 0,
    pending_applications: 0,
    pending_documents: 0,
    new_referrals: 0,
    pending_compliance: 0,
  };

  const recentIntakes = data?.recent_intakes || [];
  const openTasks = data?.open_tasks || [];
  const announcements = data?.announcements || [];
  const errorMsg = error ? 'Failed to load regional operational metrics.' : '';

  return (
    <PageContainer>
      {/* Top Header */}
      <PageHeader
        title={`${stateName} Branch Operations`}
        subtitle={`Daily clinical intake, caregiver onboarding, and client casework for ${stateName}.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 bg-white border-slate-200 text-slate-800">
              {stateCode} Jurisdiction Scoped
            </Badge>
            {isLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Loader2 size={13} className="animate-spin" />
                Syncing...
              </span>
            )}
          </div>
        }
      />

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Regional Office Status Banner */}
      <Card className="mb-6 p-5 border-slate-200 bg-linear-to-r from-emerald-50/50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Regional Branch</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{officeTitle}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {stateName} Home Care Operations
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Regional Director & Intake Coordination Desk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-100/70 text-emerald-800 border-emerald-200 text-xs">
              <CheckCircle2 size={12} className="mr-1 text-emerald-600" /> State Active
            </Badge>
            <Badge variant="outline" className="text-xs text-slate-600">
              Assigned ID: #{user?.state_id || stateCode}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Daily Casework Action Triage Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Daily Operational Queues
          </h2>
          <span className="text-xs text-slate-400">Action items requiring attention</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* New Referrals Queue */}
          <Card className="border-slate-200 hover:border-emerald-300 transition-colors">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium text-slate-500">New Client Referrals</CardDescription>
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <UserPlus size={16} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-600 mt-1">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.new_referrals}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <p className="text-[11px] text-slate-400 mb-2">Awaiting intake & assessment</p>
              <Button variant="outline" size="sm" asChild className="w-full h-7 text-xs border-emerald-600/30 text-emerald-700 hover:bg-emerald-50">
                <Link to="/admin/referrals">
                  Triage Pipeline <ArrowRight size={12} className="ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pending Applications Queue */}
          <Card className="border-slate-200 hover:border-amber-300 transition-colors">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium text-slate-500">Caregiver Applicants</CardDescription>
                <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                  <FileCheck size={16} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-amber-600 mt-1">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.pending_applications}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <p className="text-[11px] text-slate-400 mb-2">Submissions pending review</p>
              <Button variant="outline" size="sm" asChild className="w-full h-7 text-xs border-amber-600/30 text-amber-700 hover:bg-amber-50">
                <Link to="/admin/caregivers">
                  Review Applicants <ArrowRight size={12} className="ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Document Verification Queue */}
          <Card className="border-slate-200 hover:border-blue-300 transition-colors">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium text-slate-500">Pending Documents</CardDescription>
                <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-blue-600 mt-1">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.pending_documents}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <p className="text-[11px] text-slate-400 mb-2">CPR, TB, CNA verifications</p>
              <Button variant="outline" size="sm" asChild className="w-full h-7 text-xs border-blue-600/30 text-blue-700 hover:bg-blue-50">
                <Link to="/admin/documents">
                  Verify Credentials <ArrowRight size={12} className="ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Active Caseload */}
          <Card className="border-slate-200">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-medium text-slate-500">Active Branch Roster</CardDescription>
                <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                  <Users size={16} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : metrics.total_clients}
                </span>
                <span className="text-xs text-slate-500">clients /</span>
                <span className="text-lg font-semibold text-slate-700">
                  {isLoading ? <Skeleton className="h-5 w-8 inline-block" /> : metrics.total_caregivers}
                </span>
                <span className="text-xs text-slate-500">caregivers</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <p className="text-[11px] text-slate-400 mb-2">Regional active caseload</p>
              <Button variant="outline" size="sm" asChild className="w-full h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                <Link to="/admin/clients">
                  View Client Roster <ArrowRight size={12} className="ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main 2-Column Casework Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Recent Intakes for this State */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Incoming Client Referrals ({stateCode})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Recent referrals needing contact and intake coordination
              </CardDescription>
            </div>
            <Link to="/admin/referrals" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
              All Referrals <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentIntakes.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No pending client intakes for the {stateName} branch.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50">
                    <TableHead className="text-xs text-slate-500 font-semibold">Client</TableHead>
                    <TableHead className="text-xs text-slate-500 font-semibold">Source</TableHead>
                    <TableHead className="text-xs text-slate-500 font-semibold">Status</TableHead>
                    <TableHead className="text-right text-xs text-slate-500 font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIntakes.map((intake) => (
                    <TableRow key={intake.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-800 text-xs">
                        <div>{intake.first_name} {intake.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {intake.created_at ? new Date(intake.created_at).toLocaleDateString() : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {intake.referral_source || 'Direct Contact'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <StatusBadge status={intake.status} size="xs" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild className="h-6 text-[11px] px-2 text-emerald-700 border-emerald-600/30 hover:bg-emerald-50">
                          <Link to="/admin/referrals">
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right: Operational Action Tasks & Triage */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Branch Follow-ups & Tasks
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Credentials, renewals, and authorization reminders
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-medium text-xs">
              {openTasks.length} queued
            </Badge>
          </CardHeader>
          <CardContent className="p-5">
            {openTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                All branch intake and compliance queues are cleared.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {openTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${
                          task.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-xs text-slate-800">{task.title}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{task.category}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                      <Link to={task.target_url}>Resolve</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regional Quick Operations & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Announcements (2 cols) */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">
              {stateName} Office Announcements
            </CardTitle>
            <Link to="/admin/announcements" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
              Post Announcement <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {announcements.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No announcements posted for {stateName}.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-xs text-slate-900">{ann.title}</h4>
                      <span className="text-[10px] text-slate-400">
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{ann.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Quick Launch (1 col) */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Branch Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link to="/admin/authorizations" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <ShieldCheck size={14} className="text-slate-400" /> Medicaid Waiver Authorizations
                </Link>
              </li>
              <li>
                <Link to="/admin/documents" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <FileCheck size={14} className="text-slate-400" /> Credential Review Queue
                </Link>
              </li>
              <li>
                <Link to="/admin/training" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <GraduationCap size={14} className="text-slate-400" /> Caregiver In-Service Courses
                </Link>
              </li>
              <li>
                <Link to="/admin/referrals" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <PhoneCall size={14} className="text-slate-400" /> Intake Calls & Assessment Log
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
