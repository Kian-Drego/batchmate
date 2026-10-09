import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/matches', label: 'Matched Scholarships', icon: Target },
  { to: '/passport', label: 'Scholarship Passport', icon: FileText },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/exams', label: 'Exam Readiness', icon: GraduationCap },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
];

const ADMIN_NAV = [{ to: '/admin', label: 'Source Audit', icon: ShieldCheck }];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = user?.role === 'admin' ? [...NAV, ...ADMIN_NAV] : NAV;
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-card border px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-line bg-inverse text-inverse-fg'
                : 'border-transparent text-ink-soft hover:border-line-faint hover:bg-paper-sunken'
            }`
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper-raised/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-card border border-line bg-inverse text-inverse-fg">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-base font-semibold text-ink">
                BatchMate
              </span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
                Match · Prep · Apply
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-paper-sunken font-mono text-xs font-semibold">
                {user ? initials(user.name) : '—'}
              </span>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-ink">{user?.name}</div>
                <div className="text-xs text-ink-faint">{user?.email}</div>
              </div>
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-card border border-line px-3.5 text-xs font-semibold text-ink-soft hover:bg-paper-sunken"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-6 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">
            <NavItems />
            <div className="mt-6 border-t border-line-faint pt-4">
              <p className="text-xs leading-relaxed text-ink-faint">
                No national ID is ever collected. Only the metadata needed to verify eligibility is
                stored on your passport.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute inset-x-4 top-[68px] z-20 overflow-hidden lg:hidden"
            >
              <div className="panel p-2 shadow-hard">
                <NavItems onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
