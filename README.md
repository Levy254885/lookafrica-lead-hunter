# LOOK AFRICA Lead Hunter

A subscription workspace for developers and agencies: discover businesses, run evidence-based website audits, track public project listings, manage a pipeline and draft proposals from real findings. Initial market: Kenya.

Stack: Next.js, TypeScript, Tailwind, Firebase Auth and Firestore (Admin SDK on the server), Pesapal for payments, Vercel.

**Status: foundation, not yet built or run.** Read [PROGRESS.md](PROGRESS.md) first. It lists what was verified, what was not, and what is missing.

## Quick start

```
npm install
cp .env.example .env.local
npm run emulators      # terminal 1
npm run dev            # terminal 2 (see docs/DEPLOYMENT.md for emulator env vars)
```

## Documents

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - trust model, modules, data model
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) - sources, terms, quotas
- [docs/PAYMENTS.md](docs/PAYMENTS.md) - provider, verification flow, sandbox checklist
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Firebase, Vercel, launch checklist

## Principles

No invented data: missing credentials produce an explicit unavailable state. Every finding shows evidence and whether it was measured, inferred or unavailable. Plans change only after server-side verification with the payment provider. No emoji; Lucide icons only.
