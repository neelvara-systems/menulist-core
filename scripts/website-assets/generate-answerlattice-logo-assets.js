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

async function renderOgBuffer(sourceBuffer) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.fillStyle = '#070714';
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(94, 234, 212, 0.12)';
  for (let y = 6; y < height; y += 64) {
    for (let x = 6; x < width; x += 64) {
      context.beginPath();
      context.arc(x, y, 2, 0, Math.PI * 2);
      context.fill();
    }
  }

  const rightGlow = context.createRadialGradient(978, 116, 0, 978, 116, 258);
  rightGlow.addColorStop(0, 'rgba(6, 78, 59, 0.56)');
  rightGlow.addColorStop(1, 'rgba(6, 78, 59, 0)');
  context.fillStyle = rightGlow;
  context.fillRect(720, 0, 480, 374);

  const leftGlow = context.createRadialGradient(170, 535, 0, 170, 535, 220);
  leftGlow.addColorStop(0, 'rgba(15, 118, 110, 0.24)');
  leftGlow.addColorStop(1, 'rgba(15, 118, 110, 0)');
  context.fillStyle = leftGlow;
  context.fillRect(0, 315, 390, 315);

  const logo = await loadImage(sourceBuffer);
  const logoPlacement = fitContain(150, 93, logo.width || SVG_WIDTH, logo.height || SVG_HEIGHT);
  context.drawImage(logo, 82 + logoPlacement.x, 82 + logoPlacement.y, logoPlacement.width, logoPlacement.height);

  const titleGradient = context.createLinearGradient(82, 0, 650, 0);
  titleGradient.addColorStop(0, '#ffffff');
  titleGradient.addColorStop(0.52, '#ccfbf1');
  titleGradient.addColorStop(1, '#5eead4');

  context.textBaseline = 'alphabetic';
  context.fillStyle = titleGradient;
  context.font = '800 78px Arial, Helvetica, sans-serif';
  context.fillText('Answerlattice', 82, 245);

  context.fillStyle = '#ffffff';
  context.font = '700 56px Arial, Helvetica, sans-serif';
  context.fillText('The governed source behind customer', 82, 330);
  context.fillText('answers.', 82, 394);

  context.fillStyle = '#a0a0c0';
  context.font = '400 25px Arial, Helvetica, sans-serif';
  context.fillText('Keep approved product knowledge structured, reviewable, and current', 82, 462);
  context.fillText('across support, docs, search, and AI-assisted surfaces.', 82, 495);

  context.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(82, 555);
  context.lineTo(1118, 555);
  context.stroke();

  context.fillStyle = '#5eead4';
  context.font = '800 24px Arial, Helvetica, sans-serif';
  context.fillText('answerlattice.com', 82, 590);

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

function replaceEmbeddedLogo(existingOgSvg, sourceSvg) {
  const encodedLogo = Buffer.from(sourceSvg).toString('base64');
  const embeddedLogoPattern = /href="data:image\/svg\+xml;base64,[^"]+"/g;
  const embeddedLogos = existingOgSvg.match(embeddedLogoPattern) || [];
  if (embeddedLogos.length !== 1) {
    throw new Error(`Expected exactly one embedded Answerlattice logo; found ${embeddedLogos.length}`);
  }
  return existingOgSvg.replace(
    embeddedLogoPattern,
    `href="data:image/svg+xml;base64,${encodedLogo}"`,
  );
}

function refreshOgSvg(sourceSvg) {
  const existingOgSvg = fs.readFileSync(OG_SVG, 'utf8');
  const ogSvg = replaceEmbeddedLogo(existingOgSvg, sourceSvg);
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

  refreshOgSvg(sourceSvg);
  writePng('public/answerlattice-og-image.png', await renderOgBuffer(sourceBuffer));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  replaceEmbeddedLogo,
};
