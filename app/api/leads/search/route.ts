import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { searchLeads } from '@/lib/leads/service';
import { requireFeature } from '@/lib/entitlements';

const schema = z.object({
  country: z.string().length(2),
  city: z.string().min(2).max(60),
  category: z.string().min(2).max(30),
  websiteStatus: z.enum(['any', 'with', 'without']).default('any'),
  limit: z.number().int().min(1).max(100).default(50),
});

export const POST = route({ auth: 'verified', rate: { name: 'search', limit: 20, windowSec: 300 } }, async ({ req, user }) => {
  const params = await parseJson(req, schema);
  // The "without website" filter is part of the advanced filter set.
  if (params.websiteStatus !== 'any') await requireFeature(user, 'advancedFilters');
  return { ...(await searchLeads(user, params)) };
});
