'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/pricing#faq', label: 'FAQ' },
  { href: '/help', label: 'Docs' },
];

/** Header links. The current page gets an accent-coloured underline. */
export function NavLinks({ className = '' }: { className?: string }) {
  const path = usePathname();
  return (
    <>
      {nav.map((n) => {
        const active = n.href === path || (n.href === '/help' && path.startsWith('/help'));
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`relative whitespace-nowrap py-4 text-sm ${active ? 'font-medium text-accent-fg' : 'text-muted hover:text-ink'} ${className}`}
          >
            {n.label}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        );
      })}
    </>
  );
}
