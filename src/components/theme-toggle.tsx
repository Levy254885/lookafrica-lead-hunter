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
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
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

  function toggle() {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage unavailable: the theme still changes for this visit.
    }
  }

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" onClick={toggle} className={`btn btn-ghost btn-icon ${className}`} aria-label={theme ? label : 'Toggle theme'} title={theme ? label : 'Toggle theme'}>
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
