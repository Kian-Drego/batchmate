import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors so a single broken view degrades to a readable message
 * instead of a blank white page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-md rounded-card border border-line bg-paper-raised p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-caution" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold text-ink">Something went wrong</h1>
          <p className="mt-1 text-sm text-ink-soft">
            This section failed to render. Reloading usually clears it — your saved data is
            unaffected.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-card border border-line bg-inverse px-4 py-2.5 text-sm font-semibold text-inverse-fg hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
