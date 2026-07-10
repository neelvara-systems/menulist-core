#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const jobs = [
  {
    slug: 'menulist-business-truth-loop',
    source: '__docs__/videos/hyperframes/menulist-business-truth-loop/renders/menulist-business-truth-loop-source.mp4',
    webm: 'public/images/website/menulist-business-truth-loop.webm',
    mp4: 'public/images/website/menulist-business-truth-loop.mp4',
    poster: 'public/images/website/menulist-business-truth-loop-poster.webp',
    posterFormat: 'webp',
    webmCrf: '39',
    mp4Crf: '29',
    posterScale: '1280:720',
  },
  {
    slug: 'answerlattice-support-control-motion',
    source: '__docs__/videos/hyperframes/answerlattice-support-control-motion/renders/answerlattice-support-control-motion-source.mp4',
    webm: 'public/answerlattice-support-control-motion.webm',
    mp4: 'public/answerlattice-support-control-motion.mp4',
    poster: 'public/answerlattice-support-control-motion-poster.png',
    posterFormat: 'png',
    webmCrf: '40',
    mp4Crf: '30',
    posterScale: '800:450',
  },
  {
    slug: 'answerlattice-authority-transfer',
    source: '__docs__/videos/hyperframes/answerlattice-authority-transfer/renders/answerlattice-authority-transfer-source.mp4',
    webm: 'public/answerlattice-authority-transfer.webm',
    mp4: 'public/answerlattice-authority-transfer.mp4',
    poster: 'public/answerlattice-authority-transfer-poster.png',
    posterFormat: 'png',
    webmCrf: '40',
    mp4Crf: '30',
    posterScale: '800:450',
  },
  {
    slug: 'answerlattice-page-aware-widget-clip',
    source: '__docs__/videos/hyperframes/answerlattice-page-aware-widget-clip/renders/answerlattice-page-aware-widget-clip-source.mp4',
    webm: 'public/answerlattice-page-aware-widget-clip.webm',
    mp4: 'public/answerlattice-page-aware-widget-clip.mp4',
    poster: 'public/answerlattice-page-aware-widget-clip-poster.png',
    posterFormat: 'png',
    webmCrf: '40',
    mp4Crf: '30',
    posterScale: '800:450',
  },
];

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function ensureParent(relativePath) {
  fs.mkdirSync(path.dirname(repoPath(relativePath)), { recursive: true });
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with status ${result.status}`);
  }
}

function transcodeWebm(job) {
  ensureParent(job.webm);
  runFfmpeg([
    '-i',
    job.source,
    '-an',
    '-vf',
    'scale=1280:720:flags=lanczos,fps=30',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    job.webmCrf,
    '-deadline',
    'good',
    '-row-mt',
    '1',
    '-pix_fmt',
    'yuv420p',
    job.webm,
  ]);
}

function transcodeMp4(job) {
  ensureParent(job.mp4);
  runFfmpeg([
    '-i',
    job.source,
    '-an',
    '-vf',
    'scale=1280:720:flags=lanczos,fps=30',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    job.mp4Crf,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    job.mp4,
  ]);
}

function transcodePoster(job) {
  ensureParent(job.poster);
  const baseArgs = ['-ss', '3', '-i', job.source, '-frames:v', '1', '-vf', `scale=${job.posterScale}:flags=lanczos`];

  if (job.posterFormat === 'webp') {
    runFfmpeg([...baseArgs, '-c:v', 'libwebp', '-quality', '76', job.poster]);
    return;
  }

  runFfmpeg([...baseArgs, '-update', '1', '-compression_level', '9', job.poster]);
}

for (const job of jobs) {
  if (!fs.existsSync(repoPath(job.source))) {
    throw new Error(`Missing source render for ${job.slug}: ${job.source}`);
  }

  console.log(`Transcoding ${job.slug}`);
  transcodeWebm(job);
  transcodeMp4(job);
  transcodePoster(job);
}

console.log(`Transcoded ${jobs.length} AssetOS motion asset set(s).`);
