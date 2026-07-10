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

function missing(filePath, name) {
  addCheck(name, !fs.existsSync(path.join(root, filePath)), `${filePath} still exists`);
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

function ordered(filePath, patterns, name) {
  const content = read(filePath);
  let cursor = -1;
  const missingOrOutOfOrder = [];
  for (const pattern of patterns) {
    const nextIndex = content.indexOf(pattern, cursor + 1);
    if (nextIndex === -1) {
      missingOrOutOfOrder.push(pattern);
      continue;
    }
    cursor = nextIndex;
  }
  addCheck(name, missingOrOutOfOrder.length === 0, missingOrOutOfOrder.join(', '));
}

function occursAtLeast(filePath, pattern, minimum, name) {
  const content = read(filePath);
  const count = content.split(pattern).length - 1;
  addCheck(name, count >= minimum, `${pattern} found ${count} times, expected at least ${minimum}`);
}

function filesEqual(leftPath, rightPath, name) {
  addCheck(name, read(leftPath) === read(rightPath), `${leftPath} != ${rightPath}`);
}

filesEqual(
  'src/data/shared/menuExtractionJob.ts',
  'functions/src/sharedData/menuExtractionJob.ts',
  'Shared extraction job contract is mirrored byte-for-byte',
);

filesEqual(
  'src/data/shared/menuExtractionProjectSize.ts',
  'functions/src/sharedData/menuExtractionProjectSize.ts',
  'Shared extraction project-size limits are mirrored byte-for-byte',
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
  'src/lib/menu-extraction/jobIdBoundary.ts',
  [
    'MENU_EXTRACTION_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/',
    'documentId === value',
    'isValidFirestoreDocumentId(documentId)',
    'normalizeMenuExtractionJobId',
  ],
  'Menu extraction retry job IDs use the strict shared Firestore document ID boundary',
);

contains(
  'src/lib/menu-extraction/projectIdBoundary.ts',
  [
    'MENU_EXTRACTION_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/',
    'documentId === value',
    'isValidFirestoreDocumentId(documentId)',
    'normalizeMenuExtractionProjectId',
  ],
  'Menu extraction project IDs use the strict shared Firestore document ID boundary',
);

contains(
  'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
  [
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'import { normalizeMenuExtractionProjectId } from "@lib/menu-extraction/projectIdBoundary";',
    'export function normalizeMenuIntakeScopeDocumentId(value: unknown): MenuIntakeScopeDocumentId | null {',
    'raw !== raw.trim() || !isValidFirestoreDocumentId(raw)',
    'Number.isSafeInteger(numericId)',
    'String(numericId) !== raw',
    'function requireMenuIntakeProjectId(value: unknown): string',
    'const projectId = requireMenuIntakeProjectId(params.projectId);',
    'const tenantScope = normalizeMenuIntakeScopeDocumentId(params.tId);',
    'const storeScope = normalizeMenuIntakeScopeDocumentId(params.sId);',
    '.doc(tenantScope.documentId)',
    '.collection(storeScope.documentId)',
    '.doc(projectId)',
    'firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)',
  ],
  'Menu intake identity server normalizes project and scope IDs before project/store reads',
);

ordered(
  'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
  [
    'const projectId = requireMenuIntakeProjectId(params.projectId);',
    'const tenantScope = normalizeMenuIntakeScopeDocumentId(params.tId);',
    'const storeScope = normalizeMenuIntakeScopeDocumentId(params.sId);',
    '.doc(tenantScope.documentId)',
    '.collection(storeScope.documentId)',
    '.doc(projectId)',
  ],
  'Menu intake identity project/scope ID normalizers run before project document read',
);

notContains(
  'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
  [
    '.doc(params.projectId)',
    '.collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)',
    '.collection(`${DB_COLLECTIONS.PROJECTS}/',
    '.doc(String(params.sId))',
    'sId: params.sId',
    'tId: params.tId',
  ],
  'Menu intake identity server must not read project/store docs with raw project or scope IDs',
);

contains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'withAuth',
    'verifyTenantAccess',
    'checkSafeMode',
    'MENU_EXTRACTION_JOB_MAX_BODY_BYTES',
    'readBoundedJsonBody(request, MENU_EXTRACTION_JOB_MAX_BODY_BYTES)',
    'getRateLimitForFeature("FILE_UPLOAD")',
    'getRateLimitForFeature("AI_EXPENSIVE")',
    'buildProjectMenuExtractionDestination',
    'buildMenuExtractionRoutingFields',
    'loadRetryContext',
    'normalizeMenuExtractionProjectId',
    'const MenuExtractionProjectIdSchema = z.string()',
    'projectId: MenuExtractionProjectIdSchema',
    'const MenuExtractionJobIdSchema = z.string()',
    'normalizeMenuExtractionJobId(value) === value',
    'retriedFromJobId: MenuExtractionJobIdSchema.optional()',
    'function requireMenuExtractionRetryJobId(value: unknown): string',
    'const retriedFromJobId = requireMenuExtractionRetryJobId(params.retriedFromJobId);',
    '.doc(retriedFromJobId)',
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
    'MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS',
    'getProjectedProjectDocumentSize',
    'PRE_AI_EXTRACTED_DATA_BYTES_PER_FILE',
    'MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_ERROR',
    'Reset it or create a new menu before uploading more files.',
    'menu_extraction_project_document_size_gate_blocked',
    '"project_document_size_gate"',
  ],
  'Owner job API centralizes auth, retry, source, routing, trusted owner-upload dedupe checks, and pre-AI project-size gating',
);

ordered(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'const validation = RequestSchema.safeParse(bodyResult.data);',
    'if (validation.data.retriedFromJobId) {',
    'retryContext = await loadRetryContext({',
    'retriedFromJobId: validation.data.retriedFromJobId',
  ],
  'Owner job retry IDs are schema-normalized before original job document reads',
);

ordered(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'function requireMenuExtractionRetryJobId(value: unknown): string',
    'const retriedFromJobId = requireMenuExtractionRetryJobId(params.retriedFromJobId);',
    '.doc(retriedFromJobId)',
  ],
  'Owner job retry loader normalizes retry ID before original job document read',
);

notContains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'retriedFromJobId: z.string().min(1).max(160).optional()',
    'projectId: z.string().min(3).max(160)',
    '.doc(params.retriedFromJobId)',
  ],
  'Owner job request IDs no longer use loose string schemas',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'Menu Extraction retry job ID boundary',
    'src/lib/menu-extraction/jobIdBoundary.ts',
    'Firestore auto-ID shaped job IDs',
    'whitespace-mutated',
    '`loadRetryContext()` re-normalizes the retry job ID before the original `menuImageProcessingJobs/{jobId}` document ref',
  ],
  'Menu Extraction implementation docs record retry job ID boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'Menu Extraction project ID boundary',
    'src/lib/menu-extraction/projectIdBoundary.ts',
    'whitespace-mutated',
    'before project document reads, menu-link Storage path construction, or identity preflight context loading',
    '`loadMenuIntakeContext()` and `runMenuIntakeIdentityCheck()` also re-normalize the project ID',
  ],
  'Menu Extraction implementation docs record project ID boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'Menu Intake Identity scope document-ID boundary',
    'normalizeMenuIntakeScopeDocumentId()',
    'before tenant access checks, limiter key hashing, `projects/{tId}/{sId}/{projectId}` context reads',
    'exact positive safe-integer MenuList document IDs',
  ],
  'Menu Extraction implementation docs record menu-intake identity scope document-ID boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'Menu Extraction retry job ID admission',
    'Firestore auto-ID shaped job IDs',
    'whitespace-mutated',
    '`loadRetryContext()` repeats the same normalizer',
    'before the original-job Firestore read',
  ],
  'Menu Extraction Firebase docs record retry job ID cost boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'Menu Extraction project ID admission',
    'src/lib/menu-extraction/projectIdBoundary.ts',
    'whitespace-mutated',
    'before project document reads, menu-link Storage path construction, identity preflight context loading',
    'menu-intake identity server helper also re-normalizes the final project ID before the scoped project ref',
  ],
  'Menu Extraction Firebase docs record project ID cost boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'Menu Intake Identity scope document-ID admission',
    'normalizeMenuIntakeScopeDocumentId()',
    'before tenant access checks, limiter hashing, scoped project/store context reads',
    'This adds no Firestore reads/writes/deletes, Storage operations, provider calls',
  ],
  'Menu Extraction Firebase docs record menu-intake identity scope document-ID cost boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Menu Extraction retry job ID boundary checkpoint',
    'src/lib/menu-extraction/jobIdBoundary.ts',
    'whitespace-mutated',
    '`loadRetryContext()` repeats the same normalizer before reading `.doc(retriedFromJobId)`',
    'excluding `.doc(params.retriedFromJobId)`',
  ],
  'Production audit records Menu Extraction retry job ID boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Menu Extraction project ID boundary checkpoint',
    'src/lib/menu-extraction/projectIdBoundary.ts',
    'whitespace-mutated',
    'Menu Extraction identity helper project ID normalization checkpoint',
  ],
  'Production audit records Menu Extraction project ID boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Menu Intake Identity Scope Document ID Boundary checkpoint',
    'normalizeMenuIntakeScopeDocumentId()',
    'uses normalized tenant/store document IDs for the scoped project/store refs',
    'raw scope usage exclusions',
  ],
  'Production audit records Menu Intake Identity scope document-ID boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Extraction Retry Job ID Boundary',
    'whitespace-mutated',
    '`loadRetryContext()` now re-normalizes `retriedFromJobId` before reading `.doc(retriedFromJobId)`',
    'exclude `.doc(params.retriedFromJobId)`',
  ],
  'Changelog records Menu Extraction retry job ID boundary',
);

contains(
  '__docs__/changelog.md',
  ['Menu Extraction Project ID Boundary', 'whitespace-mutated', 'Menu Extraction Identity Helper Project ID Normalization'],
  'Changelog records Menu Extraction project ID boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Intake Identity Scope Document ID Boundary',
    'normalizeMenuIntakeScopeDocumentId()',
    'normalized tenant access, normalized limiter hashes, normalized project/store refs',
  ],
  'Changelog records Menu Intake Identity scope document-ID boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Extraction Retry Job ID Boundary',
    'whitespace-mutated',
    '`loadRetryContext()` now re-normalizes `retriedFromJobId` before reading `.doc(retriedFromJobId)`',
    'exclude `.doc(params.retriedFromJobId)`',
  ],
  'Lowercase changelog records Menu Extraction retry job ID boundary',
);

contains(
  '__docs__/changelog.md',
  ['Menu Extraction Project ID Boundary', 'whitespace-mutated', 'Menu Extraction Identity Helper Project ID Normalization'],
  'Lowercase changelog records Menu Extraction project ID boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Intake Identity Scope Document ID Boundary',
    'normalizeMenuIntakeScopeDocumentId()',
    'normalized tenant access, normalized limiter hashes, normalized project/store refs',
  ],
  'Lowercase changelog records Menu Intake Identity scope document-ID boundary',
);

contains(
  'src/components/templates/main-app/projects/constants.ts',
  [
    "import { MENU_EXTRACTION_JOB_LIMITS } from '@data/shared/menuExtractionJob';",
    'export const MAX_MENU_EXTRACTION_FILES = MENU_EXTRACTION_JOB_LIMITS.MAX_FILES;',
    'export const MAX_PDF_PAGES = MAX_MENU_EXTRACTION_FILES;',
    'export const WARN_PDF_PAGES = Math.max(10, MAX_PDF_PAGES - 3);',
  ],
  'Owner upload UI file/page limits share the backend extraction job cap',
);

contains(
  'src/components/templates/main-app/projects/index.tsx',
  [
    'MAX_MENU_EXTRACTION_FILES',
    'MAX_PDF_PAGES',
    'WARN_PDF_PAGES',
    'getPendingMenuExtractionFileCount',
    'showMenuUploadFileLimitError',
    'existingPendingCount + files.length > MAX_MENU_EXTRACTION_FILES',
    'filesToProcess.length > MAX_MENU_EXTRACTION_FILES',
    'existingPendingCount + newFileList.length > MAX_MENU_EXTRACTION_FILES',
    'pdf.numPages > MAX_PDF_PAGES',
    'pdf.numPages > WARN_PDF_PAGES',
    'canvas.width = 0;',
    'canvas.height = 0;',
  ],
  'Owner upload UI blocks oversized file/page batches before Storage upload',
);

contains(
  'src/components/templates/main-app/projects/utils/pdfUtils.ts',
  [
    'MAX_PDF_PAGES',
    'WARN_PDF_PAGES',
    'options: ConvertPdfToImagesOptions = {}',
    'const pageLimit = Math.max(0, Math.min(MAX_PDF_PAGES, requestedPageLimit));',
    'totalPages > MAX_PDF_PAGES',
    'totalPages > MAX_PDF_PAGES || totalPages > pageLimit',
    'totalPages > WARN_PDF_PAGES',
  ],
  'PDF utility stays aligned with shared page limit',
);

contains(
  '__docs__/projects/upload-file-processing/upload-file-processing_spec.md',
  [
    '15 page/job max',
    'Maximum PDF pages/job',
    'Mirrors `MENU_EXTRACTION_JOB_LIMITS.MAX_FILES`',
    'Maximum allowed is 15 pages per PDF',
    'not current launch certification',
    'External Certification Runbook',
    'Storage quota/rules evidence',
  ],
  'Upload-file processing spec documents the shared 15-page extraction cap',
);

notContains(
  '__docs__/projects/upload-file-processing/upload-file-processing_spec.md',
  [
    '**Status:** ✅ Production Ready',
    '_Document Status: ✅ PRODUCTION READY_',
  ],
  'Upload-file processing spec does not claim current production readiness',
);

contains(
  '__docs__/projects/upload-file-processing/upload-file-processing_impl.md',
  [
    'not current launch certification',
    'External Certification Runbook',
    'Storage quota/rules evidence',
    'Historical upload-processing implementation evidence - not current launch certification',
  ],
  'Upload-file processing implementation documents the current launch boundary',
);

notContains(
  '__docs__/projects/upload-file-processing/upload-file-processing_impl.md',
  [
    '**Status:** ✅ Production Ready',
    '_Document Status: ✅ PRODUCTION READY_',
  ],
  'Upload-file processing implementation does not claim current production readiness',
);

contains(
  '__docs__/projects/ai-data-extraction/edge-case-simulation-report.md',
  [
    'Large PDF (15 pages)',
    'Client caps the extraction job at 15 pages/files before Storage upload',
    'Extremely large PDF (50+ pages)',
    'Client blocks oversized PDF/page batches before Storage upload/API job creation',
  ],
  'AI extraction edge-case report documents large-PDF blocking behavior',
);

contains(
  '__docs__/projects/ai-data-extraction/ai-data-extraction_spec.md',
  [
    'not current production certification',
    'External Certification Runbook',
    'resolved QA Firebase Functions/Storage deploy blockers',
    'Historical AI extraction source evidence - not current launch certification',
  ],
  'AI extraction spec documents the current launch boundary',
);

notContains(
  '__docs__/projects/ai-data-extraction/ai-data-extraction_spec.md',
  [
    '_Document Status: ✅ PRODUCTION READY',
  ],
  'AI extraction spec does not claim current production readiness',
);

contains(
  '__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md',
  [
    'not current production certification',
    'External Certification Runbook',
    'resolved QA Firebase Functions/Storage deploy blockers',
    'Historical AI extraction implementation evidence - not current launch certification',
  ],
  'AI extraction implementation documents the current launch boundary',
);

notContains(
  '__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md',
  [
    '_Document Status: ✅ PRODUCTION READY',
  ],
  'AI extraction implementation does not claim current production readiness',
);

contains(
  '__docs__/projects/ai-data-extraction/chaos-failure-simulation-audit.md',
  [
    'historical failure-mode evidence, not current production certification',
    'External Certification Runbook',
    'resolved QA Firebase Functions/Storage deploy blockers',
    'Historical Failure-Mode Evidence',
  ],
  'AI extraction chaos audit documents the current launch boundary',
);

notContains(
  '__docs__/projects/ai-data-extraction/chaos-failure-simulation-audit.md',
  [
    '### Verdict: **PRODUCTION READY ✅**',
  ],
  'AI extraction chaos audit does not claim current production readiness',
);

contains(
  '__docs__/projects/ai-data-extraction/final-production-readiness-audit.md',
  [
    'historical code-readiness evidence, not current MenuList launch certification',
    'live production certification still requires the blocked QA Firebase Functions/Storage deploys',
    'What\'s Needed Before Launch Certification',
    'External Certification Runbook',
  ],
  'AI extraction final audit is marked as historical code-readiness evidence',
);

notContains(
  '__docs__/projects/ai-data-extraction/final-production-readiness-audit.md',
  [
    '# ✅ READY FOR PRODUCTION',
    '### What\'s Needed Before First Real Restaurant Extraction',
  ],
  'AI extraction final audit does not claim current launch certification',
);

contains(
  '__docs__/projects/ai-data-extraction/production-audit-mar13-2026.md',
  [
    'Historical Result:',
    'historical code-audit evidence, not current MenuList launch certification',
    'current launch status is governed by external certification gates',
    'Final Historical Verdict: Code Audit GO',
  ],
  'AI extraction March production audit is marked as historical code-audit evidence',
);

notContains(
  '__docs__/projects/ai-data-extraction/production-audit-mar13-2026.md',
  [
    'The AI Data Extraction feature is production-ready.',
    '| 7 | Production Readiness | 10/10 | No blocking prerequisites, deploy-ready |',
  ],
  'AI extraction March production audit does not claim current production readiness',
);

contains(
  '__docs__/projects/ai-data-extraction/cf-execution-audit-mar13-2026.md',
  [
    'Historical Result:',
    'historical Cloud Functions code-audit evidence, not current MenuList launch certification',
    'live effect still requires the blocked QA Firebase Functions deploy',
    'VERDICT: Historical Code Audit GO',
  ],
  'AI extraction Cloud Functions audit is marked as historical code-audit evidence',
);

notContains(
  '__docs__/projects/ai-data-extraction/cf-execution-audit-mar13-2026.md',
  [
    'The extraction pipeline Cloud Functions are **production-ready**.',
  ],
  'AI extraction Cloud Functions audit does not claim current production readiness',
);

[
  '__docs__/ai-extraction-monitoring/ai-extraction-monitoring_spec.md',
  '__docs__/ai-extraction-monitoring/ai-extraction-monitoring_impl.md',
].forEach((docPath) => {
  contains(
    docPath,
    [
      'controlled internal testing ready, not launch certification',
      'External Certification Runbook',
      'source-verified for controlled internal testing',
      'current production-readiness audit',
    ],
    `${docPath} documents the extraction monitoring launch boundary`,
  );
  notContains(
    docPath,
    [
      'Feature flag OFF, ready for production',
    ],
    `${docPath} does not claim flag-off production readiness`,
  );
});

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_mobile-support.md',
  [
    'Mobile upload enforces the same extraction file/page cap as desktop and the owner job API.',
    'rejects oversize multi-select batches',
    'passes the remaining page slots into PDF conversion before canvas rendering',
    'checks the prepared file count before any Storage upload or processing-job creation',
    'up to 15 menu photos or PDF pages at a time',
  ],
  'Menu extraction mobile-support doc records the shared mobile upload cap',
);

contains(
  '__docs__/production-readiness/infrastructure-risk-tracker.md',
  [
    'src/components/mobile/sheets/MenuUploadSheet.tsx',
    'Desktop and mobile upload now cap pending extraction batches at the shared 15 file/page limit before Storage upload',
    'mobile passes remaining PDF page slots into conversion before canvas rendering',
  ],
  'Production-readiness tracker records desktop/mobile extraction upload cap parity',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Desktop and mobile owner upload paths cap pending extraction batches at 15 files/pages before Storage upload',
    'mobile also passes remaining PDF page slots into conversion before canvas rendering',
  ],
  'Production-readiness audit records mobile extraction upload cap parity',
);

ordered(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'const safeModeResponse = await checkSafeMode();',
    'const ids = {',
    'verifyTenantAccess(session, ids.tId, ids.sId, request)',
    'const userRateLimitHash = hashPublicRateLimitValue(ids.uId);',
    'const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);',
    'const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);',
    'const parseGate = await checkRateLimit({',
    'key: `menu-extraction-job-request:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`',
    '...getRateLimitForFeature("FILE_UPLOAD")',
    'const bodyResult = await readBoundedJsonBody(request, MENU_EXTRACTION_JOB_MAX_BODY_BYTES);',
    'const validation = RequestSchema.safeParse(bodyResult.data);',
    'const projectIds = parseProjectIds(projectId);',
    'const projectDoc = await projectRef.get();',
    'const documentSizeGate = getProjectedProjectDocumentSize(projectData, requestedFiles.length);',
    'menu_extraction_project_document_size_gate_blocked',
    'const rateLimit = await checkRateLimit({',
    '...getRateLimitForFeature("AI_EXPENSIVE")',
  ],
  'Owner job API rate-limits/body-caps requests, validates project state, and blocks oversized project saves before expensive extraction work',
);

notContains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'key: `menu-extraction-job-request:${ids.uId}:${ids.tId}:${ids.sId}`',
    'key: `menu-extraction-job:${ids.uId}:${ids.tId}:${ids.sId}`',
  ],
  'Owner job API rate-limit keys do not store raw user, tenant, or store identifiers',
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
    'MENU_PROCESSING_JOB_START_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    '...MENU_PROCESSING_JOB_START_REQUEST_POLICY',
    'readJsonResponseWithLimit<MenuProcessingJobStartResponse>',
    'MENU_PROCESSING_JOB_START_RESPONSE_JSON_MAX_BYTES',
    'logMenuProcessingFailure',
    'getMenuProcessingJobLogContext',
    'destination?: MenuExtractionJobDestination',
    'destinationType?: MenuExtractionDestinationType',
    'skipProjectSave?: boolean',
    'reusedCompletedJob',
    'menu_processing_job_start_rejected',
    'menu_processing_job_start_response_parse_failed',
    'menu_processing_job_start_response_invalid',
  ],
  'Client helper creates jobs through protected API, handles reuse, and uses bounded diagnostics/status-only response handling',
);

notContains(
  'src/lib/firebase/menuProcessing.ts',
  [
    /\baddDoc\s*\(/,
    /\bsetDoc\s*\(/,
    /\bconsole\.(?:error|warn|log)\s*\(/,
    /Job \$\{jobId\}/,
    'jobIds:',
    'payload?.error ||',
    'response.json().catch(() => null)',
  ],
  'Client helper does not write extraction jobs directly or log/throw raw job diagnostics',
);

contains(
  'src/lib/firebase/menuProcessingDiagnostics.ts',
  [
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'getBoundedMenuProcessingStringContext',
    'getMenuProcessingJobLogContext',
    'getMenuProcessingProjectLogContext',
    'logMenuProcessingDiagnostic',
    "secureLog('[Menu Processing] Diagnostic'",
    'new Error(failureCode)',
    'sourceErrorName',
    'sourceErrorCode',
    'sourceStatusCode',
  ],
  'Menu processing diagnostics are normalized and bounded',
);

notContains(
  'src/lib/firebase/menuProcessingDiagnostics.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
  ],
  'Menu processing diagnostics helper does not direct-console failures',
);

contains(
  'src/hooks/useMenuProcessingJob.ts',
  [
    'logMenuProcessingFailure',
    'menu_processing_listener_failed',
    'menu_processing_cancel_failed',
    'getMenuProcessingJobLogContext(jobId)',
  ],
  'Menu processing status hook uses bounded diagnostics',
);

notContains(
  'src/hooks/useMenuProcessingJob.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    'Status update',
  ],
  'Menu processing status hook does not log raw job status changes',
);

contains(
  'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
  [
    'getMenuIntakeOperationLogContext',
    'getMenuIntakeFileLogContext',
    'menu_intake_identity_operation_log_failed',
    'menu_intake_identity_preflight_completed',
    'menu_intake_identity_preflight_failed',
    'menu_intake_identity_preflight_file_unreadable',
    'menu_intake_identity_provider_response_parse_failed',
    'logMenuProcessingDiagnostic',
    'logMenuProcessingFailure',
    'logMenuIntakeIdentityParseFailure',
    'MAX_MENU_INTAKE_IDENTITY_PARSE_DIAGNOSTICS',
    'reportedMenuIntakeIdentityParseFailures',
    "getMenuProcessingProjectLogContext(operation?.projectId)",
    'getBoundedMenuProcessingStringContext("fileType", file.type)',
    'getBoundedMenuProcessingStringContext("parseStage", context.stage)',
    'fallbackPolicy: "skip_file"',
    'fallbackPolicy: "use_low_confidence_identity_fallback"',
    'candidateLength: context.candidateLength',
    'trimmedTextLength: context.trimmedTextLength',
    'hasObjectFragment: context.hasObjectFragment',
    'validateServerNetworkTargetUrl(file.url',
    'function getStoragePathFromUploadUrl',
    'function isAllowedMenuIntakeStoragePath',
    'const fileFetchUrl = await resolveValidatedMenuIntakeFetchUrl(file, operation)',
    'fetch(fileFetchUrl, { redirect: "manual" })',
    'readResponseUint8ArrayWithLimit(response, MAX_MENU_INTAKE_PREFLIGHT_FILE_SIZE)',
    'storagePath.startsWith(`projects/files/${tId}/${sId}/`)',
    'storagePath.startsWith(`publicMenuDrafts/${draftToken}/`)',
  ],
  'Menu intake identity server diagnostics are bounded',
);

notContains(
  'src/lib/menu-extraction/menuIntakeIdentityServer.ts',
  [
    'secureLog(',
    'secureError(',
    '[MenuIntakeIdentity] Operation log failed',
    '[MenuIntakeIdentity] Preflight completed',
    '[MenuIntakeIdentity] Preflight failed',
    'reasons: analysis.decision.reasons',
    '} catch {\n      // Skip unreadable file in preflight',
    '} catch {\n    const objectMatch = candidate.match',
    '} catch {\n      return null;',
    'fetch(file.url)',
    'Buffer.from(await response.arrayBuffer())',
  ],
  'Menu intake identity server does not log raw project or decision diagnostics and does not fetch raw file URLs',
);

contains(
  'src/lib/security/boundedResponseBody.ts',
  [
    'class ResponseBodyTooLargeError extends Error',
    "response.headers.get('content-length')",
    'contentLength > maxBytes',
    'const arrayBuffer = await response.arrayBuffer()',
    'arrayBuffer.byteLength > maxBytes',
    'response.body.getReader()',
    'totalBytes > maxBytes',
    'await reader.cancel().catch(() => undefined)',
  ],
  'App-server bounded response-body helper enforces header, fallback, and streaming byte caps',
);

contains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'getMenuExtractionJobRouteLogContext',
    'menu_extraction_owner_upload_cleanup_partially_failed',
    'menu_extraction_owner_upload_metadata_lookup_failed',
    'menu_extraction_reusing_completed_owner_upload_job',
    'menu_extraction_owner_job_created',
    'menu_extraction_owner_job_creation_failed',
    'logMenuProcessingDiagnostic',
    'logMenuProcessingFailure',
    'getBoundedMenuProcessingStringContext("ownerUploadStoragePath", storagePath)',
    'targetLanguageCount: targetLanguages.length',
  ],
  'Menu extraction job route diagnostics are bounded',
);

notContains(
  'src/app/api/menu-extraction/jobs/route.ts',
  [
    'secureLog(',
    'secureError(',
    '[MenuExtractionJob] Duplicate owner upload cleanup partially failed',
    '.getMetadata().catch(() => [null as any])',
    '[MenuExtractionJob] Reusing completed owner upload job',
    '[MenuExtractionJob] Owner job created',
    '[MenuExtractionJob] Job creation failed',
  ],
  'Menu extraction job route does not log raw job/project diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/README.md',
  [
    'menu_extraction_owner_upload_metadata_lookup_failed',
    'menu_intake_identity_preflight_file_unreadable',
    'menu_intake_identity_provider_response_parse_failed',
    'getProcessedFile.ts',
    'stays quiet on normal job start, active-job reuse, and job-created paths',
    'desktop_menu_upload_job_create_failed',
    'job creation still continues',
    'the fingerprint is skipped for that request',
    'low-confidence fallback analysis',
    'without raw file names, URLs, paths, or identifiers',
  ],
  'Menu extraction README documents owner-upload metadata lookup fallback diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'menu_extraction_owner_upload_metadata_lookup_failed',
    'menu_intake_identity_preflight_file_unreadable',
    'menu_intake_identity_provider_response_parse_failed',
    'getProcessedFile.ts` no longer writes client debug breadcrumbs',
    'raw `logger.debug()` breadcrumbs',
    'continues without a fingerprint for that request',
    'Metadata lookup failures remain non-blocking',
    'fixed `use_low_confidence_identity_fallback` policy',
  ],
  'Menu extraction implementation doc documents owner-upload metadata lookup fallback diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'menu_extraction_owner_upload_metadata_lookup_failed',
    'menu_intake_identity_preflight_file_unreadable',
    'menu_intake_identity_provider_response_parse_failed',
    'desktop job-start debug breadcrumb cleanup is Firebase-cost neutral',
    'no longer emits normal-path client debug logs',
    'continues without completed-job fingerprint reuse for that request',
    'adds no new Firestore reads/writes/deletes',
    'extra provider calls',
  ],
  'Menu extraction Firebase doc documents owner-upload metadata lookup fallback cost boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Desktop menu upload job-start debug breadcrumb checkpoint',
    'raw `logger.debug()` breadcrumbs',
    'desktop_menu_upload_job_create_failed',
    'Menu-intake identity provider response parse diagnostics checkpoint',
    'menu_intake_identity_provider_response_parse_failed',
    'use_low_confidence_identity_fallback',
  ],
  'Production-readiness audit records desktop upload job diagnostics and menu-intake provider-response parse diagnostics',
);

contains(
  '__docs__/changelog.md',
  [
    'Desktop Menu Upload Job Diagnostics',
    'Desktop job-start debug breadcrumbs were removed',
    'desktop_menu_upload_job_create_failed',
    'Menu-Intake Identity Provider Response Parse Diagnostics',
    'menu_intake_identity_provider_response_parse_failed',
    'use_low_confidence_identity_fallback',
  ],
  'Changelog records desktop upload job diagnostics and menu-intake provider-response parse diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/README.md',
  [
    'Extraction review apply keeps MOL audit logging fire-and-forget',
    'menu_review_apply_mol_event_log_failed',
    'actor/tenant/store presence-length context',
    'applied-change count',
    'The owner success path and valid MOL writes stay unchanged',
  ],
  'Menu extraction README documents review apply MOL diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'extraction review MOL diagnostics are Firebase-cost neutral',
    'menu_review_apply_mol_event_log_failed',
    'already-attempted MOL event write',
    'no Firebase deploy requirement',
  ],
  'Menu extraction Firebase doc records review apply MOL cost boundary',
);

contains(
  '__docs__/projects/ai-data-extraction/README.md',
  [
    'Review apply MOL failures log bounded `menu_review_apply_mol_event_log_failed` diagnostics',
    'without blocking the acknowledged save',
  ],
  'AI Data Extraction README records review apply MOL diagnostic boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Extraction review MOL diagnostics checkpoint',
    'menu_review_apply_mol_event_log_failed',
    'non-blocking `void logMOLEvent` branch',
    'old silent catch exclusion',
  ],
  'Production-readiness audit records review apply MOL diagnostics',
);

contains(
  '__docs__/changelog.md',
  [
    'Extraction Review MOL Diagnostics',
    'Extraction review MOL failures are visible',
    'menu_review_apply_mol_event_log_failed',
    'comment-only silent catch',
  ],
  'Changelog records review apply MOL diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'Extraction review apply ID boundary',
    'src/lib/extraction/schemas.ts',
    'src/lib/extraction/applyChanges.ts',
    'before client Firestore project or job refs are built',
  ],
  'Menu extraction implementation doc records review apply ID boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'Extraction review apply ID admission is cost-neutral',
    'src/lib/extraction/schemas.ts',
    'src/lib/extraction/applyChanges.ts',
    'before client Firestore project or `menuImageProcessingJobs` document refs are built',
  ],
  'Menu extraction Firebase doc records review apply ID admission boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Extraction review apply ID boundary checkpoint',
    'src/lib/extraction/schemas.ts',
    'src/lib/extraction/applyChanges.ts',
    'malformed `projectId` and `jobId` values can no longer reach client Firestore project or `menuImageProcessingJobs` document refs',
  ],
  'Production-readiness audit records extraction review apply ID boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Extraction Review Apply ID Boundary',
    'Extraction review apply and discard IDs are validated before client Firestore refs',
    'malformed review `projectId` or `jobId` values no longer reach client Firestore refs',
  ],
  'Changelog records extraction review apply ID boundary',
);

contains(
  'src/components/templates/main-app/projects/index.tsx',
  [
    'logMenuProcessingFailure',
    'getBoundedMenuProcessingStringContext',
    'getMenuProcessingJobLogContext',
    'getMenuProcessingProjectLogContext',
    'menu_upload_existing_job_check_failed',
    'menu_upload_file_upload_failed',
    'menu_upload_uploaded_file_cleanup_failed',
    'menu_upload_job_create_failed',
    'menu_upload_image_optimization_failed',
    'menu_upload_pdf_conversion_failed',
    "getBoundedMenuProcessingStringContext('cleanupReason', cleanupReason)",
    'failedCleanupCount: failedCleanups.length',
    "'intake_cancelled'",
    "'intake_ignored_files'",
    "'no_files_for_job'",
    "'existing_active_job'",
    "message.error('Processing could not be completed. Please try again.')",
    "setFailureMessage('Processing could not be completed. Please try again.')",
  ],
  'Desktop menu upload caller uses bounded diagnostics and generic processing failures',
);

notContains(
  'src/components/templates/main-app/projects/index.tsx',
  [
    '[JobQueue]',
    '[MenuIntakeIdentity]',
    '[Image Optimization]',
    '[ExtractionReview]',
    'PDF processing cancelled by user',
    'PDF processing cancelled during page conversion',
    'Cancel flag reset - ready for new uploads',
    'Skipping file due to cancel flag:',
    'Skipping PDF due to cancel flag:',
    'error while uploading file',
    'Failed to load pdfjs-dist from CDN',
    'Processing failed: ${error.message',
    'message.error(error?.message',
    'await Promise.allSettled(successfulUploads.map(file => deleteFileByUrl(file.url)))',
    'await Promise.allSettled(intakeDecision.ignoredFiles.map(file => deleteFileByUrl(file.url)))',
    'await Promise.allSettled(filesForJob.map(file => deleteFileByUrl(file.url)))',
  ],
  'Desktop menu upload caller no longer logs raw upload, PDF, or job diagnostics',
);

contains(
  'src/components/templates/main-app/projects/index.tsx',
  [
    'projects_page_upload_business_details_update_failed',
    'projects_page_upload_business_details_store_update_rejected',
    'projects_page_upload_new_menu_create_failed',
    'projects_page_menu_link_import_failed',
    'assertStoreUpdateSucceeded(',
    'menu_upload_business_attributes_store_update_rejected',
    'assertProjectUpdateSucceeded(',
    'menu_upload_extracted_profile_defaults_project_update_rejected',
    'projects_page_upload_create_project_update_rejected',
    'We could not read this menu link. Upload a photo/PDF or add the menu manually.',
  ],
  'Desktop menu upload caller uses bounded diagnostics, acknowledged business-details, business-attribute, project-default, and upload-created project writes, and fixed owner text',
);

contains(
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  [
    'mobile_menu_business_attributes_default_apply_failed',
    'assertStoreUpdateSucceeded(',
    'mobile_menu_business_attributes_default_store_update_rejected',
    'assertProjectUpdateSucceeded(',
    'mobile_menu_project_profile_defaults_project_update_rejected',
  ],
  'Mobile menu review applies business-attribute and project-profile defaults only after acknowledged writes',
);

contains(
  'src/components/templates/main-app/projects/getProcessedFile.ts',
  [
    'logMenuProcessingFailure',
    'desktop_menu_upload_job_create_failed',
    'getMenuProcessingProjectLogContext(projectId)',
    'Menu processing failed. Please try again.',
  ],
  'Desktop processing job creation uses bounded diagnostics and fixed retry text',
);

notContains(
  'src/components/templates/main-app/projects/getProcessedFile.ts',
  [
    '@lib/monitoring/logger',
    'logger.debug(',
    "[createProcessingJob] Creating job",
    "[createProcessingJob] Found existing active job",
    "[createProcessingJob] Job created",
    'const errorMessage = error?.message',
    'logger.error(',
    'Menu processing failed: ${errorMessage}',
  ],
  'Desktop processing job creation does not log raw job/project breadcrumbs or propagate raw job failure text',
);

contains(
  'src/components/mobile/sheets/MenuUploadSheet.tsx',
  [
    'logMenuProcessingFailure',
    'getBoundedMenuProcessingStringContext',
    'getMenuProcessingProjectLogContext',
    'mobile_menu_upload_pdf_conversion_failed',
    'mobile_menu_upload_business_details_update_failed',
    'mobile_menu_upload_business_details_store_update_rejected',
    'mobile_menu_upload_intake_preflight_skipped',
    'mobile_menu_upload_uploaded_file_cleanup_failed',
    'mobile_menu_upload_job_create_failed',
    'mobile_menu_upload_link_import_failed',
    'assertStoreUpdateSucceeded(',
    'assertProjectUpdateSucceeded(',
    'mobile_menu_upload_create_project_update_rejected',
    "getBoundedMenuProcessingStringContext('cleanupReason', cleanupReason)",
    'failedCleanupCount: failedCleanups.length',
    "'intake_cancelled'",
    "'intake_ignored_files'",
    "'no_files_for_job'",
    "'existing_active_job'",
    "setErrorMessage(t('menuUploadRetry'))",
  ],
  'Mobile menu upload sheet uses bounded diagnostics, acknowledged upload-created project writes, and generic retry text',
);

contains(
  'src/components/mobile/sheets/MenuUploadSheet.tsx',
  [
    "import { MAX_MENU_EXTRACTION_FILES } from '@template/main-app/projects/constants';",
    'getPendingMenuExtractionFileCount',
    'existingPendingFileCount',
    'selectedFileCountRef',
    'getRemainingMenuUploadSlots',
    'showMenuUploadFileLimitError',
    'reserveMenuUploadSlots',
    'incomingSelectionCount > getRemainingMenuUploadSlots()',
    '{ maxPages: remainingPageSlots }',
    '!reserveMenuUploadSlots(convertedPdfImages.length)',
    '!reserveMenuUploadSlots(1)',
    'existingPendingFileCount + selectedFiles.length > MAX_MENU_EXTRACTION_FILES',
    'existingPendingFileCount + preparedFiles.length > MAX_MENU_EXTRACTION_FILES',
    'selectedFiles.length >= MAX_MENU_EXTRACTION_FILES',
  ],
  'Mobile menu upload sheet blocks oversized file/page batches before Storage upload',
);

notContains(
  'src/components/mobile/sheets/MenuUploadSheet.tsx',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[MobileMenuUpload]',
    'Toast.show({ content: error?.message',
    'setErrorMessage(error?.message',
    'await Promise.allSettled(uploadedFiles.map(file => deleteFileByUrl(file.url)))',
    'await Promise.allSettled(intakeDecision.ignoredFiles.map(file => deleteFileByUrl(file.url)))',
    'await Promise.allSettled(filesForJob.map(file => deleteFileByUrl(file.url)))',
  ],
  'Mobile menu upload sheet does not direct-console or show raw upload errors',
);

contains(
  'src/components/templates/main-app/projects/utils/pdfUtils.ts',
  [
    'logMenuProcessingFailure',
    'getBoundedMenuProcessingStringContext',
    'menu_pdf_conversion_canvas_context_missing',
    'menu_pdf_conversion_failed',
    'elapsedMs: Date.now() - startTime',
  ],
  'PDF conversion utility uses bounded diagnostics for conversion failures',
);

notContains(
  'src/components/templates/main-app/projects/utils/pdfUtils.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    'Started PDF conversion',
    'Processing ${file.name}',
    'Processed ${i}/${totalPages}',
    'PDF conversion complete',
    'Error converting PDF',
    'Cleaned up ${canvases.length} canvases',
    'Failed to get canvas context',
  ],
  'PDF conversion utility does not direct-console raw PDF/file diagnostics',
);

contains(
  'src/app/api/public/create-menu/route.ts',
  [
    'buildPublicDraftMenuExtractionDestination',
    'buildMenuExtractionRoutingFields',
    'analyzeMenuIntakeIdentity',
    'PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES',
    'MAX_CREATE_MENU_BODY_SIZE',
    'PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES',
    'failClosedOnProviderError: true',
    "rateLimitResult.reason === 'provider_unavailable'",
    'readBoundedJsonBody(req, PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES',
    'readBoundedFormDataBody(req, MAX_CREATE_MENU_BODY_SIZE',
    'hashPublicRateLimitValue(getClientIp(req))',
    'publicMenuDrafts/${draftToken}/',
    'MENU_EXTRACTION_SOURCES.PUBLIC_CREATE_MENU',
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'const draftRateLimitHash = hashPublicRateLimitValue(draftId);',
    'key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`',
    'statusOnly',
    'resultReady',
  ],
  'Public create-menu queues durable public draft jobs with identity metadata and status-only polling support',
);

contains(
  'src/app/api/public/create-menu/route.ts',
  [
    "import { validateFileUpload } from '@lib/security/fileValidation';",
    'const fileValidation = await validateFileUpload(buffer, imageFile.type, imageFile.size);',
    'if (!fileValidation.valid)',
    "error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'",
  ],
  'Public create-menu validates uploaded image signatures with fixed client-safe copy',
);

ordered(
  'src/app/api/public/create-menu/route.ts',
  [
    'const buffer = Buffer.from(await imageFile.arrayBuffer());',
    'const fileValidation = await validateFileUpload(buffer, imageFile.type, imageFile.size);',
    'const contentHash = hashBuffer(buffer);',
    'findReusableDraftForUser(userId, { contentHash })',
    'bucket.file(storagePath).save(buffer',
  ],
  'Public create-menu validates uploaded image signatures before draft reuse and Storage work',
);

ordered(
  'src/app/api/public/create-menu/route.ts',
  [
    "req.headers.get('content-length')",
    'contentLength > MAX_CREATE_MENU_BODY_SIZE',
    "req.headers.get('content-type')",
    'readBoundedJsonBody(req, PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES',
    'createMenuLinkDraft(req, userId, bodyResult.data)',
    'readBoundedFormDataBody(req, MAX_CREATE_MENU_BODY_SIZE',
  ],
  'Public create-menu caps link JSON and upload form-data before parsing',
);

notContains(
  'src/app/api/public/create-menu/route.ts',
  ['req.json()', 'req.formData()'],
  'Public create-menu does not parse unbounded request bodies',
);

contains(
  'src/app/api/public/create-menu/route.ts',
  [
    'getMenuLinkImportClientMessage(error, { publicEntry: true })',
    'PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE',
    "error: draft.extractionStatus === 'failed' ? PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE : null",
    'logSecurityDiagnostic',
    'logSecurityFailure',
    'getBoundedSecurityStringContext',
  ],
  'Public create-menu link-source rejection and draft polling return explicit safe client copy with bounded diagnostics',
);

notContains(
  'src/app/api/public/create-menu/route.ts',
  [
    'error: error.message, code: error.code',
    'error: draft.extractionError || null',
    'secureLog(',
    'secureError(',
    'new Error(String(error))',
    "createHash('sha256').update(ip)",
    'key: `public-menu-entry-status:${userId}:${draftId}`',
  ],
  'Public create-menu does not serialize raw failure text or raw draft/user diagnostics',
);

contains(
  'src/app/api/menu-intake-identity/route.ts',
  [
    'withAuth',
    'MENU_INTAKE_IDENTITY_MAX_BODY_BYTES',
    'readBoundedJsonBody(request, MENU_INTAKE_IDENTITY_MAX_BODY_BYTES)',
    'normalizeMenuIntakeScopeDocumentId',
    'const tenantScope = normalizeMenuIntakeScopeDocumentId(ids.tId);',
    'const storeScope = normalizeMenuIntakeScopeDocumentId(ids.sId);',
    'verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)',
    'getRateLimitForFeature("AI_OPERATION")',
    'const tenantRateLimitHash = hashPublicRateLimitValue(tenantScope.documentId);',
    'const storeRateLimitHash = hashPublicRateLimitValue(storeScope.documentId);',
    'normalizeMenuExtractionProjectId',
    'const MenuExtractionProjectIdSchema = z.string()',
    'projectId: MenuExtractionProjectIdSchema',
    'IntakeRequestSchema.safeParse(bodyResult.data)',
    'runMenuIntakeIdentityCheck',
  ],
  'Menu intake identity check is auth-scoped, rate-limited, and body-capped before identity analysis',
);

notContains(
  'src/app/api/menu-intake-identity/route.ts',
  [
    'projectId: z.string().min(3).max(160)',
  ],
  'Menu intake identity project IDs no longer use the loose string schema',
);

ordered(
  'src/app/api/menu-intake-identity/route.ts',
  [
    'const safeModeResponse = await checkSafeMode();',
    'const ids = {',
    'const tenantScope = normalizeMenuIntakeScopeDocumentId(ids.tId);',
    'const storeScope = normalizeMenuIntakeScopeDocumentId(ids.sId);',
    'verifyTenantAccess(session, tenantScope.documentId, storeScope.documentId, request)',
    'const rateLimitConfig = getRateLimitForFeature("AI_OPERATION");',
    'const rateLimit = await checkRateLimit({',
    'const bodyResult = await readBoundedJsonBody(request, MENU_INTAKE_IDENTITY_MAX_BODY_BYTES);',
    'const validation = IntakeRequestSchema.safeParse(bodyResult.data);',
    'runMenuIntakeIdentityCheck({',
  ],
  'Menu intake identity request fails cheap before JSON parsing and analysis work',
);

notContains(
  'src/app/api/menu-intake-identity/route.ts',
  [
    'verifyTenantAccess(session, ids.tId, ids.sId, request)',
    'const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);',
    'const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);',
    'sId: ids.sId',
    'tId: ids.tId',
  ],
  'Menu intake identity route must not use raw session scope after normalization',
);

contains(
  'src/lib/menu-intake-identity/client.ts',
  [
    'MENU_INTAKE_IDENTITY_REQUEST_POLICY',
    'cache: "no-store"',
    'credentials: "same-origin"',
    'redirect: "manual"',
    '...MENU_INTAKE_IDENTITY_REQUEST_POLICY',
    'readJsonResponseWithLimit<MenuIntakeIdentityClientResponse>',
    'MENU_INTAKE_IDENTITY_RESPONSE_JSON_MAX_BYTES',
    'logMenuProcessingFailure',
    'menu_intake_identity_rejected',
    'menu_intake_identity_response_parse_failed',
    'menu_intake_identity_response_invalid',
    'error.status = status',
    'Could not check this upload.',
  ],
  'Menu intake identity client uses explicit browser request policy, fixed rejection text, and bounded response parsing diagnostics',
);

notContains(
  'src/lib/menu-intake-identity/client.ts',
  [
    'payload?.error ||',
    'response.json().catch(() => null)',
  ],
  'Menu intake identity client does not propagate raw response-body text',
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
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    "t('CreateMenu.previewFailedFallback')",
    'handlePreviewDraftResponseStatus',
    'const previewFailure = handlePreviewDraftResponseStatus(res);',
    'if (previewFailure) return previewFailure;',
    'const fullPreviewFailure = handlePreviewDraftResponseStatus(res);',
    'if (fullPreviewFailure) return fullPreviewFailure;',
    'res.status === 401',
    'res.status === 410',
    'res.status === 404',
  ],
  'Public create-menu preview status and full fetches share auth, expiry, and missing-draft handling',
);

notContains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    'draft.error ||',
    '{draft.error',
  ],
  'Public create-menu preview failure does not render stored draft error text',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  ['Public create-menu preview stored-error display boundary'],
  'Menu extraction implementation docs record public preview stored-error display boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  ['Public create-menu preview stored-error display boundary'],
  'Menu extraction Firebase docs record public preview stored-error display boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  ['Public create-menu preview stored-error display boundary'],
  'Production-readiness audit records public preview stored-error display boundary',
);

contains(
  '__docs__/changelog.md',
  ['Public create-menu preview stored-error display boundary'],
  'Changelog records public preview stored-error display boundary',
);

contains(
  '__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md',
  ['Public create-menu preview stored-error display boundary'],
  'System-strengthening ledger records public preview stored-error display boundary',
);

occursAtLeast(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  "cache: 'no-store'",
  2,
  'Public create-menu preview and claim requests bypass browser cache',
);

occursAtLeast(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  "credentials: 'same-origin'",
  2,
  'Public create-menu preview and claim requests keep credentials same-origin',
);

occursAtLeast(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  "redirect: 'manual'",
  2,
  'Public create-menu preview and claim requests do not follow redirects',
);

contains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    'readJsonResponseWithLimit<unknown>',
    'CREATE_MENU_PREVIEW_RESPONSE_JSON_MAX_BYTES',
    'CREATE_MENU_PREVIEW_CLAIM_RESPONSE_JSON_MAX_BYTES',
    'public_create_menu_preview_response_parse_failed',
    'public_create_menu_preview_response_invalid',
    'public_create_menu_preview_claim_response_parse_failed',
    'public_create_menu_preview_claim_response_invalid',
    'isDraftStatus(data.status)',
    'data?.success !== true',
    'isNonEmptyResponseString(data.menuUrl)',
  ],
  'Public create-menu preview and claim responses use bounded parsing and shape checks',
);

notContains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    'let data = await res.json()',
    'data = await res.json()',
    'const data = await res.json()',
    'res.json().catch(() => ({}))',
  ],
  'Public create-menu preview and claim responses do not use direct or silent JSON parsing',
);

contains(
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  [
    'readJsonResponseWithLimit<CreateMenuDraftResponse>',
    'CREATE_MENU_RESPONSE_JSON_MAX_BYTES',
    'public_create_menu_response_parse_failed',
    'public_create_menu_response_invalid',
    'isNonEmptyString(payload?.draftId)',
    'router.push(`/create-menu/preview/${payload.draftId}`)',
    "setError(t('CreateMenu.uploadFailed'))",
    "setError(t('CreateMenu.linkFailed'))",
  ],
  'Public create-menu upload and link responses use bounded parsing and fixed localized failure copy',
);

occursAtLeast(
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  "cache: 'no-store'",
  2,
  'Public create-menu upload and link requests bypass browser cache',
);

occursAtLeast(
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  "credentials: 'same-origin'",
  2,
  'Public create-menu upload and link requests keep credentials same-origin',
);

occursAtLeast(
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  "redirect: 'manual'",
  2,
  'Public create-menu upload and link requests do not follow redirects',
);

notContains(
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  [
    'setError(data.error',
    'data.error || t(',
    'response.json().catch(() => ({}))',
    'const data = await response.json()',
    '/preview/${data.draftId}',
  ],
  'Public create-menu upload and link failures do not show raw API response text or parse route responses silently',
);

contains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    "setClaimError(t('CreateMenu.previewClaimFailed'))",
  ],
  'Public create-menu claim failure uses fixed localized copy',
);

notContains(
  'src/app/(website)/create-menu/PreviewClient.tsx',
  [
    'setClaimError(data.error',
    'data.error || t(',
  ],
  'Public create-menu claim failure does not show raw API response text',
);

contains(
  'src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx',
	  [
	    'CREATE_MENU_SUCCESS_BUSINESS_NAME_MAX_LENGTH',
	    'CREATE_MENU_SUCCESS_INVALID_BUSINESS_NAME_REPORT_LIMIT',
	    'CREATE_MENU_SUCCESS_URL_MAX_LENGTH',
	    'CREATE_MENU_SUCCESS_INVALID_URL_REPORT_LIMIT',
	    'normalizeCreateMenuSuccessBusinessName',
	    'normalizeCreateMenuSuccessUrl',
	    'public_create_menu_success_business_name_invalid',
	    'public_create_menu_success_url_invalid',
	    "const rawMenuUrl = searchParams.get('menuUrl') || '';",
	    "const rawOfficialPageUrl = searchParams.get('officialPageUrl') || '';",
	    "const rawBusinessName = searchParams.get('name') || '';",
	    'normalizeCreateMenuSuccessBusinessName(rawBusinessName, defaultBusinessName)',
	    "normalizeCreateMenuSuccessUrl('menuUrl', rawMenuUrl)",
	    "normalizeCreateMenuSuccessUrl('officialPageUrl', rawOfficialPageUrl)",
	    'businessNameInvalidReason',
	    'businessNameTrimmedLength',
	    'businessNameMaxLength',
	    "if (parsed.protocol !== 'https:')",
	    'if (parsed.username || parsed.password)',
	    'trimmedValueLength',
    'invalidUrlReason',
    'copyCreateMenuSuccessLinkToClipboard',
    'public_create_menu_success_copy_unavailable',
    'public_create_menu_success_copy_fallback_failed',
    'hasClipboardWrite',
    'hasCopyFallback',
    'typeof navigator.clipboard?.writeText === \'function\'',
    'Fall through to the acknowledged textarea fallback',
    "const copiedViaFallback = document.execCommand('copy');",
    'public_create_menu_success_copy_failed',
    'public_create_menu_success_whatsapp_open_failed',
    'public_create_menu_success_starter_signal_write_failed',
    'public_create_menu_success_starter_signal_claim_read_failed',
    'getCreateMenuSuccessStarterSignalContext',
    'getBoundedCreateMenuSuccessStringContext',
    'storeIdPresent',
    'getBoundedCreateMenuSuccessStringContext(\'rawClaim\', rawClaim)',
    "setHandoffError(t('CreateMenuSuccess.copyFailed'))",
    "setHandoffError(t('CreateMenuSuccess.whatsAppFailed'))",
    "const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')",
    'messageLength: message.length',
    'whatsappUrlLength: whatsappUrl.length',
  ],
  'Public create-menu success handoffs use fixed localized copy and bounded diagnostics',
);

notContains(
  'src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx',
  [
    "const businessName = searchParams.get('name') || t('CreateMenuSuccess.defaultBusinessName');",
	    "const menuUrl = searchParams.get('menuUrl') || '';",
	    "const officialPageUrl = searchParams.get('officialPageUrl') || '';",
    'document.body.appendChild(input);\n                input.select();',
    'navigator.clipboard.writeText(menuUrl);\n            } catch',
    'await navigator.clipboard.writeText(menuUrl);\n        return;\n    }',
    'recordStarterActivationSignal(storeId, signal).catch(() =>',
    '} catch {\n            // Non-blocking: the success page remains useful even if telemetry cannot be recorded.',
    "document.execCommand('copy');\n    } finally {\n        document.body.removeChild(input);",
  ],
  'Public create-menu success copy avoids implicit nested clipboard fallback flow',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  ['Public create-menu success business-name query display boundary'],
  'Menu extraction implementation docs record public success business-name query display boundary',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  ['Public create-menu success business-name query display boundary'],
  'Menu extraction Firebase docs record public success business-name query display boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  ['Public create-menu success business-name query display boundary'],
  'Production-readiness audit records public success business-name query display boundary',
);

contains(
  '__docs__/changelog.md',
  ['Public create-menu success business-name query display boundary'],
  'Changelog records public success business-name query display boundary',
);

contains(
  '__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md',
  ['Public create-menu success business-name query display boundary'],
  'System-strengthening ledger records public success business-name query display boundary',
);

ordered(
  'src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx',
  [
    "const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')",
    "throw new Error('public_create_menu_success_whatsapp_open_blocked')",
    'recordStarterSignal(STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED);',
    "logCreateMenuSuccessFailure('public_create_menu_success_whatsapp_open_failed'",
  ],
  'Public create-menu success records WhatsApp starter signal only after a safe browser open',
);

notContains(
  'src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx',
  [
    "window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')",
    'menuUrlSample',
    'officialPageUrlSample',
    'messageSample',
    'whatsappUrlSample',
  ],
  'Public create-menu success does not use unsafe WhatsApp opens or log raw share samples',
);

contains(
  'public/locales/menulist.ai/en-US.json',
  [
    '"copyFailed": "Could not copy the link. Try again."',
    '"whatsAppFailed": "Could not open WhatsApp. Try again."',
  ],
  'Public create-menu success has English fixed handoff failure copy',
);

contains(
  'public/locales/menulist.ai/hi-IN.json',
  [
    '"copyFailed": "Link copy नहीं हो पाया। फिर try करें।"',
    '"whatsAppFailed": "WhatsApp नहीं खुल पाया। फिर try करें।"',
  ],
  'Public create-menu success has Hindi fixed handoff failure copy',
);

contains(
  'src/app/api/public/create-menu/claim/route.ts',
  [
    "import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from '@lib/security/securityDiagnostics';",
    'PUBLIC_MENU_CLAIM_MAX_BODY_BYTES',
    'readBoundedJsonBody(request, PUBLIC_MENU_CLAIM_MAX_BODY_BYTES)',
    "import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';",
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'function normalizePublicMenuClaimNumericDocumentId(',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    'const tenantScope = normalizePublicMenuClaimNumericDocumentId(session.user.tenantId);',
    'const storeScope = normalizePublicMenuClaimNumericDocumentId(session.user.storeId);',
    'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);',
    'const existingProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);',
    'const tenantDoc = await transaction.get(tenantRef);',
    'const existingSummaryDoc = await transaction.get(existingProjectsSummaryRef);',
    '.doc(tenantDocumentId)',
    '.collection(storeDocumentId)',
    'const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeDocumentId}`);',
    'let existingSummaryProjectsForDefaultDemotion: Record<string, any> = {};',
    'existingSummaryProjectsForDefaultDemotion = existingSummaryDoc.exists',
    'Object.entries(existingSummaryProjectsForDefaultDemotion).forEach',
    'storeTenantId !== tenantId',
    'storeData.active === false',
    'storeData.deleted === true',
    'isPlatformEntityBlocked(storeData)',
    'isPlatformEntityBlocked(tenantDoc.data())',
    'getPublicMenuClaimDiagnosticContext',
    'public_menu_claim_succeeded',
    'public_menu_claim_cache_revalidation_failed',
    'public_menu_claim_failed',
    "getBoundedSecurityStringContext('draftId', context.draftId)",
    "getBoundedSecurityStringContext('userId', context.userId)",
    "getBoundedSecurityStringContext('storeId', context.storeId)",
    "getBoundedSecurityStringContext('projectId', context.projectId)",
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
  'src/app/api/public/create-menu/claim/route.ts',
  [
    'const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));',
    'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));',
    'const projectCollectionPath = `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}`;',
    'const existingProjectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);',
    'const projectsSummaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${storeId}`);',
  ],
  'Public draft claim no longer builds raw document refs from claim IDs',
);
contains(
  '__docs__/public-menu-entry/public-menu-entry_impl.md',
  ['Target document-ID guard'],
  'Public menu entry implementation docs record claim target document-ID boundary',
);
contains(
  '__docs__/public-menu-entry/public-menu-entry_firebase.md',
  ['Public create-menu claim target document-ID boundary hardening is Firebase-cost neutral'],
  'Public menu entry Firebase docs record claim target document-ID boundary',
);
contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  ['Public create-menu claim target document-ID boundary'],
  'Menu extraction implementation docs record claim target document-ID boundary',
);
contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  ['Public create-menu claim target document-ID boundary hardening is Firebase-cost neutral'],
  'Menu extraction Firebase docs record claim target document-ID boundary',
);
contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  ['Public create-menu claim target document-ID boundary checkpoint'],
  'Production-readiness audit records claim target document-ID boundary',
);
contains(
  '__docs__/changelog.md',
  ['Public Create Menu Claim Target Document ID Boundary'],
  'Changelog records claim target document-ID boundary',
);
contains(
  '__docs__/changelog.md',
  ['Public Create Menu Claim Target Document ID Boundary'],
  'Lowercase changelog records claim target document-ID boundary',
);

ordered(
  'src/app/api/public/create-menu/claim/route.ts',
  [
    'const existingSummaryDoc = await transaction.get(existingProjectsSummaryRef);',
    'if (Object.keys(storeDefaultsPatch).length > 0) {',
    'transaction.update(storeRef, {',
    'Object.entries(existingSummaryProjectsForDefaultDemotion).forEach',
    'transaction.set(projectRef, projectData);',
  ],
  'Public draft claim completes existing-account transaction reads before writes',
);

notContains(
  'src/app/api/public/create-menu/claim/route.ts',
  [
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    "secureLog('[PublicMenuEntry] Draft claimed successfully'",
    "secureError('[PublicMenuEntry] Cache revalidation failed'",
    "secureError('[PublicMenuEntry] Claim failed'",
    'new Error(String(cacheError))',
    'error instanceof Error ? error',
  ],
  'Public draft claim diagnostics do not log raw route/cache failures or identifiers',
);

ordered(
  'src/app/api/public/create-menu/claim/route.ts',
  [
    "const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');",
    'const rateLimitResult = await checkRateLimit({',
    'failClosedOnProviderError: true',
    "rateLimitResult.reason === 'provider_unavailable'",
    'const bodyResult = await readBoundedJsonBody(request, PUBLIC_MENU_CLAIM_MAX_BODY_BYTES);',
    'const validation = ClaimSchema.safeParse(bodyResult.data);',
    'const draftRef = db.collection(COLLECTION).doc(draftId);',
  ],
  'Public draft claim rate-limits and body-caps owner publish requests before draft reads',
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
    'MENU_LINK_IMPORT_MAX_BODY_BYTES',
    'readBoundedJsonBody(request, MENU_LINK_IMPORT_MAX_BODY_BYTES)',
    'normalizeMenuExtractionProjectId',
    'const MenuExtractionProjectIdSchema = z.string()',
    'projectId: MenuExtractionProjectIdSchema',
    'buildProjectMenuExtractionDestination',
    "buildProjectMenuExtractionDestination(projectId, 'review')",
    'buildMenuExtractionRoutingFields',
    'MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT',
    'menuLinkImports/${ids.tId}/${ids.sId}/${projectId}/${jobRef.id}/',
  ],
  'Authenticated link import uses shared project routing and review mode',
);

notContains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'projectId: z.string().min(3).max(160)',
  ],
  'Authenticated link import project IDs no longer use the loose string schema',
);

contains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'logMenuProcessingDiagnostic',
    'logMenuProcessingFailure',
    'getMenuProcessingProjectLogContext(projectId)',
    "getBoundedMenuProcessingStringContext('artifactId', artifactRef.id)",
    "getBoundedMenuProcessingStringContext('jobId', jobRef.id)",
    "getBoundedMenuProcessingStringContext('sourceKind', acquisition.sourceKind)",
    "getBoundedMenuProcessingStringContext('sourceErrorCode', error.code)",
    'MENU_LINK_IMPORT_STORAGE_CLEANUP_FAILED',
    'MENU_LINK_IMPORT_ARTIFACT_CLEANUP_FAILED',
    'deleteMenuLinkImportStoragePath',
    'deleteMenuLinkImportArtifactDoc',
    'menu_link_import_job_created',
    'menu_link_import_source_rejected',
    'menu_link_import_route_failed',
    'storagePathCount: createdStoragePaths.length',
    'artifactDocCreated',
    'jobDocCreated',
  ],
  'Authenticated link import route uses bounded menu-processing diagnostics',
);

notContains(
  'src/app/api/menu-link-imports/route.ts',
  [
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    "secureLog('[MenuLinkImport] Job created'",
    "secureLog('[MenuLinkImport] Source rejected'",
    "secureError('[MenuLinkImport] Import failed'",
    /secure(?:Log|Error)\('\[MenuLinkImport\]/,
    'Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete',
    'artifactRefForCleanup.delete().catch(() => undefined)',
  ],
  'Authenticated link import route does not log raw route identifiers or exceptions',
);

	contains(
	  'src/lib/menu-link-import/sourceAcquisition.ts',
	  [
	    'getMenuLinkImportClientMessage',
	    'OWNER_MENU_LINK_IMPORT_FALLBACK_MESSAGE',
    'PUBLIC_MENU_LINK_IMPORT_FALLBACK_MESSAGE',
    'MENU_LINK_IMPORT_CLIENT_MESSAGES',
    'buildChromeNetworkIsolationArgs',
    '`MAP ${hostPattern} ${formatChromeResolverAddress(renderTarget.address)}`',
    "'MAP * ~NOTFOUND'",
    "'--proxy-server=http://127.0.0.1:9'",
    '`--proxy-bypass-list=${hostPattern},<-loopback>`',
    '...buildChromeNetworkIsolationArgs(params.renderTarget)',
	    'const renderTarget = await assertSafeUrl(renderUrl, deadlineMs);',
	    'if (net.isIP(renderTarget.hostname)) return null;',
	    'renderTarget,',
	    'MENU_LINK_IMPORT_RENDER_FALLBACK_FAILED',
	    'logMenuProcessingFailure(MENU_LINK_IMPORT_RENDER_FALLBACK_FAILED',
	    "fallbackPolicy: 'skip_rendered_html'",
	    'renderFallbackUserDataDirCreated: Boolean(userDataDir)',
	    'MENU_LINK_IMPORT_RENDER_TMP_CLEANUP_FAILED',
	    'logMenuProcessingFailure(MENU_LINK_IMPORT_RENDER_TMP_CLEANUP_FAILED',
	    "cleanupTarget: 'chrome_user_data_dir'",
	    "getBoundedMenuProcessingStringContext('renderHostname', renderTarget.hostname)",
	  ],
	  'Menu link import source errors, rendered fallback, and render cleanup expose safe copy plus bounded diagnostics',
	);

	notContains(
	  'src/lib/menu-link-import/sourceAcquisition.ts',
	  [
	    '} catch {\n        return null;\n    } finally {',
	    'await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)',
	  ],
	  'Menu link import render fallback and cleanup failures are not silently swallowed',
	);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md',
  [
    'menu_link_import_render_fallback_failed',
    'skip_rendered_html',
    'render fallback failures',
  ],
  'Menu extraction implementation doc records render fallback diagnostics',
);

contains(
  '__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md',
  [
    'menu_link_import_render_fallback_failed',
    'skip_rendered_html',
    'adds no Firestore reads/writes/deletes',
  ],
  'Menu extraction Firebase doc records render fallback diagnostics cost boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Menu Link Import render fallback diagnostics checkpoint',
    'menu_link_import_render_fallback_failed',
    'skip_rendered_html',
  ],
  'Production-readiness audit records menu-link render fallback diagnostics',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Link Import Render Fallback Diagnostics',
    'menu_link_import_render_fallback_failed',
    'skip_rendered_html',
  ],
  'Changelog records menu-link render fallback diagnostics',
);

contains(
  'src/lib/menu-link-import/sourceAcquisition.ts',
  [
    'function getSourceTextMetadata(sourceText: string)',
    'sourceTextLength: sourceText.length',
    'sourceTextPresent: sourceText.length > 0',
    '...getSourceTextMetadata(sourceText)',
    '...getSourceTextMetadata(best.sourceText)',
  ],
  'Menu link import source acquisition keeps bounded source-text metadata',
);

notContains(
  'src/lib/menu-link-import/sourceAcquisition.ts',
  [
    'sourceTextPreview',
    'sourceText.slice(0, 500)',
    'best.sourceText.slice(0, 500)',
  ],
  'Menu link import source acquisition does not return raw source-text previews',
);

contains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'sourceTextLength: acquisition.sourceTextLength || 0',
    'sourceTextPresent: Boolean(acquisition.sourceTextPresent)',
  ],
  'Authenticated link import stores bounded source-text metadata',
);

notContains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'sourceTextPreview',
  ],
  'Authenticated link import does not store raw source-text previews',
);

contains(
  'src/app/api/public/create-menu/route.ts',
  [
    'sourceTextLength: acquisition.sourceTextLength || 0',
    'sourceTextPresent: Boolean(acquisition.sourceTextPresent)',
    'sourceTextLength: source.sourceTextLength || 0',
    'sourceTextPresent: Boolean(source.sourceTextPresent)',
  ],
  'Public create-menu stores bounded link source-text metadata',
);

notContains(
  'src/app/api/public/create-menu/route.ts',
  [
    'sourceTextPreview',
  ],
  'Public create-menu does not store raw source-text previews',
);

contains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'getMenuLinkImportClientMessage(error)',
  ],
  'Authenticated link import source rejection returns explicit safe client copy',
);

notContains(
  'src/app/api/menu-link-imports/route.ts',
  [
    'error: error.message, code: error.code',
  ],
  'Authenticated link import source rejection does not serialize raw error messages',
);

ordered(
  'src/app/api/menu-link-imports/route.ts',
  [
    'const safeModeResponse = await checkSafeMode();',
    'const ids = {',
    'verifyTenantAccess(session, ids.tId, ids.sId, request)',
    'const userRateLimitHash = hashPublicRateLimitValue(ids.uId);',
    'const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);',
    'const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);',
    "key: `menu-link-import:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`",
    "getRateLimitForFeature('MENU_LINK_IMPORT')",
    'const bodyResult = await readBoundedJsonBody(request, MENU_LINK_IMPORT_MAX_BODY_BYTES);',
    'const validation = RequestSchema.safeParse(bodyResult.data);',
    'const projectDoc = await projectRef.get();',
    'const acquisition = await acquireMenuLinkSource(url, { businessCategory, businessType });',
  ],
  'Menu link import rate-limits and body-caps before JSON parsing, project reads, source fetch, or Storage writes',
);

notContains(
  'src/app/api/menu-link-imports/route.ts',
  [
    "key: `menu-link-import:${ids.uId}:${ids.tId}:${ids.sId}`",
  ],
  'Menu link import rate-limit key does not store raw user, tenant, or store identifiers',
);

contains(
  'src/lib/menu-link-import/client.ts',
  [
    'MENU_LINK_IMPORT_REQUEST_POLICY',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    '...MENU_LINK_IMPORT_REQUEST_POLICY',
    'readJsonResponseWithLimit<MenuLinkImportResponse>',
    'MENU_LINK_IMPORT_RESPONSE_JSON_MAX_BYTES',
    'logMenuProcessingFailure',
    'getMenuProcessingJobLogContext(jobId)',
    'getBoundedMenuProcessingStringContext',
    'menu_link_import_request_failed',
    'menu_link_import_response_parse_failed',
    'menu_link_import_response_invalid',
    'menu_link_import_dev_trigger_failed',
    'useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS === \'true\'',
  ],
  'Menu link import client uses explicit browser request policy, bounded diagnostics for request, response parsing, and best-effort dev trigger failures',
);

notContains(
  'src/lib/menu-link-import/client.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[MenuLinkImport] Dev trigger failed',
    'manual processing.',
    'payload?.error ||',
    'response.json().catch(() => null)',
  ],
  'Menu link import client does not direct-console or throw raw response-body failures',
);

contains(
  'src/lib/extraction/schemas.ts',
  [
    "import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';",
    "import { normalizeMenuExtractionProjectId } from '@lib/menu-extraction/projectIdBoundary';",
    'const MenuExtractionProjectIdSchema = z.string()',
    'normalizeMenuExtractionProjectId(value) === value',
    'const MenuExtractionJobIdSchema = z.string()',
    'normalizeMenuExtractionJobId(value) === value',
    'projectId: MenuExtractionProjectIdSchema',
    'jobId: MenuExtractionJobIdSchema',
  ],
  'Extraction review schemas validate project and job IDs through Menu Extraction document ID boundaries',
);

notContains(
  'src/lib/extraction/schemas.ts',
  [
    'projectId: z.string().min(1)',
    'jobId: z.string().min(1)',
  ],
  'Extraction review schemas no longer use loose project/job ID strings',
);

contains(
  'src/lib/extraction/applyChanges.ts',
  [
    'logMenuProcessingFailure',
    'getBoundedMenuProcessingStringContext',
    'getMenuProcessingJobLogContext',
    'getMenuProcessingProjectLogContext',
    'normalizeMenuExtractionProjectId(rawProjectId)',
    'normalizeMenuExtractionJobId(rawJobId)',
    'normalizeMenuExtractionJobId(jobId)',
    'if (!projectId || !jobId) {',
    'if (!normalizedJobId) {',
    'APPLY_CHANGES_GENERIC_ERROR',
    'menu_review_apply_source_file_missing',
    'menu_review_apply_acknowledgement_mismatch',
    'menu_review_apply_business_attributes_failed',
    'MENU_REVIEW_APPLY_MOL_EVENT_LOG_FAILED',
    'menu_review_apply_mol_event_log_failed',
    'menu_review_apply_failed',
    'linked_outlet_project_save_rejected',
    'linked_outlet_project_save_response_parse_failed',
    'linked_outlet_project_save_response_invalid',
    'menu_review_linked_outlet_save_rejected',
    'menu_review_linked_outlet_save_response_parse_failed',
    'menu_review_linked_outlet_save_response_invalid',
    'LINKED_OUTLET_SAVE_REQUEST_POLICY',
    '...LINKED_OUTLET_SAVE_REQUEST_POLICY',
    'expectedChangeCount?: number',
    'function getAppliedExtractionChangeCount',
    'function isAcknowledgedApplyChangesResult',
    'appliedChangeCount <= 0',
    'appliedChangeCount !== expectedChangeCount',
    'completed: true',
    'function assertOwnedPreviewJob',
    "jobData.status !== 'preview_ready'",
    "throw new Error('Extraction review does not belong to this business')",
    'function ensureReviewSourceFiles',
    'active: true',
    'deleted: false',
    'index: nextIndex++',
    "message: ''",
    "await saveLinkedOutletProject(linkedOutletProjectPayload, jobId)",
    "'/api/projects/outlet-save'",
    "await revalidatePublicClientCacheForProject(projectId, 'applyExtractionChanges')",
    'void logMOLEvent({',
    '}).catch((error) => {',
    '...getBoundedMenuProcessingStringContext(\'actorUserId\', molContext.actorUserId)',
    '...getBoundedMenuProcessingStringContext(\'tenantId\', molContext.tId)',
    '...getBoundedMenuProcessingStringContext(\'storeId\', molContext.sId)',
    'appliedChangeCount: getAppliedExtractionChangeCount(stats)',
    'mode: applyPlan.mode',
    'version: molContext.version',
  ],
  'Review apply validates ownership/status, creates standard project file shells, routes linked outlets through outlet-save, and revalidates public render cache',
);

ordered(
  'src/lib/extraction/applyChanges.ts',
  [
    'const projectId = normalizeMenuExtractionProjectId(rawProjectId) || \'\';',
    'const jobId = normalizeMenuExtractionJobId(rawJobId) || \'\';',
    'if (!projectId || !jobId) {',
    'const session = await getActiveSession();',
    'const projectRef = doc(firebaseClient, `${DB_COLLECTIONS.PROJECTS}/${session.tId}/${session.sId}`, projectId);',
    'const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId);',
  ],
  'Review apply normalizes project and job IDs before client Firestore refs',
);

ordered(
  'src/lib/extraction/applyChanges.ts',
  [
    'const normalizedJobId = normalizeMenuExtractionJobId(jobId);',
    'if (!normalizedJobId) {',
    'const session = await getActiveSession();',
    'const jobRef = doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, normalizedJobId);',
  ],
  'Review discard normalizes job IDs before client Firestore refs',
);

notContains(
  'src/lib/extraction/applyChanges.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[applyExtractionChanges]',
    'File not found for UID',
    'result.error ||',
    'Linked outlet save failed: ${response.status}',
    'error.message ||',
    '[discardExtractionChanges]',
    '}).catch(() => { /* MOL should never block */ });',
  ],
  'Review apply helper uses bounded diagnostics and generic caller errors',
);

notContains(
  'src/lib/extraction/comparisonEngine.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[ComparisonEngine]',
  ],
  'Comparison engine does not direct-console extracted/menu statistics',
);

contains(
  'src/lib/extraction/redistribute.ts',
  [
    'logMenuProcessingFailure',
    'menu_redistribute_missing_combined_data',
    'filesCount: fileMappings.length',
  ],
  'Redistribution helper uses bounded diagnostics for malformed combined data',
);

notContains(
  'src/lib/extraction/redistribute.ts',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[redistribute]',
    'uses console.log instead of functions.logger',
    'Redistributed data',
  ],
  'Redistribution helper does not direct-console file/category/item counts',
);

missing(
  'src/components/templates/main-app/projects/utils/redistributeExtractedData.ts',
  'Dead duplicate project redistribution utility stays removed',
);

contains(
  'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx',
  [
    'logMenuProcessingFailure',
    'isAcknowledgedApplyChangesResult',
    'expectedChangeCount: totalChanges',
    'appliedChangeCount: totalChanges',
    'mode: applyPlan.mode',
    'desktop_extraction_review_apply_failed',
    'desktop_extraction_review_discard_failed',
    "const errorMessage = 'Failed to apply changes'",
    "const errorMessage = 'Failed to save changes'",
    "const errorMessage = 'Failed to discard changes'",
  ],
  'Desktop extraction review screen uses bounded diagnostics and generic owner errors',
);

notContains(
  'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[ExtractionJobReviewScreen]',
    'if (result.success)',
    'result.error ||',
    'error.message ||',
  ],
  'Desktop extraction review screen does not log or show raw apply/discard errors',
);

contains(
  'src/components/mobile/sheets/ExtractionReviewSheet.tsx',
  [
    'logMenuProcessingFailure',
    'isAcknowledgedApplyChangesResult',
    'expectedChangeCount: totalChanges',
    'appliedChangeCount: totalChanges',
    'mode: applyPlan.mode',
    'mobile_extraction_review_apply_failed',
    'mobile_extraction_review_discard_failed',
    'mobile_extraction_review_close_empty_failed',
    "content: t('applyChangesFailed')",
    "content: t('discardChangesFailed')",
  ],
  'Mobile extraction review sheet uses bounded diagnostics and generic translated errors',
);

notContains(
  'src/components/mobile/sheets/ExtractionReviewSheet.tsx',
  [
    /\bconsole\.(?:error|warn|log)\s*\(/,
    '[MobileExtractionReview]',
    'if (!result.success)',
    'result.error ||',
    'error?.message ||',
  ],
  'Mobile extraction review sheet does not log or show raw apply/discard errors',
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
  'src/lib/messaging-onboarding/previewRouteBoundary.ts',
  [
    'MESSAGING_PREVIEW_SESSION_ID_PATTERN = /^[A-Za-z0-9]{20}$/',
    'normalizeMessagingPreviewSessionId',
    'const raw = typeof value === "string" ? value : "";',
    'sessionId !== raw',
    'isValidFirestoreDocumentId(sessionId)',
  ],
  'Messaging preview route boundary accepts only exact Firestore auto-ID session parameters',
);

contains(
  'src/app/api/msg-preview/[sessionId]/route.ts',
  [
    'normalizeMessagingPreviewSessionId',
    'const sessionId = normalizeMessagingPreviewSessionId(rawSessionId);',
    'messaging_preview_get_route_failed',
    'getPreviewGetLogContext',
    'getBoundedRuntimeStringContext("sessionId", sessionId)',
    'const sessionHash = hashPublicRateLimitValue(sessionId);',
    'key: `msg-preview-read:${sessionHash}:${ipHash}`',
    'messaging_preview_event_write_failed',
    'eventType: "PREVIEW_VIEWED"',
    'metadataKeyCount: 0',
    'logRuntimeFailure',
  ],
  'Messaging preview GET route uses bounded diagnostics',
);

notContains(
  'src/app/api/msg-preview/[sessionId]/route.ts',
  [
    'secureError("[msg-preview] GET error"',
    'key: `msg-preview-read:${sessionId}:${ip}`',
    'sessionId.length < 10',
    '.catch(() => { })',
  ],
  'Messaging preview GET route does not log raw route failures, store raw rate-limit key material, or use loose session IDs',
);

contains(
  'src/app/api/msg-preview/[sessionId]/approve/route.ts',
  [
    'normalizeMessagingPreviewSessionId',
    'const sessionId = normalizeMessagingPreviewSessionId(params?.sessionId);',
    'executeMessagingOnboardingPublish',
    'state: "PUBLISHING"',
    'state === "LIVE"',
    'categoryCount < 1 || itemCount < 1 || !hasItemWithPrice',
    'messaging_preview_publish_retry_failed',
    'messaging_preview_approve_route_failed',
    'getPreviewApproveLogContext',
    'const ipHash = hashPublicRateLimitValue(ip);',
    'key: `publish:${ipHash}`',
    'PUBLISH_FAILED_REASON',
    'messaging_preview_event_write_failed',
    'eventType: "PREVIEW_APPROVED"',
    'eventType: "PUBLISH_FAILED"',
  ],
  'Messaging approval route uses the active centralized publish executor, publish gate, and bounded diagnostics',
);

notContains(
  'src/app/api/msg-preview/[sessionId]/approve/route.ts',
  [
    'secureError(',
    '[msg-preview/approve] Error',
    'key: `publish:${ip}`',
    'message: (retryError as Error).message',
    'Publish failed after retry: ${(retryError as Error).message}',
    'sessionId.length < 10',
    '.catch(() => { })',
  ],
  'Messaging approval route does not log/persist raw publish errors, raw rate-limit key material, or loose session IDs',
);

contains(
  'src/app/api/msg-preview/[sessionId]/fix/route.ts',
  [
    'normalizeMessagingPreviewSessionId',
    'const sessionId = normalizeMessagingPreviewSessionId(params?.sessionId);',
    'messaging_preview_fix_route_failed',
    'getPreviewFixLogContext',
    'getBoundedRuntimeStringContext("sessionId", sessionId)',
    'const sessionHash = hashPublicRateLimitValue(sessionId);',
    'key: `msg-preview-fix:${sessionHash}:${ipHash}`',
    'messaging_preview_event_write_failed',
    'eventType: "PREVIEW_FIX_REQUESTED"',
    'metadataKeyCount: 3',
    'logRuntimeFailure',
  ],
  'Messaging fix route uses bounded diagnostics',
);

notContains(
  'src/app/api/msg-preview/[sessionId]/fix/route.ts',
  [
    'secureError(',
    '[msg-preview/fix] Error',
    'key: `msg-preview-fix:${sessionId}:${ip}`',
    'sessionId.length < 10',
    '.catch(() => { })',
  ],
  'Messaging fix route does not log raw route failures, store raw rate-limit key material, or use loose session IDs',
);

contains(
  '__docs__/messaging-onboarding/messaging-onboarding_impl.md',
  [
    'July 5 route-param boundary',
    'src/lib/messaging-onboarding/previewRouteBoundary.ts',
    'Firestore auto-ID session shape',
    'whitespace-mutated',
    '400 Invalid session',
  ],
  'Messaging implementation docs record preview route-param boundary',
);

contains(
  '__docs__/messaging-onboarding/messaging-onboarding_firebase.md',
  [
    'July 5, 2026 preview route-param boundary note',
    'normalizeMessagingPreviewSessionId()',
    'Firestore auto-ID preview session shape',
    'whitespace-mutated',
    'before Firestore work',
  ],
  'Messaging Firebase docs record preview route-param boundary and cost behavior',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Messaging preview session route-param boundary checkpoint',
    'src/lib/messaging-onboarding/previewRouteBoundary.ts',
    'whitespace-mutated',
    'old loose `sessionId.length < 10` exclusion',
    'npm run verify:menu-extraction-pipeline',
  ],
  'Production audit records messaging preview route-param boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Messaging Preview Session Route-Param Boundary',
    'Preview session route params are shape-checked',
    'Whitespace-mutated preview session IDs fail closed',
    'npm run verify:menu-extraction-pipeline',
  ],
  'Changelog records messaging preview route-param boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Messaging Preview Session Route-Param Boundary',
    'Preview session route params are shape-checked',
    'Whitespace-mutated preview session IDs fail closed',
    'npm run verify:menu-extraction-pipeline',
  ],
  'Lowercase changelog records messaging preview route-param boundary',
);

contains(
  'src/lib/messaging-onboarding/publish.ts',
  [
    'export async function executeMessagingOnboardingPublish',
    'normalizeMessagingPreviewSessionId',
    'const normalizedSessionId = normalizeMessagingPreviewSessionId(sessionId);',
    'throw new Error("Invalid messaging preview session");',
    'logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_STARTED", "PUBLISHING", {',
    'const projectId = `${core.tenantId}-default-${core.storeId}`',
    'db.collection(`projects/${core.tenantId}/${core.storeId}`).doc(projectId)',
    'doc(normalizedSessionId)',
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
	    'revalidateTag("screen-data")',
	    'touchDigitalScreenContentVersionForStoreServer(result.storeId, "messagingOnboardingPublish")',
	    'messaging_onboarding_publish_cache_revalidation_failed',
	    'messaging_onboarding_publish_event_write_failed',
	    'getBoundedRuntimeStringContext("storeId", result.storeId)',
	    'getBoundedRuntimeStringContext("sessionId", sessionId)',
	    'logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_COMPLETED", "LIVE", {',
	    'logRuntimeFailure',
  ],
  'Messaging publish writes a renderer-ready project, summary entry, and public cache tags',
);

ordered(
  'src/lib/messaging-onboarding/publish.ts',
  [
    'const normalizedSessionId = normalizeMessagingPreviewSessionId(sessionId);',
    'if (!normalizedSessionId) {',
    'logPublishEvent(normalizedSessionId, sessionData, "PUBLISH_STARTED", "PUBLISHING", {',
    'doc(normalizedSessionId)',
  ],
  'Messaging publish helper normalizes session id before event writes and Firestore session doc access',
);

notContains(
  'src/lib/messaging-onboarding/publish.ts',
  [
    'secureError("[msg-preview/approve] Cache revalidation failed"',
    'secureError(',
    '.catch(() => {})',
    '.doc(sessionId)',
  ],
  'Messaging publish cache revalidation diagnostics are bounded',
);

contains(
  'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx',
  [
    'MSG_PREVIEW_PUBLISH_FAILED',
    'MSG_PREVIEW_FIX_FAILED',
    'MSG_PREVIEW_MAX_CORRECTIONS_REACHED',
    'MSG_PREVIEW_COPY_FAILED',
    'MSG_PREVIEW_WHATSAPP_OPEN_FAILED',
    'copyMsgPreviewPublishedLinkToClipboard',
    'msg_preview_success_link_copy_unavailable',
    'msg_preview_success_link_copy_fallback_failed',
    'msg_preview_success_link_copy_failed',
    'msg_preview_success_whatsapp_open_failed',
    'getBoundedMsgPreviewStringContext',
    'hasClipboardWrite',
    'hasCopyFallback',
    'Fall through to the acknowledged textarea fallback',
    'const copied = document.execCommand("copy");',
    'messageLength: message.length',
    'whatsappUrlLength: whatsappUrl.length',
    'window.open(whatsappUrl, "_blank", "noopener,noreferrer")',
  ],
  'Messaging preview page uses fixed publish/fix/share failure copy and bounded handoff diagnostics',
);

notContains(
  'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx',
  [
    'err.error ||',
    'setError(err.error',
    'await navigator.clipboard.writeText(publishResult.publicUrl);\n      setShareError(null);',
    'await navigator.clipboard.writeText(publicUrl);\n    return;\n  }',
    'document.execCommand("copy");\n    document.body.removeChild(textarea);',
    'window.open(`https://wa.me/?text=${msg}`, \'_blank\')',
    'sessionIdSample',
    'publicUrlSample',
    'messageSample',
  ],
  'Messaging preview page does not show raw route response text, use unsafe WhatsApp opens, or log raw share samples',
);

contains(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    'MENU_EXTRACTION_JOB_LIMITS.MAX_FILES',
    'MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES',
    'import { isSafeModeActive } from "../monitoring/safeMode";',
    'isSupportedJobFileType',
    'PUBLIC_CREATE_MENU_IMAGE_FILE_TYPES',
    'MESSAGING_JOB_FILE_TYPES',
    'updatePublicDraftFromExtraction',
    'markPublicDraftExtractionFailed',
    'getExtractionShapeError',
    'revalidatePublicClientCacheForStore',
    'touchDigitalScreen: true',
    '../utils/menuExtractionResultSummary',
    'buildExtractionTimings',
    'buildExtractionResultSummary',
    'summary: buildExtractionResultSummary',
    '? { combinedData: result.data.data }',
    "dataPrunedReason: 'project_auto_saved_immediate'",
    'timings: buildExtractionTimings',
    'PROCESS_MENU_IMAGES_JOB_FAILED_MESSAGE',
    'message: PROCESS_MENU_IMAGES_JOB_FAILED_MESSAGE',
    'PROCESS_MENU_IMAGES_JOB_STATUS_UPDATE_FAILED',
    'PROCESS_MENU_IMAGES_JOB_TENANT_MISMATCH',
    'PROCESS_MENU_IMAGES_JOB_BUSINESS_DEFAULTS_FAILED',
    'PROCESS_MENU_IMAGES_JOB_PUBLIC_DRAFT_STATUS_UPDATE_FAILED',
    'PROCESS_MENU_IMAGES_JOB_SAFE_MODE_ACTIVE',
    'PROCESS_MENU_IMAGES_JOB_SAFE_MODE_MESSAGE',
    'if (await isSafeModeActive())',
    'code: "SAFE_MODE_ACTIVE"',
    'retryAfterSeconds: 60',
    'updatePublicDraftExtractionStatus',
    'targetStatus: status',
    '...getBoundedFunctionStringContext("draftId", job.destination.draftId)',
    'getBoundedFunctionStringContext("jobId", jobId)',
    'function getMenuExtractionJobLogContext',
    'targetLanguageCount: job.targetLanguages.length',
    'sourceErrorName: getFunctionErrorName(hardeningError)',
    'sourceErrorName: getFunctionErrorName(error)',
    '...getBoundedFunctionStringContext("masterProjectId", existingProject?.masterProjectId)',
    'const sourceCode = String(getFunctionErrorCode(error) || "").toUpperCase()',
    'const sourceStatus = getFunctionErrorStatus(error)',
    'function normalizeRetryAfterSeconds(value: unknown): number | null',
    'source.details?.retryDelay',
  ],
  'Worker enforces shared limits, public draft lifecycle, shape checks, cache revalidation, timing telemetry, bounded diagnostics, failures, and result summaries',
);

ordered(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    'if (await isSafeModeActive())',
    'return;',
    'await markPublicDraftExtractionProcessing(jobId, job);',
    'const deterministicLinkResult = await tryExtractMenuLinkTextFromJob(jobId, job);',
    'const result = deterministicLinkResult || await processMenuImagesLogic(request);',
  ],
  'Worker checks SAFE_MODE before public draft processing and provider work',
);

notContains(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    '.doc(job.destination.draftId)\n        .update({\n            extractionStatus: "failed"',
    '.doc(job.destination.draftId)\n        .update({\n            extractionStatus: "processing"',
    '.catch(() => undefined);',
  ],
  'Worker public draft status side effects do not silently swallow update failures',
);

contains(
  'functions/src/logic/businessAttributeDefaults.ts',
  [
    'touchDigitalScreen?: boolean',
    'touchDigitalScreen: params.touchDigitalScreen === true',
    'storeIdLength: storeId.length',
    'contextLength: params.context.length',
    'appliedKeyCount:',
  ],
  'Business attribute defaults pass through first-extraction screen refresh intent',
);

notContains(
  'functions/src/logic/businessAttributeDefaults.ts',
  [
    'storeId,\n        context: params.context',
    'context: params.context',
    'appliedKeys:',
  ],
  'Business attribute defaults do not log raw store/context/attribute keys',
);

contains(
  'functions/src/logic/saveFilesToProject.ts',
  [
    'SAVE_FILES_TO_PROJECT_FAILED',
    'function getBoundedSaveFilesStringContext',
    'function getSaveFilesErrorContext',
    'function getExistingProjectSummary',
    'function buildProjectSummaryDefaultsUpdate',
    "import { MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS } from '../sharedData/menuExtractionProjectSize';",
    "...getBoundedSaveFilesStringContext('projectId', projectId)",
    "sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error",
    "throw new Error('Project not found.');",
    'firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${sId}`)',
    '[`projects.${projectId}`]',
    "const estimatedBytes = Buffer.byteLength(JSON.stringify(updateData), 'utf8');",
    'const FIRESTORE_SAFE_LIMIT = MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.SAVE_SAFE_BYTES;',
    'if (estimatedBytes > FIRESTORE_SAFE_LIMIT)',
    'if (estimatedBytes > MENU_EXTRACTION_PROJECT_DOCUMENT_SIZE_LIMITS.WARNING_BYTES)',
    'totalItems: updateData.files.reduce',
  ],
  'Project save helper uses bounded project/error diagnostics, mirrors extracted defaults into summary, and guards project document size',
);

contains(
  'src/components/templates/main-app/projects/index.tsx',
  [
    'const handleReset = async () => {',
    'const resetPatch = {',
    'files: [],',
    'overrides: { items: {}, categories: {}, attributes: {} }',
    'mutateProject({ ...activeProject, ...resetPatch }, false);',
    'const resetResult = await updateProject(resetPatch);',
    'assertProjectUpdateSucceeded(',
    'projects_page_reset_project_update_rejected',
    'mutateProject();',
    'projects_page_project_reset_failed',
  ],
  'Owner project reset is the explicit DS-1 cleanup path for replacement uploads',
);

contains(
  'src/components/templates/main-app/projects/ProjectDetails/ProjectConfirmModal.tsx',
  [
    'Are you sure you want to reset this {labels.offeringPhrase} and remove all files?',
    'All uploaded files and extracted data will be cleared.',
    'This action cannot be undone',
  ],
  'Owner project reset confirmation names file and extracted-data cleanup',
);

contains(
  'functions/src/triggers/production.ts',
  [
    'FUNCTIONS_PRODUCTION_TRIGGER_DATA_MISSING',
    'function getTriggerJobContext',
    'jobIdLength: jobId.length',
    "logger.info('[processMenuImagesJob] Job created.', getTriggerJobContext(jobId, 'processMenuImagesJob'))",
  ],
  'Production menu-image trigger logs bounded job context',
);

notContains(
  'functions/src/triggers/production.ts',
  [
    'Job created: ${jobId}',
    'event trigger for job ${jobId}',
  ],
  'Production menu-image trigger does not log raw job IDs',
);

contains(
  'functions/src/dev-triggers.ts',
  [
    'DEV_TRIGGER_FAILED',
    'DEV_TRIGGER_MISSING_DATA',
    'function getDevTriggerRequestContext',
    'jobIdLength: jobId.length',
    'jobDataKeyCount: jobData ? Object.keys(jobData).length : 0',
    "message: 'Successfully triggered processing.'",
  ],
  'Dev menu-image trigger logs bounded request context',
);

notContains(
  'functions/src/dev-triggers.ts',
  [
    'Called with data:',
    'Extracted data:',
    'Processing menu images for job ${jobId}',
    'Successfully triggered processing for ${jobId}',
    'logger.error(`[DEV_TRIGGER] Error:`, error)',
  ],
  'Dev menu-image trigger does not log raw request payloads, job IDs, or error objects',
);

notContains(
  'functions/src/logic/processMenuImagesJob.ts',
  [
    /logger\.info\(`\[processMenuProcessingJob\][\s\S]{0,120}\{\s*jobId,/,
    /logger\.info\(`\[processMenuImagesJob\] === STEP 1 COMPLETE[\s\S]{0,120}\{\s*jobId,/,
    /logger\.warn\(`\[processMenuImagesJob\] Outlet policy blocked extraction[\s\S]{0,220}projectId: job\.projectId/,
    /logger\.info\(`\[processMenuImagesJob\] === STEP 2 START[\s\S]{0,240}targetLanguages: job\.targetLanguages/,
    /logger\.info\(`\[processMenuImagesJob\] === STEP 5 START[\s\S]{0,180}projectId: job\.projectId/,
    /logger\.info\(`\[processMenuImagesJob\] Extraction type detected[\s\S]{0,260}masterProjectId: existingProject\?\.masterProjectId/,
    /logger\.info\(`\[processMenuImagesJob\] === STEP 6 SAVING TO PROJECT[\s\S]{0,260}projectId: job\.projectId/,
    'logger.error(`[processMenuImagesJob] Job ${jobId} failed`',
    'error: error.message',
    'error: hardeningError.message',
    'error: attributeError?.message || String(attributeError)',
    'message: error.message || "Unknown error"',
    'originalError: error.message',
    'updateError: updateError.message',
    'error.message',
    'error?.message',
    'String(error)',
    'message.match(/retryDelay',
    'message.match(/retry in',
    'fullRedistributedData',
    'JSON.stringify([...redistributedData.entries()])',
    'projectLanguages: verifyDoc.data()?.languages || []',
    'projectPath: projectVerifyRef.path',
  ],
  'Worker does not log raw IDs, extracted payloads, project paths, languages, or extraction failure messages',
);

notContains(
  'functions/src/logic/saveFilesToProject.ts',
  [
    /logger\.info\('\[saveFilesToProject\] Starting save'[\s\S]{0,100}\{\s*projectId,/,
    /logger\.info\('\[saveFilesToProject\] Preparing update data'[\s\S]{0,240}\bprojectId,/,
    /logger\.error\('\[saveFilesToProject\] DOCUMENT SIZE EXCEEDED SAFE LIMIT'[\s\S]{0,160}\bprojectId,/,
    /logger\.warn\('\[saveFilesToProject\] Document approaching size limit'[\s\S]{0,160}\bprojectId,/,
    /logger\.info\('\[saveFilesToProject\] Save complete'[\s\S]{0,160}\bprojectId,/,
    'fullUpdateData: JSON.stringify(updateData)',
    'Project not found: ${projectId}',
    'error: error.message',
  ],
  'Project save helper does not log raw project IDs, full project payloads, or raw error messages',
);

contains(
  'functions/src/logic/processMenuImages.ts',
  [
    'MENU_IMAGE_FILE_UPLOAD_FAILED_CODE',
    'MENU_IMAGE_BATCH_FAILED_CODE',
    'MENU_IMAGE_REQUEST_FAILED_CODE',
    'MENU_EXTRACTION_FAILED_MESSAGE',
    'function getExtractionErrorContext',
    'function getExtractionIdLogContext',
    'function getExtractionRequestLogContext',
    'MENU_IMAGE_FILE_URL_REJECTED_CODE',
    'MENU_IMAGE_FILE_TOO_LARGE_CODE',
    'function getStoragePathFromDownloadUrl',
    'function isAllowedExtractionFileStoragePath',
    'validateNetworkTargetUrl(file.url',
    'const fileFetchUrl = await resolveValidatedFileFetchUrl(file, request)',
    'fetch(fileFetchUrl)',
    'buildSafeTempFilePath(file.name, "menu-source-file")',
    'readResponseUint8ArrayWithLimit(response, MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES)',
    'isResponseBodyTooLargeError(error)',
    "getExtractionRequestLogContext({ requestId, projectId, fileId })",
    "getExtractionIdLogContext('documentName', document?.name)",
    'const errorMessage = MENU_EXTRACTION_FAILED_MESSAGE',
    'failureCode: MENU_IMAGE_REQUEST_FAILED_CODE',
    'message: `Batch ${batchIndex + 1} failed.`',
    "logger.error('[processMenuImages] Failed to record transaction', undefined,",
    "logger.error('[processMenuImages] Failed to record failure transaction', undefined,",
    'logger.error(`[processMenuImages] Request failed`, undefined,',
  ],
  'Direct extraction helper stores and logs bounded failure codes for queued extraction',
);

contains(
  'functions/src/utils/boundedResponseBody.ts',
  [
    'response.headers.get("content-length")',
    'contentLength > maxBytes',
    'const arrayBuffer = await response.arrayBuffer()',
    'arrayBuffer.byteLength > maxBytes',
    'response.body.getReader()',
    'totalBytes > maxBytes',
  ],
  'Bounded response-body helper enforces header, fallback, and streaming byte caps',
);

notContains(
  'functions/src/logic/processMenuImages.ts',
  [
    'error.message',
    'error?.message',
    'transactionError?.message',
    'Failed to fetch file:',
    'Batch ${batchIndex + 1} failed:',
    'Details: ${failureMessages',
    'error: (transactionError as Error).message',
    'error: transactionError?.message',
    'logger.error(`[processSingleBatch] Batch ${batchIndex + 1} failed`, error',
    'logger.error(`[processMenuImages] Request failed`, error',
    'logger.error(`[uploadFileToGemini] Failed to upload: ${file.name}`, error)',
    'logger.info(`[uploadFileToGemini] Upload successful: ${file.name}`',
    'fetch(file.url)',
    'const tempFilePath = `/tmp/${uniqueId}-${file.name}`',
    'const blob = await response.blob()',
    'const arrayBuffer = await response.arrayBuffer()',
    'documentName: document?.name',
    'logger.warn(`[uploadFileToGemini] Cleanup warning: ${tempFilePath}`',
    "logger.warn(`[processMenuImages] Rate limit exceeded`, { projectId, waitSeconds })",
    'logger.info(`[processMenuImages] Starting request ${requestId}`',
    'logger.milestone(\'Request started\', { requestId, filesCount: files.length })',
    'logger.info(`[addAiOperation] Transaction recorded: ${docRef.id}`)',
    'logger.error(\'[processMenuImages] Failed to record transaction\', undefined, {\n                requestId,\n                projectId,\n                fileId,',
    'logger.error(\'[processMenuImages] Failed to record failure transaction\', undefined, {\n                requestId,\n                projectId,\n                fileId,',
    'logger.error(`[processMenuImages] Request failed`, undefined, {\n            requestId,\n            projectId,\n            fileId,',
    "logger.error('[addAiOperation] Failed to record transaction', error)",
  ],
  'Direct extraction helper does not log, persist, or return raw extraction exception messages',
);

contains(
  'functions/src/utils/safeTempFile.ts',
  [
    'sanitizeTempFileBasename',
    'buildSafeTempFilePath',
    '.replace(/\\.\\./g, "")',
    '.replace(/[/\\\\]/g, "")',
    '.replace(/[^a-zA-Z0-9._-]/g, "_")',
    '.replace(/^\\.+/, "")',
    'return `/tmp/${uniqueId}-${basename}`;',
  ],
  'Functions temp-file helper strips path traversal and unsafe basename characters',
);

contains(
  'functions/src/logic/menuLinkTextExtraction.ts',
  [
    'MENU_LINK_TEXT_EXTRACTION_SKIPPED_CODE',
    'function getMenuLinkTextExtractionErrorContext',
    'function isAllowedMenuLinkTextArtifactPath',
    'objectPath.startsWith(`menuLinkImports/${tId}/${sId}/${projectId}/`)',
    'if (metadataPath && storageFromUrl?.objectPath && metadataPath !== storageFromUrl.objectPath) return null;',
    'if (!isAllowedMenuLinkTextArtifactPath(job, objectPath)) return null;',
    'jobIdLength: jobId.length',
    'failureCode: MENU_LINK_TEXT_EXTRACTION_SKIPPED_CODE',
    "(error.name || 'Error').slice(0, 80)",
    'String(record.code).slice(0, 64)',
    'String(status).slice(0, 32)',
  ],
  'Deterministic menu-link text extraction uses bounded diagnostics',
);

ordered(
  'functions/src/logic/menuLinkTextExtraction.ts',
  [
    'if (!isAllowedMenuLinkTextArtifactPath(job, objectPath)) return null;',
    "const [buffer] = await storageAdmin.bucket(bucketName).file(objectPath).download();",
  ],
  'Deterministic menu-link text extraction validates artifact path before Storage download',
);

notContains(
  'functions/src/logic/menuLinkTextExtraction.ts',
  [
    'jobId,',
    'error?.message || String(error)',
    'error.message',
    'String(error)',
    'sourceErrorName: error.name ||',
    'sourceErrorCode: (error as any).code',
    'sourceErrorStatus: (error as any).status || (error as any).statusCode',
  ],
  'Deterministic menu-link text extraction does not log raw job IDs or exception messages',
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
    'function normalizePublicMenuProjectDocumentScope',
    'const projectScope = normalizePublicMenuProjectDocumentScope(projectId);',
    'if (!projectScope) return null;',
    '.collection(DB_COLLECTIONS.PROJECTS)',
    '.doc(projectScope.tenantDocumentId)',
    '.collection(projectScope.storeDocumentId)',
    '.doc(projectScope.projectId)',
    'targetProject.projectId || targetProject.id',
  ],
  'Public renderer loads projects from the normalized nested project ID contract',
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

contains(
  'src/components/templates/main-app/platform/extractionMonitor/index.tsx',
  [
    "import useSWR from 'swr';",
    'EXTRACTION_MONITOR_DEDUPING_INTERVAL_MS = 5 * 60 * 1000',
    'useSWR<ExtractionDashboardSnapshot>',
    'dedupingInterval: EXTRACTION_MONITOR_DEDUPING_INTERVAL_MS',
    'revalidateOnFocus: false',
    'const refreshData = useCallback',
    'void mutate();',
    'onRetrySuccess={refreshData}',
  ],
  'Extraction monitor dashboard reads use SWR with a five-minute dedupe window and manual force refresh',
);

contains(
  'src/components/templates/main-app/platform/extractionMonitor/CostMonitor.tsx',
  [
    "import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';",
    "EXTRACTION_COST_MONITOR_LOAD_FAILED = 'extraction_cost_monitor_load_failed'",
    "logOpsFailure(EXTRACTION_COST_MONITOR_LOAD_FAILED",
    "getBoundedOpsStringContext('refreshTrigger', refreshTrigger)",
    'externalCostProvided: false',
    'setCostLoadFailed(true)',
    'Cost metrics unavailable',
    'Refresh the monitor.',
  ],
  'Extraction Cost Monitor standalone load failures use bounded diagnostics and fixed unavailable state',
);

notContains(
  'src/components/templates/main-app/platform/extractionMonitor/CostMonitor.tsx',
  [
    '.catch(() => { if (mounted) setCost(null); })',
  ],
  'Extraction Cost Monitor standalone load failures are not collapsed into no-cost empty state',
);

contains(
  '__docs__/ai-extraction-monitoring/README.md',
  [
    'extraction_cost_monitor_load_failed',
    'Cost metrics unavailable',
    'instead of reporting zero extraction calls',
  ],
  'AI extraction monitoring README documents Cost Monitor load diagnostics',
);

contains(
  '__docs__/ai-extraction-monitoring/ai-extraction-monitoring_impl.md',
  [
    'standalone compatibility path',
    'extraction_cost_monitor_load_failed',
    'Cost metrics unavailable',
    'No extraction calls today',
  ],
  'AI extraction monitoring implementation doc documents Cost Monitor load diagnostics',
);

contains(
  '__docs__/ai-extraction-monitoring/ai-extraction-monitoring_firebase.md',
  [
    'Standalone cost-panel diagnostics',
    'extraction_cost_monitor_load_failed',
    'already-attempted compatibility read',
    'no writes, Storage operations, Cloud Functions, provider calls, rules, indexes, or deploy requirement',
  ],
  'AI extraction monitoring Firebase doc records Cost Monitor cost boundary',
);

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Extraction Cost Monitor load diagnostics checkpoint',
    'extraction_cost_monitor_load_failed',
    'old silent catch exclusion',
    'Cost metrics unavailable',
  ],
  'Production-readiness audit records Cost Monitor load diagnostics',
);

contains(
  '__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md',
  [
    'Extraction Cost Monitor load diagnostics',
    'extraction_cost_monitor_load_failed',
    'No extraction calls today',
    'old silent catch',
  ],
  'System data-flow audit records Cost Monitor load diagnostics',
);

contains(
  '__docs__/changelog.md',
  [
    'Extraction Cost Monitor Load Diagnostics',
    'extraction_cost_monitor_load_failed',
    'Cost metrics unavailable',
    'old silent `setCost(null)` catch exclusion',
  ],
  'Changelog records Cost Monitor load diagnostics',
);

contains(
  'src/database/ops/extraction.ts',
  [
    'function getExtractionJobErrorSummary',
    'function getExtractionJobErrorDetails',
    "message: 'Extraction failed'",
    'error: getExtractionJobErrorDetails(data.error)',
    "logOpsFailure('extraction_dal_recent_jobs_failed'",
    "logOpsFailure('extraction_dal_job_details_failed'",
    "logOpsFailure('extraction_dal_health_metrics_failed'",
    "logOpsFailure('extraction_dal_quality_metrics_failed'",
    "logOpsFailure('extraction_dal_cost_metrics_failed'",
    "logOpsFailure('extraction_dal_dashboard_snapshot_failed'",
    'getBoundedOpsStringContext',
  ],
  'Extraction monitor DAL sends bounded job error details and failure diagnostics',
);

contains(
  'src/components/templates/main-app/platform/extractionMonitor/index.tsx',
  [
    "logOpsFailure('extraction_monitor_load_failed'",
    'statusFilter: getBoundedStatusFilter(statusFilter)',
    "description: 'Refresh the monitor and try again.'",
  ],
  'Extraction monitor load failures use bounded diagnostics and fixed platform copy',
);

contains(
  'src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx',
	    [
	        "logOpsFailure('extraction_job_inspector_load_failed'",
	        "logOpsFailure('extraction_job_retry_failed'",
	        "logOpsFailure('extraction_job_inspector_copy_failed'",
	        'extraction_job_inspector_clipboard_unavailable',
	        'extraction_job_inspector_clipboard_fallback_failed',
	        'copyExtractionJobInspectorTextToClipboard(text)',
	        'hasExtractionJobInspectorClipboardWrite',
	        'hasExtractionJobInspectorCopyFallback',
	        "const copied = document.execCommand('copy');",
	        'hasClipboardWrite: hasExtractionJobInspectorClipboardWrite()',
	        'hasCopyFallback: hasExtractionJobInspectorCopyFallback()',
	        "getBoundedOpsStringContext('copyText', text)",
	        "description: 'Try selecting and copying the text manually.'",
	        'function getBoundedJobErrorCode',
	        "description: 'Refresh the drawer and try again.'",
        "description: 'The extraction retry could not be started.'",
        'Extraction failed. Use the bounded code below for investigation.',
    ],
  'Extraction job inspector failures use bounded diagnostics and fixed platform copy',
);

notContains(
  'src/database/ops/extraction.ts',
  [
    'data.error?.message || null',
    'error: data.error || null',
    "secureError('[ExtractionDAL]",
  ],
  'Extraction monitor DAL does not pass raw stored job error text or raw caught failures',
);

notContains(
  'src/components/templates/main-app/platform/extractionMonitor/index.tsx',
  [
    'description: error.message',
    'description={error.message}',
    'const [loading, setLoading]',
    'const fetchData = useCallback',
  ],
  'Extraction monitor load notification does not display raw exception text and does not use the old un-deduped fetch state',
);

notContains(
  'src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx',
	    [
	        'description: error.message',
	        'description={error.message}',
	        'job.error.message',
	        'await navigator.clipboard.writeText(text);\n            notification.success',
	        'navigator.clipboard.writeText(text);\n        notification.success',
	        "document.execCommand('copy');\n        notification.success",
	    ],
	  'Extraction job inspector does not display raw exception or stored job error text and does not assume clipboard success',
);

contains(
  'src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx',
  [
    'project_file_source_link_open_failed',
    "throw new Error('project_file_source_link_open_blocked')",
    "const opened = window.open(sourceUrl, '_blank', 'noopener,noreferrer')",
    "getBoundedRuntimeStringContext('sourceUrl', sourceUrl)",
    "getBoundedRuntimeStringContext('fileName', file.name)",
    "getBoundedRuntimeStringContext('fileType', file.type)",
    "message.error('Unable to open source link')",
    'onClick={handleSourceLinkOpen}',
  ],
  'Project file source-link preview uses fixed copy and bounded diagnostics',
);

notContains(
  'src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx',
  [
    "onClick={() => window.open(sourceUrl, '_blank', 'noopener,noreferrer')}",
  ],
  'Project file source-link preview does not use raw inline browser open',
);

for (const [docPath, label] of [
  ['__docs__/menu-extraction-pipeline/README.md', 'Menu Extraction Pipeline README'],
  ['__docs__/menu-extraction-pipeline/menu-extraction-pipeline_impl.md', 'Menu Extraction Pipeline implementation doc'],
  ['__docs__/menu-extraction-pipeline/menu-extraction-pipeline_firebase.md', 'Menu Extraction Pipeline Firebase doc'],
  ['__docs__/menu-extraction-pipeline/menu-extraction-pipeline_mobile-support.md', 'Menu Extraction Pipeline mobile doc'],
]) {
  contains(
    docPath,
    [
      'Not current launch certification or deploy approval',
      'External Certification Runbook',
      '`npm run verify:production-readiness-local`',
      '`npm run verify:menu-extraction-pipeline`',
      '`npm run verify:ai-accounting`',
      '`npm run verify:functions-deploy-preflight`',
      'provider smoke for the target extraction model and environment',
      'authenticated desktop/mobile upload, identity-preflight, preview/review/apply QA',
      'real-device mobile upload/review QA',
      'public create-menu upload/link/preview/claim QA',
      'owner review before publish',
      'target Firebase deploy evidence where rules, Storage, indexes, or Functions change',
      'target Vercel deploy evidence where app routes or browser clients change',
      'production-host smoke',
    ],
    `${label} top launch boundary`,
  );
}

contains(
  '__docs__/audits/menulist-production-readiness-audit.md',
  [
    'Menu Extraction Pipeline technical-doc top-boundary checkpoint',
    'provider smoke for the target extraction model/environment',
    'owner review before publish',
  ],
  'Production-readiness audit records Menu Extraction Pipeline technical-doc boundary',
);

contains(
  '__docs__/changelog.md',
  [
    'Menu Extraction Pipeline Technical Doc Boundary',
    'Extraction technical docs are source-bounded',
  ],
  'Changelog records Menu Extraction Pipeline technical-doc boundary',
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
