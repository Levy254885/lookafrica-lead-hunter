import { issueWeight } from '@/lib/audit/findings';
import type { Finding, LeadScore, ScoreFactor } from '@/lib/types';

/**
 * Transparent lead scoring. The result is a prioritization estimate that orders the user's own list.
 * It is not a probability of conversion and it uses no assumptions about revenue, financial health
 * or willingness to buy. Every factor carries its own explanation and evidence level.
 */

export interface ScoreInput {
  /** Findings from the latest completed audit, or null when no audit has been run. */
  findings: Finding[] | null;
  /** Services implied by measured audit findings. */
  opportunityServices: string[];
  /** Services the user told us they offer. */
  userServices: string[];
  contact: { email: boolean; phone: boolean; website: boolean };
  dataDate: { lastVerifiedAt: string | null; retrievedAt: string };
  /** An explicit buying signal recorded for this lead, such as a public request for proposals. */
  buyingSignal: { kind: string; url?: string } | null;
  nowMs: number;
}

export const SCORE_NOTE =
  'A prioritization estimate that helps you order your list. It is not a probability that the business will buy.';

const DAY_MS = 86_400_000;

export function computeScore(input: ScoreInput): LeadScore {
  const factors: ScoreFactor[] = [];

  // 1. Evidence of a relevant website issue (max 40).
  if (input.findings === null) {
    factors.push({
      key: 'websiteIssue',
      label: 'Website issues found',
      points: 0,
      max: 40,
      explanation: 'No audit has been run yet, so website issues are unknown. A missing audit is not a negative signal.',
      level: 'unknown',
    });
  } else {
    const weight = issueWeight(input.findings);
    const points = Math.min(40, weight);
    factors.push({
      key: 'websiteIssue',
      label: 'Website issues found',
      points,
      max: 40,
      explanation:
        weight === 0
          ? 'The latest audit measured no warnings or failures.'
          : `Measured audit findings add up to a severity weight of ${weight} (capped at 40).`,
      level: 'observed',
    });
  }

  // 2. Match with the services the user offers (max 20).
  const matches = input.opportunityServices.filter((s) => input.userServices.includes(s));
  if (input.userServices.length === 0) {
    factors.push({
      key: 'serviceMatch',
      label: 'Match with your services',
      points: 0,
      max: 20,
      explanation: 'You have not chosen the services you offer. Add them in Settings to enable this factor.',
      level: 'unknown',
    });
  } else if (input.opportunityServices.length === 0) {
    factors.push({
      key: 'serviceMatch',
      label: 'Match with your services',
      points: 0,
      max: 20,
      explanation: 'There are no audit-based opportunities to compare with your services yet.',
      level: 'unknown',
    });
  } else {
    const points = Math.min(20, matches.length * 10);
    factors.push({
      key: 'serviceMatch',
      label: 'Match with your services',
      points,
      max: 20,
      explanation:
        matches.length === 0
          ? 'Measured opportunities do not overlap with the services you offer.'
          : `${matches.length} measured opportunit${matches.length === 1 ? 'y overlaps' : 'ies overlap'} with services you offer.`,
      level: 'observed',
    });
  }

  // 3. Legitimate public contact channel (max 15).
  const contactPoints = Math.min(15, (input.contact.email ? 8 : 0) + (input.contact.phone ? 5 : 0) + (input.contact.website ? 2 : 0));
  const channels = [input.contact.email && 'email', input.contact.phone && 'phone', input.contact.website && 'website'].filter(Boolean);
  factors.push({
    key: 'contactChannel',
    label: 'Public contact channel',
    points: contactPoints,
    max: 15,
    explanation:
      channels.length === 0
        ? 'The source lists no public contact channel for this business.'
        : `The source lists a public ${channels.join(', ')}. These are reported by the source and were not independently confirmed.`,
    level: channels.length === 0 ? 'unknown' : 'reported',
  });

  // 4. Freshness of the source data (max 10).
  const basis = input.dataDate.lastVerifiedAt ?? input.dataDate.retrievedAt;
  const ageDays = Math.max(0, (input.nowMs - Date.parse(basis)) / DAY_MS);
  let fresh = ageDays <= 30 ? 10 : ageDays <= 90 ? 6 : ageDays <= 365 ? 3 : 0;
  if (!input.dataDate.lastVerifiedAt) fresh = Math.min(fresh, 5);
  factors.push({
    key: 'freshness',
    label: 'Freshness of source data',
    points: fresh,
    max: 10,
    explanation: input.dataDate.lastVerifiedAt
      ? `The source says this record was last checked ${Math.round(ageDays)} days ago.`
      : `The source does not state when the record was last checked, so this uses the retrieval date (${Math.round(ageDays)} days ago) and is capped at 5.`,
    level: input.dataDate.lastVerifiedAt ? 'reported' : 'inferred',
  });

  // 5. Explicit buying signal (max 15). Only when one was recorded.
  factors.push({
    key: 'buyingSignal',
    label: 'Explicit buying signal',
    points: input.buyingSignal ? 15 : 0,
    max: 15,
    explanation: input.buyingSignal
      ? `An explicit signal is recorded: ${input.buyingSignal.kind}.`
      : 'No explicit buying signal is recorded. We do not guess intent.',
    level: input.buyingSignal ? 'verified' : 'unknown',
  });

  const total = factors.reduce((s, f) => s + f.points, 0);
  return {
    total,
    max: factors.reduce((s, f) => s + f.max, 0),
    factors,
    computedAt: new Date(input.nowMs).toISOString(),
    note: SCORE_NOTE,
  };
}
