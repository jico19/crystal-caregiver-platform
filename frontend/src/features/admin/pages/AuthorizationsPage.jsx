import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin, stateLabelFor } from '../../../shared/lib/roles';
import { useAuthorizationsData } from '../hooks/useAuthorizationsData';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import AuthorizationMetrics from '../components/authorizations/AuthorizationMetrics';
import AuthorizationForm from '../components/authorizations/AuthorizationForm';
import AuthorizationToolbar from '../components/authorizations/AuthorizationToolbar';
import AuthorizationsTable from '../components/authorizations/AuthorizationsTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AuthorizationsPage() {
  const { token, user } = useAuth();
  const data = useAuthorizationsData(token);
  const isSuperAdminUser = isSuperAdmin(user);
  const adminCode = isSuperAdminUser ? null : stateLabelFor(user);
  const stateOptions = isSuperAdminUser
    ? [
        { value: 'all', label: 'All States' },
        { value: 'FL', label: 'Florida (FL)' },
        { value: 'IN', label: 'Indiana (IN)' },
        { value: 'GA', label: 'Georgia (GA)' },
      ]
    : [{ value: adminCode, label: adminCode ? `${adminCode}` : '' }];

  useEffect(() => {
    if (!isSuperAdminUser && adminCode && data.filterState === 'all') {
      data.setFilterState(adminCode);
    }
  }, [isSuperAdminUser, adminCode, data]);

  return (
    <PageContainer>
      <PageHeader
        title="Medicaid Authorizations"
        badge="FL • IN • GA"
        badgeVariant="info"
        description="Issue, track expiration windows, procedure codes (T1019, S5125), and care unit burn-down."
        actions={
          <Button
            type="button"
            onClick={() => {
              if (data.showForm) {
                data.handleCloseForm();
              } else {
                data.setShowForm(true);
              }
            }}
            variant={data.showForm ? 'outline' : 'default'}
            size="sm"
            className={data.showForm ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          >
            {data.showForm ? (
              <>
                <X size={15} className="mr-1.5" />
                Close Form
              </>
            ) : (
              <>
                <Plus size={15} className="mr-1.5" />
                Issue New Authorization
              </>
            )}
          </Button>
        }
      />

      {data.errorMsg && (
        <Alert variant="destructive" className="mb-4 flex justify-between items-center text-sm">
          <AlertDescription className="flex justify-between items-center w-full">
            <span>{data.errorMsg}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => data.setErrorMsg('')}
              className="h-6 w-6 text-slate-500 hover:text-slate-900"
              aria-label="Close error"
            >
              <X size={13} />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data.successMsg && (
        <Alert className="mb-4 flex justify-between items-center text-sm border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription className="flex justify-between items-center w-full">
            <span>{data.successMsg}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => data.setSuccessMsg('')}
              className="h-6 w-6 text-emerald-700 hover:text-emerald-900"
              aria-label="Close message"
            >
              <X size={13} />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <AuthorizationMetrics
        metrics={data.metrics}
        filterStatus={data.filterStatus}
        onSelectStatus={data.setFilterStatus}
      />

      {data.showForm && (
        <AuthorizationForm
          clients={data.clients}
          clientId={data.clientId}
          selectedClient={data.selectedClient}
          onClientChange={data.handleClientChange}
          authNumber={data.authNumber}
          setAuthNumber={data.setAuthNumber}
          onRegenerateAuthNumber={data.handleRegenerateAuthNumber}
          startDate={data.startDate}
          setStartDate={data.setStartDate}
          endDate={data.endDate}
          setEndDate={data.setEndDate}
          onApplyDurationPreset={data.applyDurationPreset}
          notes={data.notes}
          setNotes={data.setNotes}
          submitting={data.submitting}
          onSubmit={data.handleCreateAuth}
          onClose={data.handleCloseForm}
          editingAuth={data.editingAuth}
          hcpcsCode={data.hcpcsCode}
          setHcpcsCode={data.setHcpcsCode}
          serviceDescription={data.serviceDescription}
          setServiceDescription={data.setServiceDescription}
          totalUnits={data.totalUnits}
          setTotalUnits={data.setTotalUnits}
          unitsUsed={data.unitsUsed}
          setUnitsUsed={data.setUnitsUsed}
          maxWeeklyHours={data.maxWeeklyHours}
          setMaxWeeklyHours={data.setMaxWeeklyHours}
          unitType={data.unitType}
          setUnitType={data.setUnitType}
        />
      )}

      <AuthorizationToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        onClearSearch={() => data.setSearchTerm('')}
        filterState={data.filterState}
        onFilterStateChange={data.setFilterState}
        stateOptions={stateOptions}
        filterStatus={data.filterStatus}
        onFilterStatusChange={data.setFilterStatus}
        sortBy={data.sortBy}
        onSortByChange={data.setSortBy}
        hasActiveFilters={data.hasActiveFilters}
        onResetFilters={data.handleResetFilters}
        filteredCount={data.filteredAuthorizations.length}
        totalCount={data.authorizations.length}
      />

      <AuthorizationsTable
        loading={data.loading}
        token={token}
        totalCount={data.authorizations.length}
        filteredAuthorizations={data.filteredAuthorizations}
        copiedAuthId={data.copiedAuthId}
        onCopyAuthNumber={data.handleCopyAuthNumber}
        reviewingId={data.reviewingId}
        reviewAction={data.reviewAction}
        onReview={data.handleReview}
        onEdit={data.handleStartEdit}
        onOpenForm={() => {
          data.handleCloseForm();
          data.setShowForm(true);
        }}
        onResetFilters={data.handleResetFilters}
      />
    </PageContainer>
  );
}
