import { useState, useRef } from 'react';
import { api } from '@/shared/services/api';
import { assignCaregiverApi, endAssignmentApi } from './clientDetailService';

export function useAssignmentEditor({ id, token, setAvailableCaregivers, refreshDetail, setErrorMsg, setSuccessMsg }) {
  // Caregiver assignment state
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('');
  const [selectedRole, setSelectedRole] = useState('primary');
  const [assigning, setAssigning] = useState(false);
  const [overrideCompliance, setOverrideCompliance] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [caregiverCompliance, setCaregiverCompliance] = useState(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const complianceRequest = useRef(0);

  const handleSelectCaregiver = async (cgId) => {
    const requestId = ++complianceRequest.current;
    setSelectedCaregiverId(cgId);
    setOverrideCompliance(false);
    setOverrideReason('');
    setCaregiverCompliance(null);
    setCheckingCompliance(false);
    if (!cgId) return;

    setCheckingCompliance(true);
    try {
      const compRes = await api.get(`/admin/caregivers/${cgId}/compliance`, token);
      if (requestId !== complianceRequest.current) return;
      const isComp = Boolean(compRes?.compliant);
      const missing = compRes?.missing_requirements || compRes?.blocking_reasons || [];
      const normalized = {
        compliant: isComp,
        status: isComp ? 'Compliant' : (missing.length > 0 ? 'Missing Documents' : 'Non-Compliant'),
        blocking_reasons: missing,
        approved_credentials: compRes?.approved_credentials || [],
      };
      setCaregiverCompliance(normalized);
      setAvailableCaregivers((prev) =>
        prev.map((cg) => (cg.id === cgId ? { ...cg, compliance: normalized } : cg))
      );
    } catch {
      if (requestId !== complianceRequest.current) return;
      setCaregiverCompliance({
        compliant: false,
        status: 'Verification Error',
        blocking_reasons: ['Unable to verify caregiver compliance with server.'],
      });
    } finally {
      if (requestId === complianceRequest.current) setCheckingCompliance(false);
    }
  };

  const handleAssignCaregiver = async (e) => {
    e.preventDefault();
    if (!selectedCaregiverId) return;
    setErrorMsg('');
    setSuccessMsg('');
    setAssigning(true);
    try {
      await assignCaregiverApi(
        id,
        selectedCaregiverId,
        selectedRole,
        token,
        overrideCompliance,
        overrideReason
      );
      setSuccessMsg('Caregiver assigned successfully.');
      setSelectedCaregiverId('');
      setOverrideCompliance(false);
      setOverrideReason('');
      await refreshDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to assign caregiver.');
    } finally {
      setAssigning(false);
    }
  };

  const handleEndAssignment = async (caregiverId) => {
    if (!window.confirm('End this caregiver assignment?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await endAssignmentApi(id, caregiverId, token);
      setSuccessMsg('Caregiver assignment ended.');
      await refreshDetail();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to end caregiver assignment.');
    }
  };

  return {
    selectedCaregiverId,
    setSelectedCaregiverId: handleSelectCaregiver,
    selectedRole,
    setSelectedRole,
    assigning,
    overrideCompliance,
    setOverrideCompliance,
    overrideReason,
    setOverrideReason,
    handleAssignCaregiver,
    handleEndAssignment,
    caregiverCompliance,
    checkingCompliance,
  };
}
