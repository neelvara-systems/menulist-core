const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');

const SPLASH_SIZES = [
  [1290, 2796],
  [1179, 2556],
  [1170, 2532],
  [1125, 2436],
  [1242, 2688],
  [828, 1792],
  [1242, 2208],
  [750, 1334],
  [640, 1136],
];

const EXPECTED_ICON_SIZES = new Map([
  ['/mycodex-favicon-16.png', 16],
  ['/mycodex-favicon-32.png', 32],
  ['/mycodex-icon-48.png', 48],
  ['/mycodex-icon-96.png', 96],
  ['/mycodex-icon-128.png', 128],
  ['/mycodex-apple-touch-icon.png', 180],
  ['/mycodex-icon-192.png', 192],
  ['/mycodex-icon-512.png', 512],
  ['/mycodex-icon-maskable-192.png', 192],
  ['/mycodex-icon-maskable-512.png', 512],
]);

const EXPECTED_TRANSPARENT_LOGOS = new Map([
  ['public/mycodex-logo.png', [480, 800]],
  ['public/mycodex-icon-512.png', [512, 512]],
  ['public/mycodex-apple-touch-icon.png', [180, 180]],
]);

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

function readPng(publicPath) {
  return PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public', publicPath.replace(/^\//, ''))));
}

function getVisiblePngStats(png) {
  let visiblePixels = 0;
  let visibleXTotal = 0;
  let visibleYTotal = 0;
  let visibleMinX = png.width;
  let visibleMaxX = -1;
  let visibleMinY = png.height;
  let visibleMaxY = -1;
  let paleTilePixels = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const alpha = png.data[index + 3];
    if (alpha <= 8) continue;

    const pixelIndex = index >> 2;
    const x = pixelIndex % png.width;
    const y = Math.floor(pixelIndex / png.width);
    visiblePixels += 1;
    visibleXTotal += x;
    visibleYTotal += y;
    visibleMinX = Math.min(visibleMinX, x);
    visibleMaxX = Math.max(visibleMaxX, x);
    visibleMinY = Math.min(visibleMinY, y);
    visibleMaxY = Math.max(visibleMaxY, y);

    if (png.data[index] > 215 && png.data[index + 1] > 220 && png.data[index + 2] > 230) {
      paleTilePixels += 1;
    }
  }

  const visibleWidth = visibleMaxX - visibleMinX + 1;
  const visibleHeight = visibleMaxY - visibleMinY + 1;

  return {
    visiblePixels,
    visibleCenterX: visibleXTotal / visiblePixels,
    visibleCenterY: visibleYTotal / visiblePixels,
    visibleWidth,
    visibleHeight,
    visibleAspectRatio: visibleWidth / visibleHeight,
    paleTilePixels,
  };
}

function verifyManifest() {
  const manifest = JSON.parse(read('public/mycodex.webmanifest'));

  assert(manifest.name === 'MyCodex', 'manifest name must be MyCodex');
  assert(manifest.short_name === 'MyCodex', 'manifest short_name must be MyCodex');
  assert(manifest.id === '/mycodex', 'manifest id must be product-specific');
  assert(manifest.scope === '/', 'manifest scope must stay root-scoped for menulist.digital');
  assert(manifest.start_url === '/', 'manifest start_url must stay root for menulist.digital');
  assert(manifest.display === 'standalone', 'manifest display must be standalone');
  assert(Array.isArray(manifest.icons), 'manifest icons must be an array');

  for (const icon of manifest.icons) {
    assert(EXPECTED_ICON_SIZES.has(icon.src), `unexpected MyCodex manifest icon: ${icon.src}`);
    const expectedSize = EXPECTED_ICON_SIZES.get(icon.src);
    assert(icon.sizes === `${expectedSize}x${expectedSize}`, `${icon.src} manifest size must match file`);

    const png = readPng(icon.src);
    assert(png.width === expectedSize, `${icon.src} width must be ${expectedSize}`);
    assert(png.height === expectedSize, `${icon.src} height must be ${expectedSize}`);
  }

  for (const iconPath of EXPECTED_ICON_SIZES.keys()) {
    assert(manifest.icons.some((icon) => icon.src === iconPath), `manifest missing ${iconPath}`);
  }
}

function verifyTransparentLogoAssets() {
  const sourceLogoStats = getVisiblePngStats(PNG.sync.read(fs.readFileSync(path.join(ROOT, 'public/mycodex-logo.png'))));

  for (const [file, [expectedWidth, expectedHeight]] of EXPECTED_TRANSPARENT_LOGOS.entries()) {
    const png = PNG.sync.read(fs.readFileSync(path.join(ROOT, file)));
    assert(png.width === expectedWidth, `${file} width must be ${expectedWidth}`);
    assert(png.height === expectedHeight, `${file} height must be ${expectedHeight}`);

    const cornerAlpha = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ].map(([x, y]) => png.data[((png.width * y + x) << 2) + 3]);
    assert(cornerAlpha.every((alpha) => alpha === 0), `${file} must keep transparent corners`);

    const stats = getVisiblePngStats(png);

    assert(stats.visiblePixels > 0, `${file} must contain visible logo pixels`);
    assert(Math.abs(stats.visibleCenterX - (png.width - 1) / 2) <= png.width * 0.025, `${file} visible mark must be horizontally centered`);
    assert(Math.abs(stats.visibleCenterY - (png.height - 1) / 2) <= png.height * 0.025, `${file} visible mark must be vertically centered`);

    if (expectedWidth === expectedHeight) {
      assert(stats.visibleWidth >= expectedWidth * 0.45 && stats.visibleWidth <= expectedWidth * 0.6, `${file} must contain the portrait logo with install-icon padding instead of stretching it across the square canvas`);
      assert(stats.visibleHeight >= expectedHeight * 0.65 && stats.visibleHeight <= expectedHeight * 0.78, `${file} must preserve the source logo with install-icon padding inside the square canvas`);
      assert(Math.abs(stats.visibleAspectRatio - sourceLogoStats.visibleAspectRatio) <= 0.02, `${file} must keep the source logo aspect ratio and must not look compressed`);
    }

    assert(stats.paleTilePixels < stats.visiblePixels * 0.02, `${file} must not include the pale background tile`);
  }
}

function verifyMetadataAndRegistration() {
  const layout = read('src/app/sites/mycodex/layout.tsx');
  const serviceWorkerRegister = read('src/components/ServiceWorkerRegister.tsx');
  const middleware = read('src/middleware.ts');
  const domainResolver = read('src/lib/multiTenant/domainResolver.ts');
  const auth = read('src/lib/mycodex/auth.ts');
  const productIds = read('src/constants/product.ts');
  const docsLoader = read('src/lib/mycodex/docs.ts');
  const documentRoute = read('src/app/sites/mycodex/api/document/route.ts');
  const sessionRoute = read('src/app/sites/mycodex/api/session/route.ts');
  const apiSchemas = read('src/lib/validation/apiSchemas.ts');
  const billingPlans = read('src/lib/billing/productBillingPlans.ts');
  const billingServer = read('src/lib/billing/productBillingServer.ts');
  const nextConfig = read('next.config.js');

  assertIncludes(layout, 'MYCODEX_MANIFEST_PATH', 'MyCodex layout metadata');
  assertIncludes(layout, '/mycodex-favicon-16.png', 'MyCodex layout metadata');
  assertIncludes(layout, '/mycodex-apple-touch-icon.png', 'MyCodex layout metadata');
  assertIncludes(layout, 'startupImage: getStaticMyCodexAppleStartupImages()', 'MyCodex layout metadata');
  assertIncludes(layout, "document.documentElement.classList.remove('dark');", 'MyCodex theme script blocked-storage fallback');
  assertNotIncludes(layout, 'catch(e) {}', 'MyCodex theme script silent catch');
  assertIncludes(serviceWorkerRegister, "const MYCODEX_SW_URL = '/mycodex-sw.js';", 'service worker registration');
  assertIncludes(serviceWorkerRegister, "resolved.productSite?.id === 'mycodex'", 'service worker registration');
  assertIncludes(middleware, 'mycodex-sw\\\\.js', 'middleware matcher');
  assertIncludes(domainResolver, "'/mycodex-sw.js'", 'domain resolver bypass');
  assertIncludes(productIds, "MYCODEX: 'MC'", 'MyCodex internal product code');
  assertIncludes(auth, 'MYCODEX_PRODUCT_CODE = PRODUCT_IDS.MYCODEX', 'MyCodex product code boundary');
  assertIncludes(auth, "MYCODEX_PRODUCT_SLUG = 'mycodex'", 'MyCodex route slug boundary');
  assertIncludes(auth, 'product: MYCODEX_PRODUCT_SLUG', 'MyCodex session slug boundary');
  assertNotIncludes(auth, 'product: MYCODEX_PRODUCT_CODE', 'MyCodex session must not store the pId code');
  assertIncludes(auth, "MYCODEX_OFFLINE_PATH = '/offline'", 'MyCodex auth bypass');
  assertNotIncludes(apiSchemas, "['ML', 'AL', 'CC', 'MC']", 'MyCodex must not be exposed as a billing API product');
  assertIncludes(billingPlans, 'normalized === PRODUCT_IDS.MYCODEX', 'MyCodex billing normalizer boundary');
  assertIncludes(billingPlans, 'isProductBillingDisabled', 'MyCodex disabled billing boundary');
  assertIncludes(billingServer, 'MyCodex billing is not configured.', 'MyCodex billing fails closed');
  assertIncludes(nextConfig, 'outputFileTracingIncludes', 'MyCodex Vercel filesystem tracing');
  assertIncludes(nextConfig, "'/sites/mycodex/**/*': ['./__docs__/**/*']", 'MyCodex Vercel filesystem tracing');

  for (const [label, content] of [
    ['MyCodex docs loader', docsLoader],
    ['MyCodex document API', documentRoute],
    ['MyCodex session API', sessionRoute],
  ]) {
    const lowerContent = content.toLowerCase();
    assert(!lowerContent.includes('firestore'), `${label} must not import or reference Firestore`);
    assert(!lowerContent.includes('firebase'), `${label} must not import or reference Firebase`);
  }
}

function verifyServiceWorkerPrivacy() {
  const sw = read('public/mycodex-sw.js');

  assertIncludes(sw, 'Do not cache document pages or markdown content.', 'MyCodex service worker privacy note');
  assertIncludes(sw, "const MYCODEX_OFFLINE_URL = '/offline';", 'MyCodex service worker');
  assertIncludes(sw, "const MYCODEX_CACHE = 'mycodex-offline-v1';", 'MyCodex service worker');
  assertIncludes(sw, "'/mycodex-logo.png'", 'MyCodex service worker');
  assertNotIncludes(sw, '__docs__', 'MyCodex service worker');
  assertNotIncludes(sw, 'cache.put', 'MyCodex service worker');
}

function verifySplashFiles() {
  for (const [width, height] of SPLASH_SIZES) {
    const relPath = `public/mycodex-splash/apple-splash-${width}x${height}.png`;
    assert(fs.existsSync(path.join(ROOT, relPath)), `missing MyCodex splash asset: ${relPath}`);

    const png = PNG.sync.read(fs.readFileSync(path.join(ROOT, relPath)));
    assert(png.width === width, `${relPath} width must be ${width}`);
    assert(png.height === height, `${relPath} height must be ${height}`);

    const cornerBrightness = png.data[0] + png.data[1] + png.data[2];
    let brightLogoPixels = 0;
    for (let index = 0; index < png.data.length; index += 4) {
      const brightness = png.data[index] + png.data[index + 1] + png.data[index + 2];
      if (brightness > cornerBrightness + 80) {
        brightLogoPixels += 1;
      }
    }
    assert(brightLogoPixels > png.width * png.height * 0.005, `${relPath} must show the MyCodex mark against the dark launch background`);
  }
}

function main() {
  verifyManifest();
  verifyTransparentLogoAssets();
  verifyMetadataAndRegistration();
  verifyServiceWorkerPrivacy();
  verifySplashFiles();
  console.log('MyCodex PWA assets verified');
}

main();
