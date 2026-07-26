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

const storageDeleteHelper = read('src/database/storage/deleteFromStorage.ts');
const legacyBlobUploadHelper = read('src/database/storage/uploadBlobFileToStorage.ts');
const legacyFontUploadHelper = read('src/database/storage/uploadFontToStorage.ts');
const legacyJsonUploadHelper = read('src/database/storage/uploadJSONToStorage.ts');
assert(
  storageDeleteHelper.includes('normalizeStorageDeleteTarget(url)'),
  'Storage delete helper must reject malformed runtime targets before Firebase reference construction',
);
assert(
  storageDeleteHelper.includes('normalizeStorageDeleteErrorCode(error)'),
  'Storage delete helper must project provider error codes into its declared response contract',
);
assert(
  storageDeleteHelper.includes('catch (error: unknown)'),
  'Storage delete helper must not erase provider failures with any',
);
assert(
  !storageDeleteHelper.includes('catch (error: any)'),
  'Storage delete helper must not restore an any-typed provider failure',
);
[
  ['blob', legacyBlobUploadHelper, 'normalizePlatformAssetBlob(fileData.url)'],
  ['font', legacyFontUploadHelper, 'normalizeFontUploadBytes(data.file)'],
  ['JSON', legacyJsonUploadHelper, 'serializeBoundedStorageJson(jsonData.data)'],
].forEach(([label, source, token]) => {
  assert(source.includes(token), `${label} legacy Storage helper must use its runtime upload boundary`);
  assert(!source.includes(': any'), `${label} legacy Storage helper must not restore any-typed input`);
});
assert(
  legacyBlobUploadHelper.includes('contentType: upload.contentType'),
  'Blob legacy Storage helper must preserve validated content type instead of relabeling every file as JPEG',
);
assert(
  legacyJsonUploadHelper.includes('{ contentType: "application/json" }'),
  'JSON legacy Storage helper must persist exact JSON metadata',
);

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
const base64UploadBoundary = read('src/lib/storage/base64UploadBoundary.ts');
const blobStorageHelper = read('src/database/storage/uploadBlobToStorage.ts');
const preparedMediaUpload = read('src/database/storage/uploadPreparedMediaImage.ts');
const mediaUploadBoundary = read('src/lib/media/mediaUploadBoundary.ts');
const adminImmutableObject = read('src/lib/storage/adminImmutableObject.ts');
const adminMediaUpload = read('src/database/storage/uploadBase64MediaImageAdmin.ts');
const imagePromptCache = read('src/lib/ai/imageGenerationPromptCache.ts');
const imageBatchResultView = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx');
const imageBatchRetentionBoundary = read('functions/src/schedulers/imageBatchRetentionBoundary.ts');
const obpMediaReferences = read('src/lib/media/obpMediaReferences.ts');
const obpPhotoStorage = read('src/database/stores/uploadOBPPhoto.ts');
const desktopBusinessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
const storesDal = read('src/database/stores/index.tsx');
const desktopOfficialPage = read('src/components/templates/main-app/projects/b2cView/index.tsx');
const mobileOfficialPage = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
const platformAssetDetails = read('src/components/templates/platform/assets/detailsModal.tsx');
const projectImageGeneration = read('src/lib/image/projectImageGeneration.ts');
const storagePathGenerator = read('src/lib/storage/pathGenerator.ts');
const notesDal = read('src/database/notes/index.ts');
const noteAttachmentBoundary = read('src/lib/notes/noteAttachmentBoundary.ts');
const tenantsDal = read('src/database/tenants/index.tsx');
const blogsDal = read('src/database/blogs/index.ts');
const storageReplacementBoundary = read('src/lib/storage/replacementUploadBoundary.ts');
const ticketsDal = read('src/database/tickets/index.ts');
const ticketAttachmentBoundary = read('src/lib/answerlattice/supportTicketAttachmentBoundary.ts');
const storageRules = read('storage.rules');
const databaseConstants = read('src/constants/database.ts');
const storesManagementImpl = read('__docs__/stores-management/stores-management_impl.md');
const tracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
const uploadImpl = read('__docs__/projects/upload-file-processing/upload-file-processing_impl.md');
const extractionSecurityAudit = read('__docs__/projects/ai-data-extraction/security-surface-audit-mar13-2026.md');
const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
const packageJson = JSON.parse(read('package.json'));

verifyMenuListBrowserSurfacesDoNotMutateStorageDirectly();

[
  'export async function createOrReuseBlobInStorage(',
  'created: false,',
  'existingMetadata = await getMetadata(storageRef);',
  'storageObjectMatchesUpload(existingMetadata, data)',
  "throw new Error('storage_immutable_object_identity_mismatch');",
  'url: await getDownloadURL(storageRef)',
  'throw uploadError;',
].forEach((token) => {
  assert(blobStorageHelper.includes(token), `immutable prepared-media upload helper preserves create-or-reuse token ${token}`);
});
[
  'createOrReuseBlobInStorage({',
  'resolvePreparedMediaIdentity({',
  'const selectedPreparedVariant = preparedVariants.find(',
  'variantUrls: [primaryUrl]',
].forEach((token) => {
  assert(preparedMediaUpload.includes(token), `prepared-media upload preserves immutable reuse token ${token}`);
});
assert(
  !preparedMediaUpload.includes('Promise.allSettled(preparedVariants.map'),
  'prepared-media upload does not write unused sibling variants',
);
[
  'export function resolvePreparedMediaIdentity({',
  "throw new Error('prepared_media_checksum_mismatch');",
  "throw new Error('prepared_media_identity_mismatch');",
].forEach((token) => {
  assert(mediaUploadBoundary.includes(token), `prepared-media identity boundary includes ${token}`);
});
[
  'cleanupUploadedMediaUrls(',
  'prepared_media_partial_variant_cleanup_failed',
].forEach((token) => {
  assert(!preparedMediaUpload.includes(token), `prepared-media upload rejects unsafe shared-path cleanup token ${token}`);
});
assert(
  /match \/media\/\{profile\}\/\{tId\}\/\{sId\}\/\{entityId\}\/\{fileId\}\s*\{[\s\S]*?allow write: if resource == null/.test(storageRules),
  'prepared-media Storage rules allow creation but deny immutable object overwrite',
);
assert(
  storageRules.includes("function isValidStaticImageType()")
    && /match \/media\/\{profile\}[\s\S]*?isValidStaticImageUpload\(\)/.test(storageRules),
  'prepared-media Storage rules reject animated GIF bypass uploads',
);
[
  'preconditionOpts: { ifGenerationMatch: 0 }',
  'isAdminImmutableObjectCreateConflict(error)',
  'adminImmutableObjectMatchesUpload(existingMetadata',
  'if (existing.cacheControl !== expected.cacheControl) return false;',
  'getAdminImmutableObjectDownloadToken(existingMetadata)',
  "throw new Error('storage_immutable_object_identity_mismatch')",
].forEach((token) => {
  assert(adminImmutableObject.includes(token), `Admin immutable Storage boundary includes ${token}`);
});
assert(
  adminMediaUpload.includes('createOrReuseAdminImmutableObject({'),
  'batch Admin media uploads preserve bytes and download tokens on deterministic retry',
);
assert(
  imagePromptCache.includes('createOrReuseAdminImmutableObject({')
    && imagePromptCache.includes('const checksum = crypto.createHash("sha256").update(buffer).digest("hex");')
    && imagePromptCache.includes('checksum,'),
  'prompt-cache destination copies preserve checksummed bytes and download tokens on deterministic retry',
);
assert(
  !imageBatchResultView.includes('deleteFileByUrl')
    && !imageBatchResultView.includes('cleanupGeneratedImages'),
  'batch review actions do not delete generated media from browser-only reference truth',
);
assert(
  imageBatchRetentionBoundary.includes('export const IMAGE_BATCH_STORAGE_DELETION_ENABLED = false')
    && imageBatchRetentionBoundary.includes('A batch row and one current project do'),
  'batch retention remains metadata-only until cross-project exclusive-reference proof exists',
);
assert(
  !projectImageGeneration.includes('deleteFileByUrl(imageUrl)'),
  'project image failed persistence must not delete shared deterministic media',
);
[
  'export function collectObpMediaReferences(',
  'export function filterUnreferencedObpMediaUrls(',
  '!retained.has(value)',
].forEach((token) => {
  assert(obpMediaReferences.includes(token), `OBP media reference boundary includes ${token}`);
});
assert(
  obpPhotoStorage.includes('filterUnreferencedObpMediaUrls(photoUrls, retainedPhotoUrls)'),
  'OBP Storage deletion filters references retained by committed public presence',
);
[
  "prepareMediaImage(file, 'galleryImage')",
  "prepareMediaImage(file, 'businessCover')",
  'uploadPreparedMediaImage({',
].forEach((token) => {
  assert(obpPhotoStorage.includes(token), `OBP media helper preserves prepared upload token ${token}`);
});
[
  'uploadBytesResumable(',
  'getDownloadURL(',
  "fileType: 'obp-photos'",
  "fileType: 'obp-covers'",
].forEach((token) => {
  assert(!obpPhotoStorage.includes(token), `OBP media helper rejects retired raw-upload token ${token}`);
});
[
  [desktopBusinessSettings, 'collectObpMediaReferences(retainedPublicPresence)', 'desktop Business Settings'],
  [desktopOfficialPage, 'collectObpMediaReferences(storeDraft?.publicPresence)', 'desktop Official Page publish'],
  [mobileOfficialPage, 'collectObpMediaReferences(nextPublicPresence)', 'mobile Official Page save'],
].forEach(([source, token, label]) => {
  assert(source.includes(token), `${label} passes committed media references before cleanup`);
});

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
  'buildNoteAttachmentFileId({',
  "attemptId: createRuntimeId('upload')",
  'const storageFileId = `${requireNoteDocumentId(noteId)}/${fileId}`;',
  'docRef.id,',
  'documentUpdate = composeRequestBody({ documents }, session, { isNew: false });',
  "await cleanupNoteAttachments(uploadedUrls, 'create');",
  "await cleanupNoteAttachments(uploadedUrls, 'update');",
  'const attachmentUrls = await runTransaction(firebaseClient, async (transaction) => {',
  'const noteSnapshot = await transaction.get(noteRef);',
  'const ownedUrls = collectNoteAttachmentUrls(noteSnapshot.data())',
  'removedAttachmentUrls = await runTransaction(firebaseClient, async (transaction) => {',
  "deferPersistedNoteAttachmentCleanup(removedAttachmentUrls, 'update_removed');",
  'transaction.delete(noteRef);',
  "deferPersistedNoteAttachmentCleanup(attachmentUrls, 'delete');",
  "logRuntimeFailure('note_create_compensation_failed'",
].forEach((token) => {
  assert(notesDal.includes(token), `notes attachment lifecycle uses captured scoped path/compensation token ${token}`);
});
[
  'export const buildNoteAttachmentFileId = ({',
  "throw new TypeError('invalid_note_attachment_attempt_id');",
  'export const collectNoteAttachmentUrls = (note: unknown): string[] =>',
  'export const getRemovedNoteAttachmentUrls = ({',
  'export const getNoteAttachmentCommitStatus = (',
].forEach((token) => {
  assert(noteAttachmentBoundary.includes(token), `note attachment boundary includes ${token}`);
});
assert(
  !notesDal.includes('const docId = `${data.id}/${fileId}`;'),
  'notes attachment path must not read an omitted data.id field',
);
[
  'getDocFromServer(getDocRef(session, noteId))',
  "getNoteAttachmentCommitStatus(currentNote, uploadedUrls)",
  "note_attachment_persistence_outcome_ambiguous",
  "note_update_removed_attachment_cleanup_deferred",
  "note_attachment_cleanup_deferred_shared_reference",
].forEach((token) => {
  assert(notesDal.includes(token), `notes ambiguous persistence boundary includes ${token}`);
});
assert(
  !notesDal.includes('await updateNote({ documents: submitData.documents, id: docRef.id })'),
  'note create must not re-resolve active session through updateNote after its first write',
);
assert(
  !notesDal.includes("cleanupNoteAttachments(removedAttachmentUrls, 'update_removed')"),
  'note update must not delete persisted attachments using one-note reference truth',
);
assert(
  !notesDal.includes("cleanupNoteAttachments(attachmentUrls, 'delete')"),
  'note delete must not delete persisted attachments using one-note reference truth',
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
  'const validatePreparedAsset = async <T>(',
  "'static_asset_persisted_file_cleanup_deferred_shared_reference'",
  "'static_asset_pre_persist_preview_cleanup_failed'",
  "'static_asset_ambiguous_write_preview_retained'",
  'const result = await persist(prepared.data);',
  '[prepared.previousPreview]',
].forEach((token) => {
  assert(staticAssetsDal.includes(token), `static asset preview replacement uses ordered bucket-neutral compensation token ${token}`);
});

assert(
  !staticAssetsDal.includes('if (isFirebaseStorageReference(data.preview)) await deleteFileByUrl(data.preview);'),
  'static asset preview replacement must not delete the old object before the new upload and Firestore write commit',
);
assert(
  !staticAssetsDal.includes("cleanupStorageReferences(\n                [prepared.previousPreview]"),
  'static asset replacement must not delete a caller-supplied persisted preview reference',
);
[
  "'category_delete'",
  "'subcategory_delete'",
  "'item_delete'",
].forEach((token) => {
  assert(staticAssetsDal.includes(token), `static asset persisted shared-reference retention includes ${token}`);
});
assert(
  !platformAssetDetails.includes('isSvg() ? selectedFile.textContent : selectedFile.src'),
  'platform asset editor must pass its canonical data URL instead of raw SVG XML',
);

[
  "| 'ttf' | 'otf' | 'woff' | 'woff2'",
  "contentType: 'font/woff2'",
  "contentType: 'font/woff'",
  "contentType: 'font/otf'",
  "contentType: 'font/ttf'",
].forEach((token) => {
  assert(base64UploadBoundary.includes(token), `base64 upload boundary preserves font format token ${token}`);
});
[
  'resolveBase64UploadConfig({ type: fileData.type, url: fileData.url })',
  'typeConfig.uploadFormat,',
].forEach((token) => {
  assert(base64StorageHelper.includes(token), `base64 Storage helper delegates runtime admission token ${token}`);
});
[
  'base64_upload_data_url_invalid',
  'base64_upload_payload_too_large',
  'base64_upload_declared_type_invalid',
  'base64_upload_type_mismatch',
  'base64_upload_signature_mismatch',
  'const hasSafeSvgContent = (payload: string): boolean =>',
  "uploadFormat: 'data_url'",
].forEach((token) => {
  assert(base64UploadBoundary.includes(token), `base64 upload boundary includes ${token}`);
});

[
  'const uploadFontDataUrl = async',
  'if (!isDataUrl(font.fileUrl)) return null;',
  'font_preset_pre_persist_create_cleanup_failed',
  'font_preset_ambiguous_create_file_retained',
  'font_preset_pre_persist_update_cleanup_failed',
  'font_preset_ambiguous_update_file_retained',
  'font_preset_persisted_file_cleanup_deferred_shared_reference',
  'await deleteDoc(fontRef);',
  'deferPersistedFontFileCleanup(current?.fileUrl, fontId);',
  'font_preset_sort_set_mismatch',
].forEach((token) => {
  assert(fontPresetsDal.includes(token), `font preset persistence/storage boundary includes ${token}`);
});
assert(!fontPresetsDal.includes('type: "jpeg"'), 'font preset uploads must not be mislabeled as JPEG');
assert(
  !fontPresetsDal.includes("cleanupFontFile(current.fileUrl, 'font_preset_replaced_file_cleanup_failed'"),
  'font preset replacement must not delete a persisted URL using one-preset reference truth',
);
assert(
  !fontPresetsDal.includes('current?.fileUrl || src'),
  'font preset delete must never trust caller-supplied Storage deletion authority',
);

[
  'buildSupportTicketAttachmentFileId({',
  "attemptId: createRuntimeId('upload')",
  'attachments.map(parseSupportTicketAttachmentUpload)',
  'data.documents.map(parseSupportTicketAttachmentUpload)',
  'isOwnedTicketAttachmentUrl(document.url, scope)',
  'isOwnedTicketAttachmentUrl(attachment.url, scope)',
].forEach((token) => {
  assert(ticketsDal.includes(token), `support ticket attachment lifecycle includes ${token}`);
});
[
  'export const buildSupportTicketAttachmentFileId = ({',
  "throw new TypeError('answerlattice_ticket_attachment_attempt_id_invalid');",
  'export const parseSupportTicketAttachmentUpload = (value: unknown)',
  "throw new TypeError('answerlattice_ticket_attachment_invalid');",
  'export const isSupportTicketAttachmentStoragePath = ({',
].forEach((token) => {
  assert(ticketAttachmentBoundary.includes(token), `support ticket attachment boundary includes ${token}`);
});

[
  "commitState === 'ambiguous'",
  "commitState === 'not_persisted'",
  'previous && previous !== uploaded ? [previous] : []',
].forEach((token) => {
  assert(storageReplacementBoundary.includes(token), `Storage replacement cleanup boundary includes ${token}`);
});
[
  'const objectId = createRuntimeId(`tenant_${String(tenantId)}_logo`);',
  "persistenceAttempted ? 'ambiguous' : 'not_persisted'",
  "logoPersistenceAttempted ? 'ambiguous' : 'not_persisted'",
  'tenant_logo_ambiguous_persistence_media_retained',
  'tenant_logo_persisted_cleanup_deferred_shared_reference',
  "commitState: 'committed'",
  'previousLogoUrl = currentTenantData.logo;',
].forEach((token) => {
  assert(tenantsDal.includes(token), `tenant logo replacement lifecycle includes ${token}`);
});
assert(
  !tenantsDal.includes('await deleteFileByUrl(data.logo);'),
  'tenant logo replacement must not delete the committed object before replacement persistence',
);
assert(
  tenantsDal.indexOf("if (commitState === 'committed')") < tenantsDal.indexOf('const targets = getStorageReplacementCleanupTargets'),
  'tenant logo committed replacement must retain the prior globally shareable reference before cleanup planning',
);
[
  "const objectId = createRuntimeId('blog_image');",
  'const blogRef = doc(getCollectionRef());',
  'delete nextData.imageToUpdate;',
  "persistenceAttempted ? 'ambiguous' : 'not_persisted'",
  'blog_image_ambiguous_persistence_media_retained',
  'blog_image_persisted_cleanup_deferred_shared_reference',
  "commitState: 'committed'",
].forEach((token) => {
  assert(blogsDal.includes(token), `blog image replacement lifecycle includes ${token}`);
});
assert(
  blogsDal.indexOf("if (commitState === 'committed')") < blogsDal.indexOf('const targets = getStorageReplacementCleanupTargets'),
  'blog committed replacement must retain the prior globally shareable reference before cleanup planning',
);
assert(
  storageRules.includes('match /blogs/profileImages/{fileId}'),
  'Storage rules authorize platform-managed versioned blog images',
);

[
  'buildProjectUploadObjectId({',
  'stableParts: [data.uid, data.name],',
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
  projectsDal.split('attemptId: doc(collection(firebaseClient, DATA_COLLECTION)).id,').length - 1 >= 2,
  'both project publish and menu-intake raw uploads use unique attempt identities',
);
const projectUploadIdentity = read('src/lib/menu/projectUploadIdentity.ts');
[
  'export const buildProjectUploadObjectId = ({',
  'if (!cleanAttemptId) throw new Error("project_upload_attempt_id_invalid");',
  'return `${stablePrefix}-${cleanAttemptId}`.slice(0, 120);',
].forEach((token) => {
  assert(projectUploadIdentity.includes(token), `project upload identity preserves immutable attempt token ${token}`);
});

assert(
  !projectsDal.includes('path: `${DATA_COLLECTION}/${type}/${docId}`'),
  'projects DAL no longer writes uploadProjectFile fallback to flat project/type/projectId path',
);
assert(
  storageRules.includes('match /projects/{fileType}/{tId}/{sId}/{fileId}'),
  'Storage rules expose tenant-scoped projects path',
);
[
  'function isValidProjectUpload(fileType)',
  "fileType == 'files'",
  "request.resource.contentType == 'application/pdf'",
  'request.resource.size <= 50 * 1024 * 1024',
  "fileType.matches('^(assets|itemImages|project-images|custom|generated|edited)$')",
  '&& isValidProjectUpload(fileType);',
].forEach((token) => {
  assert(storageRules.includes(token), `Storage rules align project image/PDF size admission token ${token}`);
});
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
  !fs.existsSync(path.join(repoRoot, 'src/database/files/index.tsx')),
  'Dead root files DAL cannot restore the obsolete tenant-unscoped logo upload path',
);
assert(
  !databaseConstants.includes('FILES: "files"'),
  'Database constants do not advertise a nonexistent root files collection',
);
[
  "profile: 'businessLogo'",
  'uploadPreparedMediaImage({',
].forEach((token) => {
  assert(storesDal.includes(token), `active store logo writer uses prepared-media token ${token}`);
});
[
  'There is no root\nFirestore `files` collection',
  'logos use the shared immutable prepared-media profile and store/tenant scope',
].forEach((token) => {
  assert(storesManagementImpl.includes(token), `stores implementation documents canonical logo path token ${token}`);
});
assert(
  !storesManagementImpl.includes('path: `stores/logos/${data.storeId}`'),
  'stores implementation does not document the obsolete logo Storage path',
);

assert(
  packageJson.scripts?.['verify:storage-paths'] === 'node scripts/verification/verify-storage-path-hardening.js && npm run test:storage-path-boundary && npm run test:storage-delete-boundary && npm run test:legacy-storage-upload-boundary && npm run test:storage-replacement-boundary && npm run test:storage-cleanup-results && npm run test:base64-upload-boundary && npm run test:admin-immutable-object-boundary && npm run test:note-attachment-boundary && npm run test:ticket-attachment-boundary && npm run test:obp-media-reference-boundary && npm run test:menulist-media-storage-rules',
  'package.json exposes verify:storage-paths',
);
assert(
  packageJson.scripts?.['test:storage-path-boundary'] === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/test-storage-path-boundary.ts',
  'package.json exposes the executable Storage path regression',
);
assert(
  packageJson.scripts?.['test:storage-delete-boundary']?.includes('scripts/verification/test-storage-delete-boundary.ts'),
  'package.json exposes the Storage delete response regression',
);
assert(
  packageJson.scripts?.['test:legacy-storage-upload-boundary']?.includes('scripts/verification/test-legacy-storage-upload-boundary.ts'),
  'package.json exposes the legacy Storage upload regression',
);
assert(
  packageJson.scripts?.['test:storage-replacement-boundary']?.includes('scripts/verification/test-storage-replacement-boundary.ts'),
  'package.json exposes the Storage replacement lifecycle regression',
);
assert(
  packageJson.scripts?.['test:base64-upload-boundary']?.includes('scripts/verification/test-base64-upload-boundary.ts'),
  'package.json exposes the base64 upload runtime regression',
);
assert(
  packageJson.scripts?.['test:admin-immutable-object-boundary']?.includes('scripts/verification/test-admin-immutable-object-boundary.ts'),
  'package.json exposes the Admin immutable object regression',
);
assert(
  packageJson.scripts?.['test:note-attachment-boundary']?.includes('scripts/verification/test-note-attachment-boundary.ts'),
  'package.json exposes the note attachment ownership regression',
);
assert(
  packageJson.scripts?.['test:ticket-attachment-boundary']?.includes('scripts/verification/test-ticket-attachment-boundary.ts'),
  'package.json exposes the support ticket attachment identity regression',
);
assert(
  packageJson.scripts?.['test:obp-media-reference-boundary']?.includes('scripts/verification/test-obp-media-reference-boundary.ts'),
  'package.json exposes the OBP media reference regression',
);
assert(
  packageJson.scripts?.['test:menulist-media-storage-rules']?.includes('scripts/verification/test-menulist-media-storage-rules.ts'),
  'package.json exposes the immutable media Storage rules regression',
);

if (failures > 0) {
  console.error(`\nStorage path hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nStorage path hardening verification passed.');
