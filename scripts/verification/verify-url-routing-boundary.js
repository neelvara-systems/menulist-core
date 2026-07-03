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
    fn({ ...domainResolver, ...deploymentTargets });
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
  withRoutingEnv({ NODE_ENV: 'development' }, ({ resolveDomain, shouldBypassDomainRouting }) => {
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

    assert(shouldBypassDomainRouting('/api/domain'), 'API routes must bypass tenant routing');
    assert(shouldBypassDomainRouting('/_next/static/chunks/app.js'), 'Next static assets must bypass tenant routing');
    assert(shouldBypassDomainRouting('/sites/answerlattice'), 'product site internals must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__answerlattice'), 'Answerlattice local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__campaigncue/app'), 'CampaignCue local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/__mycodex'), 'MyCodex local dev prefix must bypass tenant routing');
    assert(shouldBypassDomainRouting('/manifest.json'), 'global manifest must bypass tenant routing');
    assert(!shouldBypassDomainRouting('/robots.txt'), 'tenant robots must not bypass middleware');
    assert(!shouldBypassDomainRouting('/sitemap.xml'), 'tenant sitemap must not bypass middleware');
  });

  withRoutingEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    NEXT_PUBLIC_ENV: 'preview',
    NODE_ENV: 'production',
  }, ({ resolveDomain, resolveKnownProductIdByHostname }) => {
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
  });

  withRoutingEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_ENV: 'production',
    NODE_ENV: 'production',
  }, ({ resolveDomain, resolveKnownProductIdByHostname }) => {
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
  });
}

function verifyResolverSourceBoundary() {
  const resolver = read('src/lib/multiTenant/domainResolver.ts');
  const tenantHeaders = read('src/lib/multiTenant/getTenantFromHeaders.ts');

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
  assertIncludes(resolver, "type: 'custom'", 'domain resolver custom domain fallback');
  assertNotIncludes(resolver, "hostname === 'menulist.ai'", 'domain resolver must not hardcode production MenuList host');
  assertNotIncludes(resolver, "hostname === 'menulist.online'", 'domain resolver must not hardcode preview MenuList host');

  assertOrder(
    tenantHeaders,
    "headersList.get('x-tenant-subdomain')",
    'const requestHost =',
    'tenant header helper reads middleware tenant headers before host fallback',
  );
  assertIncludes(tenantHeaders, "headersList.get('x-forwarded-host')", 'tenant header helper forwarded host fallback');
  assertIncludes(tenantHeaders, "headersList.get('x-vercel-proxied-host')", 'tenant header helper Vercel proxied host fallback');
  assertIncludes(tenantHeaders, "headersList.get('x-vercel-deployment-url')", 'tenant header helper Vercel deployment host fallback');
  assertIncludes(tenantHeaders, 'process.env.VERCEL_URL', 'tenant header helper Vercel env host fallback');
  assertIncludes(tenantHeaders, 'secureError', 'tenant header helper secure logging');
  assertIncludes(tenantHeaders, 'sanitizeTenantLogContext', 'tenant header helper bounded log context');
  assertIncludes(tenantHeaders, 'hasForwardedHost: Boolean(headersList.get', 'tenant header helper header presence diagnostics');
  assertIncludes(tenantHeaders, 'const resolvedDomain = resolveDomain(host);', 'tenant header helper host fallback resolver');
  assertIncludes(tenantHeaders, 'tenantTypeHeader || (resolvedDomain.isClient ? resolvedDomain.type : null)', 'tenant header helper tenant type fallback');
  assertNotIncludes(tenantHeaders, 'console.error', 'tenant header helper must not log raw headers through console');
  assertNotIncludes(tenantHeaders, 'Object.fromEntries(headersList', 'tenant header helper must not serialize raw request headers');
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
    "'menu',            // /menu is the universal menu alias and cannot be an outlet root",
    'export const RESERVED_OUTLET_SLUGS',
  ].forEach((token) => assertIncludes(reservedSlugs, token, 'Reserved outlet slug boundary'));

  [
    'normalizePublicOutletSlug(entry.outletSlug)',
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
    '.filter((entry): entry is OutletSitemapEntry => Boolean(entry))',
    'Outlets without a safe `outletSlug`',
    'projects without a safe `projectSlug`',
  ].forEach((token) => assertIncludes(sitemap, token, 'Sitemap public path-segment boundary'));
  [
    'data.outletSlug.trim()',
    'typeof data?.outletSlug === \'string\' ? data.outletSlug.trim()',
    'typeof p?.slug === \'string\' ? p.slug.trim()',
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
}

function verifyUrlRoutingBoundary() {
  verifyPackageScript();
  verifyResolverRuntimeBoundary();
  verifyResolverSourceBoundary();
  verifyPublicPathSegmentBoundary();
  verifyMiddlewareBoundary();
  verifyDocsBoundary();

  console.log('URL routing boundary verifier passed');
}

verifyUrlRoutingBoundary();
