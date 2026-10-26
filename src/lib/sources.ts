import { osmAdapter } from '@/lib/leads/adapters/osm';
import type { LeadSourceAdapter, SourceStatus } from '@/lib/leads/adapters/types';
import { remotiveStatus } from '@/lib/projects/remotive';

/** Registry of data sources. Add a new lead source by implementing LeadSourceAdapter and listing it here. */
const leadAdapters: Record<string, LeadSourceAdapter> = {
  [osmAdapter.id]: osmAdapter,
};

export function getLeadAdapter(id: string): LeadSourceAdapter | null {
  return leadAdapters[id] ?? null;
}

export function pageSpeedStatus(): SourceStatus {
  const hasKey = Boolean(process.env.PAGESPEED_API_KEY);
  return {
    id: 'pagespeed',
    label: 'Google PageSpeed Insights API',
    kind: 'audit',
    available: true,
    reason: hasKey
      ? undefined
      : 'Works without a key at a very low shared quota. Set PAGESPEED_API_KEY to raise it.',
    endpoint: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    auth: 'Optional API key (Google Cloud console).',
    quota: 'Defined by Google; see the API console for your key. 429 responses are reported to the user as unavailable data.',
    cost: 'Free within Google quotas.',
    attribution: 'Scores are labelled as reported by Google PageSpeed Insights.',
    reuse: 'Results are stored with the audit that requested them.',
    refresh: 'On demand per audit. Completed audits of the same URL are reused for 24 hours.',
    docsUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
  };
}

export function allSourceStatuses(): SourceStatus[] {
  return [...Object.values(leadAdapters).map((a) => a.status()), remotiveStatus(), pageSpeedStatus()];
}
