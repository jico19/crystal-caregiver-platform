export function reportModel(data) {
  const compliance = data.caregiver_compliance || { rows: [], total: 0, compliant: 0 };
  const credentials = data.expiring_credentials || { rows: [], total: 0 };
  const training = data.training_completion || { rows: [], total_courses: 0 };
  const authorizations = data.client_authorizations || { summary: {}, rows: [] };
  const sources = data.referral_sources || { rows: [], total: 0 };
  const inquiries = data.website_inquiries || { by_state: [], recent: [], total: 0 };

  const stats = [
    { label: 'Compliant caregivers', value: `${compliance.compliant}/${compliance.total}` },
    { label: 'Credential issues', value: `${credentials.total}`, highlight: credentials.total > 0 },
    { label: 'Courses tracked', value: `${training.total_courses}` },
    { label: 'Active authorizations', value: `${authorizations.summary.active ?? 0}` },
    { label: 'Total referrals', value: `${sources.total}` },
    { label: 'Web inquiries', value: `${inquiries.total}` },
  ];

  return { compliance, credentials, training, authorizations, sources, inquiries, stats };
}
