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

const authClient = read('src/lib/auth/client.ts');
const cleanup = read('src/lib/auth/clientSessionCleanup.ts');
const sessionProvider = read('src/providers/sessionProvider.tsx');
const websiteHeader = read('src/components/website/Header.tsx');
const profileActions = read('src/components/organisms/headerComponent/profileActionsModal/index.tsx');
const privacy = read('src/components/website/legal/PrivacyPolicyPage.tsx');
const onboarding = read('src/lib/onboarding/createTenantStore.ts');
const compensation = read('src/lib/onboarding/compensateFailedOnboarding.ts');
const staff = read('src/lib/staffManagement/server.ts');

includes(authClient, 'await signOutFirebaseAuth()', 'Firebase sign-out attempt');
includes(authClient, 'const nextAuthResult = await signOut({', 'independent NextAuth sign-out attempt');
includes(authClient, 'clearAuthenticatedBrowserState();', 'post-NextAuth browser cleanup');
includes(cleanup, 'clearClientSessionCache();', 'logout raw session cache cleanup');
assert(
  authClient.indexOf('const nextAuthResult = await signOut({') > authClient.indexOf('await signOutFirebaseAuth()'),
  'NextAuth sign-out must still be attempted after Firebase sign-out',
);

for (const token of [
  'writeActiveStoreContextId(null)',
  'clearAllCache()',
  'clearCapturedLogs()',
  'clearUserContext()',
  'DEPLOYMENT_IDENTITY_STORAGE_KEY',
  "'mobileMenuActiveProcessingJob'",
  'AUTHENTICATED_SESSION_STORAGE_PREFIXES',
  "'dismissedMenuProcessingJobs:'",
  'removeStoragePrefixes(sessionStorage, AUTHENTICATED_SESSION_STORAGE_PREFIXES)',
]) {
  includes(cleanup, token, 'authenticated browser cleanup');
}

for (const token of [
  'setTenantDetails(null)',
  'setStoreDetails(null)',
  'setLoginStoreDetails(null)',
  'setUserPermissions(null)',
  'setCachedTickets({ cachedOn: null, tickets: [], scopeKey: null })',
  'window.sessionStorage.removeItem(DEPLOYMENT_IDENTITY_STORAGE_KEY)',
]) {
  includes(sessionProvider, token, 'in-memory session teardown');
}

assert(!websiteHeader.includes('import { signOut,'), 'website header must use shared sign-out lifecycle');
includes(websiteHeader, 'signOutSession("/")', 'website header shared sign-out');
includes(profileActions, "dispatch(showErrorToast(t('logoutFailed')))", 'logout failure presentation');
assert(!profileActions.includes("dispatch(showSuccessToast(t('logoutFailed')))"), 'logout failure must not be shown as success');

includes(onboarding, 'createTenantStoreInTransaction', 'central tenant/store transaction');
includes(onboarding, 'assertCurrentUserAvailableForOnboardingInTransaction', 'concurrent onboarding admission');
includes(compensation, 'compensateFailedTenantStoreOnboarding', 'failed paid onboarding compensation');
includes(staff, 'staff_removed_from_last_store', 'last-store staff lifecycle');
includes(staff, 'syncStaffFirebaseAuthDisabledState', 'staff Auth disable synchronization');

includes(privacy, 'We verify identity and business authority', 'privacy request verification truth');
includes(privacy, 'Account closure may require subscription, billing, dispute, security, shared-business access, and legal-retention checks.', 'account closure constraints');
assert(!privacy.includes('instant account export'), 'privacy policy must not promise an instant account export');

[
  '__docs__/account-tenant-lifecycle/README.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_spec.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_impl.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_marketing.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_website.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_helpdoc.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_firebase.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_mobile-support.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_test-cases.md',
  '__docs__/account-tenant-lifecycle/account-tenant-lifecycle_verification.md',
].forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Account and tenant lifecycle source boundary passed.');
