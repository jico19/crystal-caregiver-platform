import { PUBLIC_STATES } from '../../../shared/constants/states.js';

export function emptyPublicSite(slug) {
  const state = PUBLIC_STATES[slug];
  if (!state) throw new Error('Choose Florida, Indiana, or Georgia.');
  return {
    schema_version: 1, state, published_at: null,
    overview: { title: `Home care in ${state.name}`, description: '' },
    contact: { phone: '', email: '', address: '', office_hours: '' },
    services: [], forms: [], licensing: [], careers: [],
  };
}

export function validatePublicSite(content, slug) {
  const state = PUBLIC_STATES[slug];
  if (!state || content?.schema_version !== 1 || content.state?.slug !== slug || content.state?.code !== state.code) {
    throw new Error('Published information does not match this state.');
  }
  if (typeof content.overview?.title !== 'string' || typeof content.overview?.description !== 'string') {
    throw new Error('Published overview is unavailable.');
  }
  for (const key of ['phone', 'email', 'address', 'office_hours']) {
    if (typeof content.contact?.[key] !== 'string') throw new Error('Published contact details are unavailable.');
  }
  for (const key of ['services', 'forms', 'licensing', 'careers']) {
    if (!Array.isArray(content[key]) || content[key].length > 100 || content[key].some((row) => !row || typeof row !== 'object')) {
      throw new Error('Published information is unavailable.');
    }
  }
  const fields = {
    services: ['id', 'title', 'description'],
    forms: ['id', 'title', 'description', 'category', 'file_url'],
    licensing: ['id', 'license_number', 'issuing_authority', 'status', 'disclosures'],
    careers: ['id', 'title', 'description', 'department', 'employment_type', 'requirements', 'compensation'],
  };
  for (const [collection, keys] of Object.entries(fields)) {
    if (content[collection].some((row) => keys.some((key) => typeof row[key] !== 'string'))) {
      throw new Error('Published information contains an invalid entry.');
    }
  }
  if (content.forms.some((form) => !/^\/published-site\/assets\/[a-f0-9]{64}\.pdf$/.test(form.file_url))) {
    throw new Error('A published form has an invalid download address.');
  }
  return { ...content, state };
}

export async function loadPublishedSite(slug, { signal, fetcher = globalThis.fetch } = {}) {
  if (!PUBLIC_STATES[slug]) throw new Error('Unknown state.');
  const response = await fetcher(`/published-site/${slug}.json`, { signal, credentials: 'omit', cache: 'no-cache' });
  if (!response.ok) throw new Error('Published information is temporarily unavailable.');
  return validatePublicSite(await response.json(), slug);
}
