import { Outlet, Link, useParams } from 'react-router-dom';
import StateSwitcher from '../../features/public/components/StateSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Button } from '../../components/ui/button';

export default function PublicLayout() {
  const { state = 'florida' } = useParams();

  const navLinks = [
    { label: 'Services', to: `/${state}/services` },
    { label: 'Careers', to: `/${state}/careers` },
    { label: 'Forms', to: `/${state}/forms` },
    { label: 'Licensing', to: `/${state}/licensing` },
    { label: 'Contact', to: `/${state}/contact` },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900">
      {/* Top Utility Bar & Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              to={`/${state}`}
              className="flex items-center gap-2.5 text-decoration-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs group-hover:bg-emerald-700 transition-colors">
                CP
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                  CarePlatform
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                  Healthcare Services
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Utilities */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-medium text-slate-500 hidden sm:inline">Region:</span>
              <StateSwitcher />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 text-slate-700">
                  Portal Login ▾
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/caregiver/login" className="cursor-pointer font-medium text-xs">
                    Caregiver Portal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/client/login" className="cursor-pointer font-medium text-xs">
                    Client & Family Portal
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Minimal, Professional Footer */}
      <footer className="w-full bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row sm:justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} CarePlatform Healthcare Services. Multi-state operations in Florida, Indiana, and Georgia.
          </div>
          <div className="flex items-center gap-6">
            <Link to={`/${state}/licensing`} className="hover:text-slate-800 hover:underline">
              Licensing Disclosures
            </Link>
            <Link to={`/${state}/contact`} className="hover:text-slate-800 hover:underline">
              Contact Coordinators
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
