import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import { CLIENT_STATUS_LABELS } from '../constants/clientDetailConstants';
import { useClientDetailData } from '../hooks/useClientDetailData';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import ClientDetailsCard from '../components/client-detail/ClientDetailsCard';
import AdmissionDecisionSection from '../components/client-detail/AdmissionDecisionSection';
import CarePlanSection from '../components/client-detail/CarePlanSection';
import ScheduleSection from '../components/client-detail/ScheduleSection';
import CaregiverAssignmentsSection from '../components/client-detail/CaregiverAssignmentsSection';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
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
      <AdmissionDecisionSection
        client={detail.client}
        serviceStartDate={detail.serviceStartDate}
        setServiceStartDate={detail.setServiceStartDate}
        admissionNotes={detail.admissionNotes}
        setAdmissionNotes={detail.setAdmissionNotes}
        rejectionReason={detail.rejectionReason}
        setRejectionReason={detail.setRejectionReason}
        submittingAdmission={detail.submittingAdmission}
        handleUpdateAdmission={detail.handleUpdateAdmission}
      />

      {/* Care Plan Section */}
      <CarePlanSection
        carePlan={detail.carePlan}
        cpStatus={detail.cpStatus}
        setCpStatus={detail.setCpStatus}
        cpEffectiveDate={detail.cpEffectiveDate}
        setCpEffectiveDate={detail.setCpEffectiveDate}
        cpPrimaryNurse={detail.cpPrimaryNurse}
        setCpPrimaryNurse={detail.setCpPrimaryNurse}
        cpEmergencyProtocol={detail.cpEmergencyProtocol}
        setCpEmergencyProtocol={detail.setCpEmergencyProtocol}
        activities={detail.activities}
        setActivityField={detail.setActivityField}
        addActivityRow={detail.addActivityRow}
        removeActivityRow={detail.removeActivityRow}
        savingPlan={detail.savingPlan}
        handleSavePlan={detail.handleSavePlan}
      />

      {/* Caregiver Assignments Section */}
      <CaregiverAssignmentsSection
        assignments={detail.assignments}
        availableCaregivers={detail.availableCaregivers}
        selectedCaregiverId={detail.selectedCaregiverId}
        setSelectedCaregiverId={detail.setSelectedCaregiverId}
        selectedRole={detail.selectedRole}
        setSelectedRole={detail.setSelectedRole}
        assigning={detail.assigning}
        handleAssignCaregiver={detail.handleAssignCaregiver}
        handleEndAssignment={detail.handleEndAssignment}
        isSuperAdmin={isSuperAdmin(user)}
        overrideCompliance={detail.overrideCompliance}
        setOverrideCompliance={detail.setOverrideCompliance}
        overrideReason={detail.overrideReason}
        setOverrideReason={detail.setOverrideReason}
        caregiverCompliance={detail.caregiverCompliance}
        checkingCompliance={detail.checkingCompliance}
      />

      {/* Service Schedule Section */}
      <ScheduleSection
        schedule={detail.schedule}
        schedDay={detail.schedDay}
        setSchedDay={detail.setSchedDay}
        schedStart={detail.schedStart}
        setSchedStart={detail.setSchedStart}
        schedEnd={detail.schedEnd}
        setSchedEnd={detail.setSchedEnd}
        schedService={detail.schedService}
        setSchedService={detail.setSchedService}
        schedCustomService={detail.schedCustomService}
        setSchedCustomService={detail.setSchedCustomService}
        schedStatus={detail.schedStatus}
        setSchedStatus={detail.setSchedStatus}
        schedNotes={detail.schedNotes}
        setSchedNotes={detail.setSchedNotes}
        addingSched={detail.addingSched}
        handleAddSchedule={detail.handleAddSchedule}
        handleDeleteSchedule={detail.handleDeleteSchedule}
      />
    </PageContainer>
  );
}