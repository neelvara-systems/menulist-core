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
    ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX,
    ANSWERLATTICE_PRODUCTION_DOMAINS,
    ANSWERLATTICE_STAGING_DOMAINS,
  } = require('../../src/constants/answerlattice/domains');
  const productDomains = read('src/constants/productDomains.ts');
  const urls = read('src/constants/urls.ts');
  const envValidation = read('src/lib/env/validateEnv.ts');
  const middleware = read('src/middleware.ts');
  const deploymentTargets = read('src/constants/deploymentTargets.ts');
  const publicApiAuth = read('src/lib/publicApi/auth.ts');
  const widgetConfigRoute = read('src/app/api/widget/config/route.ts');
  const widgetSearchRoute = read('src/app/api/widget/search/route.ts');
  const widgetFeedbackRoute = read('src/app/api/widget/feedback/route.ts');
  const predictiveHelpRoute = read('src/app/api/answerlattice/predictive-help/route.ts');
  const publicMenuRoute = read('src/app/api/public/v1/menu/route.ts');
  const publicBusinessRoute = read('src/app/api/public/v1/business/route.ts');
  const searchCore = read('src/lib/search/searchCore.ts');
  const sessionScope = read('src/lib/answerlattice/sessionScope.ts');
  const activeSession = read('src/lib/auth/getActiveSession.ts');
  const helpCenterSearchRoute = read('src/app/api/helpCenter/search-kb/route.ts');
  const documentComposer = read('src/lib/answerlattice/documentComposer.ts');
  const answerlatticeDashboardLayout = read('src/components/answerlattice/AnswerlatticeDashboardLayout.tsx');
  const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
  const firebaserc = JSON.parse(read('.firebaserc'));
  const answerlatticeFunctionsPackage = JSON.parse(read('functions-answerlattice/package.json'));

  assert(DEPLOYMENT_TARGETS.local.menulist.url === 'http://localhost:3000/', 'Local MenuList URL must be localhost root');
  assert(DEPLOYMENT_TARGETS.local.answerlattice.url === 'http://localhost:3000/__answerlattice/', 'Local Answerlattice URL must be /__answerlattice');
  assert(getProductDeploymentTarget('answerlattice', 'local').devPathPrefix === '/__answerlattice', 'Local Answerlattice dev prefix must be /__answerlattice');
  assert(getExpectedFirebaseProjectId('menulist', 'local') === 'ecomsai', 'Local MenuList Firebase project must be ecomsai');
  assert(getExpectedFirebaseProjectId('answerlattice', 'local') === 'answerlattice-qa', 'Local Answerlattice Firebase project must be answerlattice-qa');

  assert(DEPLOYMENT_TARGETS.preview.menulist.domains.includes('menulist.online'), 'Preview MenuList domain must include menulist.online');
  assert(DEPLOYMENT_TARGETS.preview.answerlattice.domains.includes('ecomsai.com'), 'Preview Answerlattice domain must include ecomsai.com');
  assert(getExpectedFirebaseProjectId('menulist', 'preview') === 'ecomsai', 'Preview MenuList Firebase project must be ecomsai');
  assert(getExpectedFirebaseProjectId('answerlattice', 'preview') === 'answerlattice-qa', 'Preview Answerlattice Firebase project must be answerlattice-qa');

  assert(DEPLOYMENT_TARGETS.production.menulist.domains.includes('menulist.ai'), 'Production MenuList domain must include menulist.ai');
  assert(DEPLOYMENT_TARGETS.production.answerlattice.domains.includes('answerlattice.com'), 'Production Answerlattice domain must include answerlattice.com');
  assert(getExpectedFirebaseProjectId('menulist', 'production') === 'menulist', 'Production MenuList Firebase project must be menulist');
  assert(getExpectedFirebaseProjectId('answerlattice', 'production') === 'answerlattice', 'Production Answerlattice Firebase project must be answerlattice');

  assert(ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX === '/__answerlattice', 'Answerlattice local dev prefix constant');
  assert(ANSWERLATTICE_STAGING_DOMAINS.includes('ecomsai.com'), 'Answerlattice staging domain constant');
  assert(ANSWERLATTICE_PRODUCTION_DOMAINS.includes('answerlattice.com'), 'Answerlattice production domain constant');
  assertIncludes(productDomains, "getActiveProductDomains('answerlattice')", 'Product domain registry');
  assertIncludes(productDomains, "getActiveProductDomains('menulist')", 'Product domain registry');
  assertIncludes(urls, 'QA: menulist.online', 'Platform URL domain contract');
  assertIncludes(urls, 'QA: ecomsai.com', 'Platform URL domain contract');
  assertIncludes(envValidation, 'getExpectedFirebaseProjectId', 'Environment validation');
  assertIncludes(deploymentTargets, 'resolveKnownProductIdByHostname', 'Deployment target helper');
  assertIncludes(middleware, 'resolveKnownProductIdByHostname', 'Inactive product-domain redirect guard');
  assertIncludes(middleware, 'NextResponse.redirect(url, 308)', 'Inactive product-domain redirect guard');
  assertIncludes(publicApiAuth, 'shouldUseAnswerlatticeDb', 'Answerlattice public API auth boundary');
  assertIncludes(publicApiAuth, 'answerlatticeFirestoreAdmin', 'Answerlattice public API auth boundary');
  assertIncludes(publicApiAuth, 'Answerlattice API key validation failed closed', 'Answerlattice public API auth boundary');
  assertIncludes(widgetConfigRoute, 'includePublicApi: false', 'Answerlattice widget config auth boundary');
  assertIncludes(widgetSearchRoute, 'includePublicApi: false', 'Answerlattice widget search auth boundary');
  assertIncludes(widgetFeedbackRoute, 'includePublicApi: false', 'Answerlattice widget feedback auth boundary');
  assertIncludes(predictiveHelpRoute, 'includePublicApi: false', 'Answerlattice predictive help auth boundary');
  assertIncludes(publicMenuRoute, "startsWith('ml_')", 'MenuList public menu auth boundary');
  assertIncludes(publicBusinessRoute, "startsWith('ml_')", 'MenuList public business auth boundary');
  assertNotIncludes(searchCore, '/v0/b/ecomsai.appspot.com/o', 'Answerlattice search storage boundary');
  assertIncludes(searchCore, 'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET', 'Answerlattice search storage boundary');
  assertIncludes(sessionScope, 'isAnswerlatticeSupportClientRoute', 'MenuList Answerlattice client support route boundary');
  assertIncludes(activeSession, 'shouldUseAnswerlatticeClientScopeForRoute', 'MenuList Answerlattice client session boundary');
  assertIncludes(helpCenterSearchRoute, 'isAnswerlatticeSupportClientRoute', 'MenuList Help Center Answerlattice search boundary');
  assertIncludes(documentComposer, 'sessionSourceContext?.tId', 'Answerlattice source context preservation boundary');
  assertIncludes(answerlatticeDashboardLayout, 'ensureFirebaseAuthForSession', 'Answerlattice dashboard Firebase Auth sync boundary');
  assertIncludes(setClaimsRoute, 'hasDefaultPlatformAccess', 'Answerlattice platform auth sync boundary');
  assert(firebaserc.projects['menulist-qa'] === 'ecomsai', '.firebaserc MenuList QA alias');
  assert(firebaserc.projects['menulist-prod'] === 'menulist', '.firebaserc MenuList production alias');
  assert(firebaserc.projects['answerlattice-qa'] === 'answerlattice-qa', '.firebaserc Answerlattice QA alias');
  assert(firebaserc.projects['answerlattice-prod'] === 'answerlattice', '.firebaserc Answerlattice production alias');
  assertIncludes(answerlatticeFunctionsPackage.scripts['deploy:qa'], '--project answerlattice-qa', 'Answerlattice Functions QA deploy script');
  assertIncludes(answerlatticeFunctionsPackage.scripts['deploy:prod'], '--project answerlattice', 'Answerlattice Functions production deploy script');
}

function platformPagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/(website)/page.tsx';
  if (/^\/[^/]+\/resources\/[^/]+$/.test(pagePath)) {
    return 'src/app/(website)/[locale]/resources/[slug]/page.tsx';
  }
  if (/^\/[^/]+\/resources$/.test(pagePath)) {
    return 'src/app/(website)/[locale]/resources/page.tsx';
  }
  if (pagePath.startsWith('/resources/') && pagePath !== '/resources') {
    return 'src/app/(website)/resources/[slug]/page.tsx';
  }
  return `src/app/(website)${pagePath}/page.tsx`;
}

function answerlatticePagePathToFile(pagePath) {
  if (pagePath === '/') return 'src/app/sites/answerlattice/page.tsx';
  return `src/app/sites/answerlattice${pagePath}/page.tsx`;
}

function verifyMenuListDiscovery() {
  const {
    DISCOVERY_CRAWLERS,
    PLATFORM_DISCOVERY_PAGES,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
    getPlatformDiscoveryBaseUrl,
  } = require('../../src/lib/seo/discoveryPolicy');
  const {
    WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES,
  } = require('../../src/content/websiteResources');
  const {
    WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES,
  } = require('../../src/content/websiteResources/locales');
  const sitemap = read('public/sitemap.xml');
  const robots = read('public/robots.txt');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const schemaMarkup = read('src/components/website/SchemaMarkup.tsx');
  const pageStructuredData = read('src/components/website/WebsitePageStructuredData.tsx');
  const languageSwitcher = read('src/components/website/shared/WebsiteLanguageSwitcher.tsx');
  const localizedResourceLayout = read('src/app/(website)/[locale]/layout.tsx');
  const resourceShell = read('src/components/website/resources/ResourcePageShell.tsx');
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
  for (const crawler of DISCOVERY_CRAWLERS) {
    assertIncludes(robots, `User-agent: ${crawler}`, `MenuList robots crawler ${crawler}`);
  }
  for (const disallowedPath of PUBLIC_DISCOVERY_DISALLOWED_PATHS) {
    assertIncludes(robots, `Disallow: ${disallowedPath}`, `MenuList robots disallow ${disallowedPath}`);
  }

  assertNotIncludes(sitemap, 'www.menulist.ai', 'MenuList sitemap');
  assertNotIncludes(sitemap, 'https://menulist.ai/product', 'MenuList sitemap');
  for (const plannedLocale of WEBSITE_RESOURCE_PLANNED_INDIAN_LOCALES) {
    assertNotIncludes(
      sitemap,
      `https://menulist.ai/${plannedLocale}/resources`,
      `MenuList sitemap planned ${plannedLocale} resources`,
    );
  }
  for (const reviewedLocale of WEBSITE_RESOURCE_REVIEWED_ROUTE_LOCALES) {
    assertIncludes(sitemap, `hreflang="${reviewedLocale}"`, `MenuList sitemap ${reviewedLocale} hreflang`);
    assertIncludes(localizedResourceLayout, `'${reviewedLocale}'`, `MenuList localized resource layout messages ${reviewedLocale}`);
  }
  assertIncludes(localizedResourceLayout, 'dir={language?.direction', 'MenuList localized resource layout direction support');
  assertIncludes(languageSwitcher, 'usePathname', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'buildWebsiteResourcePath', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'isReviewedWebsiteResourceLocale', 'MenuList website language switcher localized resource routing');
  assertIncludes(languageSwitcher, 'router.push(localizedResourcePath)', 'MenuList website language switcher localized resource routing');
  assertNotIncludes(llms, 'https://menulist.ai/product', 'MenuList llms.txt');

  for (const page of PLATFORM_DISCOVERY_PAGES) {
    const routeFile = platformPagePathToFile(page.path);
    assert(exists(routeFile), `MenuList route file missing for ${page.path}: ${routeFile}`);
    assertIncludes(sitemap, `https://menulist.ai${page.path === '/' ? '/' : page.path}`, `MenuList sitemap ${page.path}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<SchemaMarkup />', 'MenuList homepage structured data');
    } else if (page.path === '/resources') {
      assertIncludes(content, 'ResourceHubPageShell', 'MenuList resources hub route shell');
      assertIncludes(resourceShell, 'ResourceStructuredData', 'MenuList resources hub structured data');
      assertIncludes(resourceShell, 'type="hub"', 'MenuList resources hub structured data');
      assertIncludes(llms, 'https://menulist.ai/resources', 'MenuList llms.txt resources hub');
    } else if (page.path.startsWith('/resources/')) {
      const slug = page.path.replace('/resources/', '');
      const resourceContent = read('src/content/websiteResources/en-US.ts');
      assertIncludes(content, 'generateStaticParams', `MenuList resource dynamic params ${page.path}`);
      assertIncludes(content, 'ResourceArticlePageShell', `MenuList resource route shell ${page.path}`);
      assertIncludes(resourceShell, 'ResourceStructuredData', `MenuList resource structured data ${page.path}`);
      assertIncludes(resourceShell, 'type="article"', `MenuList resource article structured data ${page.path}`);
      assertIncludes(resourceContent, `slug: '${slug}'`, `MenuList resource content ${page.path}`);
      assertIncludes(llms, `https://menulist.ai${page.path}`, `MenuList llms.txt ${page.path}`);
    } else if (/^\/[^/]+\/resources(?:\/[^/]+)?$/.test(page.path)) {
      const {
        getWebsiteResourceArticle,
        getWebsiteResourcesCopy,
        isReviewedWebsiteResourceLocale,
      } = require('../../src/content/websiteResources');
      const [, locale, slug] = page.path.match(/^\/([^/]+)\/resources(?:\/([^/]+))?$/);
      assert(isReviewedWebsiteResourceLocale(locale), `MenuList localized resource locale must be reviewed: ${locale}`);
      assert(getWebsiteResourcesCopy(locale).localeStatus === 'reviewed', `MenuList localized resource copy must be reviewed: ${locale}`);
      assertIncludes(content, 'generateStaticParams', `MenuList localized resource dynamic params ${page.path}`);
      assertIncludes(content, slug ? 'ResourceArticlePageShell' : 'ResourceHubPageShell', `MenuList localized resource shell ${page.path}`);
      assertIncludes(content, 'buildResource', `MenuList localized resource metadata ${page.path}`);
      assertIncludes(sitemap, `https://menulist.ai${page.path}`, `MenuList sitemap ${page.path}`);
      assertIncludes(sitemap, `hreflang="${locale}" href="https://menulist.ai${page.path}"`, `MenuList sitemap hreflang ${page.path}`);
      assertIncludes(llmsFull, `https://menulist.ai${page.path}`, `MenuList llms-full.txt ${page.path}`);
      if (!slug) {
        assertIncludes(llms, `https://menulist.ai${page.path}`, `MenuList llms.txt ${page.path}`);
      } else {
        assert(getWebsiteResourceArticle(slug, locale), `MenuList localized resource content ${page.path}`);
      }
    } else {
      assertIncludes(content, 'WebsitePageStructuredData', `MenuList page structured data ${page.path}`);
      assertIncludes(content, `path="${page.path}"`, `MenuList structured data path ${page.path}`);
    }
  }
}

function verifyAnswerlatticeDiscovery() {
  const { ANSWERLATTICE_PUBLIC_PAGES } = require('../../src/app/sites/answerlattice/siteConfig');
  const answerlatticeInstallContract = require('../../src/lib/answerlattice/installContract/contract');
  const {
    ANSWERLATTICE_PUBLIC_BRAND,
    ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS,
    ANSWERLATTICE_PUBLIC_DOMAIN_DECISION,
    ANSWERLATTICE_RESOURCE_ARTICLES,
  } = require('../../src/app/sites/answerlattice/publicContent');
  const robotsRoute = read('src/app/sites/answerlattice/robots.txt/route.ts');
  const homepageStructuredData = read('src/app/sites/answerlattice/components/StructuredData.tsx');
  const pageStructuredData = read('src/app/sites/answerlattice/components/PageStructuredData.tsx');
  const resourceStructuredData = read('src/app/sites/answerlattice/resources/ResourceStructuredData.tsx');
  const resourceArticlePage = read('src/app/sites/answerlattice/resources/ResourceArticlePage.tsx');
  const resourceAnalytics = read('src/app/sites/answerlattice/components/AnswerlatticeResourceAnalytics.tsx');
  const productFeatureRoute = read('src/app/sites/answerlattice/product/ProductFeatureRoutePage.tsx');
  const siteConfig = read('src/app/sites/answerlattice/siteConfig.ts');
  const layout = read('src/app/sites/answerlattice/layout.tsx');
  const middleware = read('src/middleware.ts');
  const productDomains = read('src/constants/productDomains.ts');
  const llmsContract = read('src/lib/answerlattice/installContract/contract.ts');
  const renderedLlms = answerlatticeInstallContract.renderAnswerlatticeLlmsTxt();
  const renderedLlmsFull = answerlatticeInstallContract.renderAnswerlatticeLlmsFullTxt();

  assert(ANSWERLATTICE_PUBLIC_BRAND === 'AnswerLattice', 'AnswerLattice public brand casing must stay locked');
  assert(ANSWERLATTICE_PUBLIC_DOMAIN_DECISION.canonicalHost === 'answerlattice.com', 'AnswerLattice production canonical host must remain answerlattice.com');
  assert(ANSWERLATTICE_PUBLIC_DOMAIN_DECISION.previewHost === 'ecomsai.com', 'AnswerLattice preview host must remain ecomsai.com');
  assertIncludes(siteConfig, 'ANSWERLATTICE_COMPARISONS', 'AnswerLattice site registry comparisons');
  assertIncludes(siteConfig, 'ANSWERLATTICE_DEVELOPER_DOCS', 'AnswerLattice site registry developer docs');
  assertIncludes(siteConfig, 'ANSWERLATTICE_RESOURCE_ARTICLES', 'AnswerLattice site registry resource articles');
  assertIncludes(layout, "applicationName: 'AnswerLattice'", 'AnswerLattice layout metadata brand casing');
  assertIncludes(productDomains, "name: 'AnswerLattice'", 'AnswerLattice product domain display name');
  assertIncludes(middleware, 'buildAnswerlatticeWebsiteRewritePath', 'AnswerLattice homepage internal rewrite helper');
  assertIncludes(middleware, "`${basePath}/home`", 'AnswerLattice homepage internal rewrite target');
  assertIncludes(middleware, 'isLegacyAnswerlatticePublicHostname', 'AnswerLattice legacy public host redirect');
  assertIncludes(middleware, "'canonica.app'", 'AnswerLattice legacy public host redirect');
  assertIncludes(middleware, "getProductDeploymentTarget('answerlattice', 'production')", 'AnswerLattice legacy public host canonical target');
  assertIncludes(llmsContract, '/developers', 'AnswerLattice llms.txt developer hub');
  assertIncludes(llmsContract, '/comparisons', 'AnswerLattice llms.txt comparisons hub');
  assertIncludes(renderedLlms, '/resources', 'AnswerLattice llms.txt resources hub');
  assertIncludes(renderedLlmsFull, '/resources/launch-support-checklist', 'AnswerLattice llms-full.txt resource articles');
  assertIncludes(renderedLlmsFull, '/resources/support-runtime-safety', 'AnswerLattice llms-full.txt resource articles');

  assertIncludes(robotsRoute, 'DISCOVERY_CRAWLERS', 'Answerlattice robots');
  assertIncludes(robotsRoute, '/llms.txt', 'Answerlattice robots');
  assertIncludes(robotsRoute, '/llms-full.txt', 'Answerlattice robots');
  assertIncludes(homepageStructuredData, 'JsonLdScript', 'Answerlattice homepage structured data');
  assertIncludes(homepageStructuredData, 'hasPart', 'Answerlattice homepage route graph');
  assertIncludes(homepageStructuredData, 'buildAnswerlatticePageId', 'Answerlattice homepage structured data ID helper');
  assertIncludes(pageStructuredData, 'BreadcrumbList', 'Answerlattice page structured data');
  assertIncludes(pageStructuredData, 'buildPageId', 'Answerlattice page structured data ID helper');
  assertIncludes(resourceStructuredData, "'Article'", 'AnswerLattice resource article schema');
  assertIncludes(resourceStructuredData, "'FAQPage'", 'AnswerLattice resource FAQ schema');
  assertIncludes(resourceStructuredData, 'ANSWERLATTICE_RESOURCE_ARTICLES', 'AnswerLattice resource hub item list');
  assertIncludes(resourceArticlePage, 'AnswerlatticeResourceStructuredData', 'AnswerLattice resource article renderer structured data');
  assertIncludes(resourceArticlePage, 'AnswerlatticeResourceAnalytics', 'AnswerLattice resource article analytics');
  assertIncludes(resourceAnalytics, 'answerlattice_resource_page_view', 'AnswerLattice resource analytics page view');
  assertIncludes(resourceAnalytics, 'chat.openai.com', 'AnswerLattice resource analytics AI referrer coverage');
  assertIncludes(productFeatureRoute, 'AnswerlatticePageStructuredData', 'Answerlattice product feature route wrapper');

  for (const article of ANSWERLATTICE_RESOURCE_ARTICLES) {
    assert(article.path.startsWith('/resources/'), `AnswerLattice resource article path must stay under /resources: ${article.path}`);
    assert(article.title.includes('Answerlattice') === false, `AnswerLattice resource article title must use public brand casing: ${article.path}`);
  }

  for (const page of ANSWERLATTICE_PUBLIC_PAGES) {
    for (const privatePrefix of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.privateRoutePrefixes) {
      assert(
        !page.path.startsWith(privatePrefix),
        `AnswerLattice public registry must not include private/runtime route ${page.path}`,
      );
    }

    const routeFile = answerlatticePagePathToFile(page.path);
    assert(exists(routeFile), `Answerlattice route file missing for ${page.path}: ${routeFile}`);

    const content = read(routeFile);
    if (page.path === '/') {
      assertIncludes(content, '<AnswerlatticeStructuredData />', 'Answerlattice homepage structured data');
      continue;
    }

    if (page.path === '/resources') {
      assertIncludes(content, 'AnswerlatticeResourceStructuredData', 'AnswerLattice resources hub structured data');
      assertIncludes(content, 'type="hub"', 'AnswerLattice resources hub structured data');
      assertIncludes(content, 'AnswerlatticeResourceAnalytics', 'AnswerLattice resources hub analytics');
      continue;
    }

    if (content.includes('ProductCapabilityLandingPage') || content.includes('SeoLandingPage') || content.includes('UseCaseLandingPage')) {
      assertIncludes(content, `canonicalPath="${page.path}"`, `Answerlattice structured data path ${page.path}`);
      continue;
    }

    if (page.path.startsWith('/product/') && content.includes('ProductFeatureRoutePage')) {
      continue;
    }

    if (content.includes('AnswerlatticeComparisonDetailPage')) {
      assertIncludes(content, `const comparisonPath = '${page.path}'`, `AnswerLattice comparison structured data path ${page.path}`);
      continue;
    }

    if (content.includes('AnswerlatticeDeveloperDocPage')) {
      assertIncludes(content, `const docPath = '${page.path}'`, `AnswerLattice developer structured data path ${page.path}`);
      continue;
    }

    if (content.includes('AnswerlatticeResourceArticlePage')) {
      assertIncludes(content, `const articlePath = '${page.path}'`, `AnswerLattice resource structured data path ${page.path}`);
      continue;
    }

    assertIncludes(content, 'AnswerlatticePageStructuredData', `Answerlattice page structured data ${page.path}`);
    assertIncludes(content, `path="${page.path}"`, `Answerlattice structured data path ${page.path}`);
  }

  const publicClaimFiles = [
    ...fs.readdirSync(path.join(ROOT, 'src/app/sites/answerlattice'), { recursive: true })
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => file !== 'publicContent.ts')
      .map((file) => `src/app/sites/answerlattice/${file}`),
    ...fs.readdirSync(path.join(ROOT, 'src/content/answerlatticePublic'), { recursive: true })
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => file !== 'guardrails.ts')
      .map((file) => `src/content/answerlatticePublic/${file}`),
    'src/lib/answerlattice/installContract/contract.ts',
    'public/answerlattice.webmanifest',
    'public/widget/answerlattice-widget.js',
    'src/app/widget/v1/answerlattice-widget.js/route.ts',
  ].filter((file) => exists(file));
  const publicClaimCopy = publicClaimFiles.map((file) => read(file)).join('\n');

  assert(!/\bCanonica\b/.test(publicClaimCopy), 'AnswerLattice public copy must not use Canonica as the standalone public brand');
  assert(!/\bAnswerlattice\b/.test(publicClaimCopy), 'AnswerLattice public copy must use AnswerLattice as the standalone public brand');
  for (const phrase of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.forbiddenPhrases.filter((phrase) => phrase !== 'Canonica')) {
    assertNotIncludes(publicClaimCopy.toLowerCase(), phrase.toLowerCase(), `AnswerLattice public forbidden claim ${phrase}`);
  }
  for (const schemaType of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.forbiddenSchemaTypes) {
    assert(!new RegExp(`['"]@type['"]\\s*:\\s*['"]${schemaType}['"]`).test(publicClaimCopy), `AnswerLattice public schema must not include ${schemaType}`);
  }
}

function verifyAnswerlatticeInstallContract() {
  const contract = require('../../src/lib/answerlattice/installContract/contract');
  const constants = require('../../src/lib/answerlattice/installContract/constants');
  const { AnswerlatticeContextSchema } = require('../../src/lib/validation/contextSchema');
  const publicWidget = read('public/widget/answerlattice-widget.js');
  const widgetV1Route = read('src/app/widget/v1/answerlattice-widget.js/route.ts');
  const widgetManagement = read('src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx');
  const installCenter = read('src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx');
  const routePermissions = read('src/constants/answerlattice/permissions.ts');
  const answerlatticeRoutes = read('src/constants/answerlattice/routes.ts');
  const answerlatticeDomains = read('src/constants/answerlattice/domains.ts');
  const answerlatticeNavigations = read('src/constants/answerlattice/navigations.ts');
  const answerlatticeQuickstarts = read('src/app/sites/answerlattice/quickstarts/page.tsx');
  const answerlatticeResources = read('src/app/sites/answerlattice/resources/page.tsx');
  const answerlatticeDayOneLaunchPack = read('src/app/sites/answerlattice/components/DayOneLaunchPackSection.tsx');
  const answerlatticeSiteConfig = read('src/app/sites/answerlattice/siteConfig.ts');

  assert(constants.ANSWERLATTICE_WIDGET_SCRIPT_URL === 'https://answerlattice.com/widget/v1/answerlattice-widget.js', 'Answerlattice v1 widget URL must stay stable');
  assert(constants.ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL === 'public, max-age=300, stale-while-revalidate=86400', 'Answerlattice v1 widget cache policy must stay bounded and non-immutable');
  assert(contract.ANSWERLATTICE_AGENT_FILE_TARGETS.includes('.cursor/rules/answerlattice/RULE.md'), 'Answerlattice agent file targets must include Cursor RULE.md');
  assert(contract.ANSWERLATTICE_AGENT_FILE_TARGETS.includes('.cursor/rules/answerlattice.mdc'), 'Answerlattice agent file targets must include Cursor .mdc fallback');
  assert(contract.ANSWERLATTICE_PUBLIC_DOC_ROUTES.includes('/install/contracts.md'), 'Answerlattice public docs routes must include contracts Markdown');
  assertIncludes(widgetV1Route, 'ANSWERLATTICE_WIDGET_SCRIPT_CACHE_CONTROL', 'Answerlattice v1 widget route cache policy');
  assertIncludes(widgetV1Route, 'X-AnswerLattice-Widget-Contract', 'Answerlattice v1 widget route contract header');
  assertIncludes(publicWidget, 'AnswerLattice Help Widget — Public Contract v1', 'Answerlattice public widget script');
  assertIncludes(publicWidget, 'data-answerlattice-key', 'Answerlattice public widget key attribute');
  assertIncludes(publicWidget, 'setContext', 'Answerlattice public widget global API');
  assertIncludes(publicWidget, 'page:', 'Answerlattice public widget page API');
  assertIncludes(publicWidget, 'sensitiveContextPattern', 'Answerlattice public widget context PII guard');

  assert(exists('src/app/sites/answerlattice/install/page.tsx'), 'Answerlattice public install page must exist');
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
    'install/contracts.md',
  ].forEach((routePath) => {
    assert(exists(`src/app/sites/answerlattice/${routePath}/route.ts`), `Answerlattice Markdown route missing: ${routePath}`);
  });
  [
    'install/verify/page.tsx',
    'install/verify.md/route.ts',
    'install/security/page.tsx',
    'install/security.md/route.ts',
    'install/changelog/page.tsx',
    'install/changelog.md/route.ts',
    'install/contracts/page.tsx',
  ].forEach((routePath) => {
    assert(!exists(`src/app/sites/answerlattice/${routePath}`), `Answerlattice public install route should not exist: ${routePath}`);
  });

  const llms = contract.renderAnswerlatticeLlmsTxt();
  assertIncludes(llms, '/install/ai-agent.md', 'Answerlattice llms.txt');
  assertIncludes(llms, '/install/contracts.md', 'Answerlattice llms.txt');
  assertNotIncludes(llms, '/install/verify.md', 'Answerlattice llms.txt');
  assertNotIncludes(llms, '/install/security.md', 'Answerlattice llms.txt');

  const secretKey = 'al_test_raw_secret_value_123456789';
  const kitFiles = contract.buildAnswerlatticeAgentKitFiles({
    widgetKey: secretKey,
    widgetKeyPrefix: 'al_test',
    allowedOrigins: ['https://app.example.com'],
    blockedRoutes: ['/login', '/billing'],
  });
  const kitText = JSON.stringify(kitFiles);
  assertNotIncludes(kitText, secretKey, 'Answerlattice agent kit default contents');
  assert(kitFiles['.cursor/rules/answerlattice/RULE.md'], 'Answerlattice agent kit must include Cursor RULE.md');
  assert(kitFiles['.cursor/rules/answerlattice.mdc'], 'Answerlattice agent kit must include Cursor .mdc fallback');
  assertIncludes(kitFiles['packet.json'], '"rawWidgetKeyIncluded": false', 'Answerlattice agent kit packet');
  assertIncludes(kitFiles['answerlattice-context-contract-v1.md'], 'Allowed context fields', 'Answerlattice context contract docs');
  assertNotIncludes(kitFiles['answerlattice-context-contract-v1.md'], 'Legacy compatibility', 'Answerlattice context contract docs');

  const packet = contract.buildAnswerlatticeAgentPacketJson({ widgetKey: secretKey, widgetKeyPrefix: 'al_test' });
  assert(packet.rawWidgetKeyIncluded === false, 'Answerlattice dashboard packet must not include raw widget key by default');
  assert(JSON.stringify(packet).indexOf(secretKey) === -1, 'Answerlattice dashboard packet must mask raw widget key by default');
  assert(packet.dashboardOwnsAllowedOrigins === true, 'Answerlattice dashboard packet must mark allowed origins as dashboard-owned');
  assert(packet.dashboardOwnsBlockedRoutes === true, 'Answerlattice dashboard packet must mark blocked routes as dashboard-owned');
  assert(!('legacyContextFieldMap' in packet), 'Answerlattice dashboard packet must not expose legacy context guidance before launch');

  const parsedContext = AnswerlatticeContextSchema.parse({
    path: '/settings/team',
    title: 'Team settings',
    feature: 'settings',
    workflow: 'invite_teammate',
    role: 'owner',
    locale: 'en',
    tenantId: '123',
  });
  assert(parsedContext.path === '/settings/team', 'Answerlattice context schema must accept canonical path');
  assert(parsedContext.tenantId === undefined, 'Answerlattice context schema must strip forbidden tenantId');
  assert(!AnswerlatticeContextSchema.safeParse({ title: 'owner@example.com' }).success, 'Answerlattice context schema must reject PII-like titles');

  assert(exists('src/app/sites/answerlattice/agents/answerlattice/cursor/RULE.md/route.ts'), 'Answerlattice public Cursor RULE.md route must exist');
  assertIncludes(installCenter, 'renderAnswerlatticeCursorRuleMd', 'Answerlattice Install Center Cursor current rule copy');
  assertIncludes(installCenter, 'renderAnswerlatticeCursorRule', 'Answerlattice Install Center Cursor legacy fallback copy');
  assertIncludes(answerlatticeRoutes, 'INSTALL_CENTER', 'Answerlattice install center route constant');
  assertIncludes(answerlatticeDomains, "'install-center'", 'Answerlattice product-host dashboard route roots');
  assertIncludes(routePermissions, 'ANSWERLATTICE_ROUTES.INSTALL_CENTER', 'Answerlattice install center route permission');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_ROUTES.INSTALL_CENTER', 'Answerlattice widget route must link to install center');
  assert((answerlatticeNavigations.match(/ANSWERLATTICE_ROUTES\.INSTALL_CENTER/g) || []).length === 1, 'Answerlattice sidebar must not duplicate the Install Center route');
  assertNotIncludes(answerlatticeNavigations, 'widget-install-center', 'Answerlattice widget sidebar must not duplicate Install Center');

  const publicInstallCopy = [
    widgetManagement,
    installCenter,
    answerlatticeQuickstarts,
    answerlatticeResources,
    answerlatticeDayOneLaunchPack,
    answerlatticeSiteConfig,
    JSON.stringify(kitFiles),
    contract.renderAnswerlatticeMarkdownDoc('overview'),
    contract.renderAnswerlatticeMarkdownDoc('ai-agent'),
  ].join('\n');
  assertNotIncludes(publicInstallCopy, '@answerlattice/web', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'createAnswerlatticeWebClient', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'Typed SDK', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'optional typed helper', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'Legacy compatibility', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'BLOCKED_ROUTES=', 'Answerlattice public install copy');
  assertNotIncludes(publicInstallCopy, 'ALLOWED_ORIGINS=', 'Answerlattice public install copy');
  assertNotIncludes(widgetManagement, "value: 'sdk'", 'Answerlattice widget install snippet picker');
}

function main() {
  verifyEnvironmentTargets();
  if (process.argv.includes('--env-targets-only')) {
    console.log('Environment target matrix verified');
    return;
  }
  verifyMenuListDiscovery();
  verifyAnswerlatticeDiscovery();
  verifyAnswerlatticeInstallContract();
  console.log('Agent-readiness discovery surfaces verified');
}

main();
