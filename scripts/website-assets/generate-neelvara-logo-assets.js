const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Run with: node scripts/website-assets/generate-neelvara-logo-assets.js
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'neelvara-logo.svg');

const MASTER_VIEWBOX = '0 0 1135 686';
const SQUARE_VIEWBOX = '0 -224.5 1135 1135';
const MASTER_PNG_SIZE = { width: 1135, height: 686 };
const ICON_SIZES = [96, 128, 180, 192, 512];
const OG_SIZE = { width: 1200, height: 630 };
const OG_LOGO_BOX = { width: 900, height: 544 };
const APPROVED_COLORS = ['#2384FF', '#1457D9', '#2737C8', '#6542E8'];

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
  assert(svg.includes('width="1135" height="686"'), 'Source logo intrinsic size must remain 1135x686');
  assert(svg.includes(`viewBox="${MASTER_VIEWBOX}"`), `Source logo must use supplied viewBox ${MASTER_VIEWBOX}`);
  assert(!/<image\b|data:image|base64/i.test(svg), 'Source logo must remain a true vector without embedded images');
  assert(!/\btransform=/.test(svg), 'Source logo geometry must not be transformed');

  const paths = extractPaths(svg);
  assert(paths.length === 1, 'Source logo must contain the supplied single compound path');
  assert(svg.includes('id="neelvaraGradient"'), 'Source logo must retain the supplied gradient');
  assert(svg.includes('fill="url(#neelvaraGradient)"'), 'Source logo path must use the supplied gradient');
  assert(svg.includes('fill-rule="evenodd"'), 'Source logo path must retain its even-odd fill rule');
  APPROVED_COLORS.forEach((color) => {
    assert(svg.includes(color), `Source logo is missing supplied color ${color}`);
  });
}

function extractSection(svg, pattern, label) {
  const match = svg.match(pattern);
  assert(match, `Source logo is missing ${label}`);
  return match[0];
}

function buildSquareSvg(sourceSvg) {
  const defs = extractSection(sourceSvg, /<defs>[\s\S]*?<\/defs>/, 'gradient definitions');
  const pathElement = extractSection(sourceSvg, /<path\b[\s\S]*?\/>/, 'compound logo path');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="${SQUARE_VIEWBOX}" shape-rendering="geometricPrecision">
  <title>Neelvara Systems</title>
  ${defs}
  ${pathElement}
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
  const faviconSvg = squareSvg;

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
