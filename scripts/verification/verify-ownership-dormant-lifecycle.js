#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (content, token, label) => {
  assert(content.includes(token), `${label} must include ${token}`);
};

const staffServer = read('src/lib/staffManagement/server.ts');
const staffConcurrency = read('src/lib/staffManagement/concurrencyBoundary.ts');
const ownershipBoundary = read('src/lib/staffManagement/ownershipTransferBoundary.ts');
const desktopRole = read('src/components/templates/main-app/users/usersList/userForm/rolesMapping.tsx');
const desktopStores = read('src/components/templates/main-app/users/usersList/userForm/storesMapping.tsx');
const mobileUsers = read('src/components/mobile/screens/MobileUsersScreen.tsx');
const terms = read('src/components/website/legal/TermsOfServicePage.tsx');
const notificationRecipient = read('src/lib/owner-notifications/recipientResolver.ts');
const subscriptionType = read('src/types/razorpay.ts');
const staleness = read('functions/src/analytics/stalenessCheck.ts');
const confidence = read('functions/src/analytics/storeTruthConfidence.ts');

includes(staffConcurrency, "throw new StaffConcurrencyError('LAST_OWNER')", 'last operational owner protection');
includes(staffServer, 'ensureNotSelfDestructive(session, targetUserId)', 'self-destructive owner change protection');
includes(staffServer, 'OWNER_MANAGEMENT_FORBIDDEN', 'owner-target authority');
includes(staffServer, 'OWNER_ROLE_LOCKED', 'owner role definition lock');

includes(ownershipBoundary, 'OWNER_ACCESS_NOT_TRANSFER_COPY', 'shared owner-role warning');
for (const [label, content] of [
  ['desktop role selection', desktopRole],
  ['desktop multi-store selection', desktopStores],
  ['mobile owner selection', mobileUsers],
]) {
  includes(content, 'OWNER_ACCESS_NOT_TRANSFER_COPY', label);
}
includes(terms, 'The Owner role grants operational access; assigning it does not transfer', 'public operational-owner distinction');
includes(terms, 'A business ownership transfer requires verified authority and support review', 'public transfer boundary');

includes(notificationRecipient, 'settings.primaryEmail', 'primary notification recipient source');
includes(notificationRecipient, 'settings.billingEmail', 'billing notification recipient source');
includes(subscriptionType, 'userId: string;', 'subscription owner reference');
includes(subscriptionType, 'email: string;', 'subscription billing identity');

includes(confidence, 'if (storeInfo.active === false) continue;', 'inactive-store confidence exclusion');
includes(staleness, "eventType: 'MENU_STALE'", 'stale owner communication');
includes(staleness, 'MAX_STALE_STORES_CHECKED_PER_NIGHT', 'bounded stale scan');
assert(!/\bactive\s*:\s*false\b/.test(staleness), 'staleness detection must not deactivate stores');
assert(!staleness.includes('.collection(DB_COLLECTIONS.STORES)'), 'staleness detection must not mutate store truth');

const apiRoot = path.join(ROOT, 'src/app/api');
const apiFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.name === 'route.ts') apiFiles.push(path.relative(ROOT, absolute));
  }
};
walk(apiRoot);
assert(
  !apiFiles.some((file) => /ownership-transfer|transfer-ownership/.test(file)),
  'business ownership transfer must remain support-managed until its full authority contract exists',
);

[
  '__docs__/ownership-dormant-lifecycle/README.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_spec.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_impl.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_marketing.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_website.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_helpdoc.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_firebase.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_mobile-support.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_test-cases.md',
  '__docs__/ownership-dormant-lifecycle/ownership-dormant-lifecycle_verification.md',
].forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Ownership transfer and dormant lifecycle source boundary passed.');
