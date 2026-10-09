import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[96px] font-semibold leading-none text-accent">404</div>
      <h1 className="mt-4 text-[26px] font-semibold">This page took a gap year</h1>
      <p className="mt-2 text-sm text-ink-2">The link might be broken or the page moved.</p>
      <Link
        to="/"
        className="press mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-fg shadow-key shadow-soft"
      >
        Take me home
      </Link>
    </div>
  );
}
