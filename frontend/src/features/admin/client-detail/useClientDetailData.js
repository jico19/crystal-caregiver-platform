import { useState, useEffect, useCallback } from 'react';
import { fetchClientDetailBundle } from './clientDetailService';

export function useClientDetailData(id, token) {
  const [client, setClient] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [availableCaregivers, setAvailableCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const applyClientPayload = useCallback(({ res, planRes, schedRes, asgnRes, cgRes }) => {
    const c = res?.client || null;
    setClient(c);

    setSchedule(schedRes?.schedule || []);
    setAssignments(asgnRes?.assignments || []);
    const rawCgs = cgRes?.results || cgRes?.applications || cgRes?.caregivers || (Array.isArray(cgRes) ? cgRes : []);
    const cgs = rawCgs.map((item) => {
      const cgInfo = item.caregivers || item;
      return {
        id: item.caregiver_id || item.id,
        first_name: cgInfo.first_name || item.first_name || '',
        last_name: cgInfo.last_name || item.last_name || '',
        ssn_last4: cgInfo.ssn_last4 || item.ssn_last4 || '',
        state_id: item.state_id || cgInfo.state_id || item.state,
        state_code: item.state_code || cgInfo.state_code || '',
        status: item.status,
        compliance: item.compliance || null,
      };
    });
    const clientStateId = c?.state_id || c?.states?.id;
    const clientStateCode = c?.state_code || c?.states?.code;
    const filteredCgs = cgs.filter((cg) => {
      if (!clientStateId && !clientStateCode) return true;
      if (clientStateId && cg.state_id && Number(cg.state_id) === Number(clientStateId)) return true;
      if (clientStateCode && cg.state_code && cg.state_code.toUpperCase() === clientStateCode.toUpperCase()) return true;
      return !cg.state_id && !cg.state_code;
    });
    setAvailableCaregivers(filteredCgs);
    setCarePlan(planRes?.care_plan || null);
  }, []);

  const refreshDetail = useCallback(async () => {
    try {
      const bundle = await fetchClientDetailBundle(id, token);
      applyClientPayload(bundle);
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to refresh client details.');
    }
  }, [id, token, applyClientPayload]);

  useEffect(() => {
    if (!token || !id) return;
    let isMounted = true;

    async function loadInitial() {
      try {
        const bundle = await fetchClientDetailBundle(id, token);
        if (!isMounted) return;
        applyClientPayload(bundle);
      } catch (err) {
        if (!isMounted) return;
        setErrorMsg(err.detail || 'Failed to load client details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [id, token, applyClientPayload]);

  return {
    client,
    carePlan,
    schedule,
    setSchedule,
    assignments,
    availableCaregivers,
    setAvailableCaregivers,
    loading,
    errorMsg,
    setErrorMsg,
    successMsg,
    setSuccessMsg,
    refreshDetail,
  };
}
