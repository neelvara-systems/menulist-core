require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
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

function verifyEnvironmentTargets() {
  const {
    DEPLOYMENT_TARGETS,
    getExpectedFirebaseProjectId,
    getProductDeploymentTarget,
  } = require('../../src/constants/deploymentTargets');
  const {
    CANONICA_LOCAL_DEV_PATH_PREFIX,
    CANONICA_PRODUCTION_DOMAINS,
    CANONICA_STAGING_DOMAINS,
  } = require('../../src/constants/canonica/domains');
  const productDomains = read('src/constants/productDomains.ts');
  const urls = read('src/constants/urls.ts');
  const envValidation = read('src/lib/env/validateEnv.ts');
  const middleware = read('src/middleware.ts');
  const deploymentTargets = read('src/constants/deploymentTargets.ts');
  const publicApiAuth = read('src/lib/publicApi/auth.ts');
  const widgetConfigRoute = read('src/app/api/widget/config/route.ts');
  const widgetSearchRoute = read('src/app/api/widget/search/route.ts');
  const widgetFeedbackRoute = read('src/app/api/widget/feedback/route.ts');
  const predictiveHelpRoute = read('src/app/api/canonica/predictive-help/route.ts');
  const publicMenuRoute = read('src/app/api/public/v1/menu/route.ts');
  const publicBusinessRoute = read('src/app/api/public/v1/business/route.ts');
  const searchCore = read('src/lib/search/searchCore.ts');
  const sessionScope = read('src/lib/canonica/sessionScope.ts');
  const activeSession = read('src/lib/auth/getActiveSession.ts');
  const helpCenterSearchRoute = read('src/app/api/helpCenter/search-kb/route.ts');
  const documentComposer = read('src/lib/canonica/documentComposer.ts');
  const canonicaDashboardLayout = read('src/components/canonica/CanonicaDashboardLayout.tsx');
  const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
  const firebaserc = JSON.parse(read('.firebaserc'));
  const canonicaFunctionsPackage = JSON.parse(read('functions-canonica/package.json'));

  assert(DEPLOYMENT_TARGETS.local.menulist.url === 'http://localhost:3000/', 'Local MenuList URL must be localhost root');
  assert(DEPLOYMENT_TARGETS.local.canonica.url === 'http://localhost:3000/__canonica/', 'Local Canonica URL must be /__canonica');
  assert(getProductDeploymentTarget('canonica', 'local').devPathPrefix === '/__canonica', 'Local Canonica dev prefix must be /__canonica');
  assert(getExpectedFirebaseProjectId('menulist', 'local') === 'ecomsai', 'Local MenuList Firebase project must be ecomsai');
  assert(getExpectedFirebaseProjectId('canonica', 'local') === 'canonica-qa', 'Local Canonica Firebase project must be canonica-qa');

  assert(DEPLOYMENT_TARGETS.preview.menulist.domains.includes('menulist.online'), 'Preview MenuList domain must include menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.canonica.domains.includes('ecomsai.com'), 'Preview Canonica domain must include ecomsai.com');
  assert(getExpectedFirebaseProjectId('menulist', 'preview') === 'ecomsai', 'Preview MenuList Firebase project must be ecomsai');
  assert(getExpectedFirebaseProjectId('canonica', 'preview') === 'canonica-qa', 'Preview Canonica Firebase project must be canonica-qa');

  assert(DEPLOYMENT_TARGETS.production.menulist.domains.includes('menulist.ai'), 'Production MenuList domain must include menulist.ai');
  assert(DEPLOYMENT_TARGETS.production.canonica.domains.includes('canonica.app'), 'Production Canonica domain must include canonica.app');
  assert(getExpectedFirebaseProjectId('menulist', 'production') === 'menulist', 'Production MenuList Firebase project must be menulist');
  assert(getExpectedFirebaseProjectId('canonica', 'production') === 'canonica', 'Production Canonica Firebase project must be canonica');

  assert(CANONICA_LOCAL_DEV_PATH_PREFIX === '/__canonica', 'Canonica local dev prefix constant');
  assert(CANONICA_STAGING_DOMAINS.includes('ecomsai.com'), 'Canonica staging domain constant');
  assert(CANONICA_PRODUCTION_DOMAINS.includes('canonica.app'), 'Canonica production domain constant');
  assertIncludes(productDomains, "getActiveProductDomains('canonica')", 'Product domain registry');
  assertIncludes(productDomains, "getActiveProductDomains('menulist')", 'Product domain registry');
  assertIncludes(urls, 'QA: menulist.online', 'Platform URL domain contract');
  assertIncludes(urls, 'QA: ecomsai.com', 'Platform URL domain contract');
  assertIncludes(envValidation, 'getExpectedFirebaseProjectId', 'Environment validation');
  assertIncludes(deploymentTargets, 'resolveKnownProductIdByHostname', 'Deployment target helper');
  assertIncludes(middleware, 'resolveKnownProductIdByHostname', 'Inactive product-domain redirect guard');
  assertIncludes(middleware, 'NextResponse.redirect(url, 308)', 'Inactive product-domain redirect guard');
  assertIncludes(publicApiAuth, 'shouldUseCanonicaDb', 'Canonica public API auth boundary');
  assertIncludes(publicApiAuth, 'canonicaFirestoreAdmin', 'Canonica public API auth boundary');
  assertIncludes(publicApiAuth, 'Canonica API key validation failed closed', 'Canonica public API auth boundary');
  assertIncludes(widgetConfigRoute, 'includePublicApi: false', 'Canonica widget config auth boundary');
  assertIncludes(widgetSearchRoute, 'includePublicApi: false', 'Canonica widget search auth boundary');
  assertIncludes(widgetFeedbackRoute, 'includePublicApi: false', 'Canonica widget feedback auth boundary');
  assertIncludes(predictiveHelpRoute, 'includePublicApi: false', 'Canonica predictive help auth boundary');
  assertIncludes(publicMenuRoute, "startsWith('ml_')", 'MenuList public menu auth boundary');
  assertIncludes(publicBusinessRoute, "startsWith('ml_')", 'MenuList public business auth boundary');
  assertNotIncludes(searchCore, '/v0/b/ecomsai.appspot.com/o', 'Canonica search storage boundary');
  assertIncludes(searchCore, 'NEXT_PUBLIC_CANONICA_FIREBASE_STORAGE_BUCKET', 'Canonica search storage boundary');
  assertIncludes(sessionScope, 'isCanonicaSupportClientRoute', 'MenuList Canonica client support route boundary');
  assertIncludes(activeSession, 'shouldUseCanonicaClientScopeForRoute', 'MenuList Canonica client session boundary');
  assertIncludes(helpCenterSearchRoute, 'isCanonicaSupportClientRoute', 'MenuList Help Center Canonica search boundary');
  assertIncludes(documentComposer, 'sessionSourceContext?.tId', 'Canonica source context preservation boundary');
  assertIncludes(canonicaDashboardLayout, 'ensureFirebaseAuthForSession', 'Canonica dashboard Firebase Auth sync boundary');
  assertIncludes(setClaimsRoute, 'hasDefaultPlatformAccess', 'Canonica platform auth sync boundary');
  assert(firebaserc.projects['menulist-qa'] === 'ecomsai', '.firebaserc MenuList QA alias');
  assert(firebaserc.projects['menulist-prod'] === 'menulist', '.firebaserc MenuList production alias');
  assert(firebaserc.projects['canonica-qa'] === 'canonica-qa', '.firebaserc Canonica QA alias');
  assert(firebaserc.projects['canonica-prod'] === 'canonica', '.firebaserc Canonica production alias');
  assertIncludes(canonicaFunctionsPackage.scripts['deploy:qa'], '--project canonica-qa', 'Canonica Functions QA deploy script');
  assertIncludes(canonicaFunctionsPackage.scripts['deploy:prod'], '--project canonica', 'Canonica Functions production deploy script');
}

function platformPagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/(website)/page.tsx';
  return `src/app/(website)${pagePath}/page.tsx`;
}

function canonicaPagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/sites/canonica/page.tsx';
  return `src/app/sites/canonica${pagePath}/page.tsx`;
}

function verifyMenuListDiscovery() {
  const {
    PLATFORM_DISCOVERY_PAGES,
    getPlatformDiscoveryBaseUrl,
  } = require('../../src/lib/seo/discoveryPolicy');
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  const llms = read('public/llms.txt');
  const schemaMarkup = read('src/components/website/SchemaMarkup.tsx');
  const pageStructuredData = read('src/components/website/WebsitePageStructuredData.tsx');
  const rootLayout = read('src/app/layout.tsx');
  const websiteLayout = read('src/app/(website)/layout.tsx');
  const homepage = read('src/app/(website)/page.tsx');
  const nextConfig = read('next.config.js');
  const middleware = read('src/middleware.ts');
  if (exists('.env')) {
    assertIncludes(read('.env'), 'NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai', 'Local platform domain config');
  }
  if (exists('.env.prod')) {
    assertIncludes(read('.env.prod'), 'NEXT_PUBLIC_PLATFORM_DOMAIN=menulist.ai', 'Production platform domain config');
  }
  assert(getPlatformDiscoveryBaseUrl() === 'https://menulist.ai', 'MenuList discovery base URL must default to https://menulist.ai');
  assertNotIncludes(homepage, "'use client'", 'MenuList homepage');
  assertNotIncludes(schemaMarkup, 'next/script', 'MenuList schema markup');
  assertNotIncludes(schemaMarkup, '/logo.png', 'MenuList schema markup');
  assertNotIncludes(schemaMarkup, 'NEXT_PUBLIC_APP_URL', 'MenuList schema markup');
  assertNotIncludes(pageStructuredData, 'NEXT_PUBLIC_APP_URL', 'MenuList page structured data');
  assertNotIncludes(rootLayout, 'NEXT_PUBLIC_APP_URL', 'MenuList root layout metadata');
  assertNotIncludes(websiteLayout, 'NEXT_PUBLIC_APP_URL', 'MenuList website layout metadata');
  assertIncludes(schemaMarkup, 'JsonLdScript', 'MenuList schema markup');
  assertNotIncludes(nextConfig, "source: '/product', destination: '/how-it-works', permanent: true", 'MenuList global redirects');
  assertIncludes(middleware, "pathname === '/product'", 'MenuList legacy product redirect');
  assertIncludes(middleware, "url.pathname = '/how-it-works'", 'MenuList legacy product redirect');
  assertIncludes(middleware, "domainInfo.type === 'platform' || domainInfo.type === 'localhost'", 'MenuList legacy product redirect host guard');

  assertIncludes(robots, 'https://menulist.ai/llms.txt', 'MenuList robots');
  assertIncludes(robots, 'https://menulist.ai/llms-full.txt', 'MenuList robots');
  assertIncludes(robots, 'Sitemap: https://menulist.ai/sitemap.xml', 'MenuList robots');
  assertNotIncludes(robots, 'www.menulist.ai', 'MenuList robots');

  assertNotIncludes(sitemap, 'www.menulist.ai', 'MenuList sitemap');
  assertNotIncludes(sitemap, 'https://menulist.ai/product', 'MenuList sitemap');
  assertNotIncludes(llms, 'https://menulist.ai/product', 'MenuList llms.txt');

  for (const page of PLATFORM_DISCOVERY_PAGES) {
    const routeFile = platformPagePathToFile(page.path);
    assert(exists(routeFile), `MenuList route file missing for ${page.path}: ${routeFile}`);
    assertIncludes(sitemap, `https://menulist.ai${page.path === '/' ? '/' : page.path}`, `MenuList sitemap ${page.path}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<SchemaMarkup />', 'MenuList homepage structured data');
    } else {
      assertIncludes(content, 'WebsitePageStructuredData', `MenuList page structured data ${page.path}`);
      assertIncludes(content, `path="${page.path}"`, `MenuList structured data path ${page.path}`);
    }
  }
}

function verifyCanonicaDiscovery() {
  const { CANONICA_PUBLIC_PAGES } = require('../../src/app/sites/canonica/siteConfig');
  const robotsRoute = read('src/app/sites/canonica/robots.txt/route.ts');
  const homepageStructuredData = read('src/app/sites/canonica/components/StructuredData.tsx');
  const pageStructuredData = read('src/app/sites/canonica/components/PageStructuredData.tsx');
  const productFeatureRoute = read('src/app/sites/canonica/product/ProductFeatureRoutePage.tsx');

  assertIncludes(robotsRoute, 'DISCOVERY_CRAWLERS', 'Canonica robots');
  assertIncludes(robotsRoute, '/llms.txt', 'Canonica robots');
  assertIncludes(robotsRoute, '/llms-full.txt', 'Canonica robots');
  assertIncludes(homepageStructuredData, 'JsonLdScript', 'Canonica homepage structured data');
  assertIncludes(homepageStructuredData, 'hasPart', 'Canonica homepage route graph');
  assertIncludes(homepageStructuredData, 'buildCanonicaPageId', 'Canonica homepage structured data ID helper');
  assertIncludes(pageStructuredData, 'BreadcrumbList', 'Canonica page structured data');
  assertIncludes(pageStructuredData, 'buildPageId', 'Canonica page structured data ID helper');
  assertIncludes(productFeatureRoute, 'CanonicaPageStructuredData', 'Canonica product feature route wrapper');

  for (const page of CANONICA_PUBLIC_PAGES) {
    const routeFile = canonicaPagePathToFile(page.path);
    assert(exists(routeFile), `Canonica route file missing for ${page.path}: ${routeFile}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<CanonicaStructuredData />', 'Canonica homepage structured data');
      continue;
    }

    if (content.includes('ProductCapabilityLandingPage') || content.includes('SeoLandingPage') || content.includes('UseCaseLandingPage')) {
      assertIncludes(content, `canonicalPath="${page.path}"`, `Canonica structured data path ${page.path}`);
      continue;
    }

    if (page.path.startsWith('/product/') && content.includes('ProductFeatureRoutePage')) {
      continue;
    }

    assertIncludes(content, 'CanonicaPageStructuredData', `Canonica page structured data ${page.path}`);
    assertIncludes(content, `path="${page.path}"`, `Canonica structured data path ${page.path}`);
  }
}

function verifyCanonicaInstallContract() {
  const contract = require('../../src/lib/canonica/installContract/contract');
  const constants = require('../../src/lib/canonica/installContract/constants');
  const { CanonicaContextSchema } = require('../../src/lib/validation/contextSchema');
  const publicWidget = read('public/widget/canonica-widget.js');
  const widgetV1Route = read('src/app/widget/v1/canonica-widget.js/route.ts');
  const widgetManagement = read('src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx');
  const installCenter = read('src/components/templates/canonica/install/CanonicaInstallCenter.tsx');
  const routePermissions = read('src/constants/canonica/permissions.ts');
  const canonicaRoutes = read('src/constants/canonica/routes.ts');
  const canonicaDomains = read('src/constants/canonica/domains.ts');
  const canonicaNavigations = read('src/constants/canonica/navigations.ts');

  assert(constants.CANONICA_WIDGET_SCRIPT_URL === 'https://canonica.app/widget/v1/canonica-widget.js', 'Canonica v1 widget URL must stay stable');
  assert(constants.CANONICA_WIDGET_SCRIPT_CACHE_CONTROL === 'public, max-age=300, stale-while-revalidate=86400', 'Canonica v1 widget cache policy must stay bounded and non-immutable');
  assert(contract.CANONICA_AGENT_FILE_TARGETS.includes('.cursor/rules/canonica/RULE.md'), 'Canonica agent file targets must include Cursor RULE.md');
  assert(contract.CANONICA_AGENT_FILE_TARGETS.includes('.cursor/rules/canonica.mdc'), 'Canonica agent file targets must include Cursor .mdc fallback');
  assert(contract.CANONICA_PUBLIC_DOC_ROUTES.includes('/install/contracts.md'), 'Canonica public docs routes must include contracts Markdown');
  assertIncludes(widgetV1Route, 'CANONICA_WIDGET_SCRIPT_CACHE_CONTROL', 'Canonica v1 widget route cache policy');
  assertIncludes(widgetV1Route, 'X-Canonica-Widget-Contract', 'Canonica v1 widget route contract header');
  assertIncludes(publicWidget, 'Canonica Help Widget — Public Contract v1', 'Canonica public widget script');
  assertIncludes(publicWidget, 'data-canonica-key', 'Canonica public widget key attribute');
  assertIncludes(publicWidget, 'setContext', 'Canonica public widget global API');
  assertIncludes(publicWidget, 'page:', 'Canonica public widget page API');
  assertIncludes(publicWidget, 'sensitiveContextPattern', 'Canonica public widget context PII guard');

  assert(exists('src/app/sites/canonica/install/page.tsx'), 'Canonica public install page must exist');
  [
    'install.md',
    'install/ai-agent.md',
    'install/manual.md',
    'install/frameworks/nextjs.md',
    'install/frameworks/react.md',
    'install/frameworks/vue.md',
    'install/frameworks/plain-html.md',
    'install/frameworks/shopify.md',
    'install/frameworks/webflow.md',
    'install/verify.md',
    'install/security.md',
    'install/contracts.md',
    'install/changelog.md',
  ].forEach((routePath) => {
    assert(exists(`src/app/sites/canonica/${routePath}/route.ts`), `Canonica Markdown route missing: ${routePath}`);
  });

  const llms = contract.renderCanonicaLlmsTxt();
  assertIncludes(llms, '/install/ai-agent.md', 'Canonica llms.txt');
  assertIncludes(llms, '/install/verify.md', 'Canonica llms.txt');
  assertIncludes(llms, '/install/security.md', 'Canonica llms.txt');
  assertIncludes(llms, '/install/contracts.md', 'Canonica llms.txt');

  const secretKey = 'cn_test_raw_secret_value_123456789';
  const kitFiles = contract.buildCanonicaAgentKitFiles({
    widgetKey: secretKey,
    widgetKeyPrefix: 'cn_test',
    allowedOrigins: ['https://app.example.com'],
    blockedRoutes: ['/login', '/billing'],
  });
  const kitText = JSON.stringify(kitFiles);
  assertNotIncludes(kitText, secretKey, 'Canonica agent kit default contents');
  assert(kitFiles['.cursor/rules/canonica/RULE.md'], 'Canonica agent kit must include Cursor RULE.md');
  assert(kitFiles['.cursor/rules/canonica.mdc'], 'Canonica agent kit must include Cursor .mdc fallback');
  assertIncludes(kitFiles['packet.json'], '"rawWidgetKeyIncluded": false', 'Canonica agent kit packet');
  assertIncludes(kitFiles['canonica-context-contract-v1.md'], 'Legacy compatibility fields', 'Canonica context contract docs');

  const packet = contract.buildCanonicaAgentPacketJson({ widgetKey: secretKey, widgetKeyPrefix: 'cn_test' });
  assert(packet.rawWidgetKeyIncluded === false, 'Canonica dashboard packet must not include raw widget key by default');
  assert(JSON.stringify(packet).indexOf(secretKey) === -1, 'Canonica dashboard packet must mask raw widget key by default');
  assert(packet.legacyContextFieldMap.plan.includes('public plan label'), 'Canonica legacy plan guidance must stay public-label only');
  assert(packet.legacyContextFieldMap.entityHints.includes('public slugs'), 'Canonica legacy entityHints guidance must stay public-label only');

  const parsedContext = CanonicaContextSchema.parse({
    path: '/settings/team',
    title: 'Team settings',
    feature: 'settings',
    workflow: 'invite_teammate',
    role: 'owner',
    locale: 'en',
    contextKey: 'team_settings',
    plan: 'starter',
    entityHints: ['team', 'invites'],
    tenantId: '123',
  });
  assert(parsedContext.path === '/settings/team', 'Canonica context schema must accept canonical path');
  assert(parsedContext.page === 'settings_team', 'Canonica context schema must normalize path to compatibility page');
  assert(parsedContext.userRole === 'owner', 'Canonica context schema must normalize role to compatibility userRole');
  assert(parsedContext.tenantId === undefined, 'Canonica context schema must strip forbidden tenantId');
  assert(!CanonicaContextSchema.safeParse({ title: 'owner@example.com' }).success, 'Canonica context schema must reject PII-like titles');

  assert(exists('src/app/sites/canonica/agents/canonica/cursor/RULE.md/route.ts'), 'Canonica public Cursor RULE.md route must exist');
  assertIncludes(installCenter, 'renderCanonicaCursorRuleMd', 'Canonica Install Center Cursor current rule copy');
  assertIncludes(installCenter, 'renderCanonicaCursorRule', 'Canonica Install Center Cursor legacy fallback copy');
  assertIncludes(canonicaRoutes, 'INSTALL_CENTER', 'Canonica install center route constant');
  assertIncludes(canonicaDomains, "'install-center'", 'Canonica product-host dashboard route roots');
  assertIncludes(routePermissions, 'CANONICA_ROUTES.INSTALL_CENTER', 'Canonica install center route permission');
  assertIncludes(widgetManagement, 'CANONICA_ROUTES.INSTALL_CENTER', 'Canonica widget route must link to install center');
  assert((canonicaNavigations.match(/CANONICA_ROUTES\.INSTALL_CENTER/g) || []).length === 1, 'Canonica sidebar must not duplicate the Install Center route');
  assertNotIncludes(canonicaNavigations, 'widget-install-center', 'Canonica widget sidebar must not duplicate Install Center');
}

function main() {
  verifyEnvironmentTargets();
  if (process.argv.includes('--env-targets-only')) {
    console.log('Environment target matrix verified');
    return;
  }
  verifyMenuListDiscovery();
  verifyCanonicaDiscovery();
  verifyCanonicaInstallContract();
  console.log('Agent-readiness discovery surfaces verified');
}

main();
