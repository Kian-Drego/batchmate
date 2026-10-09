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
        <h1 className="font-display text-[28px] font-semibold">{chunkError ? 'A fresh version is ready' : 'Something slipped'}</h1>
        <p className="mt-2 max-w-sm text-[15px] text-ink-2">
          {chunkError ? 'Reload to get the latest BatchMate.' : 'Reloading usually fixes it. If it keeps happening, let us know.'}
        </p>
        <button
          className="press mt-6 h-12 rounded-full bg-primary px-6 text-[14.5px] font-semibold text-primary-fg shadow-key"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
