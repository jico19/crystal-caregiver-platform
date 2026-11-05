import { AdmissionDecisionSectionEditor, CarePlanSectionEditor, CaregiverAssignmentsSectionEditor, ScheduleSectionEditor } from './ClientDetailEditors';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { isSuperAdmin } from '@/shared/lib/roles';
import { CLIENT_STATUS_LABELS } from './clientDetailConstants.js';
import { useClientDetailData } from './useClientDetailData';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import StatusBadge from '@/shared/components/common/StatusBadge';
import ClientDetailsCard from './ClientDetailsCard.jsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  return <ClientDetailSession key={`${user?.id}:${user?.state_id}:${id}`} id={id} token={token} user={user} />;
}

function ClientDetailSession({ id, token, user }) {
  const detail = useClientDetailData(id, token);

  if (detail.loading) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-6 text-emerald-600 animate-spin" />
          <span>Loading client details...</span>
        </div>
      </PageContainer>
    );
  }

  if (!detail.client) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Client not found.</AlertDescription>
        </Alert>
        <Link to="/admin/clients" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Clients
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-2">
        <Link to="/admin/clients" className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Clients
        </Link>
      </div>

      <PageHeader
        title={`${detail.client.first_name} ${detail.client.last_name}`}
        subtitle={`${detail.client.states?.name || `State #${detail.client.state_id}`} · Client File`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={detail.client.status}
              label={CLIENT_STATUS_LABELS[detail.client.status] || detail.client.status}
            />
            <Button variant="outline" size="sm" asChild className="h-7 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              <Link
                to={`/admin/authorizations?client_id=${detail.client.id}&state_id=${detail.client.state_id}`}
              >
                Authorizations <ArrowRight size={12} className="ml-1" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {detail.errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{detail.errorMsg}</AlertDescription>
        </Alert>
      )}
      {detail.successMsg && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{detail.successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Client Overview Card */}
      <ClientDetailsCard client={detail.client} />

      {/* Admission Decision Section */}
      <AdmissionDecisionSectionEditor id={id} token={token} refreshDetail={detail.refreshDetail} setErrorMsg={detail.setErrorMsg} setSuccessMsg={detail.setSuccessMsg} client={detail.client} />

      {/* Care Plan Section */}
      <CarePlanSectionEditor id={id} token={token} refreshDetail={detail.refreshDetail} setErrorMsg={detail.setErrorMsg} setSuccessMsg={detail.setSuccessMsg} initialPlan={detail.carePlan} />

      {/* Caregiver Assignments Section */}
      <CaregiverAssignmentsSectionEditor id={id} token={token} refreshDetail={detail.refreshDetail} setErrorMsg={detail.setErrorMsg} setSuccessMsg={detail.setSuccessMsg} assignments={detail.assignments} availableCaregivers={detail.availableCaregivers} setAvailableCaregivers={detail.setAvailableCaregivers} isSuperAdmin={isSuperAdmin(user)} />

      {/* Service Schedule Section */}
      <ScheduleSectionEditor id={id} token={token} refreshDetail={detail.refreshDetail} setErrorMsg={detail.setErrorMsg} setSuccessMsg={detail.setSuccessMsg} schedule={detail.schedule} setSchedule={detail.setSchedule} />
    </PageContainer>
  );
}
