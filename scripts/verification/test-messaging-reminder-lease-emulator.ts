#!/usr/bin/env ts-node

import assert from "node:assert/strict";
import { DB_COLLECTIONS } from "../../functions/src/constants/database";
import { admin, firestoreAdmin } from "../../functions/src/firebaseAdmin";
import {
  claimMessagingReminder,
  completeMessagingReminder,
  releaseMessagingReminder,
} from "../../functions/src/messagingOnboarding/reminderLease";

const db = firestoreAdmin;
const Timestamp = admin.firestore.Timestamp;
const sessions = db.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);
const SESSION_ID = "RmNdErLeAsE123456789";
const TOKEN = "reminderPreviewToken_1234567890";

function buildSession(now: FirebaseFirestore.Timestamp) {
  const entered = Timestamp.fromMillis(now.toMillis() - 13 * 60 * 60 * 1_000);
  return {
    createdAt: entered,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000),
    previewToken: TOKEN,
    previewUrl: `https://app.menulist.ai/msg-preview/${SESSION_ID}?token=${TOKEN}`,
    provider: "whatsapp",
    providerUserId: "919800000000",
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
    reminderSentAt: null,
    sessionId: SESSION_ID,
    state: "AWAITING_APPROVAL",
    stateHistory: [{ state: "AWAITING_APPROVAL", timestamp: entered }],
    uploads: [],
    updatedAt: entered,
  };
}

async function main(): Promise<void> {
  const now = Timestamp.now();
  const ref = sessions.doc(SESSION_ID);
  await ref.set(buildSession(now));

  const claims = await Promise.all(Array.from({ length: 8 }, () => claimMessagingReminder({
    db,
    expectedPreviewBaseUrl: "https://menulist.ai",
    now,
    reminderAfterMs: 12 * 60 * 60 * 1_000,
    sessionId: SESSION_ID,
  })));
  const claimed = claims.filter((claim) => claim.status === "claimed");
  assert.equal(claimed.length, 1);
  assert.equal(claims.filter((claim) => claim.status === "leased").length, 7);
  const token = claimed[0].status === "claimed" ? claimed[0].token : "";
  assert.equal(await completeMessagingReminder({ db, now, sessionId: SESSION_ID, token: "wrong" }), false);
  assert.equal(await completeMessagingReminder({ db, now, sessionId: SESSION_ID, token }), true);
  const completed = (await ref.get()).data();
  assert.equal(completed?.reminderMessageLeaseToken, null);
  assert.equal(completed?.reminderSentAt.toMillis(), now.toMillis());

  await ref.set({
    ...buildSession(now),
    reminderMessageLeaseToken: "expired-lease",
    reminderMessageLeaseUntil: Timestamp.fromMillis(now.toMillis() - 1),
  });
  const reclaimed = await claimMessagingReminder({
    db,
    expectedPreviewBaseUrl: "https://menulist.ai",
    now,
    reminderAfterMs: 12 * 60 * 60 * 1_000,
    sessionId: SESSION_ID,
  });
  assert.equal(reclaimed.status, "claimed");
  assert(reclaimed.status === "claimed");
  assert.equal(await completeMessagingReminder({
    db,
    now,
    sessionId: SESSION_ID,
    token: "expired-lease",
  }), false);
  assert.equal(
    (await ref.get()).get("reminderMessageLeaseToken"),
    reclaimed.token,
    "An expired worker must not complete a newer reminder claim",
  );
  await ref.update({ state: "COLLECTING_INPUT" });
  assert.equal(await completeMessagingReminder({
    db,
    now,
    sessionId: SESSION_ID,
    token: reclaimed.token,
  }), false);
  const stateChanged = (await ref.get()).data();
  assert.equal(stateChanged?.reminderSentAt, null);
  assert.equal(stateChanged?.reminderMessageLeaseToken, null);

  await ref.set(buildSession(now));
  const releasable = await claimMessagingReminder({
    db,
    expectedPreviewBaseUrl: "https://menulist.ai",
    now,
    reminderAfterMs: 12 * 60 * 60 * 1_000,
    sessionId: SESSION_ID,
  });
  assert(releasable.status === "claimed");
  assert.equal(await releaseMessagingReminder({
    db,
    now,
    sessionId: SESSION_ID,
    token: releasable.token,
  }), true);
  assert.equal((await ref.get()).get("reminderMessageLeaseToken"), null);

  await Promise.all([ref.delete(), admin.app().delete()]);
  console.log("Messaging reminder lease emulator verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
