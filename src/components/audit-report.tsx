import { EvidenceBadge, fmtDate } from '@/components/ui';
import type { Finding } from '@/lib/types';

const RESULT: Record<Finding['result'], { label: string; cls: string }> = {
  pass: { label: 'Pass', cls: 'badge-ok' },
  warn: { label: 'Warning', cls: 'badge-warn' },
  fail: { label: 'Fail', cls: 'badge-bad' },
  info: { label: 'Info', cls: '' },
};
const BASIS: Record<Finding['basis'], string> = { measured: 'Measured', inferred: 'Inferred', unavailable: 'Unavailable' };
const ORDER = { fail: 0, warn: 1, info: 2, pass: 3 } as const;

export function AuditReport({ findings, checkedAt }: { findings: Finding[]; checkedAt: string | null }) {
  const sorted = [...findings].sort((a, b) => ORDER[a.result] - ORDER[b.result]);
  return (
    <div>
      <p className="mb-3 text-xs text-muted">Audit time: {fmtDate(checkedAt, true)}. Checks cover the home page and a sample of internal links, not the whole site.</p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {sorted.map((f) => (
          <li key={f.id} className="p-4">
            <details open={f.result === 'fail'}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 marker:hidden">
                <span className={`badge ${RESULT[f.result].cls}`}>{RESULT[f.result].label}</span>
                <span className="text-sm font-medium">{f.check}</span>
                {f.severity !== 'info' && <span className="badge">Severity: {f.severity}</span>}
                <span className={`badge ${f.basis === 'unavailable' ? '' : 'badge-info'}`}>{BASIS[f.basis]}</span>
              </summary>
              <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
                <dt className="text-muted">What was checked</dt><dd>{f.check}</dd>
                <dt className="text-muted">Result and evidence</dt><dd>{f.evidence}</dd>
                <dt className="text-muted">Why it matters</dt><dd>{f.whyItMatters}</dd>
                <dt className="text-muted">Recommendation</dt><dd>{f.recommendation}</dd>
                <dt className="text-muted">Checked</dt><dd>{fmtDate(f.checkedAt, true)}</dd>
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvidenceLegend() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
      Labels: <EvidenceBadge level="observed" /> measured automatically <EvidenceBadge level="reported" /> from the source <EvidenceBadge level="inferred" /> a conclusion <EvidenceBadge level="unknown" /> not available
    </p>
  );
}
