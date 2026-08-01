#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, token, label) {
  assert(source.includes(token), `${label} must include ${token}`);
}

function assertNotIncludes(source, token, label) {
  assert(!source.includes(token), `${label} must not include ${token}`);
}

function assertOrder(source, tokens, label) {
  let lastIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, lastIndex + 1);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function verifyPackageScript(packageJson) {
  [
    '"verify:reseller-dashboard-boundary": "node scripts/verification/verify-reseller-dashboard-boundary.js"',
    '"test:reseller-client-record":',
    '"test:reseller-management-profile":',
    '"test:reseller-monthly-summary":',
    '"test:reseller-mutation-state":',
    '"test:reseller-profile-admission:emulator":',
    '"test:reseller-provider-subscription":',
    '"test:reseller:rules":',
    '"test:reseller-confirm-payment-boundary":',
    '"test:reseller-confirm-payment:emulator":',
    '"test:reseller-onboarding-boundary":',
    '"test:reseller-onboarding-billing:emulator":',
  ].forEach((token) => assertIncludes(packageJson, token, 'Root package scripts'));
}

function verifyReadRateLimit(helper) {
  [
    "export const RESELLER_PRIVATE_RESPONSE_HEADERS = {",
    "'Cache-Control': 'private, no-store'",
    "'X-Content-Type-Options': 'nosniff'",
    'export const resellerPrivateJson = (',
    'const headers = new Headers(init.headers);',
    'Object.entries(RESELLER_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {',
    'headers.set(name, value);',
    'return NextResponse.json(body, {',
    'headers,',
    "getRateLimitForFeature('DATA_READ')",
    'const userId = resolveCurrentSessionUserDocumentId(session);',
    'if (!userId)',
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'const resellerProfileRateLimitHash = hashPublicRateLimitValue(resellerProfileId);',
    'key: `reseller-read:${routeKey}:${userRateLimitHash}:${resellerProfileRateLimitHash}`',
    "'Retry-After': String(waitSeconds)",
    "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
    "'X-RateLimit-Remaining': String(rateLimit.remaining)",
    'export const withResellerPrivateHeaders = <T extends NextResponse>(response: T): T => {',
    'failClosedOnProviderError: true',
    "rateLimit.reason === 'provider_unavailable'",
    "status: rateLimit.reason === 'provider_unavailable' ? 503 : 429",
  ].forEach((token) => assertIncludes(helper, token, 'Reseller read rate limiter'));

  [
    'request.json()',
    "session?.uId || session?.user?.id || 'unknown'",
    'key: `reseller-read:${routeKey}:${userId}',
    'key: `reseller-read:${routeKey}:${resellerProfileId}',
    '...Object.fromEntries(new Headers(init.headers).entries())',
  ].forEach((token) => assertNotIncludes(helper, token, 'Reseller read rate limiter boundary'));
}

function verifyCommonMutationRoute(route, routeLabel, schemaName, rateLimitKey) {
  [
    "export const dynamic = 'force-dynamic';",
    'FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD',
    "getRateLimitForFeature('DATA_WRITE')",
    'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
    `key: \`${rateLimitKey}:\${resellerRateLimitHash}\``,
    'failClosedOnProviderError: true',
    "rateLimitResult.reason === 'provider_unavailable'",
    "status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429",
    'withResellerPrivateHeaders',
    'return resellerPrivateJson(',
    'if (bodyResult.ok === false) return withResellerPrivateHeaders(bodyResult.response);',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    `validateAPIInput(${schemaName}, bodyResult.data)`,
    'getBoundedResellerApiStringContext',
    'logResellerApiFailure',
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(route, token, routeLabel));

  assertOrder(route, [
    'FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD',
    "getRateLimitForFeature('DATA_WRITE')",
    'const rateLimitResult = await checkRateLimit({',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    `validateAPIInput(${schemaName}, bodyResult.data)`,
  ], `${routeLabel} admission order`);

  [
    'request.json()',
    'console.error',
    'error.message',
    'NextResponse.json',
    `key: \`${rateLimitKey}:\${resellerId}\``,
  ].forEach((token) => assertNotIncludes(route, token, `${routeLabel} boundary`));
}

function verifyManageRoute(route) {
  [
    "export const dynamic = 'force-dynamic';",
    'GET /api/reseller/manage',
    'POST /api/reseller/manage',
    "requiredPlatformRole: 'PLATFORM'",
    'resellerPrivateJson',
    'from "../readRateLimit"',
    'applyResellerReadRateLimit(session, "manage")',
    'const persistedProfiles = await getAllResellerProfiles();',
    '.slice(0, 50)',
    '.map(projectResellerManagementProfile)',
    'const invalidProfileCount = projectedProfiles.length - profiles.length;',
    'isCapped: persistedProfiles.length > 50',
    'isPartial: persistedProfiles.length > 50 || invalidProfileCount > 0',
    'const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;',
    "getRateLimitForFeature('DATA_WRITE')",
    'const userRateLimitHash = hashPublicRateLimitValue(session.user.id);',
    'key: `reseller-manage:${userRateLimitHash}`',
    'failClosedOnProviderError: true',
    "rateLimitResult.reason === 'provider_unavailable'",
    "status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429",
    'ReturnType<typeof resellerPrivateJson> | null',
    'if (bodyResult.ok === false) return withResellerPrivateHeaders(bodyResult.response);',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(UpdateResellerSchema, body)',
    'validateAPIInput(CreateResellerSchema, body)',
    'isValidFirestoreDocumentId',
    "profileId: z.string().min(1).max(128).refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid profile ID')",
    'assertResellerUniqueness(',
    "catch((error: unknown): null => {",
    'createResellerProfile({',
    'updateResellerProfile({',
    'getResellerProfileAdmissionConflict(error)',
    'restoreExistingResellerLoginAccount(syncedAccount.rollback)',
    'await authAdmin.createUser({',
    'await authAdmin.updateUser(uid, updatePayload);',
    'await authAdmin.setCustomUserClaims(uid, {',
    "platformRole: 'RESELLER'",
    'const resellerProfileId = params.resellerProfileId || uid;',
    'resellerProfileId,',
    'resellerProfileId: profileId',
    'cleanupCreatedResellerLoginAccount(db, syncedAccount.uid)',
    'authUserId: existingAuthUser?.uid',
    'getResellerUserWrite({',
    'const { password: _password, ...profileUpdates } = updates;',
    'password: admin.firestore.FieldValue.delete()',
    'if (updates.password && !syncedAccount.createdAuthUser)',
    "logResellerApiFailure('reseller_manage_post_route_failed'",
  ].forEach((token) => assertIncludes(route, token, 'Reseller management API'));

  assertOrder(route, [
    'export const GET = withAuth(async (request, session) => {',
    'applyResellerReadRateLimit(session, "manage")',
    'return resellerPrivateJson({',
    "logResellerApiFailure('reseller_manage_get_route_failed'",
    "return resellerPrivateJson({ error: 'Failed to fetch reseller profiles.' }, { status: 500 });",
    'export const POST = withAuth(async (request, session) => {',
  ], 'Reseller management private GET response boundary');

  assertOrder(route, [
    "getRateLimitForFeature('DATA_WRITE')",
    'const rateLimitResult = await checkRateLimit({',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'const isUpdate = (',
    'validateAPIInput(UpdateResellerSchema, body)',
  ], 'Reseller management update admission order');

  assertOrder(route, [
    'const isUpdate = (',
    '} else {',
    'validateAPIInput(CreateResellerSchema, body)',
    'assertResellerUniqueness(db, email, username)',
    'syncResellerLoginAccount({',
    'createResellerProfile({',
  ], 'Reseller management create admission order');

  [
    'ECOMSAI_PLATFORM_PASSWORD',
    'request.json()',
    'console.error',
    'error.message',
    'NextResponse.json',
    'key: `reseller-manage:${session.user.id}`',
    "profileId: z.string().trim().min(1).max(128).refine(isValidFirestoreDocumentId, 'Invalid profile ID')",
    "profileId: z.string().trim().min(1).max(128).refine((value) => !value.includes('/'))",
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller management API boundary'));
}

function verifyManagementProfileBoundary(
  resellerServer,
  resellerProfileRecord,
  managementProfile,
  managementProfileTest,
) {
  [
    '.limit(51)',
    '.filter((doc) => doc.data()?.deleted !== true)',
    'ResellerProfileDocument[]',
  ].forEach((token) => assertIncludes(resellerServer, token, 'Reseller management query boundary'));
  [
    'projectResellerProfileRecord(docSnap.id, docSnap.data())',
    'Promise<ResellerProfileRecord | null>',
  ].forEach((token) => assertIncludes(resellerServer, token, 'Reseller profile persisted record boundary'));
  [
    'export const projectResellerProfileRecord =',
    "typeof value.active !== 'boolean'",
    'isNonNegativeSafeInteger(value[field])',
    'isTimestampValue(fieldValue)',
    'value.deleted === true',
  ].forEach((token) => assertIncludes(resellerProfileRecord, token, 'Reseller profile persisted record boundary'));
  assertNotIncludes(
    resellerServer,
    'return { ...data, id: docSnap.id } as ResellerProfile;',
    'Reseller profile persisted record boundary',
  );

  [
    'export type ResellerManagementProfile',
    'export type ResellerManagementProfilesResponse',
    'projectResellerManagementProfile',
    'isValidFirestoreDocumentId(value.id)',
    'isPositiveSafeInteger(value.maxOfflineActivations)',
    'isNonNegativeSafeInteger(value.totalRevenueCollectedPaise)',
    'Object.keys(value).every((key) => PROFILE_KEYS.has(key))',
    'value.profiles.length <= 50',
    'value.isPartial === (value.isCapped || value.invalidProfileCount > 0)',
  ].forEach((token) => assertIncludes(managementProfile, token, 'Reseller management profile boundary'));

  [
    'assert.equal("password" in projected, false);',
    'assert.equal("authUserId" in projected, false);',
    'totalTransactions: -1',
    'totalRevenueCollectedPaise: 1.5',
    'maxOfflineActivations: "20"',
    'profiles: [{ ...projected, authUserId: "private-auth-user" }]',
    'isCapped: true',
  ].forEach((token) => assertIncludes(
    managementProfileTest,
    token,
    'Reseller management profile regression',
  ));
}

function verifyProfileAdmissionTransaction(resellerServer, profileAdmissionEmulatorTest) {
  [
    'export class ResellerProfileAdmissionError extends Error',
    'claimedProfileId?: string | null',
    '.doc(normalizedClaim)',
    '.where("authUserId", "==", userId)',
    'claimedProfile?.email.toLowerCase().trim() === normalizedEmail',
    'profile.email.toLowerCase().trim() === normalizedEmail',
    'return matchingProfiles.length === 1 ? matchingProfiles[0] : null;',
    'createResellerProfileServer',
    'updateResellerProfileServer',
    'firestoreAdmin.runTransaction(async (transaction) =>',
    'transaction.get(emailQuery)',
    'transaction.get(usernameQuery)',
    'transaction.get(capQuery)',
    'transaction.create(profileRef, sanitizeForAdminFirestore(params.profile));',
    'transaction.set(userRef, sanitizeForAdminFirestore(params.user), { merge: true });',
    'transaction.set(profileRef, sanitizeForAdminFirestore(params.updates), { merge: true });',
  ].forEach((token) => assertIncludes(resellerServer, token, 'Reseller profile admission transaction'));

  [
    'Promise.allSettled(',
    'getResellerProfileAdmissionConflict(result.reason), "username"',
    'getResellerProfileAdmissionConflict(result.reason), "total-cap"',
    'updateResellerProfileServer({',
    'assert.equal(updateResults.filter((result) => result.status === "fulfilled").length, 1);',
    'getResellerProfileServer(`${prefix}-actor-b`, legacyEmail, legacyProfileB)',
    'getResellerProfileServer(`${prefix}-unknown`, legacyEmail)',
    'deletedDirectProfile',
    'await getResellerProfileServer(`${prefix}-actor-b`, legacyEmail, legacyProfileB)',
    'same-email legacy rows must not starve the exact authenticated reseller lookup',
  ].forEach((token) => assertIncludes(
    profileAdmissionEmulatorTest,
    token,
    'Reseller profile admission emulator regression',
  ));
}

function verifyResellerUsernameLogin(
  manageRoute,
  loginIdentifiers,
  serverUserContext,
  authConfig,
  usersDal,
  profileAdmissionEmulatorTest,
) {
  [
    'LOGIN_USERNAME_PATTERN',
    'z.string().trim().toLowerCase().min(3).max(50).regex(LOGIN_USERNAME_PATTERN)',
  ].forEach((token) => assertIncludes(manageRoute, token, 'Reseller username write boundary'));

  [
    'export const LOGIN_USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,49}$/;',
    'export const normalizeLoginUsername =',
  ].forEach((token) => assertIncludes(loginIdentifiers, token, 'Login username normalization'));

  [
    'const loginUsername = normalizeLoginUsername(normalizedIdentifier);',
    "if (loginUsername) lookupPairs.push(['username', loginUsername]);",
  ].forEach((token) => assertIncludes(serverUserContext, token, 'Server username login lookup'));

  [
    'const loginUsername = normalizeLoginUsername(loginIdentifier);',
    'if (!loginUsername && phoneUsername.length < 10)',
    'dbUser = await getAuthUserByLoginIdentifier(loginIdentifier);',
  ].forEach((token) => assertIncludes(authConfig, token, 'Credential username admission'));

  [
    'const loginUsername = normalizeLoginUsername(normalizedIdentifier);',
    "getFirstUserByField('username', loginUsername)",
  ].forEach((token) => assertIncludes(usersDal, token, 'Browser username lookup'));

  assertIncludes(
    profileAdmissionEmulatorTest,
    'getAuthUserByLoginIdentifier(" RESELLER_RAHUL ")',
    'Reseller username login emulator regression',
  );
}

function verifyOnboardRoute(route, ownerClaim, resellerServer, resellerLedger, onboardingOperation, profileAuthority, onboardingBoundaryTest, onboardingEmulatorTest) {
  verifyCommonMutationRoute(route, 'Reseller onboarding API', 'ResellerOnboardSchema', 'reseller-onboard');

  [
    'compensateFailedTenantStoreOnboarding({',
    'reason: params.reason',
    'source: "RESELLER_ONBOARDING"',
    "platformRole: 'OWNER'",
    'await revalidateMenuCache(params.storeId, { tId: params.tenantId });',
    'preCheckSubdomain(db, businessName)',
    'normalizePhoneNumberForStorage({',
    'assertOwnerLoginIsAvailable({',
    'prepareOwnerAuthUser({',
    'result = await db.runTransaction(async (transaction) => {',
    'readResellerOwnerClaimInTransaction({',
    'data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>',
    'transaction.update(ownerClaim.ref, removeUndefinedFields({',
    'createTenantStoreInTransaction(transaction, db, {',
    "onboardingSource: 'RESELLER_ONBOARDING'",
    'await authAdmin.deleteUser(authAccount.uid);',
    'if (await canDeleteCreatedResellerAuthUser(db, authAccount.uid)) {',
    'error instanceof ResellerOwnerClaimConflictError',
    'await authAdmin.setCustomUserClaims(result.authUid, {',
    'await revalidateMenuCache(result.storeId, { tId: result.tenantId });',
    'getOrCreateRazorpayPlan({',
    'razorpayClient.subscriptions.create({',
    'getFirebaseAuthErrorCode(error)',
    "catch((error: unknown): null => {",
    '.catch((): null => null)',
    'await compensateResellerOnboardingFailure({',
    'createResellerOnboardingBilling({',
    'getResellerOnboardingOperationFingerprint({',
    'isMatchingResellerOnboardingOperation({',
    'normalizeRazorpaySubscriptionCheckoutUrl(replaySubscription.shortUrl)',
    'projectResellerProviderSubscription(providerSubscription)',
    "throw new Error('Razorpay subscription response is invalid.')",
    'const replayPaidAt = resellerMutationDate(operation.validFrom);',
    'isMatchingResellerOnboardingReplayResources({',
    'projectResellerOfflineCapacity(',
    'error: "Reseller profile capacity needs support review."',
    'offlineCapacity.current >= offlineCapacity.cap',
    'paidAt: replayPaidAt,',
    "status: replaySubscription.status === 'active' ? 'active' : 'pending'",
    'const transactionId = operationId;',
    "subscriptionId = `manual_${operationId}`;",
    "'reseller_offline_cap_rejected'",
    'getResellerOfflineCapFromError(persistenceError)',
    'profileRevenueRecognized: false',
    'profileRevenueRecognized: true',
    'isActiveResellerProfileForSession({',
    'getCurrentPlatformUser(session)',
    "billingMode: 'auto'",
    "billingMode: 'manual'",
    'manualPaymentConfirmed: true',
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-onboard-offline'",
    "action: 'ONBOARD'",
    "status: 'pending_payment'",
    "logResellerApiFailure('reseller_onboard_route_failed'",
  ].forEach((token) => assertIncludes(route, token, 'Reseller onboarding API'));

  assertOrder(route, [
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(ResellerOnboardSchema, bodyResult.data)',
    'getResellerProfile(',
    'preCheckSubdomain(db, businessName)',
    'assertOwnerLoginIsAvailable({',
    'prepareOwnerAuthUser({',
    'result = await db.runTransaction(async (transaction) => {',
    'readResellerOwnerClaimInTransaction({',
    'createTenantStoreInTransaction(transaction, db, {',
    'await authAdmin.setCustomUserClaims(result.authUid, {',
    'await revalidateMenuCache(result.storeId, { tId: result.tenantId });',
  ], 'Reseller onboarding local account/store admission order');

  [
    'const snapshot = await transaction.get(ref);',
    "if (snapshot.exists) throw new ResellerOwnerClaimConflictError();",
    "if (!snapshot.exists) throw new ResellerOwnerClaimConflictError();",
    'storedEmail !== expectedEmail',
    'storedFirebaseUid && storedFirebaseUid !== authUid',
    '|| hasTenant',
    '|| hasStore',
    "return !(await db.collection(DB_COLLECTIONS.USERS).doc(normalizedUserId).get()).exists;",
  ].forEach((token) => assertIncludes(ownerClaim, token, 'Reseller owner claim transaction boundary'));
  assertOrder(route, [
    'projectResellerOfflineCapacity(',
    'await writeLogEntry({',
    'preCheckSubdomain(db, businessName)',
    'prepareOwnerAuthUser({',
  ], 'Reseller offline capacity preflight before owner/store side effects');
  [
    'const currentStores = Array.isArray(existingOwnerData?.stores)',
    'transaction.update(existingOwnerDoc.ref',
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller stale owner snapshot write'));

  assertOrder(route, [
    'getOrCreateRazorpayPlan({',
    'razorpayClient.subscriptions.create({',
    'await compensateResellerOnboardingFailure({',
    'throw providerError;',
  ], 'Reseller online provider compensation order');

  [
    'createResellerOnboardingBillingServer',
    'firestoreAdmin.runTransaction(async (firestoreTransaction) =>',
    'firestoreTransaction.create(\n            subscriptionRef,',
    'firestoreTransaction.create(transactionRef,',
    'currentActiveOfflineStores >= cap',
    'profile.authUserId !== params.transaction.resellerId',
    'isNonNegativeSafeInteger(params.transaction.amountExpected)',
    'addNonNegativeSafeIntegers(\n                totalRevenueCollectedPaise,',
    'totalRevenueCollectedPaise: nextRevenue',
    'const existingScope = getMenuListSubscriptionEntitlementScope(existingSubscription);',
    'existingScope?.tenantId !== params.transaction.tenantId',
    'existingScope.storeId !== params.transaction.storeId',
    'existingSubscription.providerSubscriptionId !== params.subscriptionId',
  ].forEach((token) => assertIncludes(resellerServer, token, 'Reseller onboarding billing transaction'));

  [
    'db.runTransaction(async (transaction) =>',
    '.where("profileRevenueRecognized", "==", false)',
    'data?.profileRevenueRecognized === false',
    'data.paymentMode === "online"',
    'data.subscriptionId === subscriptionId',
    'profile.authUserId === row.resellerId',
    'addNonNegativeSafeIntegers(nextRevenue, row.amount)',
    'totalRevenueCollectedPaise: nextRevenue',
    'recognized ? { profileRevenueRecognized: true }',
    'status: "active"',
  ].forEach((token) => assertIncludes(resellerLedger, token, 'Reseller payment ledger convergence'));

  [
    "createHash('sha256')",
    'input.ownerPassword',
    "data.action === 'ONBOARD'",
    'data.operationFingerprint === params.fingerprint',
    "typeof data.storeId === 'number'",
    'Number.isSafeInteger(data.storeId)',
    "typeof data.tenantId === 'number'",
    'subscriptionScope?.storeId === params.storeId',
    'subscription.resellerId === params.resellerId',
    'storeTenantScope?.numericId === params.tenantId',
    'isMenuListPublicEntityEligible(store)',
  ].forEach((token) => assertIncludes(onboardingOperation, token, 'Reseller onboarding operation boundary'));

  [
    'profileEmail !== sessionEmail',
    'sessionProfileId !== profileId',
    'actorId === authUserId',
    'profile.deleted === true',
  ].forEach((token) => assertIncludes(profileAuthority, token, 'Reseller profile authority boundary'));

  [
    "ownerPassword: 'changed-password'",
    'sessionProfileId: \'different_profile\'',
    "operationData: { ...operation, storeId: '41' }",
    "storeData: { ...replayStore, active: false }",
    "subscriptionData: { ...replaySubscription, resellerId: 'another-reseller' }",
  ].forEach((token) => assertIncludes(onboardingBoundaryTest, token, 'Reseller onboarding pure regression'));

  [
    'assert.equal(first.replayed, false)',
    'assert.equal(replay.replayed, true)',
    'getResellerOfflineCapFromError(error) === 1',
    'markResellerTransactionsActiveForSubscription(onlineSubscriptionId',
    "assert.equal(onlineLedger?.profileRevenueRecognized, true)",
    "assert.equal((await nonOnlineTransactionRef.get()).data()?.status, 'pending_payment')",
    "assert.equal((await repairTransactionRef.get()).data()?.profileRevenueRecognized, false)",
    "assert.equal((await repairTransactionRef.get()).data()?.profileRevenueRecognized, true)",
    "assert.equal((await foreignProfileRef.get()).data()?.totalRevenueCollectedPaise, 0)",
    "amountExpected: '40000'",
    "/profile counters are invalid/",
    "/profile counters would overflow/",
    "/profile identity is invalid/",
    'A replay must reject transaction-current conflicting subscription ownership',
  ].forEach((token) => assertIncludes(onboardingEmulatorTest, token, 'Reseller onboarding emulator regression'));
  [
    'let razorpaySubscription: any',
    'catch (error: any)',
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller onboarding typed boundary'));
}

function verifyConfirmPaymentRoute(route, boundary, subscriptionServer, boundaryTest, emulatorTest) {
  verifyCommonMutationRoute(route, 'Reseller confirm-payment API', 'ResellerConfirmPaymentSchema', 'reseller-confirm-payment');

  [
    'getCurrentPlatformUser(session)',
    'getResellerProfile(',
    'isActiveResellerProfileForSession({',
    'confirmManualSubscriptionPayment({',
    "confirmation.kind === 'not_found'",
    "confirmation.kind === 'forbidden'",
    "confirmation.kind === 'invalid_state'",
    "confirmation.kind === 'malformed'",
    "logger.security('Reseller Confirm Payment - Unauthorized Access'",
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-confirm-payment'",
    'alreadyConfirmed: confirmation.alreadyConfirmed',
    'markResellerTransactionsActiveForSubscription(',
  ].forEach((token) => assertIncludes(route, token, 'Reseller confirm-payment API'));

  [
    'getSubscriptionById',
    'updateSubscription(',
    'Timestamp.now()',
    '...subscription.statuses',
    'bodyResult.data as any',
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller confirm-payment API'));

  [
    "data.billingMode !== 'manual'",
    "data.status === 'active' && data.manualPaymentConfirmed === true",
    "data.status !== 'pending'",
    'normalizeRequiredScopeAliases(data.tenantId, data.tId)',
    'normalizeRequiredScopeAliases(data.storeId, data.sId)',
    "currency !== 'INR'",
    'Number.isSafeInteger(amount)',
    'statuses.length >= MAX_MANUAL_PAYMENT_STATUS_HISTORY',
    'data.pId !== DEFAULT_PRODUCT_ID || data.productId !== DEFAULT_PRODUCT_ID',
  ].forEach((token) => assertIncludes(boundary, token, 'Manual subscription confirmation boundary'));

  [
    'runTransaction<ManualSubscriptionPaymentConfirmationResult>',
    'const snapshot = await transaction.get(subscriptionRef);',
    'admitManualSubscriptionConfirmation({',
    'transaction.set(subscriptionRef',
    "alreadyConfirmed: admission.kind === 'already_confirmed'",
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'Manual subscription confirmation transaction'));

  [
    "['active', 'cancelled', 'completed', 'expired', 'past_due']",
    "manualPaymentConfirmed: 'true'",
    "pId: 'AL'",
    'statuses: Array.from({ length: 200 }',
  ].forEach((token) => assertIncludes(boundaryTest, token, 'Manual subscription confirmation regression'));
  [
    'Promise.all(Array.from({ length: 8 }',
    'result.alreadyConfirmed === false',
    'result.alreadyConfirmed === true',
    'stored?.statuses.length, 1',
  ].forEach((token) => assertIncludes(emulatorTest, token, 'Manual subscription confirmation emulator regression'));
}

function verifyRenewRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller renew API', 'ResellerRenewSchema', 'reseller-renew');

  [
    'getResellerProfile(',
    'getCurrentPlatformUser(session)',
    'isActiveResellerProfileForSession({',
    "paymentMode !== 'offline'",
    'Online subscriptions auto-renew via Razorpay',
    'RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE',
    ".where('billingMode', '==', 'manual')",
    ".where('tId', '==', tenantId)",
    ".where('sId', '==', storeId)",
    'const currentScope = getMenuListSubscriptionEntitlementScope(currentSubscription);',
    'currentScope.tenantId !== tenantId',
    'currentScope.storeId !== storeId',
    'existingSubData.resellerId !== resellerId && !isPlatformUser',
    "logger.security('Reseller Renew - Unauthorized Access'",
    'const renewalStart = previousExpiry && previousExpiry > requestNow ? previousExpiry : requestNow;',
    'projectRenewReplay(storedOperation, {',
    'resellerMutationDate(currentSubscription.validUntil)',
    'if (!isPositiveSafeInteger(subscriptionQuantity))',
    'if (!isNonNegativeSafeInteger(totalAmount))',
    'Active manual subscription has invalid expiry state.',
    'resolveResellerMutationProfileId(',
    'Manual subscription reseller profile no longer matches current authority.',
    'firestoreAdmin.runTransaction(async (tx) =>',
    'collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(operationId)',
    'tx.set(subscriptionRef, {',
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-renew'",
    "action: 'RENEW'",
    "!['active', 'expired'].includes(String(currentSubscription.status || ''))",
    'existingSubData.resellerPricingTier !== pricingTier',
    'const wasExpired = currentSubscription.status === \'expired\';',
    'projectResellerMutationProfileCounters(',
    'throw new ResellerOfflineCapExceededError(counterResult.cap);',
    '...profileCounterUpdates,',
    'storeId,\n            subscriptionId: existingSub.id,\n            tenantId,',
    'tx.create(transactionRef, {',
    'Reseller profile counters are invalid.',
    'paymentEvidenceId: operationId',
  ].forEach((token) => assertIncludes(route, token, 'Reseller renew API'));
}

function verifyAddLocationRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller add-location API', 'ResellerAddLocationCapacitySchema', 'reseller-add-location');

  [
    'calculateOfflineLocationTopup({ locationCount, pricingTier, validUntil: validUntilDate })',
    ".where('billingMode', '==', 'manual')",
    ".where('tId', '==', tenantId)",
    ".where('sId', '==', storeId)",
    'const currentScope = getMenuListSubscriptionEntitlementScope(currentSubscription);',
    'currentScope.tenantId !== tenantId',
    'currentScope.storeId !== storeId',
    'existingSubData.resellerId !== resellerId && !isPlatformUser',
    "logger.security('Reseller Add Location Capacity - Unauthorized Access'",
    "existingSubData.status !== 'active'",
    'validUntilDate.getTime() <= Date.now()',
    'projectAddLocationReplay(storedOperation, {',
    'resellerMutationDate(currentValidUntil)',
    'addNonNegativeSafeIntegers(',
    'Manual subscription has invalid quantity or amount state.',
    'resolveResellerMutationProfileId(',
    'Manual subscription reseller profile no longer matches current authority.',
    'firestoreAdmin.runTransaction(async (tx) =>',
    'collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(operationId)',
    'tx.set(subscriptionRef, {',
    'quantity: nextQuantity',
    'tx.create(transactionRef, {',
    "action: 'ADD_LOCATION'",
    'projectResellerMutationProfileCounters(',
    '...profileCounterUpdates,',
    'Reseller profile counters are invalid.',
    'amountExpected: operationResult.amountExpected',
  ].forEach((token) => assertIncludes(route, token, 'Reseller add-location API'));
}

function verifyMutationStateBoundary(boundary, test) {
  [
    'export const addNonNegativeSafeIntegers =',
    'export const projectResellerOfflineCapacity =',
    'export const projectResellerMutationProfileCounters =',
    'export const resellerMutationDate =',
    'export const projectAddLocationReplay =',
    'export const projectRenewReplay =',
    'export const resolveResellerMutationProfileId =',
    'value.storeId !== expected.storeId',
    'value.commitmentMonths !== expected.durationMonths',
    'validUntil <= validFrom',
  ].forEach((token) => assertIncludes(boundary, token, 'Reseller mutation persisted-state boundary'));
  [
    'Number.MAX_SAFE_INTEGER, 1',
    'amountExpected: "20000"',
    'storeId: "101"',
    'locationCount: 1.5',
    'toDate: () => { throw new Error("bad"); }',
    'resolveResellerMutationProfileId("profile-2", "profile-1", false), null',
    'totalRevenueCollectedPaise: Number.MAX_SAFE_INTEGER',
    'status: "cap-exceeded"',
    'currentActiveOfflineStores: "2"',
    'maxOfflineActivations: "5"',
  ].forEach((token) => assertIncludes(test, token, 'Reseller mutation-state regression'));
}

function verifyProviderSubscriptionBoundary(boundary, test) {
  [
    'export type ResellerProviderSubscription',
    'projectResellerProviderSubscription',
    'isValidFirestoreDocumentId(value.id)',
    'value.id !== value.id.trim()',
    'normalizeRazorpaySubscriptionCheckoutUrl(value.short_url)',
  ].forEach((token) => assertIncludes(boundary, token, 'Reseller provider subscription boundary'));
  [
    'id: "sub_Qa123"',
    'id: "sub/foreign"',
    'https://example.test/not-razorpay',
    'id: 123',
  ].forEach((token) => assertIncludes(test, token, 'Reseller provider subscription regression'));
}

function verifyResellerRules(rules, test) {
  const transactionsStart = rules.indexOf('match /resellerTransactions/{docId} {');
  const profilesStart = rules.indexOf('match /resellerProfiles/{profileId} {');
  const profilesEnd = rules.indexOf('match /reviews/{tId}/{sId}/{docId} {');
  assert(transactionsStart >= 0 && profilesStart > transactionsStart && profilesEnd > profilesStart, 'Reseller Firestore rule paths must exist in order');
  const blocks = [
    rules.slice(transactionsStart, profilesStart),
    rules.slice(profilesStart, profilesEnd),
  ];
  blocks.forEach((block) => {
    assertIncludes(block, 'allow read, write: if false;', 'Reseller Admin-only Firestore rule');
    assertNotIncludes(block, 'isPlatformAdmin()', 'Reseller direct platform client read');
    assertNotIncludes(block, 'request.auth.uid', 'Reseller direct UID client read');
  });
  [
    'getDoc(doc(resellerDb, PROFILE_PATH))',
    'getDoc(doc(resellerDb, TRANSACTION_PATH))',
    'where("resellerId", "==", "reseller-auth-1")',
    'setDoc(doc(resellerDb, PROFILE_PATH)',
    'getDoc(doc(platformDb, PROFILE_PATH))',
    'getDocs(collection(platformDb, "resellerTransactions"))',
  ].forEach((token) => assertIncludes(test, token, 'Reseller Firestore rules regression'));
}

function verifyReadRoutes(
  clientsRoute,
  monthlyRoute,
  profileRoute,
  selfProfile,
  clientRecordBoundary,
  clientRecordTest,
  monthlySummaryBoundary,
  monthlySummaryTest,
) {
  [
    'applyResellerReadRateLimit(session, "clients")',
    'getCurrentPlatformUser(session)',
    'isActiveResellerProfileForSession({',
    'sessionProfileId: session.user.resellerProfileId',
    ".where('onboardingSource', '==', 'RESELLER_ONBOARDING')",
    ".where('resellerId', '==', resellerId)",
    ".orderBy('createdOn', 'desc')",
    '.limit(resultLimit + 1)',
    'const projectedTransactions = snapshot.docs.flatMap((doc) => {',
    'getMenuListSubscriptionEntitlementScope(doc.data())',
    'projectResellerClientRecord(',
    'const invalidRowCount = snapshot.size - projectedTransactions.length;',
    '|| invalidRowCount > 0',
    'normalizeRazorpaySubscriptionCheckoutUrl(subscription.shortUrl)',
    'return resellerPrivateJson({ invalidRowCount, isPartial, transactions });',
    'logResellerApiFailure(\'reseller_clients_route_failed\'',
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(clientsRoute, token, 'Reseller clients API'));

  [
    'DB_COLLECTIONS.RESELLER_TRANSACTIONS',
    'db.getAll(',
    'operationFingerprint',
  ].forEach((token) => assertNotIncludes(clientsRoute, token, 'Reseller clients current-subscription read boundary'));

  assertNotIncludes(clientsRoute, '}).sort((a, b) =>', 'Reseller clients must order before the bounded Firestore limit');
  [
    'export const isResellerClientsResponse =',
    'export const projectResellerClientRecord =',
    'Number.isSafeInteger(value)',
    'hasExactKeys(value, RESPONSE_KEYS)',
    'timestampToIso(value.validUntil) || timestampToIso(value.cycleEndDate)',
  ].forEach((token) => assertIncludes(clientRecordBoundary, token, 'Reseller client-record shared boundary'));
  [
    'Number.POSITIVE_INFINITY',
    'Number.MAX_SAFE_INTEGER',
    'internal: true',
    'validUntil: { seconds: 1 }',
  ].forEach((token) => assertIncludes(clientRecordTest, token, 'Reseller client-record regression'));

  [
    'const MONTHLY_TRANSACTION_LIMIT = 2000;',
    'const MONTH_PARAM_PATTERN = /^(\\d{4})-(\\d{2})$/;',
    'const MIN_REPORT_YEAR = 2020;',
    'const MAX_REPORT_YEAR = 2100;',
    'applyResellerReadRateLimit(session, "monthly-summary")',
    'getCurrentPlatformUser(session)',
    'isActiveResellerProfileForSession({',
    'const parsedMonth = parseMonth(request.nextUrl.searchParams.get("month"));',
    'return resellerPrivateJson({ error: "Invalid month filter." }, { status: 400 });',
    'db.collection(DB_COLLECTIONS.RESELLER_PROFILES).limit(50).get()',
    'getVisibleProfileDocs(db, isPlatform, currentResellerProfile)',
    'projectResellerMonthlyTransaction(doc.data())',
    'new Map<string, ResellerMonthlyProfile>()',
    'let invalidRowCount = 0;',
    'isPartial: transactionSnapshot.size >= MONTHLY_TRANSACTION_LIMIT || invalidRowCount > 0',
    'transactionQuery = transactionQuery.where("resellerId", "==", sessionResellerId);',
    '.limit(MONTHLY_TRANSACTION_LIMIT)',
    'isPartial: transactionSnapshot.size >= MONTHLY_TRANSACTION_LIMIT',
    "logResellerApiFailure(\"reseller_monthly_summary_route_failed\"",
    "requiredPlatformRole: \"RESELLER\"",
  ].forEach((token) => assertIncludes(monthlyRoute, token, 'Reseller monthly-summary API'));
  [
    'new Map<string, any>()',
    'Number(transaction.amountExpected',
    '.where("email", "==", normalizedEmail)',
  ].forEach((token) => assertNotIncludes(monthlyRoute, token, 'Reseller monthly-summary persisted-data boundary'));

  [
    'export const isResellerMonthlySummary =',
    'export const projectResellerMonthlyTransaction =',
    'Number.isSafeInteger(value)',
    'hasExactKeys(value, SUMMARY_KEYS)',
    'value.period.timeZone !== "Asia/Kolkata"',
  ].forEach((token) => assertIncludes(monthlySummaryBoundary, token, 'Reseller monthly-summary shared boundary'));
  [
    'Number.POSITIVE_INFINITY',
    'privateNotes: "no"',
    'isResellerMonthlySummary(summary), true',
  ].forEach((token) => assertIncludes(monthlySummaryTest, token, 'Reseller monthly-summary regression'));

  [
    'if (!match) return null;',
    'monthNumber < 1',
    'monthNumber > 12',
    'year < MIN_REPORT_YEAR',
    'year > MAX_REPORT_YEAR',
  ].forEach((token) => assertIncludes(monthlyRoute, token, 'Reseller monthly-summary month boundary'));

  [
    'applyResellerReadRateLimit(session, "profile")',
    'getResellerProfile(',
    'isActiveResellerProfileForSession({',
    'sessionProfileId: session.user.resellerProfileId',
    'projectResellerSelfProfile(',
    "logResellerApiFailure('reseller_profile_route_failed'",
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(profileRoute, token, 'Reseller profile API'));

  [
    'export const isResellerSelfProfile =',
    'export const projectResellerSelfProfile =',
    'SELF_PROFILE_KEYS',
    'totalRevenueCollectedPaise: nonNegativeInteger(data.totalRevenueCollectedPaise)',
  ].forEach((token) => assertIncludes(selfProfile, token, 'Reseller self-profile DTO'));
  [
    '"notes"',
    '"password"',
    '"authUserId"',
    '...data',
  ].forEach((token) => assertNotIncludes(selfProfile, token, 'Reseller self-profile private-field boundary'));

  [
    clientsRoute,
    monthlyRoute,
    profileRoute,
  ].forEach((route, index) => {
    ['applyResellerReadRateLimit', 'resellerPrivateJson', 'from "../readRateLimit"'].forEach((token) => (
      assertIncludes(route, token, `Reseller read API ${index} private response boundary`)
    ));
    assertNotIncludes(route, 'return NextResponse.json(', `Reseller read API ${index} private response boundary`);
    ['request.json()', 'console.error', 'error.message'].forEach((token) => (
      assertNotIncludes(route, token, `Reseller read API ${index} boundary`)
    ));
  });
}

function verifyHookAndDiagnostics(hook, diagnostics) {
  [
    'RESELLER_DASHBOARD_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    "type ResellerDashboardResponsePhase = 'monthly_summary' | 'profile' | 'clients';",
    'readJsonResponseWithLimit<T>',
    "logHookFailure(\n            'reseller_dashboard_response_parse_failed'",
    '!isResellerMonthlySummary(data)',
    '!isResellerSelfProfile(data?.profile)',
    '!isResellerClientsResponse(data)',
    'isClientListPartial: clientsResult?.isPartial === true',
    'invalidClientRowCount: clientsResult?.invalidRowCount || 0',
    "fetch('/api/reseller/monthly-summary', RESELLER_DASHBOARD_REQUEST_POLICY)",
    "fetch('/api/reseller/profile', RESELLER_DASHBOARD_REQUEST_POLICY)",
    "fetch('/api/reseller/clients', RESELLER_DASHBOARD_REQUEST_POLICY)",
  ].forEach((token) => assertIncludes(hook, token, 'Reseller dashboard hook'));

  [
    'response.json()',
    '.json().catch',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(hook, token, 'Reseller dashboard hook boundary'));

  [
    'secureError(',
    "cache: 'no-store' as RequestCache",
    "credentials: 'same-origin' as RequestCredentials",
    "redirect: 'manual' as RequestRedirect",
    'getBoundedResellerStringContext',
    'copyResellerTextToClipboard',
    'hasResellerClipboardWrite',
    'hasResellerCopyFallback',
    'sourceErrorName',
    'sourceErrorCode',
    'sourceStatusCode',
  ].forEach((token) => assertIncludes(diagnostics, token, 'Reseller browser diagnostics'));

  [
    'getOrCreateResellerOperationId',
    'clearResellerOperationId',
    'sessionStorage.getItem(storageKey)',
    'sessionStorage.setItem(storageKey, operationId)',
  ].forEach((token) => assertIncludes(diagnostics, token, 'Reseller browser idempotency boundary'));
}

function verifyDesktopSurfaces(dashboard, management, onboarding) {
  [
    'RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    'readJsonResponseWithLimit<ResellerAddLocationCapacityResponse>',
    "fetch('/api/reseller/add-location-capacity'",
    '...RESELLER_REQUEST_POLICY',
    'isValidAddLocationCapacityResponse(data, expectedAddLocationResponse)',
    'getOrCreateResellerOperationId(operationIntentKey)',
    'clearResellerOperationId(operationIntentKey)',
    'operationId,',
    'hasExpectedStoreId',
    'hasExpectedTenantId',
    'copyResellerTextToClipboard(checkoutUrl)',
    'normalizeRazorpaySubscriptionCheckoutUrl(link)',
    "window.open(checkoutUrl, '_blank', 'noopener,noreferrer')",
    'RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    "fetch('/api/reseller/renew'",
    'isValidRenewResponse(data',
    'data.transactionId === expected.operationId',
    "const operationIntentKey = `renew:${renewalClient.subscriptionId}:${renewalClient.pricingTier}:${renewalMonths}`",
    'Confirm prepaid renewal',
    'invalidClientRowCount > 0',
    'monthlySummary.invalidRowCount > 0',
  ].forEach((token) => assertIncludes(dashboard, token, 'Desktop reseller dashboard'));

  [
    "platformRole !== 'PLATFORM'",
    "redirect('/dashboard')",
    'RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)",
    "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)",
    'readJsonResponseWithLimit<unknown>',
    'isResellerManagementProfilesResponse(data)',
    'isResellerMonthlySummary(data)',
    'monthlySummary.invalidRowCount > 0',
    'profileEvidence?.isPartial',
    'invalid reseller profile',
    'isExpectedResellerManagementSaveResponse(result, editingProfile?.id)',
    'hasExpectedProfileId',
  ].forEach((token) => assertIncludes(management, token, 'Desktop reseller management'));

  [
    'RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    "fetch('/api/reseller/onboard'",
    '...RESELLER_REQUEST_POLICY',
    'readJsonResponseWithLimit<unknown>',
    'isResellerOnboardingResponse(data, operationId)',
    'normalizePhoneNumberForStorage({',
    'ownerPassword: values.ownerPassword',
    "getResellerOperationIntentKey('onboard-client'",
    'getOrCreateResellerOperationId(operationIntentKey)',
    'clearResellerOperationId(operationIntentKey)',
    'operationId,',
    'copyResellerTextToClipboard(copyValue)',
    'hasResellerClipboardWrite()',
    'hasResellerCopyFallback()',
  ].forEach((token) => assertIncludes(onboarding, token, 'Desktop reseller onboarding'));

  [
    dashboard,
    management,
    onboarding,
  ].forEach((component, index) => {
    ['response.json()', '.json().catch', 'console.error', 'error.message', 'as any'].forEach((token) => (
      assertNotIncludes(component, token, `Desktop reseller component ${index} boundary`)
    ));
  });
}

function verifyMobileSurfaces(dashboard, management, onboarding, mobileShell, mobileMore) {
  [
    'EcomSAI',
  ].forEach((token) => assertNotIncludes(dashboard + management + onboarding, token, 'Mobile reseller product copy boundary'));

  [
    'MOBILE_RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    'readJsonResponseWithLimit<MobileResellerAddLocationCapacityResponse>',
    "fetch('/api/reseller/add-location-capacity'",
    '...RESELLER_REQUEST_POLICY',
    'isValidMobileAddLocationCapacityResponse(data, expectedAddLocationResponse)',
    'getOrCreateResellerOperationId(operationIntentKey)',
    'clearResellerOperationId(operationIntentKey)',
    'operationId,',
    'style={{ minHeight: 44',
    'copyMobileResellerDashboardText(link)',
    'normalizeRazorpaySubscriptionCheckoutUrl(transaction.subscriptionShortUrl)',
    "window.open(link, '_blank', 'noopener,noreferrer')",
    'MOBILE_RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    "fetch('/api/reseller/renew'",
    'isValidMobileRenewResponse(data',
    'data.transactionId === expected.operationId',
    "const operationIntentKey = `renew:${renewalClient.subscriptionId}:${renewalClient.pricingTier}:${renewalMonths}`",
    'Renew manual access',
    'invalidClientRowCount > 0',
    'monthlySummary.invalidRowCount > 0',
  ].forEach((token) => assertIncludes(dashboard, token, 'Mobile reseller dashboard'));

  [
    'platformRole === ECOMSAI_PLATFORM_USER_ROLE',
    'MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)",
    "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)",
    'readJsonResponseWithLimit<unknown>',
    'isResellerManagementProfilesResponse(data)',
    'isResellerMonthlySummary(data)',
    'monthlySummary.invalidRowCount > 0',
    'profileEvidence?.isPartial',
    'invalid reseller profile',
    'isExpectedMobileResellerManagementSaveResponse(data, editingProfile?.id)',
    'if (!isPlatform) {',
    'Only platform admins can use this screen.',
    'style={{ minHeight: 44',
  ].forEach((token) => assertIncludes(management, token, 'Mobile reseller management'));

  [
    'MOBILE_RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    "fetch('/api/reseller/onboard'",
    '...RESELLER_REQUEST_POLICY',
    'readJsonResponseWithLimit<unknown>',
    'isResellerOnboardingResponse(data, operationId)',
    'normalizePhoneNumberForStorage({',
    "getResellerOperationIntentKey('onboard-client'",
    'getOrCreateResellerOperationId(operationIntentKey)',
    'clearResellerOperationId(operationIntentKey)',
    'operationId,',
    'copyMobileResellerOnboardingText(link)',
    'navigator.share({ text: link, title, url: link })',
    'style={{ minHeight: 44',
  ].forEach((token) => assertIncludes(onboarding, token, 'Mobile reseller onboarding'));

  [
    "'/reseller': 'resellerHub'",
    "'/reseller/manage': 'resellerManagement'",
    "'/reseller/onboard': 'resellerOnboarding'",
    "'resellerDashboard'",
    "'resellerManagement'",
    "'resellerOnboarding'",
  ].forEach((token) => assertIncludes(mobileShell, token, 'Mobile shell reseller route map'));

  [
    'FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD && canUseResellerScreens',
    "label: 'Reseller Dashboard'",
    "onClick: () => openSubScreen('resellerDashboard')",
    "label: 'Onboard Client'",
    "onClick: () => openSubScreen('resellerOnboarding')",
    '...(isPlatformAdmin ? [{ key: \'resellerManage\'',
    "onClick: () => openSubScreen('resellerManagement')",
    "if (canUseResellerScreens && ['resellerHub', 'resellerDashboard', 'resellerManagement', 'resellerOnboarding'].includes(screen)) return true;",
    "subScreen === 'resellerDashboard'",
    "subScreen === 'resellerManagement'",
    "subScreen === 'resellerOnboarding'",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More reseller shell'));

  [
    dashboard,
    management,
    onboarding,
  ].forEach((component, index) => {
    ['response.json()', '.json().catch', 'console.error', 'error.message', 'as any'].forEach((token) => (
      assertNotIncludes(component, token, `Mobile reseller component ${index} boundary`)
    ));
  });

  [
    'isValidResellerProfilesResponse',
    'isValidMobileResellerProfilesResponse',
    'const isFiniteNumber =',
  ].forEach((token) => assertNotIncludes(
    dashboard + management + onboarding,
    token,
    'Reseller duplicated profile response boundary',
  ));
}

function verifyOnboardingResponseBoundary(boundary, test, route) {
  [
    'export type ResellerOnboardingResponse =',
    'Object.keys(record).some((key) => !RESPONSE_KEYS.has(key))',
    'Number.isSafeInteger(record.storeId)',
    'Number.isSafeInteger(record.tenantId)',
    'record.transactionId === expectedOperationId',
    'record.passwordSet === true',
  ].forEach((token) => assertIncludes(boundary, token, 'Reseller onboarding response boundary'));
  [
    'storeId: "41"',
    'tenantId: 31.5',
    'status: "completed"',
    'userId: "private-auth-uid"',
  ].forEach((token) => assertIncludes(test, token, 'Reseller onboarding response regression'));
  [
    'userId: replaySubscription.userId',
    'userId: result.userId,\n            status:',
    'null as any',
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller onboarding private response field'));
  assertNotIncludes(route, 'operation.validFrom?.toDate?.() || new Date()', 'Reseller onboarding replay fabricated paid time');
}

function verifyDocs(readme, spec, impl, marketingDoc, websiteDoc, helpDoc, firebaseDoc, mobileDoc, auditDoc, changelog) {
  [
    'verify:reseller-dashboard-boundary',
    'This is NOT:',
    'A white-label platform',
    'Reuse existing subscription system',
    'Feature Flag',
    'Current reseller onboarding creates the tenant/store account, subscription state, dashboard link, and public customer link.',
    'It does not upload or extract menu files inside the reseller onboarding API path',
    'test:reseller-onboarding-billing:emulator',
    'one overflow row',
    '2,000-row partial indicator',
  ].forEach((token) => assertIncludes(readme, token, 'Reseller README docs'));

  [
    '### 8.2 Scale Thresholds',
    'Current tier availability is controlled by `active` on each entry in `src/config/resellerPricing.ts`',
    'offline payment availability is controlled by `RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE`',
    'Commission or referral payouts are not part of the current runtime.',
    'No current commission runtime exists.',
    'Other currencies require a separate pricing, tax, billing, and docs audit before they are exposed.',
    'Menu upload/extraction happens later through the normal owner dashboard and import/review flows',
    'The reseller onboarding route creates the tenant/store account and owner credential handoff.',
    'Menu images/PDFs/text are not uploaded or extracted in this onboarding API path',
    'There is no separate client-detail route in the current runtime.',
    'Conversion from manual/offline to online auto-renewal is not implemented.',
  ].forEach((token) => assertIncludes(spec, token, 'Reseller spec launch-boundary docs'));

  [
    'verify:reseller-dashboard-boundary',
    'reseller boundary source gate added',
    'Reseller mutation route limiter keys now hash reseller/user key material',
    'Desktop and mobile add-location capacity actions',
    'Passwords are never stored in Firestore',
    '@see spec §8.2 Scale Thresholds',
    '## 13. Implementation Checklist',
    'Active reseller onboarding creates the tenant/store account, owner access, subscription state, dashboard link, and public customer link handoff.',
    'It does not upload menu files or run menu extraction inside `/api/reseller/onboard`',
    'July 5, 2026 profile-id boundary:',
    'Platform reseller management validates the exact raw update `profileId` through the shared Firestore document-ID boundary',
    'whitespace-mutated IDs fail request validation instead of being trimmed',
    'compatibility field; active route does not upload/extract menu files',
    'Atomic subscription + operation + cap + reseller-counter onboarding commit',
    'Deferred online revenue recognition and bounded payment-status convergence',
    'Owner/provider release checks — pending',
  ].forEach((token) => assertIncludes(impl, token, 'Reseller implementation docs'));

  [
    'MenuList does not promise commission or referral payouts in the current program.',
    'The owner can then add or approve menu content through the normal MenuList flow.',
    'Offline clients get an active account and customer link after payment confirmation; online clients activate after Razorpay payment',
    'Menu content is added through the normal owner/import/review flow',
  ].forEach((token) => assertIncludes(marketingDoc, token, 'Reseller marketing docs'));

  [
    'Menu content is added through the normal owner dashboard and import/review flow.',
    'Offline prepaid clients get an active owner account after payment confirmation; online clients activate after Razorpay payment.',
    'Menu content still goes through owner review before customer use.',
  ].forEach((token) => assertIncludes(websiteDoc, token, 'Reseller website docs'));

  [
    'Menu content is added later through the normal MenuList owner dashboard and import/review flows.',
    'Menu photos, PDFs, or typed content are added later from the normal owner dashboard/import flow',
    'Paid account access is active; menu content still depends on owner import/edit/publish state',
    'Payment link unavailable',
  ].forEach((token) => assertIncludes(helpDoc, token, 'Reseller help docs'));

  [
    'Phase 2',
    'Phase 3',
    'Deferred to Phase 2',
    'future consideration only',
    'Implementation Phases',
    'introduce commission later',
    'earning you recurring income',
    'upload their menu',
    'Upload their menu',
    'upload menu images',
    'Upload menu images',
    'AI extraction runs',
    'AI extracts everything',
    "MenuList's AI does the rest",
    'Professional digital menu (AI-powered)',
    'digital menu live in 60 seconds',
    'live digital menu immediately',
    'menu is live before',
    'Menu is live before',
    'live before you leave',
    'digital menu is live in minutes',
    'fully working digital menu in minutes',
    'system will extract all items',
    'Business is live and running',
    'sees uploaded menu',
    'photo upload',
    'Camera integration for menu upload',
    'Set up restaurants in 5 minutes',
    'live in minutes',
    'automatic updates',
  ].forEach((token) => assertNotIncludes(
    `${readme}\n${spec}\n${impl}\n${marketingDoc}\n${websiteDoc}\n${helpDoc}\n${mobileDoc}`,
    token,
    'Reseller launch-boundary docs',
  ));

  [
    'verify:reseller-dashboard-boundary',
    'All reseller write routes apply `DATA_WRITE` throttling and a bounded 16KB JSON body cap',
    'July 5 monthly-summary month filter boundary is Firebase-cost neutral',
    'invalid explicit `month` filters return `400` before Firestore reads',
    'June 29 mutation limiter-key hardening is Firebase-cost neutral',
    'July 5 platform reseller management profile-id boundary is Firebase-cost neutral',
    'validates the exact raw update `profileId` through the shared Firestore document-ID boundary before reseller profile lookup',
    'whitespace-mutated IDs fail before Firestore reads/writes',
    'Browser Handoff Diagnostics',
    'one bounded subscription query',
    'requires matching store/tenant/subscription/request-operation/status',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Reseller Firebase docs'));

  [
    'July 5, 2026 monthly-summary query boundary:',
    'Malformed or impossible explicit `month` query values now return `400` before monthly transaction/profile reads',
    'Missing `month` still uses the current India month',
  ].forEach((token) => assertIncludes(impl, token, 'Reseller implementation monthly-summary query boundary'));

  [
    'Reseller Paid-Mutation State Integrity',
    'Renewal and add-location replays are exact',
    'Profile counters stay with the admitted reseller',
    'Reseller Client-List Contract',
    'Subscription documents do not become trusted client rows by assertion',
    'Malformed rows are visible as incomplete evidence',
    'Reseller Monthly Report Integrity',
    'Monthly money is never permissively coerced',
    'Incomplete evidence is explicit',
    'Reseller Read Authority Refresh',
    'Protected reads use current persisted authority',
    'Stale sessions fail before disclosure',
    'Reseller Management Profile ID Boundary',
    'Reseller profile IDs are validated before updates',
    'old trim/slash-only guard removal',
    'Reseller Monthly Summary Query Boundary',
    'Explicit reseller monthly-summary months are calendar-validated',
    'Invalid explicit months fail before Firestore reads',
    'verify:reseller-dashboard-boundary',
  ].forEach((token) => assertIncludes(changelog, token, 'Reseller changelog monthly-summary query boundary'));

  [
    'verify:reseller-dashboard-boundary',
    'Mobile Relevance Decision: **YES',
    'Mobile uses the same `/api/reseller/clients`, `/api/reseller/monthly-summary`, `/api/reseller/onboard`, `/api/reseller/renew`, and `/api/reseller/add-location-capacity` routes as desktop.',
    'Mobile reseller write actions use the same `DATA_WRITE` throttled, 16KB bounded JSON API routes as desktop.',
    'The reseller onboarding mobile path does not upload menu files',
    'owners add menu sources later through the normal MenuList mobile/desktop import flow.',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Reseller mobile docs'));

  [
    'Reseller Management Profile ID Boundary checkpoint',
    'old trim/slash-only guard removal',
    'verify:reseller-dashboard-boundary',
    'reseller dashboard',
    'No Firebase deploy, Vercel deploy, production build',
    'Reseller-Assisted Onboarding And Billing Checkpoint',
    'No Firestore rule/index/Storage/Function source changed in this feature pass',
  ].forEach((token) => assertIncludes(auditDoc, token, 'MenuList production audit'));

  [
    'Reseller Onboarding, Billing, And Renewal Hardening',
    'Subscription truth, onboarding ledger, offline-cap reservation, and reseller counters now commit atomically',
    'Razorpay test-mode, authenticated browser/PWA, app release, and production-host evidence remain owner/provider pending',
  ].forEach((token) => assertIncludes(changelog, token, 'Reseller July 16 hardening changelog'));

  assertNotIncludes(impl, 'src/database/reseller/index.ts', 'Deleted reseller browser DAL documentation');
  assert(!fs.existsSync(path.join(root, 'src/database/reseller/index.ts')), 'Unused reseller browser Firestore DAL must remain removed');
}

const files = {
  packageJson: read('package.json'),
  readRateLimit: read('src/app/api/reseller/readRateLimit.ts'),
  manageRoute: read('src/app/api/reseller/manage/route.ts'),
  loginIdentifiers: read('src/lib/auth/loginIdentifiers.ts'),
  serverUserContext: read('src/lib/auth/serverUserContext.ts'),
  authConfig: read('src/lib/auth/index.ts'),
  usersDal: read('src/database/users/index.ts'),
  onboardRoute: read('src/app/api/reseller/onboard/route.ts'),
  ownerClaim: read('src/lib/reseller/resellerOwnerClaim.ts'),
  resellerServer: read('src/database/reseller/server.ts'),
  resellerProfileRecord: read('src/lib/reseller/resellerProfileRecord.ts'),
  managementProfile: read('src/lib/reseller/resellerManagementProfile.ts'),
  managementProfileTest: read('scripts/verification/test-reseller-management-profile.ts'),
  resellerLedger: read('src/lib/reseller/resellerLedger.ts'),
  onboardingOperation: read('src/lib/reseller/resellerOnboardingOperation.ts'),
  profileAuthority: read('src/lib/reseller/resellerProfileAuthority.ts'),
  onboardingBoundaryTest: read('scripts/verification/test-reseller-onboarding-boundary.ts'),
  onboardingEmulatorTest: read('scripts/verification/test-reseller-onboarding-billing-emulator.ts'),
  onboardingResponseBoundary: read('src/lib/reseller/resellerOnboardingResponse.ts'),
  onboardingResponseTest: read('scripts/verification/test-reseller-onboarding-response.ts'),
  profileAdmissionEmulatorTest: read('scripts/verification/test-reseller-profile-admission-emulator.ts'),
  confirmPaymentRoute: read('src/app/api/reseller/confirm-payment/route.ts'),
  confirmPaymentBoundary: read('src/lib/billing/manualSubscriptionConfirmation.ts'),
  subscriptionServer: read('src/database/subscriptions/server.ts'),
  confirmPaymentBoundaryTest: read('scripts/verification/test-reseller-confirm-payment-boundary.ts'),
  confirmPaymentEmulatorTest: read('scripts/verification/test-reseller-confirm-payment-emulator.ts'),
  renewRoute: read('src/app/api/reseller/renew/route.ts'),
  addLocationRoute: read('src/app/api/reseller/add-location-capacity/route.ts'),
  mutationStateBoundary: read('src/lib/reseller/resellerMutationState.ts'),
  mutationStateTest: read('scripts/verification/test-reseller-mutation-state.ts'),
  providerSubscriptionBoundary: read('src/lib/reseller/resellerProviderSubscription.ts'),
  providerSubscriptionTest: read('scripts/verification/test-reseller-provider-subscription.ts'),
  firestoreRules: read('firestore.rules'),
  resellerRulesTest: read('scripts/verification/test-reseller-rules.ts'),
  clientsRoute: read('src/app/api/reseller/clients/route.ts'),
  monthlyRoute: read('src/app/api/reseller/monthly-summary/route.ts'),
  monthlySummaryBoundary: read('src/lib/reseller/resellerMonthlySummary.ts'),
  monthlySummaryTest: read('scripts/verification/test-reseller-monthly-summary.ts'),
  profileRoute: read('src/app/api/reseller/profile/route.ts'),
  selfProfile: read('src/lib/reseller/resellerSelfProfile.ts'),
  clientRecordBoundary: read('src/lib/reseller/resellerClientRecord.ts'),
  clientRecordTest: read('scripts/verification/test-reseller-client-record.ts'),
  hook: read('src/hooks/useResellerDashboard.ts'),
  diagnostics: read('src/components/templates/main-app/reseller/resellerDiagnostics.ts'),
  desktopDashboard: read('src/components/templates/main-app/reseller/ResellerDashboard.tsx'),
  desktopManagement: read('src/components/templates/main-app/reseller/ResellerManagement.tsx'),
  desktopOnboarding: read('src/components/templates/main-app/reseller/OnboardingWizard.tsx'),
  mobileDashboard: read('src/components/mobile/screens/MobileResellerDashboardScreen.tsx'),
  mobileManagement: read('src/components/mobile/screens/MobileResellerManagementScreen.tsx'),
  mobileOnboarding: read('src/components/mobile/screens/MobileResellerOnboardingScreen.tsx'),
  mobileShell: read('src/components/mobile/MobileShell.tsx'),
  mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
  readme: read('__docs__/reseller-dashboard/README.md'),
  spec: read('__docs__/reseller-dashboard/reseller-dashboard_spec.md'),
  impl: read('__docs__/reseller-dashboard/reseller-dashboard_impl.md'),
  marketingDoc: read('__docs__/reseller-dashboard/reseller-dashboard_marketing.md'),
  websiteDoc: read('__docs__/reseller-dashboard/reseller-dashboard_website.md'),
  helpDoc: read('__docs__/reseller-dashboard/reseller-dashboard_helpdoc.md'),
  firebaseDoc: read('__docs__/reseller-dashboard/reseller-dashboard_firebase.md'),
  mobileDoc: read('__docs__/reseller-dashboard/reseller-dashboard_mobile-support.md'),
  auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
  changelog: read('__docs__/changelog.md'),
};

verifyPackageScript(files.packageJson);
verifyReadRateLimit(files.readRateLimit);
verifyManageRoute(files.manageRoute);
verifyProfileAdmissionTransaction(files.resellerServer, files.profileAdmissionEmulatorTest);
verifyManagementProfileBoundary(
  files.resellerServer,
  files.resellerProfileRecord,
  files.managementProfile,
  files.managementProfileTest,
);
verifyResellerUsernameLogin(
  files.manageRoute,
  files.loginIdentifiers,
  files.serverUserContext,
  files.authConfig,
  files.usersDal,
  files.profileAdmissionEmulatorTest,
);
verifyOnboardRoute(
  files.onboardRoute,
  files.ownerClaim,
  files.resellerServer,
  files.resellerLedger,
  files.onboardingOperation,
  files.profileAuthority,
  files.onboardingBoundaryTest,
  files.onboardingEmulatorTest,
);
verifyOnboardingResponseBoundary(
  files.onboardingResponseBoundary,
  files.onboardingResponseTest,
  files.onboardRoute,
);
verifyConfirmPaymentRoute(
  files.confirmPaymentRoute,
  files.confirmPaymentBoundary,
  files.subscriptionServer,
  files.confirmPaymentBoundaryTest,
  files.confirmPaymentEmulatorTest,
);
verifyRenewRoute(files.renewRoute);
verifyAddLocationRoute(files.addLocationRoute);
verifyMutationStateBoundary(files.mutationStateBoundary, files.mutationStateTest);
verifyProviderSubscriptionBoundary(
  files.providerSubscriptionBoundary,
  files.providerSubscriptionTest,
);
verifyResellerRules(files.firestoreRules, files.resellerRulesTest);
verifyReadRoutes(
  files.clientsRoute,
  files.monthlyRoute,
  files.profileRoute,
  files.selfProfile,
  files.clientRecordBoundary,
  files.clientRecordTest,
  files.monthlySummaryBoundary,
  files.monthlySummaryTest,
);
verifyHookAndDiagnostics(files.hook, files.diagnostics);
verifyDesktopSurfaces(files.desktopDashboard, files.desktopManagement, files.desktopOnboarding);
verifyMobileSurfaces(
  files.mobileDashboard,
  files.mobileManagement,
  files.mobileOnboarding,
  files.mobileShell,
  files.mobileMore,
);
verifyDocs(files.readme, files.spec, files.impl, files.marketingDoc, files.websiteDoc, files.helpDoc, files.firebaseDoc, files.mobileDoc, files.auditDoc, files.changelog);

console.log('Reseller dashboard boundary verification passed');
