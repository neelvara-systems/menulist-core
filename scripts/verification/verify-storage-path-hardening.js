#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listSourceFiles(dir) {
  const absDir = path.join(repoRoot, dir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
      return listSourceFiles(relPath);
    }
    if (!/\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) return [];
    return [relPath];
  });
}

function listMenuListBrowserSurfaceFiles() {
  return [
    ...listSourceFiles('src/app'),
    ...listSourceFiles('src/components'),
  ].filter((relPath) => (
    !relPath.startsWith('src/app/api/')
    && !relPath.startsWith('src/app/sites/answerlattice/')
    && !relPath.includes('/answerlattice/')
  ));
}

function verifyMenuListBrowserSurfacesDoNotMutateStorageDirectly() {
  const mutationSymbols = [
    'deleteObject',
    'getDownloadURL',
    'getStorage',
    'ref',
    'uploadBytes',
    'uploadBytesResumable',
    'uploadString',
  ];
  const importPattern = /import\s+(?!type\b){([^}]+)}\s*from\s*['"](?:@firebase|firebase)\/storage['"]/gs;
  const namespaceImportPattern = /import\s+\*\s+as\s+\w+\s+from\s*['"](?:@firebase|firebase)\/storage['"]/;
  const failures = [];

  for (const relPath of listMenuListBrowserSurfaceFiles()) {
    const content = read(relPath);

    for (const match of content.matchAll(importPattern)) {
      const importedSymbols = match[1]
        .split(',')
        .map((entry) => entry.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      const importedMutationSymbols = importedSymbols.filter((symbol) => mutationSymbols.includes(symbol));
      if (importedMutationSymbols.length > 0) {
        failures.push(`${relPath}: imports ${importedMutationSymbols.join(', ')} from firebase/storage`);
      }
    }

    if (namespaceImportPattern.test(content)) {
      const usesMutationSymbol = mutationSymbols.some((symbol) => new RegExp(`\\.${symbol}\\s*\\(`).test(content));
      if (usesMutationSymbol) {
        failures.push(`${relPath}: imports firebase/storage namespace and calls a mutation helper`);
      }
    }
  }

  assert(
    failures.length === 0,
    failures.length > 0
      ? `MenuList browser surfaces must not import direct Firebase Storage mutation helpers; use storage DAL/helpers or API routes instead:\n${failures.join('\n')}`
      : 'MenuList browser surfaces must not import direct Firebase Storage mutation helpers; use storage DAL/helpers or API routes instead',
  );
}

const projectsDal = read('src/database/projects/index.ts');
const staticAssetsDal = read('src/database/static/static.ts');
const storageRules = read('storage.rules');
const tracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
const uploadImpl = read('__docs__/projects/upload-file-processing/upload-file-processing_impl.md');
const extractionSecurityAudit = read('__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md');
const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/CHANGELOG.md');
const packageJson = JSON.parse(read('package.json'));

verifyMenuListBrowserSurfacesDoNotMutateStorageDirectly();

assert(
  !staticAssetsDal.includes('menulist-qa.appspot.com'),
  'static asset preview cleanup must not key replacement deletes to the QA Storage bucket',
);
[
  'const FIREBASE_STORAGE_DOWNLOAD_HOSTS = new Set',
  'const isFirebaseStorageReference = (value: unknown): boolean',
  'trimmedValue.startsWith("gs://")',
  'FIREBASE_STORAGE_DOWNLOAD_HOSTS.has(url.hostname)',
  'url.hostname.endsWith(".firebasestorage.app")',
  'if (isFirebaseStorageReference(data.preview)) await deleteFileByUrl(data.preview);',
].forEach((token) => {
  assert(staticAssetsDal.includes(token), `static asset preview cleanup uses bucket-neutral Storage reference token ${token}`);
});

[
  'const getTenantScopedProjectUploadFileId',
  ".replace(/[^a-zA-Z0-9._-]+/g, '-')",
  'const storageFileType = type || "files";',
  'const session = await getActiveSession();',
  'path: generateStoragePath({',
  'collection: DATA_COLLECTION,',
  'fileType: storageFileType,',
  'fileId: storageFileId,',
].forEach((token) => {
  assert(projectsDal.includes(token), `projects DAL hardens project upload fallback token ${token}`);
});

assert(
  !projectsDal.includes('path: `${DATA_COLLECTION}/${type}/${docId}`'),
  'projects DAL no longer writes uploadProjectFile fallback to flat project/type/projectId path',
);
assert(
  storageRules.includes('match /projects/{fileType}/{tId}/{sId}/{fileId}'),
  'Storage rules expose tenant-scoped projects path',
);
assert(
  storageRules.includes('belongsToStore(tId, sId)'),
  'Storage rules enforce store ownership on scoped project paths',
);
assert(
  storageRules.includes('match /MenuListAi/project/files/{fileId}'),
  'Storage rules still acknowledge legacy project files path for read compatibility',
);
const legacyProjectPathMatches = [
  'match /MenuListAi/project/files/{fileId}',
  'match /MenuListAi/project/generated/{projectId}/{fileId}',
  'match /MenuListAi/project/edited/{projectId}/{fileId}',
  'match /MenuListAi/project/custom/{projectId}/{fileId}',
];

legacyProjectPathMatches.forEach((token) => {
  assert(storageRules.includes(token), `Storage rules retain legacy project path read match ${token}`);
  assert(
    new RegExp(`${escapeRegExp(token)}\\s*\\{[\\s\\S]*?allow read: if isAuthenticated\\(\\);[\\s\\S]*?allow write, delete: if false;[\\s\\S]*?\\}`).test(storageRules),
    `Storage rules keep legacy project path read-only for ${token}`,
  );
});
assert(
  storageRules.includes('LEGACY PROJECT STORAGE PATTERN (READ-ONLY CUTOVER)'),
  'Storage rules label legacy project paths as read-only cutover',
);
assert(
  storageRules.includes('allow write, delete: if false;'),
  'Storage rules block legacy project path writes and deletes',
);
[
  'allow write: if isAuthenticated() && isValidImageOrDocumentUpload();',
  'allow write: if isAuthenticated() && isValidImageUpload();',
  'allow delete: if isAuthenticated();',
].forEach((token) => {
  assert(!storageRules.includes(token), `Storage rules must not permit legacy project path mutation token ${token}`);
});
assert(
  (storageRules.match(/allow write, delete: if false;/g) || []).length >= legacyProjectPathMatches.length,
  'Storage rules keep read-only legacy project mutation blocks',
);

[
  'current project fallback uploads write tenant-scoped paths',
  'legacy project Storage paths are read-only',
].forEach((token) => {
  assert(tracker.includes(token), `infrastructure tracker documents storage-path token ${token}`);
});

[
  'projects/files/{tId}/{sId}/{fileId}',
  'Legacy files may still exist under `MenuListAi/project/files/`',
].forEach((token) => {
  assert(uploadImpl.includes(token), `upload-file processing docs document storage-path token ${token}`);
});

[
  'July 2026 hardening note',
  'active project fallback uploads now route through `generateStoragePath()`',
  'Legacy project Storage paths are read-only',
].forEach((token) => {
  assert(extractionSecurityAudit.includes(token), `extraction security audit documents storage-path token ${token}`);
});

[
  'Browser surface Storage mutation boundary checkpoint',
  'scans active MenuList browser surfaces for direct Firebase Storage mutation helper imports',
  'Static asset preview cleanup bucket checkpoint',
  'no longer keys replacement-preview deletion to `menulist-qa.appspot.com`',
].forEach((token) => {
  assert(productionReadinessAudit.includes(token), `production audit documents browser Storage mutation boundary token ${token}`);
});

[
  'Browser Storage mutations are source-gated',
  '`npm run verify:storage-paths` now scans active MenuList browser surfaces for direct Firebase Storage mutation helper imports',
  'Static Asset Preview Cleanup Bucket Boundary',
  'replacement cleanup now detects Firebase Storage references generically',
].forEach((token) => {
  assert(changelog.includes(token), `changelog documents browser Storage mutation boundary token ${token}`);
});

assert(
  packageJson.scripts?.['verify:storage-paths'] === 'node scripts/verification/verify-storage-path-hardening.js',
  'package.json exposes verify:storage-paths',
);

if (failures > 0) {
  console.error(`\nStorage path hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nStorage path hardening verification passed.');
