'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, type User } from 'firebase/auth';
import { Alert } from '@/components/ui';
import { api } from '@/components/use-api';
import { getFirebaseAuth } from '@/lib/firebase/client';

function currentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => {
      off();
      resolve(u);
    });
  });
}

export function VerifyBanner({ email }: { email: string | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      const u = await currentUser();
      if (!u) throw new Error('Sign in again to resend the email.');
      await sendEmailVerification(u);
      setMsg('Verification email sent. Check your inbox and spam folder.');
    } catch (e) {
      setMsg(e instanceof Error && e.message ? e.message : 'Could not send the email right now. Try again in a few minutes.');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      const u = await currentUser();
      if (!u) throw new Error('Sign in again to continue.');
      await u.reload();
      if (!u.emailVerified) {
        setMsg('Your email is not verified yet. Open the link we sent, then try again.');
        return;
      }
      // Mint a new session so the verified claim is picked up by the server.
      await api('/api/session', 'POST', { idToken: await u.getIdToken(true) });
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error && e.message ? e.message : 'Could not check right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6">
      <Alert kind="warn">
        <p className="font-medium">Verify your email to unlock search, audits and drafts.</p>
        <p className="mt-0.5">We sent a link to {email}.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-sm" onClick={refresh} disabled={busy}>I have verified</button>
          <button className="btn btn-sm" onClick={resend} disabled={busy}>Resend email</button>
        </div>
        {msg && <p className="mt-2" role="status">{msg}</p>}
      </Alert>
    </div>
  );
}
