'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bookmark, BookOpen, Briefcase, CreditCard, Crown, Gauge, KanbanSquare, LayoutDashboard, Mail, Menu, Search, Settings, Shield, X } from 'lucide-react';
import { Logo } from '@/components/brand';

type Item = { href: string; label: string; icon: typeof Search; exact?: boolean };

const main: Item[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/leads', label: 'Find Leads', icon: Search },
  { href: '/app/audits', label: 'Website Audits', icon: Gauge },
  { href: '/app/projects', label: 'Opportunities', icon: Briefcase },
  { href: '/app/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/app/outreach', label: 'Outreach', icon: Mail },
  { href: '/app/saved-searches', label: 'Saved Searches', icon: Bookmark },
];

const account: Item[] = [
  { href: '/app/billing', label: 'Usage and Billing', icon: CreditCard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
  { href: '/app/help', label: 'Help', icon: BookOpen },
];

export interface PlanSummary {
  name: string;
  leadsUsed: number;
  leadsQuota: number;
}

export function AppNav({ isAdmin, plan }: { isAdmin: boolean; plan: PlanSummary }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const link = (i: Item) => {
    const active = i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          onClick={() => setOpen(false)}
          aria-current={active ? 'page' : undefined}
          className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm ${active ? 'bg-accent-soft font-medium text-accent-fg' : 'text-muted hover:bg-subtle hover:text-ink'}`}
        >
          <i.icon size={18} aria-hidden="true" />
          {i.label}
        </Link>
      </li>
    );
  };

  const pct = plan.leadsQuota <= 0 ? 100 : Math.min(100, Math.round((plan.leadsUsed / plan.leadsQuota) * 100));
  const remaining = Math.max(0, plan.leadsQuota - plan.leadsUsed);

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-line bg-sidebar px-4 lg:hidden">
        <Logo href="/app" compact />
        <button className="btn btn-ghost btn-icon" aria-expanded={open} aria-controls="app-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <aside id="app-nav" className={`${open ? 'flex' : 'hidden'} flex-col border-r border-line bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64`}>
        <div className="hidden h-16 items-center px-5 lg:flex">
          <Logo href="/app" />
        </div>
        <nav aria-label="Application" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">{main.map(link)}</ul>
          <hr className="mx-2 my-3 border-line" />
          <ul className="space-y-1">
            {account.map(link)}
            {isAdmin && link({ href: '/admin', label: 'Admin', icon: Shield })}
          </ul>
        </nav>
        <div className="p-3">
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Crown size={15} className="text-accent-fg" aria-hidden="true" /> {plan.name} plan
            </p>
            <p className="mt-1.5 text-xs text-muted">{plan.leadsQuota.toLocaleString('en-KE')} leads / month</p>
            <div className="mt-2 h-1.5 rounded-full bg-subtle" role="progressbar" aria-label="Lead records used this month" aria-valuenow={plan.leadsUsed} aria-valuemin={0} aria-valuemax={plan.leadsQuota}>
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-faint">{remaining.toLocaleString('en-KE')} remaining</p>
            <Link href="/app/billing" onClick={() => setOpen(false)} className="btn btn-sm mt-3 w-full">
              Manage plan
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
