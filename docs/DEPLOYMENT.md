# Deployment

## 1. Firebase

1. Create a Firebase project. Enable Authentication with Email/Password and Google. Enable Email enumeration protection.
2. Create a Firestore database (production mode).
3. `firebase deploy --only firestore:rules,firestore:indexes` (requires the Firebase CLI; indexes take minutes to build).
4. Create TTL policies on field `expiresAt` for collections `activityLogs`, `rateLimits`, `searchCache`, `sourceRecords`, `webhookEvents`.
5. Create a service account with the minimum roles (Firebase Authentication Admin, Cloud Datastore User) and keep its key out of Git.
6. Optional: enable App Check with reCAPTCHA v3 and set the site key. Server-side App Check verification is available in `adminAppCheck()` but is not enforced on routes yet.
7. Authorized domains: add your Vercel domain in Authentication settings.

## 2. Vercel

1. Import the repository. Framework: Next.js.
2. Set every variable in `.env.example` (server secrets as Encrypted environment variables). `FIREBASE_PRIVATE_KEY` must keep literal `\n` sequences.
3. `CRON_SECRET`: Vercel Cron sends it as `Authorization: Bearer`. `vercel.json` schedules `/api/cron/daily` at 03:00 UTC. Hobby plans limit cron frequency and function duration; `maxDuration` is set to 120 on audits, so use a plan that allows it.
4. Set `APP_URL` to the production origin before registering the Pesapal IPN.

## 3. First admin

`FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... npx tsx scripts/set-admin.ts you@example.com` then sign in again.

## 4. Local development

```
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true and the Firebase web config
npm run emulators            # Auth + Firestore emulators (needs Firebase CLI and Java)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run dev
```

## 5. Verification commands

`npm run typecheck`, `npm test`, `npm run test:rules` (emulator), `npm run build`, `npm run test:e2e`.

## 6. Launch checklist

- Legal review of `/privacy` and `/terms`; Kenya Data Protection Act registration; decide refund policy.
- Enable a lead source whose terms you have read; confirm ODbL obligations.
- Pesapal sandbox checklist in `docs/PAYMENTS.md`.
- Set `NEXT_PUBLIC_CONTACT_EMAIL` to a real mailbox.
- Add monitoring (Vercel logs are structured JSON; connect an error tracker such as Sentry).
- Review the plan quotas against real per-audit and per-draft costs; the Agency AI allowance (1000) and automation limits are engineering defaults, not business decisions.
