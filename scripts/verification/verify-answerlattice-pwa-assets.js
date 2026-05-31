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
  const answerlatticeAppLayout = read('src/app/(answerlattice)/layout.tsx');
  const answerlatticeSiteLayout = read('src/app/sites/answerlattice/layout.tsx');
  const answerlatticeAssets = read('src/lib/answerlattice/pwaAssets.ts');

  assertIncludes(rootLayout, 'startupImage: appleStartupImages', 'root MenuList metadata');
  assertNotIncludes(rootLayout, 'rel="apple-touch-startup-image"', 'root layout manual startup links');
  assertNotIncludes(rootLayout, 'apple-mobile-web-app-status-bar-style', 'root layout manual status bar metadata');
  assertIncludes(answerlatticeAssets, "ANSWERLATTICE_SPLASH_BASE_PATH = '/answerlattice-splash'", 'Answerlattice PWA assets helper');
  assertIncludes(answerlatticeAppLayout, 'startupImage: getStaticAnswerlatticeAppleStartupImages()', 'Answerlattice dashboard metadata');
  assertIncludes(answerlatticeSiteLayout, 'startupImage: getStaticAnswerlatticeAppleStartupImages()', 'Answerlattice website metadata');
}

function verifyLoaderBranding() {
  const serverLoader = read('src/app/loading.tsx');
  const brandedPageLoader = read('src/components/atoms/brandedPageLoader/index.tsx');
  const globalLoader = read('src/components/organisms/loader/index.tsx');

  assertIncludes(serverLoader, "brand?: ServerSidePageLoaderBrand", 'server loader brand prop');
  assertIncludes(serverLoader, 'brand={resolvedBrand}', 'server loader resolved brand handoff');
  assertIncludes(brandedPageLoader, "brand === 'answerlattice'", 'branded page loader Answerlattice branch');
  assertIncludes(brandedPageLoader, '<AnswerlatticeAnimatedLogo idPrefix="answerlattice-loader-logo" />', 'branded page loader Answerlattice logo');
  assertIncludes(globalLoader, "data-loader-brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'}", 'global loader brand marker');
  assertIncludes(globalLoader, '<AnswerlatticeAnimatedLogo idPrefix="answerlattice-global-loader" />', 'global loader Answerlattice logo');
}

function verifySplashFiles() {
  for (const size of SPLASH_SIZES) {
    const relPath = `public/answerlattice-splash/apple-splash-${size}.png`;
    const fullPath = path.join(ROOT, relPath);
    assert(fs.existsSync(fullPath), `missing Answerlattice splash asset: ${relPath}`);

    const [expectedWidth, expectedHeight] = size.split('x').map(Number);
    const png = PNG.sync.read(fs.readFileSync(fullPath));
    assert(png.width === expectedWidth, `${relPath} width must be ${expectedWidth}`);
    assert(png.height === expectedHeight, `${relPath} height must be ${expectedHeight}`);

    const xStart = Math.floor(png.width * 0.2);
    const xEnd = Math.ceil(png.width * 0.8);
    const yStart = Math.floor(png.height * 0.38);
    const yEnd = Math.ceil(png.height * 0.54);
    let visibleLogoSamples = 0;

    for (let y = yStart; y < yEnd; y += 4) {
      for (let x = xStart; x < xEnd; x += 4) {
        const index = ((png.width * y) + x) << 2;
        const r = png.data[index];
        const g = png.data[index + 1];
        const b = png.data[index + 2];
        const a = png.data[index + 3];
        const isFinalLogoTeal = a > 220 && g > 95 && b > 75 && g > r + 18 && b > r + 8;
        if (isFinalLogoTeal) visibleLogoSamples += 1;
      }
    }

    assert(visibleLogoSamples > 24, `${relPath} must keep the final Answerlattice mark visibly present in the splash logo area`);
  }
}

function main() {
  verifyStartupMetadata();
  verifyLoaderBranding();
  verifySplashFiles();
  console.log('Answerlattice PWA assets verified');
}

main();
