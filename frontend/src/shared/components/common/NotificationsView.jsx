import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { api } from '../../services/api';
import { queryClient } from '../../lib/queryClient';
import PageContainer from './PageContainer';
import PageHeader from './PageHeader';
import EmptyState from './EmptyState';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function NotificationsView({
  endpoint,
  pageTitle,
  supportsMarkAllRead = true,
  emptySubtitle = 'System notices, compliance updates, and operations will appear here.',
}) {
  const { token, user } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: rawData, isLoading, error: fetchError } = useFetch(endpoint, {
    enabled: !!token,
    defaultData: [],
  });

  const notifications = rawData?.notifications || (Array.isArray(rawData) ? rawData : []);

  async function handleMarkRead(id) {
    try {
      await api.patch(`${endpoint}/${id}/read`, null, token);
      queryClient.setQueryData([endpoint, {}, user?.id], (old) => {
        if (!old) return old;
        const list = old.notifications || (Array.isArray(old) ? old : []);
        const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
        return old.notifications ? { ...old, notifications: updated } : updated;
      });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    } catch {
      setErrorMsg('Failed to mark notification as read.');
    }
  }

  async function handleMarkAllRead() {
    if (!supportsMarkAllRead) return;
    try {
      await api.patch(`${endpoint}/read-all`, null, token);
      queryClient.setQueryData([endpoint, {}, user?.id], (old) => {
        if (!old) return old;
        const list = old.notifications || (Array.isArray(old) ? old : []);
        const updated = list.map((n) => ({ ...n, read: true }));
        return old.notifications ? { ...old, notifications: updated } : updated;
      });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    } catch {
      setErrorMsg('Failed to mark all notifications as read.');
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <PageContainer size="narrow">
        <div className="py-12 text-center text-slate-500 text-sm">
          Loading notification feed...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title={pageTitle}
        subtitle={
          unreadCount > 0
            ? `You have ${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}.`
            : 'All alerts are up to date.'
        }
        actions={
          supportsMarkAllRead && unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="border-slate-200 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Mark all as read
            </Button>
          ) : null
        }
      />

      {(errorMsg || fetchError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="text-xs">{errorMsg || fetchError}</AlertDescription>
        </Alert>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications on record"
          description={emptySubtitle}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border flex items-start justify-between gap-4 transition-colors ${
                !n.read
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  )}
                  <h2 className="font-semibold text-sm text-slate-900 m-0">
                    {n.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 leading-snug mb-2">
                  {n.body}
                </p>
                <span className="text-[11px] text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              {!n.read && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkRead(n.id)}
                  className="h-7 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 bg-white"
                >
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
