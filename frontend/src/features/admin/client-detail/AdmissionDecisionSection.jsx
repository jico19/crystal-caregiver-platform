import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import FormField from '@/shared/components/common/FormField';
import StatusBadge from '@/shared/components/common/StatusBadge';
import { CLIENT_STATUS_LABELS, ALLOWED_CLIENT_TRANSITIONS } from './clientDetailConstants.js';

export default function AdmissionDecisionSection({
  client,
  serviceStartDate,
  setServiceStartDate,
  admissionNotes,
  setAdmissionNotes,
  rejectionReason,
  setRejectionReason,
  submittingAdmission,
  handleUpdateAdmission,
}) {
  const allowedTransitions = ALLOWED_CLIENT_TRANSITIONS[client.status || 'pending'] || [];

  return (
    <Card className="bg-white border-slate-200 shadow-sm mb-6 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="font-semibold text-base text-slate-900 m-0">Admission & Lifecycle Decision</h2>
        <StatusBadge
          status={client.status}
          label={CLIENT_STATUS_LABELS[client.status] || client.status || 'Pending'}
        />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs">
        <div>
          <dt className="text-slate-400 mb-0.5">Confirmed Service Start Date</dt>
          <dd className="font-semibold text-sm text-slate-900">
            {client.service_start_date ? new Date(client.service_start_date).toLocaleDateString() : 'Not Set'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400 mb-0.5">Admitted / Reviewed By</dt>
          <dd className="font-semibold text-sm text-slate-900">{client.admitted_by || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-400 mb-0.5">Admitted / Reviewed At</dt>
          <dd className="font-semibold text-sm text-slate-900">
            {client.admitted_at ? new Date(client.admitted_at).toLocaleString() : '—'}
          </dd>
        </div>
      </dl>

      {client.rejection_reason && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rejection Notice</AlertTitle>
          <AlertDescription>
            <strong>Rejection Reason:</strong> {client.rejection_reason}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <FormField label="Confirmed Service Start Date" htmlFor="service-start-date">
          <Input
            id="service-start-date"
            type="date"
            className="h-9 text-xs"
            value={serviceStartDate}
            onChange={(e) => setServiceStartDate(e.target.value)}
          />
        </FormField>
        <FormField label="Admission Review Notes" htmlFor="admission-notes">
          <Input
            id="admission-notes"
            type="text"
            className="h-9 text-xs"
            value={admissionNotes}
            onChange={(e) => setAdmissionNotes(e.target.value)}
            placeholder="Internal review notes or coordinator remarks"
          />
        </FormField>
      </div>

      {allowedTransitions.includes('rejected') && (
        <div className="mt-3">
          <FormField label="Rejection Reason (Required if rejecting)" htmlFor="rejection-reason-input">
            <Input
              id="rejection-reason-input"
              type="text"
              className="h-9 text-xs"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State reason for rejecting admission (e.g. Ineligible coverage, out of jurisdiction)"
            />
          </FormField>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {allowedTransitions.map((targetStatus) => {
          const labelMap = {
            approved: 'Approve Admission',
            active: 'Mark Service Active',
            discharged: 'Discharge Client',
            rejected: 'Reject Admission',
          };
          const isDestructive = targetStatus === 'rejected';
          const isOutline = targetStatus === 'discharged';
          return (
            <Button
              key={targetStatus}
              type="button"
              disabled={submittingAdmission}
              onClick={() => handleUpdateAdmission(targetStatus)}
              variant={isDestructive ? 'destructive' : isOutline ? 'outline' : 'default'}
              size="sm"
              className={`h-8 text-xs ${!isDestructive && !isOutline ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            >
              {submittingAdmission ? 'Updating...' : labelMap[targetStatus] || targetStatus}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
