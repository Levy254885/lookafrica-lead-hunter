'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'la_theme';
type Theme = 'light' | 'dark';

function current(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function apply(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
}

/**
 * Switches between light and dark for the whole site. The choice is saved in localStorage
 * (wrapped in try/catch because storage can be blocked) and re-applied before paint by the
 * inline script in the root layout. Changes in another tab are picked up too.
 *
 * variant "icon": one button that flips the theme. variant "segmented": a sun and moon pair.
 */
export function ThemeToggle({ variant = 'icon', className = '' }: { variant?: 'icon' | 'segmented'; className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(current());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        apply(e.newValue);
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function set(next: Theme) {
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: the theme still changes for this visit.
    }
  }

  if (variant === 'segmented') {
    const seg = (t: Theme, Icon: typeof Sun, label: string) => (
      <button
        type="button"
        onClick={() => set(t)}
        aria-pressed={theme === t}
        aria-label={label}
        title={label}
        className={`flex h-7 w-8 items-center justify-center rounded-md ${theme === t ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}`}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    );
    return (
      <div role="group" aria-label="Theme" className={`inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 ${className}`}>
        {seg('light', Sun, 'Light theme')}
        {seg('dark', Moon, 'Dark theme')}
      </div>
    );
  }

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" onClick={() => set(current() === 'dark' ? 'light' : 'dark')} className={`btn btn-ghost btn-icon ${className}`} aria-label={theme ? label : 'Toggle theme'} title={theme ? label : 'Toggle theme'}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
