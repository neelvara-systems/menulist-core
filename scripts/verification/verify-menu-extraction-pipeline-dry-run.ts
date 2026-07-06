import fs from 'fs';
import path from 'path';
import {
  buildMenuExtractionRoutingFields,
  buildMessagingOnboardingMenuExtractionDestination,
  buildProjectMenuExtractionDestination,
  buildPublicDraftMenuExtractionDestination,
  MENU_EXTRACTION_DESTINATION_TYPES,
  MENU_EXTRACTION_JOB_LIMITS,
  MENU_EXTRACTION_SOURCES,
  MENU_LINK_IMPORT_MIME_TYPES,
  MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES,
  OWNER_MENU_UPLOAD_MIME_TYPES,
  PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
  SUPPORTED_MENU_EXTRACTION_JOB_MIME_TYPES,
} from '../../src/data/shared/menuExtractionJob';

type DryRunFile = {
  name: string;
  size: number;
  type: string;
  uid: string;
  url: string;
};

type DryRunJob = {
  destination?: ReturnType<typeof buildProjectMenuExtractionDestination>
    | ReturnType<typeof buildPublicDraftMenuExtractionDestination>
    | ReturnType<typeof buildMessagingOnboardingMenuExtractionDestination>;
  destinationType?: string;
  files: DryRunFile[];
  forceReview?: boolean;
  projectId: string;
  sId?: string;
  skipProjectSave?: boolean;
  source: string;
  sourceMetadata?: Record<string, unknown>;
  tId?: string;
  targetLanguages: Array<{ code: string; name: string }>;
  uId?: string;
};

const root = process.cwd();
const bucket = 'menulist-qa.appspot.com';
const checks: Array<{ detail?: string; name: string; passed: boolean }> = [];

function storageUrl(storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=dry-run`;
}

function addCheck(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
}

function assertCheck(name: string, condition: unknown, detail?: string): void {
  addCheck(name, Boolean(condition), detail);
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function buildProjectJob(params: {
  filePath: string;
  fileType: string;
  forceReview?: boolean;
  projectId?: string;
  source: string;
  sourceMetadata?: Record<string, unknown>;
}): DryRunJob {
  const projectId = params.projectId || '14-default-22';
  return {
    projectId,
    files: [{
      name: 'menu.jpg',
      size: 1024,
      type: params.fileType,
      uid: 'file-1',
      url: storageUrl(params.filePath),
    }],
    forceReview: params.forceReview,
    source: params.source,
    sourceMetadata: params.sourceMetadata,
    tId: '14',
    sId: '22',
    targetLanguages: [{ code: 'en', name: 'English' }],
    uId: 'owner-1',
    ...buildMenuExtractionRoutingFields(buildProjectMenuExtractionDestination(
      projectId,
      params.forceReview ? 'review' : 'auto_or_review',
    )),
  };
}

function getStoragePathFromDownloadUrl(value: string): string | null {
  const url = new URL(value);
  const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/([^?]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

const ownerJob = buildProjectJob({
  filePath: 'projects/files/14/22/menu.jpg',
  fileType: 'image/jpeg',
  source: MENU_EXTRACTION_SOURCES.OWNER_UPLOAD,
});

const ownerRetryFromLinkJob = buildProjectJob({
  filePath: 'menuLinkImports/14/22/14-default-22/job-1/source.html',
  fileType: 'text/html',
  forceReview: true,
  source: MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT,
  sourceMetadata: {
    artifactId: 'artifact-1',
    storagePath: 'menuLinkImports/14/22/14-default-22/job-1/source.html',
  },
});

const publicImageJob: DryRunJob = {
  projectId: '0-public-draft-1-0',
  files: [{
    name: 'public-menu.jpg',
    size: 2048,
    type: 'image/jpeg',
    uid: 'public-draft-1',
    url: storageUrl('publicMenuDrafts/draft-1/menu.jpg'),
  }],
  source: MENU_EXTRACTION_SOURCES.PUBLIC_CREATE_MENU,
  skipProjectSave: true,
  tId: '0',
  sId: '0',
  uId: 'platform',
  targetLanguages: [{ code: 'en', name: 'English' }],
  ...buildMenuExtractionRoutingFields(buildPublicDraftMenuExtractionDestination('draft-1', 'image_upload')),
};

const publicLinkJob: DryRunJob = {
  ...publicImageJob,
  files: [{
    name: 'Imported menu link.html',
    size: 4096,
    type: 'text/html',
    uid: 'public-draft-2',
    url: storageUrl('publicMenuDrafts/draft-2/source.html'),
  }],
  projectId: '0-public-draft-2-0',
  source: MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT,
  sourceMetadata: {
    sourceType: 'menu_link_import',
    storagePath: 'publicMenuDrafts/draft-2/source.html',
  },
  ...buildMenuExtractionRoutingFields(buildPublicDraftMenuExtractionDestination('draft-2', 'menu_link_import')),
};

const authenticatedLinkJob = buildProjectJob({
  filePath: 'menuLinkImports/14/22/14-default-22/job-2/source.html',
  fileType: 'text/html',
  forceReview: true,
  source: MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT,
});

const messagingJob: DryRunJob = {
  projectId: 'msg-onboarding-session-1',
  files: [{
    name: 'iphone-menu.heic',
    size: 2048,
    type: 'image/heic',
    uid: 'upload-1',
    url: storageUrl('messagingOnboarding/session-1/upload-1.heic'),
  }],
  source: MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING,
  skipProjectSave: true,
  targetLanguages: [{ code: 'en', name: 'English' }],
  ...buildMenuExtractionRoutingFields(buildMessagingOnboardingMenuExtractionDestination('session-1')),
};

const allJobs = [
  ['owner upload', ownerJob],
  ['owner retry from link import', ownerRetryFromLinkJob],
  ['public image create-menu', publicImageJob],
  ['public link create-menu', publicLinkJob],
  ['authenticated link import', authenticatedLinkJob],
  ['messaging onboarding', messagingJob],
] as const;

function isSourceSpecificMimeAllowed(job: DryRunJob): boolean {
  const fileTypes = job.files.map((file) => file.type);
  if (job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING) {
    return fileTypes.every((type) => MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES.includes(type as any));
  }
  if (
    job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT &&
    job.destination.sourceType === 'image_upload'
  ) {
    return fileTypes.every((type) => PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES.includes(type as any));
  }
  if (
    job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT &&
    job.destination.sourceType === 'menu_link_import'
  ) {
    return fileTypes.every((type) => MENU_LINK_IMPORT_MIME_TYPES.includes(type as any));
  }
  if (job.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT) {
    return fileTypes.every((type) => MENU_LINK_IMPORT_MIME_TYPES.includes(type as any));
  }
  return fileTypes.every((type) => OWNER_MENU_UPLOAD_MIME_TYPES.includes(type as any));
}

for (const [name, job] of allJobs) {
  assertCheck(`${name}: destinationType mirrors destination.type`, job.destinationType === job.destination?.type);
  assertCheck(`${name}: file count inside shared limit`, job.files.length > 0 && job.files.length <= MENU_EXTRACTION_JOB_LIMITS.MAX_FILES);
  assertCheck(`${name}: file size inside shared limit`, job.files.every((file) => file.size <= MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES));
  assertCheck(`${name}: MIME supported by worker`, job.files.every((file) => SUPPORTED_MENU_EXTRACTION_JOB_MIME_TYPES.includes(file.type as any)));
  assertCheck(`${name}: MIME allowed for source/destination`, isSourceSpecificMimeAllowed(job));
}

assertCheck(
  'owner upload: project destination auto-save/review routing',
  ownerJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
    && ownerJob.destination.saveMode === 'auto_or_review'
    && ownerJob.source === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD
    && getStoragePathFromDownloadUrl(ownerJob.files[0].url)?.startsWith('projects/files/14/22/'),
);

assertCheck(
  'owner retry: original menu-link source and metadata preserved',
  ownerRetryFromLinkJob.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    && ownerRetryFromLinkJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
    && ownerRetryFromLinkJob.destination.saveMode === 'review'
    && ownerRetryFromLinkJob.sourceMetadata?.artifactId === 'artifact-1'
    && getStoragePathFromDownloadUrl(ownerRetryFromLinkJob.files[0].url)?.startsWith('menuLinkImports/14/22/14-default-22/'),
);

assertCheck(
  'public create-menu image: durable draft destination skips project save',
  publicImageJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT
    && publicImageJob.destination.sourceType === 'image_upload'
    && publicImageJob.skipProjectSave === true
    && getStoragePathFromDownloadUrl(publicImageJob.files[0].url)?.startsWith('publicMenuDrafts/draft-1/'),
);

assertCheck(
  'public create-menu link: durable draft link destination skips project save',
  publicLinkJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT
    && publicLinkJob.destination.sourceType === 'menu_link_import'
    && publicLinkJob.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
    && publicLinkJob.skipProjectSave === true
    && getStoragePathFromDownloadUrl(publicLinkJob.files[0].url)?.startsWith('publicMenuDrafts/draft-2/'),
);

assertCheck(
  'authenticated link import: project review destination and import storage path',
  authenticatedLinkJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
    && authenticatedLinkJob.destination.saveMode === 'review'
    && authenticatedLinkJob.forceReview === true
    && getStoragePathFromDownloadUrl(authenticatedLinkJob.files[0].url)?.startsWith('menuLinkImports/14/22/14-default-22/'),
);

assertCheck(
  'messaging onboarding: extraction-only destination supports WhatsApp HEIC',
  messagingJob.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
    && messagingJob.skipProjectSave === true
    && messagingJob.source === MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING
    && MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES.includes('image/heic')
    && getStoragePathFromDownloadUrl(messagingJob.files[0].url)?.startsWith('messagingOnboarding/session-1/'),
);

const uniqueSupportedMimeTypes = new Set(SUPPORTED_MENU_EXTRACTION_JOB_MIME_TYPES);
assertCheck(
  'shared worker MIME list has no duplicates',
  uniqueSupportedMimeTypes.size === SUPPORTED_MENU_EXTRACTION_JOB_MIME_TYPES.length,
);

assertCheck(
  'owner upload MIME list stays narrower than messaging upload MIME list',
  !OWNER_MENU_UPLOAD_MIME_TYPES.includes('image/heic' as any)
    && MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES.includes('image/heic'),
);

assertCheck(
  'public create-menu image MIME list excludes PDF while owner upload allows PDF',
  OWNER_MENU_UPLOAD_MIME_TYPES.includes('application/pdf')
    && !PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES.includes('application/pdf' as any),
);

const ownerRoute = read('src/app/api/menu-extraction/jobs/route.ts');
assertCheck(
  'owner API does not accept browser-owned source/sourceMetadata fields',
  !ownerRoute.includes('source: z.string')
    && !ownerRoute.includes('sourceMetadata: z.record')
    && ownerRoute.includes('loadRetryContext')
    && ownerRoute.includes('normalizeProjectJobSource(retryData.source)'),
);

const firestoreRules = read('firestore.rules');
assertCheck(
  'Firestore cancellation updates cannot mutate server-owned job fields',
  firestoreRules.includes('allow create: if false')
    && firestoreRules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly([\n          'status',\n          'updatedAt'\n        ])")
    && firestoreRules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly([\n          'status',\n          'completedAt',\n          'updatedAt'\n        ])"),
);

const workerSource = read('functions/src/logic/processMenuImagesJob.ts');
assertCheck(
  'public draft completion normalizes project extracted-data shape',
  workerSource.includes('function buildPublicDraftExtractedData')
    && workerSource.includes('function normalizeDraftCategory')
    && workerSource.includes('function normalizeDraftItem')
    && workerSource.includes('category: String(item.category ?? categoryId ?? "")')
    && workerSource.includes('active: item.active !== false')
    && workerSource.includes('available: item.available !== false')
    && workerSource.includes('updatePublicDraftFromExtraction(jobId, job, result.data.data, redistributedFiles)'),
);

const projectTypes = read('src/components/templates/main-app/projects/types/project.types.ts');
const extractedDataTypes = read('src/components/templates/main-app/projects/types/extractedData.types.ts');
assertCheck(
  'frontend project file types expect normalized extracted data',
  projectTypes.includes('extractedData?: ExtractedData | null')
    && extractedDataTypes.includes('active: boolean')
    && extractedDataTypes.includes('category: string')
    && extractedDataTypes.includes('isPrimary: boolean')
    && extractedDataTypes.includes('categories: ExtractedDataCategory[]')
    && extractedDataTypes.includes('items: ExtractedDataItem[]')
    && extractedDataTypes.includes('languages: ExtractedDataLanguage[]'),
);

const applyChangesSource = read('src/lib/extraction/applyChanges.ts');
assertCheck(
  'review apply creates standard source file shells before render',
  applyChangesSource.includes('function ensureReviewSourceFiles')
    && applyChangesSource.includes('active: true')
    && applyChangesSource.includes('deleted: false')
    && applyChangesSource.includes('index: nextIndex++')
    && applyChangesSource.includes("message: ''")
    && applyChangesSource.includes("await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges')"),
);

const publicClaimRoute = read('src/app/api/public/create-menu/claim/route.ts');
assertCheck(
  'public claim creates renderer-parseable project IDs',
  publicClaimRoute.includes('const projectId = `${tenantId}-${Date.now().toString(36)}-${storeId}`')
    && publicClaimRoute.includes('.doc(tenantDocumentId)')
    && publicClaimRoute.includes('.collection(storeDocumentId)')
    && publicClaimRoute.includes('.doc(projectId)')
    && publicClaimRoute.includes('revalidateTag(`menu-store-${result.storeId}`)'),
);

const messagingWatcher = read('functions/src/messagingOnboarding/extractionWatcher.ts');
assertCheck(
  'messaging watcher stores standard project file envelopes for publish',
  messagingWatcher.includes('const extractedProjectFiles')
    && messagingWatcher.includes('active: true')
    && messagingWatcher.includes('deleted: false')
    && messagingWatcher.includes('index,')
    && messagingWatcher.includes('message: extractedData.message || ""')
    && messagingWatcher.includes('data: extractedData.data')
    && messagingWatcher.includes('extractedProjectFiles,'),
);

const messagingApproveRoute = read('src/app/api/msg-preview/[sessionId]/approve/route.ts');
const messagingPublish = read('src/lib/messaging-onboarding/publish.ts');
assertCheck(
  'messaging approve publishes through active renderer-ready project writer',
  messagingApproveRoute.includes('executeMessagingOnboardingPublish')
    && messagingApproveRoute.includes('categoryCount < 1 || itemCount < 1 || !hasItemWithPrice')
    && messagingPublish.includes('const projectId = `${core.tenantId}-default-${core.storeId}`')
    && messagingPublish.includes('db.collection(`projects/${core.tenantId}/${core.storeId}`).doc(projectId)')
    && messagingPublish.includes('Array.isArray(sessionData.extractedProjectFiles)')
    && messagingPublish.includes('active: file.active !== false')
    && messagingPublish.includes('deleted: file.deleted === true')
    && messagingPublish.includes('index: typeof file.index === "number" ? file.index : index')
    && messagingPublish.includes('files: projectFiles')
    && messagingPublish.includes('revalidateTag(`menu-store-${result.storeId}`)')
    && messagingPublish.includes('revalidateTag("client-stores")')
    && messagingPublish.includes('revalidateTag("screen-data")')
    && messagingPublish.includes('touchDigitalScreenContentVersionForStoreServer(result.storeId, "messagingOnboardingPublish")'),
);
assertCheck(
  'messaging approve transaction failures use typed stable sentinels',
  messagingApproveRoute.includes('class PreviewApproveTransactionError extends Error')
    && messagingApproveRoute.includes('throw new PreviewApproveTransactionError("SESSION_NOT_FOUND")')
    && messagingApproveRoute.includes('throw new PreviewApproveTransactionError("INVALID_TOKEN")')
    && messagingApproveRoute.includes('throw new PreviewApproveTransactionError("PUBLISH_IN_PROGRESS")')
    && messagingApproveRoute.includes('throw new PreviewApproveTransactionError("SESSION_NOT_READY")')
    && messagingApproveRoute.includes('throw new PreviewApproveTransactionError("SESSION_EXPIRED")')
    && messagingApproveRoute.includes('isPreviewApproveTransactionError(txError)')
    && !messagingApproveRoute.includes('(txError as Error).message')
    && !messagingApproveRoute.includes('msg.includes('),
);

const publicClientRenderer = read('src/app/client/[[...slug]]/page.tsx');
const publicMenuRenderer = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
assertCheck(
  'public menu renderer contract is aligned with extraction output shape',
  publicClientRenderer.includes('const [tId, , sId] = projectId.split("-")')
    && publicClientRenderer.includes('targetProject.projectId || targetProject.id')
    && publicMenuRenderer.includes('file.extractedData?.data?.categories')
    && publicMenuRenderer.includes('cat.active !== false')
    && publicMenuRenderer.includes("typeof item.category === 'string' && categoriesById.has(item.category)")
    && publicMenuRenderer.includes('item?.active !== false'),
);

const failed = checks.filter((check) => !check.passed);
for (let index = 0; index < checks.length; index += 1) {
  const check = checks[index];
  console.log(`${index + 1}. ${check.passed ? 'PASS' : 'FAIL'} - ${check.name}`);
  if (!check.passed && check.detail) {
    console.log(`   ${check.detail}`);
  }
}

console.log(`\nDry-run summary: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
  process.exit(1);
}
