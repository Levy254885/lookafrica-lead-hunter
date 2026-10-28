import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { updateDraft } from '@/lib/proposals/service';

const schema = z
  .object({
    subject: z.string().min(1).max(150).optional(),
    body: z.string().min(1).max(5000).optional(),
    status: z.enum(['draft', 'approved', 'sent_manually']).optional(),
    moveLeadToContacted: z.boolean().optional(),
  })
  .strict();

export const PATCH = route<{ id: string }>({ auth: 'user' }, async ({ req, user, params }) => {
  await updateDraft(user, params.id, await parseJson(req, schema));
  return { ok: true };
});
