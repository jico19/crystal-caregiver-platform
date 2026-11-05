import { DepartmentLaunchers, DashboardMetrics, DashboardWorkload, DashboardAnnouncements } from './DashboardSections';
import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { isSuperAdmin, isStateAdmin, stateLabelFor } from '@/shared/lib/roles';
import useFetch from '@/shared/hooks/useFetch';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import AdminOperationsChart from './AdminOperationsChart.jsx';
import AdminFunnelChart from './AdminFunnelChart.jsx';
import StateAdminDashboardPage from './StateAdminDashboardPage.jsx';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

      <DepartmentLaunchers />

      <DashboardMetrics metrics={metrics} isLoading={isLoading} />

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

      <DashboardWorkload recentIntakes={recentIntakes} openTasks={openTasks} isLoading={isLoading} />

      <DashboardAnnouncements announcements={announcements} isLoading={isLoading} />
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
