import type { Config } from 'tailwindcss';

/**
 * Design tokens are CSS variables in src/app/globals.css so the light and dark themes share one set
 * of semantic names. Tailwind only maps names to them.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
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
      'accent-fg': 'var(--accent-fg)',
      'on-accent': 'var(--on-accent)',
      sidebar: 'var(--sidebar)',
      night: 'var(--night)',
      warn: 'var(--warn)',
      'warn-soft': 'var(--warn-soft)',
      danger: 'var(--danger)',
      'danger-soft': 'var(--danger-soft)',
      info: 'var(--info)',
      'info-soft': 'var(--info-soft)',
    },
    fontFamily: {
      // Same stack ChatGPT's interface uses, minus its licensed Sohne face. Resolves to the platform UI font.
      sans: [
        'var(--font-inter)',
        'ui-sans-serif',
        '-apple-system',
        'system-ui',
        'Segoe UI',
        'Helvetica',
        'Arial',
        'sans-serif',
      ],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.8125rem', { lineHeight: '1.2rem' }],
      base: ['0.875rem', { lineHeight: '1.375rem' }],
      lg: ['1rem', { lineHeight: '1.5rem' }],
      xl: ['1.125rem', { lineHeight: '1.625rem' }],
      '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '3xl': ['1.5rem', { lineHeight: '2rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3.5rem', { lineHeight: '1.05' }],
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
      maxWidth: { page: '72rem', prose: '40rem' },
      ringColor: { DEFAULT: 'var(--accent)' },
    },
  },
  plugins: [],
};

export default config;
