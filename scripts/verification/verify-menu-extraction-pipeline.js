#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function addCheck(name, passed, detail = '') {
  checks.push({ name, passed, detail });
}

function contains(filePath, patterns, name) {
  const content = read(filePath);
  const missing = patterns.filter((pattern) => {
    if (pattern instanceof RegExp) return !pattern.test(content);
    return !content.includes(pattern);
  });
  addCheck(name, missing.length === 0, missing.map(String).join(', '));
}

function notContains(filePath, patterns, name) {
  const content = read(filePath);
  const found = patterns.filter((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(content);
    return content.includes(pattern);
  });
  addCheck(name, found.length === 0, found.map(String).join(', '));
}

function filesEqual(leftPath, rightPath, name) {
  addCheck(name, read(leftPath) === read(rightPath), `${leftPath} != ${rightPath}`);
}

filesEqual(
  'src/data/shared/menuExtractionJob.ts',
  'functions/src/sharedData/menuExtractionJob.ts',
  'Shared extraction job contract is mirrored byte-for-byte',
);

contains(
  'src/data/shared/menuExtractionJob.ts',
  [
    'destinationType: destination.type',
    'MENU_EXTRACTION_JOB_LIMITS',
    'MENU_EXTRACTION_SOURCES',
    'MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES',
    'PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES',
    '"image/heic"',
  ],
  'Shared contract exposes routing labels, limits, sources, and messaging MIME compatibility',
);

contains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'withAuth',
    'verifyTenantAccess',
    'checkSafeMode',
    'getRateLimitForFeature("AI_EXPENSIVE")',
    'buildProjectMenuExtractionDestination',
    'buildMenuExtractionRoutingFields',
    'loadRetryContext',
    'normalizeProjectJobSource(retryData.source)',
    'isAllowedMenuLinkImportUrl',
    'buildOwnerUploadSourceFingerprint',
    'findReusableCompletedOwnerJob',
    'deleteUnreferencedOwnerUploadFiles',
    'projectChangedAfterExtraction',
    '.limit(50)',
    'sourceFingerprint: ownerUploadFingerprint.fingerprint',
    'reusedCompletedJob: true',
    'MENU_EXTRACTION_SOURCES.OWNER_UPLOAD',
    'MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT',
  ],
  'Owner job API centralizes auth, retry, source, routing, and trusted owner-upload dedupe checks',
);

notContains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'source: z.string()',
    'sourceMetadata: z.record',
    'validation.data.sourceMetadata',
  ],
  'Owner job API does not accept client-owned source metadata',
);

contains(
  'src/lib/firebase/menuProcessing.ts',
  [
    "fetch('/api/menu-extraction/jobs'",
    'destination?: MenuExtractionJobDestination',
    'destinationType?: MenuExtractionDestinationType',
    'skipProjectSave?: boolean',
    'reusedCompletedJob',
  ],
  'Client helper creates jobs through protected API and handles active/completed job reuse',
);

notContains(
  'src/lib/firebase/menuProcessing.ts',
  [
    /\baddDoc\s*\(/,
    /\bsetDoc\s*\(/,
  ],
  'Client helper does not write extraction jobs directly',
);

contains(
  'src/app/api/public/create-menu/route.ts',
  [
    'buildPublicDraftMenuExtractionDestination',
    'buildMenuExtractionRoutingFields',
    'analyzeMenuIntakeIdentity',
    'PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES',
    'publicMenuDrafts/${draftToken}/',
    'MENU_EXTRACTION_SOURCES.PUBLIC_CREATE_MENU',
    'statusOnly',
    'resultReady',
  ],
  'Public create-menu queues durable public draft jobs with identity metadata and status-only polling support',
);

contains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    "params.set('statusOnly', '1')",
    "data.status === 'completed' && !data.extractedData && statusOnly",
  ],
  'Public preview polls lightweight status first and fetches the full extraction result only when ready',
);

contains(
  'src/app/api/public/create-menu/claim/route.ts',
  [
    'const projectId = `${tenantId}-${Date.now().toString(36)}-${storeId}`',
    'active: true',
    'deleted: false',
    'index: 0',
    "message: ''",
    'revalidateTag(`menu-store-${result.storeId}`)',
  ],
  'Public draft claim writes parseable project IDs and the standard project file shape',
);

notContains(
  'src/app/api/public/create-menu/route.ts',
  [
    'triggerExtraction',
    'genAIClient.models.generateContent',
  ],
  'Public create-menu no longer runs inline extraction',
);

contains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'buildProjectMenuExtractionDestination',
    "buildProjectMenuExtractionDestination(projectId, 'review')",
    'buildMenuExtractionRoutingFields',
    'MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT',
    'menuLinkImports/${ids.tId}/${ids.sId}/${projectId}/${jobRef.id}/',
  ],
  'Authenticated link import uses shared project routing and review mode',
);

contains(
  'src/lib/extraction/applyChanges.ts',
  [
    'function assertOwnedPreviewJob',
    "jobData.status !== 'preview_ready'",
    "throw new Error('Extraction review does not belong to this business')",
    'function ensureReviewSourceFiles',
    'active: true',
    'deleted: false',
    'index: nextIndex++',
    "message: ''",
    "await saveLinkedOutletProject(linkedOutletProjectPayload)",
    "'/api/projects/outlet-save'",
    "await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges')",
  ],
  'Review apply validates ownership/status, creates standard project file shells, routes linked outlets through outlet-save, and revalidates public render cache',
);

contains(
  'functions/src/triggers/shared.ts',
  [
    'Direct menu extraction is disabled',
    'Use the MenuList extraction job queue',
  ],
  'Legacy direct processMenuImages callable is disabled in favor of the job queue',
);

notContains(
  'functions/src/triggers/shared.ts',
  [
    'processMenuImagesLogic(data)',
  ],
  'Legacy direct processMenuImages callable does not invoke AI processing',
);

contains(
  'functions/src/messagingOnboarding/intakeProcessor.ts',
  [
    'buildMessagingOnboardingMenuExtractionDestination',
    'buildMenuExtractionRoutingFields',
    'MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING',
    'skipProjectSave: true',
  ],
  'Messaging onboarding uses shared messaging destination routing',
);

contains(
  'functions/src/messagingOnboarding/extractionWatcher.ts',
  [
    'const extractedProjectFiles',
    'active: true',
    'deleted: false',
    'index,',
    'message: extractedData.message || ""',
    'data: extractedData.data',
    'extractedProjectFiles,',
  ],
  'Messaging extraction watcher stores standard project files for publish',
);

contains(
  'src/app/api/msg-preview/[sessionId]/approve/route.ts',
  [
    'executeMessagingOnboardingPublish',
    'state: "PUBLISHING"',
    'state === "LIVE"',
    'categoryCount < 1 || itemCount < 1 || !hasItemWithPrice',
  ],
  'Messaging approval route uses the active centralized publish executor and publish gate',
);

contains(
  'src/lib/messaging-onboarding/publish.ts',
  [
    'export async function executeMessagingOnboardingPublish',
    'const projectId = `${core.tenantId}-default-${core.storeId}`',
    'db.collection(`projects/${core.tenantId}/${core.storeId}`).doc(projectId)',
    'Array.isArray(sessionData.extractedProjectFiles)',
    'active: file.active !== false',
    'deleted: file.deleted === true',
    'index: typeof file.index === "number" ? file.index : index',
    'files: projectFiles',
    'DB_COLLECTIONS.PLATFORM_SUMMARY',
    'slug: projectSlug',
    'revalidateTag(`menu-store-${result.storeId}`)',
    'revalidateTag(`store-${result.storeId}`)',
    'revalidateTag("client-stores")',
  ],
  'Messaging publish writes a renderer-ready project, summary entry, and public cache tags',
);

contains(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    'MENU_EXTRACTION_JOB_LIMITS.MAX_FILES',
    'MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES',
    'isSupportedJobFileType',
    'PUBLIC_CREATE_MENU_IMAGE_FILE_TYPES',
    'MESSAGING_JOB_FILE_TYPES',
    'updatePublicDraftFromExtraction',
    'markPublicDraftExtractionFailed',
    'getExtractionShapeError',
    'revalidatePublicClientCacheForStore',
    '../utils/menuExtractionResultSummary',
    'buildExtractionTimings',
    'buildExtractionResultSummary',
    'summary: buildExtractionResultSummary',
    'timings: buildExtractionTimings',
  ],
  'Worker enforces shared limits, public draft lifecycle, shape checks, cache revalidation, timing telemetry, and result summaries',
);

contains(
  'functions/src/schedulers/menuJobCleanup.ts',
  [
    'export async function pruneCompletedProjectJobPayloadsLogic',
    'buildExtractionResultSummary(',
    "'result.combinedData': FieldValue.delete()",
    "'result.dataPrunedReason': 'project_auto_saved'",
    'data.isFirstExtraction !== true',
    'data.skipProjectSave === true',
  ],
  'Maintenance cleanup prunes heavy completed project job payloads without touching public, messaging, or review jobs',
);

contains(
  'functions/src/utils/menuExtractionResultSummary.ts',
  [
    'export function buildExtractionResultSummary',
    'categoriesCount',
    'itemsCount',
    'dietaryTaggedItemsCount',
    'attributedItemsCount',
    'confidenceSummary',
  ],
  'Extraction result summaries use one shared Functions helper for worker writes and pruning fallback',
);

contains(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    'function buildPublicDraftExtractedData',
    'function normalizeDraftCategory',
    'function normalizeDraftItem',
    'category: String(item.category ?? categoryId ?? "")',
    'active: item.active !== false',
    'available: item.available !== false',
    'updatePublicDraftFromExtraction(jobId, job, result.data.data, redistributedFiles)',
  ],
  'Worker normalizes public draft extracted data to the project/editor shape',
);

contains(
  'src/components/templates/main-app/projects/types/extractedData.types.ts',
  [
    'export interface ExtractedDataCategory',
    'active: boolean',
    'export interface ExtractedDataItem',
    'category: string',
    'export interface ExtractedDataLanguage',
    'isPrimary: boolean',
    'categories: ExtractedDataCategory[]',
    'items: ExtractedDataItem[]',
    'languages: ExtractedDataLanguage[]',
  ],
  'Frontend extracted data types require normalized category, item, and language fields',
);

contains(
  'src/app/client/[[...slug]]/page.tsx',
  [
    'const [tId, , sId] = projectId.split("-")',
    '.collection(DB_COLLECTIONS.PROJECTS)',
    '.doc(String(tId))',
    '.collection(String(sId))',
    '.doc(projectId)',
    'targetProject.projectId || targetProject.id',
  ],
  'Public renderer loads projects from the parseable nested project ID contract',
);

contains(
  'src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx',
  [
    'file.extractedData?.data?.categories',
    'cat.active !== false',
    "typeof item.category === 'string' && categoriesById.has(item.category)",
    'item?.active !== false',
  ],
  'Public menu renderer consumes normalized project file extracted data',
);

contains(
  'firestore.rules',
  [
    'match /menuImageProcessingJobs/{jobId}',
    'allow create: if false',
    'isClientJobCancellationRequest()',
    "request.resource.data.diff(resource.data).affectedKeys().hasOnly",
    'isClientPreviewReviewResolution()',
  ],
  'Firestore rules keep job creation server-only while preserving restricted client cancellation/review updates',
);

contains(
  'src/components/templates/main-app/platform/extractionMonitor/index.tsx',
  [
    "dataIndex: 'destinationType'",
    "dataIndex: 'source'",
    'PipelineTag',
  ],
  'Extraction monitor renders source and destination fields from the centralized job contract',
);

const failed = checks.filter((check) => !check.passed);

for (const [index, check] of checks.entries()) {
  console.log(`${index + 1}. ${check.passed ? 'PASS' : 'FAIL'} - ${check.name}`);
  if (!check.passed && check.detail) {
    console.log(`   Missing/found: ${check.detail}`);
  }
}

console.log(`\nSummary: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
  process.exit(1);
}
