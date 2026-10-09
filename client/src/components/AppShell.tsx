import { Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  Activity,
  BookOpen,
  ClipboardList,
  FileCheck2,
  Gauge,
  GraduationCap,
  House,
  LayoutGrid,
  Library,
  LineChart,
  LogOut,
  Moon,
  Radar,
  Sparkle,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar, IconButton, Spinner, cn } from './ui';
import { VerifyNudge } from './VerifyEmail';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const STUDENT_DOCK: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: House },
  { to: '/matches', label: 'Matches', icon: Sparkle },
  { to: '/applications', label: 'Apply', icon: ClipboardList },
  { to: '/exams', label: 'Prep', icon: GraduationCap },
  { to: '/passport', label: 'Me', icon: UserRound },
];

const ADMIN_DOCK: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: Gauge, end: true },
  { to: '/admin/review', label: 'Review', icon: FileCheck2 },
  { to: '/admin/applications', label: 'Decide', icon: ClipboardList },
  { to: '/admin/students', label: 'People', icon: Users },
  { to: '/admin/more', label: 'More', icon: LayoutGrid },
];

const ADMIN_SIDEBAR: NavItem[] = [
  ...ADMIN_DOCK.slice(0, 4),
  { to: '/admin/catalogue', label: 'Catalogue', icon: Library },
  { to: '/admin/insights', label: 'Insights', icon: LineChart },
  { to: '/admin/sources', label: 'Sources', icon: Radar },
  { to: '/admin/activity', label: 'Activity', icon: Activity },
];

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="press flex items-center gap-2.5" aria-label="BatchMate home">
      <img src="/icon.svg" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-[11px] shadow-soft" />
      <span className="font-display text-[19px] font-semibold tracking-tight">batchmate</span>
    </Link>
  );
}

export function ThemeButton({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <IconButton label={theme === 'dark' ? 'Light mode' : 'Dark mode'} onClick={toggle} className={className}>
      {theme === 'dark' ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
    </IconButton>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  return (
    <IconButton label="Log out" onClick={() => void signOut()} className={cn('hover:bg-rose hover:text-rose-ink', className)}>
      <LogOut className="h-[19px] w-[19px]" />
    </IconButton>
  );
}

function Dock({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:hidden">
      <ul className="flex items-center gap-1 rounded-full border border-line/70 bg-card p-1.5 shadow-lift">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} aria-label={label}>
              {({ isActive }) => (
                <m.span
                  layout
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  className={cn(
                    'press flex h-12 items-center justify-center gap-2 rounded-full text-[13.5px] font-semibold',
                    isActive ? 'bg-primary px-4 text-primary-fg shadow-key' : 'w-12 text-ink-3 hover:text-ink'
                  )}
                >
                  <Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                  {isActive && (
                    <m.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
                      {label}
                    </m.span>
                  )}
                </m.span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sidebar({ items, home }: { items: NavItem[]; home: string }) {
  const { profile } = useAuth();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col px-5 py-6 lg:flex">
      <Logo to={home} />
      <nav aria-label="Primary" className="mt-10 flex-1">
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'press relative flex h-12 items-center gap-3 rounded-full px-4 text-[14.5px] font-semibold',
                    isActive ? 'text-primary-fg' : 'text-ink-2 hover:bg-card hover:text-ink'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <m.span layoutId="sidebar-key" className="absolute inset-0 rounded-full bg-primary shadow-key" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />
                    )}
                    <Icon className="relative h-[19px] w-[19px]" />
                    <span className="relative">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="surface flex items-center gap-3 p-2 pl-3">
        <Avatar name={profile?.name} src={profile?.avatar_url} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{profile?.name}</div>
          <div className="truncate text-[12px] text-ink-3">{profile?.role === 'admin' ? 'Admin' : 'Student'}</div>
        </div>
        <ThemeButton />
        <SignOutButton />
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

export default function AppShell({ variant }: { variant: 'student' | 'admin' }) {
  const location = useLocation();
  const { profile } = useAuth();
  const admin = variant === 'admin';
  const home = admin ? '/admin' : '/dashboard';

  return (
    <div className="flex min-h-dvh">
      <Sidebar items={admin ? ADMIN_SIDEBAR : [...STUDENT_DOCK.slice(0, 4), { to: '/passport', label: 'Passport', icon: BookOpen }]} home={home} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 bg-canvas/90 pt-safe-t lg:hidden">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
            <Logo to={home} />
            <div className="flex items-center gap-0.5">
              <ThemeButton />
              <SignOutButton />
              <Link to={admin ? '/admin/more' : '/passport'} aria-label="Account" className="press ml-1">
                <Avatar name={profile?.name} src={profile?.avatar_url} size={38} />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1080px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-10 lg:pb-14 lg:pt-12">
          {!admin && <VerifyNudge />}
          {/* Enter-only page transition: no exit delay between tabs. */}
          <m.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </m.div>
        </main>
      </div>
      {/* Pushed detail screens have their own back button + action bar. */}
      {!location.pathname.startsWith('/scholarships/') && <Dock items={admin ? ADMIN_DOCK : STUDENT_DOCK} />}
    </div>
  );
}
