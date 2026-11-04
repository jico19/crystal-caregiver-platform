import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import PortalShell from '../components/sidebar/PortalShell';
import { isAdmin, isStateAdmin } from '../lib/roles';
import StateAdminLayout from './StateAdminLayout';

export default function AdminLayout() {
  const { user, token, loading, logout } = useAuth();
  const { data: notifications } = useFetch('/admin/notifications', { enabled: !!token, defaultData: [] });
  const list = notifications?.notifications || (Array.isArray(notifications) ? notifications : []);
  const unreadCount = list.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading Admin Operations Portal...
      </div>
    );
  }

  if (!user) return <Navigate to="/caregiver/login" replace />;
  if (user.role === 'caregiver') return <Navigate to="/caregiver/dashboard" replace />;
  if (user.role === 'client') return <Navigate to="/client/dashboard" replace />;
  if (!isAdmin(user)) return <Navigate to="/caregiver/login" replace />;

  // Render dedicated State Admin layout for regional branch administrators
  if (isStateAdmin(user)) {
    return <StateAdminLayout />;
  }

  // Super Admin Executive Command Center navigation
  const navLinks = [
    {
      label: 'Executive Overview',
      items: [
        { label: 'Executive Hub', to: '/admin/dashboard', icon: 'dashboard' },
        { label: 'Cross-State Reports', to: '/admin/reports', icon: 'reports' },
      ],
    },
    {
      label: 'Multi-State Oversight',
      items: [
        { label: 'Caregivers & Staff', to: '/admin/caregivers', icon: 'caregivers' },
        { label: 'Client Roster', to: '/admin/clients', icon: 'clients' },
        { label: 'Authorizations', to: '/admin/authorizations', icon: 'authorizations' },
        { label: 'Intake Referrals', to: '/admin/referrals', icon: 'referrals' },
      ],
    },
    {
      label: 'Compliance & Quality',
      items: [
        { label: 'Document Verification', to: '/admin/documents', icon: 'compliance' },
        { label: 'Training Portal', to: '/admin/training', icon: 'training' },
      ],
    },
    {
      label: 'Platform Administration',
      items: [
        { label: 'User & Staff Access', to: '/admin/users', icon: 'users' },
        { label: 'Compliance Settings', to: '/admin/settings', icon: 'settings' },
        { label: 'Website Content', to: '/admin/website', icon: 'settings' },
        { label: 'Security Audit Logs', to: '/admin/audit-logs', icon: 'audit' },
        { label: 'Announcements', to: '/admin/announcements', icon: 'announcements' },
        { label: 'Notifications', to: '/admin/notifications', icon: 'notifications', hasBadge: true, badgeCount: unreadCount },
      ],
    },
  ];

  return (
    <PortalShell
      roleBadge="Super Admin • Executive HQ"
      homePath="/admin/dashboard"
      navLinks={navLinks}
      user={user}
      logout={logout}
      unreadCount={unreadCount}
      notificationsPath="/admin/notifications"
      secondaryAction={{ label: 'Public Site ↗', to: '/florida' }}
    />
  );
}
