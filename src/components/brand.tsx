import Link from 'next/link';

/** Original mark: a rounded "L" with a lighter dot, drawn in the accent colour. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4 6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v14h10a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="var(--accent)" />
      <circle cx="23.5" cy="9.5" r="4.5" fill="var(--accent)" opacity="0.55" />
    </svg>
  );
}

export function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="LOOK AFRICA Lead Hunter">
      <LogoMark size={compact ? 26 : 34} />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-tight">LOOK AFRICA</span>
        <span className="text-xs text-muted">Lead Hunter</span>
      </span>
    </Link>
  );
}
