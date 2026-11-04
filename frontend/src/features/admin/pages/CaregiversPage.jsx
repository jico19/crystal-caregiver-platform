import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import useFetch from '../../../shared/hooks/useFetch';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import Pagination from '../../../shared/components/common/Pagination';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CaregiversPage() {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState('pool'); // 'pool' | 'applicants'
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch Staffing Analytics
  const { data: analyticsData } = useFetch('/admin/caregivers/analytics', {
    enabled: !!token,
  });

  const analytics = analyticsData || {
    total_caregivers: 0,
    pending_applications: 0,
    in_onboarding: 0,
    by_state: {},
  };

  const {
    items: applications,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
  } = usePaginatedFetch({
    url: '/admin/caregivers',
    token,
    params: viewMode === 'applicants'
      ? { has_application: true, ...(statusFilter === 'all' ? {} : { status: statusFilter }) }
      : {},
    listKey: 'applications',
  });

  return (
    <PageContainer>
      <PageHeader
        title="Staffing & Caregiver Pool"
        subtitle="Oversight of active caregiver roster, credential compliance, and onboarding applicant review."
        badge={`${analytics.total_caregivers} Caregivers`}
        badgeVariant="primary"
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="h-8">
                <TabsTrigger value="pool" className="text-xs flex items-center gap-1.5 h-7 px-3">
                  <Users size={13} /> Caregiver Roster
                </TabsTrigger>
                <TabsTrigger value="applicants" className="text-xs flex items-center gap-1.5 h-7 px-3">
                  <FileText size={13} /> Applicant Queue ({analytics.pending_applications})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-6 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Staffing KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-slate-500">Total Caregivers</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">{analytics.total_caregivers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-400">
            Registered caregivers
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-slate-500">Pending Reviews</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">{analytics.pending_applications ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-400">
            Awaiting review
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-slate-500">In Onboarding</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">{analytics.in_onboarding ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-400">
            Training & screening
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-medium text-slate-500">Approved Applications</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {analytics.approved ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-400">
            Application review complete
          </CardContent>
        </Card>
      </div>

      {/* Main View Area */}
      {viewMode === 'pool' ? (
        /* Active Caregiver Pool with Credential Compliance Tracking */
        <Card className="overflow-hidden mb-6 border-slate-200">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="font-bold text-sm text-slate-900">Caregiver Roster & Compliance Status</CardTitle>
              <CardDescription className="text-xs text-slate-500">Live credential status: CPR, CNA, TB test, and state licenses</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs text-emerald-600 border-emerald-600 hover:bg-emerald-50">
              <Link to="/admin/documents">
                Verify Credentials Queue <ArrowRight size={12} className="ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading caregiver roster...</div>
            ) : applications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No caregivers found"
                  description="No caregivers are currently registered in your jurisdiction."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50">
                    <TableHead className="text-xs font-semibold text-slate-600">Caregiver Name</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Jurisdiction</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Contact Phone</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Compliance Gate</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const caregiver = app.caregivers || {};
                    const firstName = caregiver.first_name ?? app.first_name;
                    const lastName = caregiver.last_name ?? app.last_name;
                    const address = caregiver.address ?? app.address;
                    const phone = caregiver.phone ?? app.phone;
                    const stateCode = app.states?.code ?? app.state_code ?? app.state?.code ?? '—';
                    const compliance = app.compliance;
                    const isCompliant = compliance?.is_compliant;
                    const applicationId = app.application_id;

                    return (
                      <TableRow key={app.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-xs">
                            {firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Caregiver'}
                          </div>
                          <div className="text-[11px] text-slate-400">{address || 'No address on file'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium text-xs text-slate-600">
                            {stateCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {phone || 'No phone'}
                        </TableCell>
                        <TableCell>
                          {isCompliant === undefined ? (
                            <Badge variant="outline" className="text-[11px] text-slate-600">Not checked</Badge>
                          ) : isCompliant ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                              ✓ Credentials current
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="text-[11px]"
                              title={compliance.blocking_reasons?.join(', ')}
                            >
                              ⚠ Action Required
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.application_status || 'not_started'} size="xs" />
                        </TableCell>
                        <TableCell className="text-right">
                          {applicationId ? (
                            <Button variant="outline" size="sm" asChild className="h-7 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                              <Link to={`/admin/caregivers/${applicationId}`}>
                                Details <ArrowRight size={11} className="ml-1" />
                              </Link>
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="p-4 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pages}
                total={total}
                pageSize={pageSize}
                listLabel="caregivers"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Applicant Review Queue */
        <Card className="overflow-hidden mb-6 border-slate-200">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Filter Stage:
              </span>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="h-8 w-52 text-xs bg-white">
                  <SelectValue placeholder="Filter Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Applicants</SelectItem>
                    <SelectItem value="submitted">Submitted (Awaiting Review)</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-slate-500">
              Showing <strong>{applications.length}</strong> applicants
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading applicants...</div>
            ) : applications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No applicants found"
                  description="No caregiver applications found for the selected status."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50">
                    <TableHead className="text-xs font-semibold text-slate-600">Applicant Name</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Jurisdiction</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Phone</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Submission Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-600">Review Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const caregiver = app.caregivers || app;

                    return (
                      <TableRow key={app.id} className="border-slate-100 hover:bg-slate-50">
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {caregiver.first_name ? `${caregiver.first_name} ${caregiver.last_name}` : 'Applicant'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          {app.state_code || app.states?.code || '—'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">{caregiver.phone || '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {app.application_submitted_at
                            ? new Date(app.application_submitted_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.application_status || 'not_started'} size="xs" />
                        </TableCell>
                        <TableCell className="text-right">
                          {app.application_id && <Button size="sm" asChild className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Link to={`/admin/caregivers/${app.application_id}`}>
                              Review <ArrowRight size={11} className="ml-1" />
                            </Link>
                          </Button>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="p-4 border-t border-slate-100">
              <Pagination
                page={page}
                pages={pages}
                total={total}
                pageSize={pageSize}
                listLabel="applications"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff by Branch Breakdown Cards */}
      {analytics.by_state && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Florida Branch (FL)</div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {analytics.by_state?.['1'] || analytics.by_state?.[1] || 0} Staff
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </Card>

        <Card className="p-4 border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Indiana Branch (IN)</div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {analytics.by_state?.['2'] || analytics.by_state?.[2] || 0} Staff
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </Card>

        <Card className="p-4 border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Georgia Branch (GA)</div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {analytics.by_state?.['3'] || analytics.by_state?.[3] || 0} Staff
            </div>
          </div>
          <Badge variant="secondary">Active</Badge>
        </Card>
      </div>}
    </PageContainer>
  );
}
