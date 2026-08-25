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
    'getOutletSessionScope(session)',
    'const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(tenantDocumentId)',
    limiterToken,
    'checkRateLimit({ key:',
    `readBoundedJsonBody(request, ${maxBodyToken}`,
    'validateAPIInput(schema, body)',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_OUTLETS',
    'logMultiOutletFailure(',
    'getBoundedMultiOutletStringContext',
    'runStorePublicTruthPostCommitEffects({',
    'revalidateTag(',
    'touchDigitalScreenContentVersionForStoreServer',
    'invalidateOwnerBusinessAssistantPacketCache',
  ].forEach((token) => assertIncludes(content, token, label));
  assertIncludes(content, 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })', `${label} shared cache invalidation handoff`);

  assertOrder(
    content,
    [
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'hashPublicRateLimitValue(tenantDocumentId)',
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
    'const { tId: tenantId, sId: storeId } = session',
    'hashPublicRateLimitValue(tenantId)',
  ].forEach((token) => assertNotIncludes(content, token, `${label} raw diagnostics boundary`));
}

function verifyOutletSessionScopeHelper(helper) {
  [
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'export type OutletSessionScope = {',
    'tenantDocumentId: string;',
    'storeDocumentId: string;',
    'export function normalizeOutletDocumentId(value: unknown): string | null',
    'return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;',
    'function normalizeOutletSessionDocumentId(value: unknown): OutletSessionDocumentId | null',
    'function normalizeOutletSessionDocumentIdAliases(values: unknown[]): OutletSessionDocumentId | null',
    'export function getOutletSessionScope(session: unknown): OutletSessionScope | null',
    'source.user?.tenantId',
    'source.user?.storeId',
    'normalized.every((value) => value?.documentId === first.documentId)',
  ].forEach((token) => assertIncludes(helper, token, 'Outlet session scope helper boundary'));
}

function verifyProjectIdBoundary(helper, resolver, linkedOutletSaveRoute) {
  [
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'export const MULTI_OUTLET_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;',
    'const MULTI_OUTLET_NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;',
    'export type MultiOutletProjectIdScope = {',
    'tenantDocumentId: string;',
    'storeDocumentId: string;',
    'export function normalizeMultiOutletNumericDocumentId(value: unknown): MultiOutletNumericDocumentId | null',
    'documentId !== raw',
    '!MULTI_OUTLET_NUMERIC_DOCUMENT_ID_PATTERN.test(documentId)',
    'String(numericId) === documentId',
    'export function normalizeMultiOutletProjectId(value: unknown): MultiOutletProjectIdScope | null',
    '!MULTI_OUTLET_PROJECT_ID_PATTERN.test(projectId)',
    'const tenantScope = normalizeMultiOutletNumericDocumentId(parts[0]);',
    'const storeScope = normalizeMultiOutletNumericDocumentId(parts[parts.length - 1]);',
  ].forEach((token) => assertIncludes(helper, token, 'Multi-outlet shared project ID boundary'));
  [
    'export function isMultiOutletTenantStoreListEntryInScope(',
    'const storeScope = normalizeMultiOutletNumericDocumentId(entry.storeId);',
    'if (entry.active !== undefined && typeof entry.active !== "boolean") return false;',
    'if (!expected.allowInactive && entry.active === false) return false;',
    'entry.isMaster !== expected.isMaster',
  ].forEach((token) => assertIncludes(helper, token, 'Multi-outlet tenant membership boundary'));

  [
    'import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";',
    'const scope = normalizeMultiOutletProjectId(projectId);',
    'throw new Error("Invalid multi-outlet project reference");',
    'const masterProjectScope = normalizeMultiOutletProjectId(storeProject.masterProjectId);',
    "logMultiOutletFailure('multi_outlet_master_project_reference_invalid'",
    'const { tId, sId: masterStoreId } = masterProjectScope;',
  ].forEach((token) => assertIncludes(resolver, token, 'Multi-outlet resolver project ID boundary'));

  [
    'parseInt(parts[0], 10)',
    'parseInt(parts[parts.length - 1], 10)',
  ].forEach((token) => assertNotIncludes(resolver, token, 'Multi-outlet resolver must not prefix-parse project scope'));

  [
    'isMultiOutletTenantStoreListEntryInScope,',
    'normalizeMultiOutletNumericDocumentId,',
    'normalizeMultiOutletProjectId,',
    'const outletProjectRef = normalizeMultiOutletProjectId(project.projectId);',
    'const masterProjectRef = normalizeMultiOutletProjectId(project.masterProjectId);',
      'const outletSessionScope = getOutletSessionScope(session);',
      'const currentStoreScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId);',
    'linked_outlet_save_invalid_session_store_scope',
    'const currentStoreId = currentStoreScope.numericId;',
    'normalizePersistedOutletPolicy(masterStore?.outletPolicy)',
    'linked_outlet_policy_invalid',
  ].forEach((token) => assertIncludes(linkedOutletSaveRoute, token, 'Linked outlet save shared project ID boundary'));

  [
    'const parseProjectId = (projectId: string): { tId: number; sId: number } | null => {',
    'const tId = Number(parts[0]);',
    'const sId = Number(parts[parts.length - 1]);',
    'const currentStoreId = Number(session.sId || session.user?.storeId);',
  ].forEach((token) => assertNotIncludes(linkedOutletSaveRoute, token, 'Linked outlet save must not use loose project scope parsing'));
}

function verifyCreateRoute(createRoute) {
  verifyOutletActionRoute(createRoute, 'Outlet create route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_OUTLET_CREATION',
    'FEATURE_FLAGS.ENABLE_OUTLET_BILLING',
    'expectedStoreId: z.string().trim().min(1).max(OUTLET_SESSION_DOCUMENT_ID_MAX_LENGTH)',
    'expectedTenantId: z.string().trim().min(1).max(OUTLET_SESSION_DOCUMENT_ID_MAX_LENGTH)',
    'if (expectedStoreId !== storeDocumentId || expectedTenantId !== tenantDocumentId)',
    'MAX_OUTLET_CREATION_MASTER_PROJECTS = 200',
    "sub.status !== 'active'",
    'getRazorpayManagedSubscriptionId(sub)',
    'isRazorpayQuantityUpdateUnsupported(billingError)',
    'outletCreationLock',
    'buildUserStoreAccessUpdate(',
    'storesList: [...normalizedStoresList, {',
    'storeKey,',
    'buildSummaryProjectPayload(',
    'LEGACY_PLATFORM_COUNTER_DOCUMENT_ID',
    'findNextAvailablePlatformEntityId(',
    'resolvePlatformCounterFloor(',
    'tx.get(legacySummaryRef)',
    'tx.get(storesSummaryRef)',
    'await tx.get(db.doc(`${DB_COLLECTIONS.STORES}/${candidateId}`))',
    'tx.set(summaryRef, {',
    'activeStoreCount = initialStoresList.filter((store: unknown) => (',
    'isMultiOutletTenantStoreListEntryInScope(store, {})',
    'isMultiOutletTenantStoreListEntryInScope(store, { isMaster: false })',
    '!isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })',
    'normalizePersistedOutletPolicy(masterStore.outletPolicy)',
    'normalizePersistedOutletPolicy(freshMasterStore.outletPolicy)',
    'updateRazorpaySubscriptionQuantity(providerSubId, newQty)',
    'await updateSubscription(subId, {',
    'quantity: newQty,',
    'taxSnapshot: resizeMenuListTaxSnapshot(sub.taxSnapshot, newQty),',
    'multi_outlet_billing_provider_quantity_revert_failed',
    'multi_outlet_subscription_quantity_revert_failed',
    'multi_outlet_create_lock_release_failed',
    'OUTLET_LOCATION_PAYMENT_REQUIRED',
    'readOutletSlugReservationInTransaction({',
    'writeCurrentOutletSlugClaim(tx, outletSlugReservation, now);',
    'freshMasterProjectsSnap,',
    'freshMasterProjectsSummarySnap,',
    'tx.get(tenantRef)',
    'tx.get(masterStoreRef)',
    'tx.get(masterProjectsQuery)',
    'tx.get(masterProjectsSummaryRef)',
    'normalizeUserStoreAccessDocumentId(session.uId || session.user?.id)',
    'db.collection(DB_COLLECTIONS.USERS).doc(sessionUserDocumentId)',
    'initialTenant?.active === false',
    'initialTenant?.deleted === true',
    'tenantData?.active === false',
    'tenantData?.deleted === true',
    'if (!freshTenantSnap.exists || !userSnap.exists || !freshMasterSnap.exists)',
    'freshTenantData.active === false',
    'freshTenantData.deleted === true',
    'const freshPermissionError = await requireAnyStorePermissionForStoreData(',
    'if (freshPermissionError) throw new OutletCreateScopeChangedError();',
    'freshActiveStoreCount + 1 > newQty',
    'const masterProjectDocs = freshMasterProjectsSnap.docs.filter(',
    "project.projectType !== 'localOnly'",
    'masterProjectDocs.length > MAX_OUTLET_CREATION_MASTER_PROJECTS',
    'if (!userAccessUpdate) throw new OutletCreateScopeChangedError();',
    'isOutletCreateScopeChangedError(error)',
    'chunkSize: OUTLET_CREATE_EFFECT_CHUNK_SIZE',
    'const newStoreDocumentId = String(result.newStoreId);',
    'storeIds: [newStoreDocumentId, ...(masterPromoted ? [storeDocumentId] : [])]',
    'multi_outlet_create_post_commit_effect_failed',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    'storeKey: result.storeKey',
  ].forEach((token) => assertIncludes(createRoute, token, 'Outlet create route boundary'));

  [
    'const outletSlugExists = async',
    'const buildUniqueOutletSlug = async',
    'const tenantData = (await tenantRef.get()).data();',
  ].forEach((token) => assertNotIncludes(createRoute, token, 'Outlet create must not use non-transactional slug or tenant authority'));

  assertOrder(
    createRoute,
    [
      'const v = validateAPIInput(schema, body);',
      'if (expectedStoreId !== storeDocumentId || expectedTenantId !== tenantDocumentId)',
      'const masterStoreRef = db.doc(',
      'const storeSnap = await masterStoreRef.get();',
    ],
    'Outlet create initiating/current scope admission before Firestore reads',
  );

  assertOrder(
    createRoute,
    [
      'await updateRazorpaySubscriptionQuantity(providerSubId, newQty);',
      'await updateSubscription(subId, {',
      'quantity: newQty,',
      'const masterProjectsQuery = db.collection(',
      'const result = await db.runTransaction(async (tx) => {',
    ],
    'Outlet create provider/internal write order',
  );

  assertOrder(
    createRoute,
    [
      'const masterProjectsQuery = db.collection(',
      'const result = await db.runTransaction(async (tx) => {',
      'tx.get(masterProjectsQuery)',
      'const masterProjectDocs = freshMasterProjectsSnap.docs.filter(',
      'readOutletSlugReservationInTransaction({',
      'tx.set(newStoreRef,',
      'writeCurrentOutletSlugClaim(tx, outletSlugReservation, now);',
      'tx.set(storesSummaryRef, storesSummaryPayload, { merge: true });',
      'tx.update(tenantRef, {',
    ],
    'Outlet create transaction payload order',
  );
}

function verifyUserStoreAccessBoundary(content) {
  [
    'export const normalizeUserStoreAccessDocumentId = (value: unknown): string | null =>',
    'documentId === raw && documentId.length <= 160 && isValidFirestoreDocumentId(documentId)',
    "if (!/^[1-9]\\d*$/.test(raw)) return null;",
    'Number.isSafeInteger(parsed) && String(parsed) === raw',
    'return db.runTransaction(async (transaction) => {',
    'const userSnap = await transaction.get(userRef);',
    'transaction.set(userRef, update, { merge: true });',
  ].forEach((token) => assertIncludes(content, token, 'Multi-outlet user store-access boundary'));
  assertNotIncludes(content, 'const parsed = Number(value);', 'Multi-outlet user store-access coercion');
  assertNotIncludes(content, 'db.doc(`${DB_COLLECTIONS.USERS}/${userId}`)', 'Multi-outlet raw user document path');
}

function verifyOnboardingCompensationScopeBoundary(content, mappingBoundary) {
  [
    'from "./compensatedStoreMappings";',
    'removeCompensatedStoreFromMappings',
    'removeCompensatedStoreId',
    'normalizePersistedOnboardingScopeId(userData.storeId) === storeId',
    'normalizePersistedOnboardingScopeId(userData.tenantId) === tenantId',
  ].forEach((token) => assertIncludes(content, token, 'Onboarding compensation scope boundary'));
  [
    'export const normalizePersistedOnboardingScopeId = (value: unknown): number | null =>',
    'Number.isSafeInteger(numericId) && String(numericId) === raw',
    'export const removeCompensatedStoreFromMappings',
    'export const removeCompensatedStoreId',
  ].forEach((token) => assertIncludes(mappingBoundary, token, 'Onboarding compensation mapping boundary'));
  ['Number((store as any)?.storeId)', 'Number(userData.storeId)', 'Number(userData.tenantId)']
    .forEach((token) => {
      assertNotIncludes(content, token, 'Onboarding compensation coercive scope');
      assertNotIncludes(mappingBoundary, token, 'Onboarding compensation coercive mapping scope');
    });
}

function verifyDeactivateRoute(deactivateRoute) {
  verifyOutletActionRoute(deactivateRoute, 'Outlet deactivate route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet-deactivate:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_OUTLET_DEACTIVATE',
    'const outletStoreDocumentId = normalizeOutletDocumentId(outletStoreId);',
    'const targetStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreDocumentId}`);',
    'const targetStoreSnap = await targetStoreRef.get();',
    'Number(targetStore?.tenantId) !== Number(tenantId)',
    'targetStore?.isMaster === true',
    'tx.get(callerStoreRef)',
    'tx.get(targetStoreRef)',
    'tenant?.active === false',
    'tenant?.deleted === true',
    'freshTenantSnap.data()?.active === false',
    'freshTenantSnap.data()?.deleted === true',
    'const freshPermissionError = await requireAnyStorePermissionForStoreData(',
    'if (freshPermissionError) throw new OutletDeactivateScopeChangedError();',
    'alreadyInactive = freshTarget?.active === false && freshTargetSummary.active === false',
    'freshTarget?.isMaster === true',
    'tx.update(targetStoreRef, {',
    'active: false',
    'tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`),',
    'tx.update(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`), { storesList: updatedStoresList });',
    'FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING',
    'billingReductionPending = true',
    'isRazorpayQuantityUpdateUnsupported(billingErr)',
    'billingActionRequired = "CONTACT_SUPPORT"',
    'billingActionRequired',
    'isOutletDeactivateScopeChangedError(error)',
    "logger.security('Outlet Deactivated'",
    'chunkSize: OUTLET_DEACTIVATE_EFFECT_CHUNK_SIZE',
    'storeIds: [outletStoreDocumentId]',
    'multi_outlet_deactivate_post_commit_effect_failed',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
  ].forEach((token) => assertIncludes(deactivateRoute, token, 'Outlet deactivate route boundary'));
}

function verifyRenameRoute(renameRoute) {
  verifyOutletActionRoute(renameRoute, 'Outlet rename route boundary', 'OUTLET_ACTION_MAX_BODY_BYTES', 'outlet-rename:${tenantRateLimitHash}');

  [
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'MAX_PREVIOUS_OUTLET_SLUGS = 5',
    'const outletStoreIdStr = normalizeOutletDocumentId(outletStoreId);',
    'if (!proposed || !isValidOutletSlugClaimCandidate(proposed))',
    'isReservedOutletSlug(proposed)',
    'outlet.active === false',
    'const [freshMasterSnap, tenantDoc, freshOutletSnap] = await Promise.all([',
    'tx.get(masterStoreRef)',
    'const freshPermissionError = await requireAnyStorePermissionForStoreData(',
    "if (freshPermissionError) throw new OutletRenameConflictError('SCOPE_CHANGED');",
    'isPlatformEntityBlocked(freshMaster)',
    'tenantDoc.data()?.active === false',
    'tenantDoc.data()?.deleted === true',
    'isPlatformEntityBlocked(tenantDoc.data())',
    'isPlatformEntityBlocked(freshOutlet)',
    'readOutletSlugReservationInTransaction({',
    'writeCurrentOutletSlugClaim(tx, newReservation, now);',
    'writeRedirectOutletSlugClaim(tx, oldReservation, now)',
    'const cappedChain = Array.from(new Set(nextChain)).slice(-MAX_PREVIOUS_OUTLET_SLUGS);',
    'tx.update(outletRef, updatePayload);',
    'tx.set(summaryRef, summaryPayload, { merge: true });',
    'tx.update(tenantRef, { storesList: updatedStoresList });',
    'chunkSize: OUTLET_RENAME_EFFECT_CHUNK_SIZE',
    'storeIds: [outletStoreIdStr]',
    'outlet_rename_post_commit_effect_failed',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
  ].forEach((token) => assertIncludes(renameRoute, token, 'Outlet rename route boundary'));

  [
    'const directCollisionSnap = await db',
    'const chainCollisionSnap = await db',
    'const foreignChain = chainCollisionSnap.docs.find',
  ].forEach((token) => assertNotIncludes(renameRoute, token, 'Outlet rename must not use non-transactional collision authority'));
}

function verifyOutletSlugClaimBoundary(helper, createRoute, renameRoute, deactivateRoute, emulatorTest) {
  [
    "const OUTLET_SLUG_CLAIM_DOCUMENT_PREFIX = 'outletSlugClaim_'",
    'export class OutletSlugUnavailableError extends Error',
    'export function isOutletSlugUnavailableError(error: unknown)',
    'export function isValidOutletSlugClaimCandidate(value: string): boolean',
    'export function getOutletSlugClaimDocumentId(tenantId: string, outletSlug: string): string',
    'export async function readOutletSlugReservationInTransaction(params:',
    ".where('tenantId', '==', Number(tenantId))",
    ".where('outletSlug', '==', outletSlug)",
    ".where('previousOutletSlugs', 'array-contains', outletSlug)",
    'transaction.get(claimRef)',
    'historySnap.size >= OUTLET_HISTORY_QUERY_LIMIT',
    'export function writeCurrentOutletSlugClaim(',
    'export function writeRedirectOutletSlugClaim(',
    'export function writeReleasedOutletSlugClaim(',
  ].forEach((token) => assertIncludes(helper, token, 'Tenant-scoped outlet slug claim boundary'));

  [
    'readOutletSlugReservationInTransaction({',
    'writeCurrentOutletSlugClaim(tx, outletSlugReservation, now);',
  ].forEach((token) => assertIncludes(createRoute, token, 'Outlet create claim integration'));
  [
    'readOutletSlugReservationInTransaction({',
    'writeCurrentOutletSlugClaim(tx, newReservation, now);',
    'writeRedirectOutletSlugClaim(tx, oldReservation, now)',
    'isOutletSlugUnavailableError(error)',
  ].forEach((token) => assertIncludes(renameRoute, token, 'Outlet rename claim integration'));
  [
    'getOutletSlugClaimDocumentId(tenantDocumentId, freshOutletSlug)',
    'writeReleasedOutletSlugClaim(tx, {',
  ].forEach((token) => assertIncludes(deactivateRoute, token, 'Outlet deactivate claim release'));
  [
    'Concurrent outlets in one tenant must have exactly one successful path-segment claim',
    'Different tenants may safely reuse the same outlet slug',
    'Deactivation release must permit a different active outlet to claim the path',
  ].forEach((token) => assertIncludes(emulatorTest, token, 'Outlet slug concurrency regression'));
}

function verifyPolicyRoute(policyRoute) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'getOutletSessionScope(session)',
    'const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    'hashPublicRateLimitValue(tenantDocumentId)',
    'outlet-policy:${tenantRateLimitHash}',
    'readBoundedJsonBody(request, OUTLET_POLICY_MAX_BODY_BYTES',
    'validateAPIInput(schema, body)',
    'outletPolicySchema',
    '.strict().refine((value) => Object.keys(value).length > 0',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_OUTLETS',
    'const [freshStoreSnap, freshTenantSnap] = await Promise.all([',
    'normalizeStoreSummaryNumericAliases([freshStore.tenantId, freshStore.tId]) !== tenantDocumentId',
    'freshStore.active === false',
    'isPlatformEntityBlocked(freshStore)',
    'freshTenantSnap.data()?.active === false',
    'freshTenantSnap.data()?.deleted === true',
    'isPlatformEntityBlocked(freshTenantSnap.data())',
    'freshStore.isMaster !== true && !masterPromoted',
    'const currentPolicy = normalizePersistedOutletPolicy(freshStore.outletPolicy);',
    'if (!currentPolicy) throw new OutletPolicyScopeChangedError();',
    'const mergedPolicy = { ...currentPolicy, ...v.data.policy };',
    'isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })',
    'tx.set(storeRef,',
    'tx.update(tenantRef,',
    'tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`),',
    'runStorePublicTruthPostCommitEffects({',
    'chunkSize: OUTLET_POLICY_EFFECT_CHUNK_SIZE',
    'storeIds: [storeDocumentId]',
    'touchDigitalScreenContentVersionForStoreServer(storeId, "outletPolicy")',
    'outlet_policy_post_commit_effect_failed',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    'outlet_policy_update_route_failed',
    'isOutletPolicyScopeChangedError(error)',
  ].forEach((token) => assertIncludes(policyRoute, token, 'Outlet policy route boundary'));
  assertNotIncludes(policyRoute, 'tenantRef.get()', 'Outlet policy must not derive tenant storesList outside its transaction');
  assertIncludes(policyRoute, 'revalidate: (tag) => revalidateTag(tag, { expire: 0 })', 'Outlet policy route delegates cache invalidation to shared post-commit isolation');

  assertOrder(
    policyRoute,
    [
      'verifyTenantAccess(session, tenantId, storeId, request)',
      'hashPublicRateLimitValue(tenantDocumentId)',
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
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'import { buildSummaryProjectFieldPayload } from "@lib/firestore/summaryProjectsWriter";',
    '.refine(isValidFirestoreDocumentId, "Invalid project ID")',
    '.refine(isValidFirestoreDocumentId, "Invalid override ID")',
    'readBoundedJsonBody(request, OUTLET_SAVE_MAX_BODY_BYTES',
    'validateAPIInput(schema, body)',
    'normalizeMultiOutletProjectId(project.projectId)',
    'normalizeMultiOutletProjectId(project.masterProjectId)',
    'const outletSessionScope = getOutletSessionScope(session);',
    'normalizeMultiOutletNumericDocumentId(outletSessionScope?.tenantDocumentId)',
    'normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId)',
    'linked_outlet_save_invalid_session_store_scope',
    'const currentStoreId = currentStoreScope.numericId;',
    'verifyTenantAccess(session, tenantId, currentStoreId, request)',
    'hashPublicRateLimitValue(session.uId || session.user?.id || "unknown")',
    'hashPublicRateLimitValue(project.projectId)',
    'outlet-save:${userRateLimitHash}:${projectRateLimitHash}',
    'requireAnyStorePermissionForStoreData(',
    'PERMISSIONS.MANAGE_MENU',
    'isStorePermissionDataInScope(outletStore, outletStoreScope, tenantScope)',
    'outletStore?.deleted === true',
    'outletStore?.isMaster === true',
    'isStorePermissionDataInScope(masterStore, masterStoreScope, tenantScope)',
    'masterStore?.deleted === true',
    'masterStore?.isMaster !== true',
    'isPlatformEntityBlocked(callerStore)',
    'isPlatformEntityBlocked(outletStore)',
    'isPlatformEntityBlocked(masterStore)',
    'isPlatformEntityBlocked(tenant)',
    'const callerIsInTenant = tenantStores.some',
    'const masterIsInTenant = tenantStores.some',
    '!callerIsInTenant || !targetIsInTenant || !masterIsInTenant',
    'isMultiOutletTenantStoreListEntryInScope(store, {',
    'normalizePersistedOutletPolicy(masterStore?.outletPolicy)',
    'linked_outlet_policy_invalid',
    'currentStoreId !== outletStoreId && callerStore?.isMaster !== true',
    'outletProjectRef.sId === masterProjectRef.sId',
    'existingProject.masterProjectId !== standardProject.masterProjectId',
    'OUTLET_PROJECT_WRITE_FIELDS',
    'DANGEROUS_KEYS',
    'LOCAL_CATEGORY_PREFIX',
    'LOCAL_ITEM_PREFIX',
    'getOutletPolicyViolation(effectiveStandardProject, existingProject, outletPolicy)',
    'hasAddedIds(nextLocalIds.categoryIds, previousLocalIds.categoryIds)',
    'hasAddedIds(nextLocalIds.itemIds, previousLocalIds.itemIds)',
    'effectiveStandardProject.active === false && outletPolicy.allowProjectDeactivate === false',
    'active: z.boolean().optional()',
    'outletStatus: z.enum(["active", "inactive"]).optional()',
    'sanitizeForFirestore({',
    'pickOutletProjectWriteFields(effectiveStandardProject)',
    'savedProject = await db.runTransaction(async (transaction) => {',
    'transaction.get(persistedOutletProjectRef)',
    'transaction.get(masterProjectDocumentRef)',
    'requireCurrentLinkedProject({',
    'requireCurrentMasterProject({',
    'projectData.active === false',
    'projectData.projectType === "localOnly"',
    'nextProjectMenuVersion(existingProject.menuVersion)',
    'nextProjectLocalVersion(previousOutletLocalState.localVersion)',
    'transaction.set(latestOutletSnap.ref, safeProject, { merge: true });',
    'hasOwnDefinedProjectField(effectiveStandardProject, "active")',
    'buildSummaryProjectFieldPayload(effectiveStandardProject.projectId, "active", effectiveStandardProject.active)',
    'const expectedBucket = storageAdmin.bucket().name',
    'normalizeImageBatchProjectSelections(',
    'appendImageBatchSelectionsToOutletProject',
    'outletPolicy.imageOverride !== true',
    'await runLinkedOutletPostCommitEffects({',
    'runStorePublicTruthPostCommitEffects({',
    'storeIds: [String(outletStoreId)]',
    'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
    'touchDigitalScreenContentVersionForStoreServer(storeId, reason)',
    'invalidateOwnerBusinessAssistantPacketCache({',
    'failedEffectCount: result.failedEffectCount',
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    'linked_outlet_save_validation_failed',
    'linked_outlet_save_route_failed',
  ].forEach((token) => assertIncludes(route, token, 'Linked outlet save route boundary'));

  const standardSaveSection = route.slice(route.indexOf('const standardData ='));
  assertOrder(
    standardSaveSection,
    [
      'savedProject = await db.runTransaction(async (transaction) => {',
      'transaction.get(callerStoreDocumentRef)',
      'transaction.get(persistedOutletProjectRef)',
      'requireLinkedOutletAuthority({',
      'getOutletPolicyViolation(effectiveStandardProject, existingProject, outletPolicy)',
      'transaction.set(latestOutletSnap.ref, safeProject, { merge: true });',
      'reason: "linkedOutletSave",',
    ],
    'Linked outlet save route validation/write order',
  );
  assertNotIncludes(route, 'const writeBatch = db.batch();', 'Linked outlet save must not make stale pre-transaction policy decisions');
  assertNotIncludes(route, 'existingProjectSnap', 'Linked outlet save must not trust a pre-transaction project snapshot');
}

function verifyServerOutletPolicyBoundary(policy) {
  [
    'normalizeMultiOutletProjectId(projectId)',
    'projectSnap.data()?.deleted === true',
    'normalizeMultiOutletProjectId(masterProjectId)',
    'masterProjectScope.sId === storeScope.numericId',
    'masterStoreSnap.data()?.isMaster !== true',
    'masterStoreSnap.data()?.active === false',
    'masterStoreSnap.data()?.deleted === true',
    'isPlatformEntityBlocked(masterStoreSnap.data())',
  ].forEach((token) => assertIncludes(policy, token, 'Server linked-outlet AI policy boundary'));
}

function verifyClientBoundaries(files) {
  const {
    actionGuards,
    linkedOutletSaveResponse,
    multiOutletDal,
    masterUpdateDiff,
    awarenessHook,
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
    'storeKey: string;',
    'isNonEmptyString(data.storeKey)',
    'isOutletRenameResponse',
    'isOutletDeactivateResponse',
    'isOutletPaymentRequiredResponse',
    'billingReductionPending?: boolean',
    "billingActionRequired?: 'CONTACT_SUPPORT' | null",
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
    'const hasExactlyOneMasterFile = (value: unknown): boolean',
    'value.files.length === 1',
    'isOutletPolicyResponse',
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'fetch("/api/outlets/policy"',
    'outlet_policy_response_invalid',
    '[`overrides.items.${itemId}`]: deleteField()',
    '[`overrides.categories.${categoryId}`]: deleteField()',
  ].forEach((token) => assertIncludes(multiOutletDal, token, 'Multi-outlet DAL policy acknowledgement'));
  [
    'const { [itemId]: removed, ...remainingItems } = currentOverrides.items;',
    'const { [categoryId]: removed, ...remainingCategories } =',
  ].forEach((token) => assertNotIncludes(multiOutletDal, token, 'Multi-outlet override removal stale map rewrite'));

  [
    'const toFirestoreSafeOutletContext = (',
    'const toFirestoreSafeOperationalChange = (',
    'const toFirestoreSafeMasterUpdateDiff = (',
    'changes: diff.changes.map(toFirestoreSafeOperationalChange)',
    'const firestoreSafeChanges = changes.map(toFirestoreSafeOperationalChange);',
    'changes: firestoreSafeChanges',
    'lastDiff: toFirestoreSafeMasterUpdateDiff(lastDiff)',
    'price: item.price || ""',
    'categoryId: item.category || ""',
    'active: item.active !== false',
    'price: attr.price || ""',
    'active: attr.active !== false',
    'active: cat.active !== false',
  ].forEach((token) => assertIncludes(masterUpdateDiff, token, 'Master update awareness Firestore-safe snapshot boundary'));

  [
    'const requestedOutletProject = outletProjectRef.current;',
    'const requestedMasterProject = masterProjectRef.current;',
    'const requestedOperationalVersion = latestVersionRef.current;',
    'const isCurrentAcknowledgement = () => {',
    'if (!isCurrentAcknowledgement()) return;',
    'String(session.tId) !== String(tId)',
    'String(session.sId) !== String(sId)',
    'const newSnapshot = createMasterSnapshot(',
    'requestedOperationalVersion,',
    'await updateDoc(projectRef, {',
    'masterSnapshot: newSnapshot',
    'onProjectUpdate?.({ masterSnapshot: newSnapshot });',
    'master_update_awareness_acknowledge_failed',
  ].forEach((token) => assertIncludes(awarenessHook, token, 'Master update awareness acknowledge boundary'));

  [
    'canManageLocationSettings({',
    'canCreateOutletLocation({',
    'activeCount = storesList.filter((s: any) => s.active !== false).length',
    'activeOutletCount = storesList.filter((s: any) => !s.isMaster && s.active !== false).length',
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readDesktopLocationActionResponse(res,',
    'isOutletDeactivateResponse(data, outletStoreId)',
    'desktop_location_deactivate_response_invalid',
    'const normalizedTargetStoreId = normalizeStoreSwitchStoreId(targetStoreId);',
    'const currentStoreId = normalizeStoreSwitchStoreId(activeStoreContext || storeDetails?.storeId);',
    'normalizedTargetStoreId === currentStoreId',
    'getStoreSummaryId(store) === normalizedTargetStoreId && store.active !== false',
    'data.billingReductionPending',
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
    'actionInFlightRef.current',
    'isExpectedScope(expectedTenantId, expectedStoreId, expectedModalEpoch)',
    'expectedStoreId: String(expectedStoreId)',
    'expectedTenantId: String(expectedTenantId)',
    'storeKey: data.storeKey',
    "String(previous.tenantId ?? '') === String(expectedTenantId)",
    'router.push(\'/billing\')',
  ].forEach((token) => assertIncludes(addOutletModal, token, 'Desktop Add Outlet boundary'));

  [
    '...MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readDesktopOutletRenameResponse(res,',
    'isOutletRenameResponse(body, outletStoreId, proposedSlug)',
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
    'isOutletDeactivateResponse(data, outletStoreId)',
    'isOutletRenameResponse(data, submittedTarget.storeId, submittedSlug)',
    'isOutletPaymentRequiredResponse(data)',
    'isOutletCreateResponse(data)',
    'updateOutletPolicy(expectedPolicyStoreId, submittedPolicy)',
    'mobile_location_deactivate_response_invalid',
    'const activeStoreId = Number(activeStoreContext || storeDetails?.storeId || 0);',
    'if (Number(storeId) === activeStoreId) return;',
    'Number(store.storeId) === activeStoreId',
    'data.billingReductionPending',
    'mobile_location_rename_response_invalid',
    'mobile_location_create_response_invalid',
    'expectedStoreId: String(expectedStoreId)',
    'expectedTenantId: String(expectedTenantId)',
    'storeKey: data.storeKey',
    'onOpenBilling',
    'style={{ minHeight: 44 }}',
    'return <MobileLocationsScreenContent key={scopeKey} {...props} />;',
    'locationActionInFlightRef.current',
    'isExpectedLocationScope(expectedTenantId, expectedStoreId)',
    "String(previous.tenantId ?? '') === String(expectedTenantId)",
    "String(previous?.storeId ?? '') === String(expectedStoreId)",
    'currentLocationScopeRef.current.activeStoreContext',
    'store.name === submittedTarget.name',
    'store.outletSlug === submittedTarget.outletSlug',
    'previous.outletPolicy === sourcePolicy',
    'store.storeDetails?.outletPolicy === sourcePolicy',
  ].forEach((token) => assertIncludes(mobileLocations, token, 'Mobile Locations boundary'));
  assertNotIncludes(
    mobileLocations,
    'setTenantDetails({ ...tenantDetails, storesList: updatedStoresList })',
    'Mobile Locations captured tenant-list replacement',
  );
  assertNotIncludes(
    mobileLocations,
    'setStoreDetails({\n                    ...storeDetails,',
    'Mobile Locations captured store replacement',
  );

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

function verifyPublicLinkedOutletBoundary(publicMenu, resolver) {
  [
    'const projectScope = normalizePublicMenuProjectDocumentScope(projectId);',
    'projectScope?.tenantDocumentId === String(tenantId)',
    'projectScope.storeDocumentId === String(storeId)',
    "| 'linked_master_scope_invalid'",
    'const outletProjectScope = normalizePublicMenuProjectDocumentScope(outletProjectId);',
    'const masterProjectScope = normalizePublicMenuProjectDocumentScope(projectData.masterProjectId);',
    'outletProjectScope.tenantDocumentId !== masterProjectScope.tenantDocumentId',
    'outletProjectScope.storeDocumentId === masterProjectScope.storeDocumentId',
    "logPublicMenuResolutionFailure('linked_master_scope_invalid'",
    'masterProjectData.active === false',
    'masterProjectData.deleted === true',
  ].forEach((token) => assertIncludes(publicMenu, token, 'Public linked-outlet menu scope boundary'));

  [
    'const storeProjectScope = normalizeMultiOutletProjectId(storeProject.projectId);',
    'masterProjectScope.tenantDocumentId !== storeProjectScope.tenantDocumentId',
    'masterProjectScope.storeDocumentId === storeProjectScope.storeDocumentId',
    'masterProject.active === false',
    'masterProject.deleted === true',
  ].forEach((token) => assertIncludes(resolver, token, 'Linked-outlet resolver scope boundary'));
}

function verifyBrandSubdomainMasterBoundary(files) {
  const {
    auditDoc,
    desktopDomainSettings,
    emulatorTest,
    enUsLocale,
    firebaseDoc,
    mobileDoc,
    mobileDomainSettings,
    ownerScopeBoundary,
    readmeDoc,
    subdomainRoute,
  } = files;

  [
    "const BRAND_SUBDOMAIN_TENANT_FIELDS = ['tenantId', 'tId'] as const;",
    'export async function readSubdomainOwnerStoreInTransaction(',
    'if (storeData.isMaster === true) return { storeData, storeRef };',
    "if (storeData.isMaster === false) throw new SubdomainOwnerScopeError('MASTER_REQUIRED');",
    ".where(field, '==', value).limit(2)",
    'canonicalStoreIds.size !== 1 || !canonicalStoreIds.has(storeId)',
  ].forEach((token) => assertIncludes(ownerScopeBoundary, token, 'Brand subdomain server authority'));

  assert(
    subdomainRoute.split('readSubdomainOwnerStoreInTransaction({').length - 1 === 2,
    'Brand subdomain GET and POST routes must both enforce owner-store admission',
  );
  assertIncludes(subdomainRoute, 'Public link is managed from the main location', 'Brand subdomain outlet-safe API response');

  for (const [label, screen] of [
    ['Desktop Domain Settings', desktopDomainSettings],
    ['Mobile Domain Settings', mobileDomainSettings],
  ]) {
    assertIncludes(screen, 'storeDetails?.isMaster === false', `${label} outlet admission`);
    assertIncludes(screen, "t('outletSubdomainInfo')", `${label} outlet title copy`);
    assertIncludes(screen, "t('outletSubdomainDesc')", `${label} outlet description copy`);
  }
  assertIncludes(enUsLocale, '"outletSubdomainInfo"', 'Primary locale outlet subdomain title');
  assertIncludes(enUsLocale, '"outletSubdomainDesc"', 'Primary locale outlet subdomain description');

  [
    'Explicit master store must retain brand subdomain authority',
    'Explicit outlet must not claim a brand subdomain',
    'Legacy single store must retain subdomain assignment compatibility',
    'Legacy multi-store topology without a master marker must fail closed',
  ].forEach((token) => assertIncludes(emulatorTest, token, 'Brand subdomain owner-scope emulator regression'));

  assertIncludes(readmeDoc, 'Brand subdomain master-store admission', 'URL routing README master-store authority');
  assertIncludes(firebaseDoc, 'legacy master-store compatibility reads', 'URL routing Firebase legacy compatibility cost');
  assertIncludes(mobileDoc, 'existing desktop and mobile Domain Settings screens', 'URL routing mobile owner parity');
  assertIncludes(auditDoc, 'Brand subdomain master-store admission checkpoint', 'Production audit master-store authority');
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
    websiteDoc,
    storeOnboardingSpecDoc,
    storeOnboardingImplDoc,
    storeOnboardingBillingDoc,
    marketingDoc,
    multiChainFirebaseDoc,
    multiChainVerificationDoc,
    multiChainMarketingDoc,
    rolesPermissionsFirebaseDoc,
    changelogDoc,
    summaryPatternDoc,
    storesFirebaseDoc,
    storesImplDoc,
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
    '**July 6, 2026 linked outlet save session store ID boundary:**',
    '**July 6, 2026 shared project ID boundary:**',
    '**July 5, 2026 linked outlet save ID boundary:**',
  ].forEach((token) => assertIncludes(implDoc, token, 'Multi-outlet implementation source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'MobileShell route mapping',
    'shared outlet action request policy',
    'bounded acknowledgement guards',
    'Firestore-safe `masterSnapshot.lastDiff`',
    'server-side maximum-outlet cap',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Multi-outlet mobile source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'performs no Firestore reads/writes/deletes',
    'does not call Razorpay',
    'Master update awareness snapshot hardening is cost-neutral',
    'nested `undefined` values that Firestore rejects',
    'Active-only max-outlet cap is cost-neutral',
    'Linked outlet save session store ID boundary is cost-neutral',
    'Shared multi-outlet project ID boundary is cost-neutral',
    'Linked outlet save ID admission is cost-neutral',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Multi-outlet Firebase source gate docs'));

  [
    'Multi-location boundary source gate: `npm run verify:multi-location-boundary`',
    'server-owned outlet lifecycle routes',
    'linked outlet save acknowledgement',
    'Replacement cap',
  ].forEach((token) => assertIncludes(verificationDoc, token, 'Multi-outlet verification source gate docs'));

  [
    'saved changes through the outlet sync/cache path',
    'saved master updates',
  ].forEach((token) => assertIncludes(websiteDoc, token, 'Multi-outlet website sync/cache claim boundary'));

  [
    'linked stores inherit the saved changes through the outlet sync/cache path',
    'current outlet sync/cache path',
  ].forEach((token) => assertIncludes(specDoc, token, 'Multi-outlet spec sync/cache claim boundary'));

  [
    'Saved changes flow to linked outlets automatically',
    'Saved master changes flow through the outlet sync/cache path',
    'Save the master price once; linked outlets inherit it through the outlet sync/cache path',
    'Save once; linked outlets inherit through the sync/cache path',
  ].forEach((token) => assertIncludes(marketingDoc, token, 'Multi-outlet marketing sync/cache claim boundary'));

  [
    'linked stores inherit the saved changes through the outlet sync/cache path',
  ].forEach((token) => assertIncludes(readmeDoc, token, 'Multi-outlet README sync/cache claim boundary'));

  [
    'All stores update instantly',
    'Every store sees it instantly',
    'Master changes flow to all stores instantly',
    'Changes propagate instantly',
    'Menu consistency guaranteed by default',
    'brand consistency guaranteed',
    'Instant sync',
    'Update once, update everywhere',
    'update everywhere',
    'Instant updates',
  ].forEach((token) => {
    assertNotIncludes(readmeDoc, token, 'Multi-outlet README stale instant/guarantee claim');
    assertNotIncludes(specDoc, token, 'Multi-outlet spec stale instant/guarantee claim');
    assertNotIncludes(marketingDoc, token, 'Multi-outlet marketing stale instant/guarantee claim');
    assertNotIncludes(websiteDoc, token, 'Multi-outlet website stale instant/guarantee claim');
  });

  [
    'Multi-location boundary source gate',
    'verify:multi-location-boundary',
    'source-only outlet lifecycle/project-save/mobile-shell gate',
    'active-cap source checkpoint',
    'Browser smoke for desktop/mobile Locations, Add Outlet, Rename Outlet, and Deactivate Outlet remains pending',
    'Linked outlet save ID boundary checkpoint',
    'Linked outlet save session store document-ID boundary checkpoint',
    'Multi-Outlet shared project ID boundary checkpoint',
    'src/lib/firebase/firestoreDocumentId.ts',
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
    'Master update awareness Firestore-safe snapshot checkpoint',
    'No master/outlet inheritance behavior',
    'masterSnapshot.lastDiff',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit master update awareness snapshot hardening evidence'));

  [
    'Multi-Outlet public claim sync/cache checkpoint',
    'saved master updates flow to linked stores through the outlet sync/cache path',
    'No Multi-Outlet runtime behavior',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit multi-outlet sync/cache claim-boundary evidence'));

  [
    'Multi-Outlet marketing update-everywhere checkpoint',
    'saved master changes flowing through the outlet sync/cache path',
    'No Multi-Outlet runtime behavior',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit multi-outlet marketing update-everywhere evidence'));

  [
    'Linked Outlet Save ID Boundary',
    'npm run verify:multi-location-boundary',
    'npm run verify:menulist-api-tenant-safety',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog linked outlet save ID boundary evidence'));

  [
    'Multi-Outlet Shared Project ID Boundary',
    'normalizeMultiOutletProjectId',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog multi-outlet shared project ID boundary evidence'));

  [
    'Linked Outlet Save Session Store ID Boundary',
    'normalized session store scope',
    'npm run verify:menulist-api-tenant-safety',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog linked outlet save session store ID boundary evidence'));

  [
    'Multi-Outlet Sync/Cache Claim Boundary',
    'no longer promises instant customer freshness',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog multi-outlet sync/cache claim-boundary evidence'));

  [
    'Multi-Outlet Marketing Update-Everywhere Boundary',
    'no longer uses the shorter update-everywhere slogans',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog multi-outlet marketing update-everywhere evidence'));

  [
    'Master Update Awareness Snapshot Boundary',
    'Firestore-safe before persistence',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog master update awareness snapshot hardening evidence'));

  [
    'Multi-Outlet Companion Footer Boundary',
    'Old bottom labels are source-bounded',
    'npm run verify:multi-location-boundary',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog multi-location companion footer-boundary evidence'));

  [
    'tenant-scoped outlet slug claim boundary',
    'platformSummary/outletSlugClaim_{tenantId}_{slug}',
    're-reads the tenant inside its creation transaction',
  ].forEach((token) => assertIncludes(implDoc, token, 'Multi-outlet implementation outlet slug claim evidence'));
  [
    'tenant-scoped outlet slug claim cost',
    'saturated 20-row history results fail closed',
    'No new collection, composite index, Firestore rule, Storage rule, Cloud Function, or Firebase deploy target',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Multi-outlet Firebase outlet slug claim evidence'));
  [
    'Tenant-scoped outlet slug claim checkpoint',
    'stale pre-transaction `storesList` snapshot',
    'live-project concurrency',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit outlet slug claim evidence'));
  [
    'Tenant-Scoped Outlet Slug Claim Boundary',
    'One tenant cannot assign the same outlet path twice',
    'Deactivated outlet paths can be reused safely',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog outlet slug claim evidence'));

  [
    'A summary is a denormalized optimization, not trusted identity',
    'shared `storeSummaryBoundary` parser',
    'There is no standalone browser summary writer',
    'every active mutation owns its canonical and summary writes in the same Firestore transaction',
  ].forEach((token) => assertIncludes(summaryPatternDoc, token, 'Summary pattern browser runtime boundary evidence'));
  [
    'browser summary runtime and writer boundary',
    '`getStoresSummary()` costs one direct-document read',
    'old standalone browser `syncStoreToSummary()` and `mergeStoreSummaryFields()` exports are removed',
  ].forEach((token) => assertIncludes(storesFirebaseDoc, token, 'Stores Firebase browser summary boundary evidence'));
  [
    'Store Summary Split-Writer Removal',
    'Standalone browser summary writers are removed',
    'canonical state and its summary projection in the same transaction',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog browser summary boundary evidence'));
  [
    'outlet policy fresh-scope transaction',
    're-reads the current store and tenant inside its mutation transaction',
    'Stale pre-transaction data can no longer promote an outlet',
  ].forEach((token) => assertIncludes(implDoc, token, 'Multi-outlet implementation policy fresh-scope evidence'));
  [
    'Outlet policy fresh-scope hardening adds one canonical store re-read',
    'concurrent role/status/list changes conflict and retry',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Multi-outlet Firebase policy fresh-scope evidence'));
  [
    'Outlet policy fresh-scope transaction checkpoint',
    'typed 409 if scope changed',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit policy fresh-scope evidence'));
  [
    'Outlet Policy Fresh-Scope Transaction',
    'Policy saves cannot overwrite a newer location list',
    'Stale locations cannot be promoted',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog policy fresh-scope evidence'));
  [
    'brand propagation read/write transaction',
    'same Firestore transaction that writes master, eligible outlets, and summary rows',
    'committed target outlet IDs',
  ].forEach((token) => assertIncludes(implDoc, token, 'Multi-outlet implementation brand transaction evidence'));
  [
    'Brand propagation keeps its bounded tenant query',
    'Transaction retries add reads only under contention',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Multi-outlet Firebase brand transaction evidence'));
  [
    'Brand propagation read/write transaction checkpoint',
    'typed 409 handles changed scope',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit brand transaction evidence'));
  [
    'Brand Propagation Read/Write Transaction',
    'Concurrent outlet choices are preserved',
    'Derived refreshes follow committed targets',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog brand transaction evidence'));
  [
    'tenant-name propagation boundary',
    'POST /api/tenants/name',
    'Public menu/store/client-store/screen and Owner Business Assistant effects run in bounded chunks after commit',
  ].forEach((token) => assertIncludes(storesImplDoc, token, 'Stores implementation tenant-name transaction evidence'));
  [
    'Tenant-name propagation now uses `POST /api/tenants/name`',
    'up to 200 stores',
    'eliminates partial canonical/summary commits',
  ].forEach((token) => assertIncludes(storesFirebaseDoc, token, 'Stores Firebase tenant-name transaction evidence'));
  [
    'Tenant-name atomic propagation checkpoint',
    'committed-only cache/screen/Owner Business Assistant effects in chunks of 20',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit tenant-name transaction evidence'));
  [
    'Atomic Tenant Name Propagation',
    'Tenant and store names cannot partially propagate',
    'Public identity refresh follows the commit',
  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog tenant-name transaction evidence'));
}

function verifyMultiLocationBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const firestoreRules = read('firestore.rules');
  const storesSummaryRulesTest = read('scripts/verification/test-stores-summary-rules.ts');
  const outletSlugClaimBoundary = read('src/lib/routing/outletSlugClaim.ts');
  const platformCounterAllocator = read('src/lib/platform/platformCounterAllocator.ts');
  const platformCounterBoundary = read('src/data/shared/platformCounterBoundary.ts');
  const functionsPlatformCounterBoundary = read('functions/src/sharedData/platformCounterBoundary.ts');
  const storeSummaryBoundary = read('src/data/shared/storeSummaryBoundary.ts');
  const functionsStoreSummaryBoundary = read('functions/src/sharedData/storeSummaryBoundary.ts');
  const platformSummaryDal = read('src/database/platformSummary/index.ts');
  const tenantsDal = read('src/database/tenants/index.tsx');
  const tenantNameRoute = read('src/app/api/tenants/name/route.ts');
  const tenantNamePostCommit = read('src/lib/multiTenant/tenantNamePostCommit.ts');
  const storePublicTruthPostCommit = read('src/lib/cache/storePublicTruthPostCommit.ts');
  const storesDal = read('src/database/stores/index.tsx');
  const tenantStoreTransaction = read('src/lib/onboarding/createTenantStore.ts');
  const legacyMessagingPublish = read('functions/src/messagingOnboarding/publishPipeline.ts');
  const activeMessagingPublish = read('src/lib/messaging-onboarding/publish.ts');
  const tenantModal = read('src/components/templates/platform/tenants/tenantDetailsModal.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const platformEntityBlocks = read('src/app/api/platform/entity-blocks/route.ts');
  const operationsFunctions = read('functions/src/triggers/operations.ts');
  const subscriptionReconciliation = read('functions/src/billing/reconcileSubscriptions.ts');
  const publicRoutingSummaryVerifier = read('scripts/verification/verify-public-routing-summary-backfill.mjs');
  const retiredMenuListChatAggregation = read('functions/src/aggregateDailyChatStats.ts');
  const functionStoreSummaryConsumers = [
    'functions/src/aggregateCustomerAnalytics.ts',
    'functions/src/analytics/extractionLearning.ts',
    'functions/src/analytics/menuDriftMetrics.ts',
    'functions/src/analytics/obpAnalyticsAggregation.ts',
    'functions/src/analytics/storeTruthConfidence.ts',
    'functions/src/decisionBlocksScoring.ts',
    'functions/src/schedulers/founderMonitorSnapshot.ts',
    'functions/src/schedulers/menulistMaintenanceScheduler.ts',
  ].map(read);
  const createRoute = read('src/app/api/outlets/create/route.ts');
  const deactivateRoute = read('src/app/api/outlets/deactivate/route.ts');
  assert(deactivateRoute.includes('allowInactive: true'), 'Outlet deactivation must retain exact inactive target identity for idempotent retries');
  const renameRoute = read('src/app/api/outlets/rename/route.ts');
  const policyRoute = read('src/app/api/outlets/policy/route.ts');
  const linkedOutletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  const projectDeleteRoute = read('src/app/api/projects/delete/route.ts');
  const brandPropagationRoute = read('src/app/api/outlets/brand-propagation/route.ts');
  const brandPropagationDal = read('src/database/multiOutlet/brandPropagation.ts');
  const brandPropagationBoundary = read('src/lib/multiOutlet/brandPropagationBoundary.ts');
  const projectPropagation = read('src/database/multiOutlet/propagation.ts');
  const projectPropagationBoundary = read('src/lib/multiOutlet/projectPropagationBoundary.ts');
  const brandSubdomainBoundary = {
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    desktopDomainSettings: read('src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx'),
    emulatorTest: storesSummaryRulesTest,
    enUsLocale: read('public/locales/menulist.ai/en-US.json'),
    firebaseDoc: read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md'),
    mobileDoc: read('__docs__/url-routing-architecture/url-routing-architecture_mobile-support.md'),
    mobileDomainSettings: read('src/components/mobile/screens/MobileDomainSettingsScreen.tsx'),
    ownerScopeBoundary: read('src/lib/routing/subdomainOwnerScope.ts'),
    readmeDoc: read('__docs__/url-routing-architecture/README.md'),
    subdomainRoute: read('src/app/api/subdomain/check/route.ts'),
  };
  const files = {
    outletSessionScope: read('src/lib/multiOutlet/outletSessionScope.ts'),
    projectIdBoundary: read('src/lib/multiOutlet/projectIdBoundary.ts'),
    resolver: read('src/lib/multiOutlet/resolveProject.ts'),
    actionGuards: read('src/lib/multiOutlet/outletActionResponseGuards.ts'),
    linkedOutletSaveResponse: read('src/lib/multiOutlet/linkedOutletSaveResponse.ts'),
    serverOutletPolicy: read('src/lib/multiOutlet/serverOutletPolicy.ts'),
    serverStoreAccess: read('src/lib/multiOutlet/serverStoreAccess.ts'),
    onboardingCompensation: read('src/lib/onboarding/compensateFailedOnboarding.ts'),
    onboardingCompensationMapping: read('src/lib/onboarding/compensatedStoreMappings.ts'),
    multiOutletDal: read('src/database/multiOutlet/index.ts'),
    projectsDal: read('src/database/projects/index.ts'),
    masterUpdateDiff: read('src/lib/multiOutlet/masterUpdateDiff.ts'),
    masterOperationalState: read('src/lib/multiOutlet/masterOperationalState.ts'),
    awarenessHook: read('src/hooks/useMasterUpdateAwareness.ts'),
    desktopLocations: read('src/app/(main)/locations/page.tsx'),
    addOutletModal: read('src/components/organisms/AddOutletModal/index.tsx'),
    outletRenameModal: read('src/components/organisms/OutletRenameModal/index.tsx'),
    outletPolicyEditor: read('src/components/organisms/OutletPolicyEditor/index.tsx'),
    mobileLocations: read('src/components/mobile/screens/MobileLocationsScreen.tsx'),
    mobileShell: read('src/components/mobile/MobileShell.tsx'),
    mobileMore: read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    publicMenu: read('src/app/client/[[...slug]]/page.tsx'),
  };

  assertIncludes(files.outletPolicyEditor, 'aria-label={item.label}', 'Desktop outlet policy switch accessible name');
  assertIncludes(files.desktopLocations, "import { formatCurrency } from '@util/formatters';", 'Desktop location billing minor-unit formatter');
  assertIncludes(files.desktopLocations, 'formatCurrency(amount, currency)', 'Desktop per-store billing minor-unit display');
  assertIncludes(files.desktopLocations, 'formatCurrency(totalCost, currency)', 'Desktop total billing minor-unit display');
  assertNotIncludes(files.desktopLocations, 'formatter.number(amount, { currency, style:', 'Desktop location billing raw minor-unit display');

  [
    'parseMasterOperationalState',
    "keys.length !== 2",
    'Number.isSafeInteger(value.operationalVersion)',
    'value.lastUpdatedAt instanceof Timestamp',
  ].forEach((token) => assertIncludes(files.masterOperationalState, token, 'Master operational state runtime boundary'));
  [
    'isValidMasterOperationalStateCreate()',
    'isValidMasterOperationalStateUpdate()',
    'projectDocIdMatchesCurrentTenantStore(docId)',
    "request.resource.data.keys().hasOnly(['operationalVersion', 'lastUpdatedAt'])",
    'request.resource.data.operationalVersion == resource.data.operationalVersion + 1',
    'request.resource.data.lastUpdatedAt == request.time',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'Master operational state rule boundary'));
  [
    "get(masterPath).data.get('active', true) != false",
    "get(masterPath).data.get('deleted', false) != true",
    '&& !willSoftDelete',
    '&& !isLinkedToMaster;',
    'Direct hard deletes would bypass linked-outlet',
    'an already-linked document is server-write-only',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'Linked outlet server-write rule boundary'));
  [
    'if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && currentProject.masterProjectId)',
    'await runUpdateProject(',
    'syncPublicSummary: true',
  ].forEach((token) => assertIncludes(files.projectsDal, token, 'Linked outlet active-state server route boundary'));
  [
    'export const POST = withAuth',
    'requireAnyStorePermissionForStoreData(',
    'transaction.get(linkedQuery)',
    '.where("masterProjectId", "==", projectScope.projectId)',
    'transaction.set(projectRef, projectUpdate, { merge: true })',
    'runStorePublicTruthPostCommitEffects({',
  ].forEach((token) => assertIncludes(projectDeleteRoute, token, 'Atomic master project delete boundary'));
  [
    'parseMasterOperationalState(docSnap.data())',
    'master_update_awareness_signal_invalid',
    'const outletProjectRef = useRef<Project | null>(outletProject);',
    'const awarenessRequestSequenceRef = useRef(0);',
    'const requestedOutletProject = outletProjectRef.current;',
    'const requestSequence = ++awarenessRequestSequenceRef.current;',
    'const currentOutletProject = outletProjectRef.current;',
    'if (!isCurrentRequest()) return;',
    'const persistedOperationalVersion = outletProject?.masterSnapshot?.operationalVersion ?? 0;',
    'acknowledgedVersionRef.current = persistedOperationalVersion;',
    'masterProjectRef.current = null;',
    'latestVersionRef.current = acknowledgedVersion;',
  ].forEach((token) => assertIncludes(files.awarenessHook, token, 'Master operational state listener boundary'));
  assertNotIncludes(
    files.awarenessHook,
    'eslint-disable-next-line react-hooks/exhaustive-deps',
    'Master operational state listener stale-closure suppression',
  );

  [
    'function getProviderSubscriptionQuantity(value: unknown): number | null',
    "hasQuantityUpdate: updateKeys.includes('quantity')",
    'const providerQuantity = getProviderSubscriptionQuantity(rzpSub.quantity);',
    'const localQuantity = getProviderSubscriptionQuantity(current.quantity) || 1;',
    'updates.quantity = providerQuantity;',
    "field: 'quantity'",
  ].forEach((token) => assertIncludes(subscriptionReconciliation, token, 'Subscription quantity reconciliation safety net'));
  assertOrder(
    subscriptionReconciliation,
    [
      'const currentSnapshot = await transaction.get(docSnap.ref);',
      'const providerQuantity = getProviderSubscriptionQuantity(rzpSub.quantity);',
      'updates.quantity = providerQuantity;',
      'transaction.update(docSnap.ref, updates);',
    ],
    'Subscription quantity transaction-current repair order',
  );

  [
    'MAX_PROJECT_PROPAGATION_STORES = 200',
    'sourceStore.isMaster !== true',
    'entries.has(storeScope.documentId)',
    'buildDeterministicOutletProjectId',
    'uuidv5(masterScope.projectId, uuidv5.URL)',
  ].forEach((token) => assertIncludes(projectPropagationBoundary, token, 'Project propagation source/identity boundary'));
  [
    'const plan = normalizeProjectPropagationPlan(',
    'sourceStoreSnap.exists() ? sourceStoreSnap.data() : null',
    'masterProject.masterProjectId',
    'masterProject.projectType === "localOnly"',
    'masterProject.projectId !== masterProjectId',
    'multi_outlet_project_propagation_source_project_invalid',
    'outletProjectId = await runTransaction(firebaseClient',
    'transaction.get(summaryRef)',
    'project_propagation_target_scope_changed',
    'transaction.set(outletProjectRef',
    'transaction.set(summaryRef',
  ].forEach((token) => assertIncludes(projectPropagation, token, 'Atomic master-only project propagation boundary'));
  [
    'Date.now().toString(36)',
    'await setDoc(outletProjectRef',
  ].forEach((token) => assertNotIncludes(projectPropagation, token, 'Project propagation partial/non-idempotent write boundary'));

  [
    'export const POST = withAuth(async (request, session) => {',
    'FEATURE_FLAGS.ENABLE_MULTI_OUTLET',
    'isPlatformSession(session)',
    'getOutletSessionScope(session)',
    'outlet-brand-propagation:${limiterHash}',
    'failClosedOnProviderError: true',
    "rateLimit.reason === 'provider_unavailable'",
    "'Cache-Control': 'private, no-store, max-age=0'",
    "'X-Content-Type-Options': 'nosniff'",
    'readBoundedJsonBody(request, BRAND_PROPAGATION_MAX_BODY_BYTES',
    'applyPrivateResponseHeaders(bodyResult.response)',
    'validateAPIInput(schema, bodyResult.data)',
    'normalizeMultiOutletNumericDocumentId(validation.data.tenantId)',
    'normalizeMultiOutletNumericDocumentId(validation.data.masterStoreId)',
    '!platformSession',
    'verifyTenantAccess(',
    '[PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_OUTLETS]',
    ".where('tenantId', '==', tenantScope.numericId)",
    '.limit(MAX_BRAND_PROPAGATION_OUTLETS + 2)',
    'outletSnapshot.size > MAX_BRAND_PROPAGATION_OUTLETS + 1',
    'transaction.get(tenantRef)',
    'isPlatformEntityBlocked(freshTenant)',
    'const masterSummary = storesList.find',
    'const canonicalOutletIds = storesList',
    'const queriedStores = new Map(outletSnapshot.docs.map',
    'masterStore?.tenantId !== tenantScope.numericId',
    'freshMaster.tenantId !== tenantScope.numericId',
    'storeData?.tenantId !== tenantScope.numericId',
    'storeData?.active === false',
    'storeData?.deleted === true',
    'normalizeMasterStorePropagationFields(Object.keys(validation.data.values))',
    'buildBrandPropagationValues(validation.data.values, fields)',
    'buildStoreSummaryBrandPropagationValues(propagatedValues)',
    'const propagationResult = await db.runTransaction(async (transaction) => {',
    'transaction.get(masterStoreRef)',
    'transaction.get(outletQuery)',
    'const freshPermissionError = await requireAnyStorePermissionForStoreData(',
    'if (permissionError) return applyPrivateResponseHeaders(permissionError);',
    'transaction.set(masterStoreRef, { ...propagatedValues, modifiedOn: now }, { merge: true });',
    'transaction.set(outlet.ref, { ...propagatedValues, modifiedOn: now }, { merge: true });',
    ".doc('storesSummary')",
    'targetOutletIds: targetOutlets.map((outlet) => outlet.id)',
    'runStorePublicTruthPostCommitEffects({',
    'chunkSize: BRAND_PROPAGATION_EFFECT_CHUNK_SIZE',
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')",
    'storeIds: [masterStoreScope.documentId, ...propagationResult.targetOutletIds]',
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')",
    "logMultiOutletFailure('multi_outlet_brand_propagation_post_commit_effect_failed'",
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    "logMultiOutletFailure('multi_outlet_brand_propagation_failed'",
  ].forEach((token) => assertIncludes(brandPropagationRoute, token, 'Server-owned brand propagation boundary'));
  assertOrder(
    brandPropagationRoute,
    [
      'checkRateLimit({',
      'readBoundedJsonBody(request, BRAND_PROPAGATION_MAX_BODY_BYTES',
      'validateAPIInput(schema, bodyResult.data)',
      'requireAnyStorePermissionForStoreData(',
      'const propagationResult = await db.runTransaction(async (transaction) => {',
    ],
    'Brand propagation admission and commit order',
  );
  [
    'request.json()',
    'request.resource',
    'const batch = db.batch();',
    'Number(masterStore?.tenantId)',
    'Number(freshMaster.tenantId)',
    'Number(storeData?.tenantId)',
  ].forEach((token) => assertNotIncludes(brandPropagationRoute, token, 'Brand propagation untrusted/raw write boundary'));
  assert(
    (brandPropagationRoute.match(/return NextResponse\.json\(/g) || []).length === 1,
    'Brand propagation keeps NextResponse.json encapsulated by its private response boundary',
  );

  [
    "fetch('/api/outlets/brand-propagation'",
    'updatedFields: Record<string, unknown>',
    "typeof businessType === 'string'",
    "typeof businessCategory === 'string'",
    'propagatedChanges: MasterStorePropagationChanges',
    'MULTI_OUTLET_ACTION_REQUEST_POLICY',
    'readJsonResponseWithLimit<unknown>(',
    'MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES',
    'isBrandPropagationResult(data)',
    "throw new Error('multi_outlet_brand_propagation_response_invalid')",
    'throw e;',
  ].forEach((token) => assertIncludes(brandPropagationDal, token, 'Brand propagation client acknowledgement boundary'));
  assertNotIncludes(brandPropagationDal, 'Record<string, any>', 'Brand propagation client value boundary');
  [
    'firebaseClient',
    'updateDoc(',
    'mergeStoreSummaryFields(',
    'touchDigitalScreenContentVersion(',
  ].forEach((token) => assertNotIncludes(brandPropagationDal, token, 'Brand propagation client cross-store mutation boundary'));

  [
    "logStoreDataFailure('store_brand_propagation_scope_missing'",
    'await propagateMasterStoreChangesToOutlets(',
    'const directStoreUpdate = { ...data };',
    'for (const field of Object.keys(propagationChanges)) delete directStoreUpdate[field];',
    'delete directStoreUpdate.modifiedOn;',
    'const hasClientSummaryFieldChanges = summaryFields.some((field) => (',
  ].forEach((token) => assertIncludes(storesDal, token, 'Store DAL atomic brand propagation handoff'));
  assertOrder(
    storesDal,
    [
      'await propagateMasterStoreChangesToOutlets(',
      'const directStoreUpdate = { ...data };',
      'const composedDirectStoreUpdate = await requestBodyComposer(directStoreUpdate, { isNew: false });',
      'if (hasClientSummaryFieldChanges) {',
    ],
    'Store DAL must commit server-owned master/outlet fields before direct non-propagated fields',
  );

  [
    'export const MASTER_STORE_PROPAGATED_FIELDS = [',
    'normalizeMasterStorePropagationFields',
    'buildBrandPropagationValues',
    'buildStoreSummaryBrandPropagationValues',
    'hasDigitalScreenBrandPropagationFields',
    'isBrandPropagationResult',
    'value.failed === 0',
  ].forEach((token) => assertIncludes(brandPropagationBoundary, token, 'Brand propagation shared contract'));

  [
    "request.resource.data.stores.diff(resource.data.stores).affectedKeys().hasOnly([string(request.auth.token.storeId)])",
    '&& isCurrentStoreSummaryEntryIdentityBounded();',
    'function isCurrentStoreSummaryEntryIdentityBounded() {',
    "&& entry.keys().hasAll(['tId'])",
    '&& string(entry.tId) == tenantId',
    "!entry.keys().hasAny(['storeId'])",
    '|| string(entry.storeId) == storeId',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'storesSummary identity rule boundary'));

  [
    "'stores.201.tId': 102",
    "'stores.201.storeId': '202'",
    "'stores.201.tId': deleteField()",
    "'stores.202.name': 'Cross-tenant overwrite'",
    "'stores.201.storeId': '201'",
    "'stores.201.active': false",
    'Soft deactivation must preserve summary tenant identity',
  ].forEach((token) => assertIncludes(storesSummaryRulesTest, token, 'storesSummary identity rules regression'));

  [
    'removeStoreFromSummary',
    'updateStoreActiveStatusInSummary',
    'deleteField(',
  ].forEach((token) => assertNotIncludes(platformSummaryDal, token, 'Store summary rows must preserve soft-deactivated identity'));

  [
    'parsePlatformStoreSummary(data)',
    'export const buildStoreSummaryEntry = (data: StoreSummaryData)',
    'tId: data.tId,',
    'summaryEntry.menuPresence = buildStoreDistributionPresenceSummary(data.menuPresence) || {};',
  ].forEach((token) => assertIncludes(platformSummaryDal, token, 'Browser store-summary runtime and pure projection boundary'));
  [
    'return docSnap.data() as StoresSummary;',
    '[storeId]: summaryEntry',
    'export const syncStoreToSummary',
    'export const mergeStoreSummaryFields',
  ].forEach((token) => assertNotIncludes(platformSummaryDal, token, 'Browser store-summary unchecked cast/dynamic key boundary'));

  assert(
    packageJson.scripts?.['test:stores-summary:rules']?.includes('test-stores-summary-rules.ts'),
    'package.json must expose the storesSummary rules emulator regression',
  );

  [
    "export const PLATFORM_COUNTER_DOCUMENT_ID = 'summary';",
    "export const LEGACY_PLATFORM_COUNTER_DOCUMENT_ID = 'default';",
    'export const MAX_PLATFORM_COUNTER_COLLISION_PROBES = 25;',
    'export function resolvePlatformCounterFloor(',
    'export async function findNextAvailablePlatformEntityId(',
    'readDocumentCounter(canonicalData, counter)',
    'readDocumentCounter(legacyData, counter)',
    'readStoreSummaryCounter(storesSummaryData, counter)',
    "throw new Error('platform_counter_allocation_exhausted');",
  ].forEach((token) => assertIncludes(platformCounterBoundary, token, 'Shared platform counter boundary'));
  assert(
    platformCounterBoundary === functionsPlatformCounterBoundary,
    'App and Functions platform counter boundary mirrors must remain byte-for-byte identical',
  );

  [
    'export function normalizeStoreSummaryNumericDocumentId(',
    'export function normalizeStoreSummaryNumericAliases(',
    'export function normalizeStoreSummaryDate(',
    'export function normalizePlatformStoreSummaryIdentity(',
    'function parseRawStoreSummaryMap(',
    'export function parsePlatformStoreSummary(',
    'const tenantId = normalizeStoreSummaryNumericAliases([rawEntry.tId, rawEntry.tenantId]);',
    'normalizeStoreSummaryNumericAliases([rawEntry.storeId, rawEntry.sId])',
    'const identity = normalizePlatformStoreSummaryIdentity(rawStoreId, rawEntry);',
  ].forEach((token) => assertIncludes(storeSummaryBoundary, token, 'Shared store-summary runtime boundary'));
  assert(
    storeSummaryBoundary === functionsStoreSummaryBoundary,
    'App and Functions store-summary boundaries must remain byte-for-byte identical',
  );
  functionStoreSummaryConsumers.forEach((content) => {
    assertIncludes(content, 'parsePlatformStoreSummary(', 'Functions store-summary consumer normalization');
    [
      "storesSummaryDoc.data()?.stores || {}",
      "storesSummarySnap.data()?.stores || {}",
      "summaryDoc.data()?.stores || {}",
    ].forEach((token) => assertNotIncludes(content, token, 'Functions raw store-summary admission'));
  });
  assertIncludes(
    retiredMenuListChatAggregation,
    "throw new HttpsError('failed-precondition', LEGACY_CHAT_ANALYTICS_MIGRATED);",
    'Retired MenuList chat aggregation must fail closed after Answerlattice isolation',
  );
  assertNotIncludes(
    retiredMenuListChatAggregation,
    'parsePlatformStoreSummary(',
    'Retired MenuList chat aggregation must not read MenuList store summary truth',
  );
  [
    'parsePlatformStoreSummary(summarySnap.exists ? summarySnap.data() : undefined)',
    'store.tId === tenantScope.documentId',
  ].forEach((token) => assertIncludes(platformEntityBlocks, token, 'Platform tenant-block store-summary scope'));
  [
    "Object.keys(admittedStoreSummary).join(',') === '201,202'",
    'Malformed persisted summary timestamps must fail closed',
    'Legacy seconds timestamps must normalize without becoming 1970 dates',
    'Canonical store backfill identity must reject a conflicting embedded store ID',
  ].forEach((token) => assertIncludes(storesSummaryRulesTest, token, 'Store-summary runtime normalization regression'));

  [
    'const STORES_SUMMARY_BACKFILL_MAX_STORES = 1_500;',
    'const STORES_SUMMARY_BACKFILL_MAX_PAYLOAD_BYTES = 850_000;',
    '.orderBy(FieldPath.documentId())',
    '.limit(STORES_SUMMARY_BACKFILL_MAX_STORES + 1)',
    'const projection = buildBackfillStoreSummaryEntry(',
    'if (invalidIdentityCount > 0)',
    "Buffer.byteLength(JSON.stringify({ stores: summary }), 'utf8')",
    "throw new HttpsError('resource-exhausted'",
    'await replaceStoresSummaryIfUnchanged(summary, expectedSummaryUpdateTime);',
    'if (error instanceof HttpsError) throw error;',
  ].forEach((token) => assertIncludes(operationsFunctions, token, 'Stores summary backfill bounded merge contract'));
  assertNotIncludes(
    operationsFunctions,
    "const storesSnapshot = await db.collection(DB_COLLECTIONS.STORES).get();",
    'Stores summary backfill unbounded canonical scan',
  );

  [
    'const DEFAULT_STORE_READ_LIMIT = 1_500;',
    'const MAX_PROJECTS_PER_STORE = 500;',
    "const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);",
    'function normalizePositiveNumericDocumentId(value)',
    'const result = Object.create(null);',
    "parseSummaryMap(data, 'stores')",
    "parseSummaryMap(data, 'projects')",
    'embeddedStore?.documentId !== normalizedStore.documentId',
    '.limit(MAX_PROJECTS_PER_STORE + 1)',
    "throw new Error('canonical_store_inventory_exceeds_verifier_limit')",
    'Public store identity/routing remains',
  ].forEach((token) => assertIncludes(publicRoutingSummaryVerifier, token, 'Summary parity verifier bounded runtime contract'));
  [
    'const result = {};',
    'const tenantId = tenantIdArg == null ? null : Number(tenantIdArg);',
    "query = query.where('tenantId', '==', tenantId);",
  ].forEach((token) => assertNotIncludes(publicRoutingSummaryVerifier, token, 'Summary parity verifier unsafe legacy contract'));

  [
    'return runTransaction(db, async (transaction) => {',
    'resolvePlatformCounterFloor(',
    'transaction.get(refs.canonical)',
    'transaction.get(refs.legacy)',
    'transaction.get(refs.storesSummary)',
    'const nextId = await findNextAvailablePlatformEntityId(',
    'await transaction.get(doc(db, collectionName, String(candidateId)))',
    'transaction.set(refs.canonical, {',
    '[fieldName]: { count: nextId },',
  ].forEach((token) => assertIncludes(platformCounterAllocator, token, 'Platform entity counter allocation boundary'));

  [
    '() => readPlatformCounterSnapshot(firebaseClient)',
    '() => allocateNextPlatformEntityId(firebaseClient, counter)',
    'if (data.tenantBlocked !== undefined) summaryEntry.tenantBlocked = data.tenantBlocked;',
  ].forEach((token) => assertIncludes(platformSummaryDal, token, 'Platform summary canonical counter DAL'));
  [
    'getDocs(await getCollectionRef())',
    "doc(firebaseClient, `${COLLECTION}`, 'default')",
    'updateTenantsCountInPlatformSummary',
    'updateStoresCountInPlatformSummary',
    'export const syncStoreToSummary',
    'export const mergeStoreSummaryFields',
  ].forEach((token) => assertNotIncludes(platformSummaryDal, token, 'Platform summary legacy counter path'));

  assertIncludes(tenantsDal, "nextData.tenantId = await reserveNextPlatformEntityId('tenant');", 'Manual tenant atomic ID reservation');
  assertIncludes(storesDal, "data.storeId = await reserveNextPlatformEntityId('store');", 'Manual store atomic ID reservation');
  [
    'const [storeSnapshot, tenantSnapshot] = await Promise.all([',
    'transaction.set(storeRef, composedStore);',
    'stores: { [String(storeId)]: buildStoreSummaryEntry(buildSummaryDataFromStore(data)) }',
    'tenantBlocked: store.tenantBlocked,',
    'storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, data)',
    'const freshStoreSnapshot = await transaction.get(storeRef);',
    "throw new Error('store_update_scope_changed')",
    'stores: { [String(storeId)]: buildStoreSummaryEntry(buildSummaryDataFromStore(nextStore)) }',
    'storesList: upsertTenantStoreListEntry(tenantSnapshot.data()?.storesList, nextStore)',
  ].forEach((token) => assertIncludes(storesDal, token, 'Manual store canonical/summary/tenant-list transaction boundary'));
  [
    'await syncStoreToSummary(data.storeId, {',
    'updateTenantsStoreslist(',
  ].forEach((token) => assertNotIncludes(`${storesDal}\n${tenantsDal}\n${businessSettings}`, token, 'Manual store split-write boundary'));
  assertNotIncludes(tenantModal, 'platformSummary.tenants.count + 1', 'Tenant modal stale client-side allocation');
  assertNotIncludes(businessSettings, 'summary.stores?.count + 1', 'Business Settings stale client-side allocation');
  [
    'export const POST = withAuth(async (request, session) => {',
    'key: `tenant-name:${limiterHash}`',
    'failClosedOnProviderError: true',
    "rateLimit.reason === 'provider_unavailable'",
    "'Cache-Control': 'private, no-store, max-age=0'",
    "'X-Content-Type-Options': 'nosniff'",
    'readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES',
    'validateAPIInput(schema, bodyResult.data)',
    'requireAnyStorePermissionForStoreData(',
    '.limit(MAX_TENANT_NAME_STORES + 1)',
    'const result = await db.runTransaction(async (transaction) => {',
    'transaction.get(tenantRef)',
    'transaction.get(storeQuery)',
    'transaction.update(tenantRef, {',
    'transaction.set(store.ref, { tenantName: validation.data.name, modifiedOn: now }, { merge: true });',
    ".doc('storesSummary')",
    'runTenantNamePostCommitEffects({',
    'chunkSize: TENANT_NAME_EFFECT_CHUNK_SIZE',
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'tenantName')",
    'invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })',
    "logSecurityFailure('tenant_name_post_commit_effect_failed'",
    'effectsPending: postCommit.effectsPending',
    'failedEffectCount: postCommit.failedEffectCount',
    'committed = true;',
    'status: committed ? 500 : 409',
  ].forEach((token) => assertIncludes(tenantNameRoute, token, 'Tenant name atomic propagation route'));
  assertOrder(tenantNameRoute, [
    'checkRateLimit({',
    'readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES',
    'validateAPIInput(schema, bodyResult.data)',
    'const result = await db.runTransaction(async (transaction) => {',
  ], 'Tenant name limiter, body, validation and transaction order');
  [
    'runStorePublicTruthPostCommitEffects(params)',
  ].forEach((token) => assertIncludes(tenantNamePostCommit, token, 'Tenant name shared post-commit effect boundary'));
  [
    'Promise.allSettled(storeIds.flatMap((storeId) => [',
    'offset += chunkSize',
    "params.deps.revalidate('client-stores')",
    "params.deps.touchScreen(storeId)",
    'effectsPending: failedEffectCount > 0',
  ].forEach((token) => assertIncludes(storePublicTruthPostCommit, token, 'Shared store public-truth post-commit effect isolation'));
  assert(packageJson.scripts['test:tenant-name-post-commit'], 'package.json must expose tenant-name post-commit regression');
  [
    "fetch('/api/tenants/name'",
    'AUTH_BROWSER_REQUEST_POLICY',
    'readJsonResponseWithLimit<unknown>(response, TENANT_NAME_RESPONSE_MAX_BYTES)',
    "throw new Error('tenant_name_update_rejected')",
    'delete directTenantUpdate.name;',
    'delete directTenantUpdate.storesList;',
  ].forEach((token) => assertIncludes(tenantsDal, token, 'Tenant DAL atomic name handoff'));
  [
    'mergeStoreSummaryFields(storeId, { tenantName: nextTenantName })',
    'await batch.commit();',
    'revalidatePublicClientCache(storeId, "updateTenantName")',
  ].forEach((token) => assertNotIncludes(tenantsDal, token, 'Tenant DAL partial name propagation boundary'));
  [
    'const concurrentTenantIds = await Promise.all([',
    "'Concurrent allocations must serialize to distinct IDs'",
    "'Allocator must skip an occupied entity document ID'",
    "'Canonical tenant counter must record the latest reservation'",
    "'Rejected summary scope must roll back canonical store rename'",
    "'Rejected summary scope must roll back tenant list rename'",
    "'Rejected summary scope must preserve the admitted summary rename'",
  ].forEach((token) => assertIncludes(storesSummaryRulesTest, token, 'Platform counter emulator regression'));

  [
    'LEGACY_PLATFORM_COUNTER_DOCUMENT_ID',
    'PLATFORM_COUNTER_DOCUMENT_ID',
    'resolvePlatformCounterFloor(',
    'findNextAvailablePlatformEntityId(',
    'transaction.get(legacyPlatformSummaryRef)',
    'transaction.get(storesSummaryRef)',
    'await transaction.get(db.collection(',
  ].forEach((token) => assertIncludes(tenantStoreTransaction, token, 'Central onboarding counter allocation'));
  [
    'import { createTenantStoreInTransaction, preCheckSubdomain }',
    'const core = await createTenantStoreInTransaction(transaction, db, {',
  ].forEach((token) => assertIncludes(activeMessagingPublish, token, 'Active messaging publish counter allocation'));
  [
    'Messaging onboarding Cloud Functions publisher guard',
    'Active publishing is owned exclusively by:',
    'src/lib/messaging-onboarding/publish.ts',
    'MESSAGING_FUNCTIONS_PUBLISH_PIPELINE_DISABLED',
  ].forEach((token) => assertIncludes(legacyMessagingPublish, token, 'Legacy Functions publish disabled guard'));
  assertNotIncludes(tenantStoreTransaction, "Number(storeData?.storeId || storeId)", 'Central onboarding loose summary store counter');
  assertNotIncludes(tenantStoreTransaction, "Number(storeData?.tId || storeData?.tenantId || 0)", 'Central onboarding loose summary tenant counter');
  assertNotIncludes(legacyMessagingPublish, '(summaryData?.tenants?.count || 0) + 1', 'Legacy Functions stale tenant allocation');
  assertNotIncludes(legacyMessagingPublish, '(summaryData?.stores?.count || 0) + 1', 'Legacy Functions stale store allocation');
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
    websiteDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_website.md'),
    storeOnboardingSpecDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding_spec.md'),
    storeOnboardingImplDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md'),
    storeOnboardingBillingDoc: read('__docs__/multi-outlet-consistency/store-onboarding/store-onboarding-billing_impl.md'),
    marketingDoc: read('__docs__/multi-outlet-consistency/multi-outlet-consistency_marketing.md'),
    multiChainFirebaseDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_firebase.md'),
    multiChainVerificationDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_verification.md'),
    multiChainMarketingDoc: read('__docs__/multi-chain-permissions/multi-chain-permissions_marketing.md'),
    rolesPermissionsFirebaseDoc: read('__docs__/roles-permissions/roles-permissions_firebase.md'),
    changelogDoc: read('__docs__/changelog.md'),
    summaryPatternDoc: read('__docs__/patterns/summary-document-pattern.md'),
    storesFirebaseDoc: read('__docs__/stores-management/stores-management_firebase.md'),
    storesImplDoc: read('__docs__/stores-management/stores-management_impl.md'),
  };

  verifyOutletSessionScopeHelper(files.outletSessionScope);
  verifyProjectIdBoundary(files.projectIdBoundary, files.resolver, linkedOutletSaveRoute);
  verifyCreateRoute(createRoute);
  verifyUserStoreAccessBoundary(files.serverStoreAccess);
  verifyOnboardingCompensationScopeBoundary(files.onboardingCompensation, files.onboardingCompensationMapping);
  verifyDeactivateRoute(deactivateRoute);
  verifyRenameRoute(renameRoute);
  verifyOutletSlugClaimBoundary(outletSlugClaimBoundary, createRoute, renameRoute, deactivateRoute, storesSummaryRulesTest);
  verifyPolicyRoute(policyRoute);
  verifyLinkedOutletSaveRoute(linkedOutletSaveRoute);
  verifyServerOutletPolicyBoundary(files.serverOutletPolicy);
  verifyClientBoundaries(files);
  verifyPublicLinkedOutletBoundary(files.publicMenu, files.resolver);
  verifyBrandSubdomainMasterBoundary(brandSubdomainBoundary);
  verifyDocs(packageJson, docs);
}

verifyMultiLocationBoundary();
console.log('Multi-location boundary verifier passed');
