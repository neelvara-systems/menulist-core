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
const fontPresetsDal = read('src/database/static/fontPresets.ts');
const base64StorageHelper = read('src/database/storage/uploadBase64ToStorage.ts');
const storagePathGenerator = read('src/lib/storage/pathGenerator.ts');
const notesDal = read('src/database/notes/index.ts');
const storageRules = read('storage.rules');
const tracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
const uploadImpl = read('__docs__/projects/upload-file-processing/upload-file-processing_impl.md');
const extractionSecurityAudit = read('__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md');
const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const packageJson = JSON.parse(read('package.json'));

verifyMenuListBrowserSurfacesDoNotMutateStorageDirectly();

[
  "throw new TypeError(`invalid_storage_${field}_scope`)",
  "throw new TypeError('invalid_storage_file_id_segment')",
  "const tenantId = normalizeStorageScopeId(options.session?.tId, 'tenant')",
  "const storeId = normalizeStorageScopeId(options.session?.sId, 'store')",
  "const fileId = normalizeStorageFileId(options.fileId)",
].forEach((token) => {
  assert(storagePathGenerator.includes(token), `shared Storage path generator fails closed with token ${token}`);
});
[
  'ECOMSAI_PLATFORM_TENANT_ID',
  'ECOMSAI_PLATFORM_STORE_ID',
  'useDefaults',
  "tenantId = 'unknown'",
  "storeId = 'default'",
].forEach((token) => {
  assert(!storagePathGenerator.includes(token), `shared Storage path generator rejects retired fallback token ${token}`);
});

[
  'const requireNoteDocumentId = (value: unknown): string =>',
  'const getNoteAttachmentFileId = (label: unknown, index: number): string =>',
  'const storageFileId = `${requireNoteDocumentId(noteId)}/${fileId}`;',
  'docRef.id,',
  'const documentUpdate = composeRequestBody({ documents }, session, { isNew: false });',
  "await cleanupNewNoteAttachments(uploadedUrls, 'create');",
  "await cleanupNewNoteAttachments(uploadedUrls, 'update');",
  "logRuntimeFailure('note_create_compensation_failed'",
].forEach((token) => {
  assert(notesDal.includes(token), `notes attachment lifecycle uses captured scoped path/compensation token ${token}`);
});
assert(
  !notesDal.includes('const docId = `${data.id}/${fileId}`;'),
  'notes attachment path must not read an omitted data.id field',
);
assert(
  !notesDal.includes('await updateNote({ documents: submitData.documents, id: docRef.id })'),
  'note create must not re-resolve active session through updateNote after its first write',
);

assert(
  !staticAssetsDal.includes('menulist-qa.appspot.com'),
  'static asset preview cleanup must not key replacement deletes to the QA Storage bucket',
);
[
  'const FIREBASE_STORAGE_DOWNLOAD_HOSTS = new Set',
  'const isFirebaseStorageReference = (value: unknown): value is string',
  'trimmedValue.startsWith("gs://")',
  'FIREBASE_STORAGE_DOWNLOAD_HOSTS.has(url.hostname)',
  'url.hostname.endsWith(".firebasestorage.app")',
  'const prepareAssetPreview = async (',
  'const persistPreparedAsset = async <T>(',
  "'static_asset_replaced_preview_cleanup_failed'",
  "'static_asset_failed_write_preview_cleanup_failed'",
  'const result = await persist(prepared.data);',
  '[prepared.previousPreview]',
  '[prepared.uploadedPreview]',
].forEach((token) => {
  assert(staticAssetsDal.includes(token), `static asset preview replacement uses ordered bucket-neutral compensation token ${token}`);
});

assert(
  !staticAssetsDal.includes('if (isFirebaseStorageReference(data.preview)) await deleteFileByUrl(data.preview);'),
  'static asset preview replacement must not delete the old object before the new upload and Firestore write commit',
);

[
  '| "ttf" | "otf" | "woff" | "woff2"',
  "contentType: 'font/woff2'",
  "contentType: 'font/woff'",
  "contentType: 'font/otf'",
  "contentType: 'font/ttf'",
].forEach((token) => {
  assert(base64StorageHelper.includes(token), `base64 Storage helper preserves font format token ${token}`);
});

[
  'const uploadFontDataUrl = async',
  'if (!isDataUrl(font.fileUrl)) return null;',
  'font_preset_failed_create_cleanup_failed',
  'font_preset_failed_update_cleanup_failed',
  'font_preset_replaced_file_cleanup_failed',
  'await deleteDoc(fontRef);',
  'font_preset_delete_file_cleanup_failed',
  'font_preset_sort_set_mismatch',
].forEach((token) => {
  assert(fontPresetsDal.includes(token), `font preset persistence/storage boundary includes ${token}`);
});
assert(!fontPresetsDal.includes('type: "jpeg"'), 'font preset uploads must not be mislabeled as JPEG');

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
  packageJson.scripts?.['verify:storage-paths'] === 'node scripts/verification/verify-storage-path-hardening.js && npm run test:storage-path-boundary',
  'package.json exposes verify:storage-paths',
);
assert(
  packageJson.scripts?.['test:storage-path-boundary'] === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/test-storage-path-boundary.ts',
  'package.json exposes the executable Storage path regression',
);

if (failures > 0) {
  console.error(`\nStorage path hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nStorage path hardening verification passed.');
