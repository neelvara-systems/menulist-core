#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const requires = (source, tokens, label) => {
  tokens.forEach((token) => assert(source.includes(token), `${label} missing ${token}`));
};
const forbids = (source, tokens, label) => {
  tokens.forEach((token) => assert(!source.includes(token), `${label} must not contain ${token}`));
};
const requiresOrder = (source, tokens, label) => {
  let cursor = -1;
  tokens.forEach((token) => {
    const next = source.indexOf(token, cursor + 1);
    assert(next >= 0, `${label} missing or out of order: ${token}`);
    if (next >= 0) cursor = next;
  });
};

const route = read('src/app/api/domain/route.ts');
const claim = read('src/lib/routing/customDomainClaim.ts');
const publicEligibility = read('src/lib/publicTruth/entityEligibility.ts');
const clientLookup = read('src/lib/firestore/clientStoreLookup.ts');
const domainLookup = read('src/lib/multiTenant/domainLookup.ts');
const vercelDomains = read('src/lib/domains/vercelDomains.ts');
const vercelDnsRecords = read('src/lib/domains/vercelDnsRecords.ts');
const storesDal = read('src/database/stores/index.tsx');
const desktopDomainSettings = read('src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx');
const mobileDomainSettings = read('src/components/mobile/screens/MobileDomainSettingsScreen.tsx');
const emulatorTest = read('scripts/verification/test-custom-domain-claim.ts');
const identityTest = read('scripts/verification/test-public-entity-identity.ts');
const providerTest = read('scripts/verification/test-vercel-domain-provider-boundary.ts');
const routingReadme = read('__docs__/url-routing-architecture/README.md');
const routingSpec = read('__docs__/url-routing-architecture/url-routing-architecture_spec.md');
const routingImpl = read('__docs__/url-routing-architecture/url-routing-architecture_impl.md');
const routingFirebase = read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md');
const routingMobile = read('__docs__/url-routing-architecture/url-routing-architecture_mobile-support.md');
const clientArchitecture = read('__docs__/client-menu/multi-tenant-architecture.md');
const clientImpl = read('__docs__/client-menu/_impl.md');
const clientSpec = read('__docs__/client-menu/_spec.md');
const clientFirebase = read('__docs__/client-menu/client-menu_firebase.md');
const publicDoctrine = read('__docs__/client-menu/public-routing-doctrine.md');
const storesReadme = read('__docs__/stores-management/README.md');
const storesFirebase = read('__docs__/stores-management/stores-management_firebase.md');
const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const packageJson = read('package.json');

requires(publicEligibility, [
  'export function isMenuListPublicEntityEligible(value: unknown): boolean',
  'hasValidLifecycleShape(entity)',
  'isOptionalBoolean(active.value)',
  'isOptionalBoolean(deleted.value)',
  'isOptionalBoolean(blocked.value)',
  'isOptionalBoolean(tenantBlocked.value)',
  '!isPlatformEntityBlocked(entity)',
  'export function normalizeMenuListPublicEntityIdentityAliases(',
  'scopes.every((scope) => scope?.documentId === firstScope.documentId)',
], 'shared public entity eligibility');

requires(claim, [
  "const CUSTOM_DOMAIN_CLAIM_DOCUMENT_PREFIX = 'customDomainClaim_'",
  'CUSTOM_DOMAIN_RESERVATION_TTL_MS',
  'CUSTOM_DOMAIN_LABEL_MAX_LENGTH',
  'normalizeCustomDomainClaimCandidate',
  'isReservedCustomDomainClaimCandidate',
  'getKnownProductDomains(productId)',
  'domain === root || domain.endsWith(`.${root}`)',
  'readCustomDomainReservationInTransaction',
  ".where('customDomain', '==', domain)",
  '.limit(2)',
  'params.transaction.get(claimRef)',
  'params.transaction.get(directQuery)',
  'throw new CustomDomainUnavailableError()',
  "status: 'reserved'",
  "status: 'current'",
  "status: 'releasing'",
  "status: 'released'",
  'reservationId: reservation.reservationId',
  "claim.status === 'current'",
  "claim.status !== 'reserved' && claim.status !== 'releasing'",
  "String(claim.reservationId || '') !== reservationId",
], 'custom-domain claim boundary');

requires(route, [
  'checkDomainAvailabilityRateLimit',
  "getRateLimitForFeature('DATA_READ')",
  'failClosedOnProviderError: true',
  "result.reason === 'provider_unavailable'",
  'status: providerUnavailable ? 503 : 429',
  'const candidateParam = request.nextUrl.searchParams.get(\'candidate\')',
  'readAuthorizedDomainStateInTransaction',
  'requireAnyStorePermissionForStoreData(',
  '!isMenuListPublicEntityEligible(tenantData)',
  '!isMenuListPublicEntityEligible(storeData)',
  'storedStoreScope?.documentId !== params.scope.storeId',
  'storedTenantScope?.documentId !== params.scope.tenantId',
  'const storeIdentityAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([',
  'const storeTenantAliasesMatch = normalizeMenuListPublicEntityIdentityAliases([',
  'const tenantIdentityAliasesMatch = tenantIdentityValues.length === 0',
  'readCustomDomainReservationInTransaction({',
  'writeReservedCustomDomainClaim(',
  'writeCurrentCustomDomainClaim(',
  'writeReleasingCustomDomainClaim(',
  'writeReleasedCustomDomainClaim(',
  'const reservationId = randomUUID();',
  'db.runTransaction<DomainReservationTransactionResult>',
  'db.runTransaction<DomainFinalizeTransactionResult>',
  'db.runTransaction<DomainInitialState>',
  'db.runTransaction<DomainRemovalState>',
  'isReservedCustomDomainClaimCandidate(normalizedDomain)',
  'This domain is reserved for MenuList services',
  'isAnswerlatticeHostedHelpCandidateHostname(normalizedDomain)',
  'Support-style domains are reserved for Answerlattice hosted help',
  'isAnswerlatticeHostedHelpCandidateHostname(candidate)',
  'reservationId,',
  'getVercelProjectDomain(normalizedDomain)',
  'providerConflictHasMenuListProvenance',
  'const restoresExistingCurrentClaim = params.reservation.claimOwner === params.reservation.storeId',
  'compensatePendingDomainReservation({',
  'CustomDomainLegacyConflictError',
  'releaseReleasingDomainClaim(',
  'Prior claim release failed after replacement',
  'normalizeCustomDomainClaimCandidate(authorizedState.storeData.customDomain) !== domain',
  'await revalidateMenuCache(storeId, { tId: tenantId });',
], 'custom-domain route transaction boundary');
assert(
  (route.match(/failClosedOnProviderError: true/g) || []).length === 2,
  'custom-domain management and advisory availability limiters must both fail closed on provider outage',
);
forbids(route, [
  'const permissionError = await requireAnyStorePermission(',
  '.where("active", "==", true)\n        .limit(1)',
  'String(existingStoreId) !== String(storeId)',
  'await storeRef.update({',
], 'retired custom-domain TOCTOU/collision path');

const postBlock = route.slice(route.indexOf('export const POST'), route.indexOf('export const GET'));
requiresOrder(postBlock, [
  'checkDomainManagementRateLimit(session, storeId)',
  'readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES',
  'AddDomainSchema.safeParse(body)',
  'isReservedCustomDomainClaimCandidate(normalizedDomain)',
  'readAuthorizedDomainStateInTransaction({',
  'writeReservedCustomDomainClaim(',
  'addDomainToVercelProject(normalizedDomain)',
  'getVercelProjectDomain(normalizedDomain)',
  'readAuthorizedDomainStateInTransaction({',
  'transaction.update(storeRef,',
  'removeDomainFromProviderBestEffort(',
  'releaseReleasingDomainClaim(',
  'revalidateMenuCache(storeId, { tId: tenantId })',
], 'custom-domain POST admission/provider/finalization order');

const getBlock = route.slice(route.indexOf('export const GET'), route.indexOf('export const DELETE'));
const availabilityBlock = getBlock.slice(
  getBlock.indexOf("const candidateParam = request.nextUrl.searchParams.get('candidate')"),
  getBlock.indexOf('const rateLimitResponse = await checkDomainManagementRateLimit'),
);
requiresOrder(availabilityBlock, [
  'checkDomainAvailabilityRateLimit(session, storeId)',
  'normalizeCustomDomainClaimCandidate(candidateParam)',
  'isReservedCustomDomainClaimCandidate(candidate)',
  'readAuthorizedDomainStateInTransaction({',
  'readCustomDomainReservationInTransaction({',
], 'custom-domain GET advisory availability order');
const statusGetBlock = getBlock.slice(getBlock.indexOf('const rateLimitResponse = await checkDomainManagementRateLimit'));
requiresOrder(statusGetBlock, [
  'checkDomainManagementRateLimit(session, storeId)',
  'readAuthorizedDomainStateInTransaction({',
  'getVercelDomainConfig(domain)',
  'getVercelProjectDomain(domain)',
  'isVercelDomainExplicitlyMisconfigured(configResult?.data)',
  "const providerConfirmsProjectAssignment = projectDomainResult?.ok === true",
  'const nextVerified = isConfigured && providerConfirmsProjectAssignment',
  'readAuthorizedDomainStateInTransaction({',
  'transaction.update(db.collection(DB_COLLECTIONS.STORES).doc(storeId)',
  'revalidateMenuCache(storeId, { tId: tenantId })',
], 'custom-domain GET current-scope verification order');

requires(storesDal, [
  '`/api/domain?candidate=${encodeURIComponent(normalizedDomain)}`',
  'AUTH_BROWSER_REQUEST_POLICY',
  'CUSTOM_DOMAIN_AVAILABILITY_RESPONSE_MAX_BYTES',
  '!response.ok',
  "typeof (payload as { available?: unknown }).available !== 'boolean'",
], 'custom-domain owner availability client boundary');
forbids(storesDal, [
  "where('customDomain', '==', normalizedDomain)",
], 'retired browser custom-domain uniqueness query');

[desktopDomainSettings, mobileDomainSettings].forEach((source, index) => requires(source, [
  "typeof domainStatus?.verified === 'boolean'",
  "domainVerified: data.verified === true",
  'providerCleanupPending',
  'claimReleasePending',
  'refreshPending',
  "aria-label={t('subdomain')}",
  "aria-label={t('customDomain')}",
  "aria-label={`${t('checkAvailability')}: ${t('subdomain')}`}",
  "aria-label={`${t('checkAvailability')}: ${t('customDomain')}`}",
], index === 0 ? 'desktop custom-domain status parity' : 'mobile custom-domain status parity'));
requires(mobileDomainSettings, [
  'data?.success !== true || !isNonEmptyString(data.domain)',
], 'mobile custom-domain add acknowledgement');

const deleteBlock = route.slice(route.indexOf('export const DELETE'));
requiresOrder(deleteBlock, [
  'checkDomainManagementRateLimit(session, storeId)',
  'readAuthorizedDomainStateInTransaction({',
  'const hasOtherStore = duplicateSnapshot.docs.some(',
  'throw new CustomDomainLegacyConflictError()',
  'writeReleasingCustomDomainClaim(',
  'transaction.update(storeRef,',
  'revalidateMenuCache(storeId, { tId: tenantId })',
  'removeDomainFromProviderBestEffort(removalState.domain, storeId, tenantId)',
  'releaseReleasingDomainClaim(db, removalReservation)',
], 'custom-domain DELETE remove/claim/provider order');

requires(vercelDomains, [
  'export async function getVercelProjectDomain(domain: string)',
  '`/v9/projects/${encodeVercelPathSegment(getVercelDomainProjectId())}/domains/${encodeVercelPathSegment(domain)}`',
  'export function isVercelDomainExplicitlyMisconfigured(config: any): boolean',
  'response.ok && responseData.parsed',
  'response.ok && !responseData.parsed ? 502 : response.status',
], 'Vercel custom-domain project/conflict boundary');
requires(vercelDnsRecords, [
  'export function normalizeVercelDomainDnsRecords(',
  'const configRecord = isRecord(config) ? config : {}',
  'const projectDomainRecord = isRecord(projectDomain) ? projectDomain : {}',
  'normalizeRank(record.rank) === preferredRank',
  'configRecord.recommendedIPv4',
  'configRecord.recommendedCNAME',
  'projectDomainRecord.apexName',
  "addRecord('A', normalizedDomain, value)",
  "addRecord('CNAME', normalizedDomain, record.value)",
], 'Vercel provider-recommended DNS record boundary');
requiresOrder(vercelDomains, [
  'const timeout = setTimeout(() => controller.abort(), VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS)',
  'const response = await fetch(url, {',
  'const responseData = await readVercelDomainResponseData<T>(response, path, options)',
  'clearTimeout(timeout)',
], 'Vercel custom-domain full-response deadline');

requires(emulatorTest, [
  'a second operation from the same store must not replace an active reservation',
  'the same store must not reclaim a domain while provider release is in flight',
  'expired release leases must recover after bounded cleanup time',
  'duplicate legacy rows must remain fail-closed instead of choosing a winner',
  'DNS labels longer than 63 characters must fail before provider work',
  "isReservedCustomDomainClaimCandidate('menulist.ai')",
  "isReservedCustomDomainClaimCandidate('app.menulist.ai')",
  "isReservedCustomDomainClaimCandidate('menulist.online')",
  "isReservedCustomDomainClaimCandidate('sample-cafe.menulist.online')",
  "isReservedCustomDomainClaimCandidate('menulist.digital')",
  "isReservedCustomDomainClaimCandidate('app.menulist.digital')",
  "isReservedCustomDomainClaimCandidate('qa-cafe.menulist.digital')",
  "isReservedCustomDomainClaimCandidate('surfaceos.app')",
  "!isReservedCustomDomainClaimCandidate('owner.example.com')",
], 'custom-domain emulator regression');
requires(identityTest, [
  'conflicting store or tenant identity aliases must fail closed',
  'scientific-notation aliases must not coerce to a canonical identity',
  'canonical platform block details fail closed',
], 'public entity identity regression');
requires(providerTest, [
  "mock.timers.tick(10_001)",
  'the provider deadline must remain active while the body is read',
  'an aborted or unparsable success body must not remain provider-success truth',
  'an empty HTTP-200 provider body must fail closed',
  'apex domains must use Vercel recommended IPv4 records',
  'subdomains must use the project-specific Vercel recommended CNAME',
  'missing provider guidance must not invent a DNS record',
], 'Vercel provider delayed-body regression');

[
  [desktopDomainSettings, 'desktop Domain Settings'],
  [mobileDomainSettings, 'mobile Domain Settings'],
  [read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx'), 'legacy custom-domain tab'],
].forEach(([source, label]) => {
    requires(source, [
      'normalizeVercelDomainDnsRecords',
      'DNS records are not available yet. Check verification again in a moment.',
    ], `${label} provider-recommended DNS UI`);
    forbids(source, ['cname.vercel-dns.com'], `${label} stale generic DNS fallback`);
  });

[
  [routingReadme, 'URL routing README'],
  [routingSpec, 'URL routing spec'],
  [routingImpl, 'URL routing implementation'],
  [routingFirebase, 'URL routing Firebase'],
  [routingMobile, 'URL routing mobile'],
  [clientArchitecture, 'Client Menu multi-tenant architecture'],
  [storesReadme, 'Stores Management README'],
  [storesFirebase, 'Stores Management Firebase'],
  [productionAudit, 'Production readiness audit'],
  [changelog, 'Changelog'],
].forEach(([source, label]) => requires(source, [
  'custom-domain',
], `${label} custom-domain contract`));
requires(routingReadme, [
  'Durable Custom-Domain Claim Boundary',
  'request-unique reservation ID',
  "Verification becomes true only when Vercel reports both explicit DNS configuration and membership in MenuList's configured project",
  'aborted or malformed success body is not accepted as provider truth',
], 'URL routing README claim/provider contract');
requires(routingSpec, [
  'Custom-domain ownership',
  'Provider conflict proof',
  'Legacy ambiguity',
], 'URL routing spec fail-closed contract');
requires(routingImpl, [
  'Custom-Domain Transaction and Provider State Machine',
  'Another same-store or cross-store request cannot replace an active reservation',
  'Tenant fields are eligibility-only',
], 'URL routing implementation state machine');
requires(routingFirebase, [
  'July 13, 2026 durable custom-domain boundary',
  'up to 8 when verification changes',
  'tenant is eligibility-only',
], 'URL routing Firebase operation-cost contract');
requires(routingMobile, [
  'custom-domain claim hardening is shared server infrastructure',
  'providerCleanupPending',
], 'URL routing mobile shared-server contract');
requires(clientImpl, [
  'request-unique reservation IDs',
  'tenant fields never cross the render boundary',
], 'Client Menu implementation custom-domain/public-identity contract');
requires(clientSpec, [
  'The same store cannot start overlapping add/remove operations',
  'tenant data is checked for admission only',
], 'Client Menu spec custom-domain/public-identity contract');
requires(clientFirebase, [
  '2 on a unique cold hit',
  'Tenant data is never part of the public payload',
  'it is not accepted as a substitute for canonical tenant truth',
], 'Client Menu canonical tenant eligibility cost contract');
requires(publicDoctrine, [
  'tenant fields are not rendered, serialized, or merged into the public store payload',
  'at most 8 canonical Firestore query/document reads',
], 'Public routing tenant/render separation contract');
requires(productionAudit, [
  'Custom-domain ownership, provider-ordering, and public-identity checkpoint',
  'same-store reservation overlap',
], 'Production audit custom-domain closure evidence');
requires(changelog, [
  'Custom Domain Ownership And Provider Ordering',
  'Provider conflicts require proof',
], 'Changelog custom-domain closure evidence');

requires(clientLookup, [
  'async function isStoreOrTenantIneligible',
  '!isMenuListPublicEntityEligible(store)',
  'if (!tenantSnap.exists) return true;',
  '!isMenuListPublicEntityEligible(tenantData)',
  'storeDocumentScope.documentId !== storedStoreScope.documentId',
  'normalizeMenuListPublicEntityIdentityAliases([store?.storeId, store?.sId])',
  'normalizeMenuListPublicEntityIdentityAliases([store?.tenantId, store?.tId])',
  ".where('customDomain', '==', domain.toLowerCase())",
  'if (snapshot.size !== 1) return null;',
], 'public client-store lifecycle/uniqueness boundary');
forbids(clientLookup, [
  'if (store?.tenantBlocked === false) return false;',
  'if (!tenantSnap.exists) return false;',
  "where('customDomain', '==', domain.toLowerCase())\n                .where('domainVerified', '==', true)\n                .where('active', '==', true)\n                .limit(1)",
], 'retired public client-store permissive boundary');

requires(domainLookup, [
  'async function buildTenantInfo',
  '!isMenuListPublicEntityEligible(storeData)',
  '!tenantSnapshot.exists || !isMenuListPublicEntityEligible(tenantData)',
  'documentStoreScope.documentId !== storedStoreScope.documentId',
  'normalizeMenuListPublicEntityIdentityAliases([storeData.storeId, storeData.sId])',
  'normalizeMenuListPublicEntityIdentityAliases([storeData.tenantId, storeData.tId])',
  'if (snapshot.size !== 1)',
], 'server tenant-domain lookup lifecycle/uniqueness boundary');

requires(packageJson, [
  '"test:custom-domain-claim"',
  '"test:public-entity-identity"',
  '"test:vercel-domain-provider-boundary"',
  '"verify:custom-domain-boundary"',
], 'custom-domain package registry');

if (failures.length) {
  process.stderr.write(`Custom-domain boundary verification failed:\n- ${failures.join('\n- ')}\n`);
  process.exit(1);
}

process.stdout.write('PASS verify-custom-domain-boundary\n');
process.stdout.write('Validated current-scope domain claims, tenant lifecycle, duplicate-host fail-closed routing, provider ordering, and cache invalidation.\n');
