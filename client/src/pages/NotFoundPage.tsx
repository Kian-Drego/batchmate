import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="gradient-text font-mono text-7xl font-extrabold">404</div>
      <h1 className="mt-4 text-xl font-bold">This page took a gap year</h1>
      <p className="mt-2 text-sm text-fg-muted">The link might be broken or the page moved.</p>
      <Link
        to="/"
        className="tap mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg shadow-glow-sm"
      >
        Take me home
      </Link>
    </div>
  );
}
