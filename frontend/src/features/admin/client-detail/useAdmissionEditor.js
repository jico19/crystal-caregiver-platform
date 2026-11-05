import { useState } from 'react';
import { updateAdmissionApi } from './clientDetailService';
import { CLIENT_STATUS_LABELS } from './clientDetailConstants';

export function useAdmissionEditor({ id, token, client, refreshDetail, setErrorMsg, setSuccessMsg }) {
  // Admission decision state
  const [serviceStartDate, setServiceStartDate] = useState(client?.service_start_date || '');
  const [admissionNotes, setAdmissionNotes] = useState(client?.admission_notes || '');
  const [rejectionReason, setRejectionReason] = useState(client?.rejection_reason || '');
  const [submittingAdmission, setSubmittingAdmission] = useState(false);

  const handleUpdateAdmission = async (targetStatus) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (targetStatus === 'rejected' && !rejectionReason.trim() && !admissionNotes.trim()) {
      setErrorMsg('A rejection reason is required when rejecting a client admission.');
      return;
    }
    setSubmittingAdmission(true);
    try {
      await updateAdmissionApi(
        id,
        {
          status: targetStatus,
          service_start_date: serviceStartDate || null,
          notes: admissionNotes.trim() || null,
          rejection_reason: targetStatus === 'rejected' ? (rejectionReason.trim() || admissionNotes.trim()) : null,
        },
        token
      );
      setSuccessMsg(`Client admission status updated to ${CLIENT_STATUS_LABELS[targetStatus] || targetStatus}.`);
      await refreshDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update client admission status.');
    } finally {
      setSubmittingAdmission(false);
    }
  };

  return {
    serviceStartDate,
    setServiceStartDate,
    admissionNotes,
    setAdmissionNotes,
    rejectionReason,
    setRejectionReason,
    submittingAdmission,
    handleUpdateAdmission,
  };
}
