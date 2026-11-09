import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useFetch from '../hooks/useFetch';
import PortalShell from '../components/sidebar/PortalShell';
import { isAdmin } from '../lib/roles';

export default function ClientLayout({ children }) {
  const { user, token, loading, logout } = useAuth();
  const { data: notifications } = useFetch('/clients/me/notifications', { enabled: !!token, defaultData: [] });
  const list = notifications?.notifications || (Array.isArray(notifications) ? notifications : []);
  const unreadCount = list.filter((n) => !n.read).length;

  const { data: agreementsData } = useFetch('/clients/me/agreements', { enabled: !!token, defaultData: [] });
  const agreementsList = agreementsData?.agreements || (Array.isArray(agreementsData) ? agreementsData : []);
  const unsignedCount = agreementsList.filter((a) => !(a.signed || a.signed_at)).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading Client Portal...
      </div>
    );
  }

  if (!user) return <Navigate to="/client/login" replace />;
  if (isAdmin(user)) return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'caregiver') return <Navigate to="/caregiver/dashboard" replace />;
  if (user.role !== 'client') return <Navigate to="/client/login" replace />;

  const navLinks = [
    {
      label: 'My Home Care',
      items: [
        { label: 'Care Dashboard', to: '/client/dashboard', icon: 'dashboard' },
        { label: 'Care Schedule', to: '/client/schedule', icon: 'schedule' },
        { label: 'Care Plan', to: '/client/care-plan', icon: 'carePlan' },
        { label: 'Coverage & Hours', to: '/client/authorizations', icon: 'authorizations' },
      ],
    },
    {
      label: 'Onboarding & Paperwork',
      items: [
        { label: 'Admission & Intake', to: '/client/intake', icon: 'intake' },
        { label: 'Sign Agreements', to: '/client/forms', icon: 'forms', hasBadge: unsignedCount > 0, badgeCount: unsignedCount },
        { label: 'Documents & Uploads', to: '/client/documents', icon: 'records' },
      ],
    },
    {
      label: 'My Account',
      items: [
        { label: 'Contact Details', to: '/client/profile', icon: 'profile' },
        { label: 'Alerts', to: '/client/notifications', icon: 'alerts', hasBadge: unreadCount > 0, badgeCount: unreadCount },
      ],
    },
  ];

  return (
    <PortalShell
      roleBadge="Client & Family"
      homePath="/client/dashboard"
      navLinks={navLinks}
      user={user}
      logout={logout}
      unreadCount={unreadCount}
      notificationsPath="/client/notifications"
    >
      {children}
    </PortalShell>
  );
}
