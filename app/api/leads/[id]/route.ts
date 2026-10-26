import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { updateLead } from '@/lib/leads/service';

const schema = z
  .object({
    notes: z.string().max(5000).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(15).optional(),
    status: z.string().min(1).max(30).optional(),
    followUpAt: z.string().datetime().nullable().optional(),
    archived: z.boolean().optional(),
    outcome: z
      .object({ result: z.enum(['won', 'lost', 'not_a_fit']), reason: z.string().max(300).optional(), valueKes: z.number().min(0).max(1e9).optional() })
      .nullable()
      .optional(),
  })
  .strict();

export const PATCH = route<{ id: string }>({ auth: 'user' }, async ({ req, user, params }) => {
  const patch = await parseJson(req, schema);
  await updateLead(user, params.id, patch);
  return { ok: true };
});
