import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Run with `npm run test:rules` (starts the Firestore emulator). These tests exercise the real
 * firestore.rules file. They have not been run in the environment this repository was authored in.
 */
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lookafrica',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { uid: 'alice', displayName: 'Alice', country: 'KE', services: [], createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, 'subscriptions/alice'), { planId: 'free', status: 'active' });
    await setDoc(doc(db, 'usage/alice_2026-10'), { ownerId: 'alice', leads: 1 });
    await setDoc(doc(db, 'payments/p1'), { uid: 'alice', status: 'initiated' });
    await setDoc(doc(db, 'leads/l1'), { ownerId: 'alice', name: 'Shop', notes: 'private' });
    await setDoc(doc(db, 'leads/l2'), { ownerId: 'bob', name: 'Other', notes: 'bob private' });
    await setDoc(doc(db, 'systemConfig/plans'), { graceDays: 3 });
    await setDoc(doc(db, 'systemConfig/secret'), { x: 1 });
    await setDoc(doc(db, 'webhookEvents/e1'), { x: 1 });
    await setDoc(doc(db, 'projects/pr1'), { title: 'Job' });
  });
});

const alice = () => env.authenticatedContext('alice', { email_verified: true }).firestore();
const unverified = () => env.authenticatedContext('alice', { email_verified: false }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('default deny', () => {
  it('denies unauthenticated reads', async () => {
    await assertFails(getDoc(doc(anon(), 'leads/l1')));
    await assertFails(getDoc(doc(anon(), 'users/alice')));
    await assertFails(getDoc(doc(anon(), 'systemConfig/plans')));
  });
  it('denies unknown collections and server-only collections', async () => {
    await assertFails(getDoc(doc(alice(), 'webhookEvents/e1')));
    await assertFails(setDoc(doc(alice(), 'rateLimits/x'), { count: 0 }));
    await assertFails(getDoc(doc(alice(), 'systemConfig/secret')));
  });
});

describe('ownership boundaries', () => {
  it('lets the owner read their own lead but not another subscriber\'s', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'leads/l1')));
    await assertFails(getDoc(doc(alice(), 'leads/l2')));
  });
  it('blocks every client write to leads', async () => {
    await assertFails(updateDoc(doc(alice(), 'leads/l1'), { notes: 'x' }));
    await assertFails(setDoc(doc(alice(), 'leads/new'), { ownerId: 'alice' }));
    await assertFails(deleteDoc(doc(alice(), 'leads/l1')));
  });
});

describe('entitlements cannot be self-edited', () => {
  it('blocks subscription writes and creation', async () => {
    await assertFails(updateDoc(doc(alice(), 'subscriptions/alice'), { planId: 'agency' }));
    await assertFails(setDoc(doc(alice(), 'subscriptions/alice'), { planId: 'agency', status: 'active' }));
    await assertSucceeds(getDoc(doc(alice(), 'subscriptions/alice')));
  });
  it('blocks usage counter edits', async () => {
    await assertFails(updateDoc(doc(alice(), 'usage/alice_2026-10'), { leads: 0 }));
    await assertFails(setDoc(doc(alice(), 'usage/alice_2026-11'), { ownerId: 'alice', leads: 0 }));
  });
  it('blocks payment flag writes', async () => {
    await assertFails(updateDoc(doc(alice(), 'payments/p1'), { status: 'completed' }));
    await assertSucceeds(getDoc(doc(alice(), 'payments/p1')));
  });
  it('blocks plan configuration writes', async () => {
    await assertFails(setDoc(doc(alice(), 'systemConfig/plans'), { graceDays: 999 }));
  });
});

describe('user profile', () => {
  it('allows only whitelisted validated profile fields', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { displayName: 'Alice K', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { isAdmin: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { plan: 'agency', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { displayName: 'x'.repeat(200), updatedAt: serverTimestamp() }));
  });
  it('blocks reading another user\'s profile', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice')));
  });
});

describe('shared project listings', () => {
  it('requires a verified email to read', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'projects/pr1')));
    await assertFails(getDoc(doc(unverified(), 'projects/pr1')));
    await assertFails(setDoc(doc(alice(), 'projects/x'), { title: 'x' }));
  });
});
