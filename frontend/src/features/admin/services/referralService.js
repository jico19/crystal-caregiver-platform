import { api } from '../../../shared/services/api';

export const referralPaths = {
  states: '/states',
  analytics: '/admin/referrals/analytics',
  list: '/admin/referrals',
};

function queryPath(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null && value !== 'all') query.set(key, value);
  });
  return `${path}${query.size ? `?${query}` : ''}`;
}

export function getReferralStates({ token, signal }) {
  return api.get(referralPaths.states, token, signal);
}

export function getReferralAnalytics({ params, token, signal }) {
  return api.get(queryPath(referralPaths.analytics, params), token, signal);
}

export function getReferrals({ params, page, pageSize, token }) {
  return api.get(
    queryPath(referralPaths.list, { ...params, page, page_size: pageSize }),
    token
  );
}

export function updateReferralStatus(id, status, token) {
  return api.patch(`${referralPaths.list}/${id}`, { status }, token);
}

export function saveReferralNotes(id, notes, token) {
  return api.patch(
    `${referralPaths.list}/${id}`,
    { handled_notes: notes },
    token
  );
}
