export const COLLECTIONS = [
  { name: 'services', title: 'Services', fields: [['title', 'Service name', false, true], ['description', 'Description', true]] },
  { name: 'licensing', title: 'Licensing', fields: [['license_number', 'License number', false, true], ['issuing_authority', 'Issuing authority', false, true], ['status', 'Status'], ['disclosures', 'Disclosures', true]] },
  { name: 'careers', title: 'Job openings', fields: [['title', 'Job title', false, true], ['department', 'Department'], ['employment_type', 'Employment type'], ['compensation', 'Compensation'], ['description', 'Description', true], ['requirements', 'Requirements', true]] },
  { name: 'forms', title: 'Public forms and packets', fields: [['title', 'Form title', false, true], ['description', 'Description', true]] },
];

export function newCollectionItem(collection) {
  return {
    id: crypto.randomUUID(),
    ...Object.fromEntries(collection.fields.map(([name]) => [name, ''])),
    ...(collection.name === 'forms' ? { category: 'general', asset_key: '', filename: '' } : {}),
  };
}
