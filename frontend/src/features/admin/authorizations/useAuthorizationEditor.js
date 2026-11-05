import { useState, useMemo, useCallback } from 'react';
import { api } from '@/shared/services/api';
import { STATE_CODE_MAP, getTodayStr, computeFutureDateStr, generateAuthNumber } from './authorizationConstants';

export function useAuthorizationEditor({ token, clients, searchParams, refreshAuthorizations, setErrorMsg, setSuccessMsg }) {
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(Boolean(searchParams.get('client_id')));
  const [editingAuth, setEditingAuth] = useState(null);
  // Form fields
  const [clientId, setClientId] = useState(searchParams.get('client_id') || '');
  const [stateId, setStateId] = useState(searchParams.get('state_id') || '1');
  const [authNumber, setAuthNumber] = useState('');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(computeFutureDateStr(getTodayStr(), 180));
  const [notes, setNotes] = useState('');
  const [hcpcsCode, setHcpcsCode] = useState('T1019');
  const [serviceDescription, setServiceDescription] = useState('Personal Care Services');
  const [totalUnits, setTotalUnits] = useState('120');
  const [unitsUsed, setUnitsUsed] = useState('0');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('30');
  const [unitType, setUnitType] = useState('15_min');

  const initializeClient = useCallback((cl, initialParamClientId) => {
    const targetClient = initialParamClientId
      ? cl.find((c) => String(c.id) === String(initialParamClientId))
      : cl[0];

    if (targetClient) {
      setClientId(targetClient.id);
      const sId = String(targetClient.state_id || 1);
      setStateId(sId);
      const stateCode = targetClient.states?.code || STATE_CODE_MAP[sId] || 'FL';
      setAuthNumber(generateAuthNumber(stateCode));
    } else {
      setAuthNumber(generateAuthNumber('FL'));
    }
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find((c) => String(c.id) === String(clientId)) || null;
  }, [clients, clientId]);

  function handleClientChange(newClientId) {
    setClientId(newClientId);
    const cl = clients.find((c) => String(c.id) === String(newClientId));
    if (cl) {
      const sId = String(cl.state_id || 1);
      setStateId(sId);
      const code = cl.states?.code || STATE_CODE_MAP[sId] || 'FL';
      setAuthNumber(generateAuthNumber(code));
    }
  }

  function handleRegenerateAuthNumber() {
    const code = selectedClient?.states?.code || STATE_CODE_MAP[stateId] || 'FL';
    setAuthNumber(generateAuthNumber(code));
  }

  function applyDurationPreset(days) {
    const base = startDate || getTodayStr();
    setEndDate(computeFutureDateStr(base, days));
  }

  function handleStartEdit(auth) {
    setEditingAuth(auth);
    setClientId(auth.client_id || '');
    setStateId(String(auth.state_id || 1));
    setAuthNumber(auth.authorization_number || '');
    setStartDate(auth.start_date || getTodayStr());
    setEndDate(auth.end_date || computeFutureDateStr(getTodayStr(), 180));
    setNotes(auth.notes || '');
    setHcpcsCode(auth.hcpcs_code || 'T1019');
    setServiceDescription(auth.service_description || 'Personal Care Services');
    setTotalUnits(String(auth.total_units_authorized ?? 0));
    setUnitsUsed(String(auth.units_used ?? 0));
    setMaxWeeklyHours(auth.max_weekly_hours ? String(auth.max_weekly_hours) : '');
    setUnitType(auth.unit_type || '15_min');
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingAuth(null);
  }

  async function handleCreateAuth(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!authNumber.trim()) {
      setErrorMsg('Authorization number cannot be empty.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setErrorMsg('End date must be after start date.');
      return;
    }

    const totalUnitsNum = parseInt(totalUnits, 10);
    const unitsUsedNum = parseInt(unitsUsed, 10) || 0;
    if (isNaN(totalUnitsNum) || totalUnitsNum <= 0) {
      setErrorMsg('Total authorized units must be greater than zero.');
      return;
    }
    if (unitsUsedNum < 0) {
      setErrorMsg('Units used cannot be negative.');
      return;
    }
    if (unitsUsedNum > totalUnitsNum) {
      setErrorMsg('Units used cannot exceed total authorized units.');
      return;
    }

    let weeklyHours = null;
    if (maxWeeklyHours) {
      weeklyHours = parseFloat(maxWeeklyHours);
      if (isNaN(weeklyHours) || weeklyHours < 0 || weeklyHours > 168) {
        setErrorMsg('Max weekly hours must be between 0 and 168.');
        return;
      }
    }

    setSubmitting(true);

    const payload = {
      authorization_number: authNumber.trim(),
      start_date: startDate,
      end_date: endDate,
      notes: notes.trim() || null,
      hcpcs_code: hcpcsCode || 'T1019',
      service_description: serviceDescription || 'Personal Care Services',
      total_units_authorized: totalUnitsNum,
      units_used: unitsUsedNum,
      max_weekly_hours: weeklyHours,
      unit_type: unitType || '15_min',
    };

    try {
      if (editingAuth) {
        await api.patch(`/admin/authorizations/${editingAuth.id}`, payload, token);
        setSuccessMsg(`Authorization ${payload.authorization_number} updated successfully.`);
      } else {
        await api.post(
          '/admin/authorizations',
          {
            ...payload,
            client_id: clientId,
            state_id: parseInt(stateId, 10),
          },
          token
        );
        setSuccessMsg(`Authorization ${payload.authorization_number} issued successfully.`);
      }

      const code = selectedClient?.states?.code || STATE_CODE_MAP[stateId] || 'FL';
      setAuthNumber(generateAuthNumber(code));
      setStartDate(getTodayStr());
      setEndDate(computeFutureDateStr(getTodayStr(), 180));
      setNotes('');
      setEditingAuth(null);

      await refreshAuthorizations();
      setShowForm(false);
    } catch (err) {
      setErrorMsg(err.detail || (editingAuth ? 'Failed to update authorization.' : 'Failed to issue authorization.'));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    initializeClient,
    submitting,
    showForm,
    setShowForm,
    editingAuth,
    clientId,
    selectedClient,
    handleClientChange,
    authNumber,
    setAuthNumber,
    handleRegenerateAuthNumber,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    applyDurationPreset,
    notes,
    setNotes,
    hcpcsCode,
    setHcpcsCode,
    serviceDescription,
    setServiceDescription,
    totalUnits,
    setTotalUnits,
    unitsUsed,
    setUnitsUsed,
    maxWeeklyHours,
    setMaxWeeklyHours,
    unitType,
    setUnitType,
    handleStartEdit,
    handleCloseForm,
    handleCreateAuth,
  };
}
