import { z } from 'zod';
import type { FeatureKey, PlanId, UsageKind } from '@/lib/types';

/**
 * Plan configuration.
 *
 * The four plans below are the initial pricing configuration. At runtime the server reads
 * `systemConfig/plans` from Firestore and falls back to these defaults, so quotas and prices can
 * be changed from the admin console without a code change.
 *
 * Values marked "engineering default" were not specified in the product brief. They exist so the
 * system has a safe enforced value and must be reviewed by the business before launch.
 */
export interface PlanConfig {
  id: PlanId;
  name: string;
  priceKes: number;
  /** Order for upgrade/downgrade comparison. */
  rank: number;
  quotas: Record<UsageKind, number>;
  features: Record<FeatureKey, boolean>;
  /** Maximum automated discovery runs per day (0 disables). Engineering default. */
  automationRunsPerDay: number;
  /** Bullet points shown on the pricing page. Quantities here are copied from the brief. */
  highlights: string[];
}

export const PLAN_IDS: PlanId[] = ['free', 'starter', 'pro', 'agency'];

const none: Record<FeatureKey, boolean> = {
  savedSearches: false,
  csvExport: false,
  advancedFilters: false,
  projectAlerts: false,
  autoDiscovery: false,
  teamWorkspace: false,
  sharedPipeline: false,
  outreachSending: false,
};

export const DEFAULT_PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    priceKes: 0,
    rank: 0,
    quotas: { leads: 10, audits: 3, drafts: 5 },
    features: { ...none },
    automationRunsPerDay: 0,
    highlights: [
      '10 lead records per month',
      '3 website audits per month',
      '5 AI-generated drafts per month',
      'Basic pipeline',
      'No automated outreach',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceKes: 500,
    rank: 1,
    quotas: { leads: 100, audits: 30, drafts: 50 },
    features: { ...none, savedSearches: true, csvExport: true },
    automationRunsPerDay: 0,
    highlights: [
      '100 lead records per month',
      '30 website audits per month',
      '50 AI-generated drafts per month',
      'Saved searches',
      'CSV export',
      'Personal pipeline',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceKes: 1500,
    rank: 2,
    quotas: { leads: 500, audits: 150, drafts: 200 },
    features: {
      ...none,
      savedSearches: true,
      csvExport: true,
      advancedFilters: true,
      projectAlerts: true,
      autoDiscovery: true,
    },
    automationRunsPerDay: 1,
    highlights: [
      '500 lead records per month',
      '150 website audits per month',
      '200 AI-generated drafts per month',
      'Advanced filters',
      'Project alerts',
      'Automated discovery and scoring',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    priceKes: 4000,
    rank: 3,
    // Engineering default: the brief says "higher AI allowance, configurable server-side".
    quotas: { leads: 2000, audits: 500, drafts: 1000 },
    features: {
      ...none,
      savedSearches: true,
      csvExport: true,
      advancedFilters: true,
      projectAlerts: true,
      autoDiscovery: true,
      teamWorkspace: true,
      sharedPipeline: true,
    },
    // Engineering default: the brief says "higher permitted automation limits".
    automationRunsPerDay: 4,
    highlights: [
      '2,000 lead records per month',
      '500 website audits per month',
      'Higher AI draft allowance, set server-side',
      'Team workspace',
      'Shared pipeline',
      'Higher permitted automation limits',
    ],
  },
};

const quotaSchema = z.object({
  leads: z.number().int().min(0).max(1_000_000),
  audits: z.number().int().min(0).max(1_000_000),
  drafts: z.number().int().min(0).max(1_000_000),
});

const featureSchema = z.object({
  savedSearches: z.boolean(),
  csvExport: z.boolean(),
  advancedFilters: z.boolean(),
  projectAlerts: z.boolean(),
  autoDiscovery: z.boolean(),
  teamWorkspace: z.boolean(),
  sharedPipeline: z.boolean(),
  outreachSending: z.boolean(),
});

export const planConfigSchema = z.object({
  id: z.enum(['free', 'starter', 'pro', 'agency']),
  name: z.string().min(1).max(40),
  priceKes: z.number().int().min(0).max(10_000_000),
  rank: z.number().int().min(0).max(10),
  quotas: quotaSchema,
  features: featureSchema,
  automationRunsPerDay: z.number().int().min(0).max(1000),
  highlights: z.array(z.string().max(120)).max(12),
});

export const plansDocSchema = z.object({
  plans: z.object({
    free: planConfigSchema,
    starter: planConfigSchema,
    pro: planConfigSchema,
    agency: planConfigSchema,
  }),
  /** Days of paid access retained after a period ends while payment is outstanding. */
  graceDays: z.number().int().min(0).max(30),
  /** Length of one paid period in days. */
  periodDays: z.number().int().min(1).max(366),
});

export interface PlansDoc {
  plans: Record<PlanId, PlanConfig>;
  graceDays: number;
  periodDays: number;
}

export const DEFAULT_PLANS_DOC: PlansDoc = {
  plans: DEFAULT_PLANS,
  graceDays: 3,
  periodDays: 30,
};

/** Validates a candidate plans document; returns the parsed value or null when invalid. */
export function parsePlansDoc(raw: unknown): PlansDoc | null {
  const parsed = plansDocSchema.safeParse(raw);
  if (!parsed.success) return null;
  for (const id of PLAN_IDS) {
    if (parsed.data.plans[id].id !== id) return null;
  }
  return parsed.data as PlansDoc;
}

export function formatKes(amount: number): string {
  if (amount === 0) return 'KES 0';
  return `KES ${amount.toLocaleString('en-KE')}`;
}
