import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

const META = { light: '#f2eee7', dark: '#161513' };

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme]);
}

function stored(): Theme | null {
  try {
    const v = localStorage.getItem('bm-theme');
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(current);

  // Follow the OS setting until the user makes an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (stored()) return;
      const next: Theme = mq.matches ? 'dark' : 'light';
      apply(next);
      setTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem('bm-theme', next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
