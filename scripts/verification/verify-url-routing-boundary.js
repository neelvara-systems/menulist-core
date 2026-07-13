#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROLLED_ENV_KEYS = [
  'VERCEL',
  'VERCEL_ENV',
  'NEXT_PUBLIC_ENV',
  'NODE_ENV',
  'NEXT_PUBLIC_PLATFORM_DOMAIN',
  'NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

function assertOrder(content, first, second, label) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  assert(
    firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex,
    `${label} must include ${first} before ${second}`,
  );
}

function snapshotEnv() {
  return Object.fromEntries(CONTROLLED_ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  CONTROLLED_ENV_KEYS.forEach((key) => {
    if (snapshot[key] === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = snapshot[key];
  });
}

function applyEnv(env) {
  CONTROLLED_ENV_KEYS.forEach((key) => {
    if (env[key] === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = String(env[key]);
  });
}

function clearSrcRequireCache() {
  const srcRoot = `${path.join(ROOT, 'src')}${path.sep}`;
  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.startsWith(srcRoot)) {
      delete require.cache[cacheKey];
    }
  });
}

function withRoutingEnv(env, fn) {
  const original = snapshotEnv();
  try {
    applyEnv(env);
    clearSrcRequireCache();
    const domainResolver = require(path.join(ROOT, 'src/lib/multiTenant/domainResolver.ts'));
    const deploymentTargets = require(path.join(ROOT, 'src/constants/deploymentTargets.ts'));
    const productDomains = require(path.join(ROOT, 'src/constants/productDomains.ts'));
    const hostedHelpRequest = require(path.join(ROOT, 'src/lib/answerlattice/hostedHelpRequest.ts'));
    const answerlatticeDomains = require(path.join(ROOT, 'src/constants/answerlattice/domains.ts'));
    const campaignCueDomains = require(path.join(ROOT, 'src/constants/campaigncue/domains.ts'));
    const neelvaraDomains = require(path.join(ROOT, 'src/constants/neelvara/domains.ts'));
    fn({
      ...domainResolver,
      ...deploymentTargets,
      ...productDomains,
      ...hostedHelpRequest,
      ...answerlatticeDomains,
      ...campaignCueDomains,
      ...neelvaraDomains,
    });
  } finally {
    clearSrcRequireCache();
    restoreEnv(original);
    clearSrcRequireCache();
  }
}

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  assert(
    packageJson.scripts['verify:url-routing-boundary'] === 'node scripts/verification/verify-url-routing-boundary.js',
    'package.json must expose verify:url-routing-boundary',
  );
}

function verifyResolverRuntimeBoundary() {
  withRoutingEnv({ NODE_ENV: 'development' }, ({
    getHostedHelpChangelogText,
    normalizeHostedHelpArticleSlug,
    resolveDomain,
    resolveHostedHelpRequestDomain,
    resolveTenantRequestIdentity,
    serializeHostedHelpDate,
    shouldBypassDomainRouting,
  }) => {
    const localPlatform = resolveDomain('localhost:3000');
    assert(localPlatform.type === 'platform', 'localhost must resolve as platform in local development');
    assert(localPlatform.isPlatform === true && localPlatform.isClient === false, 'localhost must not be tenant client traffic');

    const localTenant = resolveDomain('mysalon.menulist.online:3000');
    assert(localTenant.type === 'subdomain', 'local generated tenant host must resolve as subdomain');
    assert(localTenant.subdomain === 'mysalon', 'local generated tenant host must preserve tenant subdomain');
    assert(localTenant.isClient === true, 'local generated tenant host must be client traffic');

    const reservedDashboard = resolveDomain('app.menulist.online');
    assert(reservedDashboard.type === 'platform', 'reserved app subdomain must not become tenant traffic');

    const signalDeskHost = resolveDomain('signaldesk.menulist.online');
    assert(signalDeskHost.type === 'platform', 'reserved SignalDesk subdomain must not become tenant traffic');

    const vercelAlias = resolveDomain('menulist-preview.vercel.app');
    assert(vercelAlias.type === 'platform', 'Vercel deployment aliases must be app hosts, not tenant custom domains');

    const customDomain = resolveDomain('customer-owned-domain.example');
    assert(customDomain.type === 'custom', 'unknown non-platform host must resolve as custom domain');
    assert(customDomain.customDomain === 'customer-owned-domain.example', 'custom domain resolver must preserve normalized hostname');

    const trailingDotTenant = resolveDomain('mysalon.menulist.online.');
    assert(trailingDotTenant.type === 'subdomain', 'strict Host parsing must normalize trailing-dot tenant hostnames');
    assert(trailingDotTenant.subdomain === 'mysalon', 'trailing-dot tenant host must preserve tenant subdomain after normalization');

    [
      'restaurant.example,attacker.example',
      'restaurant.example/path',
      'user@restaurant.example',
      'restaurant.example:bad',
      'bad..host.example',
      '[::1]:3000',
    ].forEach((malformedHost) => {
      const malformedResolution = resolveDomain(malformedHost);
      assert(
        malformedResolution.isClient === false && malformedResolution.type === 'localhost',
        `malformed Host authority ${malformedHost} must not resolve as tenant/custom traffic`,
      );
    });

    assert(shouldBypassDomainRouting('/api/domain'), 'API routes must bypass tenant routing');
    assert(shouldBypassDomainRouting('/_next/static/chunks/app.js'), 'Next static assets must bypass tenant routing');
    assert(shouldBypassDomainRouting('/sites/answerlattice'), 'product site internals must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__answerlattice'), 'Answerlattice local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__campaigncue/app'), 'CampaignCue local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__mycodex'), 'MyCodex local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/manifest.json'), 'global manifest must bypass tenant routing');
    assert(!shouldBypassDomainRouting('/robots.txt'), 'tenant robots must not bypass middleware');
    assert(!shouldBypassDomainRouting('/sitemap.xml'), 'tenant sitemap must not bypass middleware');

    const trustedTenant = resolveTenantRequestIdentity('mysalon.menulist.online:3000', {
      subdomain: 'mysalon',
      tenantType: 'subdomain',
    });
    assert(trustedTenant?.subdomain === 'mysalon', 'matching middleware tenant claims must preserve Host-derived identity');
    assert(trustedTenant?.routingClaimsValid === true, 'matching middleware tenant claims must validate');

    const forgedTenant = resolveTenantRequestIdentity('mysalon.menulist.online:3000', {
      subdomain: 'another-store',
      tenantType: 'subdomain',
    });
    assert(forgedTenant?.subdomain === 'mysalon', 'forged tenant header must not override the request Host tenant');
    assert(forgedTenant?.routingClaimsValid === false, 'forged tenant header must fail the integrity claim');

    const forgedCustomDomain = resolveTenantRequestIdentity('restaurant.example', {
      customDomain: 'other-restaurant.example',
      tenantType: 'custom',
    });
    assert(forgedCustomDomain?.customDomain === 'restaurant.example', 'forged custom-domain header must not change Host-derived identity');
    assert(forgedCustomDomain?.routingClaimsValid === false, 'forged custom-domain claim must fail validation');
    assert(resolveTenantRequestIdentity('restaurant.example,attacker.example') === null, 'forwarded host lists must not be accepted as Host authority');
    assert(resolveTenantRequestIdentity('restaurant.example/path') === null, 'Host authority must reject URL paths');

    assert(
      resolveHostedHelpRequestDomain({
        host: 'help.customer.example',
        queryDomain: 'help.other.example',
        isDevelopmentRewrite: true,
        isDevelopmentRuntime: true,
      }) === 'help.customer.example',
      'hosted-help query override must not replace a public Host even with a forged dev marker',
    );
    assert(
      resolveHostedHelpRequestDomain({
        host: 'localhost:3000',
        queryDomain: 'help.customer.example',
        isDevelopmentRewrite: true,
        isDevelopmentRuntime: true,
      }) === 'help.customer.example',
      'middleware-marked local hosted-help rewrite may use the explicit test domain',
    );
    assert(
      resolveHostedHelpRequestDomain({
        host: 'localhost:3000',
        queryDomain: 'help.customer.example',
        isDevelopmentRewrite: false,
        isDevelopmentRuntime: true,
      }) === 'localhost',
      'unmarked local hosted-help request must not accept the query override',
    );
    assert(normalizeHostedHelpArticleSlug('docs/getting%20started') === 'getting started', 'hosted-help article slug must decode valid percent input');
    assert(normalizeHostedHelpArticleSlug('%E0%A4%A') === '', 'hosted-help article slug must fail closed for malformed percent input');
    assert(
      getHostedHelpChangelogText({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Safe release note' }] },
          { type: 'internal', secret: 'must not serialize' },
        ],
      }) === 'Safe release note',
      'hosted-help changelog text must emit text nodes without copying unknown fields',
    );
    assert(getHostedHelpChangelogText({ type: 'text', text: 'x'.repeat(3000) }).length === 2000, 'hosted-help changelog text must be bounded');
    assert(serializeHostedHelpDate({ seconds: 0 }) === '1970-01-01T00:00:00.000Z', 'hosted-help date must serialize Firestore seconds');
    assert(serializeHostedHelpDate({ toDate: () => { throw new Error('bad timestamp'); } }) === null, 'hosted-help date must fail closed when timestamp conversion throws');
  });

  withRoutingEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    NEXT_PUBLIC_ENV: 'preview',
    NODE_ENV: 'production',
  }, ({
    isActiveProductDomain,
    isAnswerlatticeProductHostname,
    isCampaignCueProductHostname,
    isNeelvaraProductHostname,
    resolveDomain,
    resolveKnownProductIdByHostname,
    resolveProductSiteByHostname,
  }) => {
    assert(resolveDomain('menulist.online').type === 'platform', 'preview MenuList host must resolve as platform');

    const answerlattice = resolveDomain('answerlattice.menulist.online');
    assert(answerlattice.type === 'product', 'preview Answerlattice host must resolve as product');
    assert(answerlattice.productSite?.id === 'answerlattice', 'preview Answerlattice host must preserve product id');

    const campaigncue = resolveDomain('campaigncue.menulist.online');
    assert(campaigncue.type === 'product', 'preview CampaignCue host must resolve as product');
    assert(campaigncue.productSite?.id === 'campaigncue', 'preview CampaignCue host must preserve product id');

    const neelvara = resolveDomain('neelvara.menulist.online');
    assert(neelvara.type === 'product', 'preview Neelvara host must resolve as product');
    assert(neelvara.productSite?.id === 'neelvara', 'preview Neelvara host must preserve product id');

    const signaldesk = resolveDomain('signaldesk.menulist.online');
    assert(signaldesk.type === 'platform', 'preview SignalDesk host must stay out of tenant routing before middleware app-host branch');

    const tenant = resolveDomain('joespizza.menulist.online');
    assert(tenant.type === 'subdomain' && tenant.subdomain === 'joespizza', 'preview tenant subdomain must resolve as client subdomain');

    assert(resolveKnownProductIdByHostname('signaldesk.menulist.online') === 'signaldesk', 'known product host lookup must recognize preview SignalDesk');
    assert(resolveKnownProductIdByHostname('signaldesk.menulist.online:443') === 'signaldesk', 'known product host lookup must accept valid Host ports');
    assert(isActiveProductDomain('signaldesk', 'signaldesk.menulist.online:443') === true, 'active product-domain lookup must accept valid Host ports');
    assert(isAnswerlatticeProductHostname('answerlattice.menulist.online:443') === true, 'Answerlattice product helper must accept valid Host ports');
    assert(isCampaignCueProductHostname('campaigncue.menulist.online:443') === true, 'CampaignCue product helper must accept valid Host ports');
    assert(isNeelvaraProductHostname('neelvara.menulist.online:443') === true, 'Neelvara product helper must accept valid Host ports');
    assert(resolveProductSiteByHostname('answerlattice.menulist.online.')?.id === 'answerlattice', 'product-site lookup must normalize trailing-dot product hosts');
    [
      'answerlattice.menulist.online:bad',
      'signaldesk.menulist.online:bad',
      'menulist.digital:bad',
    ].forEach((malformedHost) => {
      assert(resolveKnownProductIdByHostname(malformedHost) === null, `known product host lookup must reject malformed authority ${malformedHost}`);
      assert(resolveProductSiteByHostname(malformedHost) === undefined, `product-site lookup must reject malformed authority ${malformedHost}`);
    });
    assert(isAnswerlatticeProductHostname('answerlattice.menulist.online:bad') === false, 'Answerlattice product helper must reject malformed Host ports');
    assert(isCampaignCueProductHostname('campaigncue.menulist.online:bad') === false, 'CampaignCue product helper must reject malformed Host ports');
    assert(isNeelvaraProductHostname('neelvara.menulist.online:bad') === false, 'Neelvara product helper must reject malformed Host ports');
  });

  withRoutingEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_ENV: 'production',
    NODE_ENV: 'production',
  }, ({
    isActiveProductDomain,
    isAnswerlatticeProductHostname,
    isCampaignCueProductHostname,
    isNeelvaraProductHostname,
    resolveDomain,
    resolveKnownProductIdByHostname,
    resolveProductSiteByHostname,
  }) => {
    assert(resolveDomain('menulist.ai').type === 'platform', 'production MenuList host must resolve as platform');
    assert(resolveDomain('app.menulist.ai').type === 'platform', 'production app host must resolve as platform');

    const tenant = resolveDomain('joespizza.menulist.ai');
    assert(tenant.type === 'subdomain' && tenant.subdomain === 'joespizza', 'production tenant subdomain must resolve as client subdomain');

    const answerlattice = resolveDomain('answerlattice.com');
    assert(answerlattice.type === 'product' && answerlattice.productSite?.id === 'answerlattice', 'production Answerlattice domain must resolve as product');

    const campaigncue = resolveDomain('campaigncue.ai');
    assert(campaigncue.type === 'product' && campaigncue.productSite?.id === 'campaigncue', 'production CampaignCue domain must resolve as product');

    const mycodex = resolveDomain('menulist.digital');
    assert(mycodex.type === 'product' && mycodex.productSite?.id === 'mycodex', 'MyCodex domain must resolve as product, not custom tenant domain');

    const custom = resolveDomain('restaurant.example');
    assert(custom.type === 'custom' && custom.isClient === true, 'restaurant custom domain must resolve as tenant client traffic');

    assert(resolveKnownProductIdByHostname('signaldesk.menulist.ai') === 'signaldesk', 'known product host lookup must recognize production SignalDesk');
    assert(isActiveProductDomain('answerlattice', 'answerlattice.com:443') === true, 'active product-domain lookup must accept valid production Host ports');
    assert(isAnswerlatticeProductHostname('answerlattice.com:443') === true, 'Answerlattice production helper must accept valid Host ports');
    assert(isCampaignCueProductHostname('campaigncue.ai:443') === true, 'CampaignCue production helper must accept valid Host ports');
    assert(isNeelvaraProductHostname('neelvara.com:443') === true, 'Neelvara production helper must accept valid Host ports');
    assert(resolveProductSiteByHostname('answerlattice.com:443')?.id === 'answerlattice', 'product-site lookup must accept valid production Host ports');
    [
      'answerlattice.com:bad',
      'signaldesk.menulist.ai:bad',
      'menulist.digital:bad',
    ].forEach((malformedHost) => {
      assert(resolveKnownProductIdByHostname(malformedHost) === null, `known production product host lookup must reject malformed authority ${malformedHost}`);
      assert(isActiveProductDomain('answerlattice', malformedHost) === false, `active product-domain lookup must reject malformed authority ${malformedHost}`);
      assert(resolveProductSiteByHostname(malformedHost) === undefined, `production product-site lookup must reject malformed authority ${malformedHost}`);
    });
    assert(isAnswerlatticeProductHostname('answerlattice.com:bad') === false, 'Answerlattice production helper must reject malformed Host ports');
    assert(isCampaignCueProductHostname('campaigncue.ai:bad') === false, 'CampaignCue production helper must reject malformed Host ports');
    assert(isNeelvaraProductHostname('neelvara.com:bad') === false, 'Neelvara production helper must reject malformed Host ports');
  });
}

function verifyResolverSourceBoundary() {
  const deploymentTargets = read('src/constants/deploymentTargets.ts');
  const productDomains = read('src/constants/productDomains.ts');
  const answerlatticeDomains = read('src/constants/answerlattice/domains.ts');
  const campaignCueDomains = read('src/constants/campaigncue/domains.ts');
  const neelvaraDomains = read('src/constants/neelvara/domains.ts');
  const resolver = read('src/lib/multiTenant/domainResolver.ts');
  const hostAuthority = read('src/lib/routing/hostAuthority.ts');
  const middleware = read('src/middleware.ts');
  const tenantHeaders = read('src/lib/multiTenant/getTenantFromHeaders.ts');
  const manifestRoute = read('src/app/manifest.webmanifest/route.ts');

  assertOrder(
    resolver,
    'const productSite = resolveProductSiteByHostname(normalizedHost);',
    'if (PLATFORM_DOMAINS.some',
    'domain resolver product-domain precedence',
  );
  assertOrder(
    resolver,
    'if (isVercelDeploymentHost(normalizedHost))',
    'const platformBaseDomains = Array.from',
    'domain resolver Vercel host boundary',
  );
  assertIncludes(resolver, 'PLATFORM_DOMAIN_ALIASES', 'domain resolver supported platform aliases');
  assertIncludes(resolver, 'RESERVED_SUBDOMAINS.includes(subdomain)', 'domain resolver reserved subdomain guard');
  assertIncludes(resolver, 'const normalizedAuthority = normalizeRequestAuthority(hostname);', 'domain resolver strict Host-authority normalization');
  assertIncludes(resolver, 'const normalizedHost = normalizedAuthority.hostname;', 'domain resolver must classify the normalized Host hostname');
  assertIncludes(resolver, 'Malformed host values must never fall', 'domain resolver malformed Host fail-closed comment');
  assertIncludes(hostAuthority, 'parsed.port', 'shared Host authority parser must preserve valid ports');
  assertIncludes(hostAuthority, "/[\\s,\\\\/@?#]/.test(candidate)", 'shared Host authority parser must reject forwarded lists, paths, credentials, query and fragment characters');
  assertIncludes(deploymentTargets, 'normalizeRequestAuthority(hostname)?.hostname', 'deployment target product-host helpers must use the strict Host authority parser');
  assertIncludes(productDomains, 'normalizeRequestAuthority(hostname)?.hostname', 'product domain helper must use the strict Host authority parser');
  assertIncludes(answerlatticeDomains, 'normalizeRequestAuthority(hostname)?.hostname', 'Answerlattice product hostname helper must use the strict Host authority parser');
  assertIncludes(campaignCueDomains, 'normalizeRequestAuthority(hostname)?.hostname', 'CampaignCue product hostname helper must use the strict Host authority parser');
  assertIncludes(neelvaraDomains, 'normalizeRequestAuthority(hostname)?.hostname', 'Neelvara product hostname helper must use the strict Host authority parser');
  assertIncludes(middleware, 'normalizeRequestAuthority(hostname)?.hostname || \'\';', 'middleware local/product alias helpers must use the strict Host authority parser');
  assertNotIncludes(deploymentTargets, "hostname.split(':')[0]", 'deployment target helpers must not use colon-split Host parsing');
  assertNotIncludes(productDomains, "hostname.split(':')[0]", 'product domain helper must not use colon-split Host parsing');
  assertNotIncludes(answerlatticeDomains, "hostname.split(':')[0]", 'Answerlattice product hostname helper must not use colon-split Host parsing');
  assertNotIncludes(campaignCueDomains, 'hostname.split(":")[0]', 'CampaignCue product hostname helper must not use colon-split Host parsing');
  assertNotIncludes(neelvaraDomains, "hostname.split(':')[0]", 'Neelvara product hostname helper must not use colon-split Host parsing');
  assertNotIncludes(middleware, "hostname?.split(':')[0]", 'middleware helpers must not use colon-split Host parsing');
  assertIncludes(resolver, "type: 'custom'", 'domain resolver custom domain fallback');
  assertNotIncludes(resolver, "hostname === 'menulist.ai'", 'domain resolver must not hardcode production MenuList host');
  assertNotIncludes(resolver, "hostname === 'menulist.online'", 'domain resolver must not hardcode preview MenuList host');

  assertIncludes(tenantHeaders, "const requestHost = headersList.get('host');", 'tenant header helper original Host authority');
  assertIncludes(tenantHeaders, 'resolveTenantRequestIdentity(requestHost', 'tenant header helper Host-derived identity resolver');
  assertIncludes(tenantHeaders, "subdomain: headersList.get('x-tenant-subdomain')", 'tenant header helper middleware claim validation');
  assertIncludes(tenantHeaders, 'secureError', 'tenant header helper secure logging');
  assertIncludes(tenantHeaders, 'sanitizeTenantLogContext', 'tenant header helper bounded log context');
  assertNotIncludes(tenantHeaders, "headersList.get('x-forwarded-host')", 'tenant header helper must not trust forwarded host for tenant identity');
  assertNotIncludes(tenantHeaders, 'process.env.VERCEL_URL', 'tenant header helper must not use deployment host as tenant identity');
  assertNotIncludes(tenantHeaders, 'tenantSubdomain ||', 'tenant header helper must not prefer a tenant header over Host');
  assertNotIncludes(tenantHeaders, 'console.error', 'tenant header helper must not log raw headers through console');
  assertNotIncludes(tenantHeaders, 'Object.fromEntries(headersList', 'tenant header helper must not serialize raw request headers');

  assertIncludes(manifestRoute, "requestHostname = h.get('host') || '';", 'manifest route Host-derived tenant identity');
  assertNotIncludes(manifestRoute, 'x-forwarded-host', 'manifest route must not trust forwarded host for tenant identity or cache keys');
}

function verifyPublicPathSegmentBoundary() {
  const {
    normalizePublicPathSegment,
    normalizePublicOutletSlug,
    normalizePublicProjectSlug,
  } = require(path.join(ROOT, 'src/lib/publicRouting/pathSegments.ts'));
  const brandObp = read('src/app/client/obp/BrandOBPContent.tsx');
  const obpContent = read('src/app/client/obp/OBPContent.tsx');
  const outletObp = read('src/app/client/obp/OBPResolvedSurface.tsx');
  const clientPage = read('src/app/client/[[...slug]]/page.tsx');
  const sitemap = read('src/app/client/sitemap.ts');
  const pathSegments = read('src/lib/publicRouting/pathSegments.ts');
  const reservedSlugs = read('src/constants/reservedSlugs.ts');
  const publicRenderLanguage = read('src/lib/localization/publicRenderLanguage.ts');

  [
    ['simple segment', normalizePublicPathSegment('pune'), 'pune'],
    ['lowercase segment', normalizePublicPathSegment('Pune-West'), 'pune-west'],
    ['trim segment', normalizePublicPathSegment('  cafe-1  '), 'cafe-1'],
    ['outlet segment', normalizePublicOutletSlug('south-delhi'), 'south-delhi'],
    ['project segment', normalizePublicProjectSlug('food-menu'), 'food-menu'],
    ['project menu segment', normalizePublicProjectSlug('Menu'), 'menu'],
  ].forEach(([label, actual, expected]) => {
    assert(actual === expected, `${label} expected ${expected}, received ${actual}`);
  });

  [
    ['slash segment', normalizePublicPathSegment('pune/menu')],
    ['encoded slash segment', normalizePublicPathSegment('pune%2fmenu')],
    ['query segment', normalizePublicPathSegment('pune?x=1')],
    ['dot segment', normalizePublicPathSegment('../menu')],
    ['double hyphen segment', normalizePublicPathSegment('pune--west')],
    ['reserved outlet segment', normalizePublicOutletSlug('menu')],
    ['reserved project segment', normalizePublicProjectSlug('screen')],
    ['oversized segment', normalizePublicPathSegment('a'.repeat(121))],
  ].forEach(([label, actual]) => {
    assert(actual === null, `${label} expected null, received ${actual}`);
  });

  [
    'isReservedOutletSlug, isReservedProjectSlug',
    'export function normalizePublicProjectSlug',
    'isReservedProjectSlug(segment)',
  ].forEach((token) => assertIncludes(pathSegments, token, 'Public path segment helper boundary'));

  [
    'public_language_param_url_parse_failed',
    'PUBLIC_LANGUAGE_PARAM_DIAGNOSTIC_LIMIT',
    'reportedPublicLanguageParamFailures.add(failureKey)',
    "getBoundedRuntimeStringContext('languageParamUrl', url)",
    "getBoundedRuntimeStringContext('language', language)",
    "fallbackPolicy: 'return_original_url'",
    'logPublicLanguageParamFailure(error, url, normalizedLanguage)',
  ].forEach((token) => assertIncludes(publicRenderLanguage, token, 'Public language param parse fallback boundary'));
  assertNotIncludes(
    publicRenderLanguage,
    "const separator = url.includes('?') ? '&' : '?';",
    'Public language param parse fallback must not append to raw malformed URLs',
  );
  assertNotIncludes(
    publicRenderLanguage,
    'return `${url}${separator}lang=${encodeURIComponent(normalizedLanguage)}`;',
    'Public language param parse fallback must not return string-concatenated raw URLs',
  );

  [
    "'menu',            // /menu is the universal menu alias and cannot be an outlet root",
    'export const RESERVED_OUTLET_SLUGS',
  ].forEach((token) => assertIncludes(reservedSlugs, token, 'Reserved outlet slug boundary'));

  [
    'publicOutletSlug: normalizePublicOutletSlug(outlet.outletSlug)',
    'outlet.publicOutletSlug',
  ].forEach((token) => assertIncludes(brandObp, token, 'Brand OBP public outlet slug boundary'));
  assertNotIncludes(brandObp, '${baseUrl}/${outlet.outletSlug}', 'Brand OBP raw outlet slug href');
  assertNotIncludes(brandObp, '!!o?.outletSlug', 'Brand OBP truthy-only outlet slug filter');

  [
    'const publicOutletSlug = isOutletSurface ? normalizePublicOutletSlug(store?.outletSlug) : null;',
    'const outletPrefix = publicOutletSlug',
    'outletSlug={publicOutletSlug}',
  ].forEach((token) => assertIncludes(outletObp, token, 'Outlet OBP public outlet slug boundary'));
  assertNotIncludes(outletObp, '? `/${store.outletSlug}`', 'Outlet OBP raw outlet prefix');

  [
    'const safeOutletSlug = normalizePublicOutletSlug(outletSlug);',
    'const requestedOutletSlug = normalizePublicOutletSlug(firstSlug);',
    'metadataOutletSlug = normalizePublicOutletSlug(outletStore.outletSlug) || requestedOutletSlug || undefined;',
    'let projectSlugForLookup: string | undefined = normalizePublicProjectSlug(slugSegments[0]) || undefined;',
    'projectSlugForLookup = normalizePublicProjectSlug(slugSegments[1]) || undefined;',
    'const normalizedSlug = normalizePublicProjectSlug(slug);',
    'projects.find((p) => normalizePublicProjectSlug(p.slug) === normalizedSlug) || null;',
    'normalizePublicProjectSlug(slugify(p.name)) === normalizedSlug',
    'normalizePublicProjectSlug(previousSlug) === normalizedSlug',
    'normalizePublicProjectSlug(oldSlugMatch.slug)',
    'const safeRedirectSlug = normalizePublicProjectSlug(redirectSlug);',
    'const requestedProjectSlug = normalizePublicProjectSlug(resolvedSlug);',
    'normalizePublicProjectSlug(projectMetadata?.slug)',
    'const requestedOutletSlug = normalizePublicOutletSlug(slug);',
    'const canonicalOutletSlug = normalizePublicOutletSlug(outletStore.outletSlug);',
    'const safeStoreOutletSlug = normalizePublicOutletSlug(storeData.outletSlug);',
    'storeData.isMaster === false ? safeStoreOutletSlug : null',
    '? safeStoreOutletSlug',
    'appendPublicLanguageParam(`/${safeStoreOutletSlug}`',
  ].forEach((token) => assertIncludes(clientPage, token, 'Client menu outlet path-segment boundary'));
  [
    '(outletStore.outletSlug || firstSlug || \'\').toLowerCase()',
    '(outletStore.outletSlug || \'\').toLowerCase()',
    'const normalizedSlug = slug.toLowerCase();',
    'p.previousSlugs.includes(normalizedSlug)',
    'redirectSlug = oldSlugMatch.slug ||',
    'redirectSlug !== resolvedSlug.toLowerCase()',
    '${baseUrl}${outletPrefix}/${redirectSlug}',
    'storeData.outletSlug || null',
    'outletSlug={storeData.outletSlug}',
    '`/${storeData.outletSlug}`',
  ].forEach((token) => assertNotIncludes(clientPage, token, 'Client menu raw outlet slug output'));

  [
    'normalizePublicProjectSlug(project.slug)',
    'const baseProjectSlug = normalizePublicProjectSlug(baseProject?.slug);',
    'defaultSlug: normalizePublicProjectSlug(defaultProj?.slug) || undefined,',
  ].forEach((token) => assertIncludes(obpContent, token, 'OBP menu CTA project slug boundary'));
  [
    'slug: (project.slug as string) ||',
    'slug: (baseProject?.slug as string) || project.slug',
    'defaultSlug: (defaultProj?.slug as string) || undefined',
  ].forEach((token) => assertNotIncludes(obpContent, token, 'OBP menu CTA raw project slug output'));

  [
    'normalizePublicOutletSlug(data?.outletSlug)',
    'normalizePublicProjectSlug(p?.slug)',
    'if (!outletSlug) continue;',
    'Outlets without a safe `outletSlug`',
    'projects without a safe `projectSlug`',
    'logTenantSitemapFailure',
    'MAX_TENANT_SITEMAP_DIAGNOSTICS',
    'reportedTenantSitemapFailures.add(failureKey)',
    'fallbackPolicy: TENANT_SITEMAP_FALLBACK_POLICIES[failureType]',
    'return_empty_sitemap',
    'omit_outlet_sitemap_entries',
    'omit_project_sitemap_entries',
    'tenant_sitemap_master_store_lookup_failed',
    'tenant_sitemap_projects_lookup_failed',
    'tenant_sitemap_outlets_lookup_failed',
  ].forEach((token) => assertIncludes(sitemap, token, 'Sitemap public path-segment boundary'));
  [
    'data.outletSlug.trim()',
    'typeof data?.outletSlug === \'string\' ? data.outletSlug.trim()',
    'typeof p?.slug === \'string\' ? p.slug.trim()',
    '} catch {\n            return null;\n        }',
    '} catch {\n            return [];\n        }',
  ].forEach((token) => assertNotIncludes(sitemap, token, 'Sitemap raw path-segment output'));
}

function verifyMiddlewareBoundary() {
  const middleware = read('src/middleware.ts');

  assertOrder(
    middleware,
    "if (pathname === '/client' || pathname.startsWith('/client/'))",
    "if (knownProductId === 'signaldesk')",
    'middleware internal client route block before app-host routing',
  );
  assertOrder(
    middleware,
    "if (knownProductId === 'signaldesk')",
    "if (domainInfo.type === 'product' && domainInfo.productSite)",
    'middleware SignalDesk private host branch before product-site branch',
  );
  assertOrder(
    middleware,
    "if (domainInfo.type === 'product' && domainInfo.productSite)",
    '// Priority 2: Multi-Tenant Client Routing',
    'middleware product-domain branch before tenant routing',
  );
  assertOrder(
    middleware,
    'const skipRouting = shouldBypassDomainRouting(pathname)',
    "if (domainInfo.isClient && pathname !== pathname.toLowerCase())",
    'middleware bypass check before tenant URL normalization',
  );
  assertOrder(
    middleware,
    "if (domainInfo.isClient && pathname !== pathname.toLowerCase())",
    "if (domainInfo.isClient && pathname.length > 1 && pathname.endsWith('/'))",
    'middleware lowercase normalization before trailing-slash normalization',
  );
  assertIncludes(middleware, "if (!domainInfo.isClient)", 'middleware direct /client platform guard');
  assertIncludes(middleware, 'NextResponse.redirect(url, 301)', 'middleware direct /client guard uses permanent redirect');
  assertIncludes(middleware, "pathname === '/feedback'", 'middleware feedback route bypass');
  assertIncludes(middleware, "pathname === '/screen'", 'middleware screen route bypass');
  assertIncludes(middleware, "pathname === '/offline'", 'middleware offline route bypass');
  assertIncludes(middleware, "url.pathname = pathname === '/robots.txt'", 'middleware tenant robots rewrite');
  assertIncludes(middleware, "? '/client/robots'", 'middleware tenant robots route target');
  assertIncludes(middleware, ": `/client${pathname === '/' ? '' : pathname}`", 'middleware tenant client rewrite target');
  assertIncludes(middleware, "response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');", 'middleware public client cache header');
  assertIncludes(middleware, "response.headers.set('x-tenant-subdomain', domainInfo.subdomain);", 'middleware tenant subdomain header');
  assertIncludes(middleware, "response.headers.set('x-tenant-custom-domain', domainInfo.customDomain);", 'middleware tenant custom-domain header');
  assertIncludes(middleware, "response.headers.set('x-tenant-type', 'subdomain');", 'middleware subdomain tenant type header');
  assertIncludes(middleware, "response.headers.set('x-tenant-type', 'custom');", 'middleware custom-domain tenant type header');
  assertIncludes(middleware, 'getSanitizedRoutingRequestHeaders(request)', 'middleware controlled routing-header sanitization');
  assertIncludes(middleware, "CONTROLLED_TENANT_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));", 'middleware forged tenant-header removal');
  assertIncludes(middleware, "CONTROLLED_HOSTED_HELP_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));", 'middleware forged hosted-help header removal');
  assertIncludes(middleware, "CONTROLLED_PRODUCT_REQUEST_HEADERS.forEach((header) => requestHeaders.delete(header));", 'middleware forged product-header removal');
  assertIncludes(middleware, 'request: { headers: requestHeaders }', 'middleware trusted routing headers forwarded to rewritten request');
  assertIncludes(middleware, 'nextWithSanitizedRoutingHeaders(request)', 'middleware pass-through routing-header sanitization');
  assertIncludes(middleware, 'nextWithProductHeaders(request, productConfig)', 'middleware product pass-through trusted header injection');
  assertNotIncludes(middleware, 'return applySecurityHeaders(request, NextResponse.next());', 'middleware unsanitized pass-through response');
  assertIncludes(middleware, 'rewriteTenantResponse(request, url)', 'middleware tenant rewrite request-header boundary');
  assertIncludes(middleware, 'rewriteHostedHelpResponse(request, url, { domain: domainInfo.hostname })', 'middleware hosted-help rewrite request-header boundary');
  assertNotIncludes(middleware, "`/_client", 'middleware must not rewrite to retired _client namespace');
}

function verifyDocsBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const docs = [
    'README.md',
    'url-routing-architecture_spec.md',
    'url-routing-architecture_impl.md',
    'url-routing-architecture_firebase.md',
    'url-routing-architecture_mobile-support.md',
    'url-routing-architecture_adr.md',
  ].map((file) => [`__docs__/url-routing-architecture/${file}`, read(`__docs__/url-routing-architecture/${file}`)]);
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');

  assert(
    Object.keys(packageJson.scripts).includes('verify:url-routing-boundary'),
    'package verifier registry must include verify:url-routing-boundary',
  );

  docs.forEach(([relativePath, content]) => {
    assertIncludes(content, 'npm run verify:url-routing-boundary', `${relativePath} source-gate documentation`);
    assertNotIncludes(content, 'src/app/_client', `${relativePath} must not reference retired source route`);
    assertNotIncludes(content, '/_client', `${relativePath} must not reference retired internal route`);
    assertNotIncludes(content, '`_client`', `${relativePath} must not reference retired route namespace`);
    assertNotIncludes(content, '_client/[[...slug]]', `${relativePath} must not reference retired route label`);
    [
      'Phase 1',
      'Phase 2',
      'Phase 3',
      'post-launch',
      'production-ready',
      'production ready',
      'ready for production',
    ].forEach((token) => assertNotIncludes(content, token, `${relativePath} active launch-boundary wording`));
  });

  const readme = docs[0][1];
  const spec = docs[1][1];
  const impl = docs[2][1];
  assertIncludes(readme, 'src/app/client/[[...slug]]/page.tsx', 'URL routing README current public route source');
  assertIncludes(readme, '`/client`', 'URL routing README current internal route namespace');
  assertIncludes(readme, 'Slug, canonical, product-domain, and path-segment guardrails implemented', 'URL routing README launch-boundary status');
  assertIncludes(readme, 'Milestone A: Slug Infrastructure', 'URL routing README milestone wording');
  assertIncludes(readme, 'Milestone B: CDN & Canonical', 'URL routing README milestone wording');
  assertIncludes(spec, 'Slug, canonical, product-domain, and path-segment guardrails implemented', 'URL routing spec launch-boundary status');
  assertIncludes(spec, 'In-Scope (Slug Infrastructure', 'URL routing spec milestone wording');
  assertIncludes(spec, 'In-Scope (Canonical Routing', 'URL routing spec milestone wording');
  assertIncludes(impl, 'src/app/client/[[...slug]]/page.tsx', 'URL routing implementation current public route source');
  assertIncludes(impl, '`/client`', 'URL routing implementation current internal route namespace');
  assertIncludes(impl, 'Slug, canonical, product-domain, and path-segment guardrails implemented', 'URL routing implementation launch-boundary status');
  assertIncludes(impl, 'New Files (Slug + Canonical Milestones)', 'URL routing implementation milestone wording');
  assertIncludes(audit, 'verify:url-routing-boundary', 'production readiness audit URL routing source gate evidence');
  assertIncludes(readme, 'safe outlet path segments', 'URL routing README outlet path-segment boundary');
  assertIncludes(impl, 'safe outlet path segments', 'URL routing implementation outlet path-segment boundary');
  assertIncludes(docs[3][1], 'safe outlet path segments', 'URL routing Firebase outlet path-segment boundary');
  assertIncludes(docs[4][1], 'safe outlet path segments', 'URL routing mobile outlet path-segment boundary');
  assertIncludes(audit, 'safe outlet path segments', 'production readiness audit outlet path-segment boundary');
  assertIncludes(readme, 'safe project path segments', 'URL routing README project path-segment boundary');
  assertIncludes(impl, 'safe project path segments', 'URL routing implementation project path-segment boundary');
  assertIncludes(docs[3][1], 'safe project path segments', 'URL routing Firebase project path-segment boundary');
  assertIncludes(docs[4][1], 'safe project path segments', 'URL routing mobile project path-segment boundary');
  assertIncludes(audit, 'safe project path segments', 'production readiness audit project path-segment boundary');
  assertIncludes(readme, 'tenant_sitemap_*_failed', 'URL routing README sitemap diagnostic boundary');
  assertIncludes(impl, 'tenant_sitemap_master_store_lookup_failed', 'URL routing implementation sitemap diagnostic boundary');
  assertIncludes(docs[3][1], 'tenant sitemap lookup diagnostic cap', 'URL routing Firebase sitemap diagnostic cost boundary');
  assertIncludes(audit, 'Tenant sitemap diagnostic cap checkpoint', 'production readiness audit sitemap diagnostic boundary');
  assertIncludes(readme, 'public language parameter parse fallback', 'URL routing README language param parse boundary');
  assertIncludes(impl, 'public language parameter parse fallback', 'URL routing implementation language param parse boundary');
  assertIncludes(docs[3][1], 'public_language_param_url_parse_failed', 'URL routing Firebase language param parse cost boundary');
  assertIncludes(audit, 'Public language parameter parse fallback checkpoint', 'production readiness audit language param parse boundary');
}

function verifySubdomainClaimBoundary() {
  const claimBoundary = read('src/lib/routing/subdomainClaim.ts');
  const ownerScopeBoundary = read('src/lib/routing/subdomainOwnerScope.ts');
  const onboarding = read('src/lib/onboarding/createTenantStore.ts');
  const subdomainRoute = read('src/app/api/subdomain/check/route.ts');
  const storeDal = read('src/database/stores/index.tsx');
  const adminRename = read('src/app/api/admin/subdomains/rename/route.ts');
  const emulatorTest = read('scripts/verification/test-stores-summary-rules.ts');
  const readme = read('__docs__/url-routing-architecture/README.md');
  const firebaseDoc = read('__docs__/url-routing-architecture/url-routing-architecture_firebase.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    "const SUBDOMAIN_CLAIM_DOCUMENT_PREFIX = 'subdomainClaim_';",
    'export async function readSubdomainReservationInTransaction(',
    'export function isSubdomainUnavailableError(error: unknown)',
    'if (!claimExists) return false;',
    "transaction.get(claimRef)",
    "transaction.get(directQuery)",
    "transaction.get(previousQuery)",
    "snapshot.id !== storeId",
    "previousSnap.size >= PREVIOUS_SUBDOMAIN_QUERY_LIMIT",
    'export function writeCurrentSubdomainClaim(',
    'export function writeReleasedSubdomainClaim(',
    'export function writeRedirectSubdomainClaim(',
  ].forEach((token) => assertIncludes(claimBoundary, token, 'Durable subdomain claim boundary'));

  [
    "const BRAND_SUBDOMAIN_TENANT_FIELDS = ['tenantId', 'tId'] as const;",
    "export type SubdomainOwnerScopeErrorReason = 'INVALID_SCOPE' | 'MASTER_REQUIRED';",
    'export async function readSubdomainOwnerStoreInTransaction(',
    'if (storeData.isMaster === true) return { storeData, storeRef };',
    "if (storeData.isMaster === false) throw new SubdomainOwnerScopeError('MASTER_REQUIRED');",
    'const tenantValues: Array<string | number> = [tenantId, Number(tenantId)];',
    ".where(field, '==', value).limit(2)",
    'canonicalStoreIds.size !== 1 || !canonicalStoreIds.has(storeId)',
  ].forEach((token) => assertIncludes(ownerScopeBoundary, token, 'Brand subdomain master-store admission boundary'));

  [
    'readSubdomainReservationInTransaction({',
    'const candidates = Array.from(new Set([requestedSubdomain, fallbackSubdomain]))',
    "throw new Error('subdomain_allocation_conflict')",
    'writeCurrentSubdomainClaim(transaction, subdomainReservation, now);',
  ].forEach((token) => assertIncludes(onboarding, token, 'Central onboarding subdomain reservation'));
  assertOrder(
    onboarding,
    'subdomainReservation = await readSubdomainReservationInTransaction({',
    '// 6. Create Tenant',
    'Onboarding subdomain reads before writes',
  );

  [
    'export const POST = withAuth(async (request: NextRequest, session) => {',
    'getRateLimitForFeature("DATA_WRITE")',
    'readBoundedJsonBody(request, SUBDOMAIN_ASSIGN_MAX_BODY_BYTES',
    'validateAPIInput(assignSchema, bodyResult.data)',
    'await db.runTransaction(async (transaction) => {',
    'readSubdomainReservationInTransaction({',
    'writeCurrentSubdomainClaim(transaction, reservation, now);',
    'writeReleasedSubdomainClaim({',
    "touchDigitalScreenContentVersionForStoreServer(scope.storeDocumentId, 'subdomainAssign')",
  ].forEach((token) => assertIncludes(subdomainRoute, token, 'Owner subdomain assignment boundary'));
  const [subdomainGetRoute, subdomainPostRoute] = subdomainRoute.split('export const POST =');
  for (const [label, route] of [
    ['GET', subdomainGetRoute],
    ['POST', subdomainPostRoute],
  ]) {
    assertIncludes(route, 'readSubdomainOwnerStoreInTransaction({', `Owner subdomain ${label} master-store admission`);
    assertIncludes(route, 'Public link is managed from the main location', `Owner subdomain ${label} outlet-safe response`);
    assertOrder(
      route,
      'readSubdomainOwnerStoreInTransaction({',
      'readSubdomainReservationInTransaction({',
      `Owner subdomain ${label} scope-before-claim order`,
    );
  }

  [
    "fetch('/api/subdomain/check'",
    'readJsonResponseWithLimit<unknown>(response, SUBDOMAIN_ASSIGN_RESPONSE_MAX_BYTES)',
    'data.subdomain = await assignStoreSubdomain(String(data.subdomain));',
    'if (subdomainHandledByServer) delete directStoreUpdate.subdomain;',
    "...(subdomainHandledByServer ? ['subdomain'] : []),",
  ].forEach((token) => assertIncludes(storeDal, token, 'Store DAL server-owned subdomain handoff'));
  assertOrder(
    storeDal,
    'data.subdomain = await assignStoreSubdomain(String(data.subdomain));',
    'await updateDoc(getDocRef(data.id)',
    'Subdomain reservation acknowledgement before client store update',
  );

  [
    'const renameResult = await db.runTransaction(async (tx) => {',
    'readSubdomainReservationInTransaction({',
    'writeCurrentSubdomainClaim(tx, reservation, now);',
    'writeRedirectSubdomainClaim({',
    'previousSubdomain: freshCurrentSubdomain',
  ].forEach((token) => assertIncludes(adminRename, token, 'Admin subdomain rename claim/redirect transaction'));
  [
    'Concurrent onboarding transactions must not commit the same public subdomain',
    'Exactly one concurrent onboarding transaction may own the requested public subdomain',
    'Durable subdomain claim owner must match the canonical store document',
    'Concurrent owner assignments must have exactly one successful public subdomain claim',
    'Concurrent owner claim ledger must match the only canonical host owner',
    'Redirect claim must block another store until expiry',
    'Expired redirect and history must permit a new owner',
    'Released claim must permit immediate ownership transfer',
    'Saturated previous-subdomain lookup must fail closed',
    'Explicit master store must retain brand subdomain authority',
    'Explicit outlet must not claim a brand subdomain',
    'Legacy single store must retain subdomain assignment compatibility',
    'Legacy multi-store topology without a master marker must fail closed',
  ].forEach((token) => assertIncludes(emulatorTest, token, 'Concurrent subdomain claim emulator regression'));
  assertIncludes(readme, 'Durable Subdomain Claim Boundary', 'URL routing README subdomain claim boundary');
  assertIncludes(readme, 'Brand subdomain master-store admission', 'URL routing README master-store subdomain boundary');
  assertIncludes(firebaseDoc, 'July 11, 2026 durable subdomain claim boundary', 'URL routing Firebase subdomain claim cost boundary');
  assertIncludes(firebaseDoc, 'legacy master-store compatibility reads', 'URL routing Firebase master-store compatibility cost');
  assertIncludes(audit, 'Durable subdomain claim and verifier-parity checkpoint', 'production readiness audit subdomain claim boundary');
  assertIncludes(audit, 'Subdomain claim lifecycle emulator checkpoint', 'production readiness audit subdomain claim lifecycle evidence');
  assertIncludes(audit, 'Brand subdomain master-store admission checkpoint', 'production readiness audit master-store subdomain boundary');
  assertIncludes(changelog, 'Durable Subdomain Claim Boundary', 'changelog subdomain claim boundary');
  assertIncludes(changelog, 'Redirect, release, expiry, and saturation behavior now have emulator regression coverage', 'changelog subdomain claim lifecycle evidence');
  assertIncludes(changelog, 'Outlet sessions cannot claim a standalone brand subdomain', 'changelog master-store subdomain boundary');
}

function verifyUrlRoutingBoundary() {
  verifyPackageScript();
  verifyResolverRuntimeBoundary();
  verifyResolverSourceBoundary();
  verifyPublicPathSegmentBoundary();
  verifyMiddlewareBoundary();
  verifySubdomainClaimBoundary();
  verifyDocsBoundary();

  console.log('URL routing boundary verifier passed');
}

verifyUrlRoutingBoundary();
