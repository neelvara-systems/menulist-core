import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const source = path.join(repoRoot, 'public/images/website/menulist-business-truth-loop.mp4');
const outputDir = path.join(
  repoRoot,
  'packages/asset-factory/published/menulist/launch-video-frames',
);

const frames = [
  { id: 'approved-source', time: 0.7, filename: '01-approved-source.png' },
  { id: 'public-surfaces', time: 1.8, filename: '02-public-surfaces.png' },
  { id: 'stable-loop', time: 3.6, filename: '03-stable-loop.png' },
  { id: 'final-proof', time: 4.9, filename: '04-final-proof.png' },
];

if (!fs.existsSync(source)) {
  throw new Error(`Missing approved MenuList motion source: ${source}`);
}

fs.mkdirSync(outputDir, { recursive: true });

for (const frame of frames) {
  const output = path.join(outputDir, frame.filename);
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      frame.time.toFixed(2),
      '-i',
      source,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:720:flags=lanczos',
      output,
    ],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(`Failed to extract ${frame.filename}: ${result.stderr || 'ffmpeg failed'}`);
  }
}

const index = {
  source: path.relative(repoRoot, source),
  dataPolicy: 'Synthetic demo data only. Derived from the approved MenuList business-truth motion loop.',
  frames: frames.map((frame) => ({
    id: frame.id,
    timeSeconds: frame.time,
    file: path.relative(repoRoot, path.join(outputDir, frame.filename)),
  })),
};

fs.writeFileSync(path.join(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify(index, null, 2));
