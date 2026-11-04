import { useState } from 'react';
import { useAuth } from '../../../shared/hooks/useAuth';
import { isSuperAdmin } from '../../../shared/lib/roles';
import { api } from '../../../shared/services/api';
import usePaginatedFetch from '../../../shared/hooks/usePaginatedFetch';
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import EmptyState from '../../../shared/components/common/EmptyState';
import Pagination from '../../../shared/components/common/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export default function UsersPage() {
  const { user, token } = useAuth();
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const [offboardTarget, setOffboardTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const isSuperAdminUser = isSuperAdmin(user);

  const {
    items: users,
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
    url: '/admin/users',
    token,
    params: {
      role: roleFilter,
      status: statusFilter,
      state_id: stateFilter,
    },
    listKey: 'users',
  });

  async function handleToggleStatus(u) {
    setActionError('');
    setActionSuccess('');
    setBusy(true);

    const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
    try {
      await api.post(`/admin/users/${u.id}/status`, { status: newStatus }, token);
      setActionSuccess(`User ${u.email} status updated to ${newStatus}.`);
      reload();
    } catch (err) {
      setActionError(err.detail || err.message || 'Failed to update user status.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOffboardConfirm() {
    if (!offboardTarget) return;
    setActionError('');
    setActionSuccess('');
    setBusy(true);

    try {
      await api.delete(`/admin/users/${offboardTarget.id}`, token);
      setActionSuccess(`User ${offboardTarget.email} was successfully offboarded.`);
      setOffboardTarget(null);
      reload();
    } catch (err) {
      setActionError(err.detail || err.message || 'Failed to offboard user.');
    } finally {
      setBusy(false);
    }
  }

  const displayUsers = users.filter((u) => isSuperAdminUser || (u.roles?.name || u.role) !== 'super_admin');

  return (
    <PageContainer>
      <PageHeader
        title="User Access & Lifecycle Management"
        description="Manage platform users, update access status, and process soft-delete offboarding."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {isSuperAdminUser && (
              <Select value={stateFilter} onValueChange={(val) => { setStateFilter(val); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="1">Florida</SelectItem>
                    <SelectItem value="2">Indiana</SelectItem>
                    <SelectItem value="3">Georgia</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {actionError && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="mb-4 text-sm border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 text-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading user accounts...</div>
          ) : displayUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No users found"
                message="No users match the selected role, status, or state criteria."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/50">
                  <TableHead className="text-xs font-semibold text-slate-600">User Email</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">State</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers.map((u) => {
                  const roleName = u.roles?.name || u.role || 'user';
                  const stateName = u.states?.name || (u.state_id ? `State #${u.state_id}` : 'All States');
                  const isSelf = u.id === user?.sub || u.id === user?.id;

                  return (
                    <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900 text-xs">
                        {u.email}
                        {isSelf && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}
                      </TableCell>
                      <TableCell className="capitalize text-slate-600 text-xs">{roleName.replace('_', ' ')}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{stateName}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} label={u.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy || isSelf}
                            onClick={() => handleToggleStatus(u)}
                            className="h-7 text-xs"
                          >
                            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </Button>

                          {isSuperAdminUser && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => setOffboardTarget(u)}
                              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              Offboard
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && total > 0 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                pages={pages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Offboarding User */}
      <Dialog open={!!offboardTarget} onOpenChange={(open) => !open && setOffboardTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Offboard User Account</DialogTitle>
            <DialogDescription>
              {offboardTarget
                ? `Are you sure you want to offboard ${offboardTarget.email}? Soft-delete notice: offboarding revokes platform access and sets user status to inactive. Regulatory records and documents are preserved.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setOffboardTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={handleOffboardConfirm}
            >
              {busy ? 'Offboarding...' : 'Confirm Offboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
