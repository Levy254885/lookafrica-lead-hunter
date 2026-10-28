import Link from 'next/link';
import { Logo } from '@/components/brand';
import { NavLinks } from '@/components/marketing/nav-links';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </div>
      <nav aria-label="Main mobile" className="container-page flex gap-5 overflow-x-auto border-t border-line md:hidden">
        <NavLinks className="py-2.5" />
      </nav>
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
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
