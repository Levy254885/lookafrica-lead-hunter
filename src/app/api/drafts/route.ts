import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { SERVICES } from '@/lib/types';
import { createDraft } from '@/lib/proposals/service';

export const maxDuration = 60;

const schema = z.object({
  leadId: z.string().min(8).max(64),
  service: z.enum(SERVICES.map((s) => s.id) as [string, ...string[]]),
  tone: z.enum(['professional', 'friendly', 'brief']).default('professional'),
  channel: z.enum(['email', 'message']).default('email'),
});

export const POST = route({ auth: 'verified', rate: { name: 'draft', limit: 30, windowSec: 600 } }, async ({ req, user }) => {
  return { ...(await createDraft(user, await parseJson(req, schema))) };
});
