import { NextResponse, type NextRequest } from 'next/server';
import { assertCronAuth, errorResponse } from '@/lib/api';
import { recoverStaleAudits } from '@/lib/audit/run';
import { pesapalConfigured } from '@/lib/payments/pesapal';
import { reconcilePayments } from '@/lib/payments/service';
import { refreshProjects } from '@/lib/projects/service';

export const maxDuration = 300;

/** Scheduled maintenance: project refresh, stuck-audit recovery and payment reconciliation. */
export async function GET(req: NextRequest) {
  try {
    assertCronAuth(req);
    const [projects, audits, payments] = await Promise.all([
      refreshProjects(),
      recoverStaleAudits(),
      pesapalConfigured() ? reconcilePayments() : Promise.resolve({ skipped: 'payments_not_configured' }),
    ]);
    return NextResponse.json({ projects, audits, payments });
  } catch (err) {
    return errorResponse(err);
  }
}
