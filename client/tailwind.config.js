/** @type {import('tailwindcss').Config} */
const t = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const pastel = (name) => ({ DEFAULT: t(name), ink: t(`${name}-ink`) });

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Light is the base; `.dark` on <html> swaps the CSS tokens (src/index.css).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: t('canvas'),
        card: t('card'),
        sunken: t('sunken'),
        line: t('line'),
        ink: { DEFAULT: t('ink'), 2: t('ink-2'), 3: t('ink-3') },
        primary: { DEFAULT: t('primary'), fg: t('primary-fg') },
        accent: t('accent'),
        peach: pastel('peach'),
        sage: pastel('sage'),
        lilac: pastel('lilac'),
        butter: pastel('butter'),
        sky: pastel('sky'),
        rose: pastel('rose'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Figtree Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { '4xl': '28px', '5xl': '36px' },
      boxShadow: {
        // Tactile: a hairline top highlight + two soft, warm drop shadows.
        soft: 'inset 0 1px 0 rgb(255 255 255 / var(--hl)), 0 1px 2px rgb(var(--shade) / 0.06), 0 8px 24px -12px rgb(var(--shade) / 0.22)',
        lift: 'inset 0 1px 0 rgb(255 255 255 / var(--hl)), 0 2px 4px rgb(var(--shade) / 0.06), 0 18px 40px -16px rgb(var(--shade) / 0.32)',
        press: 'inset 0 1px 2px rgb(var(--shade) / 0.12)',
        key: 'inset 0 1px 0 rgb(255 255 255 / 0.18), 0 1px 0 rgb(0 0 0 / 0.25), 0 6px 14px -6px rgb(var(--shade) / 0.45)',
        well: 'inset 0 1px 3px rgb(var(--shade) / 0.10)',
      },
      spacing: { 'safe-b': 'env(safe-area-inset-bottom)', 'safe-t': 'env(safe-area-inset-top)' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(0.85)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        breathe: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
      },
      animation: {
        rise: 'rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 320ms cubic-bezier(0.34, 1.4, 0.64, 1) both',
        breathe: 'breathe 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
