import { after } from 'next/server';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { executeAudit } from '@/lib/audit/run';
import { requestAudit } from '@/lib/audit/service';

export const maxDuration = 120;

const schema = z.object({ url: z.string().min(3).max(2048), leadId: z.string().min(8).max(64).nullable().optional() });

/** Creates the audit job, then runs it after the response is sent so the UI can show pending and running states. */
export const POST = route({ auth: 'verified', rate: { name: 'audit', limit: 15, windowSec: 600 } }, async ({ req, user }) => {
  const body = await parseJson(req, schema);
  const { auditId, reused } = await requestAudit(user, body);
  if (!reused) after(() => executeAudit(auditId));
  return { auditId, reused };
});
