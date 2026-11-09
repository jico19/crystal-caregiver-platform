import { Link, useLocation } from 'react-router-dom';
import { stateLabelFor } from '../../lib/roles';
import NavIcon from './NavIcon';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

export default function PortalSidebar({
  roleBadge,
  homePath,
  navLinks = [],
  user,
  logout,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const location = useLocation();
  const stateCode = stateLabelFor(user);

  function isLinkActive(to) {
    if (!to) return false;
    if (to === homePath) return location.pathname === homePath;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  const hasExplicitHome = navLinks.some((entry) =>
    entry.items ? entry.items.some((item) => item.to === homePath) : entry.to === homePath
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-800 select-none">
      {/* Brand Header */}
      <div className={`flex items-center h-14 px-4 border-b border-slate-200 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Link
          to={homePath}
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 text-decoration-none focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-xs group-hover:bg-emerald-700 transition-colors">
            CP
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-slate-900 tracking-tight leading-none">
                CarePlatform
              </span>
              {roleBadge && (
                <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-1 truncate">
                  {roleBadge}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        {!collapsed && onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="hidden md:inline-flex h-7 w-7 text-slate-400 hover:text-slate-600"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        )}
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {/* Standalone Dashboard fallback if not provided in navLinks sections */}
        {!hasExplicitHome && (
          <div className="mb-2">
            <Link
              to={homePath}
              onClick={onCloseMobile}
              title={collapsed ? 'Dashboard' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isLinkActive(homePath)
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <NavIcon name="dashboard" />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </div>
        )}

        {/* Grouped & Flat Nav Items */}
        {navLinks.map((entry, idx) => {
          if (entry.items && entry.items.length > 0) {
            return (
              <div key={entry.label || idx} className="space-y-1">
                {collapsed ? (
                  (idx > 0 || !hasExplicitHome) && <div className="my-2 border-t border-slate-200 mx-1" />
                ) : (
                  <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {entry.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {entry.items.map((subItem) => {
                    const active = isLinkActive(subItem.to);
                    const tooltip = collapsed ? (entry.label ? `${entry.label}: ${subItem.label}` : subItem.label) : undefined;
                    return (
                      <Link
                        key={subItem.to}
                        to={subItem.to}
                        onClick={onCloseMobile}
                        title={tooltip}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                          active
                            ? 'bg-emerald-50 text-emerald-800 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        } ${collapsed ? 'justify-center' : 'justify-between'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <NavIcon name={subItem.icon} />
                          {!collapsed && <span className="truncate">{subItem.label}</span>}
                        </div>
                        {!collapsed && subItem.hasBadge && subItem.badgeCount > 0 && (
                          <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-semibold ml-2">
                            {subItem.badgeCount}
                          </Badge>
                        )}
                        {collapsed && subItem.hasBadge && subItem.badgeCount > 0 && (
                          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Single Link
          const active = isLinkActive(entry.to);
          return (
            <div key={entry.to || idx}>
              <Link
                to={entry.to}
                onClick={onCloseMobile}
                title={collapsed ? entry.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <NavIcon name={entry.icon} />
                  {!collapsed && <span className="truncate">{entry.label}</span>}
                </div>
                {!collapsed && entry.hasBadge && entry.badgeCount > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-semibold ml-2">
                    {entry.badgeCount}
                  </Badge>
                )}
                {collapsed && entry.hasBadge && entry.badgeCount > 0 && (
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Controls */}
      <div className="p-3 border-t border-slate-200 space-y-2">
        {/* Collapsed Expand Toggle Button */}
        {collapsed && onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="w-full h-7 flex justify-center text-slate-400 hover:text-slate-600"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </Button>
        )}

        {user && !collapsed && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user.email}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {stateCode ? `State: ${stateCode}` : 'Multi-state'}
              </div>
            </div>
            {logout && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sign Out"
                className="h-7 w-7 text-slate-400 hover:text-red-600"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            )}
          </div>
        )}

        {user && collapsed && logout && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign Out"
            className="w-full h-7 flex justify-center text-slate-400 hover:text-red-600"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (>=768px) */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 sticky top-0 h-screen z-30 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (<768px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[80vw] h-full shadow-xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
