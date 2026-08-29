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

const SPLASH_BACKGROUND = [10, 10, 26];
const BACKGROUND_TOLERANCE = 1;

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

function extractPathData(content) {
  return [...content.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
}

function verifyStartupMetadata() {
  const rootLayout = read('src/app/layout.tsx');
  const answerlatticeAppLayout = read('src/app/(answerlattice)/layout.tsx');
  const answerlatticeSiteLayout = read('src/app/sites/answerlattice/layout.tsx');
  const answerlatticeAssets = read('src/lib/answerlattice/pwaAssets.ts');
  const dashboardManifest = read('src/app/answerlattice-app.webmanifest/route.ts');
  const serviceWorkerRegister = read('src/components/ServiceWorkerRegister.tsx');
  const serviceWorker = read('public/answerlattice-sw.js');
  const offlinePage = read('src/app/sites/answerlattice/offline/page.tsx');
  const domainResolver = read('src/lib/multiTenant/domainResolver.ts');
  const proxy = read('src/proxy.ts');

  assertIncludes(rootLayout, 'startupImage: appleStartupImages', 'root MenuList metadata');
  assertNotIncludes(rootLayout, 'rel="apple-touch-startup-image"', 'root layout manual startup links');
  assertNotIncludes(rootLayout, 'apple-mobile-web-app-status-bar-style', 'root layout manual status bar metadata');
  assertIncludes(answerlatticeAssets, "ANSWERLATTICE_SPLASH_BASE_PATH = '/answerlattice-splash'", 'Answerlattice PWA assets helper');
  assertIncludes(answerlatticeAppLayout, 'startupImage: getStaticAnswerlatticeAppleStartupImages()', 'Answerlattice dashboard metadata');
  assertIncludes(answerlatticeAppLayout, "manifest: '/answerlattice-app.webmanifest'", 'Answerlattice dashboard manifest');
  assertIncludes(answerlatticeAppLayout, "color: '#F8FAFC'", 'Answerlattice dashboard light browser theme');
  assertIncludes(answerlatticeAppLayout, "color: '#0A0A1A'", 'Answerlattice dashboard dark browser theme');
  assertIncludes(answerlatticeAppLayout, "viewportFit: 'cover'", 'Answerlattice dashboard safe-area viewport');
  assertIncludes(answerlatticeSiteLayout, 'startupImage: getStaticAnswerlatticeAppleStartupImages()', 'Answerlattice website metadata');
  assertIncludes(dashboardManifest, "id: '/answerlattice-dashboard'", 'Answerlattice dashboard manifest identity');
  assertIncludes(dashboardManifest, "start_url: route('/activation')", 'Answerlattice dashboard launch route');
  assertIncludes(dashboardManifest, "scope: isAnswerlatticeHost ? '/' : '/answerlattice/'", 'Answerlattice host-aware manifest scope');
  assertIncludes(dashboardManifest, "url: route('/support-board')", 'Answerlattice support shortcut');
  assertIncludes(serviceWorkerRegister, "const ANSWERLATTICE_SW_URL = '/answerlattice-sw.js';", 'Answerlattice service worker registration');
  assertIncludes(serviceWorkerRegister, '? ANSWERLATTICE_SW_TARGET : null;', 'Answerlattice product-host worker selection');
  assertIncludes(serviceWorkerRegister, 'if (isAnswerlatticePlatformPath(pathname)) return ANSWERLATTICE_PLATFORM_SW_TARGET;', 'Answerlattice local-platform worker selection');
  assertIncludes(serviceWorker, 'Never cache tenant pages, API responses, support content, or knowledge data.', 'Answerlattice service worker privacy policy');
  assertIncludes(serviceWorker, "const ANSWERLATTICE_CACHE = 'answerlattice-offline-v1';", 'Answerlattice service worker cache');
  assertIncludes(serviceWorker, "? '/__answerlattice/offline'", 'Answerlattice local offline route');
  assertNotIncludes(serviceWorker, 'cache.put', 'Answerlattice service worker response-cache boundary');
  assertIncludes(offlinePage, 'Nothing will be changed while you are offline.', 'Answerlattice offline mutation boundary');
  assertIncludes(offlinePage, 'variant="serverErrorContext"', 'Answerlattice contextual recovery illustration');
  assertIncludes(domainResolver, "'/answerlattice-sw.js'", 'Answerlattice worker routing bypass');
  assertIncludes(proxy, "'/answerlattice-sw.js'", 'Answerlattice worker proxy transport');
}

function verifyLoaderBranding() {
  const serverLoader = read('src/app/loading.tsx');
  const brandedPageLoader = read('src/components/atoms/brandedPageLoader/index.tsx');
  const globalLoader = read('src/components/organisms/loader/index.tsx');
  const sourceLogo = read('public/answerlattice-logo.svg');
  const logoMark = read('src/components/atoms/answerlatticeLogoMark/index.tsx');
  const loaderLogo = read('src/components/atoms/answerlatticeLoaderLogo/index.tsx');
  const pageLoaderStyles = read('src/app/page.module.css');
  const globalLoaderStyles = read('src/components/organisms/loader/loader.module.scss');
  const loaderLogoStyles = read('src/components/atoms/answerlatticeLoaderLogo/answerlatticeLoaderLogo.module.scss');

  assertIncludes(serverLoader, "brand?: ServerSidePageLoaderBrand", 'server loader brand prop');
  assertIncludes(serverLoader, 'brand={resolvedBrand}', 'server loader resolved brand handoff');
  assertIncludes(brandedPageLoader, "brand === 'answerlattice'", 'branded page loader Answerlattice branch');
  assertIncludes(brandedPageLoader, '<AnswerlatticeLoaderLogo idPrefix="answerlattice-loader-logo" />', 'branded page loader Answerlattice logo');
  assertIncludes(globalLoader, "const loaderBrand = isAnswerlatticeRoute ? 'answerlattice'", 'global loader Answerlattice brand branch');
  assertIncludes(globalLoader, 'data-loader-brand={loaderBrand}', 'global loader brand marker');
  assertIncludes(globalLoader, '<AnswerlatticeLoaderLogo idPrefix="answerlattice-global-loader" />', 'global loader Answerlattice logo');
  assertIncludes(logoMark, 'viewBox="0 0 8367 5131"', 'Answerlattice inline logo source viewBox');
  assertIncludes(logoMark, 'strokeWidth="545"', 'Answerlattice inline logo final stroke width');
  assertIncludes(logoMark, 'stopColor="#5EEAD4"', 'Answerlattice inline logo final left gradient');
  assertIncludes(logoMark, 'stopColor="#08513E"', 'Answerlattice inline logo final right gradient');
  assertNotIncludes(logoMark, '<img', 'Answerlattice logo mark');
  assertIncludes(loaderLogo, '<AnswerlatticeLogoMark', 'Answerlattice loader shared SVG-path source');
  assertIncludes(loaderLogo, 'leftStroke: styles.leftStroke', 'Answerlattice loader left path class handoff');
  assertIncludes(loaderLogo, 'rightStroke: styles.rightStroke', 'Answerlattice loader right path class handoff');
  assertIncludes(loaderLogo, 'overlap: styles.overlap', 'Answerlattice loader overlap path class handoff');
  assertIncludes(loaderLogoStyles, 'animation: answerlattice-loader-stroke-left 3s infinite ease-in-out 0s both;', 'Answerlattice loader left stroke animation');
  assertIncludes(loaderLogoStyles, 'animation: answerlattice-loader-stroke-right 3s infinite ease-in-out 0s both;', 'Answerlattice loader right stroke animation');
  assertIncludes(loaderLogoStyles, '-webkit-animation: answerlattice-loader-stroke-left 3s infinite ease-in-out 0s both;', 'Answerlattice loader left webkit stroke animation');
  assertIncludes(loaderLogoStyles, '-webkit-animation: answerlattice-loader-stroke-right 3s infinite ease-in-out 0s both;', 'Answerlattice loader right webkit stroke animation');
  assertNotIncludes(sourceLogo, '<rect width="8425.81" height="5130.15" fill="#0D0D0D"/>', 'canonical Answerlattice logo background frame');
  assertNotIncludes(logoMark, 'fill="#0D0D0D"', 'Answerlattice inline logo background frame');
  assertNotIncludes(loaderLogo, '<rect width="8425.81" height="5130.15" fill="#0D0D0D" />', 'Answerlattice loader logo background frame');
  assertIncludes(pageLoaderStyles, '.loadingLogoAnswerlattice', 'Answerlattice server loader CSS override');
  assertIncludes(pageLoaderStyles, '.loadingWatermarkAnswerlattice', 'Answerlattice server loader watermark CSS override');
  assertNotIncludes(pageLoaderStyles, 'blur(0.2px)', 'Answerlattice server loader logo external blur');
  assertNotIncludes(pageLoaderStyles, 'drop-shadow(0 18px 38px', 'Answerlattice server loader logo external shadow');
  assertNotIncludes(globalLoaderStyles, 'drop-shadow(0 18px 38px', 'Answerlattice global loader logo external shadow');
  assertIncludes(globalLoaderStyles, 'filter: none;', 'Answerlattice global loader logo keeps only SVG-native filters');

  const sourcePaths = extractPathData(sourceLogo);
  const inlinePaths = extractPathData(logoMark);
  assert(sourcePaths.length === 6, 'canonical Answerlattice logo must expose the six design path elements');
  assert(
    JSON.stringify(inlinePaths) === JSON.stringify(sourcePaths),
    'Answerlattice inline logo paths must match the canonical SVG geometry exactly',
  );
}

function verifyTransparentLogoAssets() {
  const transparentAssets = [
    'public/answerlattice-logo-mark.png',
    'public/answerlattice-logo-mark-wide.png',
    'public/answerlattice-icon-512.png',
    'public/answerlattice-icon-maskable-512.png',
  ];

  for (const relPath of transparentAssets) {
    const fullPath = path.join(ROOT, relPath);
    assert(fs.existsSync(fullPath), `missing transparent Answerlattice asset: ${relPath}`);

    const png = PNG.sync.read(fs.readFileSync(fullPath));
    const samples = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ];

    for (const [x, y] of samples) {
      const index = ((png.width * y) + x) << 2;
      assert(png.data[index + 3] === 0, `${relPath} must keep transparent logo corners instead of a baked background frame`);
    }

    let visibleLogoSamples = 0;
    const step = Math.max(1, Math.floor(Math.min(png.width, png.height) / 96));

    for (let y = 0; y < png.height; y += step) {
      for (let x = 0; x < png.width; x += step) {
        const index = ((png.width * y) + x) << 2;
        const r = png.data[index];
        const g = png.data[index + 1];
        const b = png.data[index + 2];
        const a = png.data[index + 3];
        const isFinalLogoTeal = a > 160 && g > 70 && b > 50 && g > r + 12 && b > r + 4;
        if (isFinalLogoTeal) visibleLogoSamples += 1;
      }
    }

    assert(visibleLogoSamples > 24, `${relPath} must keep the final Answerlattice mark visible after removing the background frame`);
  }
}

function verifyWebsiteDiagramVectors() {
  const componentsRoot = path.join(ROOT, 'src/app/sites/answerlattice/components');
  const scrollRevealStyles = read('src/app/sites/answerlattice/scroll-reveal.css');
  const rasterPattern = /(<img\b|from ['"]next\/image['"]|\.png\b|\.jpe?g\b|\.webp\b|\/answerlattice-logo\.svg)/;
  const allowedRasterOrMetadataFiles = new Set([
    path.join(componentsRoot, 'AnswerlatticeAssetImage.tsx'),
    path.join(componentsRoot, 'AnswerlatticeMotionAsset.tsx'),
    path.join(componentsRoot, 'StructuredData.tsx'),
  ]);
  const filesToCheck = [];

  function collectTsxFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectTsxFiles(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        filesToCheck.push(entryPath);
      }
    }
  }

  collectTsxFiles(componentsRoot);

  for (const fullPath of filesToCheck) {
    if (allowedRasterOrMetadataFiles.has(fullPath)) {
      continue;
    }

    const relPath = path.relative(ROOT, fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(
      !rasterPattern.test(content),
      `${relPath} must keep visible Answerlattice website diagrams vector-based instead of raster image/logo usage`,
    );
  }

  const flowDiagram = read('src/app/sites/answerlattice/components/AnswerlatticeFlowDiagram.tsx');
  const supportMap = read('src/app/sites/answerlattice/components/SupportKnowledgeMapSection.tsx');
  assertIncludes(flowDiagram, '<AnswerlatticeLogoMark height={42}', 'Answerlattice flow diagram SVG logo atom');
  assertIncludes(supportMap, '<AnswerlatticeLogoMark height={42}', 'Answerlattice support map SVG logo atom');
  assertNotIncludes(scrollRevealStyles, 'translate3d(0, 0, 0)', 'Answerlattice reveal settled-state vector rasterization guard');
  assertIncludes(scrollRevealStyles, 'transform: none;', 'Answerlattice reveal visible state avoids persistent transform on SVG diagrams');
  assertIncludes(scrollRevealStyles, 'will-change: auto;', 'Answerlattice reveal visible state releases composited SVG layer');
}

function verifyWebsiteMotionAssetFallbacks() {
  const motionAsset = read('src/app/sites/answerlattice/components/AnswerlatticeMotionAsset.tsx');
  assertIncludes(motionAsset, '<video', 'Answerlattice motion asset video element');
  assertIncludes(motionAsset, 'muted', 'Answerlattice motion asset muted autoplay contract');
  assertIncludes(motionAsset, 'playsInline', 'Answerlattice motion asset in-page mobile playback');
  assertIncludes(motionAsset, 'poster={asset.poster}', 'Answerlattice motion asset video poster fallback');
  assertIncludes(motionAsset, 'type="video/webm"', 'Answerlattice motion asset WebM source');
  assertIncludes(motionAsset, 'type="video/mp4"', 'Answerlattice motion asset MP4 fallback source');
  assertIncludes(motionAsset, '<img', 'Answerlattice motion asset static poster fallback');
  assertIncludes(motionAsset, 'src={asset.poster}', 'Answerlattice motion asset poster source');
  assertIncludes(motionAsset, 'role="img"', 'Answerlattice motion asset accessible figure role');
  assertIncludes(motionAsset, 'aria-label={asset.alt}', 'Answerlattice motion asset accessible label');
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

    const backgroundSamples = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
      [Math.floor(png.width * 0.5), Math.floor(png.height * 0.12)],
      [Math.floor(png.width * 0.1), Math.floor(png.height * 0.46)],
      [Math.floor(png.width * 0.9), Math.floor(png.height * 0.46)],
    ];

    for (const [x, y] of backgroundSamples) {
      const index = ((png.width * y) + x) << 2;
      assert(
        Math.abs(png.data[index] - SPLASH_BACKGROUND[0]) <= BACKGROUND_TOLERANCE
          && Math.abs(png.data[index + 1] - SPLASH_BACKGROUND[1]) <= BACKGROUND_TOLERANCE
          && Math.abs(png.data[index + 2] - SPLASH_BACKGROUND[2]) <= BACKGROUND_TOLERANCE
          && png.data[index + 3] === 255,
        `${relPath} splash background must be owned by the splash surface without a contrasting logo panel`,
      );
    }

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
  verifyTransparentLogoAssets();
  verifyWebsiteDiagramVectors();
  verifyWebsiteMotionAssetFallbacks();
  verifySplashFiles();
  console.log('Answerlattice PWA assets verified');
}

main();
