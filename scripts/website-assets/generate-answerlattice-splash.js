const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_LOGO = path.join(ROOT, 'public', 'answerlattice-logo-mark-wide.png');
const OUTPUT_DIR = path.join(ROOT, 'public', 'answerlattice-splash');

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

const BASE = [7, 7, 20];
const VIOLET = [83, 72, 190];
const INDIGO = [32, 32, 84];
const CYAN = [194, 224, 222];

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function radial(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt((dx * dx) + (dy * dy));
  if (distance >= radius) return 0;
  const t = 1 - (distance / radius);
  return t * t * (3 - (2 * t));
}

function writeBackground(png) {
  const centerX = png.width * 0.5;
  const centerY = png.height * 0.45;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = ((png.width * y) + x) << 2;
      const cyanGlow = radial(x, y, centerX - (png.width * 0.08), centerY - (png.height * 0.02), png.width * 0.43);
      const violetGlow = radial(x, y, centerX + (png.width * 0.08), centerY + (png.height * 0.02), png.width * 0.48);
      const baseLift = radial(x, y, centerX, centerY, png.width * 0.62);

      png.data[index] = clampChannel(BASE[0] + (CYAN[0] * cyanGlow * 0.14) + (VIOLET[0] * violetGlow * 0.18) + (INDIGO[0] * baseLift * 0.2));
      png.data[index + 1] = clampChannel(BASE[1] + (CYAN[1] * cyanGlow * 0.15) + (VIOLET[1] * violetGlow * 0.14) + (INDIGO[1] * baseLift * 0.2));
      png.data[index + 2] = clampChannel(BASE[2] + (CYAN[2] * cyanGlow * 0.13) + (VIOLET[2] * violetGlow * 0.2) + (INDIGO[2] * baseLift * 0.2));
      png.data[index + 3] = 255;
    }
  }
}

function sampleBilinear(source, sourceX, sourceY) {
  const x0 = Math.max(0, Math.min(source.width - 1, Math.floor(sourceX)));
  const y0 = Math.max(0, Math.min(source.height - 1, Math.floor(sourceY)));
  const x1 = Math.max(0, Math.min(source.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(source.height - 1, y0 + 1));
  const tx = sourceX - x0;
  const ty = sourceY - y0;

  const i00 = ((source.width * y0) + x0) << 2;
  const i10 = ((source.width * y0) + x1) << 2;
  const i01 = ((source.width * y1) + x0) << 2;
  const i11 = ((source.width * y1) + x1) << 2;
  const result = [0, 0, 0, 0];

  for (let channel = 0; channel < 4; channel += 1) {
    const top = (source.data[i00 + channel] * (1 - tx)) + (source.data[i10 + channel] * tx);
    const bottom = (source.data[i01 + channel] * (1 - tx)) + (source.data[i11 + channel] * tx);
    result[channel] = (top * (1 - ty)) + (bottom * ty);
  }

  return result;
}

function compositeLogo(target, source, drawX, drawY, drawWidth, drawHeight) {
  for (let y = 0; y < drawHeight; y += 1) {
    const targetY = drawY + y;
    if (targetY < 0 || targetY >= target.height) continue;

    for (let x = 0; x < drawWidth; x += 1) {
      const targetX = drawX + x;
      if (targetX < 0 || targetX >= target.width) continue;

      const sourceX = (x / Math.max(1, drawWidth - 1)) * (source.width - 1);
      const sourceY = (y / Math.max(1, drawHeight - 1)) * (source.height - 1);
      const [r, g, b, a] = sampleBilinear(source, sourceX, sourceY);
      const alpha = a / 255;
      if (alpha <= 0.01) continue;

      const index = ((target.width * targetY) + targetX) << 2;
      target.data[index] = clampChannel((r * alpha) + (target.data[index] * (1 - alpha)));
      target.data[index + 1] = clampChannel((g * alpha) + (target.data[index + 1] * (1 - alpha)));
      target.data[index + 2] = clampChannel((b * alpha) + (target.data[index + 2] * (1 - alpha)));
      target.data[index + 3] = 255;
    }
  }
}

function renderSplash(size, sourceLogo) {
  const [width, height] = size.split('x').map(Number);
  const png = new PNG({ width, height });
  writeBackground(png);

  const logoWidth = Math.round(Math.min(width * 0.52, 560));
  const logoHeight = Math.round(logoWidth * (sourceLogo.height / sourceLogo.width));
  const drawX = Math.round((width - logoWidth) / 2);
  const drawY = Math.round((height * 0.46) - (logoHeight / 2));

  compositeLogo(png, sourceLogo, drawX, drawY, logoWidth, logoHeight);

  return png;
}

function main() {
  if (!fs.existsSync(SOURCE_LOGO)) {
    throw new Error(`Missing source logo: ${SOURCE_LOGO}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sourceLogo = PNG.sync.read(fs.readFileSync(SOURCE_LOGO));

  for (const size of SPLASH_SIZES) {
    const png = renderSplash(size, sourceLogo);
    const outputPath = path.join(OUTPUT_DIR, `apple-splash-${size}.png`);
    fs.writeFileSync(outputPath, PNG.sync.write(png));
    console.log(`wrote ${path.relative(ROOT, outputPath)}`);
  }
}

main();
