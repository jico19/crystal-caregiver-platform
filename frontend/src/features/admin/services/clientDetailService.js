import { api } from '../../../shared/services/api';

export async function fetchClientDetailBundle(id, token) {
  const [res, planRes, schedRes, asgnRes, cgRes] = await Promise.all([
    api.get(`/admin/clients/${id}`, token),
    api.get(`/admin/clients/${id}/care-plan`, token).catch((err) => {
      if (err?.status === 404) return { care_plan: null };
      throw err;
    }),
    api.get(`/admin/clients/${id}/schedule`, token).catch((err) => {
      if (err?.status === 404) return { schedule: [] };
      throw err;
    }),
    api.get(`/admin/clients/${id}/assignments`, token).catch((err) => {
      if (err?.status === 404) return { assignments: [] };
      throw err;
    }),
    api.get('/admin/caregivers?page_size=100', token).catch((err) => {
      if (err?.status === 404) return { caregivers: [] };
      throw err;
    }),
  ]);
  return { res, planRes, schedRes, asgnRes, cgRes };
}

export function assignCaregiverApi(
  id,
  caregiverId,
  role,
  token,
  overrideCompliance = false,
  overrideReason = ''
) {
  const payload = {
    caregiver_id: caregiverId,
    role,
  };
  if (overrideCompliance) {
    payload.override_compliance = true;
    payload.override_reason = overrideReason;
  }
  return api.post(
    `/admin/clients/${id}/assignments`,
    payload,
    token
  );
}

export function endAssignmentApi(id, caregiverId, token) {
  return api.delete(`/admin/clients/${id}/assignments/${caregiverId}`, token);
}

export function updateAdmissionApi(id, payload, token) {
  return api.post(`/admin/clients/${id}/admission`, payload, token);
}

export function saveCarePlanApi(id, payload, token) {
  return api.put(`/admin/clients/${id}/care-plan`, payload, token);
}

export function addScheduleSlotApi(id, payload, token) {
  return api.post(`/admin/clients/${id}/schedule`, payload, token);
}

export function deleteScheduleSlotApi(id, scheduleId, token) {
  return api.delete(`/admin/clients/${id}/schedule/${scheduleId}`, token);
}
