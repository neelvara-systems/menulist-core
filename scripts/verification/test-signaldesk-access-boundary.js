process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MENULIST_SIGNALDESK_FIREBASE_MODE = process.env.MENULIST_SIGNALDESK_FIREBASE_MODE || "separate";
process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID
  || process.env.GCLOUD_PROJECT
  || "demo-signaldesk";
process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID
  || process.env.MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("SignalDesk access-boundary tests require FIRESTORE_EMULATOR_HOST.");
  process.exit(1);
}

require("ts-node").register({
  compilerOptions: { module: "CommonJS" },
  transpileOnly: true,
});
require("tsconfig-paths/register");

const assert = require("assert/strict");
const { DB_COLLECTIONS } = require("@constant/database");
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { firestoreAdmin } = require("@lib/firebase/firebaseAdmin");
const { signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");
const { upsertSignalDeskTeamMemberServer } = require("@lib/signaldesk/workflowServer");

const db = signaldeskFirestoreAdmin;
const createdMemberIds = new Set();
const createdUserIds = new Set();

const memberRef = (memberId) => db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(memberId);
const userRef = (userId) => firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);

async function seedCurrentUser(userId, email = `${userId}@example.invalid`, overrides = {}) {
  createdUserIds.add(userId);
  await userRef(userId).set({
    active: true,
    email: email.toLowerCase(),
    id: userId,
    isVerified: true,
    platformRole: "STAFF",
    ...overrides,
  });
}

const buildMember = (memberId, overrides = {}) => {
  const email = `${memberId}@example.invalid`;
  return {
    active: true,
    email,
    emailLower: email,
    pId: "SD",
    permissions: [],
    role: "operator",
    status: "active",
    teamMemberId: memberId,
    userId: memberId,
    ...overrides,
  };
};

async function seedMember(memberId, overrides = {}) {
  createdMemberIds.add(memberId);
  const member = buildMember(memberId, overrides);
  for (const key of Object.keys(member)) {
    if (member[key] === undefined) delete member[key];
  }
  await memberRef(memberId).set(member);
  await seedCurrentUser(memberId, member.email);
}

const sessionFor = (userId, email = `${userId}@example.invalid`) => ({
  authIssuedAt: 1_800_000_000,
  uId: userId,
  user: {
    email,
    name: "SignalDesk Access Test",
    platformRole: "STAFF",
  },
});

async function expectDenied(label, session) {
  const access = await getSignalDeskAccessContext(session);
  assert.equal(access, null, label);
}

async function expectCode(label, callback, code) {
  await assert.rejects(callback, (error) => (
    error instanceof Error && error.message === code
  ), label);
}

async function main() {
  await seedCurrentUser("platform-access-test", "platform-access-test@example.invalid", { platformRole: "PLATFORM" });
  const platformSession = sessionFor("platform-access-test");
  platformSession.user.platformRole = "PLATFORM";
  const platformAccess = await getSignalDeskAccessContext(platformSession);
  assert.equal(platformAccess?.isPlatformAdmin, true, "Platform admin access was not preserved");
  assert.equal(platformAccess?.role, "founder-admin", "Platform admin did not retain founder authority");
  await userRef("platform-access-test").set({ platformRole: "STAFF" }, { merge: true });
  await expectDenied("Stale PLATFORM session claim unexpectedly retained access", platformSession);

  await seedMember("valid-member", { permissions: ["message.send"] });
  const validAccess = await getSignalDeskAccessContext(sessionFor("valid-member"));
  assert.equal(validAccess?.role, "operator", "Valid human membership did not resolve");
  assert(validAccess?.permissions.includes("message.send"), "Valid extra permission was not granted");
  await userRef("valid-member").set({ blocked: true }, { merge: true });
  await expectDenied("Blocked current user unexpectedly retained team-member access", sessionFor("valid-member"));

  await seedMember("email-invite", {
    email: "email-invite@example.invalid",
    emailLower: "email-invite@example.invalid",
    userId: null,
  });
  await seedCurrentUser("email-invite-session", "email-invite@example.invalid");
  const emailInviteAccess = await getSignalDeskAccessContext(
    sessionFor("email-invite-session", "EMAIL-INVITE@example.invalid"),
  );
  assert.equal(emailInviteAccess?.role, "operator", "Canonical email-only membership did not resolve");
  assert.equal(emailInviteAccess?.userId, "email-invite-session", "Session actor ID was not retained");

  const rejectedCases = [
    ["missing-product", { pId: undefined }],
    ["foreign-product", { pId: "AL" }],
    ["wrong-document-identity", { teamMemberId: "some-other-member" }],
    ["inactive-flag", { active: false }],
    ["inactive-status", { status: "inactive" }],
    ["malformed-status", { status: "enabled" }],
    ["system-worker", { role: "system-worker" }],
    ["unknown-role", { role: "owner" }],
    ["malformed-permission-container", { permissions: "message.send" }],
    ["unknown-extra-permission", { permissions: ["message.send", "message.delete"] }],
    ["noncanonical-email", {
      email: "NONCANONICAL-EMAIL@example.invalid",
      emailLower: "noncanonical-email@example.invalid",
    }],
  ];

  for (const [memberId, overrides] of rejectedCases) {
    await seedMember(memberId, overrides);
    await expectDenied(`${memberId} unexpectedly resolved access`, sessionFor(memberId));
  }

  await seedMember("wrong-user-binding", { userId: "different-user" });
  await expectDenied(
    "A membership bound to another user ID unexpectedly resolved",
    sessionFor("wrong-user-binding"),
  );

  await seedMember("wrong-email-binding");
  await seedCurrentUser("wrong-email-binding", "different-email@example.invalid");
  await expectDenied(
    "A membership bound to another email unexpectedly resolved",
    sessionFor("wrong-email-binding", "different-email@example.invalid"),
  );

  await seedMember("ambiguous-email-one", {
    email: "ambiguous@example.invalid",
    emailLower: "ambiguous@example.invalid",
    userId: null,
  });
  await seedMember("ambiguous-email-two", {
    email: "ambiguous@example.invalid",
    emailLower: "ambiguous@example.invalid",
    userId: null,
  });
  await seedCurrentUser("ambiguous-email-session", "ambiguous@example.invalid");
  await expectDenied(
    "Duplicate email memberships unexpectedly resolved",
    sessionFor("ambiguous-email-session", "ambiguous@example.invalid"),
  );

  await seedMember("duplicate-user-binding");
  await seedMember("duplicate-user-binding-shadow", {
    email: "duplicate-user-binding@example.invalid",
    emailLower: "duplicate-user-binding@example.invalid",
    userId: "duplicate-user-binding",
  });
  await expectDenied(
    "Duplicate user ID memberships unexpectedly resolved",
    sessionFor("duplicate-user-binding"),
  );

  const founderAccess = {
    active: true,
    email: "founder-access@example.invalid",
    firebaseConfigured: true,
    isPlatformAdmin: true,
    name: "Founder Access",
    permissions: ["signaldesk.view", "signaldesk.configure"],
    role: "founder-admin",
    userId: "founder-access",
  };
  await expectCode("Human team mutation accepted system-worker", () => upsertSignalDeskTeamMemberServer(founderAccess, {
    active: true,
    email: "worker@example.invalid",
    role: "system-worker",
  }), "SIGNALDESK_TEAM_MEMBER_ROLE_INVALID");

  const selfMember = await upsertSignalDeskTeamMemberServer(founderAccess, {
    active: true,
    email: founderAccess.email,
    name: "Founder Access",
    role: "founder-admin",
  });
  createdMemberIds.add(selfMember.teamMemberId);
  const selfMemberReplay = await upsertSignalDeskTeamMemberServer(founderAccess, {
    active: true,
    email: founderAccess.email,
    name: "Founder Access",
    role: "founder-admin",
  });
  assert.equal(selfMemberReplay.updatedAt, selfMember.updatedAt, "Exact team-member replay rewrote access authority");
  const selfMemberRef = memberRef(selfMember.teamMemberId);
  await selfMemberRef.set({ stalePrivateField: "must-be-removed" }, { merge: true });
  await upsertSignalDeskTeamMemberServer(founderAccess, {
    active: true,
    email: founderAccess.email,
    name: "Founder Access",
    role: "founder-admin",
  });
  assert.equal((await selfMemberRef.get()).data()?.stalePrivateField, undefined, "Team-member refresh retained stale access fields");
  await expectCode("Changed email bypassed self-deactivation guard", () => upsertSignalDeskTeamMemberServer(founderAccess, {
    active: false,
    email: "changed-founder@example.invalid",
    role: "founder-admin",
    teamMemberId: selfMember.teamMemberId,
  }), "SignalDesk team member cannot deactivate own access");

  const concurrentMembers = await Promise.allSettled([
    upsertSignalDeskTeamMemberServer(founderAccess, {
      active: true,
      email: "concurrent-member@example.invalid",
      role: "operator",
      userId: "concurrent-user-one",
    }),
    upsertSignalDeskTeamMemberServer(founderAccess, {
      active: true,
      email: "concurrent-member@example.invalid",
      role: "operator",
      userId: "concurrent-user-two",
    }),
  ]);
  assert.equal(concurrentMembers.filter((result) => result.status === "fulfilled").length, 1, "Concurrent changed identities did not produce one winner");
  assert.equal(concurrentMembers.filter((result) => result.status === "rejected").length, 1, "Concurrent changed identities did not fail the conflicting request");
  const concurrentMemberDocs = await db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS)
    .where("emailLower", "==", "concurrent-member@example.invalid")
    .get();
  assert.equal(concurrentMemberDocs.size, 1, "Concurrent changed identities created duplicate memberships");
  concurrentMemberDocs.docs.forEach((snapshot) => createdMemberIds.add(snapshot.id));

  await expectCode("Missing explicit member update created a new record", () => upsertSignalDeskTeamMemberServer(founderAccess, {
    active: true,
    email: "missing-member@example.invalid",
    role: "operator",
    teamMemberId: "missing-member-id",
  }), "SIGNALDESK_TEAM_MEMBER_NOT_FOUND");

  console.log("SignalDesk access-boundary tests passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk access-boundary tests failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      ...Array.from(createdMemberIds, (memberId) => memberRef(memberId).delete()),
      ...Array.from(createdUserIds, (userId) => userRef(userId).delete()),
    ]);
  });
