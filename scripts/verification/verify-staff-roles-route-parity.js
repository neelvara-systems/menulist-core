#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertMatches(content, regex, label) {
  assert(regex.test(content), `${label} must match ${regex}`);
}

function verifyStaffRolesRouteParity() {
  const packageJson = JSON.parse(read('package.json'));
  const usersPage = read('src/app/(main)/users/page.tsx');
  const usersListPage = read('src/app/(main)/users/list/page.tsx');
  const permissionsPage = read('src/app/(main)/users/permissions/page.tsx');
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileUsersScreen = read('src/components/mobile/screens/MobileUsersScreen.tsx');
  const mobileRolesScreen = read('src/components/mobile/screens/MobileRolesScreen.tsx');
  const staffClient = read('src/lib/staffManagement/client.ts');
  const mobileSupportDoc = read('__docs__/roles-permissions/roles-permissions_mobile-support.md');
  const verificationDoc = read('__docs__/roles-permissions/roles-permissions_verification.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');

  assert(
    packageJson.scripts?.['verify:staff-roles-route-parity'] === 'node scripts/verification/verify-staff-roles-route-parity.js',
    'package.json must expose verify:staff-roles-route-parity',
  );

  [
    [usersPage, /import\s+UsersListPage\s+from\s+['"]@template\/main-app\/users\/usersList['"]/, '/users desktop route'],
    [usersPage, /<UsersListPage\s*\/>/, '/users desktop route render'],
    [usersListPage, /import\s+UsersListPage\s+from\s+['"]@template\/main-app\/users\/usersList['"]/, '/users/list desktop route'],
    [usersListPage, /<UsersListPage\s*\/>/, '/users/list desktop route render'],
    [permissionsPage, /import\s+UserPermissionsPage\s+from\s+['"]@template\/main-app\/users\/permissions['"]/, '/users/permissions desktop route'],
    [permissionsPage, /<UserPermissionsPage\s*\/>/, '/users/permissions desktop route render'],
  ].forEach(([content, regex, label]) => assertMatches(content, regex, label));

  [
    "'/users': { tab: 'more', todayScreen: 'main', moreScreen: 'users' }",
    "'/users/list': { tab: 'more', todayScreen: 'main', moreScreen: 'users' }",
    "'/users/permissions': { tab: 'more', todayScreen: 'main', moreScreen: 'roles' }",
  ].forEach((token) => {
    assertIncludes(mobileShell, token, 'MobileShell Staff/Roles route map');
  });

  [
    "const MobileRolesScreen = dynamic(() => import('./MobileRolesScreen'), { ssr: false });",
    "const MobileUsersScreen = dynamic(() => import('./MobileUsersScreen'), { ssr: false });",
    "| 'roles'",
    "| 'users'",
    "userPermissions?.canManageUsers ? [{ key: 'users'",
    "onClick: () => openSubScreen('users')",
    "userPermissions?.canAssignRoles ? [{ key: 'roles'",
    "onClick: () => openSubScreen('roles')",
    "if (screen === 'roles') return userPermissions?.canAssignRoles === true;",
    "if (screen === 'users') return userPermissions?.canManageUsers === true;",
    "else if (subScreen === 'roles') subScreenContent = <MobileRolesScreen",
    "else if (subScreen === 'users') subScreenContent = <MobileUsersScreen",
  ].forEach((token) => {
    assertIncludes(mobileMoreScreen, token, 'Mobile More Staff/Roles gate');
  });

  [
    'createStaffUser',
    'fetchStaffUsers',
    'forceSignOutStaffUser',
    'removeStaffFromStore',
    'requestStaffPasswordReset',
    'updateStaffUser',
    'logStaffClientFailure',
    "surface: 'mobile_users'",
    'const canManageUsers = userPermissions?.canManageUsers === true;',
    'const canAssignRoles = userPermissions?.canAssignRoles === true;',
    'if (!storeDetails?.tenantId || !storeDetails?.storeId || !canManageUsers)',
    'fetchStaffUsers(storeDetails.tenantId, storeDetails.storeId)',
    'const data = await createStaffUser',
    'const response = await updateStaffUser',
    'const response = await removeStaffFromStore',
    'const data = await requestStaffPasswordReset',
    'const data = await forceSignOutStaffUser',
    'userHasCurrentStore(response.user, storeDetails?.storeId)',
  ].forEach((token) => {
    assertIncludes(mobileUsersScreen, token, 'Mobile staff screen parity');
  });

  [
    'saveRoleDefinition',
    'deleteRoleDefinition',
    'DEFAULT_ROLE_IDS.OWNER',
    'PERMISSION_CATEGORIES_CONFIG',
    'PERMISSION_LABELS',
    "surface: 'mobile_roles'",
    'const canAssignRoles = userPermissions?.canAssignRoles === true;',
    'const response = await saveRoleDefinition',
    'const response = await deleteRoleDefinition',
    'disabled={!canAssignRoles || selectedRole.id === DEFAULT_ROLE_IDS.OWNER}',
    'editingRole.id !== DEFAULT_ROLE_IDS.OWNER',
    '<Switch checked={isEnabled} onChange={() => togglePermission(permKey)} />',
  ].forEach((token) => {
    assertIncludes(mobileRolesScreen, token, 'Mobile roles screen parity');
  });

  [
    'STAFF_CLIENT_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'cache: "no-store" as RequestCache',
    'credentials: "same-origin" as RequestCredentials',
    'redirect: "manual" as RequestRedirect',
    'fetch(`/api/staff?${params.toString()}`',
    'fetch("/api/staff"',
    'fetch("/api/staff/password-reset"',
    'fetch("/api/staff/force-signout"',
    'fetch("/api/staff/roles"',
    'fetch(`/api/staff/roles?${params.toString()}`',
    'hasConsistentStaffMutationIdentity',
    'kind === "role_mutation"',
  ].forEach((token) => {
    assertIncludes(staffClient, token, 'Shared staff client parity');
  });

  [
    'Staff/Roles route parity source gate: `npm run verify:staff-roles-route-parity`',
    '`/users` and `/users/list` render the desktop staff list',
    '`/users/permissions` renders the desktop roles/permissions screen',
    '`/users`, `/users/list`, and `/users/permissions` enter `MobileShell` More sub-screens on mobile',
  ].forEach((token) => {
    assertIncludes(mobileSupportDoc, token, 'Roles mobile-support route parity docs');
  });

  [
    '| Staff/Roles route parity source gate | Passed by source verifier: `npm run verify:staff-roles-route-parity` locks desktop aliases, mobile More permission gates, shared client usage, and docs/audit parity. |',
    '| Mobile parity | Passed by code/build/source gates | Mobile staff, roles, More screen, and shell filtering share the same permission contract as desktop. |',
  ].forEach((token) => {
    assertIncludes(verificationDoc, token, 'Roles verification route parity docs');
  });

  [
    'Staff/Roles route parity source gate',
    'verify:staff-roles-route-parity',
    'Browser smoke has not yet been run for `/users/list`, `/users/permissions`, or the mobile Staff/Roles sub-screens.',
  ].forEach((token) => {
    assertIncludes(auditDoc, token, 'Production audit Staff/Roles route parity evidence');
  });
}

verifyStaffRolesRouteParity();
console.log('Staff/Roles route parity verifier passed');
