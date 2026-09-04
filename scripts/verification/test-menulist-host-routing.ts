import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROLLED_ENV_KEYS = [
  'VERCEL',
  'VERCEL_ENV',
  'NEXT_PUBLIC_ENV',
  'NEXT_PUBLIC_VERCEL_ENV',
  'NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_PLATFORM_DOMAIN',
  'NODE_ENV',
] as const;

const originalEnv = Object.fromEntries(
  CONTROLLED_ENV_KEYS.map((key) => [key, process.env[key]]),
);

const clearRuntimeCache = () => {
  const sourceRoot = `${path.join(ROOT, 'src')}${path.sep}`;
  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.startsWith(sourceRoot)) delete require.cache[cacheKey];
  });
};

const setStage = (stage: 'preview' | 'production') => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = stage;
  process.env.NEXT_PUBLIC_ENV = stage;
  process.env.NEXT_PUBLIC_VERCEL_ENV = stage;
  process.env.NODE_ENV = 'production';
  clearRuntimeCache();
};

const setLocalTenantStage = () => {
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.NEXT_PUBLIC_ENV = 'local';
  process.env.NEXT_PUBLIC_VERCEL_ENV = 'local';
  process.env.NEXT_PUBLIC_MENULIST_TENANT_BASE_DOMAIN = 'localhost';
  process.env.NODE_ENV = 'development';
  clearRuntimeCache();
};

const restoreEnv = () => {
  CONTROLLED_ENV_KEYS.forEach((key) => {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  clearRuntimeCache();
};

const request = (url: string, host: string) => new NextRequest(url, {
  headers: {
    host,
    'x-forwarded-proto': 'https',
  },
});

function verifyOwnerPricingWebsiteOrigin() {
  const originalWindow = (globalThis as any).window;
  try {
    setStage('preview');
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.menulist.digital';
    (globalThis as any).window = {
      location: { hostname: 'app.menulist.digital', origin: 'https://app.menulist.digital' },
    };
    let urls = require('../../src/constants/urls.ts') as typeof import('../../src/constants/urls');
    assert.equal(urls.getPlatformWebsiteBaseUrl(), 'https://menulist.digital');

    setStage('production');
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.menulist.ai';
    (globalThis as any).window = {
      location: { hostname: 'app.menulist.ai', origin: 'https://app.menulist.ai' },
    };
    urls = require('../../src/constants/urls.ts') as typeof import('../../src/constants/urls');
    assert.equal(urls.getPlatformWebsiteBaseUrl(), 'https://menulist.ai');

    setLocalTenantStage();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    (globalThis as any).window = {
      location: { hostname: 'localhost', origin: 'http://localhost:3000' },
    };
    urls = require('../../src/constants/urls.ts') as typeof import('../../src/constants/urls');
    assert.equal(urls.getPlatformWebsiteBaseUrl(), 'http://localhost:3000');
  } finally {
    if (originalWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = originalWindow;
    restoreEnv();
  }
}

const CUSTOMER_DOMAIN_LOCALE_PATHS = [
  ['BusinessSettings', 'subdomainHelp'],
  ['BusinessSettings', 'outletSubdomainDesc'],
  ['BusinessSettings', 'noSubdomainDesc'],
  ['BusinessSettings', 'customDomainDesc'],
  ['BusinessSettings', 'autoRedirect'],
  ['Website', 'CreateMenuPreview', 'previewUrl'],
] as const;

const readNestedString = (value: unknown, keys: readonly string[]): string | null => {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : null;
};

const listFiles = (directory: string): string[] => fs.readdirSync(directory, {
  withFileTypes: true,
}).flatMap((entry) => {
  const entryPath = path.join(directory, entry.name);
  return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
});

function verifyOperationalHostEnv() {
  const stagingEnv = fs.readFileSync(path.join(ROOT, '.env.staging.example'), 'utf8');
  const productionEnv = fs.readFileSync(path.join(ROOT, '.env.production.example'), 'utf8');
  const qaFunctionsEnv = fs.readFileSync(
    path.join(ROOT, 'functions', '.env.menulist-qa.example'),
    'utf8',
  );
  const productionFunctionsEnv = fs.readFileSync(
    path.join(ROOT, 'functions', '.env.menulist-prod.example'),
    'utf8',
  );

  assert.match(
    stagingEnv,
    /^MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL=https:\/\/app\.menulist\.digital\/api\/image-generation\/batch-generation$/m,
  );
  assert.match(
    productionEnv,
    /^MENULIST_BATCH_IMAGE_GENERATION_WORKER_URL=https:\/\/app\.menulist\.ai\/api\/image-generation\/batch-generation$/m,
  );
  assert.match(
    qaFunctionsEnv,
    /^NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https:\/\/app\.menulist\.digital$/m,
  );
  assert.match(
    productionFunctionsEnv,
    /^NEXT_PUBLIC_MSG_PREVIEW_BASE_URL=https:\/\/app\.menulist\.ai$/m,
  );
}

function verifyVideoCustomerUrlExamples() {
  const videoRoot = path.join(ROOT, '__docs__', 'videos', 'hyperframes');
  for (const file of listFiles(videoRoot).filter((filePath) => (
    filePath.endsWith('.html') || filePath.endsWith('.md')
  ))) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      content,
      /menulist\.online\/(?:demo|the-daily-plate|local-table)/,
      `${path.relative(ROOT, file)} must use a customer subdomain, not an apex path`,
    );
    assert.doesNotMatch(
      content,
      /https:\/\/menulist\.online\/create-menu/,
      `${path.relative(ROOT, file)} must use the canonical owner-app onboarding URL`,
    );
    assert.doesNotMatch(
      content,
      /demo\.menulist\.(?:digital|online)/,
      `${path.relative(ROOT, file)} must not publish the reserved demo label as a tenant URL`,
    );
  }
}

function verifyMaintainedTenantExamplesUseRoutableSlugs() {
  const maintainedFiles = [
    '__docs__/customer-app/customer-app_spec.md',
    '__docs__/customer-app/customer-app_test.md',
    '__docs__/deployment/initial-account-domain-firebase-setup-guide.md',
    '__docs__/deployment/menulist-staging-qa-setup.md',
    '__docs__/deployment/three-product-environment-setup.md',
    'src/components/templates/platform/assetTemplates/index.tsx',
  ];

  for (const relativePath of maintainedFiles) {
    const content = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    assert.doesNotMatch(
      content,
      /demo\.menulist\.(?:digital|online)/,
      `${relativePath} must not use the reserved demo label as a tenant URL`,
    );
  }
}

function verifyPublishedTenantDomainExamples() {
  const llms = fs.readFileSync(path.join(ROOT, 'public', 'llms.txt'), 'utf8');
  const llmsFull = fs.readFileSync(path.join(ROOT, 'public', 'llms-full.txt'), 'utf8');

  assert.match(llms, /joespizza\.menulist\.online/);
  assert.doesNotMatch(llms, /joespizza\.menulist\.ai/);
  assert.match(llmsFull, /\{subdomain\}\.menulist\.online/);
  assert.doesNotMatch(llmsFull, /\{subdomain\}\.menulist\.ai/);

  const localeDirectory = path.join(ROOT, 'public', 'locales', 'menulist.ai');
  for (const file of fs.readdirSync(localeDirectory).filter((name) => name.endsWith('.json'))) {
    const locale = JSON.parse(fs.readFileSync(path.join(localeDirectory, file), 'utf8')) as unknown;
    for (const keys of CUSTOMER_DOMAIN_LOCALE_PATHS) {
      const localizedValue = readNestedString(locale, keys);
      assert.equal(
        localizedValue?.includes('menulist.ai') ?? false,
        false,
        `${file}:${keys.join('.')} must not publish the marketing domain as a customer URL`,
      );
      if (keys.join('.') === 'Website.CreateMenuPreview.previewUrl' && localizedValue) {
        assert.equal(
          localizedValue,
          'your-business.menulist.online',
          `${file}:${keys.join('.')} must use the production tenant subdomain shape`,
        );
      }
    }
  }
}

async function verifyPreviewHosts() {
  setStage('preview');
  const { proxy } = require('../../src/proxy.ts') as typeof import('../../src/proxy');
  const { resolveDomain } = require('../../src/lib/multiTenant/domainResolver.ts') as typeof import('../../src/lib/multiTenant/domainResolver');

  assert.equal(resolveDomain('qa-cafe.menulist.digital').type, 'subdomain');
  assert.equal(resolveDomain('demo.menulist.digital').type, 'platform');

  let response = await proxy(request(
    'https://menulist.digital/create-menu?source=qa',
    'menulist.digital',
  ));
  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://app.menulist.digital/create-menu?source=qa',
  );

  response = await proxy(request(
    'https://menulist.digital/msg-preview/session-id?token=secret',
    'menulist.digital',
  ));
  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://app.menulist.digital/msg-preview/session-id?token=secret',
  );

  for (const host of [
    'menulist.digital',
    'www.menulist.digital',
    'app.menulist.digital',
    'qa-cafe.menulist.digital',
  ]) {
    response = await proxy(request(`https://${host}/robots.txt`, host));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.match(await response.text(), /Disallow: \/$/m);

    response = await proxy(request(`https://${host}/sitemap.xml`, host));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  }

  response = await proxy(request('https://app.menulist.digital/', 'app.menulist.digital'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://app.menulist.digital/dashboard');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request('https://menulist.digital/product', 'menulist.digital'));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://menulist.digital/how-it-works');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request('https://menulist.digital/sites/internal', 'menulist.digital'));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://menulist.digital/');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request(
    'https://qa-cafe.menulist.digital/Menu?source=qa',
    'qa-cafe.menulist.digital',
  ));
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get('location'),
    'https://qa-cafe.menulist.digital/menu?source=qa',
  );
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request(
    'https://qa-cafe.menulist.digital/menu/?source=qa',
    'qa-cafe.menulist.digital',
  ));
  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://qa-cafe.menulist.digital/menu?source=qa',
  );
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request(
    'https://menulist.digital/pricing/?source=qa',
    'menulist.digital',
  ));
  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://menulist.digital/pricing?source=qa',
  );
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  response = await proxy(request(
    'https://qa-cafe.menulist.digital/menu',
    'qa-cafe.menulist.digital',
  ));
  assert.match(response.headers.get('x-middleware-rewrite') || '', /\/client\/menu$/);
  assert.equal(response.headers.get('x-tenant-subdomain'), 'qa-cafe');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
}

function verifyLocalTenantLinks() {
  setLocalTenantStage();
  const { getMenuUrl, getTenantBaseUrl } = require('../../src/constants/urls.ts') as typeof import('../../src/constants/urls');

  assert.equal(
    getMenuUrl('local-fixture'),
    'http://local-fixture.localhost:3000',
    'local tenant links must retain the loopback protocol and dev-server port',
  );
  assert.equal(
    getTenantBaseUrl(undefined, 'local-fixture.localhost'),
    'http://local-fixture.localhost:3000',
    'local custom-domain fixtures must retain the loopback protocol and dev-server port',
  );
}

async function verifyProductionHosts() {
  setStage('production');
  const { proxy } = require('../../src/proxy.ts') as typeof import('../../src/proxy');
  const { resolveDomain } = require('../../src/lib/multiTenant/domainResolver.ts') as typeof import('../../src/lib/multiTenant/domainResolver');

  assert.equal(resolveDomain('sample-cafe.menulist.online').type, 'subdomain');
  assert.equal(resolveDomain('demo.menulist.online').type, 'platform');

  let response = await proxy(request(
    'https://menulist.online/pricing?from=old',
    'menulist.online',
  ));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://menulist.ai/pricing?from=old');

  response = await proxy(request('https://menulist.ai/create-menu', 'menulist.ai'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://app.menulist.ai/create-menu');

  response = await proxy(request(
    'https://menulist.ai/msg-preview/session-id?token=secret',
    'menulist.ai',
  ));
  assert.equal(response.status, 308);
  assert.equal(
    response.headers.get('location'),
    'https://app.menulist.ai/msg-preview/session-id?token=secret',
  );

  response = await proxy(request('https://app.menulist.ai/', 'app.menulist.ai'));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://app.menulist.ai/dashboard');

  response = await proxy(request(
    'https://sample-cafe.menulist.online/menu',
    'sample-cafe.menulist.online',
  ));
  assert.match(response.headers.get('x-middleware-rewrite') || '', /\/client\/menu$/);
  assert.equal(response.headers.get('x-tenant-subdomain'), 'sample-cafe');

  response = await proxy(request(
    'https://app.menulist.online/dashboard',
    'app.menulist.online',
  ));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://app.menulist.ai/dashboard');
}

async function main() {
  try {
    verifyOperationalHostEnv();
    verifyPublishedTenantDomainExamples();
    verifyVideoCustomerUrlExamples();
    verifyMaintainedTenantExamplesUseRoutableSlugs();
    verifyOwnerPricingWebsiteOrigin();
    verifyLocalTenantLinks();
    await verifyPreviewHosts();
    await verifyProductionHosts();
    console.log('MenuList host routing tests passed.');
  } finally {
    restoreEnv();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
