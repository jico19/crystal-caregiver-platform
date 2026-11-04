import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';
import { emptyPublicSite } from '../src/features/public/lib/publishedSite.js';

const vite = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'error',
});
const { AuthContext } = await vite.ssrLoadModule('/src/shared/contexts/authContextDef.js');
after(() => vite.close());

async function renderPage(modulePath, payloads, { path = '/indiana', route = '/:state', role = 'caregiver', queryEntries = [], publicOnly = false } = {}) {
  const { default: Page } = await vite.ssrLoadModule(`/src/${modulePath}`);
  const user = { id: 'fixture-user', email: 'caregiver@example.com', role, state_id: 2, state_code: 'IN' };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity, retry: false } } });
  for (const [url, data] of Object.entries(payloads)) {
    client.setQueryData(url === 'published-site' ? ['published-site', data.state.slug] : [url, {}, user.id], data);
  }
  for (const [key, data] of queryEntries) client.setQueryData(key, data);
  try {
    const content = createElement(QueryClientProvider, { client },
        createElement(MemoryRouter, { initialEntries: [path] },
          createElement(Routes, null, createElement(Route, { path: route, element: createElement(Page) }))));
    return renderToStaticMarkup(publicOnly ? content : createElement(AuthContext.Provider, { value: { user, token: 'fixture-token', loading: false } }, content));
  } finally {
    client.clear();
  }
}

test('state overview and services render the published content without authentication', async () => {
  const publication = { ...emptyPublicSite('indiana'), services: [{ id: 'service-1', title: 'Indiana Companion Service', description: 'Agency service detail' }] };
  const overview = await renderPage('features/public/pages/StatePage.jsx', {
    'published-site': publication,
  }, { publicOnly: true });
  assert.match(overview, /Indiana Companion Service/);
  assert.match(overview, /IN Branch/);
  const services = await renderPage('features/public/pages/ServicesPage.jsx', {
    'published-site': publication,
  }, { publicOnly: true });
  assert.match(services, /Indiana Companion Service/);
});

test('public forms use independent downloads and licensing uses published status', async () => {
  const fileUrl = `/published-site/assets/${'a'.repeat(64)}.pdf`;
  const forms = await renderPage('features/public/pages/FormsPage.jsx', {
    'published-site': { ...emptyPublicSite('indiana'), forms: [{ id: 'form-1', title: 'Approved Indiana Form', description: '', category: 'general', file_url: fileUrl }] },
  }, { publicOnly: true });
  assert.match(forms, /Approved Indiana Form/);
  assert.ok(forms.includes(`href="${fileUrl}"`));
  const licensing = await renderPage('features/public/pages/LicensingPage.jsx', {
    'published-site': { ...emptyPublicSite('indiana'), licensing: [{ id: 'license-1', license_number: 'IN-EXAMPLE', issuing_authority: 'Indiana Office', status: 'Pending', disclosures: 'Agency disclosure' }] },
  }, { publicOnly: true });
  assert.match(licensing, /IN-EXAMPLE/);
  assert.match(licensing, /Pending/);
  assert.match(licensing, /Agency disclosure/);
  assert.doesNotMatch(licensing, /Active Certification/);
});

test('all public state pages render without an auth provider or available database', async () => {
  for (const state of ['florida', 'indiana', 'georgia']) {
    for (const page of ['StatePage', 'ServicesPage', 'FormsPage', 'LicensingPage', 'CareersPage', 'ContactPage']) {
      const html = await renderPage(`features/public/pages/${page}.jsx`, {}, {
        publicOnly: true, path: `/${state}`, route: '/:state',
      });
      assert.match(html, new RegExp(state[0].toUpperCase() + state.slice(1)));
      assert.doesNotMatch(html, /Querying database|Location Not Found|Loading.*Office|24\/7 Registered Nurse/);
    }
  }
});

test('published contact information and careers replace hardcoded public claims', async () => {
  const publication = {
    ...emptyPublicSite('indiana'),
    contact: { phone: '317-555-0100', email: 'office@example.com', address: 'Published office address', office_hours: 'Monday to Friday, 9 to 4' },
    careers: [{ id: 'job-1', title: 'Indiana caregiver position', description: 'Published role', department: '', employment_type: 'Part time', requirements: '', compensation: '' }],
  };
  const contact = await renderPage('features/public/pages/ContactPage.jsx', { 'published-site': publication }, { publicOnly: true });
  assert.match(contact, /317-555-0100|office@example.com/);
  assert.match(contact, /Monday to Friday, 9 to 4/);
  assert.doesNotMatch(contact, /2 business hours|24\/7|direct messaging/);
  const careers = await renderPage('features/public/pages/CareersPage.jsx', { 'published-site': publication }, { publicOnly: true });
  assert.match(careers, /Indiana caregiver position/);
  assert.doesNotMatch(careers, /competitive weekly pay|paid in-service/);
});

test('main admin editor renders state selection, draft controls, and public PDF management', async () => {
  const draft = emptyPublicSite('florida');
  const html = await renderPage('features/admin/pages/WebsiteContentPage.jsx', {
    '/admin/website/florida/': {
      draft, revision: 'a'.repeat(64), saved_at: null,
      publication: { published_at: null, has_changes: true, url: '/florida' },
    },
  }, { path: '/admin/website', route: '/admin/website', role: 'super_admin' });
  assert.match(html, /Website state/);
  assert.match(html, /Florida|Indiana|Georgia/);
  assert.match(html, /Save draft/);
  assert.match(html, /Publish saved draft/);
  assert.match(html, /Public forms and packets/);
  assert.match(html, /No publication yet/);
});

test('caregiver profile hydrates from its bare API object', async () => {
  const html = await renderPage('features/caregiver/pages/ProfilePage.jsx', {
    '/caregivers/me': { id: 'fixture-user', first_name: 'Jane', last_name: 'Smith', phone: '3175551234', state: 2 },
  }, { path: '/caregiver/profile', route: '/caregiver/profile' });
  assert.match(html, /value="Jane"/);
  assert.match(html, /value="Smith"/);
  assert.match(html, /value="3175551234"/);
});

test('training joins catalog courses to real enrollment statuses', async () => {
  const html = await renderPage('features/caregiver/pages/TrainingPage.jsx', {
    '/training/courses': [
      { id: 1, name: 'Privacy Training', duration_hours: '2.0' },
      { id: 2, name: 'Safety Training', duration_hours: '1.0' },
      { id: 3, name: 'Mobility Training', duration_hours: '1.0' },
    ],
    '/training/my-enrollments': [
      { id: 'enrollment-1', course_id: 1, status: 'completed', completed_at: '2026-11-01T12:00:00Z' },
      { id: 'enrollment-2', course_id: 2, status: 'in_progress', due_at: '2026-11-30' },
    ],
  }, { path: '/caregiver/training', route: '/caregiver/training' });
  assert.match(html, /Privacy Training/);
  assert.match(html, /href="\/caregiver\/training-certificate\/1"/);
  assert.match(html, /Mark as Completed/);
  assert.match(html, /Enroll Module/);
});

test('caregiver dashboard shows actual application, profile, and training data', async () => {
  const html = await renderPage('features/caregiver/pages/DashboardPage.jsx', {
    '/caregivers/me': { id: 'fixture-user', first_name: 'Jane', state: 2, state_code: 'IN' },
    '/caregivers/me/application': { id: 'application-1', status: 'approved' },
    '/documents/me': { documents: [] },
    '/caregivers/me/credential-status': { compliant: false, expired: [], expiring_soon: [], missing_requirements: ['CPR Certificate'] },
    '/announcements': [{ id: 'announcement-1', title: 'Agency Notice', body: 'Office message', created_at: '2026-11-01T12:00:00Z' }],
    '/training/my-enrollments': [{ id: 'enrollment-1', course_id: 1, course_name: 'Privacy Training', status: 'completed' }],
  }, { path: '/caregiver/dashboard', route: '/caregiver/dashboard' });
  assert.match(html, /Welcome back, Jane/);
  assert.match(html, /Your application is approved/);
  assert.match(html, /1 of 1 enrolled courses completed/);
  assert.match(html, /CPR Certificate/);
  assert.match(html, /Agency Notice/);
  assert.match(html, /href="\/packets\/IN-Employment-Packet.pdf"/);
  assert.doesNotMatch(html, /40h\/wk|Daily Max|Confirmed client visits/);
});

test('assigned clients, care plan, and schedules display unwrapped API data', async () => {
  const roster = await renderPage('features/caregiver/pages/ClientsPage.jsx', {
    '/caregivers/me/clients': [{ id: 'client-1', first_name: 'Maria', last_name: 'Jones', state_code: 'IN' }],
  }, { path: '/caregiver/clients', route: '/caregiver/clients' });
  assert.match(roster, /Maria Jones/);
  assert.match(roster, /href="\/caregiver\/clients\/client-1\/care-plan"/);
  const plan = await renderPage('features/caregiver/pages/ClientCarePlanPage.jsx', {
    '/caregivers/me/clients/client-1/care-plan': { id: 'plan-1', client_name: 'Maria Jones', primary_nurse: 'Nurse Test', emergency_protocol: 'Call the office', daily_activities: [] },
  }, { path: '/caregiver/clients/client-1/care-plan', route: '/caregiver/clients/:clientId/care-plan' });
  assert.match(plan, /Nurse Test/);
  const schedule = await renderPage('features/caregiver/pages/ClientSchedulePage.jsx', {
    '/caregivers/me/clients/client-1/schedule': [{ id: 'schedule-1', day_of_week: 'Monday', start_time: '09:00:00', end_time: '11:00:00', service: 'Companion Visit', status: 'scheduled' }],
  }, { path: '/caregiver/clients/client-1/schedule', route: '/caregiver/clients/:clientId/schedule' });
  assert.match(schedule, /Companion Visit/);
  assert.match(schedule, /09:00:00 - 11:00:00/);
});

test('administrator roster links to application IDs and reports unknown compliance honestly', async () => {
  const html = await renderPage('features/admin/pages/CaregiversPage.jsx', {
    '/admin/caregivers/analytics': { total_caregivers: 2, pending_applications: 1, approved: 1, in_onboarding: 0 },
  }, {
    path: '/admin/caregivers',
    route: '/admin/caregivers',
    role: 'administrator',
    queryEntries: [[['paginated', '/admin/caregivers', '{}', 1, 20, 'fixture-token'], {
      count: 2,
      results: [
        { id: 'caregiver-1', first_name: 'Jane', last_name: 'Smith', state_code: 'IN', application_id: 'application-1', application_status: 'submitted', compliance: { is_compliant: false, blocking_reasons: ['CPR Certificate'] } },
        { id: 'caregiver-2', first_name: 'John', last_name: 'Jones', state_code: 'IN', application_id: 'application-2', application_status: 'approved' },
      ],
    }]],
  });
  assert.match(html, /Jane Smith/);
  assert.match(html, /href="\/admin\/caregivers\/application-1"/);
  assert.doesNotMatch(html, /href="\/admin\/caregivers\/caregiver-1"/);
  assert.match(html, /Action Required/);
  assert.match(html, /Not checked/);
  assert.doesNotMatch(html, /Cleared for Care|Ready for Service/);
});
