import 'server-only';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getAppCheck, type AppCheck } from 'firebase-admin/app-check';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK bootstrap. Server-only: importing this file from client code fails the build
 * because of the "server-only" import above.
 *
 * Admin operations bypass Firestore security rules, so every caller must enforce authorization.
 */
let app: App | null = null;

/**
 * Accepts the private key however it was pasted: with literal "\n" sequences, with real newlines,
 * or wrapped in quotes (a common mistake when copying from the service-account JSON file).
 */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, '\n').trim();
}
let dbConfigured = false;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey) {
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  } else {
    // Falls back to Application Default Credentials, or the emulators when their env vars are set.
    app = initializeApp({ credential: applicationDefault(), projectId });
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminAppCheck(): AppCheck {
  return getAppCheck(getAdminApp());
}

export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  if (!dbConfigured) {
    db.settings({ ignoreUndefinedProperties: true });
    dbConfigured = true;
  }
  return db;
}
