// Shared domain types. No runtime dependencies so these can be imported anywhere.

export type PlanId = 'free' | 'starter' | 'pro' | 'agency';
export type UsageKind = 'leads' | 'audits' | 'drafts';

export type FeatureKey =
  | 'savedSearches'
  | 'csvExport'
  | 'advancedFilters'
  | 'projectAlerts'
  | 'autoDiscovery'
  | 'teamWorkspace'
  | 'sharedPipeline'
  | 'outreachSending';

/**
 * How well a piece of information is established.
 * - verified: confirmed by LOOK AFRICA at a recorded time (for example the site answered with HTTP 200)
 *   or confirmed by the user.
 * - observed: an automatically measured technical finding (audit result, response header, API score).
 * - reported: stated by a third-party source and not independently confirmed here.
 * - inferred: a conclusion drawn from other evidence. Always shown with its basis.
 * - unknown: not available. Never filled with a guess.
 */
export type EvidenceLevel = 'verified' | 'observed' | 'reported' | 'inferred' | 'unknown';

export interface SessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  authTimeSec: number;
}

export interface Provenance {
  source: string;
  sourceLabel: string;
  sourceId: string;
  sourceUrl: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  /** Date the source itself says the record was last checked, if it says so. */
  lastVerifiedAt: string | null;
}

/** A normalized business record as returned by a source adapter, before it is saved as a lead. */
export interface LeadCandidate {
  name: string;
  category: string;
  categoryLabel: string;
  city: string;
  country: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  provenance: Provenance;
}

export interface ScoreFactor {
  key: 'websiteIssue' | 'serviceMatch' | 'contactChannel' | 'freshness' | 'buyingSignal';
  label: string;
  points: number;
  max: number;
  explanation: string;
  level: EvidenceLevel;
}

export interface LeadScore {
  total: number;
  max: number;
  factors: ScoreFactor[];
  computedAt: string;
  note: string;
}

export type FindingBasis = 'measured' | 'inferred' | 'unavailable';
export type FindingResult = 'pass' | 'warn' | 'fail' | 'info';
export type Severity = 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  check: string;
  result: FindingResult;
  severity: Severity;
  evidence: string;
  whyItMatters: string;
  recommendation: string;
  basis: FindingBasis;
  checkedAt: string;
  /** Service categories this finding is relevant to, used for opportunity matching. */
  services: string[];
}

export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineStatus {
  id: string;
  label: string;
}

export const DEFAULT_PIPELINE: PipelineStatus[] = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'proposal_sent', label: 'Proposal sent' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'not_a_fit', label: 'Not a fit' },
];

export const SERVICES: { id: string; label: string }[] = [
  { id: 'web_build', label: 'Website design and build' },
  { id: 'web_redesign', label: 'Mobile-friendly redesign' },
  { id: 'seo', label: 'Technical SEO' },
  { id: 'performance', label: 'Performance optimization' },
  { id: 'accessibility', label: 'Accessibility fixes' },
  { id: 'security', label: 'HTTPS and site security' },
  { id: 'maintenance', label: 'Site maintenance' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'automation', label: 'Automation and AI' },
  { id: 'software', label: 'Custom software' },
];

export const SERVICE_LABEL: Record<string, string> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s.label]),
);

export interface OpportunityIndicator {
  service: string;
  reason: string;
  findingIds: string[];
  level: EvidenceLevel;
}
