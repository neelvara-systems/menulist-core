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
  assertIncludes(
    packageJson,
    '"verify:reseller-dashboard-boundary": "node scripts/verification/verify-reseller-dashboard-boundary.js"',
    'Root package scripts',
  );
}

function verifyReadRateLimit(helper) {
  [
    "getRateLimitForFeature('DATA_READ')",
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'const resellerProfileRateLimitHash = hashPublicRateLimitValue(resellerProfileId);',
    'key: `reseller-read:${routeKey}:${userRateLimitHash}:${resellerProfileRateLimitHash}`',
    "'Retry-After': String(waitSeconds)",
    "'X-RateLimit-Limit': String(rateLimitConfig.limit)",
    "'X-RateLimit-Remaining': String(rateLimit.remaining)",
  ].forEach((token) => assertIncludes(helper, token, 'Reseller read rate limiter'));

  [
    'request.json()',
    'key: `reseller-read:${routeKey}:${userId}',
    'key: `reseller-read:${routeKey}:${resellerProfileId}',
  ].forEach((token) => assertNotIncludes(helper, token, 'Reseller read rate limiter boundary'));
}

function verifyCommonMutationRoute(route, routeLabel, schemaName, rateLimitKey) {
  [
    "export const dynamic = 'force-dynamic';",
    'FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD',
    "getRateLimitForFeature('DATA_WRITE')",
    'const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);',
    `key: \`${rateLimitKey}:\${resellerRateLimitHash}\``,
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    `validateAPIInput(${schemaName}, body)`,
    'getBoundedResellerApiStringContext',
    'logResellerApiFailure',
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(route, token, routeLabel));

  assertOrder(route, [
    'FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD',
    "getRateLimitForFeature('DATA_WRITE')",
    'const rateLimitResult = await checkRateLimit({',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    `validateAPIInput(${schemaName}, body)`,
  ], `${routeLabel} admission order`);

  [
    'request.json()',
    'console.error',
    'error.message',
    `key: \`${rateLimitKey}:\${resellerId}\``,
  ].forEach((token) => assertNotIncludes(route, token, `${routeLabel} boundary`));
}

function verifyManageRoute(route) {
  [
    "export const dynamic = 'force-dynamic';",
    'GET /api/reseller/manage',
    'POST /api/reseller/manage',
    "requiredPlatformRole: 'PLATFORM'",
    'applyResellerReadRateLimit(session, "manage")',
    'const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;',
    "getRateLimitForFeature('DATA_WRITE')",
    'const userRateLimitHash = hashPublicRateLimitValue(session.user.id);',
    'key: `reseller-manage:${userRateLimitHash}`',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(UpdateResellerSchema, body)',
    'validateAPIInput(CreateResellerSchema, body)',
    'isValidFirestoreDocumentId',
    "profileId: z.string().trim().min(1).max(128).refine(isValidFirestoreDocumentId, 'Invalid profile ID')",
    'assertResellerUniqueness(',
    'await authAdmin.createUser({',
    'await authAdmin.updateUser(uid, updatePayload);',
    'await authAdmin.setCustomUserClaims(uid, {',
    "platformRole: 'RESELLER'",
    "resellerProfileId: uid",
    'storeIds: [],',
    'stores: [],',
    'const { password: _password, ...profileUpdates } = updates;',
    'password: admin.firestore.FieldValue.delete()',
    "logResellerApiFailure('reseller_manage_post_route_failed'",
  ].forEach((token) => assertIncludes(route, token, 'Reseller management API'));

  assertOrder(route, [
    "getRateLimitForFeature('DATA_WRITE')",
    'const rateLimitResult = await checkRateLimit({',
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'const isUpdate = Boolean(body.profileId);',
    'validateAPIInput(UpdateResellerSchema, body)',
  ], 'Reseller management update admission order');

  assertOrder(route, [
    'const isUpdate = Boolean(body.profileId);',
    '} else {',
    'validateAPIInput(CreateResellerSchema, body)',
    'assertResellerUniqueness(db, email, username)',
    'syncResellerLoginAccount({',
  ], 'Reseller management create admission order');

  [
    'ECOMSAI_PLATFORM_PASSWORD',
    'request.json()',
    'console.error',
    'error.message',
    'key: `reseller-manage:${session.user.id}`',
    "profileId: z.string().trim().min(1).max(128).refine((value) => !value.includes('/'))",
  ].forEach((token) => assertNotIncludes(route, token, 'Reseller management API boundary'));
}

function verifyOnboardRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller onboarding API', 'ResellerOnboardSchema', 'reseller-onboard');

  [
    'compensateFailedTenantStoreOnboarding({',
    "reason: 'reseller_online_provider_setup_failed'",
    'source: "RESELLER_ONBOARDING"',
    "platformRole: 'OWNER'",
    'await revalidateMenuCache(params.storeId, { tId: params.tenantId });',
    'preCheckSubdomain(db, businessName)',
    'normalizePhoneNumberForStorage({',
    'assertOwnerLoginIsAvailable({',
    'prepareOwnerAuthUser({',
    'result = await db.runTransaction(async (transaction) => {',
    'createTenantStoreInTransaction(transaction, db, {',
    "onboardingSource: 'RESELLER_ONBOARDING'",
    'await authAdmin.deleteUser(authAccount.uid);',
    'await authAdmin.setCustomUserClaims(result.authUid, {',
    'await revalidateMenuCache(result.storeId, { tId: result.tenantId });',
    'getOrCreateRazorpayPlan({',
    'razorpayClient.subscriptions.create({',
    'await compensateResellerPaymentProviderFailure({',
    "billingMode: 'auto'",
    "billingMode: 'manual'",
    'manualPaymentConfirmed: true',
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-onboard-offline'",
    'createResellerTransaction({',
    "action: 'ONBOARD'",
    "status: paymentMode === 'offline' ? 'active' : 'pending_payment'",
    "logResellerApiFailure('reseller_onboard_route_failed'",
  ].forEach((token) => assertIncludes(route, token, 'Reseller onboarding API'));

  assertOrder(route, [
    'readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(ResellerOnboardSchema, body)',
    'getResellerProfile(resellerId, session.user.email)',
    'preCheckSubdomain(db, businessName)',
    'assertOwnerLoginIsAvailable({',
    'prepareOwnerAuthUser({',
    'result = await db.runTransaction(async (transaction) => {',
    'await authAdmin.setCustomUserClaims(result.authUid, {',
    'await revalidateMenuCache(result.storeId, { tId: result.tenantId });',
  ], 'Reseller onboarding local account/store admission order');

  assertOrder(route, [
    'getOrCreateRazorpayPlan({',
    'razorpayClient.subscriptions.create({',
    'await compensateResellerPaymentProviderFailure({',
    'throw providerError;',
  ], 'Reseller online provider compensation order');
}

function verifyConfirmPaymentRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller confirm-payment API', 'ResellerConfirmPaymentSchema', 'reseller-confirm-payment');

  [
    'getSubscriptionById(subscriptionId)',
    'subscription.resellerId !== resellerId && !isPlatformUser',
    "logger.security('Reseller Confirm Payment - Unauthorized Access'",
    "subscription.billingMode !== 'manual'",
    'subscription.status === \'active\' && subscription.manualPaymentConfirmed',
    'manualPaymentConfirmed: true',
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-confirm-payment'",
  ].forEach((token) => assertIncludes(route, token, 'Reseller confirm-payment API'));
}

function verifyRenewRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller renew API', 'ResellerRenewSchema', 'reseller-renew');

  [
    'getResellerProfile(resellerId, session.user.email)',
    "paymentMode !== 'offline'",
    'Online subscriptions auto-renew via Razorpay',
    'RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE',
    ".where('billingMode', '==', 'manual')",
    'existingSubData.resellerId !== resellerId && !isPlatformUser',
    "logger.security('Reseller Renew - Unauthorized Access'",
    'previousExpiry > now ? previousExpiry : now',
    'await updateSubscription(existingSub.id, {',
    'safeSyncStorePlanEntitlementFromSubscription(',
    "'api:reseller-renew'",
    'createResellerTransaction({',
    "action: 'RENEW'",
    'updateResellerStatsOnRenewal(renewalProfileId, totalAmount)',
  ].forEach((token) => assertIncludes(route, token, 'Reseller renew API'));
}

function verifyAddLocationRoute(route) {
  verifyCommonMutationRoute(route, 'Reseller add-location API', 'ResellerAddLocationCapacitySchema', 'reseller-add-location');

  [
    'calculateOfflineLocationTopup({ locationCount, pricingTier, validUntil })',
    ".where('billingMode', '==', 'manual')",
    'existingSubData.resellerId !== resellerId && !isPlatformUser',
    "logger.security('Reseller Add Location Capacity - Unauthorized Access'",
    "existingSubData.status !== 'active'",
    'validUntilDate.getTime() <= Date.now()',
    'const nextQuantity = currentQuantity + topup.locationCount;',
    'await updateSubscription(existingSub.id, {',
    'quantity: nextQuantity',
    'createResellerTransaction({',
    "action: 'ADD_LOCATION'",
    'updateResellerStatsOnRenewal(profileId, topup.amountPaise)',
    'amountExpected: topup.amountPaise',
  ].forEach((token) => assertIncludes(route, token, 'Reseller add-location API'));
}

function verifyReadRoutes(clientsRoute, monthlyRoute, profileRoute) {
  [
    'applyResellerReadRateLimit(session, "clients")',
    'transactionsCollection.orderBy("createdOn", "desc").limit(200)',
    'transactionsCollection.where("resellerId", "==", resellerId).limit(100)',
    'db.getAll(...subscriptionIds.map((id) => db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(id)))',
    'subscriptionStatus === \'pending\'',
    'logResellerApiFailure(\'reseller_clients_route_failed\'',
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(clientsRoute, token, 'Reseller clients API'));

  [
    'const MONTHLY_TRANSACTION_LIMIT = 2000;',
    'const MONTH_PARAM_PATTERN = /^(\\d{4})-(\\d{2})$/;',
    'const MIN_REPORT_YEAR = 2020;',
    'const MAX_REPORT_YEAR = 2100;',
    'applyResellerReadRateLimit(session, "monthly-summary")',
    'const parsedMonth = parseMonth(request.nextUrl.searchParams.get("month"));',
    'return NextResponse.json({ error: "Invalid month filter." }, { status: 400 });',
    'db.collection(DB_COLLECTIONS.RESELLER_PROFILES).limit(50).get()',
    'db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(resellerId).get()',
    '.where("email", "==", normalizedEmail)',
    'transactionQuery = transactionQuery.where("resellerId", "==", sessionResellerId);',
    '.limit(MONTHLY_TRANSACTION_LIMIT)',
    'isPartial: transactionSnapshot.size >= MONTHLY_TRANSACTION_LIMIT',
    "logResellerApiFailure(\"reseller_monthly_summary_route_failed\"",
    "requiredPlatformRole: \"RESELLER\"",
  ].forEach((token) => assertIncludes(monthlyRoute, token, 'Reseller monthly-summary API'));

  [
    'if (!match) return null;',
    'monthNumber < 1',
    'monthNumber > 12',
    'year < MIN_REPORT_YEAR',
    'year > MAX_REPORT_YEAR',
  ].forEach((token) => assertIncludes(monthlyRoute, token, 'Reseller monthly-summary month boundary'));

  [
    'applyResellerReadRateLimit(session, "profile")',
    'db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(resellerId).get()',
    '.where("email", "==", normalizedEmail)',
    'const { password: _password, ...profileData } = profileDoc.data() || {};',
    "logResellerApiFailure('reseller_profile_route_failed'",
    "requiredPlatformRole: 'RESELLER'",
  ].forEach((token) => assertIncludes(profileRoute, token, 'Reseller profile API'));

  [
    clientsRoute,
    monthlyRoute,
    profileRoute,
  ].forEach((route, index) => {
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
    'isRecord(data) || !Array.isArray(data.resellers) || !isRecord(data.totals)',
    '!isRecord(data?.profile)',
    '!Array.isArray(data?.transactions)',
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
}

function verifyDesktopSurfaces(dashboard, management, onboarding) {
  [
    'RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024',
    'readJsonResponseWithLimit<ResellerAddLocationCapacityResponse>',
    "fetch('/api/reseller/add-location-capacity'",
    '...RESELLER_REQUEST_POLICY',
    'isValidAddLocationCapacityResponse(data, expectedAddLocationResponse)',
    'hasExpectedStoreId',
    'hasExpectedTenantId',
    'copyResellerTextToClipboard(link)',
    "window.open(link, '_blank', 'noopener,noreferrer')",
  ].forEach((token) => assertIncludes(dashboard, token, 'Desktop reseller dashboard'));

  [
    "platformRole !== 'PLATFORM'",
    "redirect('/dashboard')",
    'RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)",
    "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)",
    'readJsonResponseWithLimit<unknown>',
    'isValidResellerProfilesResponse(data)',
    'isValidResellerMonthlySummary(data)',
    'isExpectedResellerManagementSaveResponse(result, editingProfile?.id)',
    'hasExpectedProfileId',
  ].forEach((token) => assertIncludes(management, token, 'Desktop reseller management'));

  [
    'RESELLER_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    "fetch('/api/reseller/onboard'",
    '...RESELLER_REQUEST_POLICY',
    'readJsonResponseWithLimit<unknown>',
    'isValidOnboardResult(data)',
    'normalizePhoneNumberForStorage({',
    'ownerPassword: values.ownerPassword',
    'copyResellerTextToClipboard(copyValue)',
    'hasResellerClipboardWrite()',
    'hasResellerCopyFallback()',
  ].forEach((token) => assertIncludes(onboarding, token, 'Desktop reseller onboarding'));

  [
    dashboard,
    management,
    onboarding,
  ].forEach((component, index) => {
    ['response.json()', '.json().catch', 'console.error', 'error.message'].forEach((token) => (
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
    'style={{ minHeight: 44',
    'copyMobileResellerDashboardText(link)',
    "window.open(link, '_blank', 'noopener,noreferrer')",
  ].forEach((token) => assertIncludes(dashboard, token, 'Mobile reseller dashboard'));

  [
    'platformRole === ECOMSAI_PLATFORM_USER_ROLE',
    'MOBILE_RESELLER_MANAGEMENT_RESPONSE_JSON_MAX_BYTES = 64 * 1024',
    "fetch('/api/reseller/manage', RESELLER_REQUEST_POLICY)",
    "fetch('/api/reseller/monthly-summary', RESELLER_REQUEST_POLICY)",
    'readJsonResponseWithLimit<unknown>',
    'isValidMobileResellerProfilesResponse(data)',
    'isValidMobileResellerMonthlySummary(data)',
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
    'isValidMobileOnboardResult(data)',
    'normalizePhoneNumberForStorage({',
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
    ['response.json()', '.json().catch', 'console.error', 'error.message'].forEach((token) => (
      assertNotIncludes(component, token, `Mobile reseller component ${index} boundary`)
    ));
  });
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
  ].forEach((token) => assertIncludes(readme, token, 'Reseller README docs'));

  [
    '### 8.2 Scale Thresholds',
    'Current tier availability is controlled by `active` on each entry in `src/config/resellerPricing.ts`',
    'offline payment availability is controlled by `RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE`',
    'Commission or referral payouts are not part of the current runtime.',
    'No current commission runtime exists.',
    'Other currencies require a separate pricing, tax, billing, and docs audit before they are exposed.',
    'Menu upload/extraction happens later through the normal owner dashboard and import/review flows',
    'The reseller onboarding route creates the tenant/store account and claim/login handoff.',
    'Menu images/PDFs/text are not uploaded or extracted in this onboarding API path',
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
    'Platform reseller management validates update `profileId` through the shared Firestore document-ID boundary',
    'compatibility field; active route does not upload/extract menu files',
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
    'validates update `profileId` through the shared Firestore document-ID boundary before reseller profile lookup',
    'Browser Handoff Diagnostics',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Reseller Firebase docs'));

  [
    'July 5, 2026 monthly-summary query boundary:',
    'Malformed or impossible explicit `month` query values now return `400` before monthly transaction/profile reads',
    'Missing `month` still uses the current India month',
  ].forEach((token) => assertIncludes(impl, token, 'Reseller implementation monthly-summary query boundary'));

  [
    'Reseller Management Profile ID Boundary',
    'Reseller profile IDs are validated before updates',
    'old slash-only guard removal',
    'Reseller Monthly Summary Query Boundary',
    'Explicit reseller monthly-summary months are calendar-validated',
    'Invalid explicit months fail before Firestore reads',
    'verify:reseller-dashboard-boundary',
  ].forEach((token) => assertIncludes(changelog, token, 'Reseller changelog monthly-summary query boundary'));

  [
    'verify:reseller-dashboard-boundary',
    'Mobile Relevance Decision: **YES',
    'Mobile uses the same `/api/reseller/clients`, `/api/reseller/monthly-summary`, `/api/reseller/onboard`, and `/api/reseller/add-location-capacity` routes as desktop.',
    'Mobile reseller write actions use the same `DATA_WRITE` throttled, 16KB bounded JSON API routes as desktop.',
    'The reseller onboarding mobile path does not upload menu files',
    'owners add menu sources later through the normal MenuList mobile/desktop import flow.',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Reseller mobile docs'));

  [
    'Reseller Management Profile ID Boundary checkpoint',
    'old slash-only guard removal',
    'verify:reseller-dashboard-boundary',
    'reseller dashboard',
    'No Firebase deploy, Vercel deploy, production build',
  ].forEach((token) => assertIncludes(auditDoc, token, 'MenuList production audit'));
}

const files = {
  packageJson: read('package.json'),
  readRateLimit: read('src/app/api/reseller/readRateLimit.ts'),
  manageRoute: read('src/app/api/reseller/manage/route.ts'),
  onboardRoute: read('src/app/api/reseller/onboard/route.ts'),
  confirmPaymentRoute: read('src/app/api/reseller/confirm-payment/route.ts'),
  renewRoute: read('src/app/api/reseller/renew/route.ts'),
  addLocationRoute: read('src/app/api/reseller/add-location-capacity/route.ts'),
  clientsRoute: read('src/app/api/reseller/clients/route.ts'),
  monthlyRoute: read('src/app/api/reseller/monthly-summary/route.ts'),
  profileRoute: read('src/app/api/reseller/profile/route.ts'),
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
  changelog: read('__docs__/CHANGELOG.md'),
};

verifyPackageScript(files.packageJson);
verifyReadRateLimit(files.readRateLimit);
verifyManageRoute(files.manageRoute);
verifyOnboardRoute(files.onboardRoute);
verifyConfirmPaymentRoute(files.confirmPaymentRoute);
verifyRenewRoute(files.renewRoute);
verifyAddLocationRoute(files.addLocationRoute);
verifyReadRoutes(files.clientsRoute, files.monthlyRoute, files.profileRoute);
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
