#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(haystack, needle, message) {
  assert(haystack.includes(needle), message);
}

const nextConfig = read('next.config.js');
const packageJson = JSON.parse(read('package.json'));
const proxy = read('src/proxy.ts');
const myCodexDocs = read('src/lib/mycodex/docs.ts');
const runtimeCredentialReaders = [
  'src/lib/firebase/answerlatticeFirebaseAdmin.ts',
  'src/lib/firebase/campaigncueFirebaseAdmin.ts',
  'src/lib/firebase/signaldeskFirebaseAdmin.ts',
];
const dynamicHeaderPages = [
  'src/app/(campaigncue)/campaigncue/app/page.tsx',
  'src/app/sites/campaigncue/page.tsx',
  'src/app/sites/campaigncue/features/[featureSlug]/page.tsx',
  'src/app/sites/campaigncue/use-cases/small-business/page.tsx',
];

assert(
  !nextConfig.includes('MenuListServerChunkCompatPlugin'),
  'The retired Next 14 server-chunk compatibility plugin must not return.',
);
assert(
  !nextConfig.includes('next/dist/'),
  'next.config.js must not import private Next.js implementation modules.',
);
assert(
  !exists('src/pages/_app.tsx')
    && !exists('src/pages/_document.tsx')
    && !exists('src/pages/_error.tsx'),
  'App Router builds must use native Next 16 error/document handling without obsolete Pages-only shims.',
);
assertIncludes(
  nextConfig,
  'turbopack: {',
  'Next 16 must keep an explicit top-level Turbopack configuration.',
);
assertIncludes(
  nextConfig,
  "loaders: ['@svgr/webpack']",
  'Turbopack must preserve the existing SVG component import contract.',
);
assertIncludes(
  nextConfig,
  "const { withSerwist } = await import('@serwist/turbopack');",
  'The supported Serwist Turbopack integration must wrap the Next config.',
);
assert(
  packageJson.scripts?.build?.includes('next build')
    && !packageJson.scripts.build.includes('--webpack'),
  'The default production build must exercise Next 16 Turbopack.',
);
assert(
  packageJson.scripts?.['build:webpack']?.includes('next build --webpack'),
  'A full Webpack parity build must remain available.',
);
assert(
  packageJson.scripts?.['build:vercel']?.includes('--max-old-space-size=4096')
    && !packageJson.scripts['build:vercel'].includes('--max-old-space-size=6144'),
  'The Vercel Turbopack build must leave native compiler headroom inside the 8 GiB build container.',
);
assertIncludes(
  nextConfig,
  'serverSourceMaps: false',
  'Production server source maps must remain disabled to bound build memory.',
);
assertIncludes(
  myCodexDocs,
  'path.resolve(/* turbopackIgnore: true */ targetPath)',
  'MyCodex runtime document resolution must not make Turbopack trace the whole repository.',
);
assertIncludes(
  myCodexDocs,
  'fs.readdir(/* turbopackIgnore: true */ dirPath',
  'MyCodex runtime document traversal must rely on explicit output tracing includes.',
);
for (const relPath of runtimeCredentialReaders) {
  const source = read(relPath);
  assertIncludes(
    source,
    'path.join(/* turbopackIgnore: true */ process.cwd(), credentialPath)',
    `${relPath} runtime credential path must not create a whole-repository Turbopack trace`,
  );
  assertIncludes(
    source,
    'fs.readFileSync(/* turbopackIgnore: true */ resolvedPath',
    `${relPath} runtime credential read must remain excluded from build-time asset discovery`,
  );
}
assertIncludes(proxy, 'export async function proxy(', 'Next 16 proxy convention');
assert(!exists('src/middleware.ts'), 'The deprecated middleware convention must remain removed.');

for (const relPath of dynamicHeaderPages) {
  const source = read(relPath);
  assertIncludes(source, 'export const dynamic =', `${relPath} dynamic rendering boundary`);
  if (source.includes('headers()')) {
    assertIncludes(source, 'await headers()', `${relPath} async request-header contract`);
  }
}

console.log('Next 16 build compatibility contract verified.');
