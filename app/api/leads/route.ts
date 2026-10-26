import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { saveLead } from '@/lib/leads/service';

const schema = z.object({
  source: z.string().min(1).max(30),
  sourceId: z.string().regex(/^[A-Za-z0-9/_-]{1,60}$/),
});

/** Saves a lead from a record the server itself fetched earlier. Browser-supplied business data is never trusted. */
export const POST = route({ auth: 'verified', rate: { name: 'save-lead', limit: 60, windowSec: 300 } }, async ({ req, user }) => {
  const body = await parseJson(req, schema);
  return { ...(await saveLead(user, body)) };
});
