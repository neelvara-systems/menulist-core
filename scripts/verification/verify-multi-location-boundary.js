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

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertIncludesOneOf(content, needles, label) {
  assert(
    needles.some((needle) => content.includes(needle)),
    `${label} must include one of ${needles.join(' | ')}`,
  );
}

function assertOrder(content, orderedTokens, label) {
  let previousIndex = -1;
  for (const token of orderedTokens) {
    const index = content.indexOf(token);
    assert(index !== -1, `${label} missing token ${token}`);
    assert(index > previousIndex, `${label} must keep token order at ${token}`);
    previousIndex = index;
  }
}

function verifyOutletActionRoute(content, label, maxBodyToken, limiterToken) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(tenantId)',
    limiterToken,
    'checkRateLimit({ key:',
    `readBoundedJsonBody(request, ${maxBodyToken}`,
    'validateAPIInput(schema, body)',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_OUTLETS',
    'logMultiOutletFailure(',
    'getBoundedMultiOutletStringContext',
    'revalidateTag(',
    'touchDigitalScreenContentVersionForStoreServer',
    'invalidateOwnerBusinessAssistantPacketCache',
  ].forEach((token) => assertIncludes(content, token, label));
  assertIncludesOneOf(
    content,
    ['revalidateTag("client-stores")', "revalidateTag('client-stores')"],
    `${label} client stores cache invalidation`,
  );
  assertIncludesOneOf(
    content,
    ['revalidateTag("screen-data")', "revalidateTag('screen-data')"],
    `${label} screen data cache invalidation`,
  );

  assertOrder(
    content,
    [
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'hashPublicRateLimitValue(tenantId)',
      'checkRateLimit({ key:',
      `readBoundedJsonBody(request, ${maxBodyToken}`,
      'validateAPIInput(schema, body)',
    ],
    `${label} admission order`,
  );

  [
    'console.log(',
    'console.error(',
    'secureError(',
    'data.error ||',
    'throw new Error(data.error',
    'res.json().catch(() => ({}))',
  ].forEach((token) => assertNotIncludes(content, token, `${label} raw diagnostics boundary`));
}

function verifyCreateRoute(createRoute) {
  verifyOutletActionRoute(createRoute, 'Outlet create route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_OUTLET_CREATION',
    'FEATURE_FLAGS.ENABLE_OUTLET_BILLING',
    "sub.status !== 'active'",
    'getRazorpayManagedSubscriptionId(sub)',
    'isRazorpayQuantityUpdateUnsupported(billingError)',
    'outletCreationLock',
    'buildUserStoreAccessUpdate(',
    'buildSummaryProjectPayload(',
    'activeStoreCount = initialStoresList.filter((s: any) => s?.active !== false).length || 1',
    [
      'const currentOutlets = initialStoresList.filter((s: any) => (',
      '                Number(s?.storeId) !== Number(storeId)',
      '                && !s.isMaster',
      '                && s?.active !== false',
      '            )).length;',
    ].join('\n'),
    'updateRazorpaySubscriptionQuantity(providerSubId, newQty)',
    'await updateSubscription(subId, { quantity: newQty });',
    'multi_outlet_billing_provider_quantity_revert_failed',
    'multi_outlet_subscription_quantity_revert_failed',
    'multi_outlet_create_lock_release_failed',
    'OUTLET_LOCATION_PAYMENT_REQUIRED',
  ].forEach((token) => assertIncludes(createRoute, token, 'Outlet create route boundary'));

  assertOrder(
    createRoute,
    [
      'await updateRazorpaySubscriptionQuantity(providerSubId, newQty);',
      'await updateSubscription(subId, { quantity: newQty });',
      'const masterProjectsSnap = await db',
      'const result = await db.runTransaction(async (tx) => {',
    ],
    'Outlet create provider/internal write order',
  );

  assertOrder(
    createRoute,
    [
      'const masterProjectsSnap = await db',
      '.where(\'deleted\', \'!=\', true)',
      'const outletSlug = await buildUniqueOutletSlug(db, tenantId, outletName);',
      'const result = await db.runTransaction(async (tx) => {',
      'tx.set(db.doc(`${DB_COLLECTIONS.STORES}/${newStoreId}`),',
      'tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`), storesSummaryPayload, { merge: true });',
      'tx.update(tenantRef, {',
    ],
    'Outlet create transaction payload order',
  );
}

function verifyDeactivateRoute(deactivateRoute) {
  verifyOutletActionRoute(deactivateRoute, 'Outlet deactivate route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet-deactivate:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_OUTLET_DEACTIVATE',
    'const targetStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreId}`);',
    'const targetStoreSnap = await targetStoreRef.get();',
    'Number(targetStore?.tenantId) !== Number(tenantId)',
    'targetStore?.isMaster === true',
    'targetStore?.active === false && target.active === false',
    'tx.get(targetStoreRef)',
    'freshTarget?.isMaster === true',
    'tx.update(targetStoreRef, {',
    'active: false',
    'tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`),',
    'tx.update(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`), { storesList: updatedStoresList });',
    'FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING',
    "logger.security('Outlet Deactivated'",
  ].forEach((token) => assertIncludes(deactivateRoute, token, 'Outlet deactivate route boundary'));
}

function verifyRenameRoute(renameRoute) {
  verifyOutletActionRoute(renameRoute, 'Outlet rename route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet-rename:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'MAX_PREVIOUS_OUTLET_SLUGS = 5',
    'isReservedOutletSlug(proposed)',
    'outlet.active === false',
    ".where('outletSlug', '==', proposed)",
    ".where('active', '==', true)",
    ".where('previousOutletSlugs', 'array-contains', proposed)",
    'const foreignChain = chainCollisionSnap.docs.find((d) => d.id !== outletStoreIdStr);',
    'const cappedChain = nextChain.slice(-MAX_PREVIOUS_OUTLET_SLUGS);',
    'tx.update(outletRef, updatePayload);',
    'tx.set(summaryRef, summaryPayload, { merge: true });',
    'tx.update(tenantRef, { storesList: updatedStoresList });',
  ].forEach((token) => assertIncludes(renameRoute, token, 'Outlet rename route boundary'));
}

function verifyPolicyRoute(policyRoute) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(tenantId)',
    'outlet-policy:${tenantRateLimitHash}',
    'readBoundedJsonBody(request, OUTLET_POLICY_MAX_BODY_BYTES',
    'validateAPIInput(schema, body)',
    'outletPolicySchema',
    '.strict().refine((value) => Object.keys(value).length > 0',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_OUTLETS',
    'storeData.isMaster !== true && !masterPromoted',
    'const mergedPolicy = {',
    '...(storeData.outletPolicy || DEFAULT_OUTLET_POLICY)',
    '...v.data.policy',
    'tx.set(storeRef,',
    'tx.update(tenantRef,',
    'tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`),',
    'touchDigitalScreenContentVersionForStoreServer(storeId, "outletPolicy")',
    'invalidateOwnerBusinessAssistantPacketCache({',
    'outlet_policy_update_route_failed',
  ].forEach((token) => assertIncludes(policyRoute, token, 'Outlet policy route boundary'));
  assertIncludesOneOf(
    policyRoute,
    ['revalidateTag("client-stores")', "revalidateTag('client-stores')"],
    'Outlet policy route boundary client stores cache invalidation',
  );
  assertIncludesOneOf(
    policyRoute,
    ['revalidateTag("screen-data")', "revalidateTag('screen-data')"],
    'Outlet policy route boundary screen data cache invalidation',
  );

  assertOrder(
    policyRoute,
    [
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'checkRateLimit({ key:',
      'readBoundedJsonBody(request, OUTLET_POLICY_MAX_BODY_BYTES',
      'validateAPIInput(schema, body)',
      'requireAnyStorePermissionForStoreData(',
      'await db.runTransaction(async (tx) => {',
    ],
    'Outlet policy route admission order',
  );
}

function verifyLinkedOutletSaveRoute(route) {
  [
    'export const POST = withAuth(async (request: NextRequest, session) => {',
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'OUTLET_SAVE_MAX_BODY_BYTES = 2 * 1024 * 1024',
    'readBoundedJsonBody(request, OUTLET_SAVE_MAX_BODY_BYTES',
    'validateAPIInput(schema, body)',
    'parseProjectId(project.projectId)',
    'parseProjectId(project.masterProjectId)',
    'verifyTenantAccess(session, tenantId, currentStoreId, request)',
    'hashPublicRateLimitValue(session.uId || session.user?.id || "unknown")',
    'hashPublicRateLimitValue(project.projectId)',
    'outlet-save:${userRateLimitHash}:${projectRateLimitHash}',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_MENU',
    'Number(outletStore?.tenantId) !== tenantId || outletStore?.active === false',
    'Number(masterStore?.tenantId) !== tenantId || masterStore?.active === false',
    'store?.active !== false',
    'currentStoreId !== outletStoreId && callerStore?.isMaster !== true',
    'existingProject?.masterProjectId !== project.masterProjectId',
    'OUTLET_PROJECT_WRITE_FIELDS',
    'DANGEROUS_KEYS',
    'LOCAL_CATEGORY_PREFIX',
    'LOCAL_ITEM_PREFIX',
    'getOutletPolicyViolation(project, existingProject, outletPolicy)',
    'hasAddedIds(nextLocalIds.categoryIds, previousLocalIds.categoryIds)',
    'hasAddedIds(nextLocalIds.itemIds, previousLocalIds.itemIds)',
    'project.active === false && outletPolicy.allowProjectDeactivate === false',
    'sanitizeForFirestore({',
    'pickOutletProjectWriteFields(project)',
    'await existingProjectSnap.ref.set(safeProject, { merge: true });',
    'revalidateTag(`menu-store-${outletStoreId}`)',
    'revalidateTag(`store-${outletStoreId}`)',
    'revalidateTag("client-stores")',
    'revalidateTag("screen-data")',
    'touchDigitalScreenContentVersionForStoreServer(outletStoreId, "linkedOutletSave")',
    'invalidateOwnerBusinessAssistantPacketCache({',
    'linked_outlet_save_validation_failed',
    'linked_outlet_save_route_failed',
  ].forEach((token) => assertIncludes(route, token, 'Linked outlet save route boundary'));

  assertOrder(
    route,
    [
      'readBoundedJsonBody(request, OUTLET_SAVE_MAX_BODY_BYTES',
      'validateAPIInput(schema, body)',
      'verifyTenantAccess(session, tenantId, currentStoreId, request)',
      'checkRateLimit({',
      'Promise.all([',
      'requireAnyStorePermissionForStoreData(',
      'getOutletPolicyViolation(project, existingProject, outletPolicy)',
      'await existingProjectSnap.ref.set(safeProject, { merge: true });',
      'revalidateTag(`menu-store-${outletStoreId}`)',
    ],
    'Linked outlet save route validation/write order',
  );
}

function verifyClientBoundaries(files) {
  const {
    actionGuards,
    linkedOutletSaveResponse,
    multiOutletDal,
    desktopLocations,
    addOutletModal,
    outletRenameModal,
    outletPolicyEditor,
    mobileLocations,
    mobileShell,
    mobileMore,
  } = files;

  [
    'export const MULTI_OUTLET_ACTION_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES = 16 * 1024',
    'OUTLET_LOCATION_PAYMENT_REQUIRED_CODE',
    'isOutletCreateResponse',
    'isOutletRenameResponse',
    'isOutletDeactivateResponse',
    'isOutletPaymentRequiredResponse',
  ].forEach((token) => assertIncludes(actionGuards, token, 'Multi-location action response guard'));

  [
    'LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024',
    'export const LINKED_OUTLET_SAVE_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'isLinkedOutletSaveResponse',
    'data.project.projectId === expectedProjectId',
    'data.project.masterProjectId === expectedMasterProjectId',
    'readJsonResponseWithLimit<unknown>',
  ].forEach((token) => assertIncludes(linkedOutletSaveResponse, token, 'Linked outlet save response guard'));

  [
    'readJsonResponseWithLimit<unknown>',
    'OUTLET_POLICY_RESPONSE_JSON_MAX_BYTES',
    'isOutletPolicyResponse',
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'fetch("/api/outlets/policy"',
    'outlet_policy_response_invalid',
  ].forEach((token) => assertIncludes(multiOutletDal, token, 'Multi-outlet DAL policy acknowledgement'));

  [
    'canManageLocationSettings({',
    'canCreateOutletLocation({',
    'activeCount = storesList.filter((s: any) => s.active !== false).length',
    'activeOutletCount = storesList.filter((s: any) => !s.isMaster && s.active !== false).length',
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readDesktopLocationActionResponse(res,',
    'isOutletDeactivateResponse(data)',
    'desktop_location_deactivate_response_invalid',
    '<AddOutletModal',
    '<OutletRenameModal',
    '<OutletPolicyEditor',
  ].forEach((token) => assertIncludes(desktopLocations, token, 'Desktop Locations boundary'));

  [
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readDesktopAddOutletResponse(',
    'isOutletPaymentRequiredResponse(data)',
    'isOutletCreateResponse(data)',
    'desktop_location_create_response_invalid',
    'router.push(\'/billing\')',
  ].forEach((token) => assertIncludes(addOutletModal, token, 'Desktop Add Outlet boundary'));

  [
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readDesktopOutletRenameResponse(res,',
    'isOutletRenameResponse(body)',
    'desktop_location_rename_response_invalid',
    'slugify(raw)',
    'currentOutletSlug',
  ].forEach((token) => assertIncludes(outletRenameModal, token, 'Desktop Outlet Rename boundary'));

  [
    'updateOutletPolicy(storeId, { [key]: checked })',
    'desktop_outlet_policy_update_failed',
  ].forEach((token) => assertIncludes(outletPolicyEditor, token, 'Desktop Outlet Policy boundary'));

  [
    'canManageLocationSettings({',
    'canCreateOutletLocation({',
    'activeStoresList = storesList.filter((store: any) => store.active !== false)',
    'outletCount = activeStoresList.filter((store: any) => !store.isMaster).length',
    'hasBillingAccess = !FEATURE_FLAGS.ENABLE_OUTLET_BILLING',
    'if ((target as any)?.active === false)',
    '...AUTH_ACCOUNT_REQUEST_POLICY',
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readMobileOutletActionResponse(res,',
    'isOutletDeactivateResponse(data)',
    'isOutletRenameResponse(data)',
    'isOutletPaymentRequiredResponse(data)',
    'isOutletCreateResponse(data)',
    'updateOutletPolicy(policyStoreId, changedPolicy)',
    'mobile_location_deactivate_response_invalid',
    'mobile_location_rename_response_invalid',
    'mobile_location_create_response_invalid',
    'onOpenBilling',
    'style={{ minHeight: 44 }}',
  ].forEach((token) => assertIncludes(mobileLocations, token, 'Mobile Locations boundary'));

  [
    "'/locations': { tab: 'more', todayScreen: 'main', moreScreen: 'locations' }",
  ].forEach((token) => assertIncludes(mobileShell, token, 'MobileShell Locations route map'));

  [
    "| 'locations'",
    "canManageLocations ? [{ key: 'locations'",
    "onClick: () => openSubScreen('locations')",
    "if (screen === 'locations') return canManageLocations;",
    "else if (subScreen === 'locations') subScreenContent = <MobileLocationsScreen",
    "onOpenBilling={() => setSubScreen('billing')}",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More Locations boundary'));

  [
    'data.error ||',
    'data?.error',
    'error?.message',
    'res.json().catch(() => ({}))',
    'const data = await res.json()',
    'response.json().catch(() => ({}))',
  ].forEach((token) => {
    assertNotIncludes(desktopLocations, token, `Desktop Locations raw response boundary ${token}`);
    assertNotIncludes(addOutletModal, token, `Desktop Add Outlet raw response boundary ${token}`);
    assertNotIncludes(outletRenameModal, token, `Desktop Outlet Rename raw response boundary ${token}`);
    assertNotIncludes(mobileLocations, token, `Mobile Locations raw response boundary ${token}`);
  });
}

function verifyDocs(packageJson, docs) {
  const {
    implDoc,
    mobileDoc,
    firebaseDoc,
    verificationDoc,
    auditDoc,
    readmeDoc,
    specDoc,
    testCasesDoc,
    aiExtractionDoc,
    storeOnboardingSpecDoc,
    storeOnboardingImplDoc,
    storeOnboardingBillingDoc,
    marketingDoc,
    multiChainFirebaseDoc,
    multiChainVerificationDoc,
    multiChainMarketingDoc,
    rolesPermissionsFirebaseDoc,
    changelogDoc,
  } = docs;

  assert(
    packageJson.scripts?.['verify:multi-location-boundary'] === 'node scripts/verification/verify-multi-location-boundary.js',
    'package.json must expose verify:multi-location-boundary',
  );

  for (const [label, content] of [
    ['Multi-outlet README', readmeDoc],
    ['Multi-outlet spec', specDoc],
    ['Multi-outlet Firebase doc', firebaseDoc],
    ['Multi-outlet test cases', testCasesDoc],
    ['Multi-outlet AI extraction doc', aiExtractionDoc],
    ['Multi-outlet verification doc', verificationDoc],
    ['Store onboarding spec', storeOnboardingSpecDoc],
    ['Store onboarding implementation', storeOnboardingImplDoc],
    ['Store onboarding billing implementation', storeOnboardingBillingDoc],
    ['Multi-outlet marketing doc', marketingDoc],
    ['Multi-chain permissions Firebase doc', multiChainFirebaseDoc],
    ['Multi-chain permissions verification doc', multiChainVerificationDoc],
    ['Multi-chain permissions marketing doc', multiChainMarketingDoc],
    ['Roles permissions Firebase doc', rolesPermissionsFirebaseDoc],
  ]) {
    assertIncludes(content, 'not current launch certification', `${label} launch boundary status`);
    assertIncludes(content, 'production-readiness audit', `${label} audit launch boundary`);
    assertIncludes(content, 'External Certification Runbook', `${label} external certification boundary`);
  }

  [
    ['Multi-outlet README', readmeDoc, '> **Status:** ✅ Production Ready'],
    ['Multi-outlet spec', specDoc, '**Status:** ✅ Production Ready'],
    ['Multi-outlet Firebase doc', firebaseDoc, '**Status:** ✅ Production Ready'],
    ['Multi-outlet test cases', testCasesDoc, '> **Status:** ✅ Production Ready'],
    ['Multi-outlet AI extraction doc', aiExtractionDoc, '**Status:** ✅ Production Ready'],
    ['Multi-outlet verification doc', verificationDoc, '**Status:** ✅ Production Ready'],
    ['Store onboarding spec', storeOnboardingSpecDoc, '**Status:** ✅ Production Ready'],
    ['Store onboarding implementation', storeOnboardingImplDoc, '**Status:** ✅ Production Ready'],
    ['Store onboarding billing implementation', storeOnboardingBillingDoc, '**Status:** ✅ Production Ready'],
    ['Multi-outlet spec', specDoc, '**DOCUMENT STATUS:** ✅ SPEC LOCK — Ready for Implementation'],
    ['Multi-outlet implementation', implDoc, '**DOCUMENT STATUS:** ✅ Implementation Blueprint Ready'],
    ['Multi-outlet marketing doc', marketingDoc, '**DOCUMENT STATUS:** ✅ Marketing Collateral Ready'],
    ['Store onboarding spec', storeOnboardingSpecDoc, '**DOCUMENT STATUS:** 📋 ANALYSIS COMPLETE — AWAITING PRODUCT OWNER REVIEW'],
    ['Store onboarding implementation', storeOnboardingImplDoc, '**DOCUMENT STATUS:** 📋 IMPLEMENTATION PLAN READY'],
    ['Store onboarding billing implementation', storeOnboardingBillingDoc, '**DOCUMENT STATUS:** 📋 IMPLEMENTATION PLAN READY'],
    ['Multi-chain permissions Firebase doc', multiChainFirebaseDoc, '**Status:** ✅ Production Ready'],
    ['Multi-chain permissions verification doc', multiChainVerificationDoc, '**Status:** ✅ Production Ready after final review + production audit'],
    ['Multi-chain permissions marketing doc', multiChainMarketingDoc, '**Status:** ✅ Production Ready'],
    ['Multi-chain permissions marketing doc', multiChainMarketingDoc, '**DOCUMENT STATUS:** ✅ Production Ready'],
    ['Roles permissions Firebase doc', rolesPermissionsFirebaseDoc, '**Status:** ✅ Production Ready'],
  ].forEach(([label, content, token]) => assertNotIncludes(content, token, `${label} stale production-ready status`));

  assertNotIncludes(
    testCasesDoc,
    'to ensure the multi-outlet feature is production-ready',
    'Multi-outlet test cases stale production-ready test-matrix claim',
  );
  assertNotIncludes(
    testCasesDoc,
    '| Feature completeness | ✅ Production ready',
    'Multi-outlet test cases stale final-assessment production-ready row',
  );
  assertIncludes(
    testCasesDoc,
    '| Feature completeness | Historical QA evidence; not current launch certification |',
    'Multi-outlet test cases final-assessment launch boundary row',
  );
  assertIncludes(testCasesDoc, 'release-gate coverage', 'Multi-outlet test cases release gate coverage wording');
  assertIncludes(aiExtractionDoc, 'verify:menu-extraction-pipeline', 'Multi-outlet AI extraction extraction verifier boundary');
  assertIncludes(aiExtractionDoc, 'Historical implementation analysis; not current implementation approval or launch certification', 'Multi-outlet AI extraction historical implementation boundary');
  assertNotIncludes(aiExtractionDoc, '**Status:** ✅ READY FOR IMPLEMENTATION', 'Multi-outlet AI extraction stale implementation-ready footer');
  assertIncludes(specDoc, '**DOCUMENT STATUS:** Source evidence only - not current launch certification', 'Multi-outlet spec footer launch boundary');
  assertIncludes(implDoc, '**DOCUMENT STATUS:** Historical implementation blueprint/source evidence - not current launch certification', 'Multi-outlet implementation footer launch boundary');
  assertIncludes(marketingDoc, '**DOCUMENT STATUS:** Source-backed marketing evidence - not current collateral approval; not current launch certification', 'Multi-outlet marketing footer launch boundary');
  assertIncludes(storeOnboardingSpecDoc, '**DOCUMENT STATUS:** Implemented source evidence - not current launch certification', 'Store onboarding spec footer launch boundary');
  assertIncludes(storeOnboardingImplDoc, '**DOCUMENT STATUS:** Implemented source evidence - not current launch certification', 'Store onboarding implementation footer launch boundary');
  assertIncludes(storeOnboardingBillingDoc, '**DOCUMENT STATUS:** Billing implementation evidence - not current launch certification', 'Store onboarding billing implementation footer launch boundary');
  assertIncludes(auditDoc, 'Mobile, strategy, and multi-outlet reference-boundary checkpoint', 'Production audit mobile/strategy/multi-outlet reference-boundary checkpoint');
  assertIncludes(storeOnboardingBillingDoc, 'Razorpay sandbox evidence for quantity update/replacement subscription paths', 'Store onboarding billing provider smoke boundary');
  assertIncludes(rolesPermissionsFirebaseDoc, 'staff role CRUD QA', 'Roles permissions Firebase staff QA boundary');

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'source-only and does not run browser, Razorpay, Firebase deploy, or live Firestore smoke',
    'active non-master outlets only',
  ].forEach((token) => assertIncludes(implDoc, token, 'Multi-outlet implementation source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'MobileShell route mapping',
    'shared outlet action request policy',
    'bounded acknowledgement guards',
    'server-side maximum-outlet cap',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Multi-outlet mobile source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'performs no Firestore reads/writes/deletes',
    'does not call Razorpay',
    'Active-only max-outlet cap is cost-neutral',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Multi-outlet Firebase source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'server-owned outlet lifecycle routes',
    'linked outlet save acknowledgement',
    'Replacement cap',
  ].forEach((token) => assertIncludes(verificationDoc, token, 'Multi-outlet verification source gate docs'));

  [
    'Multi-location boundary source gate',
    'verify:multi-location-boundary',
    'source-only outlet lifecycle/project-save/mobile-shell gate',
    'active-cap source checkpoint',
    'Browser smoke for desktop/mobile Locations, Add Outlet, Rename Outlet, and Deactivate Outlet remains pending',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit multi-location source gate evidence'));

  [
    'Multi-location and permission docs launch-boundary checkpoint',
    'no longer present their implementation, cost, QA, marketing, billing, or permission evidence as current production certification',
    'Razorpay sandbox evidence for quantity update/replacement subscription paths',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit multi-location doc-boundary evidence'));

  [
    'Multi-Outlet companion footer-boundary checkpoint',
    'no longer present old implementation-ready, implementation-plan-ready, analysis-complete, or marketing-collateral-ready footers as current approval',
    'No Multi-Outlet runtime behavior',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit multi-location companion footer-boundary evidence'));

  [
    'Multi-Outlet Companion Footer Boundary',
    'Old bottom labels are source-bounded',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog multi-location companion footer-boundary evidence'));
}

function verifyMultiLocationBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const createRoute = read('src/app/api/outlets/create/route.ts');
  const deactivateRoute = read('src/app/api/outlets/deactivate/route.ts');
  const renameRoute = read('src/app/api/outlets/rename/route.ts');
  const policyRoute = read('src/app/api/outlets/policy/route.ts');
  const linkedOutletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  const files = {
    actionGuards: read('src/lib/multiOutlet/outletActionResponseGuards.ts'),
    linkedOutletSaveResponse: read('src/lib/multiOutlet/linkedOutletSaveResponse.ts'),
    multiOutletDal: read('src/database/multiOutlet/index.ts'),
    desktopLocations: read('src/app/(main)/locations/page.tsx'),
    addOutletModal: read('src/components/organisms/AddOutletModal/index.tsx'),
    outletRenameModal: read('src/components/organisms/OutletRenameModal/index.tsx'),
    outletPolicyEditor: read('src/components/organisms/OutletPolicyEditor/index.tsx'),
    mobileLocations: read('src/components/mobile/screens/MobileLocationsScreen.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
  };
  const docs = {
    implDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md'),
    mobileDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_mobile-support.md'),
    firebaseDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_firebase.md'),
    verificationDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_verification.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    readmeDoc: read('__docs__/multi-outlet-consistency/README.md'),
    specDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_spec.md'),
    testCasesDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_test-cases.md'),
    aiExtractionDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_ai-extraction.md'),
    storeOnboardingSpecDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding_spec.md'),
    storeOnboardingImplDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md'),
    storeOnboardingBillingDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding-billing_impl.md'),
    marketingDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_marketing.md'),
    multiChainFirebaseDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_firebase.md'),
    multiChainVerificationDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_verification.md'),
    multiChainMarketingDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_marketing.md'),
    rolesPermissionsFirebaseDoc: read('__docs__/roles-permissions/roles-permissions_firebase.md'),
    changelogDoc: read('__docs__/CHANGELOG.md'),
  };

  verifyCreateRoute(createRoute);
  verifyDeactivateRoute(deactivateRoute);
  verifyRenameRoute(renameRoute);
  verifyPolicyRoute(policyRoute);
  verifyLinkedOutletSaveRoute(linkedOutletSaveRoute);
  verifyClientBoundaries(files);
  verifyDocs(packageJson, docs);
}

verifyMultiLocationBoundary();
console.log('Multi-location boundary verifier passed');
