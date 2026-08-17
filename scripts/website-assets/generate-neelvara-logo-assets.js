const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

// Run with: node scripts/website-assets/generate-neelvara-logo-assets.js
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'neelvara-logo.svg');

const MASTER_VIEWBOX = '0 0 1135 686';
const SQUARE_VIEWBOX = '0 -224.5 1135 1135';
const MASTER_PNG_SIZE = { width: 1135, height: 686 };
const ICON_SIZES = [96, 128, 180, 192, 512];
const OG_SIZE = { width: 1200, height: 630 };
const APPROVED_COLORS = ['#2384FF', '#1457D9', '#2737C8', '#6542E8'];
for (const weight of [300, 400, 500, 600, 700]) {
  GlobalFonts.registerFromPath(
    path.join(ROOT, 'public', 'fonts', 'neelvara', `akshar-${weight}.ttf`),
    'Neelvara Akshar',
  );
}

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
  context.fillStyle = '#FAFBFE';
  context.fillRect(0, 0, OG_SIZE.width, OG_SIZE.height);
  const radialBackgrounds = [
    { x: 144, y: 50, radius: 520, color: 'rgba(35, 132, 255, 0.08)' },
    { x: 1080, y: 114, radius: 500, color: 'rgba(101, 66, 232, 0.07)' },
    { x: 1090, y: 660, radius: 280, color: 'rgba(101, 66, 232, 0.10)' },
  ];
  radialBackgrounds.forEach(({ x, y, radius, color }) => {
    const radial = context.createRadialGradient(x, y, 0, x, y, radius);
    radial.addColorStop(0, color);
    radial.addColorStop(1, 'rgba(250, 251, 254, 0)');
    context.fillStyle = radial;
    context.fillRect(0, 0, OG_SIZE.width, OG_SIZE.height);
  });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const drawText = (value, x, y, options = {}) => {
    const {
      size = 18,
      weight = 400,
      color = '#071323',
      maxWidth,
      lineHeight = Math.round(size * 1.35),
      align = 'left',
    } = options;
    context.font = `${weight} ${size}px "Neelvara Akshar", Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = align;

    if (!maxWidth) {
      context.fillText(value, x, y);
      return lineHeight;
    }

    let cursor = y;
    let line = '';
    for (const word of String(value).split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, cursor);
        cursor += lineHeight;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) context.fillText(line, x, cursor);
    return cursor - y + lineHeight;
  };

  const drawRule = (x, y, width) => {
    context.strokeStyle = '#D9E2F0';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.stroke();
  };

  const logoPlacement = fitContain(112, 68, image.width, image.height);
  context.drawImage(
    image,
    70 + (112 - logoPlacement.width) / 2,
    48 + (68 - logoPlacement.height) / 2,
    logoPlacement.width,
    logoPlacement.height,
  );

  drawText('Neelvara Systems', 206, 92, { size: 28, weight: 700, lineHeight: 34 });
  drawText('Building the trusted information layer between businesses and customers.', 70, 202, {
    size: 36,
    weight: 700,
    color: '#3F4D61',
    maxWidth: 1060,
    lineHeight: 42,
  });
  drawText('Neelvara builds customer-facing systems that help businesses publish accurate information and deliver reliable answers.', 70, 286, {
    size: 22,
    weight: 400,
    color: '#3F4D61',
    maxWidth: 1060,
    lineHeight: 26,
  });

  const productRowY = 402;
  const productItems = [
    {
      x: 70,
      color: '#2384FF',
      name: 'MenuList',
      tagline: 'The official version of your business.',
    },
    {
      x: 650,
      color: '#0F766E',
      name: 'Answerlattice',
      tagline: 'The source of truth behind every customer answer.',
    },
  ];
  productItems.forEach(({ x, color, name, tagline }) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + 6, productRowY - 8, 6, 0, Math.PI * 2);
    context.fill();
    drawText(name, x + 24, productRowY, { size: 26, weight: 700 });
    drawText(tagline, x + 24, productRowY + 30, {
      size: 20,
      weight: 600,
      color: '#5D6678',
      maxWidth: 480,
      lineHeight: 23,
    });
  });

  drawText('https://neelvara.com', 1130, 566, {
    size: 17,
    weight: 600,
    color: '#1457D9',
    align: 'right',
  });
  context.textAlign = 'left';

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
