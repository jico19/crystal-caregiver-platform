import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { isSuperAdmin, stateLabelFor } from '@/shared/lib/roles';
import { useAuthorizationsData } from './useAuthorizationsData.js';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import AuthorizationMetrics from './AuthorizationMetrics.jsx';
import AuthorizationForm from './AuthorizationForm.jsx';
import AuthorizationToolbar from './AuthorizationToolbar.jsx';
import AuthorizationsTable from './AuthorizationsTable.jsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AuthorizationsPage() {
  const { user } = useAuth();
  return <AuthorizationsSession key={`${user?.id ?? 'anon'}:${user?.state_id ?? ''}:${user?.role ?? ''}`} />;
}

function AuthorizationsSession() {
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
              if (data.editor.showForm) {
                data.editor.handleCloseForm();
              } else {
                data.editor.setShowForm(true);
              }
            }}
            variant={data.editor.showForm ? 'outline' : 'default'}
            size="sm"
            className={data.editor.showForm ? '' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          >
            {data.editor.showForm ? (
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

      {data.editor.showForm && (
        <AuthorizationForm
          clients={data.clients}
          clientId={data.editor.clientId}
          selectedClient={data.editor.selectedClient}
          onClientChange={data.editor.handleClientChange}
          authNumber={data.editor.authNumber}
          setAuthNumber={data.editor.setAuthNumber}
          onRegenerateAuthNumber={data.editor.handleRegenerateAuthNumber}
          startDate={data.editor.startDate}
          setStartDate={data.editor.setStartDate}
          endDate={data.editor.endDate}
          setEndDate={data.editor.setEndDate}
          onApplyDurationPreset={data.editor.applyDurationPreset}
          notes={data.editor.notes}
          setNotes={data.editor.setNotes}
          submitting={data.editor.submitting}
          onSubmit={data.editor.handleCreateAuth}
          onClose={data.editor.handleCloseForm}
          editingAuth={data.editor.editingAuth}
          hcpcsCode={data.editor.hcpcsCode}
          setHcpcsCode={data.editor.setHcpcsCode}
          serviceDescription={data.editor.serviceDescription}
          setServiceDescription={data.editor.setServiceDescription}
          totalUnits={data.editor.totalUnits}
          setTotalUnits={data.editor.setTotalUnits}
          unitsUsed={data.editor.unitsUsed}
          setUnitsUsed={data.editor.setUnitsUsed}
          maxWeeklyHours={data.editor.maxWeeklyHours}
          setMaxWeeklyHours={data.editor.setMaxWeeklyHours}
          unitType={data.editor.unitType}
          setUnitType={data.editor.setUnitType}
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
        onEdit={data.editor.handleStartEdit}
        onOpenForm={() => {
          data.editor.handleCloseForm();
          data.editor.setShowForm(true);
        }}
        onResetFilters={data.handleResetFilters}
      />
    </PageContainer>
  );
}
