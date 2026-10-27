import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { EvidenceLevel } from '@/lib/types';

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'bad' | 'ok'; children: React.ReactNode }) {
  const Icon = kind === 'bad' ? AlertCircle : kind === 'warn' ? TriangleAlert : kind === 'ok' ? CheckCircle2 : Info;
  return (
    <div role={kind === 'bad' ? 'alert' : 'status'} className={`alert alert-${kind}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-2 rounded-full border border-line bg-subtle p-2 text-muted">
        <Icon size={18} aria-hidden="true" />
      </div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children && <p className="mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const LEVEL: Record<EvidenceLevel, { label: string; cls: string; help: string }> = {
  verified: { label: 'Verified', cls: 'badge-ok', help: 'Confirmed at a recorded time.' },
  observed: { label: 'Observed', cls: 'badge-info', help: 'Measured automatically by an audit.' },
  reported: { label: 'Reported by source', cls: '', help: 'Stated by the data source; not independently confirmed.' },
  inferred: { label: 'Inference', cls: 'badge-warn', help: 'A conclusion drawn from other evidence.' },
  unknown: { label: 'Unknown', cls: '', help: 'Not available. Not guessed.' },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const l = LEVEL[level];
  return (
    <span className={`badge ${l.cls}`} title={l.help}>
      {l.label}
    </span>
  );
}

export function Meter({ label, used, quota }: { label: string; used: number; quota: number }) {
  const pct = quota === 0 ? 100 : Math.min(100, Math.round((used / quota) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {used} / {quota}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-subtle" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={quota}>
        <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return 'Not available';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString('en-KE', withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }
    : { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' });
}
