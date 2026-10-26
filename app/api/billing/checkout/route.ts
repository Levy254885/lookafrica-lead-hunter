import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { createCheckout } from '@/lib/payments/service';

const schema = z.object({ planId: z.enum(['starter', 'pro', 'agency']) });

export const POST = route({ auth: 'verified', rate: { name: 'checkout', limit: 10, windowSec: 600 } }, async ({ req, user }) => {
  const { planId } = await parseJson(req, schema);
  return { ...(await createCheckout(user, planId)) };
});
