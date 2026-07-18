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
const { SIGNALDESK_COLLECTIONS } = require("@constant/signaldesk/database");
const { signaldeskFirestoreAdmin } = require("@lib/firebase/signaldeskFirebaseAdmin");
const { getSignalDeskAccessContext } = require("@lib/signaldesk/access");

const db = signaldeskFirestoreAdmin;
const createdMemberIds = new Set();

const memberRef = (memberId) => db.collection(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS).doc(memberId);

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
}

const sessionFor = (userId, email = `${userId}@example.invalid`) => ({
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

async function main() {
  const platformAccess = await getSignalDeskAccessContext({
    uId: "platform-access-test",
    user: {
      email: "platform-access-test@example.invalid",
      platformRole: "PLATFORM",
    },
  });
  assert.equal(platformAccess?.isPlatformAdmin, true, "Platform admin access was not preserved");
  assert.equal(platformAccess?.role, "founder-admin", "Platform admin did not retain founder authority");

  await seedMember("valid-member", { permissions: ["message.send"] });
  const validAccess = await getSignalDeskAccessContext(sessionFor("valid-member"));
  assert.equal(validAccess?.role, "operator", "Valid human membership did not resolve");
  assert(validAccess?.permissions.includes("message.send"), "Valid extra permission was not granted");

  await seedMember("email-invite", {
    email: "email-invite@example.invalid",
    emailLower: "email-invite@example.invalid",
    userId: null,
  });
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

  console.log("SignalDesk access-boundary tests passed");
}

main()
  .catch((error) => {
    console.error("SignalDesk access-boundary tests failed");
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(Array.from(createdMemberIds, (memberId) => memberRef(memberId).delete()));
  });
