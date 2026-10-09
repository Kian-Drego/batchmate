import { Link } from 'react-router-dom';
import { Activity, Library, LineChart, LogOut, Radar, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, PageTitle, Surface, cn, tint, type Tone } from '../../components/ui';

const LINKS: { to: string; label: string; sub: string; icon: LucideIcon; tone: Tone }[] = [
  { to: '/admin/catalogue', label: 'Catalogue', sub: 'Add, edit and hide scholarships', icon: Library, tone: 'peach' },
  { to: '/admin/insights', label: 'Insights', sub: 'Anonymised trends', icon: LineChart, tone: 'sky' },
  { to: '/admin/sources', label: 'Sources', sub: 'Nightly refresh & audit', icon: Radar, tone: 'sage' },
  { to: '/admin/activity', label: 'Activity', sub: 'Every admin action', icon: Activity, tone: 'lilac' },
];

export default function AdminMorePage() {
  const { profile, signOut } = useAuth();
  return (
    <div>
      <PageTitle title="More" />

      <Surface className="mb-4 flex items-center gap-4 p-5">
        <Avatar name={profile?.name || profile?.email} size={52} />
        <div className="min-w-0">
          <div className="truncate font-display text-[20px] font-semibold">{profile?.name || 'Admin'}</div>
          <div className="truncate text-[13.5px] text-ink-3">{profile?.email}</div>
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3">
        {LINKS.map(({ to, label, sub, icon: Icon, tone }) => (
          <Link key={to} to={to} className={cn('press grainy flex min-h-[150px] flex-col rounded-4xl p-5 shadow-soft hover:shadow-lift', tint(tone))}>
            <Icon className="h-6 w-6" />
            <div className="mt-auto font-display text-[20px] font-semibold">{label}</div>
            <div className="text-[12.5px] opacity-75">{sub}</div>
          </Link>
        ))}
      </div>

      <button
        onClick={() => void signOut()}
        className="press mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-[14.5px] font-semibold text-rose-ink shadow-soft"
      >
        <LogOut className="h-[18px] w-[18px]" /> Sign out
      </button>
    </div>
  );
}
