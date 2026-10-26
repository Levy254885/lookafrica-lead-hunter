import Link from 'next/link';

/** Original wordmark: a simple crosshair mark drawn in SVG plus the product name. */
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="22" height="22" rx="5" fill="var(--accent)" />
        <circle cx="12" cy="12" r="5" stroke="var(--on-accent)" strokeWidth="1.8" />
        <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" stroke="var(--on-accent)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>
        LOOK AFRICA <span className="font-normal text-muted">Lead Hunter</span>
      </span>
    </Link>
  );
}
