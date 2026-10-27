'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, CreditCard, Gauge, KanbanSquare, LayoutDashboard, LogOut, Mail, Menu, Search, Settings, Shield, Telescope, X, Bookmark } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { getFirebaseAuth } from '@/lib/firebase/client';

const items = [
  { href: '/app', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/app/leads', label: 'Find Leads', icon: Search },
  { href: '/app/audits', label: 'Website Audits', icon: Gauge },
  { href: '/app/projects', label: 'Project Opportunities', icon: Telescope },
  { href: '/app/pipeline', label: 'My Pipeline', icon: KanbanSquare },
  { href: '/app/outreach', label: 'Outreach', icon: Mail },
  { href: '/app/saved-searches', label: 'Saved Searches', icon: Bookmark },
  { href: '/app/billing', label: 'Usage and Billing', icon: CreditCard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
  { href: '/app/help', label: 'Help', icon: BookOpen },
];

export function AppNav({ isAdmin, email }: { isAdmin: boolean; email: string | null }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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

  const list = (
    <ul className="space-y-0.5">
      {[...items, ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield, exact: false }] : [])].map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-8 items-center gap-2.5 rounded px-2.5 text-sm ${active ? 'bg-accent-soft font-medium text-accent-fg' : 'text-muted hover:bg-subtle hover:text-ink'}`}
            >
              <i.icon size={16} aria-hidden="true" />
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Logo href="/app" />
        <div className="flex items-center gap-1">
        <ThemeToggle />
        <button className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls="app-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
        </div>
      </div>
      <aside id="app-nav" className={`${open ? 'block' : 'hidden'} border-r border-line bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-56`}>
        <div className="hidden h-12 items-center border-b border-line px-4 lg:flex">
          <Logo href="/app" />
        </div>
        <nav aria-label="Application" className="p-3">{list}</nav>
        <div className="border-t border-line p-3 lg:absolute lg:inset-x-0 lg:bottom-0 lg:bg-surface">
          <p className="truncate px-2.5 pb-2 text-xs text-faint" title={email ?? undefined}>{email}</p>
          <div className="flex items-center gap-1">
            <button onClick={logout} className="flex h-8 flex-1 items-center gap-2.5 rounded px-2.5 text-sm text-muted hover:bg-subtle hover:text-ink">
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
