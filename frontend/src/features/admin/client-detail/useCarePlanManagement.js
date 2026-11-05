import { useState } from 'react';
import { ACTIVITY_OPTIONS, FREQUENCY_OPTIONS, EMPTY_ACTIVITY } from './clientDetailConstants.js';
import { saveCarePlanApi } from './clientDetailService.js';

export function useCarePlanManagement(id, token, setErrorMsg, setSuccessMsg, initialPlan = null) {
  const [carePlan, setCarePlan] = useState(initialPlan);
  const [cpStatus, setCpStatus] = useState(initialPlan?.status || 'active');
  const [cpEffectiveDate, setCpEffectiveDate] = useState(initialPlan?.effective_date || '');
  const [cpPrimaryNurse, setCpPrimaryNurse] = useState(initialPlan?.primary_nurse || '');
  const [cpEmergencyProtocol, setCpEmergencyProtocol] = useState(initialPlan?.emergency_protocol || '');
  const [activities, setActivities] = useState(() => (initialPlan?.activities || []).map(a => ({ task: a.task || '', frequency: a.frequency || '', notes: a.notes || '', custom: !ACTIVITY_OPTIONS.includes(a.task || ''), freqCustom: !FREQUENCY_OPTIONS.includes(a.frequency || '') })));
  const [savingPlan, setSavingPlan] = useState(false);

  const setActivityField = (idx, key, val) => {
    setActivities((rows) => rows.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));
  };

  const addActivityRow = () => {
    setActivities((rows) => [...rows, { ...EMPTY_ACTIVITY }]);
  };

  const removeActivityRow = (idx) => {
    setActivities((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSavePlan = async (e, onSaved) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSavingPlan(true);
    const cleanedActivities = activities
      .filter((a) => a.task.trim())
      .map(({ task, frequency, notes }) => ({
        task: task.trim(),
        frequency: frequency.trim(),
        notes: notes.trim(),
      }));

    try {
      const res = await saveCarePlanApi(
        id,
        {
          status: cpStatus,
          effective_date: cpEffectiveDate || null,
          primary_nurse: cpPrimaryNurse.trim() || null,
          emergency_protocol: cpEmergencyProtocol.trim() || null,
          activities: cleanedActivities,
        },
        token
      );
      setCarePlan(res?.care_plan || null);
      setSuccessMsg('Care plan saved successfully.');
      if (onSaved) await onSaved();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to save care plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  return {
    carePlan,
    cpStatus,
    setCpStatus,
    cpEffectiveDate,
    setCpEffectiveDate,
    cpPrimaryNurse,
    setCpPrimaryNurse,
    cpEmergencyProtocol,
    setCpEmergencyProtocol,
    activities,
    savingPlan,
    setActivityField,
    addActivityRow,
    removeActivityRow,
    handleSavePlan,
  };
}
