import { useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import { api } from '../../../shared/services/api';
import { queryClient } from '../../../shared/lib/queryClient';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import FormField from '../../../shared/components/common/FormField';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import Pagination from '../../../shared/components/common/Pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AUDIENCE_OPTIONS = [
  { value: 'caregiver', label: 'Caregivers' },
  { value: 'client', label: 'Clients' },
  { value: 'all', label: 'All Roles' },
];

const EMPTY_FORM = { title: '', body: '', audience: 'caregiver', state_id: 'all' };

export default function AnnouncementsPage() {
  const { token, user } = useAuth();
  const isSuperAdminUser = isSuperAdmin(user);
  const adminStateId = isSuperAdminUser ? null : user?.state_id;
  const stateOptions = isSuperAdminUser
    ? [
        { value: 'all', label: 'All states' },
        { value: '1', label: 'Florida (FL)' },
        { value: '2', label: 'Indiana (IN)' },
        { value: '3', label: 'Georgia (GA)' },
      ]
    : [{ value: String(adminStateId), label: { 1: 'Florida (FL)', 2: 'Indiana (IN)', 3: 'Georgia (GA)' }[adminStateId] || `State #${adminStateId}` }];
  const [form, setForm] = useState({ ...EMPTY_FORM, state_id: isSuperAdminUser ? 'all' : String(adminStateId || '') });
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const {
    items: announcements,
    total,
    pages,
    page,
    pageSize,
    loading,
    error,
    setPage,
    setPageSize,
    reload,
  } = usePaginatedFetch({
    url: '/admin/announcements',
    token,
    listKey: 'announcements',
  });

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function invalidateAnnouncementCaches() {
    queryClient.invalidateQueries({ queryKey: ['/announcements'] });
    queryClient.invalidateQueries({ queryKey: ['/admin/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['paginated', '/admin/announcements'] });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!form.title.trim() || !form.body.trim()) {
      setErrorMsg('Title and message body are required.');
      return;
    }
    if (form.title.trim().length > 200) {
      setErrorMsg('Announcement title must not exceed 200 characters.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/admin/announcements', {
        title: form.title.trim(),
        body: form.body.trim(),
        audience: form.audience,
        state_id: form.state_id !== 'all' ? parseInt(form.state_id, 10) : null,
        is_active: true,
      }, token);
      setSuccessMsg('Announcement published to the caregiver/client portals.');
      setForm({ ...EMPTY_FORM, state_id: isSuperAdminUser ? 'all' : String(adminStateId || '') });
      setPage(1);
      reload();
      invalidateAnnouncementCaches();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to create announcement.');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(ann) {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.patch(`/admin/announcements/${ann.id}`, { is_active: !ann.is_active }, token);
      reload();
      invalidateAnnouncementCaches();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to update announcement.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.delete(`/admin/announcements/${deleteTarget.id}`, token);
      setSuccessMsg('Announcement deleted.');
      setDeleteTarget(null);
      reload();
      invalidateAnnouncementCaches();
    } catch (err) {
      setErrorMsg(err.detail || 'Failed to delete announcement.');
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Announcements"
        description="Broadcast in-app messages to caregivers and clients. Announcements appear on the relevant portal dashboard."
      />

      {error && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="mb-4 text-sm border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Confirmation Dialog for Deleting Announcement */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This message will no longer appear on user portals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
            >
              Delete Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="p-6 mb-6 border-slate-200">
        <h2 className="text-base font-semibold text-slate-900 m-0 pb-3 mb-4 border-b border-slate-100 flex items-center">
          <Megaphone size={16} className="text-emerald-600 mr-2" />
          Publish New Announcement
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Title" required htmlFor="ann-title">
              <Input
                id="ann-title"
                type="text"
                maxLength={200}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="E.g., Holiday schedule update"
                className="w-full text-sm"
              />
            </FormField>
            <FormField label="Audience" required htmlFor="ann-audience">
              <Select
                value={form.audience}
                onValueChange={(val) => setField('audience', val)}
              >
                <SelectTrigger id="ann-audience" className="w-full text-xs">
                  <SelectValue placeholder="Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {AUDIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="State" htmlFor="ann-state">
              <Select
                value={form.state_id}
                onValueChange={(val) => setField('state_id', val)}
              >
                <SelectTrigger id="ann-state" className="w-full text-xs">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {stateOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Message" required htmlFor="ann-body">
            <Textarea
              id="ann-body"
              rows={3}
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              placeholder="Short in-app message shown on the portal dashboard."
              className="text-sm w-full"
            />
          </FormField>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={busy}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
            >
              <Send size={13} />
              {busy ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Published Announcements ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No announcements published yet"
                message="Use the form above to post announcements visible across portal dashboards."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-slate-900 m-0">{ann.title}</h3>
                      <StatusBadge
                        status={ann.is_active ? 'active' : 'draft'}
                        label={ann.is_active ? 'Active' : 'Draft'}
                      />
                      <Badge variant="outline" className="text-xs text-slate-600">
                        {AUDIENCE_OPTIONS.find((o) => o.value === ann.audience)?.label || ann.audience}
                      </Badge>
                      {ann.states?.code && (
                        <Badge variant="outline" className="text-xs text-slate-600">{ann.states.code}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(ann)}
                        className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        {ann.is_active ? 'Archive' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(ann)}
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-normal m-0">
                    {ann.body}
                  </p>
                  <p className="text-xs text-slate-400 m-0">
                    {ann.users?.email || 'Administrator'} · {new Date(ann.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              listLabel="announcements"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
