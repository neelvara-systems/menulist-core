const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');
const checks = [];

const ICON_ASSETS = [
  ['public/campaigncue-favicon-16.png', 16, 16, 'transparent'],
  ['public/campaigncue-favicon-32.png', 32, 32, 'transparent'],
  ['public/campaigncue-icon-16.png', 16, 16, 'transparent'],
  ['public/campaigncue-icon-32.png', 32, 32, 'transparent'],
  ['public/campaigncue-icon-48.png', 48, 48, 'transparent'],
  ['public/campaigncue-icon-96.png', 96, 96, 'transparent'],
  ['public/campaigncue-icon-128.png', 128, 128, 'transparent'],
  ['public/campaigncue-icon-180.png', 180, 180, 'transparent'],
  ['public/campaigncue-apple-touch-icon.png', 180, 180, 'transparent'],
  ['public/campaigncue-icon-192.png', 192, 192, 'transparent'],
  ['public/campaigncue-icon-512.png', 512, 512, 'transparent'],
  ['public/campaigncue-logo-mark.png', 1024, 1024, 'transparent'],
  ['public/campaigncue-logo-mark-wide.png', 1024, 744, 'transparent'],
  ['public/campaigncue-og-image.png', 1200, 630, 'opaque'],
  ['public/campaigncue-icon-maskable-192.png', 192, 192, 'solid'],
  ['public/campaigncue-icon-maskable-512.png', 512, 512, 'solid'],
];

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

const BACKGROUND = [251, 247, 250];
const BACKGROUND_TOLERANCE = 1;

function fullPath(relPath) {
  return path.join(ROOT, relPath);
}

function read(relPath) {
  return fs.readFileSync(fullPath(relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  checks.push(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} includes ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} does not include ${needle}`);
}

function readPng(relPath) {
  assert(fs.existsSync(fullPath(relPath)), `asset exists: ${relPath}`);
  return PNG.sync.read(fs.readFileSync(fullPath(relPath)));
}

function rgbaAt(png, x, y) {
  const index = ((png.width * y) + x) << 2;
  return [
    png.data[index],
    png.data[index + 1],
    png.data[index + 2],
    png.data[index + 3],
  ];
}

function assertBackground(pixel, relPath) {
  assert(
    Math.abs(pixel[0] - BACKGROUND[0]) <= BACKGROUND_TOLERANCE
      && Math.abs(pixel[1] - BACKGROUND[1]) <= BACKGROUND_TOLERANCE
      && Math.abs(pixel[2] - BACKGROUND[2]) <= BACKGROUND_TOLERANCE
      && pixel[3] === 255,
    `${relPath} keeps CampaignCue PWA background`,
  );
}

function countVisibleCampaignCueSamples(png, options = {}) {
  const {
    yStart = 0,
    yEnd = png.height,
    xStart = 0,
    xEnd = png.width,
    step = Math.max(1, Math.floor(Math.min(png.width, png.height) / 96)),
  } = options;

  let visible = 0;

  for (let y = yStart; y < yEnd; y += step) {
    for (let x = xStart; x < xEnd; x += step) {
      const [r, g, b, a] = rgbaAt(png, x, y);
      const isRose = a > 150 && r > 150 && g > 50 && g < 145 && b > 105 && b < 190;
      const isNavy = a > 150 && b > 70 && r < 40 && g < 70;
      if (isRose || isNavy) visible += 1;
    }
  }

  return visible;
}

function verifySvg() {
  const svg = read('public/campaigncue-icon.svg');
  assertIncludes(svg, 'width="966" height="701"', 'CampaignCue SVG intrinsic dimensions');
  assertIncludes(svg, 'viewBox="335 124 966 701"', 'CampaignCue SVG viewBox');
  assertIncludes(svg, 'fill="#d96e9b"', 'CampaignCue SVG rose mark');
  assertIncludes(svg, 'fill="#011b6d"', 'CampaignCue SVG navy mark');
  assertNotIncludes(svg, '<rect', 'CampaignCue SVG');
  assertNotIncludes(svg, 'fill="#fff"', 'CampaignCue SVG');
  assertNotIncludes(svg, 'fill="#ffffff"', 'CampaignCue SVG');
  assertNotIncludes(svg, 'fill="white"', 'CampaignCue SVG');
}

function verifyIconFiles() {
  for (const [relPath, expectedWidth, expectedHeight, backgroundMode] of ICON_ASSETS) {
    const png = readPng(relPath);
    assert(png.width === expectedWidth, `${relPath} width is ${expectedWidth}`);
    assert(png.height === expectedHeight, `${relPath} height is ${expectedHeight}`);

    const corners = [
      rgbaAt(png, 0, 0),
      rgbaAt(png, png.width - 1, 0),
      rgbaAt(png, 0, png.height - 1),
      rgbaAt(png, png.width - 1, png.height - 1),
    ];

    if (backgroundMode === 'transparent') {
      for (const corner of corners) {
        assert(corner[3] === 0, `${relPath} keeps transparent corners`);
      }
    } else if (backgroundMode === 'solid') {
      for (const corner of corners) {
        assertBackground(corner, relPath);
      }
    } else {
      for (const corner of corners) {
        assert(corner[3] === 255, `${relPath} keeps opaque corners`);
      }
    }

    assert(countVisibleCampaignCueSamples(png) > 0, `${relPath} contains visible CampaignCue mark samples`);
  }

  assert(fs.existsSync(fullPath('public/campaigncue-favicon.ico')), 'CampaignCue favicon ICO exists');
  const ico = fs.readFileSync(fullPath('public/campaigncue-favicon.ico'));
  assert(ico.readUInt16LE(0) === 0, 'CampaignCue ICO reserved header');
  assert(ico.readUInt16LE(2) === 1, 'CampaignCue ICO type header');
  assert(ico.readUInt16LE(4) === 1, 'CampaignCue ICO image count');
}

function verifySplashFiles() {
  for (const size of SPLASH_SIZES) {
    const relPath = `public/campaigncue-splash/apple-splash-${size}.png`;
    const [expectedWidth, expectedHeight] = size.split('x').map(Number);
    const png = readPng(relPath);

    assert(png.width === expectedWidth, `${relPath} width is ${expectedWidth}`);
    assert(png.height === expectedHeight, `${relPath} height is ${expectedHeight}`);

    const backgroundSamples = [
      rgbaAt(png, 0, 0),
      rgbaAt(png, png.width - 1, 0),
      rgbaAt(png, 0, png.height - 1),
      rgbaAt(png, png.width - 1, png.height - 1),
      rgbaAt(png, Math.floor(png.width * 0.5), Math.floor(png.height * 0.14)),
      rgbaAt(png, Math.floor(png.width * 0.1), Math.floor(png.height * 0.48)),
      rgbaAt(png, Math.floor(png.width * 0.9), Math.floor(png.height * 0.48)),
    ];

    for (const pixel of backgroundSamples) {
      assertBackground(pixel, relPath);
    }

    const visibleSamples = countVisibleCampaignCueSamples(png, {
      xStart: Math.floor(png.width * 0.18),
      xEnd: Math.ceil(png.width * 0.82),
      yStart: Math.floor(png.height * 0.34),
      yEnd: Math.ceil(png.height * 0.49),
      step: 4,
    });

    assert(visibleSamples > 24, `${relPath} contains visible CampaignCue splash mark`);
  }
}

function verifyManifest() {
  const manifest = JSON.parse(read('public/campaigncue.webmanifest'));
  assert(manifest.name === 'CampaignCue', 'CampaignCue manifest name');
  assert(manifest.short_name === 'CampaignCue', 'CampaignCue manifest short name');
  assert(manifest.theme_color === '#011b6d', 'CampaignCue manifest theme color');
  assert(manifest.background_color === '#fbf7fa', 'CampaignCue manifest background color');
  assert(manifest.id === '/campaigncue', 'CampaignCue manifest app id');

  const expectedIcons = [
    ['/campaigncue-favicon-16.png', '16x16', 'any'],
    ['/campaigncue-favicon-32.png', '32x32', 'any'],
    ['/campaigncue-icon-48.png', '48x48', 'any'],
    ['/campaigncue-icon-96.png', '96x96', 'any'],
    ['/campaigncue-icon-128.png', '128x128', 'any'],
    ['/campaigncue-apple-touch-icon.png', '180x180', 'any'],
    ['/campaigncue-icon-192.png', '192x192', 'any'],
    ['/campaigncue-icon-512.png', '512x512', 'any'],
    ['/campaigncue-icon-maskable-192.png', '192x192', 'maskable'],
    ['/campaigncue-icon-maskable-512.png', '512x512', 'maskable'],
    ['/campaigncue-icon.svg', 'any', 'any'],
  ];

  for (const [src, sizes, purpose] of expectedIcons) {
    assert(
      manifest.icons.some((icon) => icon.src === src && icon.sizes === sizes && icon.purpose === purpose),
      `CampaignCue manifest includes ${src}`,
    );
  }
}

function verifyMetadataWiring() {
  const layout = read('src/app/sites/campaigncue/layout.tsx');
  const pwaAssets = read('src/lib/campaigncue/pwaAssets.ts');
  const page = read('src/app/sites/campaigncue/page.tsx');
  const docs = read('__docs__/campaigncue/campaigncue-product/campaigncue-product_impl.md');
  const generator = read('scripts/website-assets/generate-campaigncue-logo-assets.js');

  assertIncludes(layout, 'CAMPAIGNCUE_MANIFEST_PATH', 'CampaignCue website layout');
  assertIncludes(layout, 'campaigncue-favicon.ico', 'CampaignCue website layout');
  assertIncludes(layout, 'campaigncue-favicon-16.png', 'CampaignCue website layout');
  assertIncludes(layout, 'campaigncue-favicon-32.png', 'CampaignCue website layout');
  assertIncludes(layout, 'campaigncue-icon-192.png', 'CampaignCue website layout');
  assertIncludes(layout, 'campaigncue-apple-touch-icon.png', 'CampaignCue website layout');
  assertIncludes(layout, "buildCampaignCueUrl('/campaigncue-og-image.png')", 'CampaignCue website Open Graph metadata');
  assertIncludes(layout, "card: 'summary_large_image'", 'CampaignCue website Twitter metadata');
  assertIncludes(layout, 'startupImage: getStaticCampaignCueAppleStartupImages()', 'CampaignCue website layout');
  assertIncludes(layout, 'themeColor: CAMPAIGNCUE_SITE_THEME_COLOR', 'CampaignCue viewport metadata');
  assertIncludes(pwaAssets, "CAMPAIGNCUE_SPLASH_BASE_PATH = '/campaigncue-splash'", 'CampaignCue PWA helper');
  assertIncludes(pwaAssets, "CAMPAIGNCUE_SITE_THEME_COLOR = '#011b6d'", 'CampaignCue PWA helper');
  assertIncludes(page, '<img src="/campaigncue-icon.svg" alt="" />', 'CampaignCue public header/footer brand mark');
  assertIncludes(generator, 'generate-campaigncue-logo-assets', 'CampaignCue generator self path');
  assertIncludes(generator, "writePng('public/campaigncue-og-image.png'", 'CampaignCue generator OG image output');
  assertIncludes(docs, 'public/campaigncue-favicon.ico', 'CampaignCue product implementation docs');
  assertIncludes(docs, 'public/campaigncue-og-image.png', 'CampaignCue product implementation docs');
  assertIncludes(docs, 'public/campaigncue-splash/apple-splash-*.png', 'CampaignCue product implementation docs');
}

function main() {
  verifySvg();
  verifyIconFiles();
  verifySplashFiles();
  verifyManifest();
  verifyMetadataWiring();
  console.log(`CampaignCue PWA assets verified (${checks.length} checks)`);
}

main();
