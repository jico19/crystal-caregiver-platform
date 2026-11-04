import { Link } from 'react-router-dom';
import { stateLabelFor, isSuperAdmin, isStateAdmin } from '../../lib/roles';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

export default function PortalTopBar({
  roleBadge,
  user,
  logout,
  onOpenMobile,
  secondaryAction = null,
  unreadCount = 0,
  notificationsPath = null,
}) {
  const stateCode = stateLabelFor(user);
  const isSuper = isSuperAdmin(user);
  const isState = isStateAdmin(user);
  const avatarLetter = (user?.email ? user.email[0] : (roleBadge?.[0] || 'U')).toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between gap-3">
      {/* Left Area: Mobile hamburger + State badges */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="md:hidden h-8 w-8 text-slate-600 hover:text-slate-900"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>

        {/* State and Context Indicators */}
        <div className="flex items-center gap-2">
          {isSuper ? (
            <>
              <Badge variant="outline" className="text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300">
                Multi-State Executive HQ
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium text-emerald-700 bg-emerald-50 hidden sm:inline-flex">
                Global Operations
              </Badge>
            </>
          ) : isState ? (
            <>
              <Badge variant="outline" className="text-xs font-semibold text-emerald-800 bg-emerald-50/50 border-emerald-200">
                {stateCode} Regional Office
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium text-slate-600 bg-slate-100 hidden sm:inline-flex">
                Branch Casework
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-xs font-semibold text-slate-700 bg-slate-50 border-slate-200">
              {stateCode ? `${stateCode} Office` : 'FL • IN • GA'}
            </Badge>
          )}
        </div>
      </div>

      {/* Right Area: Secondary action + Notifications + User Menu */}
      <div className="flex items-center gap-2">
        {/* Optional Secondary Action (e.g., Public Site Link) */}
        {secondaryAction && (
          <Button variant="ghost" size="sm" asChild className="text-xs text-slate-600 hover:text-slate-900 hidden sm:inline-flex h-8">
            <Link to={secondaryAction.to}>
              {secondaryAction.label}
            </Link>
          </Button>
        )}

        {/* Notifications Icon Button */}
        {notificationsPath && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative h-8 w-8 text-slate-500 hover:text-slate-700"
          >
            <Link to={notificationsPath} title="Notifications">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
              )}
            </Link>
          </Button>
        )}

        {/* User Identity / Avatar Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs select-none">
                  {avatarLetter}
                </div>
                <span className="text-xs font-medium text-slate-700 hidden lg:inline-block max-w-[120px] truncate">
                  {user.email?.split('@')[0]}
                </span>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
                  <p className="text-[11px] text-slate-500">
                    Role: <span className="font-medium text-slate-700 capitalize">{user.role?.replace('_', ' ') || roleBadge}</span>
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {logout && (
                <DropdownMenuItem
                  onClick={logout}
                  className="text-xs font-medium text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                >
                  Sign Out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
