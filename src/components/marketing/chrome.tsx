import Link from 'next/link';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Hash links use plain anchors on purpose: the home page tabs listen for the browser's hashchange
 * event, which client-side Link navigation does not fire.
 */
function NavLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (href.startsWith('/#')) {
    return (
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const nav = [
  { href: '/#overview', label: 'Overview' },
  { href: '/#capabilities', label: 'Capabilities' },
  { href: '/#data', label: 'Data' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/help', label: 'Help' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <div className="container-page flex h-12 items-center justify-between gap-3">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} className="rounded px-2 py-1 text-muted hover:bg-subtle hover:text-ink">
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost btn-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Start for free
          </Link>
        </div>
      </div>
      <nav aria-label="Main mobile" className="container-page flex gap-1 overflow-x-auto pb-1.5 text-sm md:hidden">
        {nav.map((n) => (
          <NavLink key={n.href} href={n.href} className="whitespace-nowrap rounded px-2 py-1 text-muted hover:bg-subtle hover:text-ink">
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/help', label: 'Help' },
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ];
  return (
    <footer className="border-t border-line">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 text-xs text-faint">
        <p>
          &copy; {new Date().getFullYear()} LOOK AFRICA GROUP LIMITED. Map data &copy; OpenStreetMap contributors.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
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
