/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark is the default; `.light` on <html> swaps the CSS tokens (src/index.css).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2'), 3: token('surface-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        fg: { DEFAULT: token('fg'), muted: token('fg-muted'), faint: token('fg-faint') },
        accent: { DEFAULT: token('accent'), fg: token('accent-fg'), soft: token('accent-soft') },
        mint: { DEFAULT: token('mint'), soft: token('mint-soft') },
        hot: { DEFAULT: token('hot'), soft: token('hot-soft') },
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        // Static glows (box-shadow, not filter: blur) — cheap to paint once.
        glow: '0 0 0 1px rgb(var(--accent) / 0.45), 0 10px 30px -10px rgb(var(--accent) / 0.65)',
        'glow-sm': '0 0 0 1px rgb(var(--accent) / 0.35), 0 4px 16px -6px rgb(var(--accent) / 0.55)',
        'glow-mint': '0 0 0 1px rgb(var(--mint) / 0.4), 0 8px 24px -10px rgb(var(--mint) / 0.6)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -16px rgb(0 0 0 / 0.6)',
      },
      spacing: { 'safe-b': 'env(safe-area-inset-bottom)', 'safe-t': 'env(safe-area-inset-top)' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pop-in': { '0%': { transform: 'scale(0.6)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        'pop-in': 'pop-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};
