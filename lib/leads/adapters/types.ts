import type { LeadCandidate } from '@/lib/types';

export interface SearchParams {
  country: string;
  city: string;
  category: string;
  websiteStatus: 'any' | 'with' | 'without';
  limit: number;
}

/** Operational status and documentation of a data source, shown in the UI and the admin console. */
export interface SourceStatus {
  id: string;
  label: string;
  kind: 'leads' | 'projects' | 'audit';
  available: boolean;
  /** Present when unavailable, explaining how to configure the source. */
  reason?: string;
  endpoint: string;
  auth: string;
  quota: string;
  cost: string;
  attribution: string;
  reuse: string;
  refresh: string;
  docsUrl: string;
}

/**
 * A pluggable business-discovery source. Adding a source means implementing this interface and
 * registering it in adapters/index.ts; the rest of the application depends only on this contract.
 */
export interface LeadSourceAdapter {
  id: string;
  status(): SourceStatus;
  search(params: SearchParams): Promise<LeadCandidate[]>;
  fetchById(sourceId: string): Promise<LeadCandidate | null>;
}
