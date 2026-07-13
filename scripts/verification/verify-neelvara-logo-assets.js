const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const MASTER_SVG = 'public/neelvara-logo.svg';
const FAVICON_SVG = 'public/neelvara-favicon.svg';
const MASTER_VIEWBOX = '68 0 487 320';
const SQUARE_VIEWBOX = '68 -83.5 487 487';

const CANONICAL_PATHS = [
  'M101 139 L445 27 C461 22 474 31 480 51 L506 149 C512 169 504 183 490 187 L166 291 C149 296 134 286 128 269 L100 174 C95 157 96 145 101 139 Z',
  'M230 121 L506 158 C523 160 531 175 527 194 L516 258 C512 278 499 290 481 288 L218 252 C201 250 192 236 195 219 L209 148 C212 130 221 120 230 121 Z',
  'M145 94 L309 174 C324 181 329 195 323 213 L309 239 C302 257 286 267 270 259 L106 179 C95 174 92 159 99 140 L113 114 C121 97 132 88 145 94 Z',
];

const PNG_ASSETS = [
  [MASTER_SVG.replace('.svg', '.png'), 578, 328, 'master'],
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

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function extractPaths(svg) {
  return [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
}

function verifySvg(relativePath, expectedViewBox) {
  const svg = read(relativePath);
  assert(svg.includes(`viewBox="${expectedViewBox}"`), `${relativePath} must use viewBox ${expectedViewBox}`);
  assert(!/<image\b|data:image|base64/i.test(svg), `${relativePath} must remain a true vector`);

  const paths = extractPaths(svg);
  assert(paths.length === 3, `${relativePath} must contain exactly three paths`);
  CANONICAL_PATHS.forEach((expected, index) => {
    assert(paths[index] === expected, `${relativePath} path ${index + 1} geometry changed`);
  });

  for (const color of ['#A9C2F5', '#9CA8EC', '#D0C8F4', '#9ABAF4', '#8798E7', '#D9CBF3', '#9FC6F6', '#8FA2E8', '#B7ACEF', '#6F86E2']) {
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

  assert(masterSvg.includes('width="487" height="320"'), 'Master SVG intrinsic size must match its balanced canvas');
  assert(!masterSvg.includes('transform='), 'Master SVG paths must not be repositioned through transforms');
  assert(!faviconSvg.includes('transform='), 'Favicon SVG must preserve the master path positions without transforms');
  assert(faviconSvg.includes('fill-opacity="0.68"'), 'Favicon SVG must use the small-size first-path opacity');
  assert(faviconSvg.includes('fill-opacity="0.66"'), 'Favicon SVG must use the small-size second-path opacity');
  assert(faviconSvg.includes('fill-opacity="0.64"'), 'Favicon SVG must use the small-size third-path opacity');
  assert((faviconSvg.match(/stroke-width="14"/g) || []).length === 3, 'Favicon SVG must use the small-size outline width on all paths');

  for (const [relativePath, expectedWidth, expectedHeight, kind] of PNG_ASSETS) {
    const stats = await imageStats(relativePath);
    assert(stats.width === expectedWidth && stats.height === expectedHeight, `${relativePath} must be ${expectedWidth}x${expectedHeight}`);
    assert(stats.visibleWidth > 0 && stats.visibleHeight > 0, `${relativePath} must contain visible logo pixels`);
    assert(stats.transparentCorners, `${relativePath} must keep transparent corners without a visible frame`);
    verifyBalance(relativePath, stats, 'x', expectedWidth <= 32 ? 1 : 3);

    if (kind === 'master' || kind === 'og') {
      verifyBalance(relativePath, stats, 'y', 3);
    }

    if (kind === 'favicon') {
      assert(stats.visibleWidth >= expectedWidth * 0.82, `${relativePath} must use the available favicon width`);
      assert(stats.visibleHeight >= expectedHeight * 0.5, `${relativePath} must keep the three-path silhouette visible`);
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
  const styles = read('src/app/sites/neelvara/styles.css');
  const missingRoute = read('src/app/sites/neelvara/[...missing]/route.ts');
  const constants = read('src/constants/neelvara/website.ts');
  assert(styles.includes('url("/neelvara-logo.svg")'), 'Header and footer mark must use the master Neelvara SVG');
  assert(content.includes('NEELVARA_LOGO_PATH'), 'Structured data must use the shared Neelvara logo path');
  assert(constants.includes("NEELVARA_LOGO_PATH = '/neelvara-logo.svg'"), 'Shared logo constant must point to the master SVG');
  assert(missingRoute.includes('src="/neelvara-logo.svg"'), 'Static 404 must use the master Neelvara SVG');
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
