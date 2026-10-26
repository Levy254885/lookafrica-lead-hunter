import Link from 'next/link';
import { Logo } from '@/components/brand';

const nav = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#data', label: 'Data sources' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/help', label: 'Help' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur-0">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-5 text-sm text-muted md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Start for free
          </Link>
        </div>
      </div>
      <nav aria-label="Main mobile" className="container-page flex gap-4 overflow-x-auto pb-2 text-sm text-muted md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const col = (title: string, links: { href: string; label: string }[]) => (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-muted hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">A client-acquisition workspace for developers and digital agencies. Initially focused on Kenya.</p>
        </div>
        {col('Product', [
          { href: '/#how-it-works', label: 'How it works' },
          { href: '/#data', label: 'Data sources' },
          { href: '/pricing', label: 'Pricing' },
          { href: '/app', label: 'Open the app' },
        ])}
        {col('Resources', [
          { href: '/help', label: 'Help and documentation' },
          { href: '/#faq', label: 'FAQ' },
          { href: '/contact', label: 'Contact' },
        ])}
        {col('Legal', [
          { href: '/privacy', label: 'Privacy policy' },
          { href: '/terms', label: 'Terms of service' },
        ])}
      </div>
      <div className="container-page border-t border-line py-4 text-xs text-faint">
        &copy; {new Date().getFullYear()} LOOK AFRICA GROUP LIMITED. Map data in lead results is &copy; OpenStreetMap contributors.
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
