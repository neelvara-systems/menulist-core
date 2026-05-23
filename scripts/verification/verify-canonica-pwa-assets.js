const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');

const SPLASH_SIZES = [
  '1290x2796',
  '1179x2556',
  '1170x2532',
  '1125x2436',
  '1242x2688',
  '828x1792',
  '1242x2208',
  '750x1334',
  '640x1136',
];

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

function verifyStartupMetadata() {
  const rootLayout = read('src/app/layout.tsx');
  const canonicaAppLayout = read('src/app/(canonica)/layout.tsx');
  const canonicaSiteLayout = read('src/app/sites/canonica/layout.tsx');
  const canonicaAssets = read('src/lib/canonica/pwaAssets.ts');

  assertIncludes(rootLayout, 'startupImage: appleStartupImages', 'root MenuList metadata');
  assertNotIncludes(rootLayout, 'rel="apple-touch-startup-image"', 'root layout manual startup links');
  assertNotIncludes(rootLayout, 'apple-mobile-web-app-status-bar-style', 'root layout manual status bar metadata');
  assertIncludes(canonicaAssets, "CANONICA_SPLASH_BASE_PATH = '/canonica-splash'", 'Canonica PWA assets helper');
  assertIncludes(canonicaAppLayout, 'startupImage: getStaticCanonicaAppleStartupImages()', 'Canonica dashboard metadata');
  assertIncludes(canonicaSiteLayout, 'startupImage: getStaticCanonicaAppleStartupImages()', 'Canonica website metadata');
}

function verifyLoaderBranding() {
  const serverLoader = read('src/app/loading.tsx');
  const globalLoader = read('src/components/organisms/loader/index.tsx');

  assertIncludes(serverLoader, "brand?: ServerSidePageLoaderBrand", 'server loader brand prop');
  assertIncludes(serverLoader, "brand === 'canonica'", 'server loader Canonica branch');
  assertIncludes(serverLoader, '<CanonicaAnimatedLogo idPrefix="canonica-loader-logo" />', 'server loader Canonica logo');
  assertIncludes(globalLoader, "data-loader-brand={isCanonicaRoute ? 'canonica' : 'menulist'}", 'global loader brand marker');
  assertIncludes(globalLoader, '<CanonicaAnimatedLogo idPrefix="canonica-global-loader" />', 'global loader Canonica logo');
}

function verifySplashFiles() {
  for (const size of SPLASH_SIZES) {
    const relPath = `public/canonica-splash/apple-splash-${size}.png`;
    const fullPath = path.join(ROOT, relPath);
    assert(fs.existsSync(fullPath), `missing Canonica splash asset: ${relPath}`);

    const [expectedWidth, expectedHeight] = size.split('x').map(Number);
    const png = PNG.sync.read(fs.readFileSync(fullPath));
    assert(png.width === expectedWidth, `${relPath} width must be ${expectedWidth}`);
    assert(png.height === expectedHeight, `${relPath} height must be ${expectedHeight}`);

    const center = ((png.width * Math.floor(png.height * 0.46)) + Math.floor(png.width / 2)) << 2;
    const centerBrightness = png.data[center] + png.data[center + 1] + png.data[center + 2];
    const cornerBrightness = png.data[0] + png.data[1] + png.data[2];
    assert(centerBrightness > cornerBrightness + 35, `${relPath} must keep the Canonica mark area visibly separated from the dark background`);
  }
}

function main() {
  verifyStartupMetadata();
  verifyLoaderBranding();
  verifySplashFiles();
  console.log('Canonica PWA assets verified');
}

main();
