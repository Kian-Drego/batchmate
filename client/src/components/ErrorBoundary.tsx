import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunkError = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(this.state.error.message);
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl" aria-hidden>
          ⚡
        </div>
        <h1 className="mt-4 text-xl font-bold">{chunkError ? 'A new version is available' : 'Something broke'}</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          {chunkError ? 'Reload to get the latest BatchMate.' : 'Try reloading. If it keeps happening, let us know.'}
        </p>
        <button
          className="tap mt-6 h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg shadow-glow-sm"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
