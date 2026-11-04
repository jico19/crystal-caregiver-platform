import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import PortalShell from '../components/sidebar/PortalShell';
import { isAdmin, isSuperAdmin, stateLabelFor } from '../lib/roles';

const STATE_SLUGS_BY_CODE = {
  FL: 'florida',
  IN: 'indiana',
  GA: 'georgia',
};

export default function StateAdminLayout() {
  const { user, token, loading, logout } = useAuth();
  const { data: notifications } = useFetch('/admin/notifications', { enabled: !!token, defaultData: [] });
  const list = notifications?.notifications || (Array.isArray(notifications) ? notifications : []);
  const unreadCount = list.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading Regional Operations Portal...
      </div>
    );
  }

  if (!user) return <Navigate to="/caregiver/login" replace />;
  if (user.role === 'caregiver') return <Navigate to="/caregiver/dashboard" replace />;
  if (user.role === 'client') return <Navigate to="/client/dashboard" replace />;
  if (!isAdmin(user)) return <Navigate to="/caregiver/login" replace />;
  // Super Admins should use Super Admin layout
  if (isSuperAdmin(user)) return <Navigate to="/admin/dashboard" replace />;

  const stateCode = stateLabelFor(user);
  const stateSlug = STATE_SLUGS_BY_CODE[stateCode] || 'florida';

  // State-scoped operational navigation (no cross-state or platform-admin dead ends)
  const navLinks = [
    {
      label: 'Regional Overview',
      items: [
        { label: 'Operations Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
      ],
    },
    {
      label: 'Casework & Intake',
      items: [
        { label: 'Intake & Referrals', to: '/admin/referrals', icon: 'referrals' },
        { label: 'Clients & Care Plans', to: '/admin/clients', icon: 'clients' },
        { label: 'Authorizations', to: '/admin/authorizations', icon: 'authorizations' },
      ],
    },
    {
      label: 'Staffing & Compliance',
      items: [
        { label: 'Caregiver Pool', to: '/admin/caregivers', icon: 'caregivers' },
        { label: 'Document Review', to: '/admin/documents', icon: 'compliance' },
        { label: 'In-Service Training', to: '/admin/training', icon: 'training' },
      ],
    },
    {
      label: 'Communications',
      items: [
        { label: 'Branch Announcements', to: '/admin/announcements', icon: 'announcements' },
        { label: 'Notifications', to: '/admin/notifications', icon: 'notifications', hasBadge: true, badgeCount: unreadCount },
      ],
    },
  ];

  return (
    <PortalShell
      roleBadge={`${stateCode} Regional Admin`}
      homePath="/admin/dashboard"
      navLinks={navLinks}
      user={user}
      logout={logout}
      unreadCount={unreadCount}
      notificationsPath="/admin/notifications"
      secondaryAction={{ label: `${stateCode} Public Site ↗`, to: `/${stateSlug}` }}
    />
  );
}
