/**
 * Grants or revokes the admin custom claim for a user. Run from a trusted machine with admin credentials:
 *   npx tsx scripts/set-admin.ts someone@example.com [--revoke]
 * Admin status is a custom claim on the Firebase Auth user, never a Firestore field a user could edit.
 */
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');
if (!email) {
  console.error('Usage: tsx scripts/set-admin.ts <email> [--revoke]');
  process.exit(1);
}
const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
initializeApp({ credential: projectId && clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(), projectId });

(async () => {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: !revoke });
  await auth.revokeRefreshTokens(user.uid);
  console.log(`${revoke ? 'Revoked' : 'Granted'} admin for ${email}. The user must sign in again.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
