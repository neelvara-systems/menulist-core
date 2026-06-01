const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'answerlattice-logo.svg');
const OG_SVG = path.join(ROOT, 'public', 'answerlattice-og-image.svg');

const SVG_WIDTH = 8367;
const SVG_HEIGHT = 5131;

const ICON_SIZES = [16, 32, 48, 96, 128, 180, 192, 512];

function outputPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function fitContain(targetWidth, targetHeight, sourceWidth = SVG_WIDTH, sourceHeight = SVG_HEIGHT) {
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

async function renderSvgBuffer(svgBuffer, width, height, background) {
  const image = await loadImage(svgBuffer);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const placement = fitContain(width, height, image.width || SVG_WIDTH, image.height || SVG_HEIGHT);
  context.drawImage(image, placement.x, placement.y, placement.width, placement.height);

  return canvas.toBuffer('image/png');
}

function writePng(relativePath, buffer) {
  const fullPath = outputPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  console.log(`wrote ${relativePath}`);
}

function writeIco(relativePath, pngBuffer, width, height) {
  const fullPath = outputPath(relativePath);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory.writeUInt8(width >= 256 ? 0 : width, 0);
  directory.writeUInt8(height >= 256 ? 0 : height, 1);
  directory.writeUInt8(0, 2);
  directory.writeUInt8(0, 3);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngBuffer.length, 8);
  directory.writeUInt32LE(header.length + directory.length, 12);

  fs.writeFileSync(fullPath, Buffer.concat([header, directory, pngBuffer]));
  console.log(`wrote ${relativePath}`);
}

function refreshOgSvg(sourceSvg) {
  const encodedLogo = Buffer.from(sourceSvg).toString('base64');
  const ogSvg = fs.readFileSync(OG_SVG, 'utf8').replace(
    /href="data:image\/svg\+xml;base64,[^"]+"/,
    `href="data:image/svg+xml;base64,${encodedLogo}"`,
  );

  fs.writeFileSync(OG_SVG, ogSvg);
  console.log('wrote public/answerlattice-og-image.svg');
  return ogSvg;
}

async function main() {
  const sourceSvg = fs.readFileSync(SOURCE_SVG, 'utf8');
  const sourceBuffer = Buffer.from(sourceSvg);

  writePng('public/answerlattice-logo-mark.png', await renderSvgBuffer(sourceBuffer, 1024, 1024));
  writePng('public/answerlattice-logo-mark-wide.png', await renderSvgBuffer(sourceBuffer, 1024, 633));

  for (const size of ICON_SIZES) {
    const iconPng = await renderSvgBuffer(sourceBuffer, size, size);
    writePng(`public/answerlattice-icon-${size}.png`, iconPng);

    if (size === 192 || size === 512) {
      writePng(`public/answerlattice-icon-maskable-${size}.png`, iconPng);
    }

    if (size === 16 || size === 32) {
      writePng(`public/answerlattice-favicon-${size}.png`, iconPng);
    }

    if (size === 180) {
      writePng('public/answerlattice-apple-touch-icon.png', iconPng);
    }

    if (size === 32) {
      writeIco('public/answerlattice-favicon.ico', iconPng, size, size);
    }
  }

  const refreshedOgSvg = refreshOgSvg(sourceSvg);
  writePng('public/answerlattice-og-image.png', await renderSvgBuffer(Buffer.from(refreshedOgSvg), 1200, 630, '#070714'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
