import { Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  BarChart3,
  ClipboardList,
  GraduationCap,
  Home,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { initials } from '../lib/format';
import { cn, IconButton, Spinner } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/matches', label: 'Matches', icon: Sparkles },
  { to: '/applications', label: 'Apply', icon: ClipboardList },
  { to: '/exams', label: 'Prep', icon: GraduationCap },
  { to: '/passport', label: 'Me', icon: UserRound },
];

const SECONDARY: NavItem[] = [{ to: '/insights', label: 'Insights', icon: BarChart3 }];
const ADMIN: NavItem[] = [{ to: '/admin', label: 'Source audit', icon: ShieldCheck }];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="tap flex items-center gap-2.5" aria-label="BatchMate home">
      <img src="/icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-[10px]" />
      {!compact && <span className="text-[17px] font-extrabold tracking-tight">BatchMate</span>}
    </Link>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </IconButton>
  );
}

function Avatar() {
  const { profile, user } = useAuth();
  const name = profile?.name || user?.email || '';
  return (
    <Link
      to="/passport"
      aria-label="Your profile"
      className="tap flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-accent-soft text-[13px] font-bold text-accent"
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </Link>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-safe-b lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {PRIMARY.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-fg' : 'text-fg-faint'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <m.span
                      layoutId="bottom-nav-pill"
                      className="absolute top-2 h-8 w-14 rounded-full bg-accent-soft shadow-glow-sm"
                      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                    />
                  )}
                  <Icon className={cn('relative h-[22px] w-[22px]', isActive && 'text-accent')} strokeWidth={isActive ? 2.4 : 2} />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SideNav() {
  const { profile } = useAuth();
  const groups = [PRIMARY, SECONDARY, ...(profile?.role === 'admin' ? [ADMIN] : [])];
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-5 lg:flex">
      <Logo />
      <nav aria-label="Primary" className="mt-8 flex-1 space-y-6">
        {groups.map((items, gi) => (
          <ul key={gi} className="space-y-1">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                      isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <m.span
                          layoutId="side-nav-pill"
                          className="absolute inset-0 rounded-xl border border-accent/30 bg-accent-soft"
                          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                        />
                      )}
                      <Icon className={cn('relative h-5 w-5', isActive && 'text-accent')} />
                      <span className="relative">{label === 'Me' ? 'Passport' : label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        ))}
      </nav>
      <div className="flex items-center justify-between border-t border-line pt-4">
        <Avatar />
        <ThemeButton />
      </div>
    </aside>
  );
}

function PageFallback() {
  return (
    <div className="flex h-[50dvh] items-center justify-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 pt-safe-t lg:hidden">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Logo />
            <div className="flex items-center gap-1">
              <ThemeButton />
              <Avatar />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {/* Enter-only transition: no exit delay between tabs. */}
          <m.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </m.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
