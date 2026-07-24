#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertIncludes = (content, needle, label) => assert(content.includes(needle), `${label} must include ${needle}`);
const assertNotIncludes = (content, needle, label) => assert(!content.includes(needle), `${label} must not include ${needle}`);

const settings = read('src/app/api/answerlattice/hosted-help-settings/route.ts');
const config = read('src/lib/answerlattice/hostedHelpConfig.ts');
const request = read('src/lib/answerlattice/hostedHelpRequest.ts');
const server = read('src/lib/answerlattice/hostedHelpServer.ts');
const publicCache = read('src/lib/answerlattice/publicContentCache.ts');
const page = read('src/app/answerlattice-hosted-help/[[...segments]]/page.tsx');
const client = read('src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx');
const sitemap = read('src/app/answerlattice-hosted-help/sitemap.xml/route.ts');
const middleware = read('src/middleware.ts');
const menuListDomainRoute = read('src/app/api/domain/route.ts');
const widgetManagement = read('src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx');
const readme = read('__docs__/answerlattice/hosted-help/README.md');
const implementation = read('__docs__/answerlattice/hosted-help/hosted-help_impl.md');
const testCases = read('__docs__/answerlattice/hosted-help/hosted-help_test-cases.md');

assertIncludes(settings, 'isAnswerlatticeHostedHelpCandidateHostname(domain)', 'Hosted Help routable-domain admission');
assertIncludes(settings, 'isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)', 'Hosted Help exact store/product ownership');
assertNotIncludes(settings, 'storeData.tenantId ?? storeData.tId', 'Hosted Help must not select one persisted tenant alias');
assertIncludes(settings, 'isReservedCustomDomainClaimCandidate(domain)', 'Hosted Help product-root reservation');
assertIncludes(settings, 'resolveAnswerlatticeHostedHelpRegistryScope(registry)', 'Hosted Help registry exact ownership');
assertIncludes(settings, 'getHostedHelpDomainStatuses(db, config.domains, scope)', 'Hosted Help scoped settings status reads');
assertIncludes(settings, '!snapshot.exists\n        || !registryScopeMatches', 'Hosted Help DNS refresh ownership preflight');
assertIncludes(settings, 'throw new HostedHelpRegistryOwnershipError()', 'Hosted Help DNS refresh fail-closed ownership');
assertIncludes(settings, 'const domainsToProvision = nextDomains.filter(domain => !registryByDomain.has(domain));', 'Hosted Help registry-proven provider provisioning');
assertIncludes(settings, 'await db.runTransaction(async (transaction: FirebaseFirestore.Transaction)', 'Hosted Help atomic ownership revalidation');
assert((settings.match(/runTransaction\(async \(transaction: FirebaseFirestore\.Transaction\)/g) || []).length >= 2, 'Hosted Help save and DNS refresh must independently revalidate ownership transactionally');
assertIncludes(settings, 'isAnswerlatticeStoreInScope(currentStoreData, scope, currentStoreSnapshot.id)', 'Hosted Help transaction-current store scope');
assertIncludes(settings, 'registryScopeMatches(currentRegistry, scope)', 'Hosted Help transaction-current registry scope');
assertIncludes(settings, 'compensateHostedHelpProviderChanges', 'Hosted Help provider compensation');
assertIncludes(settings, "removeResult.ok || removeResult.status === 404", 'Hosted Help exact provider removal result');
assertNotIncludes(settings, 'const batch = db.batch();', 'Hosted Help must not commit registry truth from stale snapshots');
assertIncludes(settings, 'if (!addResult.ok) {', 'Hosted Help rejects unproven provider conflicts');
assertNotIncludes(settings, '!addResult.ok && addResult.status !== 409', 'Hosted Help must not accept unproven Vercel 409 conflicts');
assertIncludes(settings, 'normalizeHostedHelpDomainVerification(existingRegistry.domainVerification)', 'Hosted Help legacy verification projection');
assertIncludes(settings, "logRuntimeFailure('answerlattice_hosted_help_domain_status_failed'", 'Hosted Help DNS provider failure diagnostics');
assertNotIncludes(settings, 'Set VERCEL_TOKEN and VERCEL_PROJECT_ID', 'Hosted Help owner response must not expose server env instructions');

assertIncludes(config, 'normalizeHostedHelpDomainVerification', 'Hosted Help bounded DNS verification projector');
assertIncludes(config, 'StrictHostedHelpConfigSaveSchema', 'Hosted Help strict save DTO');
assertIncludes(config, '.strict();', 'Hosted Help strict unknown-field rejection');
assertIncludes(config, 'MAX_HOSTED_HELP_DNS_RECORDS = 20', 'Hosted Help DNS record count cap');
assertNotIncludes(config, '...record', 'Hosted Help DNS projection must not spread provider records');

assertIncludes(request, 'resolveHostedHelpPublicRoute', 'Hosted Help strict public route resolver');
assertIncludes(request, 'buildHostedHelpArticlePath', 'Hosted Help shared article path builder');
assertIncludes(request, "segment !== '.' && segment !== '..'", 'Hosted Help article traversal rejection');
assertIncludes(request, 'normalized.length > 300', 'Hosted Help article slug length cap');

assertIncludes(server, "logRuntimeFailure('answerlattice_hosted_help_registry_product_invalid'", 'Hosted Help bounded registry product diagnostic');
assertIncludes(server, "logRuntimeFailure('answerlattice_hosted_help_registry_scope_invalid'", 'Hosted Help bounded registry scope diagnostic');
assertIncludes(server, 'normalizeConsistentAnswerlatticeScopeDocumentIds([record.tId, record.tenantId])', 'Hosted Help registry exact tenant aliases');
assertIncludes(server, 'normalizeConsistentAnswerlatticeScopeDocumentIds([record.sId, record.storeId])', 'Hosted Help registry exact store aliases');
assertIncludes(server, 'data.domain !== normalizedDomain', 'Hosted Help registry document-domain agreement');
assertIncludes(server, 'data.enabled !== true', 'Hosted Help registry exact publication flag');
assertIncludes(server, '!config.domains.includes(normalizedDomain)', 'Hosted Help public config-domain agreement');
const productDiagnosticStart = server.indexOf("logRuntimeFailure('answerlattice_hosted_help_registry_product_invalid'");
const productDiagnosticEnd = server.indexOf('return null;', productDiagnosticStart);
const scopeDiagnosticStart = server.indexOf("logRuntimeFailure('answerlattice_hosted_help_registry_scope_invalid'");
const scopeDiagnosticEnd = server.indexOf('return null;', scopeDiagnosticStart);
assert(productDiagnosticStart >= 0 && productDiagnosticEnd > productDiagnosticStart, 'Hosted Help product diagnostic block must exist');
assert(scopeDiagnosticStart >= 0 && scopeDiagnosticEnd > scopeDiagnosticStart, 'Hosted Help scope diagnostic block must exist');
assertNotIncludes(
  server.slice(productDiagnosticStart, productDiagnosticEnd),
  'domain: normalizedDomain',
  'Hosted Help product diagnostic raw registry domain logging',
);
assertNotIncludes(
  server.slice(scopeDiagnosticStart, scopeDiagnosticEnd),
  'domain: normalizedDomain',
  'Hosted Help scope diagnostic raw registry domain logging',
);
assertIncludes(server, '!config.domains.includes(domain)', 'Hosted Help registry builder/config domain agreement');
assertNotIncludes(server, 'getHostedHelpScopeCacheTag', 'Hosted Help no-op scope cache tag');

assertIncludes(publicCache, '.filter(article => article.active !== false)', 'Hosted Help inactive section article filtering');
assertIncludes(page, 'resolveHostedHelpPublicRoute(params.segments', 'Hosted Help strict page route admission');
assertIncludes(page, 'if (!publicRoute) notFound();', 'Hosted Help unknown and disabled route 404');
assertIncludes(page, 'title = `${articleMeta.title} | ${site.config.title}`;', 'Hosted Help article-specific metadata title');
assertIncludes(page, 'canonical: buildCanonicalUrl(canonicalDomain, canonicalPath)', 'Hosted Help explicit canonical URL');
assertIncludes(page, 'if (!articleMeta) notFound();', 'Hosted Help article requires published navigation metadata');
assertNotIncludes(page, ': await getCachedKnowledgeBaseArticle(scope, publicRoute.articleSlug', 'Hosted Help hidden direct-article fallback');
assertIncludes(page, 'unavailableReason="Help content is temporarily unavailable. Please try again shortly."', 'Hosted Help explicit temporary unavailability');
assertIncludes(client, 'buildHostedHelpArticlePath(article.url || article.id)', 'Hosted Help client shared article route encoding');
assertIncludes(client, 'Help is temporarily unavailable', 'Hosted Help visible unavailable state');
assertIncludes(sitemap, 'buildHostedHelpArticlePath(article.url || article.id)', 'Hosted Help sitemap encoded article paths');
assertIncludes(sitemap, 'Array.from(new Set(articlePaths))', 'Hosted Help sitemap article deduplication');

const hostedBranchStart = middleware.indexOf('// Answerlattice hosted Help Center domains');
const hostedBranchEnd = middleware.indexOf('// Block direct access to /client/*', hostedBranchStart);
assert(hostedBranchStart >= 0 && hostedBranchEnd > hostedBranchStart, 'Hosted Help middleware branch must exist');
const hostedBranch = middleware.slice(hostedBranchStart, hostedBranchEnd);
assertNotIncludes(hostedBranch, "response.headers.set('Cache-Control'", 'Hosted Help per-IP admission response must not be shared-CDN cached');
assertIncludes(hostedBranch, 'request-specific because admission includes a per-IP rate limit', 'Hosted Help request-specific cache rationale');

assertIncludes(menuListDomainRoute, 'isAnswerlatticeHostedHelpCandidateHostname(normalizedDomain)', 'MenuList add-domain Hosted Help prefix reservation');
assertIncludes(menuListDomainRoute, 'isAnswerlatticeHostedHelpCandidateHostname(candidate)', 'MenuList availability Hosted Help prefix reservation');
assertIncludes(widgetManagement, 'isAnswerlatticeHostedHelpCandidateHostname(normalized)', 'Hosted Help owner routable-domain validation');
assertIncludes(widgetManagement, 'isHostedHelpDomainVerification(value.verification)', 'Hosted Help owner DNS response shape guard');

assertIncludes(readme, 'domain ownership is registry-proven', 'Hosted Help ownership docs');
assertIncludes(readme, 'full HTML responses are not shared-CDN cached', 'Hosted Help request cache docs');
assertIncludes(implementation, 'Unknown, disabled, malformed, and unlisted article routes return 404', 'Hosted Help route behavior docs');
assertIncludes(implementation, 'Vercel `409` is not ownership evidence', 'Hosted Help provider conflict docs');
assertIncludes(testCases, 'Cross-product domain reservation', 'Hosted Help cross-product test case docs');
assertIncludes(testCases, 'Rate-limit cache isolation', 'Hosted Help cache isolation test case docs');

console.log('Answerlattice hosted Help Center boundary verification passed.');
