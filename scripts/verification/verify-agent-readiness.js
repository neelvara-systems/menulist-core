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
  assertIncludes(nextConfig, "source: '/product', destination: '/how-it-works', permanent: true", 'MenuList legacy product redirect');

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

function main() {
  verifyMenuListDiscovery();
  verifyCanonicaDiscovery();
  console.log('Agent-readiness discovery surfaces verified');
}

main();
