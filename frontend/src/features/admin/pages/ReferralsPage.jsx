import { Link } from 'react-router-dom';
import { Kanban, Table2, ArrowRight, CheckCircle2 } from 'lucide-react';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import useReferralsData from '../hooks/useReferralsData';
import useReferralActions from '../hooks/useReferralActions';
import ReferralMetrics from '../components/ReferralMetrics';
import ReferralToolbar from '../components/ReferralToolbar';
import ReferralPipeline from '../components/ReferralPipeline';
import ReferralTable from '../components/ReferralTable';
import ReferralDialogs from '../components/ReferralDialogs';

export default function ReferralsPage() {
  const data = useReferralsData();
  const actions = useReferralActions(data);
  const { analytics, viewMode, setViewMode, error } = data;
  const { errorMsg, successMsg, convertedClientId } = actions;
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
                <TabsTrigger
                  value="pipeline"
                  className="text-xs flex items-center gap-1.5 h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  <Kanban size={13} /> Pipeline View
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="text-xs flex items-center gap-1.5 h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
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
              <CheckCircle2 size={14} className="text-emerald-600" />{' '}
              {successMsg}
            </span>
            {convertedClientId && (
              <Link
                to={`/admin/clients/${convertedClientId}`}
                className="font-semibold ml-3 hover:underline inline-flex items-center gap-1 text-emerald-800"
              >
                Admit Client Record <ArrowRight size={12} />
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <ReferralMetrics analytics={data.analytics} />
      <ReferralToolbar
        {...data}
        visibleCount={data.filteredReferrals.length}
        handleResetFilters={actions.handleResetFilters}
      />
      {data.viewMode === 'pipeline' ? (
        <ReferralPipeline {...data} {...actions} />
      ) : (
        <ReferralTable {...data} {...actions} />
      )}
      <ReferralDialogs {...actions} />
    </PageContainer>
  );
}
