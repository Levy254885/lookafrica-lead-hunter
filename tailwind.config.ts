import type { Config } from 'tailwindcss';

/**
 * Design tokens are defined as CSS variables in src/app/globals.css so that the
 * light and dark themes share one set of semantic names. Tailwind only maps names.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surface: 'var(--surface)',
      subtle: 'var(--surface-subtle)',
      line: 'var(--border)',
      'line-strong': 'var(--border-strong)',
      ink: 'var(--text)',
      muted: 'var(--text-muted)',
      faint: 'var(--text-faint)',
      accent: 'var(--accent)',
      'accent-hover': 'var(--accent-hover)',
      'accent-soft': 'var(--accent-soft)',
      'on-accent': 'var(--on-accent)',
      warn: 'var(--warn)',
      'warn-soft': 'var(--warn-soft)',
      danger: 'var(--danger)',
      'danger-soft': 'var(--danger-soft)',
      info: 'var(--info)',
      'info-soft': 'var(--info-soft)',
    },
    fontFamily: {
      sans: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.8125rem', { lineHeight: '1.25rem' }],
      base: ['0.9375rem', { lineHeight: '1.5rem' }],
      lg: ['1.0625rem', { lineHeight: '1.625rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.5rem', { lineHeight: '2.75rem' }],
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius)',
      md: 'var(--radius)',
      lg: 'var(--radius-lg)',
      full: '9999px',
    },
    extend: {
      maxWidth: { page: '72rem', prose: '42rem' },
      ringColor: { DEFAULT: 'var(--accent)' },
    },
  },
  plugins: [],
};

export default config;
