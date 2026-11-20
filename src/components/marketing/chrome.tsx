import Link from 'next/link';
import { Logo } from '@/components/brand';
import { SiteMenu } from '@/components/marketing/site-menu';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="container-page flex h-14 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <SiteMenu />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/pricing" className="btn btn-ghost hidden sm:inline-flex">
            Pricing
          </Link>
          <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/#features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/pricing#faq', label: 'FAQ' },
    { href: '/help', label: 'Docs' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/contact', label: 'Contact' },
  ];
  return (
    <footer className="border-t border-line bg-bg">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5">
        <Logo compact />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <ThemeToggle variant="segmented" />
          <p className="max-w-[16rem] text-right text-xs text-faint">
            &copy; {new Date().getFullYear()} LOOK AFRICA GROUP LIMITED. Map data &copy; OpenStreetMap contributors.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="clay min-h-screen text-ink">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
