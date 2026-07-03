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

const projectsDal = read('src/database/projects/index.ts');
const storageRules = read('storage.rules');
const tracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
const uploadImpl = read('__docs__/projects/upload-file-processing/upload-file-processing_impl.md');
const extractionSecurityAudit = read('__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md');
const packageJson = JSON.parse(read('package.json'));

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

assert(
  packageJson.scripts?.['verify:storage-paths'] === 'node scripts/verification/verify-storage-path-hardening.js',
  'package.json exposes verify:storage-paths',
);

if (failures > 0) {
  console.error(`\nStorage path hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nStorage path hardening verification passed.');
