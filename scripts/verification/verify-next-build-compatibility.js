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
const razorpayDiagnostics = read('src/lib/billing/razorpayDiagnostics.ts');
const feedbackDal = read('src/database/feedback/index.ts');
const sessionUserDocumentId = read('src/lib/auth/sessionUserDocumentId.ts');
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const proxy = read('src/proxy.ts');
const myCodexDocs = read('src/lib/mycodex/docs.ts');
const firebaseAdminLock = packageLock.packages?.['node_modules/firebase-admin'];
const jwksRsaLock = packageLock.packages?.['node_modules/jwks-rsa'];
const nestedJoseLock = packageLock.packages?.['node_modules/jwks-rsa/node_modules/jose'];
const serverExternalPackagesBlock = nextConfig.match(
  /serverExternalPackages:\s*\[([\s\S]*?)\],/,
)?.[1] || '';
const webpackServerExternalsBlock = nextConfig.match(
  /if \(isServer\) \{([\s\S]*?)\/\/ Prevent server-only modules/,
)?.[1] || '';
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
    && !packageJson.scripts['build:vercel'].includes('--max-old-space-size=6144')
    && packageJson.scripts['build:vercel'].includes('npm run verify:next-deployment-bundle'),
  'The Vercel Turbopack build must leave native compiler headroom inside the 8 GiB build container.',
);
assert(
  !nextConfig.includes("'node_modules/@swc/**'"),
  'Do not globally exclude @swc from output tracing; Next 16 server routes require @swc/helpers after deployment.',
);
assertIncludes(
  nextConfig,
  "'node_modules/@swc/core/**'",
  'Compiler-only SWC packages may remain excluded without removing the runtime helpers.',
);
assertIncludes(
  nextConfig,
  "transpilePackages: ['antd-mobile', 'firebase-admin', 'pdfjs-dist']",
  'Firebase Admin must be bundled so jwks-rsa does not native-require ESM-only jose in deployed routes.',
);
assert(
  packageJson.engines?.node === '22' && read('.nvmrc').trim() === '22.23.1',
  'The root runtime must remain on the Node 22.23.1 line required by Firebase Admin 14 and jwks-rsa 4.',
);
assert(
  firebaseAdminLock?.version === '14.2.0'
    && firebaseAdminLock.dependencies?.['jwks-rsa'] === '^4.0.1',
  'The frozen Firebase Admin 14.2.0 to jwks-rsa 4 dependency contract changed; perform an explicit migration review.',
);
assert(
  jwksRsaLock?.version === '4.1.0'
    && jwksRsaLock.dependencies?.jose === '^6.1.3'
    && jwksRsaLock.engines?.node === '^20.19.0 || ^22.12.0 || >= 23.0.0',
  'The frozen jwks-rsa 4.1.0 CommonJS boundary changed; perform an explicit migration review.',
);
assert(
  nestedJoseLock?.version === '6.2.4',
  'The frozen ESM-only jose dependency beneath jwks-rsa changed; perform an explicit migration review.',
);
assert(
  packageJson.overrides?.['jwks-rsa'] === undefined
    && packageJson.overrides?.jose === undefined,
  'Do not downgrade or override jwks-rsa/jose to hide the module boundary; use the supported Next server bundle contract.',
);
assert(
  !serverExternalPackagesBlock.includes("'firebase-admin'"),
  'Firebase Admin must not be explicitly server-externalized.',
);
assertIncludes(
  razorpayDiagnostics,
  "from '@lib/auth/sessionUserDocumentId'",
  'Shared billing diagnostics must use the pure session identity boundary.',
);
assert(
  !razorpayDiagnostics.includes("from '@lib/auth/currentPlatformUser'"),
  'Shared billing diagnostics must not pull Firebase Admin current-user authority into browser graphs.',
);
assert(
  !sessionUserDocumentId.includes('firebaseAdmin')
    && !sessionUserDocumentId.includes('firebase-admin'),
  'The browser-safe session identity projector must remain free of Firebase Admin imports.',
);
assertIncludes(
  feedbackDal,
  "from '@lib/auth/sessionUserDocumentId'",
  'Shared feedback DAL must use the browser-safe session identity projector.',
);
assert(
  !feedbackDal.includes("from '@lib/auth/currentPlatformUser'"),
  'Shared feedback DAL must not pull Firebase Admin current-user authority into browser graphs.',
);
assert(
  !webpackServerExternalsBlock.includes("'firebase-admin'")
    && !webpackServerExternalsBlock.includes('firebaseAdminClientAliases'),
  'The Webpack server path must not re-externalize Firebase Admin.',
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
