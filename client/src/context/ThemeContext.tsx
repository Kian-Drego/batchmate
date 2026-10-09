import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

function readTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light', next === 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f6f6fb' : '#09090e');
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
