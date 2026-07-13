const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Run with: node scripts/website-assets/generate-neelvara-logo-assets.js
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'neelvara-logo.svg');

const MASTER_VIEWBOX = '68 0 487 320';
const SQUARE_VIEWBOX = '68 -83.5 487 487';
const MASTER_PNG_SIZE = { width: 578, height: 328 };
const ICON_SIZES = [96, 128, 180, 192, 512];
const OG_SIZE = { width: 1200, height: 630 };
const OG_LOGO_BOX = { width: 770, height: 506 };

const CANONICAL_PATHS = [
  'M101 139 L445 27 C461 22 474 31 480 51 L506 149 C512 169 504 183 490 187 L166 291 C149 296 134 286 128 269 L100 174 C95 157 96 145 101 139 Z',
  'M230 121 L506 158 C523 160 531 175 527 194 L516 258 C512 278 499 290 481 288 L218 252 C201 250 192 236 195 219 L209 148 C212 130 221 120 230 121 Z',
  'M145 94 L309 174 C324 181 329 195 323 213 L309 239 C302 257 286 267 270 259 L106 179 C95 174 92 159 99 140 L113 114 C121 97 132 88 145 94 Z',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function outputPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function extractPaths(svg) {
  return [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
}

function validateSource(svg) {
  assert(svg.includes(`viewBox="${MASTER_VIEWBOX}"`), `Source logo must use balanced viewBox ${MASTER_VIEWBOX}`);
  assert(!/<image\b|data:image|base64/i.test(svg), 'Source logo must remain a true vector without embedded images');

  const paths = extractPaths(svg);
  assert(paths.length === CANONICAL_PATHS.length, 'Source logo must contain exactly three paths');
  CANONICAL_PATHS.forEach((expected, index) => {
    assert(paths[index] === expected, `Source logo path ${index + 1} geometry changed`);
  });
}

function extractSection(svg, pattern, label) {
  const match = svg.match(pattern);
  assert(match, `Source logo is missing ${label}`);
  return match[0];
}

function buildSquareSvg(sourceSvg, faviconOptimized = false) {
  const defs = extractSection(sourceSvg, /<defs>[\s\S]*?<\/defs>/, 'gradient definitions');
  let group = extractSection(sourceSvg, /<g\b[\s\S]*?<\/g>/, 'path group');

  if (faviconOptimized) {
    group = group
      .replace('fill-opacity="0.48"', 'fill-opacity="0.68"')
      .replace('fill-opacity="0.47"', 'fill-opacity="0.66"')
      .replace('fill-opacity="0.46"', 'fill-opacity="0.64"')
      .replaceAll('stroke-opacity="0.86"', 'stroke-opacity="1"')
      .replaceAll('stroke-width="2.1"', 'stroke-width="14"');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="${SQUARE_VIEWBOX}" shape-rendering="geometricPrecision">
  <title>Neelvara Systems</title>
  ${defs}
  ${group}
</svg>
`;
}

function fitContain(targetWidth, targetHeight, sourceWidth, sourceHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

async function renderSvg(svg, width, height) {
  const image = await loadImage(Buffer.from(svg));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const placement = fitContain(width, height, image.width, image.height);
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  return canvas.toBuffer('image/png');
}

async function renderOg(sourceSvg) {
  const image = await loadImage(Buffer.from(sourceSvg));
  const canvas = createCanvas(OG_SIZE.width, OG_SIZE.height);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, OG_SIZE.width, OG_SIZE.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const placement = fitContain(OG_LOGO_BOX.width, OG_LOGO_BOX.height, image.width, image.height);
  context.drawImage(
    image,
    (OG_SIZE.width - placement.width) / 2,
    (OG_SIZE.height - placement.height) / 2,
    placement.width,
    placement.height,
  );

  return canvas.toBuffer('image/png');
}

function writeFile(relativePath, content) {
  const fullPath = outputPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log(`wrote ${relativePath}`);
}

async function main() {
  const sourceSvg = fs.readFileSync(SOURCE_SVG, 'utf8');
  validateSource(sourceSvg);

  const squareSvg = buildSquareSvg(sourceSvg);
  const faviconSvg = buildSquareSvg(sourceSvg, true);

  writeFile('public/neelvara-favicon.svg', faviconSvg);
  writeFile(
    'public/neelvara-logo.png',
    await renderSvg(sourceSvg, MASTER_PNG_SIZE.width, MASTER_PNG_SIZE.height),
  );

  writeFile('public/neelvara-favicon-16.png', await renderSvg(faviconSvg, 16, 16));
  writeFile('public/neelvara-favicon-32.png', await renderSvg(faviconSvg, 32, 32));

  for (const size of ICON_SIZES) {
    const buffer = await renderSvg(squareSvg, size, size);
    writeFile(`public/neelvara-icon-${size}.png`, buffer);

    if (size === 180) {
      writeFile('public/neelvara-apple-touch-icon.png', buffer);
    }

    if (size === 512) {
      writeFile('public/neelvara-icon.png', buffer);
    }
  }

  writeFile('public/neelvara-og-image.png', await renderOg(sourceSvg));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
