'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { api, ClientApiError } from '@/components/use-api';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';

type Mode = 'login' | 'signup' | 'reset';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'The email or password is incorrect.',
  'auth/wrong-password': 'The email or password is incorrect.',
  'auth/user-not-found': 'The email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Choose a password of at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
};

function friendly(err: unknown): string {
  if (err instanceof ClientApiError) {
    if (err.status >= 500) {
      return 'You signed in with Firebase, but the server could not start your session. This is a server setup problem, not a wrong password. Open /api/health?key=YOUR_CRON_SECRET to see what is missing.';
    }
    return err.message;
  }
  const code = (err as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (err instanceof Error && !code) return err.message;
  return 'Something went wrong. Please try again.';
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const plan = params.get('plan');
  const next = plan ? `/app/billing?plan=${encodeURIComponent(plan)}` : '/app';

  async function finish(user: Awaited<ReturnType<typeof signInWithEmailAndPassword>>['user'], displayName?: string) {
    const idToken = await user.getIdToken(true);
    await api('/api/session', 'POST', { idToken, displayName });
    router.replace(next);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        // Same message whether or not the account exists, to avoid revealing registered emails.
        setNotice('If an account exists for that address, a reset link has been sent.');
      } else if (mode === 'signup') {
        if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' });
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim().slice(0, 80) });
        await sendEmailVerification(cred.user);
        await finish(cred.user, name.trim() || undefined);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await finish(cred.user);
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      await finish(cred.user, cred.user.displayName ?? undefined);
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create your account' : 'Reset your password';

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 pt-12">
      <div className="absolute right-3 top-3"><ThemeToggle /></div>
      <Logo />
      <div className="panel mt-6 w-full max-w-sm p-5">
        <h1 className="text-lg font-semibold">{title}</h1>
        {!isFirebaseConfigured() && (
          <div className="mt-4">
            <Alert kind="warn">Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables (see .env.example).</Alert>
          </div>
        )}
        <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="label">Name</label>
              <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" required minLength={8} className="input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
              {mode === 'signup' && <p className="hint">At least 8 characters.</p>}
            </div>
          )}
          {error && <Alert kind="bad">{error}</Alert>}
          {notice && <Alert kind="ok">{notice}</Alert>}
          <button className="btn btn-primary w-full" disabled={busy || !email}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>
        {mode !== 'reset' && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <button type="button" className="btn w-full" onClick={google} disabled={busy}>
              Continue with Google
            </button>
          </>
        )}
        <div className="mt-5 space-y-1 text-center text-sm text-muted">
          {mode === 'login' && (
            <>
              <p><Link className="link" href="/forgot-password">Forgot your password?</Link></p>
              <p>No account? <Link className="link" href="/signup">Create one</Link></p>
            </>
          )}
          {mode === 'signup' && (
            <>
              <p className="text-xs">By creating an account you agree to the <Link className="link" href="/terms">terms</Link> and <Link className="link" href="/privacy">privacy policy</Link>.</p>
              <p>Already registered? <Link className="link" href="/login">Sign in</Link></p>
            </>
          )}
          {mode === 'reset' && <p><Link className="link" href="/login">Back to sign in</Link></p>}
        </div>
      </div>
    </div>
  );
}
