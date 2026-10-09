/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Theme is driven by the `.dark` class on <html> (see src/context/ThemeContext.tsx).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Editorial, high-contrast palette. A single lavender accent carries
        // interactive affordances over lavender-tinted paper; no decorative
        // gradients. Every token resolves to an RGB channel list defined in
        // src/index.css, so light and dark are the same utilities with
        // different variables.
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          raised: 'rgb(var(--paper-raised) / <alpha-value>)',
          sunken: 'rgb(var(--paper-sunken) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          faint: 'rgb(var(--line-faint) / <alpha-value>)',
        },
        lavender: {
          DEFAULT: 'rgb(var(--lavender) / <alpha-value>)',
          ink: 'rgb(var(--lavender-ink) / <alpha-value>)',
          soft: 'rgb(var(--lavender-soft) / <alpha-value>)',
        },
        eligible: {
          DEFAULT: 'rgb(var(--eligible) / <alpha-value>)',
          soft: 'rgb(var(--eligible-soft) / <alpha-value>)',
        },
        caution: {
          DEFAULT: 'rgb(var(--caution) / <alpha-value>)',
          soft: 'rgb(var(--caution-soft) / <alpha-value>)',
        },
        stop: {
          DEFAULT: 'rgb(var(--stop) / <alpha-value>)',
          soft: 'rgb(var(--stop-soft) / <alpha-value>)',
        },
        // Muted "solid ink" surface used by primary buttons, active nav pills
        // and wordmark badges. Kept distinct from `ink` (text) so dark mode can
        // render a soft lavender-slate block instead of a glaring near-white one.
        inverse: {
          DEFAULT: 'rgb(var(--inverse) / <alpha-value>)',
          fg: 'rgb(var(--inverse-fg) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        // Restrained, non-uniform radii to avoid the generic bento look.
        card: '4px',
        pill: '999px',
      },
      boxShadow: {
        hard: '4px 4px 0 0 rgb(var(--line))',
        'hard-sm': '2px 2px 0 0 rgb(var(--line))',
      },
    },
  },
  plugins: [],
};
