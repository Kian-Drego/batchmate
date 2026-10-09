import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Compass className="h-8 w-8 text-ink-faint" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-ink-soft">The page you requested does not exist.</p>
      <Link
        to="/dashboard"
        className="mt-5 rounded-card border border-line bg-inverse px-4 py-2.5 text-sm font-semibold text-inverse-fg"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
