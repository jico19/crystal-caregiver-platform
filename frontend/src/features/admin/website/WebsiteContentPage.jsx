import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import useFetch from '@/shared/hooks/useFetch';
import { api } from '@/shared/services/api';
import { PUBLIC_STATES } from '@/shared/constants/states';
import PageContainer from '@/shared/components/common/PageContainer';
import PageHeader from '@/shared/components/common/PageHeader';
import LoadingState from '@/shared/components/common/LoadingState';
import FormField from '@/shared/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WebsiteField, WebsiteCollection } from './WebsiteFields.jsx';
import { COLLECTIONS } from './websiteConfig.js';

export default function WebsiteContentPage() {
  const [state, setState] = useState('florida');
  return <WebsiteStateEditor key={state} state={state} onStateChange={setState} />;
}

function WebsiteStateEditor({ state, onStateChange }) {
  const { token } = useAuth();
  const [notice, setNotice] = useState('');
  // Saved revisions refresh after our actions. Background refreshes must not
  // replace another editor's unsaved form; the server detects stale saves.
  const { data, isLoading, error, refetch } = useFetch(`/admin/website/${state}/`, { enabled: Boolean(token), staleTime: Infinity });
  if (isLoading) return <LoadingState title="Loading website draft..." variant="page" />;
  if (!data || error) return (
    <PageContainer>
      <PageHeader title="Website content" />
      <Alert variant="destructive"><AlertDescription>{error || 'The editor is temporarily unavailable.'}</AlertDescription></Alert>
      <Button className="mt-4" variant="outline" onClick={() => refetch()}>Try again</Button>
    </PageContainer>
  );
  return (
    <PageContainer>
      <PageHeader title="Website content" subtitle="Manage each state's public pages. Save a draft, review it, then publish when it is ready." />
      {notice && <Alert className="mb-4"><AlertDescription>{notice}</AlertDescription></Alert>}
      <WebsiteDraftForm key={`${state}-${data.revision}-${data.publication.published_at}`} state={state} data={data} token={token}
        onStateChange={onStateChange} onUpdated={async (message) => { setNotice(message); await refetch(); }} />
    </PageContainer>
  );
}

function WebsiteDraftForm({ state, data, token, onStateChange, onUpdated }) {
  const [draft, setDraft] = useState(data.draft);
  const [action, setAction] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const edited = JSON.stringify(draft) !== JSON.stringify(data.draft);
  const busy = Boolean(action || uploadingId);

  async function save(event) {
    event.preventDefault();
    setError(''); setAction('save');
    try {
      await api.put(`/admin/website/${state}/`, { draft, revision: data.revision }, token);
      await onUpdated('Draft saved. Your public website is unchanged until you publish.');
    } catch (failure) { setError(failure.detail || failure.message); }
    finally { setAction(''); }
  }

  async function publish() {
    setError(''); setAction('publish');
    try {
      await api.post(`/admin/website/${state}/publish/`, { revision: data.revision }, token);
      await queryClient.invalidateQueries({ queryKey: ['published-site', state] });
      await onUpdated(`${PUBLIC_STATES[state].name} website published.`);
    } catch (failure) { setError(failure.detail || failure.message); }
    finally { setAction(''); }
  }

  async function uploadForm(id, file) {
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 15 * 1024 * 1024) {
      setError('Choose a PDF that is 15 MB or smaller.'); return;
    }
    setUploadingId(id);
    try {
      const body = new FormData(); body.append('file', file);
      const asset = await api.upload('/admin/website/assets/', body, token);
      setDraft((current) => ({ ...current, forms: current.forms.map((form) => form.id === id ? { ...form, ...asset } : form) }));
    } catch (failure) { setError(failure.detail || failure.message); }
    finally { setUploadingId(null); }
  }

  function updateGroup(group, key, value) {
    setDraft((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border border-slate-200 rounded-lg p-4 bg-white">
        <FormField label="Website state" htmlFor="website-state">
          <select id="website-state" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={state} disabled={busy} onChange={(event) => {
            if (!edited || window.confirm('Discard your unsaved changes and switch states?')) onStateChange(event.target.value);
          }}>
            {Object.entries(PUBLIC_STATES).map(([slug, info]) => <option key={slug} value={slug}>{info.name}</option>)}
          </select>
        </FormField>
        <div className="text-sm text-slate-600">
          <p>{data.publication.published_at ? `Published ${new Date(data.publication.published_at).toLocaleString()}` : 'No publication yet'}</p>
          <p>{edited ? 'Unsaved changes' : data.publication.has_changes ? 'Draft has unpublished changes' : 'Published version is current'}</p>
        </div>
        <Button type="button" variant="outline" asChild><Link to={`/${state}`} target="_blank" rel="noreferrer">View public website</Link></Button>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <fieldset disabled={busy} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Home page</h2>
          <WebsiteField id="overview-title" label="Page title" value={draft.overview.title} required onChange={(value) => updateGroup('overview', 'title', value)} />
          <WebsiteField id="overview-description" label="Introduction" value={draft.overview.description} multiline onChange={(value) => updateGroup('overview', 'description', value)} />
        </section>
        <section className="border-t border-slate-200 pt-6 space-y-4">
          <h2 className="text-base font-semibold">Office contact details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['address', 'Address', 'text'], ['office_hours', 'Office hours', 'text']].map(([key, label, type]) => (
              <WebsiteField key={key} id={`contact-${key}`} label={label} type={type} value={draft.contact[key]} onChange={(value) => updateGroup('contact', key, value)} />
            ))}
          </div>
        </section>
        {COLLECTIONS.map((collection) => <WebsiteCollection key={collection.name} collection={collection} items={draft[collection.name]}
          uploadingId={uploadingId} onUpload={uploadForm} onChange={(items) => setDraft((current) => ({ ...current, [collection.name]: items }))} />)}
      </fieldset>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white py-4">
        <Button type="submit" variant="outline" disabled={busy || (!edited && Boolean(data.saved_at))}>{action === 'save' ? 'Saving...' : 'Save draft'}</Button>
        <Button type="button" onClick={publish} disabled={busy || edited || !data.saved_at || !data.publication.has_changes}>{action === 'publish' ? 'Publishing...' : 'Publish saved draft'}</Button>
        {edited && <span className="text-sm text-slate-600">Save your changes before publishing.</span>}
      </div>
    </form>
  );
}
