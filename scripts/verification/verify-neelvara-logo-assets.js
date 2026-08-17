const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const MASTER_SVG = 'public/neelvara-logo.svg';
const FAVICON_SVG = 'public/neelvara-favicon.svg';
const MASTER_VIEWBOX = '0 0 1135 686';
const SQUARE_VIEWBOX = '0 -224.5 1135 1135';
const MASTER_SHA256 = 'c62797f5332e11abfb7b8fdea41618a77ae2a532deffb35ed985c856d2dad98a';
const APPROVED_COLORS = ['#2384FF', '#1457D9', '#2737C8', '#6542E8'];
const CTA_BACKGROUND_COLORS = ['#1457D9', '#2737C8', '#6542E8'];
const CTA_FOREGROUND_COLOR = '#FFFFFF';
const RETIRED_COLORS = ['#A9C2F5', '#9CA8EC', '#D0C8F4', '#9ABAF4', '#8798E7', '#D9CBF3', '#9FC6F6', '#8FA2E8', '#B7ACEF', '#6F86E2'];

const PNG_ASSETS = [
  [MASTER_SVG.replace('.svg', '.png'), 1135, 686, 'master'],
  ['public/neelvara-favicon-16.png', 16, 16, 'favicon'],
  ['public/neelvara-favicon-32.png', 32, 32, 'favicon'],
  ['public/neelvara-icon-96.png', 96, 96, 'icon'],
  ['public/neelvara-icon-128.png', 128, 128, 'icon'],
  ['public/neelvara-icon-180.png', 180, 180, 'icon'],
  ['public/neelvara-icon-192.png', 192, 192, 'icon'],
  ['public/neelvara-icon-512.png', 512, 512, 'icon'],
  ['public/neelvara-icon.png', 512, 512, 'icon'],
  ['public/neelvara-apple-touch-icon.png', 180, 180, 'icon'],
  ['public/neelvara-og-image.png', 1200, 630, 'og'],
];

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function extractPaths(svg) {
  return [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
}

function verifySvg(relativePath, expectedViewBox) {
  const svg = read(relativePath);
  assert(svg.includes(`viewBox="${expectedViewBox}"`), `${relativePath} must use viewBox ${expectedViewBox}`);
  assert(!/<image\b|data:image|base64/i.test(svg), `${relativePath} must remain a true vector`);

  const paths = extractPaths(svg);
  assert(paths.length === 1, `${relativePath} must contain the supplied single compound path`);
  assert(svg.includes('id="neelvaraGradient"'), `${relativePath} must retain the supplied gradient`);
  assert(svg.includes('fill="url(#neelvaraGradient)"'), `${relativePath} must use the supplied gradient`);
  assert(svg.includes('fill-rule="evenodd"'), `${relativePath} must retain the supplied even-odd fill rule`);

  for (const color of APPROVED_COLORS) {
    assert(svg.includes(color), `${relativePath} is missing approved color ${color}`);
  }

  return svg;
}

async function imageStats(relativePath) {
  const image = await loadImage(path.join(ROOT, relativePath));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let alphaTotal = 0;
  let visiblePixels = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = pixels[(y * image.width + x) * 4 + 3];
      if (alpha > 2) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        alphaTotal += alpha;
        visiblePixels += 1;
      }
    }
  }

  const cornerIndexes = [
    3,
    (image.width - 1) * 4 + 3,
    ((image.height - 1) * image.width) * 4 + 3,
    (image.height * image.width - 1) * 4 + 3,
  ];

  return {
    width: image.width,
    height: image.height,
    minX,
    minY,
    maxX,
    maxY,
    visibleWidth: maxX - minX + 1,
    visibleHeight: maxY - minY + 1,
    averageAlpha: visiblePixels ? alphaTotal / visiblePixels : 0,
    transparentCorners: cornerIndexes.every((index) => pixels[index] === 0),
  };
}

function verifyBalance(relativePath, stats, axis, tolerance) {
  const start = axis === 'x' ? stats.minX : stats.minY;
  const end = axis === 'x' ? stats.maxX : stats.maxY;
  const size = axis === 'x' ? stats.width : stats.height;
  assert(
    Math.abs(start - (size - 1 - end)) <= tolerance,
    `${relativePath} ${axis}-axis transparent padding must be optically balanced`,
  );
}

async function main() {
  const masterSvg = verifySvg(MASTER_SVG, MASTER_VIEWBOX);
  const faviconSvg = verifySvg(FAVICON_SVG, SQUARE_VIEWBOX);

  assert(sha256(MASTER_SVG) === MASTER_SHA256, 'Master SVG must remain byte-for-byte identical to the supplied source');
  assert(masterSvg.includes('width="1135" height="686"'), 'Master SVG intrinsic size must match the supplied canvas');
  assert(!masterSvg.includes('transform='), 'Master SVG paths must not be repositioned through transforms');
  assert(!faviconSvg.includes('transform='), 'Favicon SVG must preserve the master path positions without transforms');
  assert(
    extractPaths(faviconSvg)[0] === extractPaths(masterSvg)[0],
    'Favicon SVG must reuse the supplied compound path without redrawing it',
  );

  for (const [relativePath, expectedWidth, expectedHeight, kind] of PNG_ASSETS) {
    const stats = await imageStats(relativePath);
    assert(stats.width === expectedWidth && stats.height === expectedHeight, `${relativePath} must be ${expectedWidth}x${expectedHeight}`);
    assert(stats.visibleWidth > 0 && stats.visibleHeight > 0, `${relativePath} must contain visible logo pixels`);
    if (kind !== 'og') {
      assert(stats.transparentCorners, `${relativePath} must keep transparent corners without a visible frame`);
    }
    verifyBalance(relativePath, stats, 'x', expectedWidth <= 32 ? 1 : 3);

    if (kind === 'master' || kind === 'og') {
      verifyBalance(relativePath, stats, 'y', 3);
    }

    if (kind === 'og') {
      assert(!stats.transparentCorners, `${relativePath} must use an opaque social-card background`);
    }

    if (kind === 'favicon') {
      assert(stats.visibleWidth >= expectedWidth * 0.82, `${relativePath} must use the available favicon width`);
      assert(stats.visibleHeight >= expectedHeight * 0.5, `${relativePath} must keep the supplied silhouette visible`);
      assert(stats.averageAlpha >= 120, `${relativePath} must retain enough contrast at small size`);
    }

    if (kind === 'icon') {
      assert(stats.visibleWidth >= expectedWidth * 0.86, `${relativePath} must use the available icon width`);
      assert(stats.visibleHeight >= expectedHeight * 0.52, `${relativePath} must keep the full mark readable`);
    }
  }

  const manifest = read('public/neelvara.webmanifest');
  for (const asset of ['neelvara-favicon-16.png', 'neelvara-favicon-32.png', 'neelvara-icon-96.png', 'neelvara-icon-128.png', 'neelvara-icon-180.png', 'neelvara-icon-192.png', 'neelvara-icon-512.png']) {
    assert(manifest.includes(`/${asset}`), `Manifest must reference ${asset}`);
  }

  const layout = read('src/app/sites/neelvara/layout.tsx');
  for (const asset of ['neelvara-favicon.svg', 'neelvara-favicon-16.png', 'neelvara-favicon-32.png', 'neelvara-icon-192.png', 'neelvara-icon-512.png', 'neelvara-apple-touch-icon.png']) {
    assert(layout.includes(`/${asset}`), `Neelvara metadata must reference ${asset}`);
  }

  const content = read('src/app/sites/neelvara/content.tsx');
  const bento = read('src/app/sites/neelvara/BentoReferenceSection.tsx');
  const styles = read('src/app/sites/neelvara/styles.css');
  const missingRoute = read('src/app/sites/neelvara/[...missing]/route.ts');
  const constants = read('src/constants/neelvara/website.ts');
  assert(styles.includes('url("/neelvara-logo.svg")'), 'Header and footer mark must use the master Neelvara SVG');
  assert(styles.includes('--on-accent: #ffffff;'), 'Neelvara stylesheet must define the white on-accent foreground');
  assert(
    styles.includes('linear-gradient(135deg, var(--m-blue) 0%, var(--m-indigo) 56%, var(--m-violet) 100%)'),
    'Solid CTAs must use the contrast-safe supplied gradient stops',
  );
  assert(
    (styles.match(/color: var\(--on-accent\);/g) || []).length >= 3,
    'Solid CTA, icon/visited, and active segmented states must use the on-accent foreground',
  );
  assert(missingRoute.includes('--on-accent: #ffffff;'), 'Static 404 must define the white on-accent foreground');
  assert(
    missingRoute.includes('background: linear-gradient(135deg, var(--blue), var(--indigo), var(--violet));'),
    'Static 404 primary action must use contrast-safe supplied gradient stops',
  );
  assert(missingRoute.includes('color: var(--on-accent);'), 'Static 404 primary action must use the on-accent foreground');
  for (const color of CTA_BACKGROUND_COLORS) {
    assert(
      contrastRatio(CTA_FOREGROUND_COLOR, color) >= 4.5,
      `White CTA foreground must retain at least 4.5:1 contrast against ${color}`,
    );
  }
  assert(styles.includes('.nv-prism-source-mark'), 'Legacy bento visual must use the source-mark class');
  assert(bento.includes('className="nv-prism-source-mark"'), 'Legacy bento visual must use the master Neelvara mark');
  assert(!bento.includes('<span />'), 'Legacy bento visual must not reconstruct the retired three-panel mark');
  assert(bento.includes('const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);'), 'Neelvara reference tabs must retain roving focus refs');
  assert(bento.includes('tabRefs.current[nextIndex]?.focus();'), 'Neelvara Arrow-key tab selection must move focus with active state');
  assert(bento.includes('tabIndex={active ? 0 : -1}'), 'Neelvara reference tabs must retain one active tab stop');
  for (const color of APPROVED_COLORS) {
    assert(styles.toUpperCase().includes(color), `Neelvara stylesheet is missing supplied color ${color}`);
  }
  for (const color of RETIRED_COLORS) {
    assert(!styles.toUpperCase().includes(color), `Neelvara stylesheet still contains retired logo color ${color}`);
    assert(!missingRoute.toUpperCase().includes(color), `Static 404 still contains retired logo color ${color}`);
  }
  assert(content.includes('NEELVARA_LOGO_PATH'), 'Structured data must use the shared Neelvara logo path');
  assert(constants.includes("NEELVARA_LOGO_PATH = '/neelvara-logo.svg'"), 'Shared logo constant must point to the master SVG');
  assert(
    (missingRoute.match(/src="\/neelvara-logo\.svg"/g) || []).length === 1,
    'Static 404 must use one master Neelvara SVG without duplicate recovery artwork',
  );
  assert(!missingRoute.includes('.prism-visual span'), 'Static 404 must not reconstruct the retired three-panel mark');
  assert(missingRoute.includes('href="/neelvara-favicon.svg"'), 'Static 404 must use the optimized SVG favicon');

  if (failures > 0) {
    console.error(`Neelvara logo asset verification failed with ${failures} issue(s).`);
    process.exit(1);
  }

  console.log(`Neelvara logo asset verification passed (${PNG_ASSETS.length} PNG assets, 2 SVG assets).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
