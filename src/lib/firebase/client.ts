import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { getToken, initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

/**
 * Firebase client SDK, used for authentication only. All data access goes through server routes
 * that verify the session cookie, so no Firestore client SDK is shipped to the browser.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appCheck: AppCheck | null = null;
let emulatorConnected = false;

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseApp(): FirebaseApp {
  const app = getApps().length ? getApp() : initializeApp(config);
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (typeof window !== 'undefined' && siteKey && !appCheck) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' &&
    typeof window !== 'undefined' &&
    !emulatorConnected
  ) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    emulatorConnected = true;
  }
  return auth;
}

/** Returns headers carrying an App Check token when App Check is configured. */
export async function appCheckHeaders(): Promise<Record<string, string>> {
  getFirebaseApp();
  if (!appCheck) return {};
  try {
    const { token } = await getToken(appCheck, false);
    return { 'X-Firebase-AppCheck': token };
  } catch {
    return {};
  }
}
