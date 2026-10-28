import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { cancelSubscription, resumeSubscription } from '@/lib/payments/service';

const schema = z.object({ action: z.enum(['cancel', 'resume']) });

export const POST = route({ auth: 'user' }, async ({ req, user }) => {
  const { action } = await parseJson(req, schema);
  if (action === 'cancel') await cancelSubscription(user);
  else await resumeSubscription(user);
  return { ok: true };
});
