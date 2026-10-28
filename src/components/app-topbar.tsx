'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Search, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { getFirebaseAuth } from '@/lib/firebase/client';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Top bar: search over your saved leads, theme toggle, account menu. */
export function AppTopbar({ name, email }: { name: string; email: string | null }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === 'Escape') setMenu(false);
    };
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push(t ? `/app/pipeline?q=${encodeURIComponent(t)}` : '/app/pipeline');
  }

  async function logout() {
    await fetch('/api/session', { method: 'DELETE' });
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // The server cookie is already cleared.
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line bg-bg px-4 sm:px-8">
      <form onSubmit={search} role="search" className="relative w-full max-w-xl">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <label htmlFor="global-search" className="sr-only">Search your saved leads</label>
        <input id="global-search" ref={input} className="input h-10 pl-9 pr-16" placeholder="Search your saved leads by name, city or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-subtle px-1.5 py-0.5 text-[11px] text-faint sm:block">Ctrl K</kbd>
      </form>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div ref={box} className="relative border-l border-line pl-3">
          <button type="button" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-subtle" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent" aria-hidden="true">{initials(name)}</span>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:block">{name}</span>
            <ChevronDown size={14} className="text-muted" aria-hidden="true" />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-line bg-surface p-1 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-faint" title={email ?? undefined}>{email}</p>
              <Link role="menuitem" href="/app/settings" onClick={() => setMenu(false)} className="flex h-9 items-center gap-2.5 rounded px-3 text-sm hover:bg-subtle">
                <Settings size={15} aria-hidden="true" /> Settings
              </Link>
              <button role="menuitem" type="button" onClick={logout} className="flex h-9 w-full items-center gap-2.5 rounded px-3 text-sm hover:bg-subtle">
                <LogOut size={15} aria-hidden="true" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
