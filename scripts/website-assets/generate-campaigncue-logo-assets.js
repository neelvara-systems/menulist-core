const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Run with: node scripts/website-assets/generate-campaigncue-logo-assets.js
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(ROOT, 'public', 'campaigncue-icon.svg');

const SOURCE_WIDTH = 966;
const SOURCE_HEIGHT = 701;
const ICON_SIZES = [16, 32, 48, 96, 128, 180, 192, 512];
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

const SPLASH_BACKGROUND = '#fbf7fa';
const MASKABLE_BACKGROUND = '#fbf7fa';
const CAMPAIGNCUE_NAVY = '#011b6d';
const CAMPAIGNCUE_DEEP_NAVY = '#020c4f';
const CAMPAIGNCUE_ROSE = '#d96e9b';
const CAMPAIGNCUE_SOFT_ROSE = '#f4d2e2';

function outputPath(relativePath) {
  return path.join(ROOT, relativePath);
}

function fitContain(targetWidth, targetHeight, sourceWidth = SOURCE_WIDTH, sourceHeight = SOURCE_HEIGHT) {
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

async function loadSourceImage() {
  const sourceSvg = fs.readFileSync(SOURCE_SVG, 'utf8');
  return loadImage(Buffer.from(sourceSvg));
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

function renderLogo(image, width, height, options = {}) {
  const {
    background,
    paddingRatio = 0.12,
  } = options;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const paddingX = width * paddingRatio;
  const paddingY = height * paddingRatio;
  const placement = fitContain(
    width - paddingX * 2,
    height - paddingY * 2,
    image.width || SOURCE_WIDTH,
    image.height || SOURCE_HEIGHT,
  );

  context.drawImage(
    image,
    paddingX + placement.x,
    paddingY + placement.y,
    placement.width,
    placement.height,
  );

  return canvas.toBuffer('image/png');
}

function renderSplash(image, width, height) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = SPLASH_BACKGROUND;
  context.fillRect(0, 0, width, height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const logoBoxWidth = width * 0.58;
  const logoBoxHeight = height * 0.16;
  const placement = fitContain(logoBoxWidth, logoBoxHeight, image.width || SOURCE_WIDTH, image.height || SOURCE_HEIGHT);
  const x = (width - placement.width) / 2;
  const y = Math.round(height * 0.42 - placement.height / 2);

  context.drawImage(image, x, y, placement.width, placement.height);

  return canvas.toBuffer('image/png');
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
}

function renderOgImage(image) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.62, SPLASH_BACKGROUND);
  gradient.addColorStop(1, '#f9eaf2');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(217, 110, 155, 0.12)';
  context.fillRect(0, 0, 1200, 18);
  context.fillStyle = 'rgba(1, 27, 109, 0.08)';
  context.fillRect(0, 612, 1200, 18);

  context.fillStyle = '#ffffff';
  context.shadowColor = 'rgba(1, 27, 109, 0.10)';
  context.shadowBlur = 42;
  context.shadowOffsetY = 16;
  drawRoundedRect(context, 72, 72, 1056, 486, 26);
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  const logoPlacement = fitContain(260, 188, image.width || SOURCE_WIDTH, image.height || SOURCE_HEIGHT);
  context.drawImage(image, 100 + logoPlacement.x, 112 + logoPlacement.y, logoPlacement.width, logoPlacement.height);

  context.fillStyle = CAMPAIGNCUE_NAVY;
  context.font = '700 76px Arial, sans-serif';
  context.fillText('CampaignCue', 392, 198);

  context.fillStyle = CAMPAIGNCUE_DEEP_NAVY;
  context.font = '700 34px Arial, sans-serif';
  context.fillText('Daily campaign desk for local businesses', 392, 270);

  context.fillStyle = 'rgba(48, 58, 121, 0.92)';
  context.font = '500 28px Arial, sans-serif';
  context.fillText('Decide what to promote, prepare the pack, check the facts,', 392, 335);
  context.fillText('export it manually, and remember what worked.', 392, 380);

  const chips = ['Today cue', 'Campaign pack', 'Trust check', 'Manual export'];
  let x = 392;
  for (const [index, chip] of chips.entries()) {
    const chipWidth = [142, 188, 154, 176][index];
    context.fillStyle = index === 0 ? CAMPAIGNCUE_ROSE : CAMPAIGNCUE_SOFT_ROSE;
    drawRoundedRect(context, x, 436, chipWidth, 54, 18);
    context.fillStyle = index === 0 ? '#ffffff' : CAMPAIGNCUE_NAVY;
    context.font = '700 21px Arial, sans-serif';
    context.fillText(chip, x + 22, 470);
    x += chipWidth + 14;
  }

  return canvas.toBuffer('image/png');
}

async function main() {
  const sourceImage = await loadSourceImage();

  writePng('public/campaigncue-logo-mark.png', renderLogo(sourceImage, 1024, 1024, { paddingRatio: 0.14 }));
  writePng('public/campaigncue-logo-mark-wide.png', renderLogo(sourceImage, 1024, 744, { paddingRatio: 0.06 }));

  for (const size of ICON_SIZES) {
    const iconPng = renderLogo(sourceImage, size, size, { paddingRatio: 0.12 });
    writePng(`public/campaigncue-icon-${size}.png`, iconPng);

    if (size === 192 || size === 512) {
      writePng(
        `public/campaigncue-icon-maskable-${size}.png`,
        renderLogo(sourceImage, size, size, {
          background: MASKABLE_BACKGROUND,
          paddingRatio: 0.22,
        }),
      );
    }

    if (size === 16 || size === 32) {
      writePng(`public/campaigncue-favicon-${size}.png`, iconPng);
    }

    if (size === 180) {
      writePng('public/campaigncue-apple-touch-icon.png', iconPng);
    }

    if (size === 32) {
      writeIco('public/campaigncue-favicon.ico', iconPng, size, size);
    }
  }

  for (const size of SPLASH_SIZES) {
    const [width, height] = size.split('x').map(Number);
    writePng(`public/campaigncue-splash/apple-splash-${size}.png`, renderSplash(sourceImage, width, height));
  }

  writePng('public/campaigncue-og-image.png', renderOgImage(sourceImage));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
