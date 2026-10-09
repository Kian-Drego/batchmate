import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={theme}
      offset={16}
      toastOptions={{ className: '!bg-surface-2 !text-fg !border-line !rounded-2xl !font-sans' }}
    />
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

// Motion features (incl. drag + layout) load in a separate chunk after first paint.
const loadMotion = () => import('./lib/motion-features').then((m) => m.default);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <LazyMotion features={loadMotion} strict>
            <MotionConfig reducedMotion="user">
              <BrowserRouter>
                <AuthProvider>
                  <App />
                  <ThemedToaster />
                </AuthProvider>
              </BrowserRouter>
            </MotionConfig>
          </LazyMotion>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
