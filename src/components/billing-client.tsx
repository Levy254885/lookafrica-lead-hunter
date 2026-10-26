'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';

export function CheckoutButton({ planId, label, disabled, disabledReason }: { planId: string; label: string; disabled?: boolean; disabledReason?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ redirectUrl: string }>('/api/billing/checkout', 'POST', { planId });
      window.location.assign(r.redirectUrl);
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Could not start checkout.');
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="btn btn-primary w-full" onClick={go} disabled={disabled || busy} title={disabled ? disabledReason : undefined}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {label}
      </button>
      {disabled && disabledReason && <p className="hint">{disabledReason}</p>}
      {err && <p className="mt-1 text-xs text-danger" role="alert">{err}</p>}
    </div>
  );
}

export function CancelControls({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  async function act(action: 'cancel' | 'resume') {
    if (action === 'cancel' && !window.confirm('Stop renewal? You keep paid access until the end of the period you already paid for.')) return;
    try {
      await api('/api/billing/cancel', 'POST', { action });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Could not update.');
    }
  }
  return (
    <div>
      {cancelAtPeriodEnd ? (
        <button className="btn" onClick={() => act('resume')}>Resume renewal</button>
      ) : (
        <button className="btn btn-danger" onClick={() => act('cancel')}>Cancel renewal</button>
      )}
      {err && <p className="mt-1 text-xs text-danger" role="alert">{err}</p>}
    </div>
  );
}

/** Shown after returning from the provider. Asks the server to verify; never trusts the redirect itself. */
export function PaymentReturn({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'activated' | 'pending' | 'failed' | 'error'>('checking');
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function check() {
      tries += 1;
      try {
        const r = await api<{ outcome: string }>('/api/billing/verify', 'POST', { paymentId });
        if (cancelled) return;
        if (r.outcome === 'activated' || r.outcome === 'already_processed') {
          setState('activated');
          router.refresh();
          return;
        }
        if (r.outcome === 'failed' || r.outcome === 'reversed' || r.outcome === 'rejected') return setState('failed');
        if (tries < 8) setTimeout(check, 4000);
        else setState('pending');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    check();
    return () => { cancelled = true; };
  }, [paymentId, router]);

  if (state === 'checking') return <Alert kind="info"><span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Confirming your payment with the provider. Your plan changes only when it is confirmed.</span></Alert>;
  if (state === 'activated') return <Alert kind="ok">Payment confirmed. Your plan is active.</Alert>;
  if (state === 'pending') return <Alert kind="warn">We have not received confirmation yet. M-Pesa confirmations can take a few minutes. Your plan will update automatically once the provider confirms; you can leave this page.</Alert>;
  if (state === 'failed') return <Alert kind="bad">The provider reported that this payment did not complete. You have not been charged for a plan. You can try again below.</Alert>;
  return <Alert kind="warn">We could not check the payment right now. Reload this page in a minute.</Alert>;
}
