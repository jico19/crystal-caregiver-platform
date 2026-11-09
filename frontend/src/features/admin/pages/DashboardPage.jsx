import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  FileCheck,
  GraduationCap,
  BarChart3,
  ArrowRight,
  FileText,
  Lock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin, isStateAdmin, stateLabelFor } from '../../../shared/lib/roles';
import useFetch from '../../../shared/hooks/useFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import AdminOperationsChart from '../components/AdminOperationsChart';
import AdminFunnelChart from '../components/AdminFunnelChart';
import StateAdminDashboardPage from './StateAdminDashboardPage';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SuperAdminDashboardView() {
  const { token, user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user);
  const ADMIN_STATE_SLUGS = { FL: 'florida', IN: 'indiana', GA: 'georgia' };
  const adminStateSlug = isSuperAdminUser ? null : ADMIN_STATE_SLUGS[stateLabelFor(user)] || 'florida';
  const [selectedState, setSelectedState] = useState(isSuperAdminUser ? 'all' : adminStateSlug);

  const { data, isLoading, error } = useFetch('/admin/dashboard', {
    params: { state: selectedState },
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
  const errorMsg = error ? 'Failed to load operational metrics.' : '';

  return (
    <PageContainer>
      {/* Top Header & State Selector */}
      <PageHeader
        title="Administrative Operations Hub"
        subtitle="Multi-state oversight for Florida, Indiana, and Georgia home care branches."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700">
              Jurisdiction:
            </span>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="h-8 w-48 text-xs bg-white">
                <SelectValue placeholder="Select Jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {isSuperAdminUser && <SelectItem value="all">All States (FL, IN, GA)</SelectItem>}
                  {(isSuperAdminUser || adminStateSlug === 'florida') && <SelectItem value="florida">Florida (FL)</SelectItem>}
                  {(isSuperAdminUser || adminStateSlug === 'indiana') && <SelectItem value="indiana">Indiana (IN)</SelectItem>}
                  {(isSuperAdminUser || adminStateSlug === 'georgia') && <SelectItem value="georgia">Georgia (GA)</SelectItem>}
                </SelectGroup>
              </SelectContent>
            </Select>
            {isLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Loader2 size={13} className="animate-spin" />
                Updating...
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

      {/* Operational Jurisdiction Status Banner */}
      <Card className="mb-6 p-5 flex flex-wrap items-center justify-between gap-4 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Multi-State Operations Hub</div>
            <h1 className="text-xl font-bold text-slate-900">With Open Arms Healthcare Operations</h1>
            <p className="text-xs text-slate-500">Florida, Indiana & Georgia State Branches</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
            All Branches Synced
          </Badge>
          <Badge variant="outline" className="font-medium capitalize text-slate-700">
            {selectedState === 'all' ? 'All Jurisdictions' : selectedState}
          </Badge>
        </div>
      </Card>

      {/* Department & Operational Portal Launchers */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Operational Departments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            to="/admin/referrals"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Client Services</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Client Intake Dashboard
              </h3>
              <p className="text-xs text-slate-500 truncate">Referrals, intakes & admissions</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          <Link
            to="/admin/caregivers"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Human Resources</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Staffing & Caregiver Pool
              </h3>
              <p className="text-xs text-slate-500 truncate">Roster, credentials & onboarding</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          <Link
            to="/admin/authorizations"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Billing & Clinical</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Authorizations Tracker
              </h3>
              <p className="text-xs text-slate-500 truncate">State waivers & unit burn-down</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          <Link
            to="/admin/documents"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileCheck size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Compliance</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Document Verification
              </h3>
              <p className="text-xs text-slate-500 truncate">CPR, CNA, TB test & screening</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          <Link
            to="/admin/training"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Education</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                In-Service Training Portal
              </h3>
              <p className="text-xs text-slate-500 truncate">Annual courses & certifications</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          <Link
            to="/admin/reports"
            className="group flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500/50 hover:shadow-xs transition-colors"
          >
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BarChart3 size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Operations</span>
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Reports & Analytics
              </h3>
              <p className="text-xs text-slate-500 truncate">Audit trails & state metrics</p>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>
        </div>
      </div>

      {/* Key Monthly Metrics Strip */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Key Operational Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500">Active Clients</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {isLoading ? <Skeleton className="h-7 w-14" /> : metrics.total_clients}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Link to="/admin/clients" className="text-xs text-emerald-600 hover:underline font-medium inline-flex items-center gap-1 mt-1">
                View Client Roster <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500">New Referrals</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {isLoading ? <Skeleton className="h-7 w-14" /> : metrics.new_referrals}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Link to="/admin/referrals" className="text-xs text-emerald-600 hover:underline font-medium inline-flex items-center gap-1 mt-1">
                Intake Pipeline <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500">Active Caregivers</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {isLoading ? <Skeleton className="h-7 w-14" /> : metrics.total_caregivers}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Link to="/admin/caregivers" className="text-xs text-emerald-600 hover:underline font-medium inline-flex items-center gap-1 mt-1">
                Manage Staff <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500">Pending Compliance</CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600">
                {isLoading ? <Skeleton className="h-7 w-14" /> : metrics.pending_compliance}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Link to="/admin/documents" className="text-xs text-amber-600 hover:underline font-medium inline-flex items-center gap-1 mt-1">
                {metrics.pending_applications} apps, {metrics.pending_documents} docs <ArrowRight size={12} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operational Trends & Funnel Analytics */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Operational Analytics & Pipeline Charts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminOperationsChart selectedState={selectedState} />
          <AdminFunnelChart metrics={metrics} />
        </div>
      </div>

      {/* Main 2-Column Section: Recent Intakes + Action Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Recent Client Intakes Table */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Recent Client Intakes</CardTitle>
              <CardDescription className="text-xs text-slate-500">Latest referrals and admission requests</CardDescription>
            </div>
            <Link to="/admin/referrals" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
              View All Intakes <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentIntakes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No recent intakes found for this jurisdiction.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-xs text-slate-500 font-semibold">Name</TableHead>
                    <TableHead className="text-xs text-slate-500 font-semibold">Source</TableHead>
                    <TableHead className="text-xs text-slate-500 font-semibold">Status</TableHead>
                    <TableHead className="text-xs text-slate-500 font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIntakes.map((intake) => (
                    <TableRow key={intake.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-800 text-xs">
                        {intake.first_name} {intake.last_name}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {intake.referral_source || 'Direct'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <StatusBadge status={intake.status} size="xs" />
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {intake.created_at ? new Date(intake.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right: Open Tasks & Follow-ups */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Open Tasks & Follow-ups</CardTitle>
              <CardDescription className="text-xs text-slate-500">Items requiring administrative action</CardDescription>
            </div>
            <Badge variant="secondary" className="font-medium text-xs">
              {openTasks.length} pending
            </Badge>
          </CardHeader>
          <CardContent className="p-5">
            {openTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All compliance and intake tasks are up to date.
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

      {/* Announcements & Quick Launch Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements (2 cols on lg) */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold text-slate-900">Agency Announcements</CardTitle>
            <Link to="/admin/announcements" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
              Manage Announcements <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            {announcements.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No active announcements posted.
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

        {/* Quick External & Internal Links (1 col on lg) */}
        <Card className="border-slate-200">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link to="/admin/settings" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" /> Intake & Admission Forms
                </Link>
              </li>
              <li>
                <Link to="/admin/authorizations" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <ShieldCheck size={14} className="text-slate-400" /> State Medicaid Authorizations
                </Link>
              </li>
              <li>
                <Link to="/admin/training" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <GraduationCap size={14} className="text-slate-400" /> Staff Training Portal
                </Link>
              </li>
              <li>
                <Link to="/admin/audit-logs" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" /> Security & Audit Trail
                </Link>
              </li>
              <li>
                <Link to="/admin/users" className="text-slate-700 hover:text-emerald-600 transition-colors flex items-center gap-2">
                  <Users size={14} className="text-slate-400" /> Admin User Management
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (isStateAdmin(user)) {
    return <StateAdminDashboardPage />;
  }

  return <SuperAdminDashboardView />;
}
