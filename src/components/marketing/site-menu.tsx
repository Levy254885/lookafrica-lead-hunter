'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Briefcase, Building2, CircleHelp, Gauge, KanbanSquare, LayoutGrid, Mail, Search, Tag, X } from 'lucide-react';

type Entry = { href: string; label: string; text: string; icon: typeof Search };

const groups: { title: string; items: Entry[] }[] = [
  {
    title: 'Product',
    items: [
      { href: '/#features', label: 'Discover businesses', text: 'Search by industry and place in Kenya.', icon: Search },
      { href: '/#features', label: 'Website intelligence', text: 'Audits with evidence for every finding.', icon: Gauge },
      { href: '/#features', label: 'Opportunities', text: 'Public projects matched to your services.', icon: Briefcase },
      { href: '/#features', label: 'Lead management', text: 'Pipeline, notes, follow-ups and drafts.', icon: KanbanSquare },
    ],
  },
  {
    title: 'Resources',
    items: [
      { href: '/#features', label: 'How it works', text: 'From search to first outreach.', icon: CircleHelp },
      { href: '/pricing', label: 'Pricing', text: 'Free, Starter, Pro and Agency.', icon: Tag },
      { href: '/help', label: 'Documentation', text: 'Guides and data source notes.', icon: BookOpen },
      { href: '/contact', label: 'About and contact', text: 'LOOK AFRICA GROUP LIMITED.', icon: Building2 },
    ],
  },
];

function Panel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-faint">{g.title}</p>
          <ul>
            {g.items.map((i) => (
              <li key={i.label}>
                <Link href={i.href} onClick={onNavigate} className="flex items-start gap-3 rounded-lg p-2 hover:bg-subtle">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-fg">
                    <i.icon size={16} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{i.label}</span>
                    <span className="block text-xs text-muted">{i.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Menu button with a grouped panel: a floating panel on desktop, a full-screen sheet on phones. */
export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const click = (e: MouseEvent) => {
      if (window.innerWidth >= 640 && box.current && !box.current.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('mousedown', click);
    const small = window.innerWidth < 640;
    const prev = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('mousedown', click);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="relative">
      <button ref={btn} type="button" className="btn" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((v) => !v)}>
        <LayoutGrid size={16} aria-hidden="true" />
        Menu
      </button>
      {open && (
        <div
          id="site-menu"
          ref={box}
          role="dialog"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg p-4 sm:absolute sm:inset-auto sm:left-0 sm:top-12 sm:w-[34rem] sm:rounded-xl sm:border sm:border-line sm:p-4 sm:shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <span className="text-lg font-bold">Menu</span>
            <button type="button" className="btn btn-icon btn-ghost" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <Panel onNavigate={() => setOpen(false)} />
          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
            <Link href="/login" className="btn h-11 flex-1 sm:h-9" onClick={() => setOpen(false)}>Sign in</Link>
            <Link href="/signup" className="btn btn-primary h-11 flex-1 sm:h-9" onClick={() => setOpen(false)}>
              <Mail size={15} aria-hidden="true" /> Get started
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
