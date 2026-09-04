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
  const mobileAntd = read('src/components/mobile/antd.tsx');
  const platformGlobalDataProvider = read('src/providers/platformProviders/platformGlobalDataProvider.tsx');
  const staffClient = read('src/lib/staffManagement/client.ts');
  const staffServer = read('src/lib/staffManagement/server.ts');
  const staffConcurrencyBoundary = read('src/lib/staffManagement/concurrencyBoundary.ts');
  const staffFormMappingBoundary = read('src/lib/staffManagement/formMappingBoundary.ts');
  const staffInputBoundary = read('src/lib/staffManagement/inputBoundary.ts');
  const staffScopeBoundary = read('src/lib/staffManagement/scopeBoundary.ts');
  const desktopUsersScreen = read('src/components/templates/main-app/users/usersList/index.tsx');
  const desktopUsersTable = read('src/components/templates/main-app/users/usersList/usersListTable.tsx');
  const desktopSidebar = read('src/components/organisms/sidebar/index.tsx');
  const desktopUserDetails = read('src/components/templates/main-app/users/usersList/userDetailsModal.tsx');
  const desktopRoleDetails = read('src/components/templates/main-app/users/permissions/roleDetailsModal.tsx');
  const desktopRolesScreen = read('src/components/templates/main-app/users/permissions/index.tsx');
  const platformUsers = read('src/components/templates/platform/users/index.tsx');
  const accessStatusRoute = read('src/app/api/auth/access-status/route.ts');
  const mobileSupportDoc = read('__docs__/roles-permissions/roles-permissions_mobile-support.md');
  const verificationDoc = read('__docs__/roles-permissions/roles-permissions_verification.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');

  assert(
    packageJson.scripts?.['verify:staff-roles-route-parity'] === 'node scripts/verification/verify-staff-roles-route-parity.js',
    'package.json must expose verify:staff-roles-route-parity',
  );
  assert(
    read('src/data/shared/defaultRoles.ts') === read('functions/src/sharedData/defaultRoles.ts'),
    'MenuList app and Functions default-role mirrors must remain byte-identical',
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
    'fetchStaffUsers(expectedTenantId, expectedStoreId)',
    'const data = await createStaffUser',
    'const response = await updateStaffUser',
    'const response = await removeStaffFromStore',
    'const data = await requestStaffPasswordReset',
    'const data = await forceSignOutStaffUser',
    'userHasCurrentStore(response.user, expectedStoreId)',
    'const selectedTargetCanBeManaged = selectedUser ? canManageTarget(selectedUser) : false;',
    'canManageStaffTargetForSession',
    'currentUserId: activeSession?.user?.id',
    'disabled={!selectedTargetCanBeManaged || !canAssignRoles || isUpdatingUser}',
    'disabled={!selectedTargetCanBeManaged || (selectedUser as any).active === false}',
    'Use your profile settings to manage your own account.',
    "Owner accounts can only be changed by someone who can assign roles.",
    'disabled={!selectedTargetCanBeManaged}',
    'assignableRoles.map',
    'getMobileStaffTargetFailureCopy',
    "Only an Owner can change an Owner account",
    'return <MobileUsersScreenContent key={scopeKey} {...props} />;',
    'staffMutationInFlightRef.current',
    'latestLoadRequestRef.current',
    'isExpectedStaffScope(expectedTenantId, expectedStoreId)',
    '!isMountedRef.current',
    'item.id === user.id && item === user ? response.user : item',
    'setSelectedUser((current) => current === user ?',
    "const optionalEmailLabel = t('emailLabel').split('*', 1)[0]?.trim() || t('emailLabel');",
    "import { isValidOptionalStaffEmail } from '@lib/staffManagement/inputBoundary';",
    'if (!isValidOptionalStaffEmail(submittedEmail))',
    "Toast.show({ content: 'Invalid email address', duration: 1800 });",
    'aria-label={t(\'name\')}',
    'aria-label={optionalEmailLabel}',
    'aria-label={t(\'phone\')}',
    'aria-label={t(\'addStaffMember\')}',
    'aria-label="Staff details"',
    "aria-label={staffLoginDetails?.title || 'Staff login details'}",
    'aria-pressed={newUserRole === role.id}',
    'isMountedRef.current = true;',
    '<Text type="secondary">{optionalEmailLabel}</Text>',
  ].forEach((token) => {
    assertIncludes(mobileUsersScreen, token, 'Mobile staff screen parity');
  });
  [
    'export const optionalStaffEmailSchema = z.string()',
    'export const isValidOptionalStaffEmail',
    "'Invalid email address'",
  ].forEach((token) => {
    assertIncludes(staffInputBoundary, token, 'Shared Staff email boundary');
  });
  assertIncludes(staffServer, 'email: optionalStaffEmailSchema,', 'Staff server shared email boundary');
  assert(
    !mobileUsersScreen.includes('|| (user as any).active === false\n            || !canManageTarget(user)'),
    'Mobile staff activation must not reject an already inactive account before the owner can reactivate it',
  );
  assert(
    !mobileUsersScreen.includes('setUsersList([...users, data.user])'),
    'Mobile staff creation must not replace current scope truth from a captured list',
  );
  assert(
    !mobileUsersScreen.includes('setUsersList(users.map('),
    'Mobile staff mutations must not replace current scope truth from a captured list',
  );
  assert(
    (mobileUsersScreen.match(/!isMountedRef\.current/g) || []).length >= 6,
    'Every Mobile staff mutation must reject admission after its mounted scope is obsolete',
  );
  assertIncludes(
    platformGlobalDataProvider,
    'usersList: StaffUserSummary[] | null;',
    'Global staff-list DTO contract',
  );
  assertIncludes(
    platformGlobalDataProvider,
    'setUsersList: Dispatch<SetStateAction<StaffUserSummary[] | null>>;',
    'Global staff-list setter contract',
  );

  [
    'saveRoleDefinition',
    'DEFAULT_ROLE_IDS.OWNER',
    'PERMISSION_CATEGORIES_CONFIG',
    'PERMISSION_LABELS',
    "surface: 'mobile_roles'",
    'const canAssignRoles = userPermissions?.canAssignRoles === true;',
    'const response = await saveRoleDefinition',
    'disabled={!canAssignRoles || selectedRole.id === DEFAULT_ROLE_IDS.OWNER}',
    '<Switch aria-label={PERMISSION_LABELS[permKey as PermissionKey] || permKey} checked={isEnabled} onChange={() => togglePermission(permKey)} />',
    'return <MobileRolesScreenContent key={scopeKey} {...props} />;',
    'roleMutationInFlightRef.current',
    'currentStoreDetails?.tenantId === expectedTenantId',
    'currentStoreDetails?.storeId === expectedStoreId',
    'currentStoreDetails?.roles === sourceStoreDetails.roles',
    'if (!isMountedRef.current) return;',
    'isMountedRef.current = true;',
    "aria-label={editingRole && roles.some((role: StoreRoleDataType) => role.id === editingRole.id) ? t('editRole') : t('newRole')}",
    "aria-label={t('roleName')}",
    "aria-label={`${category.label}: ${t('all')}`}",
    "style={{ alignItems: 'center', display: 'inline-flex', minHeight: 44, minWidth: 44 }}",
    "<span className=\"sr-only\"> — {isEnabled ? t('active') : t('inactive')}</span>",
  ].forEach((token) => {
    assertIncludes(mobileRolesScreen, token, 'Mobile roles screen parity');
  });
  assert(
    !mobileRolesScreen.includes('onClick={() => togglePermission(permKey)}'),
    'Mobile role permission rows must not nest an interactive switch inside an interactive row',
  );
  [
    'deleteRoleDefinition',
    'deleteThisRole',
    'mobile_staff_role_delete_failed',
  ].forEach((token) => {
    assert(!mobileRolesScreen.includes(token), `Mobile roles must not retain the misleading soft-delete control: ${token}`);
  });
  assertIncludes(
    mobileAntd,
    '<AntCheckbox aria-label={ariaLabel}',
    'Shared mobile checkbox accessible-name forwarding',
  );
  assert(
    !mobileRolesScreen.includes('setStoreDetails({ ...storeDetails, roles: response.roles })'),
    'Mobile roles must not replace generic captured store context after an awaited mutation',
  );

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
    'value.users.every(isStaffUserSummaryResponse)',
    'value.stores.every(isStaffStoreOptionResponse)',
    'value.roles.every(isRoleDefinitionResponse)',
    'hasConsistentStaffMutationIdentity',
    'isCreateStaffCompatibilityVerificationResponse',
    'value.mode === "existing_user_auth_bound"',
  ].forEach((token) => {
    assertIncludes(staffClient, token, 'Shared staff response shape boundary');
  });

  [
    'staffTargetHasOwnerAccess',
    'canManageStaffTarget',
    'canManageStaffTargetForSession',
    'value.ownerProtected === true',
  ].forEach((token) => {
    assertIncludes(staffScopeBoundary, token, 'Owner-target permission boundary');
  });
  [
    'OWNER_MANAGEMENT_FORBIDDEN',
    '"staff_add_store"',
    '"staff_update"',
    '"staff_remove"',
    '"staff_password_reset"',
    '"staff_force_signout"',
    'assertOwnerTargetMutationAllowed(authority, currentData)',
    'assertOwnerTargetMutationAllowed(authority, freshData)',
    'const sessionUserId = resolveCurrentSessionUserDocumentId(session);',
    'revokeStaffFirebaseRefreshTokensAfterCommit',
    'const repair = await runStaffRoleMutationTransaction({',
    'mode: "existing_user_auth_bound"',
    'mutation: { kind: "upsert", mapping: stores[0], verified: true }',
    'staff_existing_user_auth_bound',
    'staff_verify_auth_compensation_failed',
    'staff_password_setup_metadata_write_failed',
    'PASSWORD_RESET_EMAIL_REQUEST_FAILED',
    'AbortSignal.timeout(STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS)',
    'AUTH_BINDING_INVALID',
    'const STAFF_EMAIL_QUERY_LIMIT = 2;',
    '.limit(STAFF_EMAIL_QUERY_LIMIT)',
    'existingUserQuery.size > 1',
    '"EMAIL_RECORD_AMBIGUOUS"',
    '? jsonError("This email is already registered in the auth system", 409, "EMAIL_EXISTS")',
    ': jsonError("Could not reserve a Staff ID. Please try again.", 409, "STAFF_LOGIN_COLLISION")',
    'const MAX_STAFF_STORE_MAPPINGS = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1;',
    'stores: z.array(StoreMappingSchema).min(1).max(MAX_STAFF_STORE_MAPPINGS).optional()',
    '.where("active", "==", true)',
    '.limit(STAFF_TENANT_STORE_QUERY_LIMIT)',
    'if (snapshot.size > MAX_STAFF_STORE_MAPPINGS)',
    'rawStoreOptionDocs.unshift(targetStore);',
    'throw new Error("STAFF_TENANT_STORE_LIMIT_EXCEEDED")',
  ].forEach((token) => {
    assertIncludes(staffServer, token, 'Staff owner/auth/concurrency boundary');
  });
  assert(!staffServer.includes('if (concurrencyResponse && error instanceof StaffConcurrencyError && error.code === "USER_ALREADY_EXISTS")'), 'Created Auth users must be compensated after every failed first Firestore create');
  assertIncludes(
    staffConcurrencyBoundary,
    "| { kind: 'upsert'; mapping: UserStoreMappingType; verified?: boolean }",
    'Existing-user Auth verification mapping upsert boundary',
  );
  [
    'isCreateStaffCompatibilityVerificationResponse(',
    'userModal.id,',
    'userModal.email,',
    'setAllTenantUsers((current)',
    'Could not verify this user. Review the email and account state, then try again.',
  ].forEach((token) => {
    assertIncludes(platformUsers, token, 'Platform verification acknowledgement boundary');
  });
  assert(!platformUsers.includes('isCreateStaffCompatibilityEmailExistsResponse'), 'Platform verification must reject orphan Auth email collisions');
  assert(!platformUsers.includes('await updateUser(updatedUser);'), 'Platform verification must not mark the client user verified after a generic compatibility response');
  [
    'canManageTarget={canManageTarget}',
    'canEdit={canManageTarget(userDetailsModal.data)}',
    'if (!canManageTarget(user)) return;',
    'canManageStaffTargetForSession',
    'currentUserId: activeSession?.user?.id',
  ].forEach((token) => {
    assertIncludes(desktopUsersScreen, token, 'Desktop owner-target UI boundary');
  });
  assertIncludes(desktopUsersTable, 'disabled={!targetCanBeManaged || mutationPending}', 'Desktop owner-target table actions');
  assertIncludes(
    desktopUsersTable,
    'disabled={!targetCanBeManaged || mutationPending || record.active === false}',
    'Desktop inactive-staff passcode reset boundary',
  );
  assertIncludes(
    desktopUsersScreen,
    'pendingStaffActionRef.current || user.active === false || !canManageTarget(user)',
    'Desktop inactive-staff passcode handler boundary',
  );
  assertIncludes(
    desktopSidebar,
    '}) && canShowNavForPermissions(nav);',
    'Desktop Growth Kits navigation permission boundary',
  );
  [
    'aria-label={`Edit ${staffName}`}',
    'aria-label={`View ${staffName} details`}',
    'aria-label={`Create temporary passcode for ${staffName}`}',
    'aria-label={`Sign out ${staffName}`}',
    'aria-label={`Remove ${staffName}`}',
  ].forEach((token) => assertIncludes(desktopUsersTable, token, 'Desktop staff action accessible names'));
  [
    'aria-label={`Select ${role.name} role`}',
    'aria-pressed={activeRole?.id === role.id}',
    'role="button"',
    "event.key !== 'Enter' && event.key !== ' '",
    'tabIndex={0}',
    'aria-label="Add Custom Role"',
    'tabIndex={canAssignRoles ? 0 : -1}',
  ].forEach((token) => assertIncludes(desktopRolesScreen, token, 'Desktop role-card keyboard contract'));
  assertIncludes(desktopUserDetails, 'disabled={!canEdit || !modalData.data}', 'Desktop owner-target detail edit action');
  [
    'mergeLoadedStaffStoreForCurrentTenant',
    'mergeStaffRolesForCurrentStore',
    'currentStore.roles === sourceRoles',
    "role: ''",
  ].forEach((token) => {
    assertIncludes(staffFormMappingBoundary, token, 'Desktop staff context-settlement boundary');
  });
  [
    'mergeStaffRolesForCurrentStore(',
    'const sourceRoles = storeDetails.roles;',
    'setStoreDetails((currentStore)',
  ].forEach((token) => {
    assertIncludes(desktopRoleDetails, token, 'Desktop role-save context settlement');
    assertIncludes(desktopRolesScreen, token, 'Desktop role-deactivation context settlement');
  });
  [
    'permissions: normalizeRolePermissions(',
    'Object.values(role.permissions).every',
  ].forEach((token, index) => {
    assertIncludes(index === 0 ? staffServer : staffClient, token, 'Staff store role-permission DTO boundary');
  });
  [
    'return invalidAccess(request, session, "TENANT_DELETED"',
    'return invalidAccess(request, session, "TENANT_INACTIVE"',
    'return invalidAccess(request, session, "STORE_DELETED"',
    'return invalidAccess(request, session, "STORE_INACTIVE"',
  ].forEach((token) => {
    assertIncludes(accessStatusRoute, token, 'Staff session entity lifecycle boundary');
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
    '| Mobile parity | Passed by source/type gates | Mobile staff, roles, More screen, and shell filtering share desktop contracts. Hosted iOS/Android/PWA interaction remains pending. |',
  ].forEach((token) => {
    assertIncludes(verificationDoc, token, 'Roles verification route parity docs');
  });

  [
    'Staff/Roles route parity source gate',
    'verify:staff-roles-route-parity',
    'Hosted browser/device smoke has not yet been run for `/users/list`, `/users/permissions`, or the mobile Staff/Roles sub-screens.',
  ].forEach((token) => {
    assertIncludes(auditDoc, token, 'Production audit Staff/Roles route parity evidence');
  });
}

verifyStaffRolesRouteParity();
console.log('Staff/Roles route parity verifier passed');
