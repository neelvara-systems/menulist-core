const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertNoDirectConsole(content, label) {
  assert(
    !/\bconsole\.(?:error|warn|log|debug)\s*\(/.test(content),
    `${label} must not use direct runtime console logging`,
  );
}

function assertOrder(content, needles, label) {
  let cursor = -1;
  const missingOrOutOfOrder = [];
  needles.forEach((needle) => {
    const nextIndex = content.indexOf(needle, cursor + 1);
    if (nextIndex === -1) {
      missingOrOutOfOrder.push(needle);
      return;
    }
    cursor = nextIndex;
  });
  assert(
    missingOrOutOfOrder.length === 0,
    `${label} missing or out of order: ${missingOrOutOfOrder.join(', ')}`,
  );
}

function listRouteFiles(dirRelPath) {
  const dirPath = path.join(ROOT, dirRelPath);
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relPath = path.join(dirRelPath, entry.name);
    if (entry.isDirectory()) return listRouteFiles(relPath);
    return /\/route\.tsx?$/.test(relPath) ? [relPath] : [];
  });
}

function verifyNoAnswerlatticeDirectBodyParsers() {
  const routeFiles = [
    ...listRouteFiles('src/app/api/answerlattice'),
    ...listRouteFiles('src/app/api/widget'),
    ...listRouteFiles('src/app/api/helpCenter'),
    'src/app/api/revalidate/answerlattice/route.ts',
    'src/app/api/platform/answerlattice-intake/route.ts',
  ];
  const offenders = routeFiles.filter((relPath) => {
    const content = read(relPath);
    return /\b(?:request|req)\s*\.\s*(?:json|text|arrayBuffer|blob|formData)\s*\(/.test(content);
  });

  assert(
    offenders.length === 0,
    `Answerlattice-related route files must use bounded request-body readers, found direct request body parser in: ${offenders.join(', ')}`,
  );
}

function verifyAnswerlatticePreOnboardingPromptModal() {
  const promptModal = read('src/app/sites/answerlattice/pre-onboarding/PromptModal.tsx');

  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_REQUEST_POLICY', 'Answerlattice pre-onboarding prompt modal request policy');
  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_RESPONSE_MAX_BYTES', 'Answerlattice pre-onboarding prompt modal response cap');
  assertIncludes(promptModal, "cache: 'no-store'", 'Answerlattice pre-onboarding prompt modal bypasses browser cache');
  assertIncludes(promptModal, "credentials: 'same-origin'", 'Answerlattice pre-onboarding prompt modal keeps credentials same-origin');
  assertIncludes(promptModal, "redirect: 'manual'", 'Answerlattice pre-onboarding prompt modal does not follow redirects');
  assertIncludes(promptModal, '...PRE_ONBOARDING_PROMPT_REQUEST_POLICY', 'Answerlattice pre-onboarding prompt modal applies request policy');
  assertIncludes(promptModal, 'readResponseUint8ArrayWithLimit', 'Answerlattice pre-onboarding prompt modal bounded response reader');
  assertIncludes(promptModal, 'normalizePreOnboardingPromptMimeType', 'Answerlattice pre-onboarding prompt modal MIME normalization');
  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_ALLOWED_MIME_TYPES', 'Answerlattice pre-onboarding prompt modal MIME allowlist');
  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_LOAD_FAILED_MESSAGE', 'Answerlattice pre-onboarding prompt modal fixed load failure copy');
  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_COPY_UNAVAILABLE', 'Answerlattice pre-onboarding prompt modal unavailable copy code');
  assertIncludes(promptModal, 'PRE_ONBOARDING_PROMPT_COPY_FALLBACK_FAILED', 'Answerlattice pre-onboarding prompt modal fallback copy failure code');
  assertIncludes(promptModal, 'hasPreOnboardingPromptClipboardWrite', 'Answerlattice pre-onboarding prompt modal Clipboard API support helper');
  assertIncludes(promptModal, 'hasPreOnboardingPromptCopyFallback', 'Answerlattice pre-onboarding prompt modal textarea fallback support helper');
  assertIncludes(promptModal, 'copyPreOnboardingPromptToClipboard', 'Answerlattice pre-onboarding prompt modal acknowledged copy helper');
  assertIncludes(promptModal, 'Fall through to the acknowledged textarea fallback', 'Answerlattice pre-onboarding prompt modal Clipboard rejection fallback');
  assertIncludes(promptModal, "const copied = document.execCommand('copy');", 'Answerlattice pre-onboarding prompt modal textarea copy acknowledgement');
  assertNotIncludes(promptModal, 'await response.text()', 'Answerlattice pre-onboarding prompt modal direct response text read');
  assertNotIncludes(promptModal, 'await navigator.clipboard.writeText(promptText);\n            setStatus', 'Answerlattice pre-onboarding prompt modal direct Clipboard-only success');
  assertNotIncludes(promptModal, 'Prompt request failed: ${response.status}', 'Answerlattice pre-onboarding prompt modal raw status-bearing throw');
}

function verifyDedicatedAnswerlatticeFirebase() {
  const admin = read('src/lib/firebase/answerlatticeFirebaseAdmin.ts');
  const functionsAdmin = read('functions-answerlattice/src/firebaseAdmin.ts');
  const client = read('src/lib/firebase/answerlatticeFirebaseClient.ts');
  const config = read('src/lib/firebase/answerlatticeConfig.ts');
  const dashboardLayout = read('src/components/answerlattice/AnswerlatticeDashboardLayout.tsx');

  assertIncludes(admin, "ANSWERLATTICE_APP_NAME = 'answerlattice-admin'", 'Answerlattice Admin Firebase app name');
  assertIncludes(admin, "getAdminCredential('ANSWERLATTICE_FIREBASE')", 'Answerlattice Admin Firebase credential');
  assertIncludes(admin, 'answerlatticeFirestoreDatabaseId', 'Answerlattice Admin Firestore database selection');
  assertIncludes(client, 'answerlatticeFirebaseClient', 'Answerlattice client Firebase app name');
  assertIncludes(config, 'NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID', 'Answerlattice client Firebase project');
  assertIncludes(config, 'answerlatticeFirebaseModeOverride', 'Answerlattice Firebase shared-mode override');
  assertIncludes(functionsAdmin, 'getBoundedFunctionsAdminStringContext', 'Answerlattice Functions Admin bounded string context');
  assertIncludes(functionsAdmin, 'getFunctionsAdminErrorContext', 'Answerlattice Functions Admin source error context');
  assertIncludes(functionsAdmin, "failureCode: 'answerlattice_functions_admin_env_credential_invalid'", 'Answerlattice Functions Admin env credential failure code');
  assertIncludes(functionsAdmin, "failureCode: 'answerlattice_functions_admin_file_credential_load_failed'", 'Answerlattice Functions Admin file credential failure code');
  assertIncludes(functionsAdmin, 'sourceErrorName', 'Answerlattice Functions Admin source error name');
  assertIncludes(functionsAdmin, 'sourceErrorCode', 'Answerlattice Functions Admin source error code');
  assertIncludes(functionsAdmin, 'sourceErrorStatus', 'Answerlattice Functions Admin source error status');
  assertIncludes(functionsAdmin, "...getBoundedFunctionsAdminStringContext('credentialPath', credentialPath)", 'Answerlattice Functions Admin bounded credential path');
  assertNotIncludes(functionsAdmin, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice Functions Admin raw exception text');
  assertIncludes(dashboardLayout, 'answerlattice_dashboard_firebase_auth_sync_failed', 'Answerlattice dashboard Firebase Auth sync diagnostics');
  assertIncludes(dashboardLayout, 'logFirebaseBootstrapFailure', 'Answerlattice dashboard Firebase Auth sync diagnostics');
  assertNoDirectConsole(dashboardLayout, 'Answerlattice dashboard layout');
}

function verifyPublicApiAndWidgetIsolation() {
  const middleware = read('src/middleware.ts');
  const publicAnswers = read('src/app/api/answerlattice/public/v1/answers/route.ts');
  const publicEntities = read('src/app/api/answerlattice/public/v1/entities/route.ts');
  const publicSignals = read('src/app/api/answerlattice/public/v1/signals/route.ts');
  const widgetSearch = read('src/app/api/widget/search/route.ts');
  const widgetConfig = read('src/app/api/widget/config/route.ts');
  const widgetFeedback = read('src/app/api/widget/feedback/route.ts');
  const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
  const widgetManagement = read('src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx');
  const predictiveHelp = read('src/app/api/answerlattice/predictive-help/route.ts');
  const mcpSession = read('src/app/api/answerlattice/mcp/session/route.ts');
  const searchHistoryIdBoundary = read('src/lib/answerlattice/searchHistoryIdBoundary.ts');
  const publicAuth = read('src/lib/answerlattice/publicApi.ts');
  const sharedAuth = read('src/lib/publicApi/auth.ts');
  const answerlatticeReadme = read('__docs__/answerlattice/README.md');
  const helpWidgetImpl = read('__docs__/answerlattice/help-widget/help-widget_impl.md');
  const feedbackSystemImpl = read('__docs__/answerlattice/feedback-system/feedback-system_impl.md');
  const feedbackSystemFirebase = read('__docs__/answerlattice/feedback-system/feedback-system_firebase.md');
  const dataInventoryMap = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_data-map.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(publicAnswers, 'authenticateAnswerlatticePublicApi', 'Answerlattice public answers API');
  assertIncludes(publicEntities, 'authenticateAnswerlatticePublicApi', 'Answerlattice public entities API');
  assertIncludes(publicSignals, "'POST /api/answerlattice/public/v1/signals', 'signals:write'", 'Answerlattice public signals API');
  assertIncludes(publicAuth, "publicApi.productId !== PRODUCT_IDS.ANSWERLATTICE", 'Answerlattice public API product guard');
  assertIncludes(publicAuth, "publicApi.purpose !== 'answerlattice_public_api'", 'Answerlattice public API purpose guard');
  assertIncludes(publicAuth, "result.credentialSource !== 'publicApi'", 'Answerlattice public API key-source guard');
  assertIncludes(sharedAuth, 'answerlatticeFirestoreAdmin', 'Shared public API auth Answerlattice DB selection');
  assertIncludes(sharedAuth, 'Answerlattice API key validation failed closed because Answerlattice Firestore Admin is not configured', 'Shared public API auth fail-closed behavior');
  assertIncludes(middleware, 'const isAnswerlatticeWidgetRoute = isAnswerlatticeWidgetFrameRoute(request);', 'Answerlattice widget middleware frame route');
  assertIncludes(middleware, 'function isAnswerlatticeWidgetFrameRoute(request: NextRequest): boolean', 'Answerlattice widget middleware host-aware helper');
  assertIncludes(middleware, "resolveKnownProductIdByHostname(hostname) === 'answerlattice'", 'Answerlattice widget middleware product host scope');
  assertIncludes(middleware, '!process.env.VERCEL && isLocalDevelopmentHost(hostname)', 'Answerlattice widget middleware local dev frame scope');
  assertNotIncludes(middleware, "const isAnswerlatticeWidgetRoute = request.nextUrl.pathname === '/widget' || request.nextUrl.pathname.startsWith('/widget/');", 'Answerlattice widget middleware path-only frame route');
  assertIncludes(answerlatticeReadme, 'Widget iframe frame headers are relaxed only on Answerlattice product hosts', 'Answerlattice widget host-boundary docs');
  assertIncludes(helpWidgetImpl, 'middleware omits `X-Frame-Options` only when the request is on an Answerlattice product host', 'Answerlattice help-widget frame host-boundary docs');
  assertNotIncludes(helpWidgetImpl, '`/widget/*` is the explicit exception: middleware omits `X-Frame-Options` and allows HTTPS/localhost frame ancestors', 'Answerlattice help-widget path-only frame docs');
  assertIncludes(productionAudit, 'Answerlattice widget frame host checkpoint', 'Answerlattice widget frame host audit checkpoint');
  assertIncludes(changelog, 'Answerlattice Widget Frame Host Boundary', 'Answerlattice widget frame host changelog entry');
  assertIncludes(publicAnswers, "logRuntimeFailure('answerlattice_public_answers_retrieval_failed'", 'Answerlattice public answers bounded diagnostic');
  assertIncludes(publicAnswers, "getBoundedRuntimeStringContext('tenantId', auth.context.tId)", 'Answerlattice public answers bounded tenant metadata');
  assertIncludes(publicAnswers, "getBoundedRuntimeStringContext('storeId', auth.context.sId)", 'Answerlattice public answers bounded store metadata');
  assertNotIncludes(publicAnswers, "secureError('[Answerlattice Public API] Answer retrieval failed'", 'Answerlattice public answers raw secureError');
  assertIncludes(publicEntities, "logRuntimeFailure('answerlattice_public_entities_registry_failed'", 'Answerlattice public entities bounded diagnostic');
  assertIncludes(publicEntities, "logRuntimeFailure('answerlattice_public_entities_bundle_manifest_load_failed'", 'Answerlattice public entities bundle manifest bounded diagnostic');
  assertIncludes(publicEntities, "logRuntimeFailure('answerlattice_public_entities_bundle_object_load_failed'", 'Answerlattice public entities bundle object bounded diagnostic');
  assertIncludes(publicEntities, "getBoundedRuntimeStringContext('tenantId', auth.context.tId)", 'Answerlattice public entities bounded tenant metadata');
  assertIncludes(publicEntities, "getBoundedRuntimeStringContext('storeId', auth.context.sId)", 'Answerlattice public entities bounded store metadata');
  assertIncludes(publicEntities, "getBoundedRuntimeStringContext('tenantId', params.tId)", 'Answerlattice public entities bundle fallback bounded tenant metadata');
  assertIncludes(publicEntities, "getBoundedRuntimeStringContext('storeId', params.sId)", 'Answerlattice public entities bundle fallback bounded store metadata');
  assertNotIncludes(publicEntities, "secureError('[Answerlattice Public API] Entity registry failed'", 'Answerlattice public entities raw secureError');
  assertNotIncludes(publicEntities, 'getAnswerlatticeContextBundleManifestServer(params.tId, params.sId).catch(() => null)', 'Answerlattice public entities silent bundle manifest fallback');
  assertNotIncludes(publicEntities, 'loadAnswerlatticeBundleObjectServer<{ entities?: any[] }>(ref.path).catch(() => null)', 'Answerlattice public entities silent bundle object fallback');
  assertIncludes(publicSignals, "logRuntimeFailure('answerlattice_public_signal_ingestion_failed'", 'Answerlattice public signals bounded diagnostic');
  assertIncludes(publicSignals, "getBoundedRuntimeStringContext('tenantId', auth.context.tId)", 'Answerlattice public signals bounded tenant metadata');
  assertIncludes(publicSignals, "getBoundedRuntimeStringContext('storeId', auth.context.sId)", 'Answerlattice public signals bounded store metadata');
  assertNotIncludes(publicSignals, "secureError('[Answerlattice Public API] Signal ingestion failed'", 'Answerlattice public signals raw secureError');

  assertIncludes(widgetSearch, "hasPublicApiCredentialScope(credential, 'widget:search')", 'Answerlattice widget search scope');
  assertIncludes(widgetConfig, "hasPublicApiCredentialScope(credential, 'widget:config')", 'Answerlattice widget config scope');
  assertIncludes(widgetFeedback, "hasPublicApiCredentialScope(credential, 'widget:feedback')", 'Answerlattice widget feedback scope');
  assertIncludes(predictiveHelp, "hasPublicApiCredentialScope(credential, 'widget:predictive')", 'Answerlattice predictive widget scope');
  assertIncludes(widgetSearch, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget search product guard');
  assertIncludes(widgetConfig, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget config product guard');
  assertIncludes(widgetFeedback, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice widget feedback product guard');
  assertIncludes(predictiveHelp, 'credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice predictive widget product guard');
  assertIncludes(widgetSearch, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget search purpose guard');
  assertIncludes(widgetConfig, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget config purpose guard');
  assertIncludes(widgetFeedback, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice widget feedback purpose guard');
  assertIncludes(predictiveHelp, "credential.purpose !== 'answerlattice_widget'", 'Answerlattice predictive widget purpose guard');
  assertIncludes(widgetSearch, "logRuntimeFailure('answerlattice_widget_search_invalid_workspace_context'", 'Answerlattice widget search invalid workspace bounded diagnostic');
  assertIncludes(widgetSearch, "logRuntimeFailure('answerlattice_widget_search_image_upload_failed'", 'Answerlattice widget search image bounded diagnostic');
  assertIncludes(widgetSearch, "logRuntimeFailure('answerlattice_widget_search_operation_log_failed'", 'Answerlattice widget search operation log bounded diagnostic');
  assertIncludes(widgetSearch, "logRuntimeFailure('answerlattice_widget_search_failed'", 'Answerlattice widget search top-level bounded diagnostic');
  assertIncludes(widgetSearch, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice widget search bounded tenant metadata');
  assertIncludes(widgetSearch, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice widget search bounded store metadata');
  assertNotIncludes(widgetSearch, "secureError('[Widget Search]", 'Answerlattice widget search raw secureError');
  assertNotIncludes(widgetSearch, '{ tId, sId }', 'Answerlattice widget search raw scope diagnostic object');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_invalid_workspace_context'", 'Answerlattice widget config invalid workspace bounded diagnostic');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_runtime_status_write_failed'", 'Answerlattice widget config telemetry bounded diagnostic');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_predictive_summary_load_failed'", 'Answerlattice widget config predictive summary bounded diagnostic');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_bundle_manifest_load_failed'", 'Answerlattice widget config bundle manifest bounded diagnostic');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_failed'", 'Answerlattice widget config top-level bounded diagnostic');
  assertIncludes(widgetConfig, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice widget config bounded tenant metadata');
  assertIncludes(widgetConfig, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice widget config bounded store metadata');
  assertNotIncludes(widgetConfig, "secureError('[Widget Config]", 'Answerlattice widget config raw secureError');
  assertNotIncludes(widgetConfig, 'tenantId: tId', 'Answerlattice widget config raw tenant diagnostic');
  assertNotIncludes(widgetConfig, 'storeId: sId', 'Answerlattice widget config raw store diagnostic');
  assertNotIncludes(widgetConfig, 'hasActivePredictiveTriggers(db, tId, sId).catch(() => false)', 'Answerlattice widget config silent predictive summary fallback');
  assertNotIncludes(widgetConfig, 'getReadyPublicBundleConfig(tId, sId).catch(() => null)', 'Answerlattice widget config silent bundle manifest fallback');
  assertIncludes(widgetFeedback, 'Number(historyData.tId) !== tId', 'Answerlattice widget feedback history tenant guard');
  assertIncludes(widgetFeedback, 'Number(historyData.sId) !== sId', 'Answerlattice widget feedback history store guard');
  assertIncludes(widgetFeedback, "logRuntimeFailure('answerlattice_widget_feedback_invalid_workspace_context'", 'Answerlattice widget feedback invalid workspace bounded diagnostic');
  assertIncludes(widgetFeedback, "logRuntimeFailure('answerlattice_widget_feedback_signal_emit_failed'", 'Answerlattice widget feedback signal bounded diagnostic');
  assertIncludes(widgetFeedback, "logRuntimeFailure('answerlattice_widget_feedback_failed'", 'Answerlattice widget feedback top-level bounded diagnostic');
  assertIncludes(widgetFeedback, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice widget feedback bounded tenant metadata');
  assertIncludes(widgetFeedback, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice widget feedback bounded store metadata');
  assertIncludes(widgetFeedback, "getBoundedRuntimeStringContext('searchHistoryId', searchHistoryId)", 'Answerlattice widget feedback bounded history metadata');
  assertIncludes(searchHistoryIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice search-history ID boundary shared Firestore guard');
  assertIncludes(searchHistoryIdBoundary, 'ANSWERLATTICE_SEARCH_HISTORY_ID_MAX_LENGTH = 180', 'Answerlattice search-history ID boundary length cap');
  assertIncludes(searchHistoryIdBoundary, 'normalizeAnswerlatticeSearchHistoryId', 'Answerlattice search-history ID normalizer');
  assertIncludes(widgetFeedback, "import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';", 'Answerlattice widget feedback search-history ID boundary import');
  assertIncludes(widgetFeedback, 'searchHistoryId: z.string().trim().max(180).refine((value) => normalizeAnswerlatticeSearchHistoryId(value) === value)', 'Answerlattice widget feedback search-history ID schema boundary');
  assertNotIncludes(widgetFeedback, "secureError('[Widget Feedback]", 'Answerlattice widget feedback raw secureError');
  assertNotIncludes(widgetFeedback, 'searchHistoryId: z.string().trim().min(1).max(180)', 'Answerlattice widget feedback loose search-history ID schema');
  assertIncludes(feedbackSystemImpl, 'search-history document-ID validation', 'Feedback System implementation docs record widget feedback search-history ID boundary');
  assertIncludes(feedbackSystemFirebase, 'Widget feedback validates `searchHistoryId` through the shared Firestore document-ID boundary before updating `aiSearchHistory`', 'Feedback System Firebase docs record widget feedback search-history ID boundary');
  assertIncludes(dataInventoryMap, 'widget feedback validates search-history document IDs before updating the row', 'Answerlattice data inventory records widget feedback search-history ID boundary');
  assertIncludes(dataInventoryEvidence, 'updates scoped `aiSearchHistory` after search-history document-ID validation', 'Answerlattice data inventory evidence records widget feedback search-history ID boundary');
  assertIncludes(productionAudit, 'Answerlattice Widget Feedback Search History ID Boundary checkpoint', 'Production audit records widget feedback search-history ID boundary');
  assertIncludes(changelog, 'Answerlattice Widget Feedback Search History ID Boundary', 'Changelog records widget feedback search-history ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Widget Feedback Search History ID Boundary', 'Lowercase changelog records widget feedback search-history ID boundary');
  assertIncludes(predictiveHelp, "logRuntimeFailure('answerlattice_predictive_help_invalid_workspace_context'", 'Answerlattice predictive help invalid workspace bounded diagnostic');
  assertIncludes(predictiveHelp, "logRuntimeFailure('answerlattice_predictive_help_failed'", 'Answerlattice predictive help top-level bounded diagnostic');
  assertIncludes(predictiveHelp, "getBoundedRuntimeStringContext('storeId', storeId)", 'Answerlattice predictive help bounded store metadata');
  assertNotIncludes(predictiveHelp, "secureError('[Answerlattice Predictive Help]", 'Answerlattice predictive help raw secureError');
  assertIncludes(widgetClient, 'WIDGET_ANSWER_FAILED_MESSAGE', 'Answerlattice widget client uses fixed answer failure copy');
  assertIncludes(widgetClient, 'WIDGET_FEEDBACK_FAILED_MESSAGE', 'Answerlattice widget client uses fixed feedback failure copy');
  assertIncludes(widgetClient, 'WIDGET_SEARCH_RESPONSE_JSON_MAX_BYTES = 256 * 1024', 'Answerlattice widget client search response cap');
  assertIncludes(widgetClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice widget client bounded search response parser');
  assertIncludes(widgetClient, 'readWidgetSearchResponse', 'Answerlattice widget client shared search response reader');
  assertIncludes(widgetClient, 'isWidgetSearchResponse', 'Answerlattice widget client search response shape guard');
  assertIncludes(widgetClient, "logRuntimeFailure('answerlattice_widget_client_search_response_parse_failed'", 'Answerlattice widget client malformed search response diagnostic');
  assertIncludes(widgetClient, "logRuntimeFailure('answerlattice_widget_client_search_response_invalid'", 'Answerlattice widget client invalid search response diagnostic');
  assertIncludes(widgetClient, "cache: 'no-store'", 'Answerlattice widget client no-store widget requests');
  assertIncludes(widgetClient, "credentials: 'same-origin'", 'Answerlattice widget client same-origin widget requests');
  assertIncludes(widgetClient, "redirect: 'manual'", 'Answerlattice widget client manual redirect widget requests');
  assertIncludes(widgetClient, 'queryLength: q.length', 'Answerlattice widget client bounded query metadata');
  assertIncludes(widgetClient, 'widgetSessionIdLength: widgetSessionIdRef.current.length', 'Answerlattice widget client bounded session metadata');
  assertNotIncludes(widgetClient, "setError(err.message || 'Something went wrong')", 'Answerlattice widget client must not show raw answer exception messages');
  assertNotIncludes(widgetClient, 'feedbackError?.message', 'Answerlattice widget client must not show raw feedback exception messages');
  assertNotIncludes(widgetClient, 'throw new Error(data.error', 'Answerlattice widget client must not throw raw API response text');
  assertNotIncludes(widgetClient, 'const data = await res.json();', 'Answerlattice widget client direct search JSON parsing');
  assertNotIncludes(widgetClient, 'res.json().catch(() => ({}))', 'Answerlattice widget client direct rejected JSON fallback');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_SETTINGS_LOAD_FAILED', 'Answerlattice widget management fixed settings-load copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_SETTINGS_SAVE_FAILED', 'Answerlattice widget management fixed settings-save copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_ACTIVITY_LOAD_FAILED', 'Answerlattice widget management fixed activity-load copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_KEY_CREATE_FAILED', 'Answerlattice widget management fixed key-create copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_KEY_RENAME_FAILED', 'Answerlattice widget management fixed key-rename copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_KEY_DELETE_FAILED', 'Answerlattice widget management fixed key-delete copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_HOSTED_HELP_SETTINGS_SAVE_FAILED', 'Answerlattice widget management fixed hosted-help-save copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_HOSTED_HELP_DNS_CHECK_FAILED', 'Answerlattice widget management fixed hosted-help-DNS copy');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_MANAGEMENT_RESPONSE_JSON_MAX_BYTES', 'Answerlattice widget management response body cap');
  assertIncludes(widgetManagement, 'ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY', 'Answerlattice widget management shared request policy');
  assertIncludes(widgetManagement, "cache: 'no-store'", 'Answerlattice widget management requests bypass browser cache');
  assertIncludes(widgetManagement, "credentials: 'same-origin'", 'Answerlattice widget management requests keep credentials same-origin');
  assertIncludes(widgetManagement, "redirect: 'manual'", 'Answerlattice widget management requests do not follow redirects');
  assert((widgetManagement.match(/\.\.\.ANSWERLATTICE_WIDGET_MANAGEMENT_REQUEST_POLICY/g) || []).length >= 9, 'Answerlattice widget management requests must apply the shared request policy');
  assertIncludes(widgetManagement, 'readJsonResponseWithLimit<unknown>', 'Answerlattice widget management bounded response reader');
  assertIncludes(widgetManagement, 'readWidgetManagementResponse', 'Answerlattice widget management shared response acknowledgement helper');
  assertIncludes(widgetManagement, 'isWidgetConfigResponse', 'Answerlattice widget management widget-config response guard');
  assertIncludes(widgetManagement, 'isHostedHelpSettingsResponse', 'Answerlattice widget management hosted-help response guard');
  assertIncludes(widgetManagement, 'isWidgetActivityResponse', 'Answerlattice widget management activity response guard');
  assertIncludes(widgetManagement, 'isWidgetKeyCreateResponse', 'Answerlattice widget management key-create response guard');
  assertIncludes(widgetManagement, 'isWidgetKeyMutationResponse', 'Answerlattice widget management key-mutation response guard');
  assertIncludes(widgetManagement, "logRuntimeFailure('answerlattice_widget_management_response_parse_failed'", 'Answerlattice widget management malformed response diagnostic');
  assertIncludes(widgetManagement, "logRuntimeFailure('answerlattice_widget_management_response_rejected'", 'Answerlattice widget management rejected response diagnostic');
  assertIncludes(widgetManagement, "logRuntimeFailure('answerlattice_widget_management_response_invalid'", 'Answerlattice widget management invalid response diagnostic');
  assertIncludes(widgetManagement, "logRuntimeFailure('answerlattice_widget_management_hosted_help_load_failed'", 'Answerlattice widget management optional hosted-help load diagnostic');
  assertNotIncludes(widgetManagement, 'getAnswerlatticeUiErrorMessage', 'Answerlattice widget management must not show browser exception messages');
  assertNotIncludes(widgetManagement, 'res.json().catch(() => ({}))', 'Answerlattice widget management direct JSON fallback');
  assertNotIncludes(widgetManagement, 'await res.json()', 'Answerlattice widget management direct JSON parsing');
  assertNotIncludes(widgetManagement, 'data.error ||', 'Answerlattice widget management must not throw raw API response text');
  assertNotIncludes(widgetManagement, '(data as any).error', 'Answerlattice widget management must not throw raw API response text');
  assertNotIncludes(widgetManagement, 'error?.message', 'Answerlattice widget management must not show raw exception messages');
  assertNotIncludes(widgetManagement, 'err?.message', 'Answerlattice widget management must not show raw exception messages');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to load widget activity')", 'Answerlattice widget management raw activity failure copy');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to create widget key')", 'Answerlattice widget management raw key create failure copy');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to rename widget key')", 'Answerlattice widget management raw key rename failure copy');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to delete widget key')", 'Answerlattice widget management raw key delete failure copy');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to save hosted help settings')", 'Answerlattice widget management raw hosted-help save failure copy');
  assertNotIncludes(widgetManagement, "throw new Error(data.error || 'Failed to check hosted help DNS')", 'Answerlattice widget management raw hosted-help DNS failure copy');
  assertIncludes(mcpSession, 'auth.credential.productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice MCP session product guard');
  assertIncludes(mcpSession, "auth.credential.purpose !== 'answerlattice_public_api'", 'Answerlattice MCP session purpose guard');
  assertIncludes(mcpSession, "hasPublicApiCredentialScope(auth.credential, 'signals:write')", 'Answerlattice MCP session signal scope');
  assertIncludes(mcpSession, "logRuntimeFailure('answerlattice_mcp_session_bundle_manifest_load_failed'", 'Answerlattice MCP session bundle manifest bounded diagnostic');
  assertIncludes(mcpSession, "logRuntimeFailure('answerlattice_mcp_session_creation_failed'", 'Answerlattice MCP session bounded diagnostic');
  assertIncludes(mcpSession, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice MCP session bounded tenant metadata');
  assertIncludes(mcpSession, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice MCP session bounded store metadata');
  assertNotIncludes(mcpSession, "secureError('[Answerlattice MCP] Session creation failed'", 'Answerlattice MCP session raw secureError');
  assertNotIncludes(mcpSession, 'getAnswerlatticeContextBundleManifestServer(tId, sId).catch(() => null)', 'Answerlattice MCP session silent bundle manifest fallback');
}

function verifyAnswerlatticeDashboardFailureCopy() {
  const dashboard = read('src/app/(answerlattice)/answerlattice/dashboard/page.tsx');
  const accessProvider = read('src/providers/answerlatticeAccessProvider.tsx');
  const settings = read('src/components/templates/answerlattice/AnswerlatticeSettings.tsx');
  const activation = read('src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx');
  const operations = read('src/components/templates/answerlattice/activation/AnswerlatticeOperationsPanel.tsx');
  const weeklyDigest = read('src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx');
  const activationDashboardResponseClient = read('src/lib/answerlattice/activationDashboardResponseClient.ts');
  const faqManagement = read('src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx');
  const productSurfaces = read('src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx');
  const teamAccess = read('src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx');
  const staffAccessClient = read('src/lib/answerlattice/staffAccessClient.ts');
  const staffAccessServer = read('src/lib/answerlattice/staffAccessServer.ts');
  const staffUserIdBoundary = read('src/lib/answerlattice/staffUserIdBoundary.ts');
  const staffAccessImpl = read('__docs__/answerlattice/staff-access-control/staff-access-control_impl.md');
  const staffAccessFirebase = read('__docs__/answerlattice/staff-access-control/staff-access-control_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');
  const installCenter = read('src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx');
  const multiLanguageArticles = read('src/components/templates/answerlattice/governance/MultiLanguageArticles.tsx');

  assertIncludes(dashboard, 'ANSWERLATTICE_READINESS_METRICS_LOAD_FAILED', 'Answerlattice dashboard fixed readiness-load copy');
  assertIncludes(accessProvider, 'ANSWERLATTICE_ACCESS_LOAD_FAILED', 'Answerlattice access provider fixed failure copy');
  assertIncludes(accessProvider, 'ANSWERLATTICE_ACCESS_RESPONSE_JSON_MAX_BYTES', 'Answerlattice access provider response cap');
  assertIncludes(accessProvider, 'ANSWERLATTICE_ACCESS_REQUEST_POLICY', 'Answerlattice access provider shared request policy');
  assertIncludes(accessProvider, "cache: 'no-store'", 'Answerlattice access provider requests bypass browser cache');
  assertIncludes(accessProvider, "credentials: 'same-origin'", 'Answerlattice access provider requests keep credentials same-origin');
  assertIncludes(accessProvider, "redirect: 'manual'", 'Answerlattice access provider requests do not follow redirects');
  assertIncludes(accessProvider, '...ANSWERLATTICE_ACCESS_REQUEST_POLICY', 'Answerlattice access provider applies shared request policy');
  assertIncludes(accessProvider, 'readJsonResponseWithLimit<unknown>', 'Answerlattice access provider bounded response parser');
  assertIncludes(accessProvider, 'isAnswerlatticeAccessResponse', 'Answerlattice access provider response shape guard');
  assertIncludes(accessProvider, 'answerlattice_access_provider_response_parse_failed', 'Answerlattice access provider parse diagnostic');
  assertIncludes(accessProvider, 'answerlattice_access_provider_response_rejected', 'Answerlattice access provider rejected diagnostic');
  assertIncludes(accessProvider, 'answerlattice_access_provider_response_invalid', 'Answerlattice access provider invalid diagnostic');
  assertNotIncludes(accessProvider, 'response.json().catch(() => ({}))', 'Answerlattice access provider direct JSON fallback');
  assertNotIncludes(accessProvider, "data.error || 'Could not load Answerlattice access'", 'Answerlattice access provider raw response error copy');
  assertNotIncludes(accessProvider, 'loadError?.message', 'Answerlattice access provider raw browser exception copy');
  assertIncludes(settings, 'ANSWERLATTICE_PROFILE_LOAD_FAILED', 'Answerlattice settings fixed profile-load copy');
  assertIncludes(settings, 'ANSWERLATTICE_PROFILE_SAVE_FAILED', 'Answerlattice settings fixed profile-save copy');
  assertIncludes(settings, 'ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED', 'Answerlattice settings fixed integrations-load copy');
  assertIncludes(settings, 'ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED', 'Answerlattice settings fixed integrations-save copy');
  assertIncludes(settings, 'ANSWERLATTICE_INTEGRATIONS_TEST_FAILED', 'Answerlattice settings fixed integrations-test copy');
  assertIncludes(settings, 'ANSWERLATTICE_LAST_DELIVERY_NEEDS_REVIEW', 'Answerlattice settings fixed delivery-health copy');
  assertIncludes(settings, 'ANSWERLATTICE_SETTINGS_RESPONSE_JSON_MAX_BYTES', 'Answerlattice settings response cap');
  assertIncludes(settings, 'ANSWERLATTICE_SETTINGS_REQUEST_POLICY', 'Answerlattice settings shared request policy');
  assertIncludes(settings, "cache: 'no-store'", 'Answerlattice settings requests bypass browser cache');
  assertIncludes(settings, "credentials: 'same-origin'", 'Answerlattice settings requests keep credentials same-origin');
  assertIncludes(settings, "redirect: 'manual'", 'Answerlattice settings requests do not follow redirects');
  assert((settings.match(/\.\.\.ANSWERLATTICE_SETTINGS_REQUEST_POLICY/g) || []).length >= 5, 'Answerlattice settings requests must apply the shared request policy');
  assertIncludes(settings, 'readJsonResponseWithLimit<unknown>', 'Answerlattice settings bounded response parser');
  assertIncludes(settings, 'isWorkspaceProfileResponse', 'Answerlattice settings profile response shape guard');
  assertIncludes(settings, 'isWorkflowIntegrationsResponse', 'Answerlattice settings integration response shape guard');
  assertIncludes(settings, 'isIntegrationTestResponse', 'Answerlattice settings integration-test response shape guard');
  assertIncludes(settings, 'answerlattice_settings_response_parse_failed', 'Answerlattice settings response parse diagnostic');
  assertIncludes(settings, 'answerlattice_settings_response_rejected', 'Answerlattice settings response rejected diagnostic');
  assertIncludes(settings, 'answerlattice_settings_response_invalid', 'Answerlattice settings response invalid diagnostic');
  assertNotIncludes(settings, 'response.json().catch(() => ({}))', 'Answerlattice settings direct JSON fallback');
  assertIncludes(activation, 'ANSWERLATTICE_ACTIVATION_SUMMARY_LOAD_FAILED', 'Answerlattice activation fixed summary-load copy');
  assertIncludes(activation, 'ANSWERLATTICE_ACTIVATION_NOTIFICATION_TEST_FAILED', 'Answerlattice activation fixed notification-test copy');
  assertIncludes(activation, 'ANSWERLATTICE_COMPILED_CONTEXT_REBUILD_FAILED', 'Answerlattice activation fixed context-rebuild copy');
  assertIncludes(operations, 'ANSWERLATTICE_OPERATIONS_STATUS_LOAD_FAILED', 'Answerlattice operations fixed status-load copy');
  assertIncludes(operations, 'ANSWERLATTICE_OPERATIONS_LAST_RUN_NEEDS_REVIEW', 'Answerlattice operations fixed last-run copy');
  assertIncludes(weeklyDigest, 'ANSWERLATTICE_WEEKLY_DIGEST_LOAD_FAILED', 'Answerlattice weekly digest fixed load copy');
  assertIncludes(activationDashboardResponseClient, 'ANSWERLATTICE_ACTIVATION_DASHBOARD_RESPONSE_JSON_MAX_BYTES', 'Answerlattice activation dashboard response cap');
  assertIncludes(activationDashboardResponseClient, 'ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY', 'Answerlattice activation dashboard shared request policy');
  assertIncludes(activationDashboardResponseClient, "cache: 'no-store'", 'Answerlattice activation dashboard requests bypass browser cache');
  assertIncludes(activationDashboardResponseClient, "credentials: 'same-origin'", 'Answerlattice activation dashboard requests keep credentials same-origin');
  assertIncludes(activationDashboardResponseClient, "redirect: 'manual'", 'Answerlattice activation dashboard requests do not follow redirects');
  assertIncludes(activationDashboardResponseClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice activation dashboard bounded response parser');
  assertIncludes(activationDashboardResponseClient, 'isAnswerlatticeActivationSummaryResponse', 'Answerlattice activation summary response shape guard');
  assertIncludes(activationDashboardResponseClient, 'isAnswerlatticeOperationsStatusResponse', 'Answerlattice operations response shape guard');
  assertIncludes(activationDashboardResponseClient, 'isAnswerlatticeNotificationTestResponse', 'Answerlattice notification test response shape guard');
  assertIncludes(activationDashboardResponseClient, 'isAnswerlatticeCompiledContextRebuildResponse', 'Answerlattice compiled context rebuild response shape guard');
  assertIncludes(activationDashboardResponseClient, 'answerlattice_activation_dashboard_response_parse_failed', 'Answerlattice activation dashboard response parse diagnostic');
  assertIncludes(activationDashboardResponseClient, 'answerlattice_activation_dashboard_response_rejected', 'Answerlattice activation dashboard response rejected diagnostic');
  assertIncludes(activationDashboardResponseClient, 'answerlattice_activation_dashboard_response_invalid', 'Answerlattice activation dashboard response invalid diagnostic');
  assertIncludes(dashboard, 'readAnswerlatticeActivationDashboardResponse', 'Answerlattice readiness metrics bounded response reader');
  assertIncludes(activation, 'readAnswerlatticeActivationDashboardResponse', 'Answerlattice activation bounded response reader');
  assertIncludes(operations, 'readAnswerlatticeActivationDashboardResponse', 'Answerlattice operations bounded response reader');
  assertIncludes(weeklyDigest, 'readAnswerlatticeActivationDashboardResponse', 'Answerlattice weekly digest bounded response reader');
  const activationDashboardRequestPolicySpreads = [
    dashboard,
    activation,
    operations,
    weeklyDigest,
    installCenter,
  ].reduce((count, source) => count + (source.match(/\.\.\.ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY/g) || []).length, 0);
  assert(activationDashboardRequestPolicySpreads >= 7, 'Answerlattice activation dashboard requests must apply the shared request policy');
  assertNotIncludes(dashboard, 'response.json().catch(() => ({}))', 'Answerlattice readiness metrics direct JSON fallback');
  assertNotIncludes(activation, 'response.json().catch(() => ({}))', 'Answerlattice activation direct JSON fallback');
  assertNotIncludes(operations, 'response.json().catch(() => ({}))', 'Answerlattice operations direct JSON fallback');
  assertNotIncludes(weeklyDigest, 'response.json().catch(() => ({}))', 'Answerlattice weekly digest direct JSON fallback');
  assertIncludes(faqManagement, 'ANSWERLATTICE_FAQS_LOAD_FAILED', 'Answerlattice FAQ management fixed load copy');
  assertIncludes(faqManagement, 'ANSWERLATTICE_FAQ_SAVE_FAILED', 'Answerlattice FAQ management fixed save copy');
  assertIncludes(faqManagement, 'ANSWERLATTICE_FAQ_ARCHIVE_FAILED', 'Answerlattice FAQ management fixed archive copy');
  assertIncludes(productSurfaces, 'ANSWERLATTICE_PRODUCT_SURFACES_LOAD_FAILED', 'Answerlattice product surfaces fixed load copy');
  assertIncludes(productSurfaces, 'ANSWERLATTICE_PRODUCT_SURFACE_SAVE_FAILED', 'Answerlattice product surfaces fixed save copy');
  assertIncludes(productSurfaces, 'ANSWERLATTICE_PRODUCT_SURFACE_ARCHIVE_FAILED', 'Answerlattice product surfaces fixed archive copy');
  assertIncludes(productSurfaces, 'ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED', 'Answerlattice product surfaces fixed rebuild copy');
  assertIncludes(productSurfaces, 'ANSWERLATTICE_PRODUCT_SURFACE_TEMPLATES_APPLY_FAILED', 'Answerlattice product surfaces fixed templates copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_ACCESS_LOAD_FAILED', 'Answerlattice team access fixed load copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_MEMBER_SAVE_FAILED', 'Answerlattice team access fixed member-save copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_MEMBER_ACCESS_UPDATE_FAILED', 'Answerlattice team access fixed access-update copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_MEMBER_LOGIN_RESET_FAILED', 'Answerlattice team access fixed login-reset copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_MEMBER_SIGN_OUT_FAILED', 'Answerlattice team access fixed sign-out copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_MEMBER_REMOVE_FAILED', 'Answerlattice team access fixed remove copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_ROLE_SAVE_FAILED', 'Answerlattice team access fixed role-save copy');
  assertIncludes(teamAccess, 'ANSWERLATTICE_TEAM_ROLE_DISABLE_FAILED', 'Answerlattice team access fixed role-disable copy');
  assertIncludes(staffUserIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice staff user ID boundary imports shared document ID guard');
  assertIncludes(staffUserIdBoundary, 'export function normalizeAnswerlatticeStaffUserId(value: unknown): string | null', 'Answerlattice staff user ID normalizer');
  assertIncludes(staffUserIdBoundary, 'isValidFirestoreDocumentId(userId)', 'Answerlattice staff user ID uses shared Firestore document ID guard');
  assertIncludes(staffUserIdBoundary, 'export function requireAnswerlatticeStaffUserId(value: unknown): string', 'Answerlattice staff user ID require helper');
  assertIncludes(staffAccessServer, "from '@lib/answerlattice/staffUserIdBoundary';", 'Answerlattice staff server imports user ID boundary');
  assertIncludes(staffAccessServer, 'const AnswerlatticeStaffUserIdSchema = z.string()', 'Answerlattice staff user ID schema boundary');
  assertIncludes(staffAccessServer, ".refine((value) => normalizeAnswerlatticeStaffUserId(value) === value, 'Invalid user ID')", 'Answerlattice staff user ID schema uses normalizer');
  assertIncludes(staffAccessServer, 'userId: AnswerlatticeStaffUserIdSchema', 'Answerlattice staff mutations use user ID schema');
  assertIncludes(staffAccessServer, 'const normalizedUserId = normalizeAnswerlatticeStaffUserId(userId);', 'Answerlattice staff helper re-normalizes user ID');
  assertIncludes(staffAccessServer, 'if (!normalizedUserId) return null;', 'Answerlattice staff helper rejects malformed user ID before Firestore');
  assertIncludes(staffAccessServer, 'doc(normalizedUserId)', 'Answerlattice staff helper uses normalized user document ref');
  assertIncludes(staffAccessServer, 'const defaultUserId = requireAnswerlatticeStaffUserId(existingDefaultUser?.id || userId);', 'Answerlattice staff default-auth bridge ID boundary');
  assertIncludes(staffAccessServer, 'const userId = requireAnswerlatticeStaffUserId(existingAnswerlatticeUser?.id || existingDefaultUser?.id || defaultFirebaseUser.uid);', 'Answerlattice staff create derived user ID boundary');
  assertIncludes(staffAccessServer, 'class AnswerlatticeStaffPolicyError', 'Answerlattice staff policy failures use coded errors');
  assertIncludes(staffAccessServer, 'getAnswerlatticeStaffPolicyErrorCode(error)', 'Answerlattice staff policy failures branch on codes');
  assertIncludes(staffAccessServer, "const FIREBASE_AUTH_SEND_OOB_CODE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode';", 'Answerlattice staff reset fixed Firebase Auth endpoint');
  assertIncludes(staffAccessServer, 'ANSWERLATTICE_STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS', 'Answerlattice staff reset provider timeout');
  assertIncludes(staffAccessServer, 'const normalizeFirebaseAuthApiKey = (value?: string) => {', 'Answerlattice staff reset API key normalization');
  assertIncludes(staffAccessServer, 'new URL(FIREBASE_AUTH_SEND_OOB_CODE_URL)', 'Answerlattice staff reset URL construction');
  assertIncludes(staffAccessServer, "endpoint.searchParams.set('key', apiKey);", 'Answerlattice staff reset API key encoding');
  assertIncludes(staffAccessServer, 'getPasswordResetProviderLogContext', 'Answerlattice staff reset provider bounded log context');
  assertIncludes(staffAccessServer, "getBoundedAnswerlatticeStringContext('email', email)", 'Answerlattice staff reset provider bounded email metadata');
  assertIncludes(staffAccessServer, 'const controller = new AbortController();', 'Answerlattice staff reset provider abort controller');
  assertIncludes(staffAccessServer, 'setTimeout(() => controller.abort(), ANSWERLATTICE_STAFF_PASSWORD_RESET_PROVIDER_TIMEOUT_MS)', 'Answerlattice staff reset provider timeout abort');
  assertIncludes(staffAccessServer, 'fetch(buildFirebasePasswordResetEndpoint(apiKey), {', 'Answerlattice staff reset encoded endpoint fetch');
  assertIncludes(staffAccessServer, "redirect: 'manual'", 'Answerlattice staff reset does not follow Firebase provider redirects');
  assertIncludes(staffAccessServer, 'signal: controller.signal', 'Answerlattice staff reset provider timeout signal');
  assertIncludes(staffAccessServer, 'clearTimeout(timeout)', 'Answerlattice staff reset provider timeout cleanup');
  assertIncludes(staffAccessServer, 'answerlattice_staff_password_reset_provider_rejected', 'Answerlattice staff reset provider rejected diagnostic');
  assertIncludes(staffAccessServer, 'answerlattice_staff_password_reset_provider_failed', 'Answerlattice staff reset provider failure diagnostic');
  assertIncludes(staffAccessServer, "return { ok: false, error: 'PASSWORD_RESET_EMAIL_FAILED' };", 'Answerlattice staff reset fixed provider failure code');
  assertIncludes(staffAccessServer, "passwordResetEmailError: hasEmail && !passwordResetEmail.ok ? 'password_reset_email_failed' : undefined", 'Answerlattice staff reset fixed response failure code');
  assertIncludes(staffAccessClient, "new Error('Answerlattice staff request failed')", 'Answerlattice staff client fixed failure copy');
  assertIncludes(staffAccessClient, 'ANSWERLATTICE_STAFF_RESPONSE_JSON_MAX_BYTES', 'Answerlattice staff response cap');
  assertIncludes(staffAccessClient, 'ANSWERLATTICE_STAFF_REQUEST_POLICY', 'Answerlattice staff shared request policy');
  assertIncludes(staffAccessClient, "cache: 'no-store'", 'Answerlattice staff requests bypass browser cache');
  assertIncludes(staffAccessClient, "credentials: 'same-origin'", 'Answerlattice staff requests keep credentials same-origin');
  assertIncludes(staffAccessClient, "redirect: 'manual'", 'Answerlattice staff requests do not follow redirects');
  assert((staffAccessClient.match(/\.\.\.ANSWERLATTICE_STAFF_REQUEST_POLICY/g) || []).length >= 8, 'Answerlattice staff client requests must apply the shared request policy');
  assertIncludes(staffAccessClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice staff bounded response parser');
  assertIncludes(staffAccessClient, 'isAnswerlatticeStaffListResponse', 'Answerlattice staff list response guard');
  assertIncludes(staffAccessClient, 'isAnswerlatticeStaffMutationResponse', 'Answerlattice staff mutation response guard');
  assertIncludes(staffAccessClient, 'isAnswerlatticeRoleMutationResponse', 'Answerlattice staff role response guard');
  assertIncludes(staffAccessClient, 'answerlattice_staff_response_parse_failed', 'Answerlattice staff response parse diagnostic');
  assertIncludes(staffAccessClient, 'answerlattice_staff_response_rejected', 'Answerlattice staff response rejected diagnostic');
  assertIncludes(staffAccessClient, 'answerlattice_staff_response_invalid', 'Answerlattice staff response invalid diagnostic');
  assertNotIncludes(staffAccessClient, 'data?.error ||', 'Answerlattice staff client must not throw raw route response text');
  assertNotIncludes(staffAccessClient, 'response.json().catch(() => ({}))', 'Answerlattice staff direct JSON fallback');
  assertNotIncludes(staffAccessServer, 'userId: z.string().trim().min(1).max(160)', 'Answerlattice staff loose user ID schema');
  assertNotIncludes(staffAccessServer, '.doc(input.userId)', 'Answerlattice staff raw input user document ref');
  assertNotIncludes(staffAccessServer, '.doc(params.userId)', 'Answerlattice staff raw params user document ref');
  [
    ['staff access implementation docs', staffAccessImpl],
    ['staff access Firebase docs', staffAccessFirebase],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice staff user ID boundary', `Answerlattice staff user ID boundary documented in ${label}`);
  });
  assertNotIncludes(staffAccessServer, 'accounts:sendOobCode?key=${apiKey}', 'Answerlattice staff reset must not interpolate Firebase API keys into provider URLs');
  assertNotIncludes(staffAccessServer, 'data?.error?.message', 'Answerlattice staff reset must not retain Firebase Auth provider failure text');
  assertNotIncludes(staffAccessServer, 'error?.message', 'Answerlattice staff policy failures must not branch on raw exception text');
  assertIncludes(installCenter, 'ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED', 'Answerlattice install center fixed load copy');
  assertIncludes(installCenter, 'ANSWERLATTICE_INSTALL_RESPONSE_JSON_MAX_BYTES', 'Answerlattice install center response cap');
  assertIncludes(installCenter, 'ANSWERLATTICE_INSTALL_REQUEST_POLICY', 'Answerlattice install center shared request policy');
  assertIncludes(installCenter, "cache: 'no-store'", 'Answerlattice install center requests bypass browser cache');
  assertIncludes(installCenter, "credentials: 'same-origin'", 'Answerlattice install center requests keep credentials same-origin');
  assertIncludes(installCenter, "redirect: 'manual'", 'Answerlattice install center requests do not follow redirects');
  assertIncludes(installCenter, '...ANSWERLATTICE_INSTALL_REQUEST_POLICY', 'Answerlattice install center widget setup request applies shared policy');
  assertIncludes(installCenter, 'readJsonResponseWithLimit<unknown>', 'Answerlattice install center bounded widget response parser');
  assertIncludes(installCenter, 'readInstallWidgetConfigResponse', 'Answerlattice install center widget response reader');
  assertIncludes(installCenter, 'isWidgetConfigResponse', 'Answerlattice install center widget response guard');
  assertIncludes(installCenter, 'readAnswerlatticeActivationDashboardResponse', 'Answerlattice install center activation response reader');
  assertIncludes(installCenter, 'isAnswerlatticeActivationSummaryResponse', 'Answerlattice install center activation response guard');
  assertIncludes(installCenter, 'answerlattice_install_widget_config_response_parse_failed', 'Answerlattice install center widget response parse diagnostic');
  assertIncludes(installCenter, 'answerlattice_install_widget_config_response_rejected', 'Answerlattice install center widget response rejected diagnostic');
  assertIncludes(installCenter, 'answerlattice_install_widget_config_response_invalid', 'Answerlattice install center widget response invalid diagnostic');
  assertIncludes(installCenter, 'answerlattice_install_activation_summary_response_failed', 'Answerlattice install center activation response diagnostic');
  assertNotIncludes(installCenter, 'widgetResponse.json().catch(() => ({}))', 'Answerlattice install center widget direct JSON fallback');
  assertNotIncludes(installCenter, 'activationResponse.json().catch(() => ({}))', 'Answerlattice install center activation direct JSON fallback');
  assertNotIncludes(installCenter, "fetch('/api/answerlattice/activation/summary', { method: 'GET' }).catch(() => null)", 'Answerlattice install center silent activation fetch fallback');
  assertIncludes(multiLanguageArticles, 'ANSWERLATTICE_ARTICLE_TRANSLATION_FAILED', 'Answerlattice multi-language fixed translation copy');

  [
    ['Answerlattice dashboard', dashboard],
    ['Answerlattice settings', settings],
    ['Answerlattice activation command center', activation],
    ['Answerlattice operations panel', operations],
    ['Answerlattice weekly digest', weeklyDigest],
    ['Answerlattice FAQ management', faqManagement],
    ['Answerlattice product surfaces', productSurfaces],
    ['Answerlattice team access', teamAccess],
    ['Answerlattice install center', installCenter],
    ['Answerlattice multi-language articles', multiLanguageArticles],
  ].forEach(([label, source]) => {
    assertNotIncludes(source, 'getAnswerlatticeUiErrorMessage', `${label} must not show browser exception messages`);
    assertNotIncludes(source, 'data.error ||', `${label} must not throw raw API response text`);
    assertNotIncludes(source, '(data as any).error', `${label} must not throw raw API response text`);
    assertNotIncludes(source, 'widgetData.error', `${label} must not throw raw widget API response text`);
    assertNotIncludes(source, 'error?.message', `${label} must not show raw exception messages`);
    assertNotIncludes(source, 'err?.message', `${label} must not show raw exception messages`);
    assertNotIncludes(source, 'message.error(getAnswerlatticeUiErrorMessage', `${label} must not show helper-derived exception text`);
    assertNotIncludes(source, 'throw new Error(data.error', `${label} must not throw raw API response text`);
  });
}

function verifyAnswerlatticeBrowserHandoffDiagnostics() {
  const jobCard = read('src/components/templates/platform/KBGeneration/jobCard/index.tsx');
  const jobProcessingProgress = read('src/components/templates/platform/KBGeneration/jobCard/JobProcessingProgress.tsx');
  const jobPreviewCard = read('src/components/templates/platform/KBGeneration/jobHistory/JobPreviewCard.tsx');
  const jobDetailsDrawer = read('src/components/templates/platform/KBGeneration/jobHistory/JobDetailsDrawer.tsx');
  const jobStatusTag = read('src/components/templates/platform/KBGeneration/jobCard/jobStatusTag.tsx');
  const articleMetadata = read('src/components/templates/platform/KBGeneration/reconciliation/ArticleMetadata.tsx');
  const ticketActions = read('src/components/templates/platform/supportTickets/TicketActions.tsx');
  const ticketDetailView = read('src/components/templates/platform/supportTickets/TicketDetailView.tsx');
  const platformTicketsView = read('src/components/templates/platform/supportTickets/PlatformTicketsView.tsx');
  const conversationTimeline = read('src/components/templates/platform/supportTickets/ConversationTimeline.tsx');
  const ticketsDal = read('src/database/tickets/index.ts');
  const addSupportTicket = read('src/components/organisms/addSupportTicket/index.tsx');
  const helpChatHandlers = read('src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts');
  const answerlatticeSupportClipboard = read('src/lib/answerlattice/supportClipboard.ts');
  const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
  const installCenter = read('src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx');

  [
    ['job card', jobCard, "window.open(sourceUrl, '_blank', 'noopener,noreferrer')"],
    ['job details drawer', jobDetailsDrawer, "window.open(url, '_blank', 'noopener,noreferrer')"],
    ['article metadata', articleMetadata, "window.open(source.url, '_blank', 'noopener,noreferrer')"],
  ].forEach(([label, content, openCall]) => {
    assertIncludes(content, 'logRuntimeFailure', `Answerlattice KB source ${label} handoff diagnostics`);
    assertIncludes(content, 'getBoundedRuntimeStringContext', `Answerlattice KB source ${label} bounded context`);
    assertIncludes(content, openCall, `Answerlattice KB source ${label} guarded browser open`);
    assertIncludes(content, "throw new Error('answerlattice_kb_source_open_blocked')", `Answerlattice KB source ${label} blocked-open code`);
    assertIncludes(content, "logRuntimeFailure('answerlattice_kb_source_open_failed'", `Answerlattice KB source ${label} failure code`);
    assertIncludes(content, "message.error('Unable to open source')", `Answerlattice KB source ${label} fixed failure copy`);
    assertIncludes(content, "getBoundedRuntimeStringContext('sourceUrl'", `Answerlattice KB source ${label} bounded source URL`);
    assertIncludes(content, "getBoundedRuntimeStringContext('sourceName'", `Answerlattice KB source ${label} bounded source name`);
    assertIncludes(content, "getBoundedRuntimeStringContext('sourceType'", `Answerlattice KB source ${label} bounded source type`);
  });

  assertIncludes(jobCard, "getBoundedRuntimeStringContext('jobId', id)", 'Answerlattice KB job card bounded job metadata');
  assertNotIncludes(jobCard, 'only for testing', 'Answerlattice KB job card commented test override block');
  assertNotIncludes(jobCard, 'status = INGESTION_JOB_STATUS.PUBLISHING', 'Answerlattice KB job card commented status override');
  assertNotIncludes(jobCard, 'articlesEmbeddedCount = articlesEmbeddedCount || 20', 'Answerlattice KB job card commented progress override');
  assertIncludes(jobProcessingProgress, 'const safeTotalArticlesCount = Math.max(0, Math.floor(Number(totalArticlesCount) || 0));', 'Answerlattice KB processing progress bounded total count');
  assertIncludes(jobProcessingProgress, 'Math.max(safeTotalArticlesCount, 1) * TIME_REQUIRED_PER_ARTICLE_SEC', 'Answerlattice KB processing progress zero-count guard');
  assertNotIncludes(jobProcessingProgress, 'only for testing', 'Answerlattice KB processing progress commented test override block');
  assertNotIncludes(jobProcessingProgress, 'Timestamp.fromMillis', 'Answerlattice KB processing progress commented timestamp override');
  assertNotIncludes(jobProcessingProgress, 'totalArticlesCount = 60', 'Answerlattice KB processing progress commented article-count override');
  assertIncludes(jobDetailsDrawer, "getBoundedRuntimeStringContext('jobId', job.id)", 'Answerlattice KB job details bounded job metadata');
  assertIncludes(jobDetailsDrawer, "getBoundedRuntimeStringContext('jobStatus', job.status)", 'Answerlattice KB job details bounded status metadata');
  assertIncludes(jobDetailsDrawer, 'answerlattice_kb_job_id_copy_failed', 'Answerlattice KB job ID copy failure diagnostics');
  assertIncludes(jobDetailsDrawer, 'answerlattice_kb_job_id_copy_clipboard_unavailable', 'Answerlattice KB job ID unavailable clipboard code');
  assertIncludes(jobDetailsDrawer, 'answerlattice_kb_job_id_copy_fallback_failed', 'Answerlattice KB job ID failed fallback clipboard code');
  assertIncludes(jobDetailsDrawer, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice KB job ID shared clipboard helper');
  assertIncludes(jobDetailsDrawer, 'hasClipboardWrite', 'Answerlattice KB job ID clipboard support metadata');
  assertIncludes(jobDetailsDrawer, 'hasCopyFallback', 'Answerlattice KB job ID fallback support metadata');
  assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper acknowledged fallback copy result');
  assertIncludes(jobDetailsDrawer, 'job.sourceFiles.map((file) => (', 'Answerlattice KB job details source list');
  assertNotIncludes(jobDetailsDrawer, 'dummySourceFiles', 'Answerlattice KB job details dummy source files');
  assertNotIncludes(jobDetailsDrawer, 'DUMMY DATA FOR ICON REVIEW', 'Answerlattice KB job details dummy icon-review block');
  assertNotIncludes(jobDetailsDrawer, 'File Icon Review (Temporary)', 'Answerlattice KB job details temporary icon-review UI');
  assertIncludes(jobCard, 'const statusOptions = getIngestionJobStatusData(token);', 'Answerlattice KB job card shared status map');
  assertIncludes(jobCard, 'const statusConfig = statusOptions[status] || {', 'Answerlattice KB job card unknown status fallback');
  assertIncludes(jobPreviewCard, 'const config = getIngestionJobStatusData()[status] || {', 'Answerlattice KB job history shared status map');
  assertIncludes(jobPreviewCard, "label: 'Unknown'", 'Answerlattice KB job history unknown status fallback');
  assertIncludes(jobDetailsDrawer, 'const statusConfig = getIngestionJobStatusData()[job.status] || {', 'Answerlattice KB job details shared status map');
  assertIncludes(jobDetailsDrawer, "label: 'Unknown'", 'Answerlattice KB job details unknown status fallback');
  assertIncludes(jobStatusTag, 'const config = getIngestionJobStatusData()[status] || {', 'Answerlattice KB job status tag shared status map');
  assertIncludes(jobStatusTag, "label: 'Unknown'", 'Answerlattice KB job status tag unknown status fallback');
  assertNotIncludes(jobPreviewCard, 'const statusConfig: { [key: string]', 'Answerlattice KB job history local status map');
  assertNotIncludes(jobDetailsDrawer, 'const statusConfig: { [key: string]', 'Answerlattice KB job details local status map');
  assertIncludes(articleMetadata, "getBoundedRuntimeStringContext('articleId', article.id)", 'Answerlattice KB article metadata bounded article metadata');
  assertIncludes(articleMetadata, "getBoundedRuntimeStringContext('jobId', article.jobId)", 'Answerlattice KB article metadata bounded job metadata');
  assertNotIncludes(jobCard, "onClickSource={(url) => window.open(url, '_blank', 'noopener,noreferrer')}", 'Answerlattice KB job card raw source open');
  assertNotIncludes(jobDetailsDrawer, "window.open(url, '_blank');", 'Answerlattice KB job details raw source open');
  assertNotIncludes(jobDetailsDrawer, 'navigator.clipboard.writeText(job.id);', 'Answerlattice KB job details direct Clipboard copy');
  assertNotIncludes(articleMetadata, "onClickSource={() => window.open(source.url, '_blank', 'noopener,noreferrer')}", 'Answerlattice KB article metadata raw source open');

  [
    ['ticket actions', ticketActions],
    ['ticket detail view', ticketDetailView],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'logRuntimeFailure', `Answerlattice support ticket ${label} handoff diagnostics`);
    assertIncludes(content, 'getBoundedRuntimeStringContext', `Answerlattice support ticket ${label} bounded context`);
    assertIncludes(content, "window.open(item.url, '_blank', 'noopener,noreferrer')", `Answerlattice support ticket ${label} guarded browser open`);
    assertIncludes(content, "throw new Error('answerlattice_ticket_attachment_open_blocked')", `Answerlattice support ticket ${label} blocked-open code`);
    assertIncludes(content, "logRuntimeFailure('answerlattice_ticket_attachment_open_failed'", `Answerlattice support ticket ${label} failure code`);
    assertIncludes(content, "message.error('Unable to open attachment')", `Answerlattice support ticket ${label} fixed failure copy`);
    assertIncludes(content, "getBoundedRuntimeStringContext('ticketId'", `Answerlattice support ticket ${label} bounded ticket ID`);
    assertIncludes(content, "getBoundedRuntimeStringContext('ticketDisplayId'", `Answerlattice support ticket ${label} bounded display ID`);
    assertIncludes(content, "getBoundedRuntimeStringContext('attachmentUrl'", `Answerlattice support ticket ${label} bounded attachment URL`);
    assertIncludes(content, "getBoundedRuntimeStringContext('attachmentName'", `Answerlattice support ticket ${label} bounded attachment name`);
    assertIncludes(content, "getBoundedRuntimeStringContext('attachmentType'", `Answerlattice support ticket ${label} bounded attachment type`);
    assertIncludes(content, "attachmentSizePresent: typeof item.size === 'number'", `Answerlattice support ticket ${label} bounded attachment size presence`);
    assertNotIncludes(content, "onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}", `Answerlattice support ticket ${label} raw attachment open`);
  });

  assertIncludes(ticketsDal, 'assertSupportTicketCreateSucceeded', 'Answerlattice support ticket create acknowledgement guard');
  assertIncludes(ticketsDal, 'satisfies SupportTicketCreateResult', 'Answerlattice support ticket create explicit result');
  assertIncludes(ticketsDal, 'assertSupportTicketUpdateSucceeded', 'Answerlattice support ticket update acknowledgement guard');
  assertIncludes(ticketsDal, 'assertSupportTicketMessageAddSucceeded', 'Answerlattice support ticket message acknowledgement guard');
  assertIncludes(ticketsDal, 'satisfies SupportTicketMessageAddResult', 'Answerlattice support ticket message explicit result');
  assertIncludes(ticketsDal, 'satisfies SupportTicketStatusUpdateResult', 'Answerlattice support ticket status explicit result');
  assertIncludes(ticketsDal, 'SUPPORT_TICKET_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;', 'Answerlattice support ticket exact numeric scope helper');
  assertIncludes(ticketsDal, 'documentId !== raw', 'Answerlattice support ticket scope must not trim mutated IDs');
  assertIncludes(ticketsDal, '!isValidFirestoreDocumentId(documentId)', 'Answerlattice support ticket scope Firestore document ID guard');
  assertIncludes(ticketsDal, 'const sessionScope = getRequiredSessionSupportTicketScope(session);', 'Answerlattice support ticket reads require normalized session scope');
  assertIncludes(ticketsDal, 'where("tId", "==", sessionScope.tId)', 'Answerlattice support ticket owner reads use normalized tenant scope');
  assertIncludes(ticketsDal, 'where("sId", "==", sessionScope.sId)', 'Answerlattice support ticket owner reads use normalized store scope');
  assertIncludes(ticketsDal, 'requireSupportTicketMutationScope', 'Answerlattice support ticket mutation scope guard');
  assertIncludes(ticketsDal, 'applySupportTicketMutationScope', 'Answerlattice support ticket mutation scope preserve helper');
  assertIncludes(ticketsDal, "throw new Error(`${operationCode}_ticket_scope_missing`)", 'Answerlattice support ticket missing scope rejection');
  assertIncludes(ticketsDal, "throw new Error(`${operationCode}_ticket_scope_mismatch`)", 'Answerlattice support ticket mismatched scope rejection');
  assertIncludes(ticketsDal, 'delete updateData.tId;', 'Answerlattice support ticket platform partial updates must not overwrite tenant scope');
  assertIncludes(ticketsDal, 'delete updateData.sId;', 'Answerlattice support ticket platform partial updates must not overwrite store scope');
  assertNotIncludes(ticketsDal, 'where("tId", "==", session.tId)', 'Answerlattice support ticket reads must not query raw session tenant scope');
  assertNotIncludes(ticketsDal, 'where("sId", "==", session.sId)', 'Answerlattice support ticket reads must not query raw session store scope');
  assertNotIncludes(ticketsDal, 'const tId = Number(session?.tId ?? session?.user?.tenantId);', 'Answerlattice support ticket reads must not numeric-coerce session tenant scope');
  assertNotIncludes(ticketsDal, 'const sId = Number(session?.sId ?? session?.user?.storeId);', 'Answerlattice support ticket reads must not numeric-coerce session store scope');
  assertIncludes(addSupportTicket, 'support_ticket_submit_create_rejected', 'Answerlattice support ticket submit create rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_escalation_ticket_create_rejected', 'Answerlattice HelpChat escalation ticket create rejection code');
  assertIncludes(helpChatHandlers, 'copyHelpChatMessageToClipboard', 'Answerlattice HelpChat copy acknowledgement helper');
  assertIncludes(helpChatHandlers, 'help_chat_message_copy_clipboard_unavailable', 'Answerlattice HelpChat unavailable clipboard failure code');
  assertIncludes(helpChatHandlers, 'help_chat_message_copy_fallback_failed', 'Answerlattice HelpChat failed fallback clipboard failure code');
  assertIncludes(helpChatHandlers, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice HelpChat shared support clipboard fallback helper');
  assertIncludes(helpChatHandlers, 'hasClipboardWrite', 'Answerlattice HelpChat clipboard support metadata');
  assertIncludes(helpChatHandlers, 'hasCopyFallback', 'Answerlattice HelpChat fallback support metadata');
  assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportClipboardWrite', 'Answerlattice support clipboard helper Clipboard API detection');
  assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportCopyFallback', 'Answerlattice support clipboard helper fallback detection');
  assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper acknowledged fallback copy result');
  assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.unavailable)', 'Answerlattice support clipboard helper unavailable rejection');
  assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.fallbackFailed)', 'Answerlattice support clipboard helper fallback rejection');
  assertNotIncludes(helpChatHandlers, 'navigator.clipboard.writeText(textToCopy)\n                .then', 'Answerlattice HelpChat direct clipboard promise chain');
  assertIncludes(ticketDetailView, 'platform_ticket_detail_update_rejected', 'Answerlattice support ticket detail update rejection code');
  assertIncludes(ticketDetailView, 'tId: ticket.tId', 'Answerlattice support ticket detail updates carry original tenant scope');
  assertIncludes(ticketDetailView, 'sId: ticket.sId', 'Answerlattice support ticket detail updates carry original store scope');
  assertIncludes(conversationTimeline, 'platform_ticket_message_add_rejected', 'Answerlattice support ticket message add rejection code');
  assertIncludes(conversationTimeline, 'assertSupportTicketMessageAddSucceeded', 'Answerlattice support ticket message caller acknowledgement guard');
  assertIncludes(conversationTimeline, '{ tId: ticket.tId, sId: ticket.sId }', 'Answerlattice support ticket replies carry original scope');
  assertIncludes(ticketActions, 'answerlattice_ticket_surface_options_load_failed', 'Answerlattice support ticket surface option diagnostic');
  assertIncludes(ticketDetailView, 'answerlattice_ticket_summary_refresh_after_update_failed', 'Answerlattice support ticket summary refresh diagnostic');
  assertIncludes(ticketDetailView, 'answerlattice_ticket_resolution_signal_emit_failed', 'Answerlattice support ticket resolution signal emit diagnostic');
  assertIncludes(ticketDetailView, 'answerlattice_ticket_resolution_signal_import_failed', 'Answerlattice support ticket resolution signal import diagnostic');
  assertNotIncludes(ticketDetailView, 'rebuildProductSurfaceContentSummary().catch(() => undefined);', 'Answerlattice support ticket summary refresh silent catch');
  assertNotIncludes(ticketDetailView, "}).catch(() => { /* fire-and-forget */ });", 'Answerlattice support ticket resolution signal silent emit catch');
  assertNotIncludes(ticketDetailView, "}).catch(() => { /* dynamic import fail", 'Answerlattice support ticket resolution signal silent import catch');
  assertIncludes(platformTicketsView, 'platform_ticket_soft_delete_rejected', 'Answerlattice support ticket soft-delete rejection code');
  assertIncludes(platformTicketsView, 'platform_ticket_restore_rejected', 'Answerlattice support ticket restore rejection code');
  assertIncludes(platformTicketsView, 'tId: ticket.tId', 'Answerlattice support ticket table actions carry original tenant scope');
  assertIncludes(platformTicketsView, 'sId: ticket.sId', 'Answerlattice support ticket table actions carry original store scope');

  assertIncludes(widgetClient, 'WIDGET_LINK_OPEN_FAILED_MESSAGE', 'Answerlattice widget client fixed link-open copy');
  assertIncludes(widgetClient, 'openWidgetLink', 'Answerlattice widget client shared link-open handler');
  assertIncludes(widgetClient, "window.open(url, '_blank', 'noopener,noreferrer')", 'Answerlattice widget client guarded browser open');
  assertIncludes(widgetClient, "throw new Error('answerlattice_widget_link_open_blocked')", 'Answerlattice widget client blocked-open code');
  assertIncludes(widgetClient, "logRuntimeFailure('answerlattice_widget_link_open_failed'", 'Answerlattice widget client bounded link-open failure code');
  assertIncludes(widgetClient, "getBoundedRuntimeStringContext('linkUrl', url)", 'Answerlattice widget client bounded link URL');
  assertIncludes(widgetClient, "getBoundedRuntimeStringContext('linkId', context.linkId)", 'Answerlattice widget client bounded link ID');
  assertIncludes(widgetClient, "getBoundedRuntimeStringContext('linkTitle', context.linkTitle)", 'Answerlattice widget client bounded link title');
  assertIncludes(widgetClient, "getBoundedRuntimeStringContext('linkSource', context.linkSource)", 'Answerlattice widget client bounded link source');
  assertIncludes(widgetClient, 'setError(WIDGET_LINK_OPEN_FAILED_MESSAGE)', 'Answerlattice widget client fixed link-open error state');
  assertNotIncludes(widgetClient, "onClick={() => ref.url && window.open(ref.url, '_blank', 'noopener,noreferrer')}", 'Answerlattice widget client raw reference open');
  assertNotIncludes(widgetClient, "onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}", 'Answerlattice widget client raw related-article open');

  assertIncludes(installCenter, 'ANSWERLATTICE_INSTALL_LINK_OPEN_FAILED', 'Answerlattice install center fixed link-open copy');
  assertIncludes(installCenter, 'openInstallLink', 'Answerlattice install center shared link-open handler');
  assertIncludes(installCenter, "window.open(href, '_blank', 'noopener,noreferrer')", 'Answerlattice install center guarded browser open');
  assertIncludes(installCenter, "throw new Error('answerlattice_install_link_open_blocked')", 'Answerlattice install center blocked-open code');
  assertIncludes(installCenter, "logRuntimeFailure('answerlattice_install_link_open_failed'", 'Answerlattice install center bounded link-open failure code');
  assertIncludes(installCenter, "getBoundedRuntimeStringContext('linkHref', href)", 'Answerlattice install center bounded link href');
  assertIncludes(installCenter, "getBoundedRuntimeStringContext('linkKey', linkKey)", 'Answerlattice install center bounded link key');
  assertIncludes(installCenter, "getBoundedRuntimeStringContext('linkLabel', linkLabel)", 'Answerlattice install center bounded link label');
  assertIncludes(installCenter, 'message.error(ANSWERLATTICE_INSTALL_LINK_OPEN_FAILED)', 'Answerlattice install center fixed link-open toast');
  assertNotIncludes(installCenter, "window.open('/api/answerlattice/widget-agent-kit', '_blank', 'noopener,noreferrer')", 'Answerlattice install center raw download-kit open');
  assertNotIncludes(installCenter, "window.open(item.href, '_blank', 'noopener,noreferrer')", 'Answerlattice install center raw docs-link open');
}

function verifyAnswerlatticeHookFailureCopy() {
  const entityCandidates = read('src/hooks/answerlattice/useEntityCandidates.ts');
  const entities = read('src/hooks/answerlattice/useEntities.ts');
  const predictiveTriggers = read('src/hooks/answerlattice/usePredictiveTriggers.ts');
  const canonicalAnswers = read('src/hooks/answerlattice/useCanonicalAnswers.ts');
  const mutationProposals = read('src/hooks/answerlattice/useMutationProposals.ts');
  const mutationProposalDal = read('src/database/answerlattice/mutationProposals.ts');
  const supportBoard = read('src/hooks/answerlattice/useSupportBoard.ts');
  const frictionInsights = read('src/hooks/answerlattice/useFrictionInsights.ts');

  assertIncludes(entityCandidates, 'ANSWERLATTICE_ENTITY_CANDIDATES_LOAD_FAILED', 'Answerlattice entity candidates fixed load copy');
  assertIncludes(entityCandidates, 'ANSWERLATTICE_ENTITY_CANDIDATE_APPROVE_FAILED', 'Answerlattice entity candidates fixed approve copy');
  assertIncludes(entityCandidates, 'ANSWERLATTICE_ENTITY_CANDIDATE_REJECT_FAILED', 'Answerlattice entity candidates fixed reject copy');
  assertIncludes(entityCandidates, 'ANSWERLATTICE_ENTITY_CANDIDATE_PROMOTE_FAILED', 'Answerlattice entity candidates fixed promote copy');
  assertIncludes(entityCandidates, 'ANSWERLATTICE_ENTITY_CANDIDATE_MERGE_FAILED', 'Answerlattice entity candidates fixed merge copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITIES_LOAD_FAILED', 'Answerlattice entities fixed load copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_CREATE_FAILED', 'Answerlattice entities fixed create copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_UPDATE_FAILED', 'Answerlattice entities fixed update copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_DEPRECATE_FAILED', 'Answerlattice entities fixed deprecate copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_ALIASES_UPDATE_FAILED', 'Answerlattice entities fixed aliases copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_MERGE_FAILED', 'Answerlattice entities fixed merge copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_RELATION_ADD_FAILED', 'Answerlattice entities fixed relation-add copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_RELATION_REMOVE_FAILED', 'Answerlattice entities fixed relation-remove copy');
  assertIncludes(entities, 'ANSWERLATTICE_ENTITY_SEARCH_INDEX_UPDATE_FAILED', 'Answerlattice entities fixed search-index copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGERS_LOAD_FAILED', 'Answerlattice predictive triggers fixed load copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGER_CREATE_FAILED', 'Answerlattice predictive triggers fixed create copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGER_UPDATE_FAILED', 'Answerlattice predictive triggers fixed update copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGER_ACTIVATE_FAILED', 'Answerlattice predictive triggers fixed activate copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGER_DISABLE_FAILED', 'Answerlattice predictive triggers fixed disable copy');
  assertIncludes(predictiveTriggers, 'ANSWERLATTICE_PREDICTIVE_TRIGGER_DELETE_FAILED', 'Answerlattice predictive triggers fixed delete copy');
  assertIncludes(canonicalAnswers, 'ANSWERLATTICE_CANONICAL_ANSWERS_LOAD_FAILED', 'Answerlattice canonical answers fixed load copy');
  assertIncludes(canonicalAnswers, 'ANSWERLATTICE_CANONICAL_ANSWER_CREATE_FAILED', 'Answerlattice canonical answers fixed create copy');
  assertIncludes(canonicalAnswers, 'ANSWERLATTICE_CANONICAL_ANSWER_UPDATE_FAILED', 'Answerlattice canonical answers fixed update copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_PROPOSALS_LOAD_FAILED', 'Answerlattice mutation proposals fixed load copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_PROPOSAL_APPROVE_FAILED', 'Answerlattice mutation proposals fixed approve copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_PROPOSAL_REJECT_FAILED', 'Answerlattice mutation proposals fixed reject copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_PROPOSAL_IMPLEMENT_FAILED', 'Answerlattice mutation proposals fixed implement copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_DRAFT_PUBLISH_FAILED', 'Answerlattice mutation proposals fixed publish copy');
  assertIncludes(mutationProposals, 'ANSWERLATTICE_MUTATION_DRAFT_GENERATE_FAILED', 'Answerlattice mutation proposals fixed regenerate copy');
  assertIncludes(mutationProposalDal, 'ANSWERLATTICE_DRAFT_REGENERATION_FAILED', 'Answerlattice mutation proposal DAL fixed draft-regeneration response copy');
  assertNotIncludes(mutationProposalDal, 'result?.error', 'Answerlattice mutation proposal DAL must not rethrow raw draft-regeneration route response text');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_LOAD_FAILED', 'Answerlattice Support Board fixed load copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_CARD_CREATE_FAILED', 'Answerlattice Support Board fixed card-create copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_CARD_UPDATE_FAILED', 'Answerlattice Support Board fixed card-update copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_NOTE_ADD_FAILED', 'Answerlattice Support Board fixed note-add copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_TICKET_SYNC_FAILED', 'Answerlattice Support Board fixed ticket-sync copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_SIGNAL_SYNC_FAILED', 'Answerlattice Support Board fixed signal-sync copy');
  assertIncludes(supportBoard, 'ANSWERLATTICE_SUPPORT_BOARD_PROPOSAL_CREATE_FAILED', 'Answerlattice Support Board fixed proposal-create copy');
  assertIncludes(supportBoard, 'answerlattice_support_board_summary_load_failed', 'Answerlattice Support Board summary-load bounded diagnostic');
  assertIncludes(supportBoard, 'getSupportBoardSummaryLogContext', 'Answerlattice Support Board summary bounded context helper');
  assertNotIncludes(supportBoard, 'getAnswerlatticeSupportBoardSummary(tId, sId).catch(() => null)', 'Answerlattice Support Board silent summary fallback');
  assertIncludes(frictionInsights, 'ANSWERLATTICE_FRICTION_DATA_LOAD_FAILED', 'Answerlattice friction insights fixed load copy');

  [
    ['Answerlattice entity candidates hook', entityCandidates],
    ['Answerlattice entities hook', entities],
    ['Answerlattice predictive triggers hook', predictiveTriggers],
    ['Answerlattice canonical answers hook', canonicalAnswers],
    ['Answerlattice mutation proposals hook', mutationProposals],
    ['Answerlattice Support Board hook', supportBoard],
    ['Answerlattice friction insights hook', frictionInsights],
  ].forEach(([label, source]) => {
    assertNotIncludes(source, 'getAnswerlatticeUiErrorMessage', `${label} must not show browser exception messages`);
    assertNotIncludes(source, 'data.error', `${label} must not throw raw API response text`);
    assertNotIncludes(source, 'result.error', `${label} must not throw raw result error text`);
    assertNotIncludes(source, 'error?.message', `${label} must not show raw exception messages`);
    assertNotIncludes(source, 'err?.message', `${label} must not show raw exception messages`);
    assertNotIncludes(source, 'message.error(getAnswerlatticeUiErrorMessage', `${label} must not show helper-derived exception text`);
    assertNotIncludes(source, 'setError(getAnswerlatticeUiErrorMessage', `${label} must not show helper-derived exception text`);
    assertNotIncludes(source, 'throw err', `${label} must not rethrow raw exceptions to callers`);
    assertNotIncludes(source, 'throw new Error(result.error', `${label} must not rethrow raw result error text`);
  });
}

function verifyAnswerlatticeSupportBoardRelatedEntityBoundary() {
  const supportBoardCardIdBoundary = read('src/lib/answerlattice/supportBoardCardIdBoundary.ts');
  const supportBoardDal = read('src/database/answerlattice/supportBoard.ts');
  const supportBoardHook = read('src/hooks/answerlattice/useSupportBoard.ts');
  const supportBoardUi = read('src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx');
  const supportBoardReadme = read('__docs__/answerlattice/support-board/README.md');
  const supportBoardImpl = read('__docs__/answerlattice/support-board/support-board_impl.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(supportBoardCardIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice Support Board card ID boundary imports shared Firestore guard');
  assertIncludes(supportBoardCardIdBoundary, 'export function normalizeAnswerlatticeSupportBoardCardId(value: unknown): string | null {', 'Answerlattice Support Board card ID boundary exports normalizer');
  assertIncludes(supportBoardCardIdBoundary, 'isValidFirestoreDocumentId(cardId)', 'Answerlattice Support Board card ID boundary validates Firestore document ID');
  assertIncludes(supportBoardDal, "import { normalizeAnswerlatticeSupportBoardCardId } from '@lib/answerlattice/supportBoardCardIdBoundary';", 'Answerlattice Support Board DAL card ID boundary import');
  assertIncludes(supportBoardDal, 'const normalizedDocId = normalizeAnswerlatticeSupportBoardCardId(docId);', 'Answerlattice Support Board document ref normalizes card ID');
  assertIncludes(supportBoardDal, "if (!normalizedDocId) throw new Error('Invalid support board card id');", 'Answerlattice Support Board document ref rejects malformed card ID');
  assertIncludes(supportBoardDal, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice Support Board document ref uses normalized card ID');
  assertNotIncludes(supportBoardDal, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice Support Board DAL must not build raw card document refs');

  assertIncludes(supportBoardDal, "import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice Support Board DAL resolved entity ID import');
  assertIncludes(supportBoardDal, 'const cleanRelatedEntityId = (value: unknown) => normalizeAnswerlatticeResolvedEntityId(value);', 'Answerlattice Support Board DAL related entity ID normalizer');
  assertIncludes(supportBoardDal, 'relatedEntityId: cleanRelatedEntityId(cardData.relatedEntityId),', 'Answerlattice Support Board card create normalizes related entity ID');
  assertIncludes(supportBoardDal, 'relatedEntityId: cleanRelatedEntityId(cardPatch.relatedEntityId)', 'Answerlattice Support Board card update normalizes related entity ID');
  assertNotIncludes(supportBoardDal, 'relatedEntityId: cardData.relatedEntityId || null', 'Answerlattice Support Board card create must not persist raw related entity ID');
  assertNotIncludes(supportBoardDal, 'relatedEntityId: cardPatch.relatedEntityId || null', 'Answerlattice Support Board card update must not persist raw related entity ID');

  assertIncludes(supportBoardHook, "import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice Support Board hook resolved entity ID import');
  assertIncludes(supportBoardHook, 'const getTicketEntityId = (ticket: SupportTicketType) => (\n    normalizeAnswerlatticeResolvedEntityId(', 'Answerlattice Support Board ticket source entity ID normalization');
  assertIncludes(supportBoardHook, 'const entityId = normalizeAnswerlatticeResolvedEntityId(signal.entityId);', 'Answerlattice Support Board signal source entity ID normalization');
  assertIncludes(supportBoardHook, 'const relatedEntityId = normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId);', 'Answerlattice Support Board proposal related entity ID normalization');
  assertIncludes(supportBoardHook, 'relatedEntityIds: [relatedEntityId],', 'Answerlattice Support Board proposal uses resolved related entity ID');
  assertNotIncludes(supportBoardHook, "signal.entityId && signal.entityId !== 'unresolved'", 'Answerlattice Support Board signal sync must not use raw unresolved guard');
  assertNotIncludes(supportBoardHook, "card.relatedEntityId === 'unresolved'", 'Answerlattice Support Board proposal gate must not use raw unresolved guard');
  assertNotIncludes(supportBoardHook, 'relatedEntityIds: [card.relatedEntityId]', 'Answerlattice Support Board proposal must not use raw card related entity ID');

  assertIncludes(supportBoardUi, "import { normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice Support Board UI resolved entity ID import');
  assertIncludes(supportBoardUi, 'const cardEntityId = normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId);', 'Answerlattice Support Board card badge uses resolved entity ID');
  assertIncludes(supportBoardUi, 'const selectedCardEntityId = normalizeAnswerlatticeResolvedEntityId(selectedCard?.relatedEntityId);', 'Answerlattice Support Board selected-card entity ID normalization');
  assertIncludes(supportBoardUi, "relatedEntityId: normalizeAnswerlatticeResolvedEntityId(card.relatedEntityId) || '',", 'Answerlattice Support Board detail form initializes with resolved entity ID');
  assertNotIncludes(supportBoardUi, "selectedCard.relatedEntityId !== 'unresolved'", 'Answerlattice Support Board UI must not use raw unresolved guard');

  [
    ['Support Board README', supportBoardReadme],
    ['Support Board implementation docs', supportBoardImpl],
    ['data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Support Board Card ID Boundary', `${label} documents Support Board card ID boundary`);
    assertIncludes(content, 'Answerlattice App Support Board Related Entity ID Boundary', `${label} documents Support Board related entity ID boundary`);
  });
}

function verifyPublicWidgetRequestAdmission() {
  const publicAnswers = read('src/app/api/answerlattice/public/v1/answers/route.ts');
  const publicSignals = read('src/app/api/answerlattice/public/v1/signals/route.ts');
  const widgetSearch = read('src/app/api/widget/search/route.ts');
  const widgetFeedback = read('src/app/api/widget/feedback/route.ts');
  const predictiveHelp = read('src/app/api/answerlattice/predictive-help/route.ts');
  const publicContact = read('src/app/api/answerlattice/public/contact/route.ts');
  const publicContactForm = read('src/app/sites/answerlattice/contact/ContactForm.tsx');
  const mcp = read('src/app/api/answerlattice/mcp/route.ts');

  assertIncludes(widgetSearch, 'const WIDGET_SEARCH_MAX_BODY_BYTES = ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH + (64 * 1024);', 'Answerlattice widget search body cap');
  assertIncludes(widgetSearch, 'readBoundedJsonBody(request, WIDGET_SEARCH_MAX_BODY_BYTES', 'Answerlattice widget search bounded body');
  assertIncludes(widgetSearch, 'WidgetSearchRequestSchema.safeParse(bodyResult.data)', 'Answerlattice widget search bounded validation');
  assertNotIncludes(widgetSearch, 'request.json()', 'Answerlattice widget search raw JSON parser');
  assertOrder(
    widgetSearch,
    [
      'const rateLimitResult = await checkRateLimit({',
      'const authResult = await validatePublicApiKey(apiKey, {',
      'credential.productId !== PRODUCT_IDS.ANSWERLATTICE',
      "hasPublicApiCredentialScope(credential, 'widget:search')",
      'isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)',
      'readBoundedJsonBody(request, WIDGET_SEARCH_MAX_BODY_BYTES',
      'WidgetSearchRequestSchema.safeParse(bodyResult.data)',
      'coreSearch({',
    ],
    'Answerlattice widget search admission order',
  );

  assertIncludes(widgetFeedback, 'const WIDGET_FEEDBACK_MAX_BODY_BYTES = 2 * 1024;', 'Answerlattice widget feedback body cap');
  assertIncludes(widgetFeedback, 'readBoundedJsonBody(request, WIDGET_FEEDBACK_MAX_BODY_BYTES', 'Answerlattice widget feedback bounded body');
  assertIncludes(widgetFeedback, 'FeedbackRequestSchema.safeParse(bodyResult.data)', 'Answerlattice widget feedback bounded validation');
  assertNotIncludes(widgetFeedback, 'request.json()', 'Answerlattice widget feedback raw JSON parser');
  assertOrder(
    widgetFeedback,
    [
      'const rateLimitResult = await checkRateLimit({',
      'const authResult = await validatePublicApiKey(apiKey, {',
      'credential.productId !== PRODUCT_IDS.ANSWERLATTICE',
      "hasPublicApiCredentialScope(credential, 'widget:feedback')",
      'isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)',
      'readBoundedJsonBody(request, WIDGET_FEEDBACK_MAX_BODY_BYTES',
      'FeedbackRequestSchema.safeParse(bodyResult.data)',
      'const { searchHistoryId, isGood } = validation.data',
      'const historyRef = answerlatticeFirestoreAdmin',
      '.doc(searchHistoryId)',
    ],
    'Answerlattice widget feedback admission order',
  );

  assertIncludes(publicAnswers, 'const PUBLIC_ANSWER_REQUEST_MAX_BODY_BYTES = 16 * 1024;', 'Answerlattice public answers body cap');
  assertIncludes(publicAnswers, 'readBoundedJsonBody(request, PUBLIC_ANSWER_REQUEST_MAX_BODY_BYTES', 'Answerlattice public answers bounded body');
  assertIncludes(publicAnswers, 'PublicAnswerRequestSchema.safeParse(bodyResult.data)', 'Answerlattice public answers bounded validation');
  assertNotIncludes(publicAnswers, 'request.json()', 'Answerlattice public answers raw JSON parser');
  assertOrder(
    publicAnswers,
    [
      "authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/answers')",
      'readBoundedJsonBody(request, PUBLIC_ANSWER_REQUEST_MAX_BODY_BYTES',
      'PublicAnswerRequestSchema.safeParse(bodyResult.data)',
      'AnswerlatticeContextSchema.safeParse(body.context)',
      'attemptCanonicalRetrieval(body.query',
    ],
    'Answerlattice public answers admission order',
  );

  assertIncludes(publicSignals, 'const PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES = 32 * 1024;', 'Answerlattice public signals body cap');
  assertIncludes(publicSignals, 'readBoundedJsonBody(request, PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES', 'Answerlattice public signals bounded body');
  assertIncludes(publicSignals, 'PublicSignalSchema.safeParse(bodyResult.data)', 'Answerlattice public signals bounded validation');
  assertNotIncludes(publicSignals, 'request.json()', 'Answerlattice public signals raw JSON parser');
  assertOrder(
    publicSignals,
    [
      "authenticateAnswerlatticePublicApi(request, 'POST /api/answerlattice/public/v1/signals', 'signals:write')",
      'readBoundedJsonBody(request, PUBLIC_SIGNAL_REQUEST_MAX_BODY_BYTES',
      'PublicSignalSchema.safeParse(bodyResult.data)',
      'emitAnswerlatticeSignal({',
    ],
    'Answerlattice public signals admission order',
  );

  assertIncludes(predictiveHelp, 'const PREDICTIVE_HELP_MAX_BODY_BYTES = 4 * 1024;', 'Answerlattice predictive help body cap');
  assertIncludes(predictiveHelp, 'readBoundedJsonBody(request, PREDICTIVE_HELP_MAX_BODY_BYTES', 'Answerlattice predictive help bounded body');
  assertIncludes(predictiveHelp, 'PredictiveHelpRequestSchema.safeParse(bodyResult.data)', 'Answerlattice predictive help bounded validation');
  assertNotIncludes(predictiveHelp, 'request.json()', 'Answerlattice predictive help raw JSON parser');
  assertOrder(
    predictiveHelp,
    [
      'const rateLimitResult = await checkRateLimit({',
      'const authResult = await validatePublicApiKey(apiKey, {',
      'credential.productId !== PRODUCT_IDS.ANSWERLATTICE',
      "hasPublicApiCredentialScope(credential, 'widget:predictive')",
      'isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)',
      'readBoundedJsonBody(request, PREDICTIVE_HELP_MAX_BODY_BYTES',
      'PredictiveHelpRequestSchema.safeParse(bodyResult.data)',
      'evaluateTriggers(',
    ],
    'Answerlattice predictive help admission order',
  );

  assertIncludes(publicContact, 'const ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES = 8 * 1024;', 'Answerlattice public contact body cap');
  assertIncludes(publicContact, 'readBoundedJsonBody(request, ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES', 'Answerlattice public contact bounded body');
  assertIncludes(publicContact, 'ContactRequestSchema.safeParse(bodyResult.data)', 'Answerlattice public contact bounded validation');
  assertNotIncludes(publicContact, 'request.json()', 'Answerlattice public contact raw JSON parser');
  assertOrder(
    publicContact,
    [
      "checkPublicRateLimit(request, 'ANSWERLATTICE_CONTACT_FORM')",
      'readBoundedJsonBody(request, ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES',
      'ContactRequestSchema.safeParse(bodyResult.data)',
      'validateHoneypot(body.website || undefined)',
      'verifyTurnstileToken(body.captchaToken, request)',
      'db.collection(DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES).add({',
    ],
    'Answerlattice public contact admission order',
  );
  assertIncludes(publicContact, "logRuntimeDiagnostic('answerlattice_public_contact_submission_accepted'", 'Answerlattice public contact accepted bounded diagnostic');
  assertIncludes(publicContact, "logRuntimeFailure('answerlattice_public_contact_submission_failed'", 'Answerlattice public contact failure bounded diagnostic');
  assertIncludes(publicContact, "getBoundedRuntimeStringContext('enquiryId', docRef.id)", 'Answerlattice public contact bounded enquiry metadata');
  assertNotIncludes(publicContact, "secureError('[Answerlattice Contact] Submission failed'", 'Answerlattice public contact raw secureError');
  assertNotIncludes(publicContact, "secureLog('[Answerlattice Contact] Submission accepted'", 'Answerlattice public contact raw accepted secureLog');
  assertIncludes(publicContactForm, 'ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES = 8 * 1024', 'Answerlattice public contact client response cap');
  assertIncludes(publicContactForm, 'readJsonResponseWithLimit<AnswerlatticeContactResponse>', 'Answerlattice public contact client bounded response parser');
  assertIncludes(publicContactForm, "cache: 'no-store'", 'Answerlattice public contact client no-store request');
  assertIncludes(publicContactForm, "credentials: 'same-origin'", 'Answerlattice public contact client same-origin credentials');
  assertIncludes(publicContactForm, "redirect: 'manual'", 'Answerlattice public contact client redirect boundary');
  assertIncludes(publicContactForm, "logRuntimeFailure('answerlattice_public_contact_response_parse_failed'", 'Answerlattice public contact client parse diagnostics');
  assertIncludes(publicContactForm, "logRuntimeFailure('answerlattice_public_contact_response_invalid'", 'Answerlattice public contact client invalid response diagnostics');
  assertIncludes(publicContactForm, 'messageLength: form.message.length', 'Answerlattice public contact client bounded message metadata');
  assertIncludes(publicContactForm, 'sourcePathLength: sourcePath.length', 'Answerlattice public contact client bounded source path metadata');
  assertNotIncludes(publicContactForm, 'response.json().catch(() => null)', 'Answerlattice public contact client direct JSON fallback');
  assertNotIncludes(publicContactForm, 'response.text()', 'Answerlattice public contact client response text read');

  assertIncludes(mcp, 'const ANSWERLATTICE_MCP_MAX_BODY_BYTES = 16 * 1024;', 'Answerlattice MCP body cap');
  assertIncludes(mcp, 'readBoundedJsonBody(request, ANSWERLATTICE_MCP_MAX_BODY_BYTES', 'Answerlattice MCP bounded body');
  assertIncludes(mcp, 'const body = bodyResult.data as JsonRpcRequest;', 'Answerlattice MCP bounded validation');
  assertIncludes(mcp, "logRuntimeFailure('answerlattice_mcp_json_rpc_failed'", 'Answerlattice MCP JSON-RPC bounded diagnostic');
  assertIncludes(mcp, "getBoundedRuntimeStringContext('tenantId', session.tId)", 'Answerlattice MCP bounded tenant metadata');
  assertIncludes(mcp, "getBoundedRuntimeStringContext('storeId', session.sId)", 'Answerlattice MCP bounded store metadata');
  assertNotIncludes(mcp, 'request.json()', 'Answerlattice MCP raw JSON parser');
  assertNotIncludes(mcp, "secureError('[Answerlattice MCP] JSON-RPC request failed'", 'Answerlattice MCP JSON-RPC raw secureError');
  assertOrder(
    mcp,
    [
      'verifyAnswerlatticeMcpSessionToken(token)',
      'const rateLimit = await checkRateLimit({',
      'readBoundedJsonBody(request, ANSWERLATTICE_MCP_MAX_BODY_BYTES',
      'const body = bodyResult.data as JsonRpcRequest;',
      "if (body.method === 'tools/call')",
      'handleAnswerlatticeMcpToolCall(session.tId, session.sId, toolName, args)',
    ],
    'Answerlattice MCP admission order',
  );
}

function verifyProtectedReadRateLimitGuards() {
  const dashboardReadLimit = read('src/app/api/answerlattice/readRateLimit.ts');
  const activationSummary = read('src/app/api/answerlattice/activation/summary/route.ts');
  const widgetActivity = read('src/app/api/answerlattice/widget-activity/route.ts');
  const intakeEntities = read('src/app/api/answerlattice/knowledge-intake/entities/route.ts');
  const intakeMonitor = read('src/app/api/platform/answerlattice-intake/route.ts');
  const operationsStatus = read('src/app/api/answerlattice/operations/status/route.ts');
  const aiOperations = read('src/app/api/answerlattice/ai-operations/route.ts');
  const aiOperationsClient = read('src/database/answerlattice/aiOperations.ts');
  const aiOperationHistoryQuery = read('src/lib/ai/operationHistoryQuery.ts');
  const sessionScope = read('src/lib/answerlattice/sessionScope.ts');
  const publicContentScope = read('src/lib/answerlattice/publicContentScope.ts');
  const helpWidgetImpl = read('__docs__/answerlattice/help-widget/help-widget_impl.md');
  const ownerSupportAssistantImpl = read('__docs__/answerlattice/owner-support-assistant/owner-support-assistant_impl.md');
  const activationCommandCenterImpl = read('__docs__/answerlattice/client-activation-command-center/client-activation-command-center_impl.md');
  const helpWidgetFirebase = read('__docs__/answerlattice/help-widget/help-widget_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');
  const publicContent = read('src/app/api/answerlattice/public-content/route.ts');
  const publicContentCache = read('src/lib/answerlattice/publicContentCache.ts');
  const publicContentClient = read('src/lib/answerlattice/publicContentClient.ts');

  assertIncludes(sessionScope, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice shared session scope imports Firestore document ID guard');
  assertIncludes(sessionScope, 'ANSWERLATTICE_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;', 'Answerlattice shared session scope exact numeric helper');
  assertIncludes(sessionScope, 'export function normalizeAnswerlatticeScopeDocumentId(value: unknown): number | null', 'Answerlattice shared session scope strict normalizer');
  assertIncludes(sessionScope, 'documentId !== raw', 'Answerlattice shared session scope must not trim mutated IDs');
  assertIncludes(sessionScope, '!isValidFirestoreDocumentId(documentId)', 'Answerlattice shared session scope Firestore document ID guard');
  assertIncludes(sessionScope, 'Number.isSafeInteger(parsed)', 'Answerlattice shared session scope safe integer guard');
  assertIncludes(publicContentScope, 'normalizeAnswerlatticeScopeDocumentId', 'Answerlattice public content scope reuses shared strict scope helper');
  assertNotIncludes(sessionScope, 'const normalizeNumber = (value: unknown): number | null => {', 'Answerlattice shared session scope must not use loose normalizeNumber helper');
  assertNotIncludes(sessionScope, 'Number.isFinite(parsed) && parsed > 0 ? parsed : null', 'Answerlattice shared session scope must not use loose numeric coercion');
  assertNotIncludes(publicContentScope, 'const normalizeScopeNumber = (value: unknown): number | null => {', 'Answerlattice public content scope must not keep route-local loose scope parser');
  assertIncludes(helpWidgetImpl, 'exact positive numeric Firestore document IDs before widget activity reads', 'Help widget docs must document shared session scope boundary');
  assertIncludes(ownerSupportAssistantImpl, 'tenant/store scope is accepted only as exact positive numeric Firestore document IDs', 'Owner Support Assistant docs must document shared session scope boundary');
  assertIncludes(activationCommandCenterImpl, 'accepts only exact positive numeric Firestore document IDs for tenant/store scope', 'Activation Command Center docs must document shared session scope boundary');
  assertIncludes(productionAudit, 'Answerlattice shared session scope boundary checkpoint: fixed in source.', 'Production readiness audit must document shared Answerlattice session scope hardening');
  assertIncludes(changelog, 'Answerlattice Shared Session Scope Boundary', 'Changelog must document shared Answerlattice session scope hardening');

  assertIncludes(dashboardReadLimit, "getRateLimitForFeature('DATA_READ')", 'Answerlattice dashboard read limiter shared config');
  assertIncludes(dashboardReadLimit, 'checkRateLimit({', 'Answerlattice dashboard read limiter provider call');
  assertIncludes(dashboardReadLimit, "buildAnswerlatticeRateLimitKey(`answerlattice-dashboard-read:${routeKey}`, userId, tenantId, storeId)", 'Answerlattice dashboard read limiter hashed scoped key');
  assertIncludes(dashboardReadLimit, "logger.security('Rate Limit Exceeded - Answerlattice Dashboard Read'", 'Answerlattice dashboard read limiter security log');
  assertIncludes(dashboardReadLimit, "'Cache-Control': 'private, no-store'", 'Answerlattice dashboard read limiter no-store throttle');
  assertIncludes(dashboardReadLimit, "'X-RateLimit-Limit': String(rateLimitConfig.limit)", 'Answerlattice dashboard read limiter headers');
  assertIncludes(dashboardReadLimit, "getBoundedAnswerlatticeStringContext('tenantId', tenantId)", 'Answerlattice dashboard read limiter bounded tenant metadata');
  assertIncludes(dashboardReadLimit, "getBoundedAnswerlatticeStringContext('storeId', storeId)", 'Answerlattice dashboard read limiter bounded store metadata');

  assertIncludes(activationSummary, "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'activation-summary')", 'Answerlattice activation summary read limiter');
  assertIncludes(activationSummary, "logRuntimeFailure('answerlattice_activation_summary_route_failed'", 'Answerlattice activation summary bounded diagnostics');
  assertOrder(
    activationSummary,
    [
      'ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER',
      "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'activation-summary')",
      'requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS)',
      'resolveSessionScope(session)',
      'const [storeSnap, existingSummarySnap, contextSnap, coverageSnap, trustSnap, bundleManifestSnap] = await Promise.all([',
      'readLegacySubscription(db, tId, sId)',
    ],
    'Answerlattice activation summary read limiter before permission and Firestore reads',
  );
  assertNotIncludes(activationSummary, "secureError('[Answerlattice Activation] Failed to load summary'", 'Answerlattice activation summary raw secureError');

  assertIncludes(widgetActivity, "applyAnswerlatticeDashboardReadRateLimit(request, session, 'widget-activity')", 'Answerlattice widget activity read limiter');
  assertIncludes(widgetActivity, "logRuntimeFailure('answerlattice_widget_activity_route_failed'", 'Answerlattice widget activity bounded diagnostics');
  assertIncludes(widgetActivity, 'CANONICAL_ISO_TIMESTAMP_PATTERN', 'Answerlattice widget activity strict timestamp pattern');
  assertIncludes(widgetActivity, 'canonicalIsoTimestampToMillis', 'Answerlattice widget activity canonical timestamp normalizer');
  assertIncludes(widgetActivity, 'new Date(millis).toISOString() === normalized', 'Answerlattice widget activity timestamp round-trip guard');
  assertIncludes(widgetActivity, 'timestampLikeToMillis(value)', 'Answerlattice widget activity shared timestamp normalization');
  assertOrder(
    widgetActivity,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      "applyAnswerlatticeDashboardReadRateLimit(request, session, 'widget-activity')",
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'resolveSessionScope(session)',
      'fetchIndexedWidgetActivity(db, scope.tenantId, scope.storeId)',
      'fetchFallbackWidgetActivity(db, scope.tenantId, scope.storeId)',
    ],
    'Answerlattice widget activity read limiter before permission and search-history reads',
  );
  assertNotIncludes(widgetActivity, "secureError('[Answerlattice Widget Activity] Failed to load recent widget questions'", 'Answerlattice widget activity raw secureError');
  assertNotIncludes(widgetActivity, 'Date.parse(String(value))', 'Answerlattice widget activity permissive string timestamp parser');
  assertNotIncludes(widgetActivity, 'new Date(value)', 'Answerlattice widget activity permissive date constructor parser');
  assertIncludes(helpWidgetImpl, 'widget activity timestamp boundary', 'Help Widget implementation docs record widget activity timestamp boundary');
  assertIncludes(helpWidgetFirebase, 'Widget activity timestamp normalization', 'Help Widget Firebase docs record widget activity timestamp boundary');
  assertIncludes(productionAudit, 'Answerlattice widget activity timestamp boundary checkpoint', 'Production audit records widget activity timestamp boundary');
  assertIncludes(changelog, 'Answerlattice Widget Activity Timestamp Boundary', 'Changelog records widget activity timestamp boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Widget Activity Timestamp Boundary', 'Lowercase changelog records widget activity timestamp boundary');

  assertIncludes(intakeEntities, "applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-entities')", 'Answerlattice intake entity lookup read limiter');
  assertIncludes(intakeEntities, "logRuntimeFailure('answerlattice_intake_entity_lookup_failed'", 'Answerlattice intake entity lookup bounded diagnostics');
  assertOrder(
    intakeEntities,
    [
      'EntityLookupSchema.safeParse',
      "applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-entities')",
      'requireAnswerlatticeKnowledgeIntakeContext(request, session)',
      'searchAnswerlatticeEntityLookupOptions(access.context.scope, parsed.data.q)',
    ],
    'Answerlattice intake entity lookup read limiter before permission and entity reads',
  );
  assertNotIncludes(intakeEntities, "rateLimitKey: 'answerlattice-intake:entity-search'", 'Answerlattice intake entity lookup custom read limiter');
  assertNotIncludes(intakeEntities, "secureError('[Answerlattice Intake] Entity lookup failed'", 'Answerlattice intake entity lookup raw secureError');

  assertIncludes(operationsStatus, "logRuntimeFailure('answerlattice_operations_status_load_failed'", 'Answerlattice operations status bounded diagnostics');
  assertIncludes(operationsStatus, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice operations status bounded tenant metadata');
  assertIncludes(operationsStatus, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice operations status bounded store metadata');
  assertOrder(
    operationsStatus,
    [
      'ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER',
      'const scope = resolveSessionScope(session)',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS)',
      'const db = getAnswerlatticeDb()',
      'const [storeSnap, schedulerStateSnap, workspaceStateSnap, runLogSnap] = await Promise.all([',
    ],
    'Answerlattice operations status read limiter before permission and Firestore reads',
  );
  assertNotIncludes(operationsStatus, "secureError('[Answerlattice Operations] Failed to load scheduler status'", 'Answerlattice operations status raw secureError');

  assertIncludes(aiOperations, "logRuntimeFailure('answerlattice_ai_operations_load_failed'", 'Answerlattice AI operations bounded diagnostics');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice AI operations bounded tenant diagnostic metadata');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice AI operations bounded store diagnostic metadata');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('userId', userIdForLog)", 'Answerlattice AI operations bounded user diagnostic metadata');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('storeId', storeId)", 'Answerlattice AI operations bounded store rate-limit metadata');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('tenantId', tenantId)", 'Answerlattice AI operations bounded tenant rate-limit metadata');
  assertIncludes(aiOperations, "getBoundedRuntimeStringContext('userId', userId)", 'Answerlattice AI operations bounded user rate-limit metadata');
  assertIncludes(aiOperations, "isValidAiOperationCursorId", 'Answerlattice AI operations cursor ID boundary');
  assertIncludes(aiOperations, "normalizeAiOperationHistoryDateRange(startDate, endDate)", 'Answerlattice AI operations strict date filter boundary');
  assertIncludes(aiOperations, 'AI_OPERATION_DATE_FILTER_MAX_LENGTH', 'Answerlattice AI operations date filter length cap');
  assertIncludes(aiOperations, "query = query.where('createdOn', '>=', dateRange.start);", 'Answerlattice AI operations strict start date filter');
  assertIncludes(aiOperations, "query = query.where('createdOn', '<=', dateRange.end);", 'Answerlattice AI operations strict end date filter');
  assertIncludes(aiOperationHistoryQuery, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'shared AI operation cursor uses Firestore document ID guard import');
  assertIncludes(aiOperationHistoryQuery, 'AI_OPERATION_CURSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/', 'shared AI operation cursor pattern');
  assertIncludes(aiOperationHistoryQuery, 'AI_OPERATION_CURSOR_ID_PATTERN.test(cursorId) && isValidFirestoreDocumentId(cursorId)', 'shared AI operation cursor Firestore document ID guard');
  assertIncludes(aiOperationHistoryQuery, 'AI_OPERATION_HISTORY_MAX_DATE_RANGE_DAYS = 366', 'shared AI operation date range cap');
  assertIncludes(aiOperationHistoryQuery, 'AI_OPERATION_ISO_DATE_PATTERN', 'shared AI operation strict ISO parser');
  assertNotIncludes(aiOperations, 'function getDateParam', 'Answerlattice AI operations route-local permissive date parser');
  assertNotIncludes(aiOperations, 'new Date(value)', 'Answerlattice AI operations permissive date parser');
  assertNotIncludes(aiOperationHistoryQuery, 'Date.parse(', 'shared AI operation history permissive Date.parse');
  assertOrder(
    aiOperations,
    [
      'QuerySchema.safeParse',
      'resolveAnswerlatticeSessionScope(session)',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING)',
      'const platformRole = session.platformRole || session.user?.platformRole',
      'collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)',
    ],
    'Answerlattice AI operations read limiter before permission and operation reads',
  );
  assertNotIncludes(aiOperations, "secureError('[answerlattice-ai-operations] Failed to load operations'", 'Answerlattice AI operations raw secureError');
  assertNotIncludes(aiOperations, 'storeId,\n                tenantId,\n                userId,', 'Answerlattice AI operations raw rate-limit scope log');
  assertIncludes(aiOperationsClient, 'ANSWERLATTICE_AI_OPERATIONS_REQUEST_POLICY', 'Answerlattice AI operations client shared request policy');
  assertIncludes(aiOperationsClient, "cache: 'no-store'", 'Answerlattice AI operations client bypasses browser cache');
  assertIncludes(aiOperationsClient, "credentials: 'same-origin'", 'Answerlattice AI operations client keeps credentials same-origin');
  assertIncludes(aiOperationsClient, "redirect: 'manual'", 'Answerlattice AI operations client does not follow redirects');
  assertIncludes(aiOperationsClient, '...ANSWERLATTICE_AI_OPERATIONS_REQUEST_POLICY', 'Answerlattice AI operations client applies shared request policy');
  assertIncludes(aiOperationsClient, 'ANSWERLATTICE_AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES', 'Answerlattice AI operations client response cap');
  assertIncludes(aiOperationsClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice AI operations client bounded response parser');
  assertIncludes(aiOperationsClient, 'isPaginatedResponse', 'Answerlattice AI operations client response shape guard');
  assertNotIncludes(aiOperationsClient, 'result.json()', 'Answerlattice AI operations client direct JSON fallback');

  assertIncludes(publicContent, "logRuntimeFailure('answerlattice_public_content_cache_load_failed'", 'Answerlattice public content bounded diagnostics');
  assertIncludes(publicContent, "getBoundedRuntimeStringContext('tenantId', scope.tId)", 'Answerlattice public content bounded tenant metadata');
  assertIncludes(publicContent, "getBoundedRuntimeStringContext('storeId', scope.sId)", 'Answerlattice public content bounded store metadata');
  assertIncludes(publicContent, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice public content KB article ID boundary import');
  assertIncludes(publicContent, 'articleId: z.string().trim().max(160).refine((value) => normalizeAnswerlatticeKbArticleId(value) === value).optional()', 'Answerlattice public content article ID schema boundary');
  assertIncludes(publicContentCache, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice public content cache KB article ID boundary import');
  assertIncludes(publicContentCache, 'const normalizedArticleId = normalizeAnswerlatticeKbArticleId(articleId);', 'Answerlattice public content cache article ID boundary');
  assertOrder(
    publicContent,
    [
      'publicContentQuerySchema.safeParse',
      "if (type === 'article')",
      'if (!articleId)',
      'getCachedKnowledgeBaseArticle(scope, articleId)',
    ],
    'Answerlattice public content article ID validation before cache read',
  );
  assertNotIncludes(publicContent, "secureError('[Answerlattice Public Content] Failed to load cached content'", 'Answerlattice public content raw secureError');
  assertNotIncludes(publicContent, 'articleId: z.string().trim().min(1).max(160).optional()', 'Answerlattice public content loose article ID schema');
  assertNotIncludes(publicContentCache, "const normalizedArticleId = String(articleId || '').trim();", 'Answerlattice public content cache loose article ID trim');
  assertIncludes(publicContentClient, 'ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_POLICY', 'Answerlattice public content client shared request policy');
  assertIncludes(publicContentClient, 'ANSWERLATTICE_PUBLIC_CONTENT_RESPONSE_JSON_MAX_BYTES', 'Answerlattice public content client response cap');
  assertIncludes(publicContentClient, "cache: 'no-store'", 'Answerlattice public content client bypasses browser cache');
  assertIncludes(publicContentClient, "credentials: 'same-origin'", 'Answerlattice public content client keeps credentials same-origin');
  assertIncludes(publicContentClient, "redirect: 'manual'", 'Answerlattice public content client does not follow redirects');
  assertIncludes(publicContentClient, '...ANSWERLATTICE_PUBLIC_CONTENT_REQUEST_POLICY', 'Answerlattice public content client applies shared request policy');
  assertIncludes(publicContentClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice public content client bounded response parser');
  assertIncludes(publicContentClient, 'isPublicContentResponse<T>', 'Answerlattice public content client response guard');
  assertIncludes(publicContentClient, 'answerlattice_public_content_client_response_parse_failed', 'Answerlattice public content client parse diagnostic');
  assertIncludes(publicContentClient, 'answerlattice_public_content_client_response_rejected', 'Answerlattice public content client rejected diagnostic');
  assertIncludes(publicContentClient, 'answerlattice_public_content_client_response_invalid', 'Answerlattice public content client invalid diagnostic');
  assertNotIncludes(publicContentClient, 'const payload = await response.json();', 'Answerlattice public content client direct JSON fallback');
  assertNotIncludes(publicContentClient, 'Answerlattice public content request failed: ${response.status}', 'Answerlattice public content client raw status error');

  assertIncludes(intakeMonitor, "getRateLimitForFeature('DATA_READ')", 'Answerlattice intake monitor read limiter config');
  assertIncludes(intakeMonitor, 'checkAnswerlatticeIntakeMonitorReadRateLimit(request, session)', 'Answerlattice intake monitor read limiter');
  assertIncludes(intakeMonitor, 'buildAnswerlatticeRateLimitKey(ANSWERLATTICE_INTAKE_MONITOR_RATE_LIMIT_KEY, userId)', 'Answerlattice intake monitor hashed read limiter key');
  assertIncludes(intakeMonitor, "logger.security('Rate Limit Exceeded - Answerlattice Intake Monitor'", 'Answerlattice intake monitor read limiter security log');
  assertIncludes(intakeMonitor, "logRuntimeFailure('answerlattice_intake_monitor_snapshot_failed'", 'Answerlattice intake monitor bounded diagnostics');
  assertOrder(
    intakeMonitor,
    [
      'QuerySchema.safeParse',
      'checkAnswerlatticeIntakeMonitorReadRateLimit(request, session)',
      'loadTenantOptions(db)',
      'DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS',
      'DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS',
      'DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER',
    ],
    'Answerlattice intake monitor read limiter before platform Firestore reads',
  );
  assertNotIncludes(intakeMonitor, "secureError('[Answerlattice Intake Monitor] Failed to load snapshot'", 'Answerlattice intake monitor raw snapshot secureError');
}

function verifyAnswerlatticeRateLimitKeyPrivacy() {
  const helper = read('src/lib/answerlattice/rateLimitKeys.ts');
  assertIncludes(helper, 'hashPublicRateLimitValue', 'Answerlattice rate-limit key helper uses shared HMAC hashing');
  assertIncludes(helper, 'hashAnswerlatticeRateLimitSegment', 'Answerlattice rate-limit key helper exposes hashed segment builder');
  assertIncludes(helper, 'buildAnswerlatticeRateLimitKey', 'Answerlattice rate-limit key helper exposes scoped key builder');

  const routeFiles = [
    ...listRouteFiles('src/app/api/answerlattice'),
    'src/app/api/platform/answerlattice-intake/route.ts',
    'src/app/api/answerlattice/readRateLimit.ts',
    'src/lib/answerlattice/knowledgeIntakeApi.ts',
    'src/lib/answerlattice/staffAccessServer.ts',
  ];
  const rawIdentityKeyPattern = /key:\s*`[^`]*\$\{[^`]*(?:userId|tenantId|storeId|scope\.tenantId|scope\.storeId|sessionScope\.tenantId|sessionScope\.storeId|tId|sId|session\.tId|session\.sId|session\.user\.id)[^`]*`/g;
  const allowedHashedKeyFragments = [
    'apiKeyRateLimitId',
    'ipHash',
    'pageKeyHash',
    'screenTokenHash',
    'sessionHash',
    'hashApiKey',
  ];
  const offenders = routeFiles.filter((relPath) => {
    const matches = read(relPath).match(rawIdentityKeyPattern) || [];
    return matches.some(match => !allowedHashedKeyFragments.some(fragment => match.includes(fragment)));
  });

  assert(
    offenders.length === 0,
    `Answerlattice rate-limit keys must not interpolate raw user/tenant/store identifiers: ${offenders.join(', ')}`,
  );

  const dashboardReadLimit = read('src/app/api/answerlattice/readRateLimit.ts');
  const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const onboard = read('src/app/api/answerlattice/onboard/route.ts');
  const staffAccessServer = read('src/lib/answerlattice/staffAccessServer.ts');
  assertIncludes(dashboardReadLimit, "buildAnswerlatticeRateLimitKey(`answerlattice-dashboard-read:${routeKey}`, userId, tenantId, storeId)", 'Answerlattice dashboard read limiter uses hashed identity segments');
  assertIncludes(intakeApi, 'buildAnswerlatticeRateLimitKey(options.rateLimitKey, tId, sId)', 'Answerlattice knowledge intake limiter uses hashed workspace segments');
  assertIncludes(onboard, "buildAnswerlatticeRateLimitKey('answerlattice-onboard', userId)", 'Answerlattice onboarding limiter uses hashed user segment');
  assertIncludes(staffAccessServer, 'buildAnswerlatticeRateLimitKey(keyPrefix, session?.uId || session?.user?.id || getRequestIp(request))', 'Answerlattice staff access limiter uses hashed actor/IP segment');
  assertIncludes(staffAccessServer, 'const ANSWERLATTICE_STAFF_MUTATION_MAX_BODY_BYTES = 16 * 1024;', 'Answerlattice staff mutations declare explicit body cap');
  assertIncludes(staffAccessServer, 'readBoundedJsonBody(request, ANSWERLATTICE_STAFF_MUTATION_MAX_BODY_BYTES', 'Answerlattice staff mutations use bounded body reader');
  assertIncludes(staffAccessServer, 'readAnswerlatticeStaffMutationBody(request)', 'Answerlattice staff mutations use shared bounded mutation parser');
  assertNotIncludes(dashboardReadLimit, 'key: `answerlattice-dashboard-read:${routeKey}:${userId}:${tenantId}:${storeId}`', 'Answerlattice dashboard read limiter raw scoped key');
  assertNotIncludes(intakeApi, 'key: `${options.rateLimitKey}:${tId}:${sId}`', 'Answerlattice knowledge intake raw workspace key');
  assertNotIncludes(onboard, 'key: `answerlattice-onboard:${userId}`', 'Answerlattice onboarding raw user key');
  assertNotIncludes(staffAccessServer, 'key: `${keyPrefix}:${session?.uId || session?.user?.id || getRequestIp(request)}`', 'Answerlattice staff access raw actor/IP key');
  assertNotIncludes(staffAccessServer, 'request.json()', 'Answerlattice staff access raw JSON parser');
}

function verifyAnswerlatticeRebuildSyncRouteGuards() {
  const bundleRebuild = read('src/app/api/answerlattice/bundles/rebuild/route.ts');
  const surfaceSummaryRebuild = read('src/app/api/answerlattice/product-surfaces/rebuild-summary/route.ts');
  const tenantSummary = read('src/app/api/answerlattice/tenant-summary/route.ts');
  const tenantSummaryClient = read('src/lib/answerlattice/tenantSummaryClient.ts');

  assertIncludes(bundleRebuild, 'const BUNDLE_REBUILD_MAX_BODY_BYTES = 2 * 1024;', 'Answerlattice bundle rebuild body cap');
  assertIncludes(bundleRebuild, "const BUNDLE_REBUILD_REASON_CODES = ['manual', 'activation_manual_rebuild'] as const;", 'Answerlattice bundle rebuild reason allowlist');
  assertIncludes(bundleRebuild, 'reason: z.enum(BUNDLE_REBUILD_REASON_CODES).optional().default', 'Answerlattice bundle rebuild reason enum');
  assertIncludes(bundleRebuild, 'readOptionalBoundedJsonBody(request, BUNDLE_REBUILD_MAX_BODY_BYTES', 'Answerlattice bundle rebuild bounded body');
  assertIncludes(bundleRebuild, 'const parsedResult = RebuildRequestSchema.safeParse(bodyResult.data);', 'Answerlattice bundle rebuild safe body parse');
  assertIncludes(bundleRebuild, 'if (!parsedResult.success)', 'Answerlattice bundle rebuild invalid reason returns input error');
  assertIncludes(bundleRebuild, "requestedBy: 'owner'", 'Answerlattice bundle rebuild must not persist raw requester identifiers');
  assertIncludes(bundleRebuild, "logRuntimeFailure('answerlattice_context_bundle_manual_rebuild_failed'", 'Answerlattice bundle rebuild bounded diagnostics');
  assertIncludes(bundleRebuild, "getBoundedRuntimeStringContext('tenantId', tenantId)", 'Answerlattice bundle rebuild bounded tenant metadata');
  assertIncludes(bundleRebuild, "getBoundedRuntimeStringContext('storeId', storeId)", 'Answerlattice bundle rebuild bounded store metadata');
  assertOrder(
    bundleRebuild,
    [
      'ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES',
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT)',
      'readOptionalBoundedJsonBody(request, BUNDLE_REBUILD_MAX_BODY_BYTES',
      'RebuildRequestSchema.safeParse(bodyResult.data)',
      'if (!parsedResult.success)',
      'buildAnswerlatticeContextBundleServer({',
    ],
    'Answerlattice bundle rebuild limiter before permission and build work',
  );
  assertNotIncludes(bundleRebuild, "secureError('[Answerlattice Bundles] Failed to rebuild compiled context'", 'Answerlattice bundle rebuild raw secureError');
  assertNotIncludes(bundleRebuild, "requestedBy: session.user?.id || session.user?.email || 'owner'", 'Answerlattice bundle rebuild raw requester persistence');
  assertNotIncludes(bundleRebuild, 'reason: z.string().trim().min(1).max(80)', 'Answerlattice bundle rebuild arbitrary reason text');

  assertIncludes(surfaceSummaryRebuild, 'const PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES = 2 * 1024;', 'Answerlattice product-surface summary rebuild body cap');
  assertIncludes(surfaceSummaryRebuild, "const PRODUCT_SURFACE_SUMMARY_REBUILD_REASON_CODES = ['manual'] as const;", 'Answerlattice product-surface summary rebuild reason allowlist');
  assertIncludes(surfaceSummaryRebuild, 'reason: z.enum(PRODUCT_SURFACE_SUMMARY_REBUILD_REASON_CODES).optional().default', 'Answerlattice product-surface summary rebuild reason enum');
  assertIncludes(surfaceSummaryRebuild, 'readOptionalBoundedJsonBody(request, PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES', 'Answerlattice product-surface summary bounded body');
  assertIncludes(surfaceSummaryRebuild, 'const parsedResult = RebuildRequestSchema.safeParse(bodyResult.data);', 'Answerlattice product-surface summary safe body parse');
  assertIncludes(surfaceSummaryRebuild, 'if (!parsedResult.success)', 'Answerlattice product-surface summary invalid reason returns input error');
  assertIncludes(surfaceSummaryRebuild, "logRuntimeFailure('answerlattice_product_surface_summary_rebuild_failed'", 'Answerlattice product-surface summary bounded diagnostics');
  assertIncludes(surfaceSummaryRebuild, "getBoundedRuntimeStringContext('tenantId', tenantId)", 'Answerlattice product-surface summary bounded tenant metadata');
  assertIncludes(surfaceSummaryRebuild, "getBoundedRuntimeStringContext('storeId', storeId)", 'Answerlattice product-surface summary bounded store metadata');
  assertOrder(
    surfaceSummaryRebuild,
    [
      'ENABLE_ANSWERLATTICE_PRODUCT_SURFACES',
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE)',
      'readOptionalBoundedJsonBody(request, PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES',
      'RebuildRequestSchema.safeParse(bodyResult.data)',
      'if (!parsedResult.success)',
      'rebuildProductSurfaceContentSummaryServer({',
    ],
    'Answerlattice product-surface summary limiter before permission and rebuild work',
  );
  assertNotIncludes(surfaceSummaryRebuild, "secureError('[Answerlattice Product Surfaces] Failed to rebuild context summary'", 'Answerlattice product-surface summary raw secureError');
  assertNotIncludes(surfaceSummaryRebuild, 'reason: z.string().trim().max(80)', 'Answerlattice product-surface summary arbitrary reason text');

  assertIncludes(tenantSummary, 'const TENANT_SUMMARY_SYNC_MAX_BODY_BYTES = 2 * 1024;', 'Answerlattice tenant-summary sync body cap');
  assertIncludes(tenantSummary, 'readBoundedJsonBody(request, TENANT_SUMMARY_SYNC_MAX_BODY_BYTES', 'Answerlattice tenant-summary bounded body');
  assertIncludes(tenantSummary, 'hashPublicRateLimitValue(session?.user?.id || session?.user?.email || \'unknown\')', 'Answerlattice tenant-summary hashed rate-limit identity');
  assertIncludes(tenantSummary, "logRuntimeFailure('answerlattice_tenant_summary_sync_failed'", 'Answerlattice tenant-summary bounded diagnostics');
  assertIncludes(tenantSummary, "getBoundedRuntimeStringContext('tenantId', parsed.data.tId)", 'Answerlattice tenant-summary bounded tenant metadata');
  assertIncludes(tenantSummary, "getBoundedRuntimeStringContext('storeId', parsed.data.sId)", 'Answerlattice tenant-summary bounded store metadata');
  assertIncludes(tenantSummary, "getBoundedRuntimeStringContext('source', parsed.data.source)", 'Answerlattice tenant-summary bounded source metadata');
  assertIncludes(tenantSummaryClient, 'ANSWERLATTICE_TENANT_SUMMARY_REQUEST_POLICY', 'Answerlattice tenant-summary client shared request policy');
  assertIncludes(tenantSummaryClient, 'ANSWERLATTICE_TENANT_SUMMARY_RESPONSE_JSON_MAX_BYTES', 'Answerlattice tenant-summary client response cap');
  assertIncludes(tenantSummaryClient, "cache: 'no-store'", 'Answerlattice tenant-summary client bypasses browser cache');
  assertIncludes(tenantSummaryClient, "credentials: 'same-origin'", 'Answerlattice tenant-summary client keeps credentials same-origin');
  assertIncludes(tenantSummaryClient, "redirect: 'manual'", 'Answerlattice tenant-summary client does not follow redirects');
  assertIncludes(tenantSummaryClient, 'readJsonResponseWithLimit<unknown>', 'Answerlattice tenant-summary client bounded response parser');
  assertIncludes(tenantSummaryClient, 'isTenantSummarySyncResponse', 'Answerlattice tenant-summary client response guard');
  assertIncludes(tenantSummaryClient, 'answerlattice_tenant_summary_client_response_parse_failed', 'Answerlattice tenant-summary client parse diagnostic');
  assertIncludes(tenantSummaryClient, 'answerlattice_tenant_summary_client_response_rejected', 'Answerlattice tenant-summary client rejected diagnostic');
  assertIncludes(tenantSummaryClient, 'answerlattice_tenant_summary_client_response_invalid', 'Answerlattice tenant-summary client invalid diagnostic');
  assertIncludes(tenantSummaryClient, '...ANSWERLATTICE_TENANT_SUMMARY_REQUEST_POLICY', 'Answerlattice tenant-summary client applies shared request policy');
  assertOrder(
    tenantSummary,
    [
      'readBoundedJsonBody(request, TENANT_SUMMARY_SYNC_MAX_BODY_BYTES',
      'TenantSummarySyncSchema.safeParse(bodyResult.data)',
      'const scope = getSessionScope(session)',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE)',
      'upsertAnswerlatticeTenantSummaryAdmin({',
    ],
    'Answerlattice tenant-summary limiter before permission and sync write',
  );
  assertNotIncludes(tenantSummary, "secureError('[Answerlattice Tenant Summary] Sync failed'", 'Answerlattice tenant-summary raw secureError');
  assertNotIncludes(tenantSummary, "String(session?.user?.id || session?.user?.email || 'unknown')", 'Answerlattice tenant-summary raw rate-limit identity');
  assertNotIncludes(tenantSummaryClient, 'Answerlattice tenant summary sync failed: ${response.status}', 'Answerlattice tenant-summary client raw status throw');
  assertNotIncludes(tenantSummaryClient, 'if (!response.ok) {\\n        throw new Error', 'Answerlattice tenant-summary client status-only acknowledgement');
}

function verifyAnswerlatticeSettingsRouteGuards() {
  const workspaceProfile = read('src/app/api/answerlattice/workspace-profile/route.ts');
  const widgetConfig = read('src/app/api/answerlattice/widget-config/route.ts');
  const integrations = read('src/app/api/answerlattice/integrations/route.ts');
  const hostedHelp = read('src/app/api/answerlattice/hosted-help-settings/route.ts');

  assertIncludes(workspaceProfile, "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'workspace-profile')", 'Answerlattice workspace profile read limiter');
  assertIncludes(workspaceProfile, "logRuntimeFailure('answerlattice_workspace_profile_load_failed'", 'Answerlattice workspace profile load bounded diagnostics');
  assertIncludes(workspaceProfile, "logRuntimeFailure('answerlattice_workspace_profile_tenant_summary_sync_failed'", 'Answerlattice workspace profile tenant-summary bounded diagnostics');
  assertIncludes(workspaceProfile, "logRuntimeFailure('answerlattice_workspace_profile_compiled_context_stale_mark_failed'", 'Answerlattice workspace profile compiled-context bounded diagnostics');
  assertIncludes(workspaceProfile, "logRuntimeFailure('answerlattice_workspace_profile_save_failed'", 'Answerlattice workspace profile save bounded diagnostics');
  assertOrder(
    workspaceProfile,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'workspace-profile')",
      'requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE)',
      'const scope = resolveSessionScope(session)',
      'const db = getAnswerlatticeDb()',
      'db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get()',
    ],
    'Answerlattice workspace profile read limiter before permission and store read',
  );
  assertNotIncludes(workspaceProfile, "secureError('[Answerlattice Workspace Profile]", 'Answerlattice workspace profile raw secureError');

  assertIncludes(widgetConfig, "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'widget-config')", 'Answerlattice widget config read limiter');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_settings_load_failed'", 'Answerlattice widget config load bounded diagnostics');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_compiled_context_stale_mark_failed'", 'Answerlattice widget config compiled-context bounded diagnostics');
  assertIncludes(widgetConfig, "logRuntimeFailure('answerlattice_widget_config_settings_save_failed'", 'Answerlattice widget config save bounded diagnostics');
  assertOrder(
    widgetConfig,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'widget-config')",
      'requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'const scope = resolveSessionScope(session)',
      'const db = getAnswerlatticeDb()',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId))',
    ],
    'Answerlattice widget config read limiter before permission and store read',
  );
  assertNotIncludes(widgetConfig, "secureError('[Answerlattice Widget Config]", 'Answerlattice widget config raw secureError');

  assertIncludes(integrations, "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'integrations')", 'Answerlattice integrations read limiter');
  assertIncludes(integrations, 'ownerSafeIntegrationError(adapters.slack?.lastError)', 'Answerlattice integrations safe Slack health error');
  assertIncludes(integrations, 'ownerSafeIntegrationError(adapters.email?.lastError)', 'Answerlattice integrations safe email health error');
  assertIncludes(integrations, "logRuntimeFailure('answerlattice_integrations_settings_load_failed'", 'Answerlattice integrations load bounded diagnostics');
  assertIncludes(integrations, "logRuntimeFailure('answerlattice_integrations_settings_save_failed'", 'Answerlattice integrations save bounded diagnostics');
  assertOrder(
    integrations,
    [
      'ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS',
      "applyAnswerlatticeDashboardReadRateLimit(_request, session, 'integrations')",
      'requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS)',
      'const scope = resolveSessionScope(session)',
      'const db = getAnswerlatticeDb()',
      'const [configSnap, healthSnap] = await Promise.all([',
    ],
    'Answerlattice integrations read limiter before permission and platformSummary reads',
  );
  assertNotIncludes(integrations, "lastError: typeof adapters.slack?.lastError === 'string' ? adapters.slack.lastError : null", 'Answerlattice integrations raw Slack health error');
  assertNotIncludes(integrations, "lastError: typeof adapters.email?.lastError === 'string' ? adapters.email.lastError : null", 'Answerlattice integrations raw email health error');
  assertNotIncludes(integrations, "secureError('[Answerlattice Integrations]", 'Answerlattice integrations raw secureError');

  assertIncludes(hostedHelp, "applyAnswerlatticeDashboardReadRateLimit(request, session, 'hosted-help-settings')", 'Answerlattice hosted help read limiter');
  assertIncludes(hostedHelp, "logRuntimeFailure('answerlattice_hosted_help_settings_load_failed'", 'Answerlattice hosted help load bounded diagnostics');
  assertIncludes(hostedHelp, "logRuntimeFailure('answerlattice_hosted_help_domain_add_failed'", 'Answerlattice hosted help provider-add bounded diagnostics');
  assertIncludes(hostedHelp, "logRuntimeFailure('answerlattice_hosted_help_registry_delete_scope_mismatch'", 'Answerlattice hosted help registry mismatch bounded diagnostics');
  assertIncludes(hostedHelp, "logRuntimeFailure('answerlattice_hosted_help_domain_removal_failed'", 'Answerlattice hosted help removal bounded diagnostics');
  assertIncludes(hostedHelp, "logRuntimeFailure('answerlattice_hosted_help_settings_save_failed'", 'Answerlattice hosted help save bounded diagnostics');
  assertIncludes(hostedHelp, "...getHostedHelpProviderErrorContext(addResult.data)", 'Answerlattice hosted help flattened provider diagnostics');
  assertIncludes(hostedHelp, "getBoundedRuntimeStringContext('domain', normalized)", 'Answerlattice hosted help bounded registry domain metadata');
  assertIncludes(hostedHelp, "getBoundedRuntimeStringContext('domain', domain)", 'Answerlattice hosted help bounded removal domain metadata');
  assertOrder(
    hostedHelp,
    [
      'ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER',
      "applyAnswerlatticeDashboardReadRateLimit(request, session, 'hosted-help-settings')",
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'const scope = resolveSessionScope(session)',
      'const db = getAnswerlatticeDb()',
      'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get()',
    ],
    'Answerlattice hosted help read limiter before permission and store read',
  );
  assertNotIncludes(hostedHelp, "secureError('[Answerlattice Hosted Help]", 'Answerlattice hosted help raw secureError');
  assertNotIncludes(hostedHelp, 'provider: getHostedHelpProviderErrorContext(addResult.data)', 'Answerlattice hosted help nested provider diagnostic object');
}

function verifyAnswerlatticePaidPlanPackaging() {
  const plans = read('src/data/answerlattice/plans.ts');
  const billingPlans = read('src/lib/billing/productBillingPlans.ts');
  const billingServer = read('src/lib/billing/productBillingServer.ts');
  const onboard = read('src/app/api/answerlattice/onboard/route.ts');
  const onboardingForm = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
  const pricingPage = read('src/app/sites/answerlattice/pricing/page.tsx');
  const pricingPreview = read('src/app/sites/answerlattice/components/PricingPreviewSection.tsx');
  const settings = read('src/components/templates/answerlattice/AnswerlatticeSettings.tsx');
  const workspaceProfile = read('src/app/api/answerlattice/workspace-profile/route.ts');
  const activationSummary = read('src/lib/answerlattice/activationSummary.ts');

  assertIncludes(plans, 'Starter, Growth, Studio only. Active packaging has no zero-price tier.', 'Answerlattice plans paid packaging note');
  assertNotIncludes(plans, 'answerlattice_beta', 'Answerlattice active plan list');
  assertNotIncludes(plans, 'price: 0', 'Answerlattice active plan prices');
  assertIncludes(billingPlans, '.filter((plan) => plan.priceINR.price > 0 || plan.priceUSD.price > 0)', 'Answerlattice billing plan paid filter');
  assertNotIncludes(billingPlans, 'answerlattice_beta', 'Answerlattice billing plan tier order');
  assertIncludes(billingServer, 'isBeta: false', 'Answerlattice billing entitlement summary does not preserve beta plan state');
  assertNotIncludes(billingServer, 'answerlattice_beta', 'Answerlattice billing server active plan recognition');
  assertIncludes(activationSummary, 'Paid subscription is recorded for this workspace.', 'Answerlattice activation paid license copy');
  assertNotIncludes(activationSummary, 'beta license', 'Answerlattice activation beta license copy');

  assertIncludes(onboard, "const BillingModelSchema = z.enum(['subscription', 'usage', 'one_time', 'not_sure']);", 'Answerlattice onboarding paid billing model schema');
  assertIncludes(onboard, "planId: z.string().trim().max(80).optional().default('answerlattice_starter')", 'Answerlattice onboarding defaults to Starter');
  assertIncludes(onboard, "return NextResponse.json({ error: 'Paid plan is required.' }, { status: 400 });", 'Answerlattice onboarding rejects zero-price plans');
  assertIncludes(onboard, 'getOrCreateRazorpayPlan', 'Answerlattice onboarding creates Razorpay plan');
  assertIncludes(onboard, 'razorpayClient.subscriptions.create', 'Answerlattice onboarding creates Razorpay subscription');
  assertNotIncludes(onboard, 'getAnswerlatticeBetaPlan', 'Answerlattice onboarding beta plan helper');
  assertNotIncludes(onboard, 'answerlattice_beta', 'Answerlattice onboarding beta plan id');
  assertNotIncludes(onboard, "'free'", 'Answerlattice onboarding free billing model');

  assertIncludes(onboardingForm, "planId: 'answerlattice_starter'", 'Answerlattice public onboarding form starts on Starter');
  assertIncludes(onboardingForm, 'Complete payment to activate the paid plan.', 'Answerlattice public onboarding paid activation copy');
  assertIncludes(onboardingForm, 'ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES = 16 * 1024', 'Answerlattice public onboarding client response cap');
  assertIncludes(onboardingForm, 'readJsonResponseWithLimit<unknown>', 'Answerlattice public onboarding client bounded response parser');
  assertIncludes(onboardingForm, 'isOnboardResult(data)', 'Answerlattice public onboarding client response shape guard');
  assertIncludes(onboardingForm, "cache: 'no-store'", 'Answerlattice public onboarding client no-store request');
  assertIncludes(onboardingForm, "credentials: 'same-origin'", 'Answerlattice public onboarding client same-origin credentials');
  assertIncludes(onboardingForm, "redirect: 'manual'", 'Answerlattice public onboarding client redirect boundary');
  assertIncludes(onboardingForm, "logRuntimeFailure('answerlattice_onboard_response_parse_failed'", 'Answerlattice public onboarding client parse diagnostics');
  assertIncludes(onboardingForm, "logRuntimeFailure('answerlattice_onboard_response_invalid'", 'Answerlattice public onboarding client invalid response diagnostics');
  assertIncludes(onboardingForm, 'companyNameLength: trimmedCompanyName.length', 'Answerlattice public onboarding client bounded company metadata');
  assertIncludes(onboardingForm, 'primarySurfaceCount: primarySurfaces.length', 'Answerlattice public onboarding client bounded surface metadata');
  assertNotIncludes(onboardingForm, 'value="free"', 'Answerlattice public onboarding free billing option');
  assertNotIncludes(onboardingForm, 'No paid plan yet', 'Answerlattice public onboarding no paid plan copy');
  assertNotIncludes(onboardingForm, 'res.json().catch(() => null)', 'Answerlattice public onboarding direct JSON fallback');
  assertNotIncludes(onboardingForm, 'response.text()', 'Answerlattice public onboarding response text read');

  assertIncludes(pricingPage, 'Choose a paid plan', 'Answerlattice pricing paid hero copy');
  assertIncludes(pricingPage, 'Paid setup', 'Answerlattice pricing paid setup copy');
  assertNotIncludes(pricingPage, 'beta setup', 'Answerlattice pricing beta setup copy');
  assertIncludes(pricingPreview, '.filter((plan) => plan.billingInterval ===', 'Answerlattice pricing preview monthly paid plan selection');
  assertNotIncludes(pricingPreview, 'answerlattice_beta', 'Answerlattice pricing preview beta plan filter');

  assertIncludes(settings, "{ value: 'subscription', label: 'Subscription' }", 'Answerlattice settings subscription billing option');
  assertNotIncludes(settings, "{ value: 'free'", 'Answerlattice settings free billing option');
  assertIncludes(workspaceProfile, "const WORKSPACE_BILLING_MODEL_VALUES = ['subscription', 'usage', 'one_time', 'not_sure'] as const;", 'Answerlattice workspace profile paid billing whitelist');
  assertNotIncludes(workspaceProfile, "billingModel: storeData.billingModel === 'free'", 'Answerlattice workspace profile free billing normalization');
}

function verifyAnswerlatticeTransactionsDiagnostics() {
  const transactions = read('src/components/templates/answerlattice/billing/AnswerlatticeTransactions.tsx');
  const billingReadme = read('__docs__/answerlattice/billing/README.md');
  const billingImpl = read('__docs__/answerlattice/billing/answerlattice-billing_impl.md');
  const billingFirebase = read('__docs__/answerlattice/billing/answerlattice-billing_firebase.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const boundaryLabel = 'Answerlattice transactions raw load-reason diagnostics boundary';

  assertIncludes(transactions, "import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';", 'Answerlattice transactions uses bounded runtime diagnostics');
  assertIncludes(transactions, "const ANSWERLATTICE_BILLING_HISTORY_LOAD_FAILED = 'answerlattice_billing_history_load_failed';", 'Answerlattice transactions billing-history failure code');
  assertIncludes(transactions, "const ANSWERLATTICE_SUPPORT_CREDIT_USAGE_LOAD_FAILED = 'answerlattice_support_credit_usage_load_failed';", 'Answerlattice transactions support-credit usage failure code');
  assertIncludes(transactions, "const ANSWERLATTICE_SUPPORT_CREDIT_USAGE_MORE_LOAD_FAILED = 'answerlattice_support_credit_usage_more_load_failed';", 'Answerlattice transactions load-more failure code');
  assertIncludes(transactions, "getBoundedRuntimeStringContext('tenantId', scope?.tenantId)", 'Answerlattice transactions bounded tenant metadata');
  assertIncludes(transactions, "getBoundedRuntimeStringContext('storeId', scope?.storeId)", 'Answerlattice transactions bounded store metadata');
  assertIncludes(transactions, 'logRuntimeFailure(ANSWERLATTICE_BILLING_HISTORY_LOAD_FAILED, billingResult.reason', 'Answerlattice transactions billing-history bounded failure log');
  assertIncludes(transactions, 'logRuntimeFailure(ANSWERLATTICE_SUPPORT_CREDIT_USAGE_LOAD_FAILED, aiOperationsResult.reason', 'Answerlattice transactions support-credit bounded failure log');
  assertIncludes(transactions, 'logRuntimeFailure(ANSWERLATTICE_SUPPORT_CREDIT_USAGE_MORE_LOAD_FAILED, error', 'Answerlattice transactions load-more bounded failure log');
  assertNotIncludes(transactions, "import { logger } from '@lib/monitoring/logger';", 'Answerlattice transactions raw logger import');
  assertNotIncludes(transactions, "logger.error('Failed to load Answerlattice billing history', billingResult.reason);", 'Answerlattice transactions raw billing-history reason log');
  assertNotIncludes(transactions, "logger.error('Failed to load Answerlattice support credit usage', aiOperationsResult.reason);", 'Answerlattice transactions raw support-credit reason log');
  assertNotIncludes(transactions, "logger.error('Failed to load more Answerlattice AI operations', error);", 'Answerlattice transactions raw load-more error log');

  [billingReadme, billingImpl, billingFirebase, changelog, productionAudit].forEach((content, index) => {
    assertIncludes(content, boundaryLabel, `Answerlattice transactions diagnostics boundary docs ${index + 1}`);
  });
}

function verifyAnswerlatticeWebsiteAnalyticsUrlBoundary() {
  const analytics = read('src/app/sites/answerlattice/components/AnswerlatticeAnalytics.tsx');
  const resourceAnalytics = read('src/app/sites/answerlattice/components/AnswerlatticeResourceAnalytics.tsx');
  const analyticsUtils = read('src/app/sites/answerlattice/components/answerlatticeAnalyticsUtils.ts');
  const websiteReadme = read('__docs__/answerlattice/answerlattice-website/README.md');
  const websiteSpec = read('__docs__/answerlattice/answerlattice-website/answerlattice-website_spec.md');
  const websiteImpl = read('__docs__/answerlattice/answerlattice-website/answerlattice-website_impl.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const boundaryLabel = 'Answerlattice website analytics URL minimization boundary';

  [
    'ANSWERLATTICE_GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/',
    'RAW_ANSWERLATTICE_GA_MEASUREMENT_ID',
    'ANSWERLATTICE_GA_MEASUREMENT_ID_PATTERN.test',
    'cleanAnswerlatticeAnalyticsString',
    'getAnswerlatticeAnalyticsPagePath',
    'getAnswerlatticeAnalyticsUrl',
    'link_url: target instanceof HTMLAnchorElement ? getAnswerlatticeAnalyticsUrl(target.href) : undefined',
    'getAnswerlatticeAnalyticsPageLocation',
    "return url.origin + (url.pathname || '/')",
  ].forEach((token) => assertIncludes(analytics, token, 'Answerlattice website analytics page-view/click URL boundary'));

  [
    'ANSWERLATTICE_ANALYTICS_TEXT_MAX_LENGTH = 160',
    'ANSWERLATTICE_ANALYTICS_URL_MAX_LENGTH = 240',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    "if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;",
    "`${url.origin}${url.pathname || '/'}`",
  ].forEach((token) => assertIncludes(analyticsUtils, token, 'Answerlattice website analytics shared sanitizer'));

  [
    'cleanAnswerlatticeAnalyticsString',
    'getAnswerlatticeAnalyticsPagePath',
    'getAnswerlatticeAnalyticsUrl',
    'return cleanAnswerlatticeAnalyticsString(new URLSearchParams(window.location.search).get(name), 80);',
    'getAnswerlatticeAnalyticsPagePath()',
    'referrer: getAnswerlatticeAnalyticsUrl(document.referrer)',
    'target_url: getAnswerlatticeAnalyticsUrl(window.location.href)',
    'utm_medium: getQueryParam(\'utm_medium\')',
    'utm_source: getQueryParam(\'utm_source\')',
  ].forEach((token) => assertIncludes(resourceAnalytics, token, 'Answerlattice resource analytics URL boundary'));

  [
    'page_location: window.location.href',
    'link_url: target instanceof HTMLAnchorElement ? target.href : undefined',
  ].forEach((token) => assertNotIncludes(analytics, token, 'Answerlattice website analytics raw URL boundary'));

  [
    'target_url: window.location.href',
    'referrer: document.referrer || undefined',
    '`${window.location.pathname}${window.location.search}`',
  ].forEach((token) => assertNotIncludes(resourceAnalytics, token, 'Answerlattice resource analytics raw URL boundary'));

  [websiteReadme, websiteSpec, websiteImpl, changelog, productionAudit].forEach((content, index) => {
    assertIncludes(content, boundaryLabel, `Answerlattice website analytics URL boundary docs ${index + 1}`);
  });
}

function verifyAnswerlatticeProtectedActionRouteGuards() {
  const widgetKey = read('src/app/api/answerlattice/widget-key/route.ts');
  const widgetAgentPacket = read('src/app/api/answerlattice/widget-agent-packet/route.ts');
  const widgetAgentKit = read('src/app/api/answerlattice/widget-agent-kit/route.ts');
  const notificationTest = read('src/app/api/answerlattice/notifications/test/route.ts');
  const integrationTest = read('src/app/api/answerlattice/integrations/test/route.ts');

  assertIncludes(widgetKey, 'const WIDGET_KEY_ACTION_MAX_BODY_BYTES = 4 * 1024;', 'Answerlattice widget-key action body cap');
  assertIncludes(widgetKey, 'readBoundedJsonBody(request, WIDGET_KEY_ACTION_MAX_BODY_BYTES', 'Answerlattice widget-key bounded body');
  assertIncludes(widgetKey, 'RequestSchema.safeParse(bodyResult.data)', 'Answerlattice widget-key bounded validation');
  assertIncludes(widgetKey, "logRuntimeFailure('answerlattice_widget_key_manage_failed'", 'Answerlattice widget-key bounded diagnostics');
  assertIncludes(widgetKey, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice widget-key bounded tenant metadata');
  assertIncludes(widgetKey, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice widget-key bounded store metadata');
  assertIncludes(widgetKey, "getBoundedRuntimeStringContext('userId', userIdForLog)", 'Answerlattice widget-key bounded user metadata');
  assertIncludes(widgetKey, "getBoundedRuntimeStringContext('action', actionForLog)", 'Answerlattice widget-key bounded action metadata');
  assertIncludes(widgetKey, "getBoundedRuntimeStringContext('keyId', keyIdForLog)", 'Answerlattice widget-key bounded key metadata');
  assertOrder(
    widgetKey,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'const db = getAnswerlatticeDb()',
      'readBoundedJsonBody(request, WIDGET_KEY_ACTION_MAX_BODY_BYTES',
      'RequestSchema.safeParse(bodyResult.data)',
      'const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId))',
    ],
    'Answerlattice widget-key limiter before permission, body parsing, and store read',
  );
  assertNotIncludes(widgetKey, 'request.json()', 'Answerlattice widget-key raw JSON parser');
  assertNotIncludes(widgetKey, "secureError('[Answerlattice Widget] Failed to manage key'", 'Answerlattice widget-key raw secureError');

  assertIncludes(widgetAgentPacket, "logRuntimeFailure('answerlattice_widget_agent_packet_failed'", 'Answerlattice widget agent packet bounded diagnostics');
  assertIncludes(widgetAgentPacket, "getBoundedRuntimeStringContext('tenantId', scope.tenantId)", 'Answerlattice widget agent packet bounded tenant metadata');
  assertIncludes(widgetAgentPacket, "getBoundedRuntimeStringContext('storeId', scope.storeId)", 'Answerlattice widget agent packet bounded store metadata');
  assertOrder(
    widgetAgentPacket,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'const db = getAnswerlatticeDb()',
      'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get()',
    ],
    'Answerlattice widget agent packet limiter before permission and store read',
  );
  assertNotIncludes(widgetAgentPacket, "secureError('[Answerlattice Widget Agent Packet] Failed to build packet'", 'Answerlattice widget agent packet raw secureError');

  assertIncludes(widgetAgentKit, "logRuntimeFailure('answerlattice_widget_agent_kit_failed'", 'Answerlattice widget agent kit bounded diagnostics');
  assertIncludes(widgetAgentKit, "getBoundedRuntimeStringContext('tenantId', scope.tenantId)", 'Answerlattice widget agent kit bounded tenant metadata');
  assertIncludes(widgetAgentKit, "getBoundedRuntimeStringContext('storeId', scope.storeId)", 'Answerlattice widget agent kit bounded store metadata');
  assertOrder(
    widgetAgentKit,
    [
      'ENABLE_ANSWERLATTICE_WIDGET',
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET)',
      'const db = getAnswerlatticeDb()',
      'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get()',
    ],
    'Answerlattice widget agent kit limiter before permission and store read',
  );
  assertNotIncludes(widgetAgentKit, "secureError('[Answerlattice Widget Agent Kit] Failed to build kit'", 'Answerlattice widget agent kit raw secureError');

  assertIncludes(notificationTest, "logRuntimeFailure('answerlattice_notification_test_failed'", 'Answerlattice notification test bounded diagnostics');
  assertIncludes(notificationTest, "getBoundedRuntimeStringContext('tenantId', scope.tenantId)", 'Answerlattice notification test bounded tenant metadata');
  assertIncludes(notificationTest, "getBoundedRuntimeStringContext('storeId', scope.storeId)", 'Answerlattice notification test bounded store metadata');
  assertOrder(
    notificationTest,
    [
      'const scope = resolveSessionScope(session)',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS)',
      'const db = getAnswerlatticeDb()',
      'const readiness = getNotificationReadiness(PRODUCT_IDS.ANSWERLATTICE)',
      'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get()',
      'const sent = await sendNotification({',
    ],
    'Answerlattice notification test limiter before permission, readiness, store read, and send',
  );
  assertNotIncludes(notificationTest, "secureError('[Answerlattice Notifications] Test email failed'", 'Answerlattice notification test raw secureError');

  assertIncludes(integrationTest, "logRuntimeFailure('answerlattice_integration_test_queue_failed'", 'Answerlattice integration test bounded diagnostics');
  assertIncludes(integrationTest, "getBoundedRuntimeStringContext('tenantId', scope.tenantId)", 'Answerlattice integration test bounded tenant metadata');
  assertIncludes(integrationTest, "getBoundedRuntimeStringContext('storeId', scope.storeId)", 'Answerlattice integration test bounded store metadata');
  assertOrder(
    integrationTest,
    [
      'ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS',
      'const scope = resolveSessionScope(session)',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS)',
      'const db = getAnswerlatticeDb()',
      'collection(DB_COLLECTIONS.PLATFORM_SUMMARY)',
      'db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).add({',
    ],
    'Answerlattice integration test limiter before permission, config read, and event write',
  );
  assertNotIncludes(integrationTest, "secureError('[Answerlattice Integrations] Failed to queue test notification'", 'Answerlattice integration test raw secureError');
}

function verifyAnswerlatticeOnboardRouteGuards() {
  const onboard = read('src/app/api/answerlattice/onboard/route.ts');
  const onboardingUserIdBoundary = read('src/lib/answerlattice/onboardingUserIdBoundary.ts');
  const billingImpl = read('__docs__/answerlattice/billing/answerlattice-billing_impl.md');
  const billingFirebase = read('__docs__/answerlattice/billing/answerlattice-billing_firebase.md');
  const websiteImpl = read('__docs__/answerlattice/answerlattice-website/answerlattice-website_impl.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(onboardingUserIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice onboarding user ID boundary imports shared Firestore document ID guard');
  assertIncludes(onboardingUserIdBoundary, 'export function normalizeAnswerlatticeOnboardingUserId(value: unknown): string | null', 'Answerlattice onboarding user ID normalizer');
  assertIncludes(onboardingUserIdBoundary, 'isValidFirestoreDocumentId(userId)', 'Answerlattice onboarding user ID uses Firestore document ID guard');
  assertIncludes(onboardingUserIdBoundary, 'export function requireAnswerlatticeOnboardingUserId(value: unknown): string', 'Answerlattice onboarding user ID require helper');
  assertIncludes(onboard, "import { requireAnswerlatticeOnboardingUserId } from '@lib/answerlattice/onboardingUserIdBoundary';", 'Answerlattice onboarding user ID boundary import');
  assertIncludes(onboard, 'export const POST = withAuth(', 'Answerlattice onboarding auth guard');
  assertIncludes(onboard, 'const ANSWERLATTICE_ONBOARD_MAX_BODY_BYTES = 32 * 1024;', 'Answerlattice onboarding body cap');
  assertIncludes(onboard, 'readBoundedJsonBody(request, ANSWERLATTICE_ONBOARD_MAX_BODY_BYTES', 'Answerlattice onboarding bounded body');
  assertIncludes(onboard, 'OnboardRequestSchema.safeParse(bodyResult.data)', 'Answerlattice onboarding bounded validation');
  assertIncludes(onboard, 'const rawUserId = session.user.id;', 'Answerlattice onboarding raw session user capture');
  assertIncludes(onboard, 'const userId = requireAnswerlatticeOnboardingUserId(rawUserId);', 'Answerlattice onboarding session user ID normalization');
  assert(
    (onboard.match(/const userId = requireAnswerlatticeOnboardingUserId\(params\.userId\);/g) || []).length >= 2,
    'Answerlattice onboarding helper paths must re-normalize params.userId before writes',
  );
  assertIncludes(onboard, '.doc(userId)', 'Answerlattice onboarding normalized user document refs');
  assertIncludes(onboard, "logRuntimeFailure('answerlattice_onboard_initial_surface_bootstrap_failed'", 'Answerlattice onboarding surface bootstrap bounded diagnostics');
  assertIncludes(onboard, "logRuntimeFailure('answerlattice_onboard_tenant_summary_sync_failed'", 'Answerlattice onboarding tenant summary bounded diagnostics');
  assertIncludes(onboard, "logRuntimeFailure('answerlattice_onboard_context_control_plane_init_failed'", 'Answerlattice onboarding compiled context bounded diagnostics');
  assertIncludes(onboard, "logRuntimeFailure('answerlattice_onboard_failed'", 'Answerlattice onboarding route bounded diagnostics');
  assertIncludes(onboard, "getBoundedRuntimeStringContext('tenantId', result.tenantId)", 'Answerlattice onboarding bounded side-effect tenant metadata');
  assertIncludes(onboard, "getBoundedRuntimeStringContext('storeId', result.storeId)", 'Answerlattice onboarding bounded side-effect store metadata');
  assertIncludes(onboard, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice onboarding bounded route tenant metadata');
  assertIncludes(onboard, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice onboarding bounded route store metadata');
  assertIncludes(onboard, "getBoundedRuntimeStringContext('userId', userIdForLog)", 'Answerlattice onboarding bounded user metadata');
  assertIncludes(onboard, "failureCode: 'answerlattice_onboard_failed'", 'Answerlattice onboarding fixed persisted failure code');
  assertOrder(
    onboard,
    [
      'const userId = requireAnswerlatticeOnboardingUserId(rawUserId);',
      'ENABLE_ANSWERLATTICE_WIDGET',
      "const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING')",
      'const rateLimitResult = await checkRateLimit({',
      'const db = getAnswerlatticeDb()',
      'const existingAnswerlatticeUser = await getAnswerlatticeUserByEmail(db, session.user.email)',
      'readBoundedJsonBody(request, ANSWERLATTICE_ONBOARD_MAX_BODY_BYTES',
      'OnboardRequestSchema.safeParse(bodyResult.data)',
      'await writeLogEntry({',
      'const result = await db.runTransaction',
    ],
    'Answerlattice onboarding limiter before account lookup, body parsing, and durable writes',
  );
  assertNotIncludes(onboard, '.doc(params.userId)', 'Answerlattice onboarding raw params user document ref');
  assertNotIncludes(onboard, 'request.json()', 'Answerlattice onboarding raw JSON parser');
  assertNotIncludes(onboard, "secureError('[Answerlattice Onboard]", 'Answerlattice onboarding raw secureError');
  assertNotIncludes(onboard, 'error: (error as Error).message', 'Answerlattice onboarding raw persisted exception text');
  [
    ['billing implementation docs', billingImpl],
    ['billing Firebase docs', billingFirebase],
    ['website implementation docs', websiteImpl],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice onboarding user ID boundary', `Answerlattice onboarding user ID boundary documented in ${label}`);
  });
}

function verifyNotificationSendAdmission() {
  const route = read('src/app/api/notifications/send/route.ts');

  assertIncludes(route, 'withAuth', 'Answerlattice notification send auth');
  assertIncludes(route, 'const NOTIFICATION_SEND_MAX_BODY_BYTES = 16 * 1024;', 'Answerlattice notification send body cap');
  assertIncludes(route, 'readBoundedJsonBody(request, NOTIFICATION_SEND_MAX_BODY_BYTES', 'Answerlattice notification send bounded body');
  assertIncludes(route, 'NotificationRequestSchema.safeParse(bodyResult.data)', 'Answerlattice notification send schema validation');
  assertIncludes(route, 'productId !== PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice notification send product guard');
  assertIncludes(route, 'metadataSize > 8 * 1024', 'Answerlattice notification send metadata cap');
  assertIncludes(route, 'sendNotification({', 'Answerlattice notification send dispatcher');
  assertIncludes(route, 'logNotificationFailure(\'notification_send_route_failed\'', 'Answerlattice notification send route bounded diagnostics');
  assertIncludes(route, 'getNotificationPayloadLogContext(parsed.data)', 'Answerlattice notification send route bounded payload context');
  assertIncludes(route, 'getBoundedNotificationStringContext(\'userId\', userId)', 'Answerlattice notification send route bounded user context');
  assertNotIncludes(route, 'request.json()', 'Answerlattice notification send raw JSON parser');
  assertNotIncludes(route, "secureError('[Notification API] Error'", 'Answerlattice notification send route raw secureError');
  assertOrder(
    route,
    [
      'const rateLimitResult = await checkRateLimit({',
      'readBoundedJsonBody(request, NOTIFICATION_SEND_MAX_BODY_BYTES',
      'NotificationRequestSchema.safeParse(bodyResult.data)',
      'metadataSize > 8 * 1024',
      'sendNotification({',
    ],
    'Answerlattice notification send request admission order',
  );
}

function verifyNotificationDiagnostics() {
  const notificationSender = read('src/lib/notifications/index.ts');
  const notificationClient = read('src/lib/notifications/client.ts');
  const diagnostics = read('src/lib/notifications/notificationDiagnostics.ts');

  assertNoDirectConsole(notificationSender, 'Answerlattice notification sender');
  assertNoDirectConsole(notificationClient, 'Answerlattice notification client trigger');
  assertNoDirectConsole(diagnostics, 'Answerlattice notification diagnostics helper');
  assertIncludes(diagnostics, "secureError('[Notification] Operation failed'", 'Answerlattice notification diagnostics secure logging');
  assertIncludes(diagnostics, 'getBoundedNotificationStringContext', 'Answerlattice notification diagnostics bounded string context');
  assertIncludes(diagnostics, 'getNotificationPayloadLogContext', 'Answerlattice notification diagnostics bounded payload context');
  assertIncludes(diagnostics, "getBoundedNotificationStringContext('recipientEmail', payload.recipientEmail)", 'Answerlattice notification diagnostics recipient email length only');
  assertIncludes(diagnostics, "getBoundedNotificationStringContext('referenceId', payload.referenceId)", 'Answerlattice notification diagnostics reference length only');
  assertIncludes(notificationSender, 'notification_template_not_found', 'Answerlattice notification missing-template diagnostics');
  assertIncludes(notificationSender, 'notification_send_failed', 'Answerlattice notification send failure diagnostics');
  assertIncludes(notificationSender, "getBoundedNotificationStringContext('recipientEmail', recipientEmail)", 'Answerlattice notification rate-limit bounded recipient context');
  assertIncludes(notificationSender, "getBoundedNotificationStringContext('referenceId', referenceId)", 'Answerlattice notification success bounded reference context');
  assertIncludes(notificationClient, 'notification_trigger_request_failed', 'Answerlattice notification trigger failure diagnostics');
  assertNotIncludes(notificationSender, 'No template for event:', 'Answerlattice notification raw missing-template diagnostic');
  assertNotIncludes(notificationSender, "console.warn('[Notification] Send failed:'", 'Answerlattice notification raw send diagnostic');
  assertNotIncludes(notificationSender, '{ recipientEmail }', 'Answerlattice notification raw recipient logging');
  assertNotIncludes(notificationClient, 'Trigger request failed', 'Answerlattice notification raw trigger diagnostic');
}

function verifyProtectedAiRequestAdmission() {
  const entityExtraction = read('src/app/api/answerlattice/articles/extract-entities/route.ts');
  const faqGeneration = read('src/app/api/answerlattice/faqs/generate-from-article/route.ts');
  const draftRegeneration = read('src/app/api/answerlattice/mutation-proposals/regenerate-draft/route.ts');
  const clientDraftGenerator = read('src/lib/answerlattice/draftGenerator.ts');
  const mutationProposalsDal = read('src/database/answerlattice/mutationProposals.ts');
  const knowledgeBaseArticles = read('src/database/knowledgeBase/articles.ts');
  const governanceIdBoundary = read('src/lib/answerlattice/governanceIdBoundary.ts');
  const kbArticleIdBoundary = read('src/lib/answerlattice/kbArticleIdBoundary.ts');
  const translation = read('src/app/api/answerlattice/translate/route.ts');
  const articleEmbedding = read('src/app/api/helpCenter/article-embedding/route.ts');
  const helpCenterSearch = read('src/app/api/helpCenter/search-kb/route.ts');
  const helpCenterFirebase = read('__docs__/answerlattice/help-center/help-center_firebase.md');
  const dataInventoryMap = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_data-map.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(entityExtraction, 'const ARTICLE_ENTITY_EXTRACTION_MAX_BODY_BYTES = 256 * 1024;', 'Answerlattice entity extraction body cap');
  assertIncludes(entityExtraction, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice entity extraction KB article ID boundary import');
  assertIncludes(entityExtraction, 'id: z.string().trim().max(160).refine((value) => normalizeAnswerlatticeKbArticleId(value) === value)', 'Answerlattice entity extraction KB article ID schema boundary');
  assertIncludes(entityExtraction, 'readBoundedJsonBody(request, ARTICLE_ENTITY_EXTRACTION_MAX_BODY_BYTES', 'Answerlattice entity extraction bounded body');
  assertIncludes(entityExtraction, 'ArticleSchema.safeParse(bodyResult.data)', 'Answerlattice entity extraction bounded validation');
  assertIncludes(entityExtraction, "logRuntimeFailure('answerlattice_article_entity_extraction_failed'", 'Answerlattice entity extraction bounded diagnostics');
  assertIncludes(entityExtraction, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice entity extraction bounded tenant metadata');
  assertIncludes(entityExtraction, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice entity extraction bounded store metadata');
  assertIncludes(entityExtraction, "getBoundedRuntimeStringContext('userId', userIdForLog)", 'Answerlattice entity extraction bounded user metadata');
  assertIncludes(entityExtraction, "getBoundedRuntimeStringContext('articleId', articleIdForLog)", 'Answerlattice entity extraction bounded article metadata');
  assertNotIncludes(entityExtraction, 'request.json()', 'Answerlattice entity extraction raw JSON parser');
  assertOrder(
    entityExtraction,
    [
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const safeModeResponse = await checkSafeMode()',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE)',
      'readBoundedJsonBody(request, ARTICLE_ENTITY_EXTRACTION_MAX_BODY_BYTES',
      'ArticleSchema.safeParse(bodyResult.data)',
      'const article = validation.data;',
      'const articleRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(article.id);',
      'callGeminiChatWithMetadata(combinedPrompt, [])',
    ],
    'Answerlattice entity extraction admission order',
  );
  assertNotIncludes(entityExtraction, "secureError('[Answerlattice Entity Extraction] Article extraction failed'", 'Answerlattice entity extraction raw secureError');
  assertNotIncludes(entityExtraction, 'id: z.string().trim().min(1).max(160)', 'Answerlattice entity extraction loose article ID schema');
  assertIncludes(knowledgeBaseArticles, 'ARTICLE_ENTITY_EXTRACTION_REQUEST_POLICY', 'Answerlattice article entity extraction shared request policy');
  assertIncludes(knowledgeBaseArticles, "cache: 'no-store'", 'Answerlattice article entity extraction bypasses browser cache');
  assertIncludes(knowledgeBaseArticles, "credentials: 'same-origin'", 'Answerlattice article entity extraction keeps credentials same-origin');
  assertIncludes(knowledgeBaseArticles, "redirect: 'manual'", 'Answerlattice article entity extraction does not follow redirects');
  assertIncludes(knowledgeBaseArticles, '...ARTICLE_ENTITY_EXTRACTION_REQUEST_POLICY', 'Answerlattice article entity extraction applies shared request policy');
  assertIncludes(knowledgeBaseArticles, 'ARTICLE_ENTITY_EXTRACTION_RESPONSE_JSON_MAX_BYTES', 'Answerlattice article entity extraction response cap');
  assertIncludes(knowledgeBaseArticles, 'readJsonResponseWithLimit<unknown>', 'Answerlattice article entity extraction bounded response parser');
  assertIncludes(knowledgeBaseArticles, 'isArticleEntityExtractionResponse', 'Answerlattice article entity extraction response guard');
  assertIncludes(knowledgeBaseArticles, 'acknowledgeArticleEntityExtractionResponse(response, article)', 'Answerlattice article entity extraction response acknowledgement');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_entity_extraction_response_parse_failed', 'Answerlattice article entity extraction parse diagnostic');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_entity_extraction_response_rejected', 'Answerlattice article entity extraction rejected diagnostic');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_entity_extraction_response_invalid', 'Answerlattice article entity extraction invalid diagnostic');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_entity_extraction_request_failed', 'Answerlattice article entity extraction request diagnostic');
  assertNotIncludes(knowledgeBaseArticles, 'response.json().catch(() => ({}))', 'Answerlattice article entity extraction direct JSON fallback');
  assertIncludes(kbArticleIdBoundary, 'isValidFirestoreDocumentId', 'Answerlattice KB article ID boundary Firestore document guard');
  assertIncludes(kbArticleIdBoundary, 'ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH = 180', 'Answerlattice KB article ID boundary length cap');
  assertIncludes(kbArticleIdBoundary, 'normalizeAnswerlatticeKbArticleId', 'Answerlattice KB article ID boundary normalizer');

  assertIncludes(faqGeneration, 'const GENERATE_FAQ_FROM_ARTICLE_MAX_BODY_BYTES = 4 * 1024;', 'Answerlattice FAQ generation body cap');
  assertIncludes(faqGeneration, 'const FAQ_PROVIDER_RESPONSE_TEXT_MAX_CHARS = 32 * 1024;', 'Answerlattice FAQ generation provider response text cap');
  assertIncludes(faqGeneration, 'type BoundedFaqProviderResponseText', 'Answerlattice FAQ generation bounded provider response type');
  assertIncludes(faqGeneration, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice FAQ generation KB article ID boundary import');
  assertIncludes(faqGeneration, 'articleId: z.string().trim().refine((value) => normalizeAnswerlatticeKbArticleId(value) === value)', 'Answerlattice FAQ generation KB article ID schema boundary');
  assertIncludes(faqGeneration, 'readBoundedJsonBody(request, GENERATE_FAQ_FROM_ARTICLE_MAX_BODY_BYTES', 'Answerlattice FAQ generation bounded body');
  assertIncludes(faqGeneration, 'GenerateFaqRequestSchema.safeParse(bodyResult.data)', 'Answerlattice FAQ generation bounded validation');
  assertIncludes(faqGeneration, 'const responseText = getResponseText(response);', 'Answerlattice FAQ generation bounded provider response read');
  assertIncludes(faqGeneration, "logRuntimeDiagnostic('answerlattice_faq_provider_response_truncated'", 'Answerlattice FAQ generation oversized provider response diagnostic');
  assertIncludes(faqGeneration, 'const parsed = extractJsonObject(responseText.text);', 'Answerlattice FAQ generation parses capped provider text');
  assertIncludes(faqGeneration, "logRuntimeDiagnostic('answerlattice_faq_generation_completed'", 'Answerlattice FAQ generation bounded success diagnostic');
  assertIncludes(faqGeneration, "logRuntimeFailure('answerlattice_faq_operation_log_failed'", 'Answerlattice FAQ generation operation-log bounded diagnostics');
  assertIncludes(faqGeneration, "logRuntimeFailure('answerlattice_faq_generation_failed'", 'Answerlattice FAQ generation bounded diagnostics');
  assertIncludes(faqGeneration, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice FAQ generation bounded tenant metadata');
  assertIncludes(faqGeneration, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice FAQ generation bounded store metadata');
  assertIncludes(faqGeneration, "getBoundedRuntimeStringContext('articleId', articleIdForLog)", 'Answerlattice FAQ generation bounded article metadata');
  assertIncludes(faqGeneration, "getBoundedRuntimeStringContext('articleId', articleId)", 'Answerlattice FAQ generation success breadcrumb bounded article metadata');
  assertNotIncludes(faqGeneration, 'request.json()', 'Answerlattice FAQ generation raw JSON parser');
  assertOrder(
    faqGeneration,
    [
      'const sessionScope = resolveAnswerlatticeSessionScope(session)',
      'const safeModeResponse = await checkSafeMode()',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE)',
      'readBoundedJsonBody(request, GENERATE_FAQ_FROM_ARTICLE_MAX_BODY_BYTES',
      'GenerateFaqRequestSchema.safeParse(bodyResult.data)',
      'const { articleId } = validation.data;',
      'const articleRef = db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId);',
      'genAIClient.models.generateContent({',
    ],
    'Answerlattice FAQ generation admission order',
  );
  assertNotIncludes(faqGeneration, "import { secureLog } from '@lib/security/secureLogger';", 'Answerlattice FAQ generation raw success logger import');
  assertNotIncludes(faqGeneration, 'articleId: z.string().trim().min(1).max(180)', 'Answerlattice FAQ generation loose article ID schema');
  assertNotIncludes(faqGeneration, "secureLog('[Answerlattice FAQ] Article suggestions generated'", 'Answerlattice FAQ generation raw success log');
  assertNotIncludes(faqGeneration, "secureError('[Answerlattice FAQ] Operation log failed'", 'Answerlattice FAQ generation operation-log raw secureError');
  assertNotIncludes(faqGeneration, "secureError('[Answerlattice FAQ] Article suggestion generation failed'", 'Answerlattice FAQ generation raw secureError');
  assertNotIncludes(faqGeneration, 'extractJsonObject(getResponseText(response))', 'Answerlattice FAQ generation direct provider text parsing');

  assertIncludes(draftRegeneration, 'const DRAFT_REGENERATE_MAX_BODY_BYTES = 4 * 1024;', 'Answerlattice draft regeneration body cap');
  assertIncludes(governanceIdBoundary, 'isValidFirestoreDocumentId', 'Answerlattice governance ID boundary Firestore document guard');
  assertIncludes(governanceIdBoundary, 'ANSWERLATTICE_GOVERNANCE_DOCUMENT_ID_MAX_LENGTH = 180', 'Answerlattice governance ID boundary length cap');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeMutationProposalId', 'Answerlattice mutation proposal ID normalizer');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeEntityId', 'Answerlattice entity ID normalizer');
  assertIncludes(governanceIdBoundary, "ANSWERLATTICE_UNRESOLVED_ENTITY_ID = 'unresolved'", 'Answerlattice governance ID boundary unresolved sentinel');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeResolvedEntityId', 'Answerlattice resolved entity ID normalizer');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeResolvedEntityIds', 'Answerlattice resolved entity ID list normalizer');
  assertIncludes(governanceIdBoundary, 'entityId && entityId !== ANSWERLATTICE_UNRESOLVED_ENTITY_ID ? entityId : null', 'Answerlattice resolved entity ID normalizer rejects unresolved');
  assertIncludes(draftRegeneration, "import { normalizeAnswerlatticeMutationProposalId, normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice draft regeneration governance ID boundary import');
  assertIncludes(draftRegeneration, 'proposalId: z.string().trim().refine((value) => normalizeAnswerlatticeMutationProposalId(value) === value)', 'Answerlattice draft regeneration proposal ID schema boundary');
  assertIncludes(draftRegeneration, 'const entityId = Array.isArray(proposal.relatedEntityIds) ? normalizeAnswerlatticeResolvedEntityId(proposal.relatedEntityIds[0]) : null;', 'Answerlattice draft regeneration related entity ID boundary');
  assertIncludes(clientDraftGenerator, "import { normalizeAnswerlatticeMutationProposalId, normalizeAnswerlatticeResolvedEntityId } from './governanceIdBoundary';", 'Answerlattice client draft helper governance ID boundary import');
  assertIncludes(clientDraftGenerator, 'const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);', 'Answerlattice client draft helper proposal ID normalization');
  assertIncludes(clientDraftGenerator, 'const proposal = await getMutationProposalById(normalizedProposalId);', 'Answerlattice client draft helper normalized proposal read');
  assertIncludes(clientDraftGenerator, 'const entityId = normalizeAnswerlatticeResolvedEntityId(proposal.relatedEntityIds?.[0]);', 'Answerlattice client draft helper related entity ID normalization');
  assertIncludes(clientDraftGenerator, 'DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS, normalizedProposalId', 'Answerlattice client draft helper normalized proposal write');
  assertIncludes(draftRegeneration, 'readBoundedJsonBody(request, DRAFT_REGENERATE_MAX_BODY_BYTES', 'Answerlattice draft regeneration bounded body');
  assertIncludes(draftRegeneration, 'RequestSchema.safeParse(bodyResult.data)', 'Answerlattice draft regeneration bounded validation');
  assertIncludes(draftRegeneration, 'answerlattice_draft_regeneration_signal_examples_load_failed', 'Answerlattice draft regeneration signal examples bounded diagnostic');
  assertIncludes(draftRegeneration, 'answerlattice_draft_regeneration_existing_answers_load_failed', 'Answerlattice draft regeneration existing answers bounded diagnostic');
  assertIncludes(draftRegeneration, "logRuntimeFailure('answerlattice_draft_regeneration_failed'", 'Answerlattice draft regeneration bounded diagnostics');
  assertIncludes(draftRegeneration, "getBoundedRuntimeStringContext('entityId', entityId)", 'Answerlattice draft regeneration bounded entity metadata');
  assertIncludes(draftRegeneration, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice draft regeneration bounded tenant metadata');
  assertIncludes(draftRegeneration, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice draft regeneration bounded store metadata');
  assertIncludes(draftRegeneration, "getBoundedRuntimeStringContext('userId', userIdForLog)", 'Answerlattice draft regeneration bounded user metadata');
  assertIncludes(draftRegeneration, "getBoundedRuntimeStringContext('proposalId', proposalIdForLog)", 'Answerlattice draft regeneration bounded proposal metadata');
  assertNotIncludes(draftRegeneration, 'request.json()', 'Answerlattice draft regeneration raw JSON parser');
  assertNotIncludes(draftRegeneration, '.get()\n        .catch(() => null);', 'Answerlattice draft regeneration silent grounding read fallback');
  assertOrder(
    draftRegeneration,
    [
      'const scope = resolveAnswerlatticeSessionScope(session)',
      'const safeModeResponse = await checkSafeMode()',
      'const rateLimit = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE)',
      'readBoundedJsonBody(request, DRAFT_REGENERATE_MAX_BODY_BYTES',
      'RequestSchema.safeParse(bodyResult.data)',
      'const { proposalId, regeneratedBy } = validation.data;',
      '.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)',
      '.doc(proposalId);',
      'const entityId = Array.isArray(proposal.relatedEntityIds) ? normalizeAnswerlatticeResolvedEntityId(proposal.relatedEntityIds[0]) : null;',
      '.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)',
      '.doc(entityId)',
      'callGeminiChatWithMetadata(combinedPrompt, [])',
    ],
    'Answerlattice draft regeneration admission order',
  );
  assertNotIncludes(draftRegeneration, "secureError('[Answerlattice Draft] Manual regeneration failed'", 'Answerlattice draft regeneration raw secureError');
  assertNotIncludes(draftRegeneration, 'proposalId: z.string().trim().min(1).max(160)', 'Answerlattice draft regeneration loose proposal ID schema');
  assertNotIncludes(draftRegeneration, '.doc(String(entityId))', 'Answerlattice draft regeneration loose related entity lookup');
  assertNotIncludes(clientDraftGenerator, 'const entityId = proposal.relatedEntityIds?.[0];', 'Answerlattice client draft helper raw related entity ID');
  assertNotIncludes(clientDraftGenerator, 'DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS, proposalId', 'Answerlattice client draft helper raw proposal write');
  assertIncludes(dataInventoryMap, 'Manual draft regeneration validates mutation proposal IDs and related entity IDs with the shared Answerlattice governance document-ID boundary before proposal or entity document access', 'Answerlattice data inventory draft regeneration governance ID boundary docs');
  assertIncludes(dataInventoryMap, 'Manual draft helper, proposal status action DAL, and draft approval DAL normalize proposal IDs and related entity IDs', 'Answerlattice data inventory manual draft helper/action ID boundary docs');
  assertIncludes(dataInventoryEvidence, 'Manual draft regeneration validates request-supplied mutation proposal IDs and persisted related entity IDs through the shared Answerlattice governance document-ID boundary before proposal/entity document reads', 'Answerlattice data inventory evidence draft regeneration governance ID boundary docs');
  assertIncludes(dataInventoryEvidence, 'Manual draft helper, proposal status action DAL, and draft approval DAL normalize proposal IDs and related entity IDs', 'Answerlattice data inventory evidence manual draft helper/action ID boundary docs');
  assertIncludes(productionAudit, 'Answerlattice Draft Regeneration Governance ID Boundary', 'Answerlattice draft regeneration governance ID boundary audit checkpoint');
  assertIncludes(productionAudit, 'Answerlattice Manual Draft Helper Related Entity ID Boundary', 'Answerlattice manual draft helper related entity ID boundary audit checkpoint');
  assertIncludes(productionAudit, 'Answerlattice Mutation Proposal Action and Scheduled Draft Diagnostic ID Boundary', 'Answerlattice mutation proposal action and scheduled draft diagnostic ID boundary audit checkpoint');
  assertIncludes(changelog, 'Answerlattice Draft Regeneration Governance ID Boundary', 'Changelog records draft regeneration governance ID boundary');
  assertIncludes(changelog, 'Answerlattice Manual Draft Helper Related Entity ID Boundary', 'Changelog records manual draft helper related entity ID boundary');
  assertIncludes(changelog, 'Answerlattice Mutation Proposal Action ID Boundary', 'Changelog records mutation proposal action ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Draft Regeneration Governance ID Boundary', 'Lowercase changelog records draft regeneration governance ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Manual Draft Helper Related Entity ID Boundary', 'Lowercase changelog records manual draft helper related entity ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Mutation Proposal Action ID Boundary', 'Lowercase changelog records mutation proposal action ID boundary');
  assertIncludes(mutationProposalsDal, "import { normalizeAnswerlatticeMutationProposalId, normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice mutation proposal DAL governance ID boundary import');
  assertIncludes(mutationProposalsDal, 'const normalizedProposalId = normalizeAnswerlatticeMutationProposalId(proposalId);', 'Answerlattice mutation proposal DAL proposal ID normalization');
  assertIncludes(mutationProposalsDal, 'const docSnap = await getDoc(getDocRef(normalizedProposalId));', 'Answerlattice mutation proposal DAL normalized proposal read');
  assertIncludes(mutationProposalsDal, 'body: JSON.stringify({ proposalId: normalizedProposalId, regeneratedBy }),', 'Answerlattice mutation proposal DAL normalized regeneration request');
  assert(
    (mutationProposalsDal.match(/const proposalRef = getDocRef\(normalizedProposalId\);/g) || []).length >= 3,
    'Answerlattice mutation proposal action DAL must normalize approve/reject/implemented doc refs',
  );
  assertNotIncludes(mutationProposalsDal, 'transaction.get(getDocRef(proposalId))', 'Answerlattice mutation proposal action DAL raw transaction read');
  assertNotIncludes(mutationProposalsDal, 'transaction.set(getDocRef(proposalId)', 'Answerlattice mutation proposal action DAL raw transaction write');
  assertIncludes(mutationProposalsDal, 'const entityId = normalizeAnswerlatticeResolvedEntityId(proposal.relatedEntityIds?.[0]);', 'Answerlattice mutation proposal DAL related entity ID normalization');
  assertIncludes(mutationProposalsDal, 'entityIds: [entityId],', 'Answerlattice mutation proposal DAL normalized canonical entity binding');
  assertNotIncludes(mutationProposalsDal, 'const entityId = proposal.relatedEntityIds?.[0];', 'Answerlattice mutation proposal DAL raw related entity ID');
  assertNotIncludes(mutationProposalsDal, 'entityIds: proposal.relatedEntityIds', 'Answerlattice mutation proposal DAL raw canonical entity binding');
  assertIncludes(mutationProposalsDal, 'ANSWERLATTICE_DRAFT_REGENERATION_REQUEST_POLICY', 'Answerlattice draft regeneration DAL shared request policy');
  assertIncludes(mutationProposalsDal, "cache: 'no-store'", 'Answerlattice draft regeneration DAL bypasses browser cache');
  assertIncludes(mutationProposalsDal, "credentials: 'same-origin'", 'Answerlattice draft regeneration DAL keeps credentials same-origin');
  assertIncludes(mutationProposalsDal, "redirect: 'manual'", 'Answerlattice draft regeneration DAL does not follow redirects');
  assertIncludes(mutationProposalsDal, '...ANSWERLATTICE_DRAFT_REGENERATION_REQUEST_POLICY', 'Answerlattice draft regeneration DAL applies shared request policy');
  assertIncludes(mutationProposalsDal, 'ANSWERLATTICE_DRAFT_REGENERATION_RESPONSE_MAX_BYTES', 'Answerlattice draft regeneration DAL response cap');
  assertIncludes(mutationProposalsDal, 'readDraftRegenerationResponse(response, normalizedProposalId)', 'Answerlattice draft regeneration DAL response acknowledgement');
  assertIncludes(mutationProposalsDal, 'isDraftRegenerationResponse', 'Answerlattice draft regeneration DAL response guard');
  assertIncludes(mutationProposalsDal, "logRuntimeFailure('answerlattice_draft_regeneration_response_parse_failed'", 'Answerlattice draft regeneration DAL response parse diagnostic');
  assertIncludes(mutationProposalsDal, "logRuntimeFailure('answerlattice_draft_regeneration_response_rejected'", 'Answerlattice draft regeneration DAL rejected response diagnostic');
  assertIncludes(mutationProposalsDal, "logRuntimeFailure('answerlattice_draft_regeneration_response_invalid'", 'Answerlattice draft regeneration DAL invalid response diagnostic');
  assertNotIncludes(mutationProposalsDal, 'response.json().catch(() => ({}))', 'Answerlattice draft regeneration DAL direct JSON fallback');
  assertNotIncludes(mutationProposalsDal, 'await response.json()', 'Answerlattice draft regeneration DAL direct JSON parsing');

  assertIncludes(translation, 'const TRANSLATE_ARTICLE_MAX_BODY_BYTES = 4 * 1024;', 'Answerlattice translation body cap');
  assertIncludes(translation, 'const TRANSLATION_PROVIDER_RESPONSE_TEXT_MAX_CHARS = 64 * 1024;', 'Answerlattice translation provider response text cap');
  assertIncludes(translation, 'type BoundedTranslationProviderResponseText', 'Answerlattice translation bounded provider response type');
  assertIncludes(translation, 'class AnswerlatticeTranslationProviderOutputError extends Error', 'Answerlattice translation oversized provider output error');
  assertIncludes(translation, "readonly code = 'ANSWERLATTICE_TRANSLATION_RESPONSE_TOO_LARGE';", 'Answerlattice translation oversized provider output code');
  assertIncludes(translation, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice translation KB article ID boundary import');
  assertIncludes(translation, 'articleId: z.string().trim().max(160).refine((value) => normalizeAnswerlatticeKbArticleId(value) === value)', 'Answerlattice translation KB article ID schema boundary');
  assertIncludes(translation, 'readBoundedJsonBody(request, TRANSLATE_ARTICLE_MAX_BODY_BYTES', 'Answerlattice translation bounded body');
  assertIncludes(translation, 'TranslateRequestSchema.safeParse(bodyResult.data)', 'Answerlattice translation bounded validation');
  assertIncludes(translation, 'const responseTextResult = getTranslationResponseText(response);', 'Answerlattice translation bounded provider response read');
  assertIncludes(translation, 'if (responseTextResult.truncated) {', 'Answerlattice translation oversized provider response guard');
  assertIncludes(translation, 'throw new AnswerlatticeTranslationProviderOutputError();', 'Answerlattice translation oversized provider response fail closed');
  assertIncludes(translation, 'const responseText = responseTextResult.text;', 'Answerlattice translation parses capped provider text');
  assertIncludes(translation, "logRuntimeFailure('answerlattice_translation_operation_log_failed'", 'Answerlattice translation operation-log bounded diagnostics');
  assertIncludes(translation, "logRuntimeFailure('answerlattice_translation_failed'", 'Answerlattice translation bounded diagnostics');
  assertIncludes(translation, "getBoundedRuntimeStringContext('tenantId', tenantIdForLog)", 'Answerlattice translation bounded tenant metadata');
  assertIncludes(translation, "getBoundedRuntimeStringContext('storeId', storeIdForLog)", 'Answerlattice translation bounded store metadata');
  assertIncludes(translation, "getBoundedRuntimeStringContext('articleId', articleIdForLog)", 'Answerlattice translation bounded article metadata');
  assertIncludes(translation, "getBoundedRuntimeStringContext('targetLocale', targetLocaleForLog)", 'Answerlattice translation bounded locale metadata');
  assertNotIncludes(translation, 'request.json()', 'Answerlattice translation raw JSON parser');
  assertOrder(
    translation,
    [
      'const sessionScope = resolveAnswerlatticeSessionScope(session)',
      'const safeModeResponse = await checkSafeMode()',
      'const rateLimitResult = await checkRateLimit({',
      'requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE)',
      'readBoundedJsonBody(request, TRANSLATE_ARTICLE_MAX_BODY_BYTES',
      'TranslateRequestSchema.safeParse(bodyResult.data)',
      'const { articleId, targetLocale } = validation.data;',
      'const articleDoc = await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId).get();',
      'genAIClient.models.generateContent({',
    ],
    'Answerlattice translation admission order',
  );
  assertNotIncludes(translation, "secureError('[Answerlattice Translate] Operation log failed'", 'Answerlattice translation operation-log raw secureError');
  assertNotIncludes(translation, "secureError('[Answerlattice Translate] Failed'", 'Answerlattice translation raw secureError');
  assertNotIncludes(translation, 'articleId: z.string().trim().min(1).max(160)', 'Answerlattice translation loose article ID schema');
  assertNotIncludes(translation, 'const responseText = getTranslationResponseText(response);', 'Answerlattice translation direct provider text parsing');
  assertIncludes(helpCenterFirebase, 'Article embedding, article entity extraction, FAQ generation, translation, and public-content article reads normalize KB article IDs through the shared Firestore document-ID boundary before any `kb_articles` document access', 'Answerlattice help-center KB article ID boundary docs');
  assertIncludes(dataInventoryMap, 'Article embedding, article entity extraction, FAQ generation, translation, and public-content article reads validate article IDs with the shared Firestore document-ID boundary before direct `kb_articles` document access', 'Answerlattice data inventory KB article ID boundary docs');
  assertIncludes(dataInventoryEvidence, 'Article embedding, article entity extraction, FAQ-from-article generation, article translation, and public-content article reads normalize request-supplied article IDs through the shared Firestore document-ID boundary before `kb_articles` document access', 'Answerlattice data inventory evidence KB article ID boundary docs');
  assertIncludes(productionAudit, 'Answerlattice KB Article ID Boundary', 'Answerlattice KB article ID boundary audit checkpoint');
  assertIncludes(changelog, 'Answerlattice KB Article ID Boundary', 'Changelog records Answerlattice KB article ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice KB Article ID Boundary', 'Lowercase changelog records Answerlattice KB article ID boundary');

  assertIncludes(articleEmbedding, 'const ARTICLE_EMBEDDING_MAX_BODY_BYTES = 256 * 1024;', 'Answerlattice article embedding body cap');
  assertIncludes(articleEmbedding, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice article embedding KB article ID boundary import');
  assertIncludes(articleEmbedding, 'articleId: z.string().trim().max(160).refine((value) => normalizeAnswerlatticeKbArticleId(value) === value)', 'Answerlattice article embedding KB article ID schema boundary');
  assertIncludes(articleEmbedding, 'readBoundedJsonBody(request, ARTICLE_EMBEDDING_MAX_BODY_BYTES', 'Answerlattice article embedding bounded body');
  assertIncludes(articleEmbedding, 'ArticleEmbeddingRequestSchema.parse(bodyResult.data)', 'Answerlattice article embedding bounded validation');
  assertIncludes(articleEmbedding, 'ARTICLE_EMBEDDING_OPERATION_LOG_FAILED', 'Answerlattice article embedding operation-log failure code');
  assertIncludes(articleEmbedding, 'ARTICLE_EMBEDDING_GENERATION_FAILED', 'Answerlattice article embedding generation failure code');
  assertIncludes(articleEmbedding, 'getArticleEmbeddingFailureLogData', 'Answerlattice article embedding bounded failure log data');
  assertNotIncludes(articleEmbedding, 'request.json()', 'Answerlattice article embedding raw JSON parser');
  assertNotIncludes(articleEmbedding, 'data: error', 'Answerlattice article embedding raw operation-log error object');
  assertNotIncludes(articleEmbedding, 'err?.message || String(err)', 'Answerlattice article embedding raw generation error text');
  assertOrder(
    articleEmbedding,
    [
      'const safeModeResponse = await checkSafeMode()',
      'const rateLimitResponse = await checkAIOperationLimit()',
      'readBoundedJsonBody(request, ARTICLE_EMBEDDING_MAX_BODY_BYTES',
      'ArticleEmbeddingRequestSchema.parse(bodyResult.data)',
      'const articleRef = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(embeddingPayload.articleId);',
      'callGeminiEmbeddingWithMetadata(embeddingInput, {',
    ],
    'Answerlattice article embedding admission order',
  );
  assertNotIncludes(articleEmbedding, 'articleId: z.string().trim().min(1).max(160)', 'Answerlattice article embedding loose article ID schema');

  assertIncludes(helpCenterSearch, 'const HELP_CENTER_SEARCH_MAX_BODY_BYTES = 64 * 1024;', 'Answerlattice help-center search body cap');
  assertIncludes(helpCenterSearch, 'readBoundedJsonBody(request, HELP_CENTER_SEARCH_MAX_BODY_BYTES', 'Answerlattice help-center search bounded body');
  assertIncludes(helpCenterSearch, 'SearchRequestSchema.parse(bodyResult.data)', 'Answerlattice help-center search bounded validation');
  assertIncludes(helpCenterSearch, 'getSafeZodValidationDetails(error)', 'Answerlattice help-center search validation uses safe Zod detail helper');
  assertNotIncludes(helpCenterSearch, 'error.issues.map', 'Answerlattice help-center search validation must not map raw Zod issues locally');
  assertNotIncludes(helpCenterSearch, 'message: err.message', 'Answerlattice help-center search validation must not return raw Zod messages');
  assertNotIncludes(helpCenterSearch, 'request.json()', 'Answerlattice help-center search raw JSON parser');
  assertOrder(
    helpCenterSearch,
    [
      'const rateLimitResponse = await checkAIOperationLimit()',
      'readBoundedJsonBody(request, HELP_CENTER_SEARCH_MAX_BODY_BYTES',
      'SearchRequestSchema.parse(bodyResult.data)',
      'coreSearch({',
    ],
    'Answerlattice help-center search admission order',
  );
}

function verifyAnswerlatticeAppSuccessDiagnostics() {
  const bundleRebuild = read('src/app/api/answerlattice/bundles/rebuild/route.ts');
  const workspaceProfile = read('src/app/api/answerlattice/workspace-profile/route.ts');
  const tenantSummary = read('src/app/api/answerlattice/tenant-summary/route.ts');
  const widgetKey = read('src/app/api/answerlattice/widget-key/route.ts');
  const widgetConfig = read('src/app/api/answerlattice/widget-config/route.ts');
  const hostedHelp = read('src/app/api/answerlattice/hosted-help-settings/route.ts');
  const integrations = read('src/app/api/answerlattice/integrations/route.ts');
  const integrationTest = read('src/app/api/answerlattice/integrations/test/route.ts');
  const productSurfaceSummary = read('src/app/api/answerlattice/product-surfaces/rebuild-summary/route.ts');
  const intakeDiagnostics = read('src/lib/answerlattice/knowledgeIntakeDiagnostics.ts');

  [
    [bundleRebuild, "logRuntimeDiagnostic('answerlattice_context_bundle_manual_rebuild_completed'", 'Answerlattice bundle rebuild success diagnostic'],
    [workspaceProfile, "logRuntimeDiagnostic('answerlattice_workspace_profile_saved'", 'Answerlattice workspace profile success diagnostic'],
    [tenantSummary, "logRuntimeDiagnostic('answerlattice_tenant_summary_synced'", 'Answerlattice tenant summary success diagnostic'],
    [widgetKey, "logRuntimeDiagnostic('answerlattice_widget_key_generated'", 'Answerlattice widget key generated diagnostic'],
    [widgetKey, "logRuntimeDiagnostic('answerlattice_widget_key_renamed'", 'Answerlattice widget key renamed diagnostic'],
    [widgetKey, "logRuntimeDiagnostic('answerlattice_widget_key_revoked'", 'Answerlattice widget key revoked diagnostic'],
    [widgetConfig, "logRuntimeDiagnostic('answerlattice_widget_config_saved'", 'Answerlattice widget config saved diagnostic'],
    [hostedHelp, "logRuntimeDiagnostic('answerlattice_hosted_help_settings_saved'", 'Answerlattice hosted help saved diagnostic'],
    [integrations, "logRuntimeDiagnostic('answerlattice_integrations_settings_saved'", 'Answerlattice integrations saved diagnostic'],
    [integrationTest, "logRuntimeDiagnostic('answerlattice_integration_test_event_queued'", 'Answerlattice integration test queued diagnostic'],
    [productSurfaceSummary, "logRuntimeDiagnostic('answerlattice_product_surface_summary_rebuilt'", 'Answerlattice product surface summary diagnostic'],
  ].forEach(([content, needle, label]) => {
    assertIncludes(content, needle, label);
  });

  [
    ['bundle rebuild', bundleRebuild, "secureLog('[Answerlattice Bundles] Rebuilt compiled context'"],
    ['workspace profile', workspaceProfile, "secureLog('[Answerlattice Workspace Profile] Saved'"],
    ['tenant summary', tenantSummary, "secureLog('[Answerlattice Tenant Summary] Synced tenant registry'"],
    ['widget key generated', widgetKey, "secureLog('[Answerlattice Widget] Key generated'"],
    ['widget key renamed', widgetKey, "secureLog('[Answerlattice Widget] Key renamed'"],
    ['widget key revoked', widgetKey, "secureLog('[Answerlattice Widget] Key revoked'"],
    ['widget config', widgetConfig, "secureLog('[Answerlattice Widget Config] Settings saved'"],
    ['hosted help', hostedHelp, "secureLog('[Answerlattice Hosted Help] Settings saved'"],
    ['integrations', integrations, "secureLog('[Answerlattice Integrations] Settings saved'"],
    ['integration test', integrationTest, "secureLog('[Answerlattice Integrations] Test event queued'"],
    ['product surface summary', productSurfaceSummary, "secureLog('[Answerlattice Product Surfaces] Context summary rebuilt'"],
  ].forEach(([label, content, needle]) => {
    assertNotIncludes(content, needle, `Answerlattice ${label} raw success log`);
  });

  [
    ['bundle rebuild', bundleRebuild],
    ['workspace profile', workspaceProfile],
    ['tenant summary', tenantSummary],
    ['widget key', widgetKey],
    ['widget config', widgetConfig],
    ['hosted help', hostedHelp],
    ['integrations', integrations],
    ['integration test', integrationTest],
    ['product surface summary', productSurfaceSummary],
  ].forEach(([label, content]) => {
    assertNotIncludes(content, "import { secureLog } from '@lib/security/secureLogger';", `Answerlattice ${label} raw success logger import`);
  });

  assertIncludes(intakeDiagnostics, "getBoundedSecurityStringContext('tenantId', input.scope?.tId)", 'Answerlattice intake diagnostics bound tenant scope');
  assertIncludes(intakeDiagnostics, "getBoundedSecurityStringContext('storeId', input.scope?.sId)", 'Answerlattice intake diagnostics bound store scope');
  assertNotIncludes(intakeDiagnostics, 'tId: toFiniteNumber(input.scope?.tId)', 'Answerlattice intake diagnostics raw tenant scope');
  assertNotIncludes(intakeDiagnostics, 'sId: toFiniteNumber(input.scope?.sId)', 'Answerlattice intake diagnostics raw store scope');
}

function verifySearchAndRetrievalTruth() {
  const searchCore = read('src/lib/search/searchCore.ts');
  const canonical = read('src/lib/answerlattice/canonicalRetrieval.ts');
  const faq = read('src/lib/answerlattice/faqRetrieval.ts');
  const faqContent = read('src/lib/answerlattice/faqContent.ts');
  const faqDal = read('src/database/answerlattice/faqs.ts');
  const faqIdBoundary = read('src/lib/answerlattice/faqIdBoundary.ts');
  const productSurfaceContent = read('src/lib/answerlattice/productSurfaceContent.ts');
  const productSurfaceIdBoundary = read('src/lib/answerlattice/productSurfaceIdBoundary.ts');
  const entity = read('src/lib/answerlattice/entityLookup.ts');
  const vectorEmbeddings = read('src/lib/vectorEmbeddings/index.ts');
  const cacheFreshness = read('src/lib/answerlattice/cacheFreshness.ts');
  const instantCache = read('src/lib/answerlattice/instantCache.ts');
  const governanceIdBoundary = read('src/lib/answerlattice/governanceIdBoundary.ts');
  const productSurfacesDal = read('src/database/answerlattice/productSurfaces.ts');
  const kbGenerationJobs = read('src/database/kb-generation/jobs.ts');
  const kbGenerationJobCard = read('src/components/templates/platform/KBGeneration/jobCard/index.tsx');
  const kbGenerationJobActionMenu = read('src/components/templates/platform/KBGeneration/jobHistory/JobActionMenu.tsx');
  const kbGenerationUploadModal = read('src/components/templates/platform/KBGeneration/UploadModal.tsx');
  const knowledgeBaseArticles = read('src/database/knowledgeBase/articles.ts');
  const knowledgeBaseCategories = read('src/database/knowledgeBase/categories.ts');
  const platformArticleModal = read('src/components/templates/platform/knowledgeBase/ArticleModal.tsx');
  const platformArticlePane = read('src/components/templates/platform/knowledgeBase/ArticlePane.tsx');
  const platformCategoryModal = read('src/components/templates/platform/knowledgeBase/CategoryModal.tsx');
  const platformSectionModal = read('src/components/templates/platform/knowledgeBase/SectionModal.tsx');
  const platformKnowledgeBase = read('src/components/templates/platform/knowledgeBase/index.tsx');
  const kbGenerationReviewModal = read('src/components/templates/platform/KBGeneration/ReviewModal.tsx');
  const kbGenerationReconciliation = read('src/components/templates/platform/KBGeneration/reconciliation/index.tsx');
  const faqManagement = read('src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx');
  const productSurfaces = read('src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx');
  const helpCenterSearch = read('src/app/api/helpCenter/search-kb/route.ts');
  const aiSearchModal = read('src/components/organisms/AISearchModal/AiSearchBarComponent.tsx');
  const aiSearchActionButtons = read('src/components/organisms/AISearchModal/ActionButtons.tsx');
  const helpChatApi = read('src/components/templates/main-app/helpChat/api.ts');
  const chatSessionsDal = read('src/database/chatSessions/index.ts');
  const aiSearchHistoryDal = read('src/database/aiSearchHistory/index.ts');
  const helpChatHandlers = read('src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts');
  const platformMessageBubble = read('src/components/templates/platform/chatManagement/MessageBubble.tsx');
  const platformConversationDetail = read('src/components/templates/platform/chatManagement/ConversationDetail.tsx');
  const platformConversationDrawer = read('src/components/templates/platform/chatManagement/ConversationDrawer.tsx');
  const platformConversationsList = read('src/components/templates/platform/chatManagement/ConversationsList.tsx');
  const platformTeamNoteModal = read('src/components/templates/platform/chatManagement/TeamNoteModal.tsx');
  const platformWeeklyDigest = read('src/components/templates/platform/chatManagement/WeeklyDigest.tsx');
  const platformRoiCalculator = read('src/components/templates/platform/chatManagement/ROICalculator.tsx');
  const answerlatticeSupportClipboard = read('src/lib/answerlattice/supportClipboard.ts');
  const knowledgeBaseSpec = read('__docs__/answerlattice/knowledge-base/knowledge-base_spec.md');
  const knowledgeBaseImpl = read('__docs__/answerlattice/knowledge-base/knowledge-base_impl.md');
  const knowledgeBaseFirebase = read('__docs__/answerlattice/knowledge-base/knowledge-base_firebase.md');
  const kbGenerationSpec = read('__docs__/answerlattice/kb-generation-pipeline/kb-generation-pipeline_spec.md');
  const kbGenerationImpl = read('__docs__/answerlattice/kb-generation-pipeline/kb-generation-pipeline_impl.md');
  const kbGenerationFirebase = read('__docs__/answerlattice/kb-generation-pipeline/kb-generation-pipeline_firebase.md');
  const aiQnaSpec = read('__docs__/answerlattice/ai-qna-chatbot/ai-qna-chatbot_spec.md');
  const chatMonitoringImpl = read('__docs__/answerlattice/chat-monitoring/chat-monitoring_impl.md');
  const faqManagementImpl = read('__docs__/answerlattice/faq-management/faq-management_impl.md');
  const productSurfaceContextsReadme = read('__docs__/answerlattice/product-surface-contexts/README.md');
  const productSurfaceContextsImpl = read('__docs__/answerlattice/product-surface-contexts/product-surface-contexts_impl.md');
  const helpCenterSpec = read('__docs__/answerlattice/help-center/help-center_spec.md');
  const helpCenterImpl = read('__docs__/answerlattice/help-center/help-center_impl.md');
  const helpCenterFirebase = read('__docs__/answerlattice/help-center/help-center_firebase.md');
  const helpCenterWebsite = read('__docs__/answerlattice/help-center/help-center_website.md');
  const helpCenterDecoupling = read('__docs__/answerlattice/help-center/help-center_decoupling-analysis.md');
  const repeatedReplyImpl = read('__docs__/answerlattice/repeated-reply-import/repeated-reply-import_impl.md');
  const entitySystemImpl = read('__docs__/answerlattice/entity-system/entity-system_impl.md');
  const instantResponseImpl = read('__docs__/answerlattice/instant-response-infrastructure/instant-response-infrastructure_impl.md');
  const firebaseCostAudit = read('__docs__/answerlattice/firebase-cost-optimization-audit.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(searchCore, ".where('tId', '==', tId)", 'Answerlattice search tenant-scoped vector lookup');
  assertIncludes(searchCore, ".where('sId', '==', sId)", 'Answerlattice search store-scoped vector lookup');
  assertIncludes(searchCore, 'ANSWER_WITHOUT_VALID_REFERENCES_BLOCKED', 'Answerlattice RAG reference enforcement');
  assertIncludes(searchCore, 'getSearchCoreFailureLogData', 'Answerlattice search core bounded failure log data');
  assertIncludes(searchCore, 'writeSearchPerfLogEntry', 'Answerlattice search core perf-log fallback helper');
  assertIncludes(aiSearchActionButtons, 'copyAiSearchAnswerToClipboard', 'Answerlattice AI Search copy acknowledgement helper');
  assertIncludes(aiSearchActionButtons, 'ai_search_answer_copy_clipboard_unavailable', 'Answerlattice AI Search unavailable clipboard failure code');
  assertIncludes(aiSearchActionButtons, 'ai_search_answer_copy_fallback_failed', 'Answerlattice AI Search failed fallback clipboard failure code');
  assertIncludes(aiSearchActionButtons, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice AI Search shared support clipboard helper');
  assertIncludes(aiSearchActionButtons, 'hasClipboardWrite', 'Answerlattice AI Search clipboard support metadata');
  assertIncludes(aiSearchActionButtons, 'hasCopyFallback', 'Answerlattice AI Search fallback support metadata');
  assertNotIncludes(aiSearchActionButtons, 'navigator.clipboard.writeText(answer)\n            .then', 'Answerlattice AI Search direct clipboard promise chain');
  assertIncludes(platformMessageBubble, 'copyPlatformChatMessageToClipboard', 'Answerlattice platform chat copy acknowledgement helper');
  assertIncludes(platformMessageBubble, 'platform_chat_message_copy_clipboard_unavailable', 'Answerlattice platform chat unavailable clipboard failure code');
  assertIncludes(platformMessageBubble, 'platform_chat_message_copy_fallback_failed', 'Answerlattice platform chat failed fallback clipboard failure code');
  assertIncludes(platformMessageBubble, 'copyAnswerlatticeSupportTextToClipboard', 'Answerlattice platform chat shared support clipboard helper');
  assertIncludes(platformMessageBubble, 'platform_chat_message_copy_failed', 'Answerlattice platform chat copy failure diagnostic');
  assertIncludes(platformMessageBubble, 'hasClipboardWrite', 'Answerlattice platform chat clipboard support metadata');
  assertIncludes(platformMessageBubble, 'hasCopyFallback', 'Answerlattice platform chat fallback support metadata');
  assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper acknowledged fallback copy result');
  assertNotIncludes(platformMessageBubble, 'navigator.clipboard.writeText(text)\n            .then', 'Answerlattice platform chat direct clipboard promise chain');
  assertIncludes(searchCore, 'answerlattice_search_perf_log_write_failed', 'Answerlattice search core perf-log write diagnostic');
  assertIncludes(searchCore, 'answerlattice_instant_cache_stage_failed', 'Answerlattice search core instant-cache stage diagnostic');
  assertIncludes(searchCore, 'answerlattice_canonical_cache_version_load_failed', 'Answerlattice search core canonical cache-version diagnostic');
  assertIncludes(searchCore, 'answerlattice_instant_cache_write_invocation_failed', 'Answerlattice search core instant-cache write invocation diagnostic');
  assertIncludes(searchCore, 'answerlattice_instant_cache_write_import_failed', 'Answerlattice search core instant-cache write import diagnostic');
  assertIncludes(governanceIdBoundary, 'export function normalizeAnswerlatticeCanonicalAnswerId(value: unknown): string | null', 'Answerlattice canonical answer ID boundary export');
  assertIncludes(cacheFreshness, "import { normalizeAnswerlatticeCanonicalAnswerId } from './governanceIdBoundary';", 'Answerlattice cache freshness canonical answer ID import');
  assertIncludes(cacheFreshness, "import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';", 'Answerlattice cache freshness KB article ID import');
  assertIncludes(cacheFreshness, 'const normalizedCanonicalAnswerId = normalizeAnswerlatticeCanonicalAnswerId(canonicalAnswerId);', 'Answerlattice cache freshness canonical ID normalization');
  assertIncludes(cacheFreshness, 'if (!normalizedCanonicalAnswerId || !cachedAtMs) return false;', 'Answerlattice cache freshness rejects malformed canonical ID before manifest freshness');
  assertIncludes(cacheFreshness, '.doc(normalizedCanonicalAnswerId)', 'Answerlattice cache freshness normalized canonical answer document ref');
  assertIncludes(cacheFreshness, 'const articleId = normalizeAnswerlatticeKbArticleId(reference?.id);', 'Answerlattice cache freshness KB article reference normalization');
  assertIncludes(cacheFreshness, '.doc(articleId)', 'Answerlattice cache freshness normalized article document ref');
  assertNotIncludes(cacheFreshness, '.doc(canonicalAnswerId)', 'Answerlattice cache freshness raw canonical answer document ref');
  assertNotIncludes(cacheFreshness, "const articleId = typeof reference?.id === 'string' ? reference.id : '';", 'Answerlattice cache freshness loose article ID extraction');
  [
    ['instant response implementation docs', instantResponseImpl],
    ['Firebase cost audit docs', firebaseCostAudit],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice cache freshness ID boundary', `Answerlattice cache freshness ID boundary documented in ${label}`);
  });
  assertIncludes(instantCache, 'answerlattice_instant_cache_lookup_failed', 'Answerlattice instant cache lookup diagnostic');
  assertIncludes(instantCache, 'answerlattice_instant_cache_stale_delete_failed', 'Answerlattice instant cache stale-delete diagnostic');
  assertIncludes(instantCache, 'answerlattice_instant_cache_write_failed', 'Answerlattice instant cache write diagnostic');
  assertIncludes(instantCache, 'getInstantCacheLogContext', 'Answerlattice instant cache bounded diagnostic context');
  assertIncludes(searchCore, 'answerlattice_image_fetch_failed', 'Answerlattice image fetch failure must use a stable failure code');
  assertIncludes(searchCore, "fetch(imageUrl, { redirect: 'manual', signal: controller.signal })", 'Answerlattice image URL fetch must not follow redirected Storage targets');
  assertIncludes(searchCore, 'readResponseUint8ArrayWithLimit(response, ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES)', 'Answerlattice image URL fetch must use bounded response reads');
  assertIncludes(searchCore, 'responseLength: String(geminiAnswer || \'\').length', 'Answerlattice search core parse failure must log response length only');
  assertNotIncludes(searchCore, 'const buffer = await response.arrayBuffer();', 'Answerlattice image URL fetch must not buffer oversized responses before rejection');
  assertNotIncludes(searchCore, 'imageError.message', 'Answerlattice search core must not persist image exception text');
  assertNotIncludes(searchCore, 'response.statusText', 'Answerlattice search core must not throw raw image fetch status text');
  assertNotIncludes(searchCore, 'error?.message || String(error)', 'Answerlattice search core must not persist raw exception text');
  assertNotIncludes(searchCore, 'vectorError?.message || String(vectorError)', 'Answerlattice search core must not persist raw vector exception text');
  assertNotIncludes(searchCore, 'parseError?.message || String(parseError)', 'Answerlattice search core must not persist raw parse exception text');
  assertNotIncludes(searchCore, 'responsePreview', 'Answerlattice search core must not persist AI response previews');
  assertNotIncludes(searchCore, 'writeLogEntry({\n                logFileName: PERF_LOG,\n                userId: uId,\n                logType: \'PRODUCT_SURFACE_CONTEXT_ERROR\'', 'Answerlattice product-surface context diagnostics must use guarded perf-log writer');
  assertNotIncludes(searchCore, 'writeLogEntry({\n            logFileName: PERF_LOG,\n            userId: uId,\n            logType: \'FAQ_RETRIEVAL_ERROR\'', 'Answerlattice FAQ retrieval diagnostics must use guarded perf-log writer');
  assertNotIncludes(searchCore, 'getAnswerlatticeCacheVersionServer(\n            ANSWERLATTICE_CACHE_SOURCES.CANONICAL,\n            tId,\n            sId,\n        ).catch(() => undefined)', 'Answerlattice canonical cache-version silent fallback');
  assertNotIncludes(searchCore, '} catch {\n            // Graceful degradation — cache failure never blocks pipeline', 'Answerlattice instant cache stage silent catch');
  assertNotIncludes(searchCore, '} catch {\n                // Silent failure — cache write is best-effort', 'Answerlattice instant cache write silent catch');
  assertNotIncludes(instantCache, 'redis.del(key).catch(() =>', 'Answerlattice instant cache stale-delete silent catch');
  assertNotIncludes(instantCache, 'redis.set(key, payload, { ex: INSTANT_CACHE_DEFAULTS.ttlSeconds }).catch(() =>', 'Answerlattice instant cache write silent catch');
  assertNotIncludes(instantCache, '// Silent failure', 'Answerlattice instant cache raw silent failure comments');
  assertIncludes(canonical, 'ENTITY_MATCH_MIN_SCORE', 'Answerlattice canonical entity confidence gate');
  assertIncludes(canonical, 'import { normalizeAnswerlatticeResolvedEntityId } from "@lib/answerlattice/governanceIdBoundary";', 'Answerlattice canonical retrieval resolved entity ID boundary import');
  assertIncludes(canonical, 'const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);', 'Answerlattice canonical retrieval resolved entity read normalizer');
  assertIncludes(canonical, 'if (!normalizedEntityId) return null;', 'Answerlattice canonical retrieval malformed entity guard');
  assertIncludes(canonical, '.doc(normalizedEntityId)', 'Answerlattice canonical retrieval normalized entity document ref');
  assertIncludes(canonical, 'const entityId = normalizeAnswerlatticeResolvedEntityId(entry.entityId);', 'Answerlattice canonical retrieval index resolved entity ID normalizer');
  assertIncludes(canonical, 'const entityId = normalizeAnswerlatticeResolvedEntityId(rawEntityId);', 'Answerlattice canonical retrieval context resolved entity ID normalizer');
  assertNotIncludes(canonical, 'normalizeAnswerlatticeEntityId', 'Answerlattice canonical retrieval must reject unresolved through resolved helper');
  assertIncludes(canonical, ".where('tId', '==', tId)", 'Answerlattice canonical tenant scope');
  assertIncludes(canonical, ".where('sId', '==', sId)", 'Answerlattice canonical store scope');
  assertIncludes(canonical, "fallbackReason: 'retrieval_error'", 'Answerlattice canonical retrieval fallback uses stable code');
  assertNotIncludes(canonical, 'retrieval_error: ${', 'Answerlattice canonical retrieval must not expose raw exception text in fallback reason');
  assertIncludes(entity, "import { normalizeAnswerlatticeResolvedEntityId } from './governanceIdBoundary';", 'Answerlattice entity lookup resolved entity ID boundary import');
  assertIncludes(entity, 'const normalizedEntityIds = Array.from(new Set(', 'Answerlattice entity lookup deduplicates normalized entity IDs');
  assertIncludes(entity, '.map(entityId => normalizeAnswerlatticeResolvedEntityId(entityId))', 'Answerlattice entity lookup normalizes search-index entity IDs through resolved helper');
  assertIncludes(entity, 'if (!normalizedEntityIds.length) return new Map();', 'Answerlattice entity lookup skips malformed-only entity reads');
  assertIncludes(entity, 'normalizedEntityIds.map(entityId => db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(entityId).get())', 'Answerlattice entity lookup uses normalized entity document refs');
  assertIncludes(entity, 'const entityId = normalizeAnswerlatticeResolvedEntityId(item.entry.entityId);', 'Answerlattice entity lookup maps ranked entries through resolved IDs');
  assertNotIncludes(entity, 'normalizeAnswerlatticeEntityId', 'Answerlattice entity lookup must reject unresolved through resolved helper');
  [
    ['repeated reply implementation docs', repeatedReplyImpl],
    ['entity system implementation docs', entitySystemImpl],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice entity retrieval ID boundary', `Answerlattice entity retrieval ID boundary documented in ${label}`);
    assertIncludes(content, 'unresolved', `Answerlattice entity retrieval resolved-entity sentinel behavior documented in ${label}`);
  });
  assertIncludes(dataInventoryEvidence, 'Answerlattice App Runtime Resolved Entity Read Boundary', 'Answerlattice data inventory evidence records app runtime resolved entity read boundary');
  assertIncludes(productionAudit, 'Answerlattice App Runtime Resolved Entity Read Boundary checkpoint', 'Answerlattice production audit records app runtime resolved entity read boundary');
  assertIncludes(changelog, 'Answerlattice App Runtime Resolved Entity Read Boundary', 'Answerlattice changelog records app runtime resolved entity read boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice App Runtime Resolved Entity Read Boundary', 'Answerlattice lowercase changelog records app runtime resolved entity read boundary');
  assertIncludes(faq, ".where('status', '==', ANSWERLATTICE_FAQ_STATUS.PUBLISHED)", 'Answerlattice FAQ published guard');
  assertIncludes(faq, ".where('active', '==', true)", 'Answerlattice FAQ active guard');
  assertIncludes(faq, "import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';", 'Answerlattice FAQ retrieval linked article ID boundary import');
  assertIncludes(faq, 'const articleId = normalizeAnswerlatticeKbArticleId(faq.articleId);', 'Answerlattice FAQ retrieval linked article ID normalization');
  assertIncludes(faq, 'if (!articleId) return [];', 'Answerlattice FAQ retrieval malformed linked article guard');
  assertIncludes(faq, '.doc(articleId)', 'Answerlattice FAQ retrieval normalized linked article document ref');
  assertNotIncludes(faq, '.doc(faq.articleId)', 'Answerlattice FAQ retrieval raw linked article document ref');
  assertIncludes(faq, 'Number(articleRecord.tId || faq.tId) !== Number(faq.tId)', 'Answerlattice FAQ article tenant guard');
  assertIncludes(faq, 'Number(articleRecord.sId || faq.sId) !== Number(faq.sId)', 'Answerlattice FAQ article store guard');
  assertIncludes(faq, "article.status !== 'published'", 'Answerlattice FAQ article published guard');
  assertIncludes(faqIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice FAQ ID boundary imports shared Firestore guard');
  assertIncludes(faqIdBoundary, 'export const ANSWERLATTICE_FAQ_ID_MAX_LENGTH = 180;', 'Answerlattice FAQ ID boundary length cap');
  assertIncludes(faqIdBoundary, 'export function normalizeAnswerlatticeFaqId(value: unknown): string | null {', 'Answerlattice FAQ ID boundary exports normalizer');
  assertIncludes(faqIdBoundary, 'isValidFirestoreDocumentId(faqId)', 'Answerlattice FAQ ID boundary validates Firestore document ID');
  assertIncludes(faqContent, "import { normalizeAnswerlatticeFaqId } from './faqIdBoundary';", 'Answerlattice FAQ content FAQ ID boundary import');
  assertIncludes(faqContent, "import { normalizeAnswerlatticeCanonicalAnswerId, normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';", 'Answerlattice FAQ content canonical answer ID boundary import');
  assertIncludes(faqContent, "import { normalizeAnswerlatticeKbArticleId } from './kbArticleIdBoundary';", 'Answerlattice FAQ content KB article ID boundary import');
  assertIncludes(faqContent, 'const faqId = parsed.id ? normalizeAnswerlatticeFaqId(parsed.id) : null;', 'Answerlattice FAQ save parser normalizes FAQ ID');
  assertIncludes(faqContent, 'const articleId = parsed.articleId ? normalizeAnswerlatticeKbArticleId(parsed.articleId) : null;', 'Answerlattice FAQ save parser normalizes article ID');
  assertIncludes(faqContent, 'const canonicalAnswerId = parsed.canonicalAnswerId ? normalizeAnswerlatticeCanonicalAnswerId(parsed.canonicalAnswerId) : null;', 'Answerlattice FAQ save parser normalizes canonical answer ID');
  assertIncludes(faqContent, 'if (parsed.id && !faqId) throw new Error(\'Invalid FAQ id\');', 'Answerlattice FAQ save parser rejects malformed FAQ ID');
  assertIncludes(faqContent, 'if (parsed.articleId && !articleId) throw new Error(\'Invalid linked article id\');', 'Answerlattice FAQ save parser rejects malformed article ID');
  assertIncludes(faqContent, 'const faqId = normalizeAnswerlatticeFaqId(record.id);', 'Answerlattice generated FAQ normalizes optional FAQ ID');
  assertNotIncludes(faqContent, 'id: normalizeFaqText(record.id, 180)', 'Answerlattice generated FAQ must not text-normalize document IDs');
  assertIncludes(faqDal, "import { normalizeAnswerlatticeFaqId } from '@lib/answerlattice/faqIdBoundary';", 'Answerlattice FAQ DAL FAQ ID boundary import');
  assertIncludes(faqDal, "import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';", 'Answerlattice FAQ DAL article ID boundary import');
  assertIncludes(faqDal, 'const normalizedDocId = normalizeAnswerlatticeFaqId(docId);', 'Answerlattice FAQ document ref normalizes FAQ ID');
  assertIncludes(faqDal, "if (!normalizedDocId) throw new Error('Invalid Answerlattice FAQ id');", 'Answerlattice FAQ document ref rejects malformed FAQ ID');
  assertIncludes(faqDal, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice FAQ document ref uses normalized FAQ ID');
  assertIncludes(faqDal, 'const normalizedArticleId = normalizeAnswerlatticeKbArticleId(articleId);', 'Answerlattice FAQ article ref normalizes article ID');
  assertIncludes(faqDal, "if (!normalizedArticleId) throw new Error('Invalid Answerlattice FAQ article id');", 'Answerlattice FAQ article ref rejects malformed article ID');
  assertIncludes(faqDal, 'return doc(answerlatticeFirebaseClient, ARTICLE_COLLECTION, normalizedArticleId);', 'Answerlattice FAQ article ref uses normalized article ID');
  assertIncludes(faqDal, "where('articleId', '==', normalizedArticleId)", 'Answerlattice FAQ article query uses normalized article ID');
  assertIncludes(faqDal, 'const previousArticleId = normalizeAnswerlatticeKbArticleId(existing?.articleId);', 'Answerlattice FAQ save normalizes previous linked article ID');
  assertIncludes(faqDal, 'const nextArticleId = normalizeAnswerlatticeKbArticleId(parsed.articleId);', 'Answerlattice FAQ save normalizes next linked article ID');
  assertIncludes(faqDal, 'const normalizedFaqId = normalizeAnswerlatticeFaqId(faqId);', 'Answerlattice FAQ actions normalize FAQ ID');
  assertIncludes(faqDal, 'const linkedArticleId = normalizeAnswerlatticeKbArticleId(existing.articleId);', 'Answerlattice FAQ archive normalizes linked article ID');
  assertIncludes(faqDal, 'faqIds: arrayRemove(normalizedFaqId)', 'Answerlattice FAQ archive removes normalized FAQ ID from article mirror');
  assertIncludes(faqDal, "await bumpFaqVersion(scope, 'faq_archive', normalizedFaqId);", 'Answerlattice FAQ archive bumps version with normalized FAQ ID');
  assertIncludes(faqDal, 'const normalizedArticleId = normalizeAnswerlatticeKbArticleId(article.id);', 'Answerlattice FAQ article maintenance normalizes article ID');
  assertIncludes(faqDal, "await bumpFaqVersion(scope, 'article_changed_mark_faq_review', normalizedArticleId);", 'Answerlattice FAQ review maintenance bumps version with normalized article ID');
  assertIncludes(faqDal, "await bumpFaqVersion(scope, 'article_deleted_archive_faqs', normalizedArticleId);", 'Answerlattice FAQ archive maintenance bumps version with normalized article ID');
  assertNotIncludes(faqDal, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice FAQ DAL must not build raw FAQ document refs');
  assertNotIncludes(faqDal, 'doc(answerlatticeFirebaseClient, ARTICLE_COLLECTION, articleId)', 'Answerlattice FAQ DAL must not build raw article document refs');
  assertNotIncludes(faqDal, "where('articleId', '==', article.id)", 'Answerlattice FAQ article maintenance must not query raw article ID');
  assertNotIncludes(faqDal, "where('articleId', '==', articleId)", 'Answerlattice FAQ article query must not use raw article ID');
  assertNotIncludes(faqDal, 'getDocRef(faqId)', 'Answerlattice FAQ archive/feedback must not use raw FAQ ID refs');
  assertIncludes(faqDal, 'resolveFaqArticleMaintenanceScope', 'Answerlattice FAQ article maintenance scope resolver');
  assertIncludes(faqDal, 'answerlattice_faq_article_review_scope_resolve_failed', 'Answerlattice FAQ review maintenance scope diagnostic');
  assertIncludes(faqDal, 'answerlattice_faq_article_archive_scope_resolve_failed', 'Answerlattice FAQ archive maintenance scope diagnostic');
  assertIncludes(faqDal, 'getAnswerlatticeScopeLogContext', 'Answerlattice FAQ DAL bounded scope context');
  assertIncludes(faqDal, 'AnswerlatticeFaqWriteResult', 'Answerlattice FAQ write explicit result');
  assertIncludes(faqDal, 'AnswerlatticeFaqArchiveResult', 'Answerlattice FAQ archive explicit result');
  assertIncludes(faqDal, 'assertAnswerlatticeFaqWriteSucceeded', 'Answerlattice FAQ write acknowledgement guard');
  assertIncludes(faqDal, 'assertAnswerlatticeFaqArchiveSucceeded', 'Answerlattice FAQ archive acknowledgement guard');
  assertIncludes(faqDal, 'satisfies AnswerlatticeFaqWriteResult', 'Answerlattice FAQ write success envelope');
  assertIncludes(faqDal, 'satisfies AnswerlatticeFaqArchiveResult', 'Answerlattice FAQ archive success envelope');
  assertIncludes(faqManagement, 'answerlattice_faq_management_save_rejected', 'Answerlattice FAQ management save acknowledgement rejection');
  assertIncludes(faqManagement, 'answerlattice_faq_management_archive_rejected', 'Answerlattice FAQ management archive acknowledgement rejection');
  [
    ['FAQ management implementation docs', faqManagementImpl],
    ['Help Center implementation docs', helpCenterImpl],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice FAQ article reference ID boundary', `Answerlattice FAQ article reference ID boundary documented in ${label}`);
  });
  [
    ['FAQ management implementation docs', faqManagementImpl],
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App FAQ ID Boundary', `Answerlattice App FAQ ID Boundary documented in ${label}`);
  });
  assertNotIncludes(faqDal, 'requireScope().catch(() => null)', 'Answerlattice FAQ article maintenance silent scope fallback');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_faq_review_marker_failed', 'Answerlattice article FAQ review marker diagnostic');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_article_faq_archive_failed', 'Answerlattice article FAQ archive diagnostic');
  assertIncludes(knowledgeBaseArticles, 'getAnswerlatticeScopeLogContext', 'Answerlattice article FAQ maintenance bounded scope context');
  assertIncludes(knowledgeBaseArticles, 'assertKnowledgeBaseArticleWriteSucceeded', 'Answerlattice KB article write acknowledgement guard');
  assertIncludes(knowledgeBaseArticles, 'assertKnowledgeBaseArticleDeleteSucceeded', 'Answerlattice KB article delete acknowledgement guard');
  assertIncludes(knowledgeBaseArticles, 'KnowledgeBaseArticleDeleteResult', 'Answerlattice KB article delete explicit result');
  assertIncludes(knowledgeBaseArticles, 'assertKnowledgeBaseArticleBulkStatusUpdateSucceeded', 'Answerlattice KB article bulk status acknowledgement guard');
  assertIncludes(knowledgeBaseArticles, 'satisfies KnowledgeBaseArticleBulkStatusUpdateResult', 'Answerlattice KB article bulk status explicit result');
  assertIncludes(knowledgeBaseArticles, 'const scope = await resolveReadableArticleScope();', 'Answerlattice KB article legacy list scope resolver');
  assertIncludes(knowledgeBaseArticles, 'const filters = getReadableScopeFilters(scope);', 'Answerlattice KB article legacy list readable filters');
  assertIncludes(knowledgeBaseArticles, 'if (readableScopeAllowsArticle(scope, article))', 'Answerlattice KB article legacy list final scope guard');
  assertIncludes(knowledgeBaseArticles, 'resolveKnowledgeBaseArticleSession', 'Answerlattice KB article session lookup helper');
  assertIncludes(knowledgeBaseArticles, 'answerlattice_kb_articles_session_lookup_failed', 'Answerlattice KB article session lookup diagnostic');
  assertIncludes(knowledgeBaseArticles, "getBoundedAnswerlatticeStringContext('operation', operation)", 'Answerlattice KB article session lookup bounded operation metadata');
  assertNotIncludes(knowledgeBaseArticles, 'getActiveSession().catch(() => null)', 'Answerlattice KB article session lookup silent fallback');
  assertNotIncludes(knowledgeBaseArticles, 'This fetches ALL articles globally with no tenant filter', 'Answerlattice KB article legacy global list comment');
  assertNotIncludes(knowledgeBaseArticles, 'const q = query(await getCollectionRef(), limit(KB_ARTICLE_LIST_LIMIT));', 'Answerlattice KB article legacy global list query');
  assertIncludes(knowledgeBaseSpec, 'Deprecated `getArticles()` compatibility helper could read globally', 'Answerlattice KB spec scoped getArticles resolved risk');
  assertIncludes(knowledgeBaseSpec, 'workspace KB articles and categories are tenant/store scoped', 'Answerlattice KB spec tenant-scoped workspace KB boundary');
  assertIncludes(knowledgeBaseImpl, 'Deprecated `getArticles()` compatibility helper could read globally', 'Answerlattice KB impl scoped getArticles resolved risk');
  assertIncludes(knowledgeBaseImpl, 'Answerlattice KB session lookup diagnostics', 'Answerlattice KB impl session lookup diagnostics docs');
  assertIncludes(knowledgeBaseImpl, 'answerlattice_kb_categories_session_lookup_failed', 'Answerlattice KB impl category session diagnostic docs');
  assertIncludes(knowledgeBaseImpl, 'answerlattice_kb_articles_session_lookup_failed', 'Answerlattice KB impl article session diagnostic docs');
  assertIncludes(knowledgeBaseFirebase, 'July 5 session lookup diagnostics update', 'Answerlattice KB Firebase session diagnostics cost note');
  assertIncludes(knowledgeBaseFirebase, 'failed category session lookup stops before the legacy categories doc read', 'Answerlattice KB Firebase failed session avoids legacy read note');
  assertIncludes(aiQnaSpec, 'KB article reads must stay tenant/store scoped', 'Answerlattice AI QnA KB tenant-scope docs');
  assertIncludes(helpCenterSpec, 'Workspace Knowledge Base content is tenant/store scoped', 'Answerlattice help-center spec KB tenant-scope docs');
  assertIncludes(helpCenterImpl, 'non-platform sessions require tenant/store scope', 'Answerlattice help-center scoped getArticles docs');
  assertIncludes(helpCenterImpl, 'session lookup failures', 'Answerlattice help-center session lookup failure docs');
  assertIncludes(helpCenterWebsite, 'Workspace knowledge base content is scoped to your tenant and store', 'Answerlattice help-center website KB tenant-scope docs');
  assertIncludes(helpCenterDecoupling, 'KB articles, categories, jobs, chat, tickets, changelog, feedback, and search history are tenant/store scoped for non-platform callers', 'Answerlattice decoupling KB tenant-scope docs');
  assertIncludes(productionAudit, 'Answerlattice KB article list scope checkpoint', 'Answerlattice KB article list scope audit checkpoint');
  assertIncludes(productionAudit, 'Answerlattice KB session lookup diagnostics checkpoint', 'Answerlattice KB session lookup audit checkpoint');
  assertIncludes(changelog, 'Answerlattice KB Article List Scope Boundary', 'Answerlattice KB article list scope changelog entry');
  assertIncludes(changelog, 'Answerlattice KB Session Lookup Diagnostics', 'Answerlattice KB session lookup changelog entry');
  assertNotIncludes(knowledgeBaseSpec, 'Tenant-specific KB (articles are platform-wide, shared across all tenants)', 'Answerlattice KB spec stale platform-wide non-goal');
  assertNotIncludes(knowledgeBaseSpec, '**Global** (platform-wide, no tenant filter)', 'Answerlattice KB spec stale global article scope');
  assertNotIncludes(knowledgeBaseImpl, '| `getArticles()` | All | 0 | Fetches entire collection', 'Answerlattice KB impl stale global article list row');
  assertNotIncludes(aiQnaSpec, 'KB articles are platform-wide (no tenant-scoped KB)', 'Answerlattice AI QnA stale platform-wide KB risk');
  assertNotIncludes(helpCenterSpec, 'Knowledge Base is **global** (platform-wide), not tenant-scoped', 'Answerlattice help-center spec stale platform-wide KB distinction');
  assertNotIncludes(helpCenterImpl, '`getArticles()` fetches ALL articles with no tenant/store filter', 'Answerlattice help-center stale getArticles global note');
  assertNotIncludes(helpCenterWebsite, 'The knowledge base is platform-wide', 'Answerlattice help-center website stale platform-wide KB copy');
  assertNotIncludes(helpCenterDecoupling, 'KB is global (platform-wide)', 'Answerlattice decoupling stale global KB score');
  assertIncludes(knowledgeBaseCategories, 'assertKnowledgeBaseCategoryWriteSucceeded', 'Answerlattice KB category write acknowledgement guard');
  assertIncludes(knowledgeBaseCategories, 'assertKnowledgeBaseCategoriesMutationSucceeded', 'Answerlattice KB categories mutation acknowledgement guard');
  assertIncludes(knowledgeBaseCategories, 'satisfies KnowledgeBaseCategoryWriteResult', 'Answerlattice KB category write explicit result');
  assertIncludes(knowledgeBaseCategories, 'withCategoriesMutationResult', 'Answerlattice KB categories mutation explicit result helper');
  assertIncludes(knowledgeBaseCategories, 'resolveKnowledgeBaseCategorySession', 'Answerlattice KB category session lookup helper');
  assertIncludes(knowledgeBaseCategories, 'answerlattice_kb_categories_session_lookup_failed', 'Answerlattice KB category session lookup diagnostic');
  assertIncludes(knowledgeBaseCategories, 'sessionLookupFailed', 'Answerlattice KB category read avoids legacy fallback after failed session lookup');
  assertIncludes(knowledgeBaseCategories, "getBoundedAnswerlatticeStringContext('operation', operation)", 'Answerlattice KB category session lookup bounded operation metadata');
  assertNotIncludes(knowledgeBaseCategories, 'getActiveSession().catch(() => null)', 'Answerlattice KB category session lookup silent fallback');
  assertIncludes(kbGenerationJobs, 'assertIngestionJobWriteSucceeded', 'Answerlattice KB generation job write acknowledgement guard');
  assertIncludes(kbGenerationJobs, 'assertIngestionJobDeleteSucceeded', 'Answerlattice KB generation job delete acknowledgement guard');
  assertIncludes(kbGenerationJobs, 'satisfies IngestionJobWriteResult', 'Answerlattice KB generation job write explicit result');
  assertIncludes(kbGenerationJobs, 'satisfies IngestionJobDeleteResult', 'Answerlattice KB generation job delete explicit result');
  assertIncludes(kbGenerationJobs, 'resolveReadableIngestionJobScope', 'Answerlattice KB generation legacy job list scope resolver');
  assertIncludes(kbGenerationJobs, 'resolveIngestionJobSession', 'Answerlattice KB generation session lookup helper');
  assertIncludes(kbGenerationJobs, 'answerlattice_kb_generation_session_lookup_failed', 'Answerlattice KB generation session lookup diagnostic');
  assertIncludes(kbGenerationJobs, "getBoundedAnswerlatticeStringContext('operation', operation)", 'Answerlattice KB generation session lookup bounded operation metadata');
  assertNotIncludes(kbGenerationJobs, 'getActiveSession().catch(() => null)', 'Answerlattice KB generation session lookup silent fallback');
  assertIncludes(kbGenerationJobs, 'const filters = getReadableIngestionJobFilters(scope);', 'Answerlattice KB generation legacy job list readable filters');
  assertIncludes(kbGenerationJobs, 'if (readableIngestionJobScopeAllowsJob(scope, job))', 'Answerlattice KB generation legacy job list final scope guard');
  assertNotIncludes(kbGenerationJobs, 'const q = query(getCollectionRef(), orderBy("createdOn", "desc"), limit(ALL_JOB_LIMIT));', 'Answerlattice KB generation legacy global job list query');
  assertIncludes(kbGenerationSpec, 'Deprecated `getIngestionJobs()` compatibility helper could read globally', 'Answerlattice KB generation spec scoped getIngestionJobs resolved risk');
  assertIncludes(kbGenerationImpl, 'Deprecated `getIngestionJobs()` compatibility helper could read globally', 'Answerlattice KB generation impl scoped getIngestionJobs resolved risk');
  assertIncludes(kbGenerationImpl, 'answerlattice_kb_generation_session_lookup_failed', 'Answerlattice KB generation impl session diagnostic docs');
  assertIncludes(kbGenerationFirebase, '`tId` + `sId` fields; non-platform `getIngestionJobs()` reads are tenant/store scoped', 'Answerlattice KB generation Firebase scoped getIngestionJobs docs');
  assertIncludes(kbGenerationFirebase, 'July 5 session lookup diagnostics update', 'Answerlattice KB generation Firebase session diagnostics cost note');
  assertIncludes(helpCenterImpl, '`getIngestionJobs()` in `src/database/kb-generation/jobs.ts` is also deprecated but scoped', 'Answerlattice help-center scoped getIngestionJobs docs');
  assertIncludes(productionAudit, 'Answerlattice KB generation job list scope checkpoint', 'Answerlattice KB generation job list scope audit checkpoint');
  assertIncludes(changelog, 'Answerlattice KB Generation Job List Scope Boundary', 'Answerlattice KB generation job list scope changelog entry');
  assertNotIncludes(kbGenerationSpec, '`getIngestionJobs()` fetches ALL jobs with no tenant filter', 'Answerlattice KB generation spec stale global job risk');
  assertNotIncludes(kbGenerationImpl, '| `getIngestionJobs()` | N | 0 | ALL jobs, NO tenant filter |', 'Answerlattice KB generation impl stale global job row');
  assertNotIncludes(kbGenerationFirebase, '(but `getIngestionJobs()` has no filter)', 'Answerlattice KB generation Firebase stale job scoping note');
  assertIncludes(productSurfacesDal, 'AnswerlatticeProductSurfaceWriteResult', 'Answerlattice product surface write explicit result');
  assertIncludes(productSurfacesDal, 'AnswerlatticeProductSurfaceArchiveResult', 'Answerlattice product surface archive explicit result');
  assertIncludes(productSurfacesDal, 'assertAnswerlatticeProductSurfaceWriteSucceeded', 'Answerlattice product surface write acknowledgement guard');
  assertIncludes(productSurfacesDal, 'assertAnswerlatticeProductSurfaceArchiveSucceeded', 'Answerlattice product surface archive acknowledgement guard');
  assertIncludes(productSurfacesDal, 'satisfies AnswerlatticeProductSurfaceWriteResult', 'Answerlattice product surface write success envelope');
  assertIncludes(productSurfacesDal, 'satisfies AnswerlatticeProductSurfaceArchiveResult', 'Answerlattice product surface archive success envelope');
  assertIncludes(productSurfaceIdBoundary, 'ANSWERLATTICE_PRODUCT_SURFACE_ID_MAX_LENGTH = 180', 'Answerlattice product surface ID max length');
  assertIncludes(productSurfaceIdBoundary, 'isValidFirestoreDocumentId(surfaceId)', 'Answerlattice product surface ID Firestore document guard');
  assertIncludes(productSurfaceContent, "import { normalizeAnswerlatticeProductSurfaceId } from './productSurfaceIdBoundary';", 'Answerlattice product surface content ID boundary import');
  assertIncludes(productSurfaceContent, 'const surfaceId = parsed.id ? normalizeAnswerlatticeProductSurfaceId(parsed.id) : null;', 'Answerlattice product surface parser normalizes provided ID');
  assertIncludes(productSurfaceContent, "if (parsed.id && !surfaceId) throw new Error('Invalid product surface id.');", 'Answerlattice product surface parser rejects malformed provided ID');
  assertIncludes(productSurfaceContent, '...(surfaceId ? { id: surfaceId } : {}),', 'Answerlattice product surface parser stores normalized ID');
  assertIncludes(productSurfacesDal, "import { normalizeAnswerlatticeProductSurfaceId } from '@lib/answerlattice/productSurfaceIdBoundary';", 'Answerlattice product surface DAL ID boundary import');
  assertIncludes(productSurfacesDal, 'const normalizedDocId = normalizeAnswerlatticeProductSurfaceId(docId);', 'Answerlattice product surface document ref normalizes ID');
  assertIncludes(productSurfacesDal, "if (!normalizedDocId) throw new Error('Invalid Answerlattice product surface id');", 'Answerlattice product surface document ref rejects malformed ID');
  assertIncludes(productSurfacesDal, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice product surface document ref uses normalized ID');
  assertIncludes(productSurfacesDal, 'const docId = normalizeAnswerlatticeProductSurfaceId(', 'Answerlattice product surface save normalizes document ID');
  assertIncludes(productSurfacesDal, 'parsed.id || buildProductSurfaceDocId(scope.tId, scope.sId, parsed.key),', 'Answerlattice product surface generated ID passes boundary');
  assertIncludes(productSurfacesDal, 'sourceId: docId,', 'Answerlattice product surface save source ID is normalized');
  assertIncludes(productSurfacesDal, 'const surfaceId = normalizeAnswerlatticeProductSurfaceId(surface.id);', 'Answerlattice product surface archive normalizes ID');
  assertIncludes(productSurfacesDal, 'await setDoc(getDocRef(surfaceId), composedData, { merge: true });', 'Answerlattice product surface archive uses normalized ref');
  assertIncludes(productSurfacesDal, 'sourceId: surfaceId,', 'Answerlattice product surface archive source ID is normalized');
  assertIncludes(productSurfacesDal, 'const normalizedSurfaceId = normalizeAnswerlatticeProductSurfaceId(surfaceId);', 'Answerlattice product surface read normalizes ID');
  assertIncludes(productSurfacesDal, 'if (!normalizedSurfaceId) return null;', 'Answerlattice product surface read rejects malformed ID before ref');
  assertNotIncludes(productSurfacesDal, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice product surface DAL must not build raw document refs');
  assertNotIncludes(productSurfacesDal, 'getDocRef(surface.id)', 'Answerlattice product surface archive must not use raw surface ID refs');
  assertNotIncludes(productSurfacesDal, 'sourceId: surface.id', 'Answerlattice product surface archive must not use raw source ID');
  [
    ['Product Surface Contexts README', productSurfaceContextsReadme],
    ['Product Surface Contexts implementation docs', productSurfaceContextsImpl],
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Product Surface ID Boundary', `Answerlattice product surface ID boundary documented in ${label}`);
  });
  assertIncludes(productSurfaces, 'answerlattice_product_surface_management_save_rejected', 'Answerlattice product surface management save acknowledgement rejection');
  assertIncludes(productSurfaces, 'answerlattice_product_surface_management_archive_rejected', 'Answerlattice product surface management archive acknowledgement rejection');
  assertIncludes(productSurfaces, 'answerlattice_product_surface_templates_apply_rejected', 'Answerlattice product surface template acknowledgement rejection');
  assertIncludes(productSurfacesDal, 'ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_REQUEST_POLICY', 'Answerlattice product surface summary rebuild shared request policy');
  assertIncludes(productSurfacesDal, "cache: 'no-store'", 'Answerlattice product surface summary rebuild bypasses browser cache');
  assertIncludes(productSurfacesDal, "credentials: 'same-origin'", 'Answerlattice product surface summary rebuild keeps credentials same-origin');
  assertIncludes(productSurfacesDal, "redirect: 'manual'", 'Answerlattice product surface summary rebuild does not follow redirects');
  assertIncludes(productSurfacesDal, '...ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_REQUEST_POLICY', 'Answerlattice product surface summary rebuild applies shared request policy');
  assertIncludes(productSurfacesDal, 'PRODUCT_SURFACE_SUMMARY_REBUILD_RESPONSE_JSON_MAX_BYTES', 'Answerlattice product surface summary rebuild response cap');
  assertIncludes(productSurfacesDal, 'readJsonResponseWithLimit<unknown>', 'Answerlattice product surface summary rebuild bounded response parser');
  assertIncludes(productSurfacesDal, 'answerlattice_product_surface_summary_rebuild_response_parse_failed', 'Answerlattice product surface summary rebuild parse diagnostic');
  assertIncludes(productSurfacesDal, 'answerlattice_product_surface_summary_rebuild_response_rejected', 'Answerlattice product surface summary rebuild rejected diagnostic');
  assertIncludes(productSurfacesDal, 'answerlattice_product_surface_summary_rebuild_response_invalid', 'Answerlattice product surface summary rebuild invalid diagnostic');
  assertNotIncludes(productSurfacesDal, 'res.json().catch(() => ({}))', 'Answerlattice product surface summary rebuild direct JSON fallback');
  assertIncludes(productSurfacesDal, 'rebuildProductSurfaceContentSummaryWithDiagnostics', 'Answerlattice product surface summary refresh diagnostic helper');
  assertIncludes(productSurfacesDal, 'logAnswerlatticeFailure(params.failureCode, error, params.context || {})', 'Answerlattice product surface summary refresh bounded diagnostic logger');
  assertIncludes(platformArticleModal, 'answerlattice_article_surface_options_load_failed', 'Platform KB article surface option diagnostic');
  assertIncludes(platformArticleModal, 'answerlattice_article_linked_faq_options_load_failed', 'Platform KB article linked FAQ option diagnostic');
  assertIncludes(platformArticleModal, 'answerlattice_article_embedding_generation_failed', 'Platform KB article embedding diagnostic');
  assertIncludes(platformArticleModal, 'ARTICLE_MODAL_RESPONSE_JSON_MAX_BYTES', 'Platform KB article modal response cap');
  assertIncludes(platformArticleModal, 'ARTICLE_MODAL_REQUEST_POLICY', 'Platform KB article modal shared request policy');
  assertIncludes(platformArticleModal, "cache: 'no-store'", 'Platform KB article modal requests bypass browser cache');
  assertIncludes(platformArticleModal, "credentials: 'same-origin'", 'Platform KB article modal requests keep credentials same-origin');
  assertIncludes(platformArticleModal, "redirect: 'manual'", 'Platform KB article modal requests do not follow redirects');
  assert((platformArticleModal.match(/\.\.\.ARTICLE_MODAL_REQUEST_POLICY/g) || []).length >= 2, 'Platform KB article modal requests must apply the shared request policy');
  assertIncludes(platformArticleModal, 'readJsonResponseWithLimit<unknown>', 'Platform KB article modal bounded response parser');
  assertIncludes(platformArticleModal, 'isArticleFaqSuggestionResponse', 'Platform KB article FAQ suggestion response guard');
  assertIncludes(platformArticleModal, 'isArticleEmbeddingResponse', 'Platform KB article embedding response guard');
  assertIncludes(platformArticleModal, 'answerlattice_article_modal_response_parse_failed', 'Platform KB article modal response parse diagnostic');
  assertIncludes(platformArticleModal, 'answerlattice_article_modal_response_rejected', 'Platform KB article modal response rejected diagnostic');
  assertIncludes(platformArticleModal, 'answerlattice_article_modal_response_invalid', 'Platform KB article modal response invalid diagnostic');
  assertIncludes(platformArticleModal, 'ARTICLE_CONTEXTUAL_HELP_REFRESH_FAILED', 'Platform KB article contextual help refresh fixed warning');
  assertIncludes(platformArticleModal, 'answerlattice_article_summary_refresh_after_update_failed', 'Platform KB article update summary refresh diagnostic');
  assertIncludes(platformArticleModal, 'answerlattice_article_summary_refresh_after_create_failed', 'Platform KB article create summary refresh diagnostic');
  assertIncludes(platformArticleModal, 'platform_kb_article_update_rejected', 'Platform KB article update rejection code');
  assertIncludes(platformArticleModal, 'platform_kb_article_create_rejected', 'Platform KB article create rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_article_update_rejected', 'KB generation review article update rejection code');
  assertIncludes(kbGenerationReviewModal, 'answerlattice_kb_generation_summary_refresh_after_publish_failed', 'KB generation publish summary refresh diagnostic');
  assertIncludes(platformArticlePane, 'platform_kb_bulk_article_status_update_rejected', 'Platform KB bulk article status rejection code');
  assertIncludes(platformArticlePane, 'assertKnowledgeBaseArticleBulkStatusUpdateSucceeded', 'Platform KB bulk article status caller acknowledgement guard');
  assertIncludes(platformCategoryModal, 'platform_kb_category_create_rejected', 'Platform KB category create rejection code');
  assertIncludes(platformCategoryModal, 'platform_kb_category_update_rejected', 'Platform KB category update rejection code');
  assertIncludes(platformCategoryModal, 'assertKnowledgeBaseCategoryWriteSucceeded', 'Platform KB category caller acknowledgement guard');
  assertIncludes(platformSectionModal, 'platform_kb_section_create_rejected', 'Platform KB section create rejection code');
  assertIncludes(platformSectionModal, 'platform_kb_section_update_rejected', 'Platform KB section update rejection code');
  assertIncludes(platformSectionModal, 'assertKnowledgeBaseCategoryWriteSucceeded', 'Platform KB section caller acknowledgement guard');
  assertIncludes(platformKnowledgeBase, 'platform_kb_article_parent_update_rejected', 'Platform KB article parent update rejection code');
  assertIncludes(platformKnowledgeBase, 'platform_kb_article_parent_delete_rejected', 'Platform KB article parent delete rejection code');
  assertIncludes(platformKnowledgeBase, 'platform_kb_section_delete_category_update_rejected', 'Platform KB section delete category update rejection code');
  assertIncludes(platformKnowledgeBase, 'platform_kb_category_delete_rejected', 'Platform KB category delete rejection code');
  assertIncludes(platformKnowledgeBase, 'assertKnowledgeBaseCategoriesMutationSucceeded', 'Platform KB categories mutation caller acknowledgement guard');
  assertIncludes(platformKnowledgeBase, 'assertKnowledgeBaseCategoryWriteSucceeded', 'Platform KB category update caller acknowledgement guard');
  assertIncludes(kbGenerationUploadModal, 'kb_generation_upload_job_create_rejected', 'KB generation upload job create rejection code');
  assertIncludes(kbGenerationUploadModal, 'assertIngestionJobWriteSucceeded', 'KB generation upload job caller acknowledgement guard');
  assertIncludes(kbGenerationJobCard, 'kb_generation_job_card_delete_rejected', 'KB generation job card delete rejection code');
  assertIncludes(kbGenerationJobCard, 'kb_generation_job_card_retry_rejected', 'KB generation job card retry rejection code');
  assertIncludes(kbGenerationJobCard, 'kb_generation_job_card_cancel_rejected', 'KB generation job card cancel rejection code');
  assertIncludes(kbGenerationJobCard, 'assertIngestionJobDeleteSucceeded', 'KB generation job card delete caller acknowledgement guard');
  assertIncludes(kbGenerationJobCard, 'assertIngestionJobWriteSucceeded', 'KB generation job card write caller acknowledgement guard');
  assertIncludes(kbGenerationJobActionMenu, 'kb_generation_job_history_delete_rejected', 'KB generation job history delete rejection code');
  assertIncludes(kbGenerationJobActionMenu, 'assertIngestionJobDeleteSucceeded', 'KB generation job history delete caller acknowledgement guard');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_category_delete_rejected', 'KB generation review category delete rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_section_delete_rejected', 'KB generation review section delete rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_article_delete_rejected', 'KB generation review article delete rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_category_update_rejected', 'KB generation review category update rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_section_update_rejected', 'KB generation review section update rejection code');
  assertIncludes(kbGenerationReviewModal, 'kb_generation_review_article_job_update_rejected', 'KB generation review article job update rejection code');
  assertIncludes(kbGenerationReviewModal, 'assertIngestionJobWriteSucceeded', 'KB generation review job caller acknowledgement guard');
  assertIncludes(kbGenerationReconciliation, 'kb_generation_reconciliation_discard_job_update_rejected', 'KB generation reconciliation discard job update rejection code');
  assertIncludes(kbGenerationReconciliation, 'kb_generation_reconciliation_replace_job_update_rejected', 'KB generation reconciliation replace job update rejection code');
  assertIncludes(kbGenerationReconciliation, 'kb_generation_reconciliation_keep_both_job_update_rejected', 'KB generation reconciliation keep-both job update rejection code');
  assertIncludes(kbGenerationReconciliation, 'assertIngestionJobWriteSucceeded', 'KB generation reconciliation job caller acknowledgement guard');
  assertIncludes(platformKnowledgeBase, 'platform_kb_article_delete_rejected', 'Platform KB article delete rejection code');
  assertIncludes(platformKnowledgeBase, 'platform_kb_section_article_delete_rejected', 'Platform KB section article delete rejection code');
  assertIncludes(platformKnowledgeBase, 'platform_kb_category_article_delete_rejected', 'Platform KB category article delete rejection code');
  assertIncludes(kbGenerationReconciliation, 'kb_generation_reconciliation_article_delete_rejected', 'KB generation reconciliation article delete rejection code');
  assertNotIncludes(knowledgeBaseArticles, 'markFaqsNeedReviewForArticle({ id: data.id as string, tId: data.tId, sId: data.sId }).catch(() => undefined);', 'Answerlattice article FAQ review marker silent catch');
  assertNotIncludes(knowledgeBaseArticles, 'archiveFaqsForArticle({ id, tId: articleData?.tId, sId: articleData?.sId }).catch(() => undefined);', 'Answerlattice article FAQ archive silent catch');
  assertNotIncludes(platformArticleModal, 'rebuildProductSurfaceContentSummary().catch(() => undefined);', 'Platform KB article summary refresh silent catch');
  assertNotIncludes(platformArticleModal, 'message.error(error?.message ||', 'Platform KB article raw FAQ refresh failure copy');
  assertNotIncludes(platformArticleModal, 'response.json().catch(() => ({}))', 'Platform KB article FAQ direct JSON fallback');
  assertNotIncludes(platformArticleModal, 'embeddingRes.json().catch(() => ({}))', 'Platform KB article embedding direct JSON fallback');
  assertNotIncludes(platformArticleModal, 'embeddingResult.error', 'Platform KB article raw embedding failure copy');
  assertNotIncludes(kbGenerationReviewModal, 'rebuildProductSurfaceContentSummary().catch(() => undefined);', 'KB generation publish summary refresh silent catch');
  assertIncludes(entity, ".where('tId', '==', Number(scope.tId))", 'Answerlattice entity tenant scope');
  assertIncludes(entity, 'Number(entity.tId) !== Number(scope.tId) || Number(entity.sId) !== Number(scope.sId)', 'Answerlattice entity final scope guard');
  assertIncludes(vectorEmbeddings, 'answerlattice_image_query_generation_failed', 'Answerlattice image query generation failure code');
  assertIncludes(vectorEmbeddings, 'getAnswerlatticeVectorFailureLogData', 'Answerlattice vector failure bounded log data');
  assertIncludes(vectorEmbeddings, 'const GEMINI_RESPONSE_TEXT_MAX_CHARS = 32 * 1024;', 'Answerlattice vector Gemini response text cap');
  assertIncludes(vectorEmbeddings, 'const IMAGE_QUERY_RESPONSE_TEXT_MAX_CHARS = 4 * 1024;', 'Answerlattice vector image-query response text cap');
  assertIncludes(vectorEmbeddings, 'type BoundedGeminiResponseText', 'Answerlattice vector bounded provider response type');
  assertIncludes(vectorEmbeddings, 'text: rawText.slice(0, maxChars)', 'Answerlattice vector provider text is capped');
  assertIncludes(vectorEmbeddings, 'const responseText = getGeminiResponseText(response, IMAGE_QUERY_RESPONSE_TEXT_MAX_CHARS);', 'Answerlattice image query reads capped provider text');
  assertIncludes(vectorEmbeddings, 'providerResponseTextTruncated: responseText.truncated', 'Answerlattice image query logs provider response truncation metadata');
  assertIncludes(vectorEmbeddings, "originalPromptLength: String(userPrompt || '').length", 'Answerlattice image query logs prompt length metadata only');
  assertIncludes(vectorEmbeddings, "throw new Error('Failed to generate search query from image')", 'Answerlattice image query generic failure text');
  assertIncludes(aiSearchModal, 'AI_SEARCH_FAILED_MESSAGE', 'Answerlattice AI search modal fixed failure copy');
  assertIncludes(aiSearchModal, "readHelpCenterSearchResponse(response, 'ai_search_modal')", 'Answerlattice AI search modal bounded response handling');
  assertIncludes(aiSearchModal, 'getHelpCenterSearchClientFailureMessage(error, AI_SEARCH_FAILED_MESSAGE)', 'Answerlattice AI search modal fixed response handling');
  assertNotIncludes(aiSearchModal, '(data as any).error', 'Answerlattice AI search modal must not show raw search route response text');
  assertNotIncludes(aiSearchModal, 'error.message', 'Answerlattice AI search modal must not show raw browser exception text');
  assertIncludes(helpChatApi, "readHelpCenterSearchResponse(response, 'help_chat')", 'Answerlattice HelpChat API bounded response handling');
  assertNotIncludes(helpChatApi, '(data as any).error', 'Answerlattice HelpChat API must not throw raw search route response text');
  assertIncludes(aiSearchHistoryDal, 'assertAiSearchHistoryFeedbackUpdateSucceeded', 'Answerlattice search-history feedback acknowledgement guard');
  assertIncludes(aiSearchHistoryDal, 'satisfies AiSearchHistoryFeedbackUpdateResult', 'Answerlattice search-history feedback explicit result');
  assertIncludes(chatSessionsDal, 'assertChatSessionSaveSucceeded', 'Answerlattice chat sessions DAL save acknowledgement guard');
  assertIncludes(chatSessionsDal, 'assertChatSessionUpdateSucceeded', 'Answerlattice chat sessions DAL update acknowledgement guard');
  assertIncludes(chatSessionsDal, 'assertChatMessageFeedbackUpdateSucceeded', 'Answerlattice chat message feedback acknowledgement guard');
  assertIncludes(chatSessionsDal, 'assertChatSessionBatchMetadataUpdateSucceeded', 'Answerlattice chat session batch metadata acknowledgement guard');
  assertIncludes(chatSessionsDal, 'assertChatSessionInternalNoteUpdateSucceeded', 'Answerlattice chat session internal note acknowledgement guard');
  assertIncludes(chatSessionsDal, 'assertChatSessionDeleteSucceeded', 'Answerlattice chat session delete acknowledgement guard');
  assertIncludes(chatSessionsDal, 'satisfies ChatSessionUpdateResult', 'Answerlattice chat session update explicit result');
  assertIncludes(chatSessionsDal, 'satisfies ChatMessageFeedbackUpdateResult', 'Answerlattice chat message feedback explicit result');
  assertIncludes(chatSessionsDal, 'satisfies ChatSessionBatchMetadataUpdateResult', 'Answerlattice chat session batch metadata explicit result');
  assertIncludes(chatSessionsDal, 'satisfies ChatSessionInternalNoteUpdateResult', 'Answerlattice chat session internal note explicit result');
  assertIncludes(chatSessionsDal, 'satisfies ChatSessionDeleteResult', 'Answerlattice chat session delete explicit result');
  assertIncludes(chatSessionsDal, 'CHAT_SESSION_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;', 'Answerlattice chat session exact numeric scope helper');
  assertIncludes(chatSessionsDal, 'normalizeChatSessionScopeDocumentId', 'Answerlattice chat session scope normalizer');
  assertIncludes(chatSessionsDal, 'documentId !== raw', 'Answerlattice chat session scope must not trim mutated IDs');
  assertIncludes(chatSessionsDal, '!isValidFirestoreDocumentId(documentId)', 'Answerlattice chat session scope Firestore document ID guard');
  assertIncludes(chatSessionsDal, 'const sessionScope = getChatSessionScope(session);', 'Answerlattice chat session reads require normalized session scope');
  assertIncludes(chatSessionsDal, 'session: scopedSession', 'Answerlattice chat image upload path uses normalized scope');
  assertIncludes(chatSessionsDal, "where('tId', '==', sessionScope.tId)", 'Answerlattice chat session reads use normalized tenant scope');
  assertIncludes(chatSessionsDal, "where('sId', '==', sessionScope.sId)", 'Answerlattice chat session reads use normalized store scope');
  assertNotIncludes(chatSessionsDal, "where('tId', '==', session.tId)", 'Answerlattice chat session reads must not query raw session tenant scope');
  assertNotIncludes(chatSessionsDal, "where('sId', '==', session.sId)", 'Answerlattice chat session reads must not query raw session store scope');
  assertNotIncludes(chatSessionsDal, 'const tenantId = Number(session?.tId);', 'Answerlattice chat image upload must not numeric-coerce raw tenant scope');
  assertNotIncludes(chatSessionsDal, 'const storeId = Number(session?.sId);', 'Answerlattice chat image upload must not numeric-coerce raw store scope');
  assertIncludes(helpCenterImpl, 'Answerlattice chat session scope boundary', 'Help Center impl docs must document Answerlattice chat session scope boundary.');
  assertIncludes(helpCenterFirebase, 'Chat session scope hardening is cost-neutral', 'Help Center Firebase docs must document Answerlattice chat session scope cost boundary.');
  assertIncludes(productionAudit, 'Answerlattice chat session scope boundary checkpoint: fixed in source.', 'Production readiness audit must document Answerlattice chat session scope hardening.');
  assertIncludes(changelog, 'Answerlattice Chat Session Scope Boundary', 'Changelog must document Answerlattice chat session scope hardening.');
  assertIncludes(helpChatApi, 'help_chat_search_history_feedback_update_rejected', 'HelpChat search-history feedback update rejection code');
  assertIncludes(helpChatApi, 'help_chat_message_feedback_update_rejected', 'HelpChat message feedback update rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_new_session_save_rejected', 'HelpChat new session save rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_message_append_session_update_rejected', 'HelpChat existing-session append update rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_retry_regenerate_session_update_rejected', 'HelpChat regenerate retry update rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_retry_error_session_update_rejected', 'HelpChat error retry update rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_rename_session_update_rejected', 'HelpChat rename update rejection code');
  assertIncludes(helpChatHandlers, 'help_chat_session_delete_rejected', 'HelpChat delete session rejection code');
  assertIncludes(helpChatHandlers, 'const previousActiveSessionId = activeSessionId;', 'HelpChat delete rollback active session snapshot');
  assertIncludes(helpChatHandlers, 'const previousSearchQuery = searchQuery;', 'HelpChat delete rollback search query snapshot');
  assertIncludes(platformConversationDetail, 'platform_chat_metadata_session_update_rejected', 'Platform chat metadata update rejection code');
  assertIncludes(platformConversationDrawer, 'platform_chat_drawer_internal_note_update_rejected', 'Platform conversation drawer note update rejection code');
  assertIncludes(platformConversationsList, 'platform_chat_batch_status_update_rejected', 'Platform conversation batch status update rejection code');
  assertIncludes(platformConversationsList, "import { escapeCSVValue } from '@util/exportUtils';", 'Platform conversation CSV export must use the shared CSV cell sanitizer.');
  assertIncludes(platformConversationsList, "].map(escapeCSVValue).join(',')", 'Platform conversation CSV export must sanitize header cells.');
  assertIncludes(platformConversationsList, "].map(escapeCSVValue);", 'Platform conversation CSV export must sanitize row cells.');
  assertNotIncludes(platformConversationsList, 'const escapeCSV =', 'Platform conversation CSV export must not keep private CSV escaping.');
  assertIncludes(chatMonitoringImpl, 'Conversation CSV spreadsheet formula boundary', 'Chat Monitoring docs must document conversation CSV spreadsheet formula hardening.');
  assertIncludes(productionAudit, 'Answerlattice conversation CSV spreadsheet formula boundary checkpoint: fixed in source.', 'Production readiness audit must document Answerlattice conversation CSV spreadsheet formula hardening.');
  assertIncludes(changelog, 'Answerlattice Conversation CSV Spreadsheet Formula Boundary', 'Changelog must document Answerlattice conversation CSV spreadsheet formula hardening.');
  assertIncludes(platformTeamNoteModal, 'platform_chat_team_note_update_rejected', 'Platform team note update rejection code');
  assertIncludes(platformWeeklyDigest, 'WEEKLY_DIGEST_RESPONSE_JSON_MAX_BYTES', 'Platform weekly digest response cap');
  assertIncludes(platformWeeklyDigest, 'WEEKLY_DIGEST_GENERATE_REQUEST_POLICY', 'Platform weekly digest generation request policy');
  assertIncludes(platformWeeklyDigest, "cache: 'no-store'", 'Platform weekly digest generation bypasses browser cache');
  assertIncludes(platformWeeklyDigest, "credentials: 'same-origin'", 'Platform weekly digest generation keeps credentials same-origin');
  assertIncludes(platformWeeklyDigest, "redirect: 'manual'", 'Platform weekly digest generation does not follow redirects');
  assertIncludes(platformWeeklyDigest, '...WEEKLY_DIGEST_GENERATE_REQUEST_POLICY', 'Platform weekly digest generation applies request policy');
  assertIncludes(platformWeeklyDigest, 'readJsonResponseWithLimit<unknown>', 'Platform weekly digest bounded response parser');
  assertIncludes(platformWeeklyDigest, 'isWeeklyDigestGenerateResponse', 'Platform weekly digest response guard');
  assertIncludes(platformWeeklyDigest, 'platform_weekly_digest_generate_response_parse_failed', 'Platform weekly digest response parse diagnostic');
  assertIncludes(platformWeeklyDigest, 'platform_weekly_digest_generate_response_rejected', 'Platform weekly digest response rejected diagnostic');
  assertIncludes(platformWeeklyDigest, 'platform_weekly_digest_generate_response_invalid', 'Platform weekly digest response invalid diagnostic');
  assertIncludes(platformWeeklyDigest, "result.status === 'no_data'", 'Platform weekly digest no-data response acknowledgement');
  assertNotIncludes(platformWeeklyDigest, 'response.json().catch(() => null)', 'Platform weekly digest rejected direct JSON fallback');
  assertNotIncludes(platformWeeklyDigest, 'const result = await response.json();', 'Platform weekly digest success direct JSON fallback');
  assertNotIncludes(platformWeeklyDigest, "result.data?.status === 'no_data'", 'Platform weekly digest stale no-data response path');
  assertIncludes(platformRoiCalculator, 'ROI_METRICS_RESPONSE_JSON_MAX_BYTES', 'Platform ROI metrics response cap');
  assertIncludes(platformRoiCalculator, 'ROI_METRICS_REQUEST_POLICY', 'Platform ROI metrics request policy');
  assertIncludes(platformRoiCalculator, "cache: 'no-store'", 'Platform ROI metrics request bypasses browser cache');
  assertIncludes(platformRoiCalculator, "credentials: 'same-origin'", 'Platform ROI metrics request keeps credentials same-origin');
  assertIncludes(platformRoiCalculator, "redirect: 'manual'", 'Platform ROI metrics request does not follow redirects');
  assertIncludes(platformRoiCalculator, 'ROI_METRICS_REQUEST_POLICY)', 'Platform ROI metrics fetch applies request policy');
  assertIncludes(platformRoiCalculator, 'readJsonResponseWithLimit<unknown>', 'Platform ROI metrics bounded response parser');
  assertIncludes(platformRoiCalculator, 'isRoiMetricsApiResponse', 'Platform ROI metrics response guard');
  assertIncludes(platformRoiCalculator, 'platform_roi_metrics_response_parse_failed', 'Platform ROI metrics response parse diagnostic');
  assertIncludes(platformRoiCalculator, 'platform_roi_metrics_response_rejected', 'Platform ROI metrics response rejected diagnostic');
  assertIncludes(platformRoiCalculator, 'platform_roi_metrics_response_invalid', 'Platform ROI metrics response invalid diagnostic');
  assertIncludes(platformRoiCalculator, 'copyRoiShareTextToClipboard', 'Platform ROI share copy acknowledgement helper');
  assertIncludes(platformRoiCalculator, 'platform_roi_share_copy_clipboard_unavailable', 'Platform ROI share unavailable clipboard failure code');
  assertIncludes(platformRoiCalculator, 'platform_roi_share_copy_fallback_failed', 'Platform ROI share failed fallback clipboard failure code');
  assertIncludes(platformRoiCalculator, 'copyAnswerlatticeSupportTextToClipboard', 'Platform ROI share shared support clipboard helper');
  assertIncludes(platformRoiCalculator, 'platform_roi_share_copy_failed', 'Platform ROI share copy failure diagnostic');
  assertIncludes(platformRoiCalculator, 'hasClipboardWrite', 'Platform ROI share copy clipboard support metadata');
  assertIncludes(platformRoiCalculator, 'hasCopyFallback', 'Platform ROI share copy fallback support metadata');
  assertNotIncludes(platformRoiCalculator, 'navigator.clipboard.writeText(shareText);\n        message.success', 'Platform ROI share copy direct clipboard success path');
  assertIncludes(platformRoiCalculator, 'paybackPeriod: number | null', 'Platform ROI metrics nullable payback type');
  assertIncludes(platformRoiCalculator, 'value.paybackPeriod === null', 'Platform ROI metrics nullable payback guard');
  assertIncludes(platformRoiCalculator, 'formatPayback = (months: number | null)', 'Platform ROI metrics nullable payback display');
  assertNotIncludes(platformRoiCalculator, 'const result = await response.json();', 'Platform ROI metrics direct JSON fallback');
  assertNotIncludes(platformRoiCalculator, "throw new Error('Failed to fetch ROI metrics')", 'Platform ROI metrics raw fetch failure');
  assertNotIncludes(platformRoiCalculator, "message.error('Failed to calculate ROI metrics. Please try again')", 'Platform ROI metrics inline failure copy');
  assertNotIncludes(helpChatHandlers, 'return [savedSession as ChatSession, ...withoutTemp];', 'HelpChat new session save must not cast unchecked save results into local state');
  assertNotIncludes(vectorEmbeddings, 'data: { error: error.message }', 'Answerlattice vector raw image-query error log');
  assertNotIncludes(vectorEmbeddings, 'data: { originalPrompt: userPrompt, generatedQuery: text }', 'Answerlattice vector raw image-query success log');
  assertNotIncludes(vectorEmbeddings, 'Failed to generate search query from image: ${error.message}', 'Answerlattice vector raw image-query throw');
  assertNotIncludes(vectorEmbeddings, 'const text = getGeminiResponseText(response);', 'Answerlattice vector direct provider text assignment');
  assertIncludes(helpCenterSearch, 'answerlattice_search_operation_log_failed', 'Answerlattice search operation log failure code');
  assertIncludes(helpCenterSearch, 'answerlattice_help_center_search_failed', 'Answerlattice help center search failure code');
  assertIncludes(helpCenterSearch, 'getHelpCenterSearchFailureLogData', 'Answerlattice help center bounded failure log data');
  assertNotIncludes(helpCenterSearch, 'error: error instanceof Error ? error.message', 'Answerlattice help center raw operation log error');
  assertNotIncludes(helpCenterSearch, 'error: err.message', 'Answerlattice help center raw search error log');
}

function verifyHostedHelpRegistryTruth() {
  const server = read('src/lib/answerlattice/hostedHelpServer.ts');
  const settings = read('src/app/api/answerlattice/hosted-help-settings/route.ts');
  const vercelDomains = read('src/lib/domains/vercelDomains.ts');
  const hostedHelpFirebase = read('__docs__/answerlattice/hosted-help/hosted-help_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const page = read('src/app/answerlattice-hosted-help/[[...segments]]/page.tsx');
  const client = read('src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx');
  const publicRichText = read('src/lib/answerlattice/publicRichText.ts');

  assertIncludes(server, "String(data.pId || '') !== PRODUCT_IDS.ANSWERLATTICE", 'Answerlattice hosted-help registry product guard');
  assertNotIncludes(server, 'String(data.pId || PRODUCT_IDS.ANSWERLATTICE)', 'Answerlattice hosted-help registry product guard');
  assertIncludes(settings, 'registryScopeMatches', 'Answerlattice hosted-help registry scope helper');
  assertIncludes(settings, 'removedRegistryByDomain', 'Answerlattice hosted-help removed-domain scope snapshot');
  assertIncludes(settings, "logRuntimeFailure('answerlattice_hosted_help_registry_delete_scope_mismatch'", 'Answerlattice hosted-help scoped delete bounded diagnostic');
  assertIncludes(settings, '...getHostedHelpProviderErrorContext(addResult.data)', 'Answerlattice hosted-help provider failure flattened log context');
  assertIncludes(settings, 'providerMessagePresent: message.length > 0', 'Answerlattice hosted-help provider failure records message presence only');
  assertIncludes(settings, 'providerMessageLength: message.length', 'Answerlattice hosted-help provider failure records message length only');
  assertIncludes(settings, '{ error: getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE) }', 'Answerlattice hosted-help generic provider failure response');
  assertIncludes(settings, 'getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE)', 'Answerlattice hosted-help generic provider status message');
  assertIncludes(vercelDomains, 'VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS', 'Answerlattice hosted-help Vercel helper provider timeout');
  assertIncludes(vercelDomains, 'const controller = new AbortController();', 'Answerlattice hosted-help Vercel helper abort controller');
  assertIncludes(vercelDomains, 'setTimeout(() => controller.abort(), VERCEL_DOMAIN_PROVIDER_TIMEOUT_MS)', 'Answerlattice hosted-help Vercel helper timeout abort');
  assertIncludes(vercelDomains, 'signal: controller.signal', 'Answerlattice hosted-help Vercel helper timeout signal');
  assertIncludes(vercelDomains, 'clearTimeout(timeout)', 'Answerlattice hosted-help Vercel helper timeout cleanup');
  assertIncludes(vercelDomains, 'VERCEL_DOMAIN_PROVIDER_RESPONSE_PARSE_FAILED', 'Answerlattice hosted-help Vercel helper fixed response-parse diagnostic code');
  assertIncludes(vercelDomains, 'readVercelDomainResponseData<T>(response, path, options)', 'Answerlattice hosted-help Vercel helper guarded response parser');
  assertIncludes(vercelDomains, 'getVercelProviderPathContext(path, options, response)', 'Answerlattice hosted-help Vercel helper bounded parse context');
  assertIncludes(vercelDomains, 'pathLength: path.length', 'Answerlattice hosted-help Vercel helper records path length only');
  assertIncludes(vercelDomains, 'responseStatus: response.status', 'Answerlattice hosted-help Vercel helper records provider response status');
  assertNotIncludes(vercelDomains, 'readJsonResponseWithLimit<T>(response, VERCEL_DOMAIN_RESPONSE_JSON_MAX_BYTES).catch(() => ({} as T))', 'Answerlattice hosted-help Vercel helper silent bounded parser fallback');
  [
    [hostedHelpFirebase, 'Answerlattice hosted-help Firebase docs'],
    [productionAudit, 'production audit'],
    [changelog, 'changelog'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'Vercel domain provider response', `${label} documents Vercel provider response parse boundary`);
    assertIncludes(content, 'vercel_domain_provider_response_parse_failed', `${label} documents Vercel provider response parse diagnostic`);
    assertIncludes(content, 'path presence/length', `${label} documents bounded provider path metadata`);
  });
  assertNotIncludes(settings, 'providerMessage:', 'Answerlattice hosted-help provider failure must not log raw provider messages');
  assertNotIncludes(settings, 'getProviderErrorMessage', 'Answerlattice hosted-help provider failure must not keep raw provider message helper');
  assertNotIncludes(settings, 'getClientErrorMessage', 'Answerlattice hosted-help raw provider error response helper');
  assertIncludes(page, 'normalizeArticleSlug', 'Answerlattice hosted-help article slug normalization');
  assertIncludes(page, 'segments.slice(1)', 'Answerlattice hosted-help nested article route support');
  assertIncludes(page, 'safeHtml: renderPublicTiptapHtml(article.content)', 'Answerlattice hosted-help article HTML must come from the public TipTap sanitizer');
  assertIncludes(client, 'normalizeArticleSlug(article.url || article.id)', 'Answerlattice hosted-help article href normalization');
  assertIncludes(client, 'encodeURIComponent(slug)', 'Answerlattice hosted-help article href escaping');
  assertIncludes(client, "dangerouslySetInnerHTML={{ __html: article.safeHtml || '' }}", 'Answerlattice hosted-help client must render only server-sanitized article HTML');
  assertIncludes(publicRichText, 'const escapeHtml = (value: unknown) => String(value ?? \'\')', 'Answerlattice public rich text renderer must escape text');
  assertIncludes(publicRichText, ".replace(/</g, '&lt;')", 'Answerlattice public rich text renderer must escape opening angle brackets');
  assertIncludes(publicRichText, ".replace(/\"/g, '&quot;')", 'Answerlattice public rich text renderer must escape attribute quotes');
  assertIncludes(publicRichText, "if (href.startsWith('//')) return '';", 'Answerlattice public rich text renderer must reject protocol-relative links');
  assertIncludes(publicRichText, "if (/^(https?:|mailto:|tel:)/i.test(href)) return href;", 'Answerlattice public rich text renderer must allow only expected link schemes');
  assertIncludes(publicRichText, "return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : '';", 'Answerlattice public rich text renderer must allow only hex text colors');
  assertIncludes(publicRichText, 'const src = safeImageSrc(node.attrs?.src);', 'Answerlattice public rich text renderer must sanitize image sources');
  assertIncludes(publicRichText, 'default:\n            return renderChildren(node);', 'Answerlattice public rich text renderer must drop unknown nodes and render only escaped children');
  assertNotIncludes(client, 'dangerouslySetInnerHTML={{ __html: article.content', 'Answerlattice hosted-help client must not render raw article content');
  assertNotIncludes(publicRichText, 'return String(value || value)', 'Answerlattice public rich text renderer must not return raw rich-text values');
}

function verifyKnowledgeIntakePublishRecovery() {
  const intake = read('src/lib/answerlattice/knowledgeIntake.ts');
  const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const hook = read('src/hooks/answerlattice/useKnowledgeIntake.ts');
  const component = read('src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx');
  const platformMonitor = read('src/components/templates/main-app/platform/answerlatticeIntakeMonitor/index.tsx');
  const platformMonitorRoute = read('src/app/api/platform/answerlattice-intake/route.ts');

  assertIncludes(intakeApi, 'requireAnswerlatticePermission', 'Answerlattice knowledge intake permission gate');
  assertIncludes(intakeApi, 'requireActiveLicense', 'Answerlattice knowledge intake paid license gate');
  assertIncludes(intake, 'await refreshJobCounters(scope, normalizedJobId).catch', 'Answerlattice partial publish counter recovery');
  assertIncludes(intake, 'Public cache revalidation failed after partial publish failure', 'Answerlattice partial publish cache recovery');
  assertIncludes(intake, 'published.length > 0', 'Answerlattice partial publish status branch');
  assertIncludes(intake, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS.REVIEWING', 'Answerlattice partial publish retryable status');
  assertIncludes(intake, 'getKnowledgeIntakePublishFailureMessage(published.length)', 'Answerlattice partial publish bounded owner-visible status');
  assertIncludes(intake, 'ANSWERLATTICE_INTAKE_MEDIA_REFUND_FAILURE_REASON', 'Answerlattice intake media refund bounded reason');
  assertIncludes(intake, "revalidateAnswerlatticePublicCache(scope.tId, scope.sId, segment)", 'Answerlattice public cache revalidation');
  assertIncludes(intake, "'URL response body could not be streamed safely.'", 'Answerlattice intake URL discovery no-stream fail-closed copy');
  assertOrder(
    intake,
    [
      'if (!response.body)',
      "const contentLengthHeader = response.headers.get('content-length');",
      'if (response.status === 204 || contentLength === 0)',
      "throw new Error('URL response body could not be streamed safely.');",
      'const bytes = Buffer.from(await response.arrayBuffer());',
      'if (bytes.byteLength > maxBytes)',
      "throw new Error('URL content is too large for bounded intake.');",
    ],
    'Answerlattice intake URL discovery no-stream response must prove a safe content-length before arrayBuffer fallback',
  );
  assertOrder(
    intake,
    [
      'const reader = response.body.getReader();',
      'const remaining = maxBytes - totalBytes;',
      'await reader.cancel();',
    ],
    'Answerlattice intake URL discovery streaming response must cancel after the cap',
  );
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_JOBS_LOAD_FAILED', 'Answerlattice intake hook fixed jobs-load copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_JOB_LOAD_FAILED', 'Answerlattice intake hook fixed job-load copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_JOB_CREATE_FAILED', 'Answerlattice intake hook fixed job-create copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_SOURCE_ADD_FAILED', 'Answerlattice intake hook fixed source-add copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_MEDIA_SOURCE_EXTRACT_FAILED', 'Answerlattice intake hook fixed media-extract copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_LINKS_DISCOVER_FAILED', 'Answerlattice intake hook fixed link-discover copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_ENTITIES_SEARCH_FAILED', 'Answerlattice intake hook fixed entity-search copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_REVIEW_DRAFTS_GENERATE_FAILED', 'Answerlattice intake hook fixed draft-generate copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_REVIEW_ITEM_UPDATE_FAILED', 'Answerlattice intake hook fixed review-update copy');
  assertIncludes(hook, 'ANSWERLATTICE_INTAKE_ITEMS_PUBLISH_FAILED', 'Answerlattice intake hook fixed publish copy');
  assertIncludes(hook, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY', 'Answerlattice intake hook shared request policy');
  assertIncludes(hook, "cache: 'no-store'", 'Answerlattice intake hook requests bypass browser cache');
  assertIncludes(hook, "credentials: 'same-origin'", 'Answerlattice intake hook requests keep credentials same-origin');
  assertIncludes(hook, "redirect: 'manual'", 'Answerlattice intake hook requests do not follow redirects');
  assert((hook.match(/\.\.\.ANSWERLATTICE_KNOWLEDGE_INTAKE_REQUEST_POLICY/g) || []).length >= 2, 'Answerlattice intake hook JSON and media requests must apply the shared request policy');
  assertIncludes(hook, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_RESPONSE_JSON_MAX_BYTES', 'Answerlattice intake hook response cap');
  assertIncludes(hook, 'readJsonResponseWithLimit<unknown>', 'Answerlattice intake hook bounded response parser');
  assertIncludes(hook, 'isKnowledgeIntakeJobsResponse', 'Answerlattice intake jobs response guard');
  assertIncludes(hook, 'isKnowledgeIntakeBundleResponse', 'Answerlattice intake bundle response guard');
  assertIncludes(hook, 'isKnowledgeIntakeJobResponse', 'Answerlattice intake job response guard');
  assertIncludes(hook, 'isKnowledgeIntakeSourceResponse', 'Answerlattice intake source response guard');
  assertIncludes(hook, 'isKnowledgeIntakeMediaSourceResponse', 'Answerlattice intake media response guard');
  assertIncludes(hook, 'isKnowledgeIntakeDiscoverLinksResponse', 'Answerlattice intake discover-links response guard');
  assertIncludes(hook, 'isKnowledgeIntakeEntitiesResponse', 'Answerlattice intake entities response guard');
  assertIncludes(hook, 'isKnowledgeIntakeAnalyzeResponse', 'Answerlattice intake analyze response guard');
  assertIncludes(hook, 'isKnowledgeIntakeReviewItemResponse', 'Answerlattice intake review-item response guard');
  assertIncludes(hook, 'isKnowledgeIntakePublishResponse', 'Answerlattice intake publish response guard');
  assertIncludes(hook, 'answerlattice_knowledge_intake_response_parse_failed', 'Answerlattice intake response parse diagnostic');
  assertIncludes(hook, 'answerlattice_knowledge_intake_response_rejected', 'Answerlattice intake response rejected diagnostic');
  assertIncludes(hook, 'answerlattice_knowledge_intake_response_invalid', 'Answerlattice intake response invalid diagnostic');
  assertIncludes(component, 'ANSWERLATTICE_INTAKE_ENTITY_SEARCH_FAILED', 'Answerlattice intake component fixed entity-search copy');
  assertIncludes(component, 'ANSWERLATTICE_INTAKE_URL_INSPECT_FAILED', 'Answerlattice intake component fixed URL-inspect copy');
  assertIncludes(platformMonitor, 'ANSWERLATTICE_INTAKE_MONITOR_LOAD_FAILED', 'Answerlattice intake monitor fixed load copy');
  assertIncludes(platformMonitor, 'ANSWERLATTICE_INTAKE_MONITOR_RETRY_FAILED', 'Answerlattice intake monitor fixed retry copy');
  assertIncludes(platformMonitor, 'ANSWERLATTICE_INTAKE_MONITOR_RESPONSE_JSON_MAX_BYTES', 'Answerlattice intake monitor response cap');
  assertIncludes(platformMonitor, 'readIntakeMonitorResponse', 'Answerlattice intake monitor shared response acknowledgement helper');
  assertIncludes(platformMonitor, 'readJsonResponseWithLimit<unknown>', 'Answerlattice intake monitor bounded response parser');
  assertIncludes(platformMonitor, 'isIntakeMonitorSnapshot', 'Answerlattice intake monitor snapshot response guard');
  assertIncludes(platformMonitor, 'isIntakeMonitorRetryResponse', 'Answerlattice intake monitor retry response guard');
  assertIncludes(platformMonitor, 'isIntakeMonitorRetryResult', 'Answerlattice intake monitor retry result response guard');
  assertIncludes(platformMonitor, 'isIntakeMonitorRetryTask', 'Answerlattice intake monitor retry task response guard');
  assertIncludes(platformMonitor, "logRuntimeFailure('answerlattice_intake_monitor_response_parse_failed'", 'Answerlattice intake monitor response parse diagnostic');
  assertIncludes(platformMonitor, "logRuntimeFailure('answerlattice_intake_monitor_response_rejected'", 'Answerlattice intake monitor response rejected diagnostic');
  assertIncludes(platformMonitor, "logRuntimeFailure('answerlattice_intake_monitor_response_invalid'", 'Answerlattice intake monitor response invalid diagnostic');
  assertIncludes(platformMonitor, 'getManualRetryStatusLabel(data)', 'Answerlattice intake monitor guarded retry status label');
  assertIncludes(platformMonitorRoute, 'ANSWERLATTICE_MANUAL_TRIGGER_RESPONSE_MAX_BYTES', 'Answerlattice intake monitor manual trigger response cap');
  assertIncludes(platformMonitorRoute, 'readManualTriggerResponse(response, { tId, sId })', 'Answerlattice intake monitor bounded manual trigger response parser');
  assertIncludes(platformMonitorRoute, 'summarizeManualTriggerResult(payload)', 'Answerlattice intake monitor manual trigger result sanitizer');
  assertIncludes(platformMonitorRoute, 'buildRejectedManualTriggerResult(response)', 'Answerlattice intake monitor rejected trigger result sanitizer');
  assertIncludes(platformMonitorRoute, "logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_response_parse_failed'", 'Answerlattice intake monitor manual trigger response parse diagnostic');
  assertIncludes(platformMonitorRoute, "logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_response_invalid'", 'Answerlattice intake monitor manual trigger response invalid diagnostic');
  assertIncludes(platformMonitorRoute, "error: 'Answerlattice nightly retry failed.'", 'Answerlattice intake monitor route fixed retry failure copy');
  assertIncludes(platformMonitorRoute, "error: 'Answerlattice nightly retry response was invalid.'", 'Answerlattice intake monitor route fixed invalid trigger response copy');
  assertIncludes(platformMonitorRoute, 'validateServerNetworkTargetUrl', 'Answerlattice intake monitor manual trigger target validation');
  assertIncludes(platformMonitorRoute, 'ANSWERLATTICE_ALLOWED_MANUAL_TRIGGER_HOSTS', 'Answerlattice intake monitor fixed trigger host allowlist');
  assertIncludes(platformMonitorRoute, 'ANSWERLATTICE_MANUAL_TRIGGER_PATH', 'Answerlattice intake monitor fixed trigger path');
  assertIncludes(platformMonitorRoute, 'resolveManualTriggerTarget(triggerUrl)', 'Answerlattice intake monitor trigger resolver');
  assertIncludes(platformMonitorRoute, 'fetch(triggerTarget.normalizedUrl', 'Answerlattice intake monitor normalized trigger fetch');
  assertIncludes(platformMonitorRoute, "redirect: 'manual',", 'Answerlattice intake monitor manual trigger redirect boundary');
  assertIncludes(platformMonitorRoute, "logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_target_rejected'", 'Answerlattice intake monitor target rejection bounded diagnostic');
  assertIncludes(platformMonitorRoute, "logRuntimeFailure('answerlattice_intake_monitor_manual_retry_failed'", 'Answerlattice intake monitor manual retry bounded diagnostic');
  assertIncludes(platformMonitorRoute, "getBoundedRuntimeStringContext('tenantId', tId)", 'Answerlattice intake monitor bounded manual retry tenant metadata');
  assertIncludes(platformMonitorRoute, "getBoundedRuntimeStringContext('storeId', sId)", 'Answerlattice intake monitor bounded manual retry store metadata');
  assertNotIncludes(platformMonitorRoute, 'fetch(triggerUrl,', 'Answerlattice intake monitor raw trigger URL fetch');
  assertNotIncludes(platformMonitorRoute, "secureError('[Answerlattice Intake Monitor] Manual nightly", 'Answerlattice intake monitor raw manual trigger secureError');
  assertNotIncludes(intake, "refundAnswerlatticeIntakeUsage(scope, reservation.ledgerId, error instanceof Error ? error.message", 'Answerlattice intake refund raw exception reason');
  assertNotIncludes(intake, "const message = error instanceof Error ? error.message : 'Publish failed.'", 'Answerlattice intake publish raw exception status');
  assertNotIncludes(intake, 'then stopped: ${message}', 'Answerlattice intake partial publish raw exception suffix');
  assertNotIncludes(hook, 'class KnowledgeIntakeClientError', 'Answerlattice intake hook raw API response wrapper');
  assertNotIncludes(hook, 'getKnowledgeIntakeUiError', 'Answerlattice intake hook helper-derived exception text');
  assertNotIncludes(hook, 'response.json().catch(() => ({}))', 'Answerlattice intake hook direct JSON fallback');
  assertNotIncludes(component, 'getKnowledgeIntakeUiError', 'Answerlattice intake component helper-derived exception text');
  assertNotIncludes(hook, 'data.error', 'Answerlattice intake hook raw API response text');
  assertNotIncludes(hook, '(data as any).error', 'Answerlattice intake hook raw API response text');
  assertNotIncludes(hook, 'err instanceof Error ? err.message', 'Answerlattice intake hook raw exception UI copy');
  assertNotIncludes(hook, 'error?.message', 'Answerlattice intake hook raw exception UI copy');
  assertNotIncludes(hook, 'err?.message', 'Answerlattice intake hook raw exception UI copy');
  assertNotIncludes(component, 'err instanceof Error ? err.message', 'Answerlattice intake component raw exception UI copy');
  assertNotIncludes(component, 'error?.message', 'Answerlattice intake component raw exception UI copy');
  assertNotIncludes(component, 'err?.message', 'Answerlattice intake component raw exception UI copy');
  assertNotIncludes(platformMonitor, 'data?.error', 'Answerlattice intake monitor raw API response text');
  assertNotIncludes(platformMonitor, 'response.json().catch(() => ({}))', 'Answerlattice intake monitor direct JSON fallback');
  assertNotIncludes(platformMonitor, 'await response.json()', 'Answerlattice intake monitor direct JSON parsing');
  assertNotIncludes(platformMonitor, 'result?: Record<string, unknown>', 'Answerlattice intake monitor generic retry result type');
  assertNotIncludes(platformMonitor, 'error?.message', 'Answerlattice intake monitor raw exception UI copy');
  assertNotIncludes(platformMonitorRoute, 'result?.error ||', 'Answerlattice intake monitor route must not return raw callable error text');
  assertNotIncludes(platformMonitorRoute, 'response.json().catch(() => ({}))', 'Answerlattice intake monitor route direct JSON fallback');
}

function verifyKnowledgeIntakeSafeErrorResponses() {
  const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const intakeDiagnostics = read('src/lib/answerlattice/knowledgeIntakeDiagnostics.ts');
  const intakeIdBoundary = read('src/lib/answerlattice/knowledgeIntakeIdBoundary.ts');
  const intakeCore = read('src/lib/answerlattice/knowledgeIntake.ts');
  const intakeImplDoc = read('__docs__/answerlattice/knowledge-intake-command-center/knowledge-intake-command-center_impl.md');
  const intakeFirebaseDoc = read('__docs__/answerlattice/knowledge-intake-command-center/knowledge-intake-command-center_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');
  const routeFiles = listRouteFiles('src/app/api/answerlattice/knowledge-intake');

  assertIncludes(intakeIdBoundary, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/', 'Answerlattice Knowledge Intake job ID pattern');
  assertIncludes(intakeIdBoundary, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_SOURCE_ID_PATTERN = /^kis_[a-f0-9]{28}$/', 'Answerlattice Knowledge Intake source ID pattern');
  assertIncludes(intakeIdBoundary, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_REVIEW_ITEM_ID_PATTERN = /^kii_[a-f0-9]{28}$/', 'Answerlattice Knowledge Intake review item ID pattern');
  assertIncludes(intakeIdBoundary, 'isValidFirestoreDocumentId(documentId)', 'Answerlattice Knowledge Intake ID boundary uses shared Firestore document ID guard');
  assertIncludes(intakeIdBoundary, 'normalizeAnswerlatticeKnowledgeIntakeJobId', 'Answerlattice Knowledge Intake job ID normalizer');
  assertIncludes(intakeIdBoundary, 'normalizeAnswerlatticeKnowledgeIntakeSourceId', 'Answerlattice Knowledge Intake source ID normalizer');
  assertIncludes(intakeIdBoundary, 'normalizeAnswerlatticeKnowledgeIntakeReviewItemId', 'Answerlattice Knowledge Intake review item ID normalizer');
  assertIncludes(intakeCore, 'normalizeAnswerlatticeKnowledgeIntakeJobId', 'Answerlattice Knowledge Intake core imports job ID normalizer');
  assertIncludes(intakeCore, 'normalizeAnswerlatticeKnowledgeIntakeSourceId', 'Answerlattice Knowledge Intake core imports source ID normalizer');
  assertIncludes(intakeCore, 'normalizeAnswerlatticeKnowledgeIntakeReviewItemId', 'Answerlattice Knowledge Intake core imports review item ID normalizer');
  assertIncludes(intakeCore, 'const requireKnowledgeIntakeJobId = (jobId: string)', 'Answerlattice Knowledge Intake core job ID assertion helper');
  assertIncludes(intakeCore, 'const requireKnowledgeIntakeSourceId = (sourceId: string)', 'Answerlattice Knowledge Intake core source ID assertion helper');
  assertIncludes(intakeCore, 'const requireKnowledgeIntakeReviewItemId = (itemId: string)', 'Answerlattice Knowledge Intake core review item ID assertion helper');
  assertIncludes(intakeCore, 'const jobRef = (jobId: string) => db.collection(JOBS).doc(requireKnowledgeIntakeJobId(jobId));', 'Answerlattice Knowledge Intake core normalized job refs');
  assertIncludes(intakeCore, 'const sourceRef = (sourceId: string) => db.collection(SOURCES).doc(requireKnowledgeIntakeSourceId(sourceId));', 'Answerlattice Knowledge Intake core normalized source refs');
  assertIncludes(intakeCore, 'const reviewItemRef = (itemId: string) => db.collection(REVIEW_ITEMS).doc(requireKnowledgeIntakeReviewItemId(itemId));', 'Answerlattice Knowledge Intake core normalized review item refs');
  assertIncludes(intakeCore, 'const normalizedJobId = requireKnowledgeIntakeJobId(jobId);', 'Answerlattice Knowledge Intake core normalizes job IDs inside service functions');
  assertIncludes(intakeCore, 'const normalizedItemId = requireKnowledgeIntakeReviewItemId(itemId);', 'Answerlattice Knowledge Intake core normalizes review item IDs inside update service');
  assertIncludes(intakeCore, '.map(id => requireKnowledgeIntakeReviewItemId(id));', 'Answerlattice Knowledge Intake core normalizes selected publish item IDs');
  assertNotIncludes(intakeCore, 'const jobRef = (jobId: string) => db.collection(JOBS).doc(jobId);', 'Answerlattice Knowledge Intake core raw job refs');
  assertNotIncludes(intakeCore, 'const sourceRef = (sourceId: string) => db.collection(SOURCES).doc(sourceId);', 'Answerlattice Knowledge Intake core raw source refs');
  assertNotIncludes(intakeCore, 'const reviewItemRef = (itemId: string) => db.collection(REVIEW_ITEMS).doc(itemId);', 'Answerlattice Knowledge Intake core raw review item refs');
  assertNotIncludes(intakeCore, 'const docs = await Promise.all(itemIds.slice(0, ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_PUBLISH_ITEMS).map(id => reviewItemRef(id).get()));', 'Answerlattice Knowledge Intake core raw selected publish item refs');
  assertIncludes(intakeApi, 'ANSWERLATTICE_KNOWLEDGE_INTAKE_CLIENT_ERROR_PATTERNS', 'Answerlattice intake safe client error allowlist');
  assertIncludes(intakeApi, 'getAnswerlatticeKnowledgeIntakeClientErrorMessage', 'Answerlattice intake safe client error helper');
  assertIncludes(intakeApi, 'if (status >= 500 || !(error instanceof Error)) return fallback;', 'Answerlattice intake generic 500 error boundary');
  assertIncludes(intakeApi, 'pattern.test(message)', 'Answerlattice intake client error allowlist enforcement');
  assertIncludes(intakeApi, 'message.match(/^url returned (\\d{3})/)', 'Answerlattice intake URL status classifier');
  assertIncludes(intakeApi, "logger.security('Rate Limit Exceeded - Answerlattice Knowledge Intake'", 'Answerlattice intake shared rate-limit security log');
  assertIncludes(intakeApi, "'Cache-Control': 'private, no-store'", 'Answerlattice intake shared rate-limit no-store response');
  assertIncludes(intakeApi, "'Retry-After': String(waitSeconds)", 'Answerlattice intake shared rate-limit retry header');
  assertIncludes(intakeApi, "'X-RateLimit-Limit': String(options.rateLimit)", 'Answerlattice intake shared rate-limit limit header');
  assertIncludes(intakeApi, "getBoundedAnswerlatticeStringContext('rateLimitKey', options.rateLimitKey)", 'Answerlattice intake shared rate-limit bounded route key');
  assertIncludes(intakeApi, "getBoundedAnswerlatticeStringContext('tenantId', tId)", 'Answerlattice intake shared rate-limit bounded tenant');
  assertIncludes(intakeApi, "getBoundedAnswerlatticeStringContext('storeId', sId)", 'Answerlattice intake shared rate-limit bounded store');
  assertIncludes(intakeDiagnostics, 'getAnswerlatticeKnowledgeIntakeLogContext', 'Answerlattice intake bounded diagnostic helper');
  assertIncludes(intakeDiagnostics, 'logAnswerlatticeKnowledgeIntakeFailure', 'Answerlattice intake fixed-code diagnostic helper');
  assertIncludes(intakeDiagnostics, 'new Error(failureCode)', 'Answerlattice intake diagnostics capture fixed failure codes');
  assertIncludes(intakeDiagnostics, 'getAnswerlatticeKnowledgeIntakeSourceErrorContext(error)', 'Answerlattice intake diagnostics include bounded source metadata');
  assertIncludes(intakeDiagnostics, 'sourceErrorName', 'Answerlattice intake diagnostics include source error name only');
  assertIncludes(intakeDiagnostics, 'sourceErrorCode', 'Answerlattice intake diagnostics include source error code only');
  assertIncludes(intakeDiagnostics, 'sourceStatusCode', 'Answerlattice intake diagnostics include source status code only');
  [
    "getBoundedSecurityStringContext('jobId'",
    "getBoundedSecurityStringContext('itemId'",
    "getBoundedSecurityStringContext('sourceId'",
    "getBoundedSecurityStringContext('ledgerId'",
    "getBoundedSecurityStringContext('articleId'",
    "getBoundedSecurityStringContext('articleTitle'",
    'toSafeLabel',
    'toFiniteNumber',
  ].forEach((token) => {
    assertIncludes(intakeDiagnostics, token, `Answerlattice intake diagnostics helper keeps bounded token ${token}`);
  });

  routeFiles.forEach((relPath) => {
    const route = read(relPath);
    assertNotIncludes(route, 'error instanceof Error ? error.message', `${relPath} raw exception response`);
    assertNotIncludes(route, 'status >= 500 ? \'Failed', `${relPath} conditional raw exception response`);
    assertNotIncludes(route, "secureError('[Answerlattice Intake]", `${relPath} raw intake secureError`);
    assertNotIncludes(route, 'secureError("[Answerlattice Intake]', `${relPath} raw intake secureError`);
    assertNotIncludes(route, 'error as Error', `${relPath} raw exception cast`);
    const intakeDiagnosticCalls = route.match(/secure(?:Log|Error)\('\[Answerlattice Intake\][\s\S]*?\);/g) || [];
    intakeDiagnosticCalls.forEach((call) => {
      assert(call.includes('getAnswerlatticeKnowledgeIntakeLogContext('), `${relPath} must bound Answerlattice intake diagnostic context`);
    });
    const intakeFailureCalls = route.match(/logAnswerlatticeKnowledgeIntakeFailure\('\[Answerlattice Intake\][\s\S]*?\);/g) || [];
    intakeFailureCalls.forEach((call) => {
      assert(call.includes('answerlattice_intake_'), `${relPath} intake failure diagnostic must use a fixed code`);
    });
    if (route.includes('getAnswerlatticeKnowledgeIntakeErrorStatus(error)')) {
      assertIncludes(route, 'getAnswerlatticeKnowledgeIntakeClientErrorMessage(error,', `${relPath} safe client error helper`);
    }
  });

  [
    ['src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/route.ts', 'getKnowledgeIntakeBundle(access.context.scope, jobId)', 'getKnowledgeIntakeBundle(access.context.scope, params.jobId)'],
    ['src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/route.ts', 'addKnowledgeSource(access.context.scope, jobId', 'addKnowledgeSource(access.context.scope, params.jobId'],
    ['src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/media/route.ts', 'processKnowledgeIntakeMediaSource(access.context.scope, jobId', 'processKnowledgeIntakeMediaSource(access.context.scope, params.jobId'],
    ['src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/analyze/route.ts', 'analyzeKnowledgeIntakeJob(access.context.scope, jobId', 'analyzeKnowledgeIntakeJob(access.context.scope, params.jobId'],
    ['src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/publish/route.ts', 'publishKnowledgeIntakeJob(access.context.scope, jobId', 'publishKnowledgeIntakeJob(access.context.scope, params.jobId'],
  ].forEach(([relPath, normalizedCall, oldRawCall]) => {
    const route = read(relPath);
    assertIncludes(route, 'normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId)', `${relPath} job ID normalizer`);
    assertIncludes(route, "return NextResponse.json({ error: 'Invalid knowledge intake job.' }, { status: 400 });", `${relPath} invalid job response`);
    assertIncludes(route, normalizedCall, `${relPath} normalized job ID DAL call`);
    assertNotIncludes(route, oldRawCall, `${relPath} raw job ID DAL call`);
    assertOrder(
      route,
      [
        'normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId)',
        'requireAnswerlatticeKnowledgeIntakeContext(request, session',
        normalizedCall,
      ],
      `${relPath} route ID validation before protected DAL call`,
    );
  });

  {
    const reviewRoute = read('src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/review-items/[itemId]/route.ts');
    assertIncludes(reviewRoute, 'normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId)', 'Answerlattice intake review route job ID normalizer');
    assertIncludes(reviewRoute, 'normalizeAnswerlatticeKnowledgeIntakeReviewItemId(params.itemId)', 'Answerlattice intake review route item ID normalizer');
    assertIncludes(reviewRoute, "return NextResponse.json({ error: 'Invalid review item.' }, { status: 400 });", 'Answerlattice intake review route invalid item response');
    assertIncludes(reviewRoute, 'updateKnowledgeIntakeReviewItem(access.context.scope, jobId, itemId', 'Answerlattice intake review route normalized item update');
    assertNotIncludes(reviewRoute, 'updateKnowledgeIntakeReviewItem(access.context.scope, params.jobId, params.itemId', 'Answerlattice intake review route raw IDs');
    assertOrder(
      reviewRoute,
      [
        'normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId)',
        'normalizeAnswerlatticeKnowledgeIntakeReviewItemId(params.itemId)',
        'requireAnswerlatticeKnowledgeIntakeContext(request, session',
        'updateKnowledgeIntakeReviewItem(access.context.scope, jobId, itemId',
      ],
      'Answerlattice intake review route ID validation before update',
    );
  }

  {
    const publishRoute = read('src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/publish/route.ts');
    assertIncludes(publishRoute, 'const ReviewItemIdSchema = z.string()', 'Answerlattice intake publish route item ID schema');
    assertIncludes(publishRoute, 'normalizeAnswerlatticeKnowledgeIntakeReviewItemId(value) === value', 'Answerlattice intake publish item IDs use shared boundary');
  }

  [
    'src/lib/answerlattice/knowledgeIntakeIdBoundary.ts',
    'Firestore auto-ID shaped job IDs',
    'deterministic `kis_` source IDs',
    'deterministic `kii_` review item IDs',
    'shared service ref helpers',
  ].forEach((token) => {
    assertIncludes(intakeImplDoc, token, `Knowledge Intake implementation docs record route ID boundary token ${token}`);
  });
  [
    'Knowledge Intake route ID admission',
    'cost-neutral for valid traffic',
    'Firestore auto-ID shaped job IDs',
    'deterministic `kis_` source IDs',
    'deterministic `kii_` review item IDs',
    'shared service ref helpers',
    'before Firestore reads/writes',
  ].forEach((token) => {
    assertIncludes(intakeFirebaseDoc, token, `Knowledge Intake Firebase docs record route ID cost token ${token}`);
  });
  assertIncludes(productionAudit, 'Answerlattice Knowledge Intake ID boundary checkpoint', 'Production audit records Knowledge Intake ID boundary');
  assertIncludes(productionAudit, 'src/lib/answerlattice/knowledgeIntakeIdBoundary.ts', 'Production audit records Knowledge Intake ID helper path');
  assertIncludes(changelog, 'Answerlattice Knowledge Intake ID Boundary', 'Changelog records Knowledge Intake ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Knowledge Intake ID Boundary', 'Lowercase changelog records Knowledge Intake ID boundary');

  assertNotIncludes(intakeCore, "secureError('[Answerlattice Intake]", 'Answerlattice intake core raw secureError');
  assertNotIncludes(intakeCore, 'secureError("[Answerlattice Intake]', 'Answerlattice intake core raw secureError');
  assertNotIncludes(intakeCore, 'error as Error', 'Answerlattice intake core raw exception cast');
  const coreIntakeDiagnosticCalls = intakeCore.match(/secure(?:Log|Error)\('\[Answerlattice Intake\][\s\S]*?\);/g) || [];
  coreIntakeDiagnosticCalls.forEach((call) => {
    assert(call.includes('getAnswerlatticeKnowledgeIntakeLogContext('), 'Answerlattice intake core diagnostics must use bounded context helper');
  });
  const coreIntakeFailureCalls = intakeCore.match(/logAnswerlatticeKnowledgeIntakeFailure\('\[Answerlattice Intake\][\s\S]*?\);/g) || [];
  coreIntakeFailureCalls.forEach((call) => {
    assert(call.includes('answerlattice_intake_'), 'Answerlattice intake core failure diagnostic must use a fixed code');
  });
}

function verifyKnowledgeIntakeMediaAdmission() {
  const media = read('src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/media/route.ts');
  const component = read('src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx');

  assertIncludes(media, 'readBoundedFormDataBody(request, MAX_UPLOAD_BODY_BYTES', 'Answerlattice intake media bounded form-data body');
  assertIncludes(media, 'const MAX_UPLOAD_BODY_BYTES = MAX_UPLOAD_BYTES + (64 * 1024);', 'Answerlattice intake media body overhead cap');
  assertIncludes(media, 'file.size > MAX_UPLOAD_BYTES', 'Answerlattice intake media file-size cap');
  assertOrder(
    media,
    [
      'requireAnswerlatticeKnowledgeIntakeContext(request, session',
      'readBoundedFormDataBody(request, MAX_UPLOAD_BODY_BYTES',
      "const file = formData.get('file');",
      'file.size > MAX_UPLOAD_BYTES',
      'Buffer.from(await file.arrayBuffer())',
      'processKnowledgeIntakeMediaSource(access.context.scope, jobId',
    ],
    'Answerlattice intake media bounded form-data before file buffering',
  );
  assertIncludes(component, 'MAX_BROWSER_TEXT_FILE_BYTES', 'Answerlattice intake UI browser text extraction cap');
  assertOrder(
    component,
    [
      'if (file.size > MAX_BROWSER_TEXT_FILE_BYTES)',
      'const extracted = await extractTextFromFile(file);',
      'const contentText = extracted.text.slice(0, ANSWERLATTICE_KNOWLEDGE_INTAKE_CONSTRAINTS.MAX_SOURCE_TEXT_CHARS);',
    ],
    'Answerlattice intake UI must cap browser text files before arrayBuffer/text extraction',
  );
  assertNotIncludes(component, 'const extracted = await extractTextFromFile(file);\n                if (file.size > MAX_BROWSER_TEXT_FILE_BYTES)', 'Answerlattice intake UI must not extract text before the file-size guard');
}

function verifyArticleEntityExtractionScope() {
  const extraction = read('src/app/api/answerlattice/articles/extract-entities/route.ts');

  assertIncludes(extraction, 'const articleRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(article.id)', 'Answerlattice entity extraction article lookup');
  assertIncludes(extraction, 'if (Number(persistedArticle.tId) !== tenantId || Number(persistedArticle.sId) !== storeId)', 'Answerlattice entity extraction article scope guard');
  assertIncludes(extraction, 'Authorization Failed - Answerlattice Article Entity Extraction Scope Mismatch', 'Answerlattice entity extraction security logging');
  assertIncludes(extraction, 'const sourceContent = persistedArticle.content ?? article.content', 'Answerlattice entity extraction canonical content preference');
  assertIncludes(extraction, 'await articleRef.set', 'Answerlattice entity extraction scoped article write');
}

function verifyPredictiveTriggerPublicSummary() {
  const predictiveTriggerIdBoundary = read('src/lib/answerlattice/predictiveTriggerIdBoundary.ts');
  const triggers = read('src/database/answerlattice/predictiveTriggers.ts');
  const predictiveTriggerHook = read('src/hooks/answerlattice/usePredictiveTriggers.ts');
  const predictiveEngine = read('src/lib/answerlattice/predictiveEngine.ts');
  const predictiveReadme = read('__docs__/answerlattice/predictive-support/README.md');
  const predictiveImpl = read('__docs__/answerlattice/predictive-support/predictive-support_impl.md');
  const predictiveFirebase = read('__docs__/answerlattice/predictive-support/predictive-support_firebase.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(predictiveEngine, ".doc(`predictiveTriggers_${tId}_${sId}`)", 'Answerlattice predictive runtime summary read');
  assertIncludes(predictiveTriggerIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice predictive trigger ID boundary imports shared Firestore guard');
  assertIncludes(predictiveTriggerIdBoundary, 'export function normalizeAnswerlatticePredictiveTriggerId(value: unknown): string | null {', 'Answerlattice predictive trigger ID boundary exports normalizer');
  assertIncludes(predictiveTriggerIdBoundary, 'isValidFirestoreDocumentId(triggerId)', 'Answerlattice predictive trigger ID boundary validates Firestore document ID');
  assertIncludes(triggers, "import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';", 'Answerlattice predictive trigger DAL ID boundary import');
  assertIncludes(triggers, 'const normalizedDocId = normalizeAnswerlatticePredictiveTriggerId(docId);', 'Answerlattice predictive trigger document ref normalizes trigger ID');
  assertIncludes(triggers, "if (!normalizedDocId) throw new Error('Invalid predictive trigger id');", 'Answerlattice predictive trigger document ref rejects malformed trigger ID');
  assertIncludes(triggers, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice predictive trigger document ref uses normalized trigger ID');
  assertIncludes(triggers, 'const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(data.id);', 'Answerlattice predictive trigger update normalizes trigger ID');
  assertIncludes(triggers, 'await setDoc(getDocRef(normalizedTriggerId), composedData, { merge: true });', 'Answerlattice predictive trigger update writes normalized trigger ID');
  assertIncludes(triggers, 'const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);', 'Answerlattice predictive trigger actions normalize trigger ID');
  assertIncludes(triggers, 'await deleteDoc(getDocRef(normalizedTriggerId));', 'Answerlattice predictive trigger delete uses normalized trigger ID');
  assertNotIncludes(triggers, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice predictive trigger DAL must not build raw trigger document refs');
  assertNotIncludes(triggers, 'setDoc(getDocRef(data.id), composedData', 'Answerlattice predictive trigger update must not write raw data ID');
  assertNotIncludes(triggers, 'setDoc(getDocRef(triggerId), composedData', 'Answerlattice predictive trigger actions must not write raw trigger ID');
  assertNotIncludes(triggers, 'deleteDoc(getDocRef(triggerId))', 'Answerlattice predictive trigger delete must not use raw trigger ID');
  assertIncludes(predictiveTriggerHook, "import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';", 'Answerlattice predictive trigger hook ID boundary import');
  assertIncludes(predictiveTriggerHook, 'const triggerId = normalizeAnswerlatticePredictiveTriggerId(data.id);', 'Answerlattice predictive trigger hook update normalizes trigger ID');
  assertIncludes(predictiveTriggerHook, 'await updatePredictiveTrigger({ ...data, id: triggerId });', 'Answerlattice predictive trigger hook update sends normalized trigger ID');
  assertIncludes(predictiveTriggerHook, 'const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);', 'Answerlattice predictive trigger hook actions normalize trigger ID');
  assertIncludes(predictiveTriggerHook, 'entityId: normalizedTriggerId,', 'Answerlattice predictive trigger hook audit logs normalized trigger ID');
  assertIncludes(triggers, 'rebuildPredictiveTriggerSummary', 'Answerlattice predictive trigger summary rebuild');
  assertIncludes(triggers, "doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, `predictiveTriggers_${tId}_${sId}`)", 'Answerlattice predictive trigger summary doc');
  assertIncludes(triggers, 'pId: PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice predictive trigger summary product guard');
  assertIncludes(triggers, 'activeTriggerCount', 'Answerlattice predictive trigger active count');
  assertIncludes(triggers, "markAnswerlatticeCompiledContextSourceChanged('predictiveTriggers'", 'Answerlattice predictive trigger source invalidation');
  assertIncludes(triggers, "'predictive_trigger_create'", 'Answerlattice predictive trigger create refresh');
  assertIncludes(triggers, "'predictive_trigger_update'", 'Answerlattice predictive trigger update refresh');
  assertIncludes(triggers, "'predictive_trigger_delete'", 'Answerlattice predictive trigger delete refresh');

  [
    ['Predictive Support README', predictiveReadme],
    ['Predictive Support implementation docs', predictiveImpl],
    ['Predictive Support Firebase docs', predictiveFirebase],
    ['data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Predictive Trigger ID Boundary', `${label} documents predictive trigger ID boundary`);
  });
}

function verifyCompiledContextBundleTruth() {
  const builder = read('src/lib/answerlattice/contextBundleBuilderServer.ts');
  const compiledContext = read('src/lib/answerlattice/compiledContext.ts');
  const publicBundleRoute = read('src/app/api/answerlattice/bundles/public/[...path]/route.ts');
  const functionsBuilder = read('functions-answerlattice/src/answerlattice/contextBundleBuilder.ts');
  const compiledContextReadme = read('__docs__/answerlattice/compiled-context-distribution/README.md');
  const compiledContextImpl = read('__docs__/answerlattice/compiled-context-distribution/compiled-context-distribution_impl.md');
  const compiledContextFirebase = read('__docs__/answerlattice/compiled-context-distribution/compiled-context-distribution_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  assertIncludes(compiledContext, 'maxPrivateObjectBytes: 2 * 1024 * 1024', 'Answerlattice context bundle private object byte ceiling');
  assertIncludes(builder, 'const storeTenantId = Number(storeData.tId || storeData.tenantId)', 'Answerlattice context bundle store tenant resolution');
  assertIncludes(builder, "const ANSWERLATTICE_CONTEXT_BUNDLE_BUILD_REASONS = ['manual', 'activation_manual_rebuild', 'onboarding', 'nightly_repair', 'source_change'] as const;", 'Answerlattice context bundle build reason allowlist');
  assertIncludes(builder, "const ANSWERLATTICE_CONTEXT_BUNDLE_REQUESTERS = ['owner', 'system'] as const;", 'Answerlattice context bundle requester allowlist');
  assertIncludes(builder, 'const normalizeAnswerlatticeContextBundleBuildReason = (reason: unknown): BuildReason', 'Answerlattice context bundle reason normalizer');
  assertIncludes(builder, 'const normalizeAnswerlatticeContextBundleRequester = (requestedBy: unknown): BuildRequester', 'Answerlattice context bundle requester normalizer');
  assertIncludes(builder, 'const buildReason = normalizeAnswerlatticeContextBundleBuildReason(params.reason);', 'Answerlattice context bundle normalized reason usage');
  assertIncludes(builder, 'const buildRequester = normalizeAnswerlatticeContextBundleRequester(params.requestedBy);', 'Answerlattice context bundle normalized requester usage');
  assertIncludes(builder, 'storeTenantId === Number(tId)', 'Answerlattice context bundle store scope guard');
  assertIncludes(builder, ".where('tId', '==', tId)", 'Answerlattice context bundle tenant-scoped source queries');
  assertIncludes(builder, ".where('sId', '==', sId)", 'Answerlattice context bundle store-scoped source queries');
  assertIncludes(builder, ".where('status', '==', 'published')", 'Answerlattice context bundle published content filter');
  assertIncludes(builder, ".where('active', '==', true)", 'Answerlattice context bundle active FAQ filter');
  assertIncludes(builder, "getPrivateBundlePath(tenantId, storeId, bundleVersion, filePath)", 'Answerlattice context bundle private tenant path');
  assertIncludes(builder, "getPublicBundlePath(publicBundleId, bundleVersion, filePath)", 'Answerlattice context bundle public bundle path');
  assertIncludes(builder, 'uploadBundleManifestObjectBestEffort', 'Answerlattice context bundle manifest upload diagnostic helper');
  assertIncludes(builder, 'answerlattice_context_bundle_manifest_upload_failed', 'Answerlattice context bundle manifest upload failure code');
  assertIncludes(builder, "const ANSWERLATTICE_CONTEXT_BUNDLE_OBJECT_OVERSIZED = 'answerlattice_context_bundle_object_oversized';", 'Answerlattice context bundle oversized object failure code');
  assertIncludes(builder, 'const CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES = ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS.maxPrivateObjectBytes;', 'Answerlattice context bundle private object download cap');
  assertIncludes(builder, "getBoundedRuntimeStringContext('tenantId', context.tId)", 'Answerlattice context bundle manifest upload bounded tenant context');
  assertIncludes(builder, "getBoundedRuntimeStringContext('storeId', context.sId)", 'Answerlattice context bundle manifest upload bounded store context');
  assertIncludes(builder, 'const [metadata] = await file.getMetadata().catch(() => [null as any]);', 'Answerlattice context bundle metadata before private object download');
  assertIncludes(builder, 'metadataSize > CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES', 'Answerlattice context bundle metadata size guard');
  assertIncludes(builder, 'buffer.byteLength > CONTEXT_BUNDLE_OBJECT_DOWNLOAD_MAX_BYTES', 'Answerlattice context bundle post-download size guard');
  assertIncludes(builder, 'logOversizedBundleObject(filePath, metadataSize)', 'Answerlattice context bundle oversized metadata diagnostic');
  assertIncludes(builder, 'logOversizedBundleObject(filePath, buffer.byteLength)', 'Answerlattice context bundle oversized buffer diagnostic');
  assertIncludes(builder, "getBoundedRuntimeStringContext('bundlePath', filePath)", 'Answerlattice context bundle bounded object path metadata');
  assertIncludes(builder, 'reason: buildReason', 'Answerlattice context bundle stores normalized reason only');
  assertIncludes(builder, 'requestedBy: buildRequester', 'Answerlattice context bundle stores normalized requester only');
  assertIncludes(builder, "import { normalizeAnswerlatticeResolvedEntityId } from './governanceIdBoundary';", 'Answerlattice context bundle resolved entity ID boundary import');
  assertIncludes(builder, 'const normalizeContextBundleEntityIds = (values: unknown, limit?: number): string[] => {', 'Answerlattice context bundle entity ID array normalizer');
  assertIncludes(builder, 'const entityId = normalizeAnswerlatticeResolvedEntityId(value);', 'Answerlattice context bundle entity ID array resolved normalization');
  assertIncludes(builder, 'const fromEntityId = normalizeAnswerlatticeResolvedEntityId(relation.fromEntityId);', 'Answerlattice context bundle relation fromEntityId resolved normalization');
  assertIncludes(builder, 'const toEntityId = normalizeAnswerlatticeResolvedEntityId(relation.toEntityId);', 'Answerlattice context bundle relation toEntityId resolved normalization');
  assertIncludes(builder, 'entityIds: normalizeContextBundleEntityIds(answer.scope?.entityIds),', 'Answerlattice context bundle canonical answer entity ID normalization');
  assert(
    (builder.match(/entityIds: normalizeContextBundleEntityIds\((?:article|faq)\.entityIds, 20\),/g) || []).length >= 2,
    'Answerlattice context bundle article and FAQ entity ID arrays must normalize before bundle output',
  );
  assertIncludes(builder, 'entityChanges: normalizeContextBundleEntityIds(release.entityChanges, 50),', 'Answerlattice context bundle release entity change normalization');
  assertIncludes(builder, 'entityIds: normalizeContextBundleEntityIds(surface.entityIds, 25),', 'Answerlattice context bundle surface entity ID normalization');
  assertIncludes(builder, '.filter((relation): relation is NonNullable<ReturnType<typeof compactRelation>> => Boolean(relation));', 'Answerlattice context bundle drops malformed relation endpoints');
  assertNotIncludes(builder, 'normalizeAnswerlatticeEntityId', 'Answerlattice context bundle app/server builder must reject unresolved through resolved helper');
  [
    ['compiled context README', compiledContextReadme],
    ['compiled context impl docs', compiledContextImpl],
    ['compiled context Firebase docs', compiledContextFirebase],
    ['production audit', productionAudit],
    ['changelog', changelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'fixed reason/requester', `${label} documents context bundle fixed reason/requester metadata`);
    assertIncludes(content, 'raw owner ids/emails', `${label} documents raw requester exclusion`);
    assertIncludes(content, 'arbitrary request reason text', `${label} documents arbitrary request reason exclusion`);
  });
  [
    ['compiled context impl docs', compiledContextImpl],
    ['compiled context Firebase docs', compiledContextFirebase],
    ['production audit', productionAudit],
    ['changelog', changelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice Compiled Context Bundle Entity ID Boundary', `${label} documents compiled context bundle entity ID boundary`);
    assertIncludes(content, 'unresolved', `${label} documents compiled context bundle unresolved entity exclusion`);
  });
  assertIncludes(builder, "error: 'build_failed'", 'Answerlattice context bundle bounded lock failure code');
  assertNotIncludes(builder, "type BuildReason = 'manual' | 'onboarding' | 'nightly_repair' | 'source_change' | string", 'Answerlattice context bundle arbitrary build reason type');
  assertNotIncludes(builder, "reason: params.reason || 'manual'", 'Answerlattice context bundle raw reason persistence');
  assertNotIncludes(builder, "requestedBy: params.requestedBy || 'system'", 'Answerlattice context bundle raw requester persistence');
  assertNotIncludes(builder, 'fromEntityId: relation.fromEntityId,', 'Answerlattice context bundle raw relation fromEntityId output');
  assertNotIncludes(builder, 'toEntityId: relation.toEntityId,', 'Answerlattice context bundle raw relation toEntityId output');
  assertNotIncludes(builder, 'entityIds: answer.scope?.entityIds || [],', 'Answerlattice context bundle raw canonical answer entity IDs');
  assertNotIncludes(builder, 'entityIds: Array.isArray(article.entityIds) ? article.entityIds.slice(0, 20) : [],', 'Answerlattice context bundle raw article entity IDs');
  assertNotIncludes(builder, 'entityIds: Array.isArray(faq.entityIds) ? faq.entityIds.slice(0, 20) : [],', 'Answerlattice context bundle raw FAQ entity IDs');
  assertNotIncludes(builder, 'entityIds: Array.isArray(surface.entityIds) ? surface.entityIds.slice(0, 25) : [],', 'Answerlattice context bundle raw surface entity IDs');
  assertNotIncludes(builder, 'entityChanges: Array.isArray(release.entityChanges) ? release.entityChanges.slice(0, 50) : [],', 'Answerlattice context bundle raw release entity changes');
  assertNotIncludes(builder, 'const message = error instanceof Error ? error.message : String(error)', 'Answerlattice context bundle raw exception lock message');
  assertNotIncludes(builder, 'error: message.slice(0, 500)', 'Answerlattice context bundle raw exception lock field');
  assertNotIncludes(builder, ').catch(() => undefined);', 'Answerlattice context bundle silent manifest upload catch');
  assertIncludes(publicBundleRoute, "getRateLimitForFeature('ANSWERLATTICE_PUBLIC_BUNDLE')", 'Answerlattice public bundle proxy rate limit');
  assertIncludes(publicBundleRoute, 'const ipHash = hashPublicRateLimitValue(getClientIp(request));', 'Answerlattice public bundle proxy hashed IP key');
  assertIncludes(publicBundleRoute, 'key: `answerlattice-public-bundle:${ipHash}`', 'Answerlattice public bundle proxy must not store raw IP rate-limit keys');
  assertIncludes(publicBundleRoute, 'MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES', 'Answerlattice public bundle proxy download cap');
  assertIncludes(publicBundleRoute, 'const [metadata] = await file.getMetadata().catch(() => [null as any]);', 'Answerlattice public bundle proxy metadata before download');
  assertIncludes(publicBundleRoute, 'metadataSize > MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES', 'Answerlattice public bundle proxy metadata size guard');
  assertIncludes(publicBundleRoute, 'buffer.byteLength > MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES', 'Answerlattice public bundle proxy post-download size guard');
  assertIncludes(publicBundleRoute, "logRuntimeFailure('answerlattice_public_bundle_proxy_oversized'", 'Answerlattice public bundle proxy oversized diagnostic');
  assertIncludes(publicBundleRoute, "logRuntimeFailure('answerlattice_public_bundle_rate_limit_check_failed'", 'Answerlattice public bundle proxy rate-limit bounded diagnostic');
  assertIncludes(publicBundleRoute, "logRuntimeFailure('answerlattice_public_bundle_proxy_failed'", 'Answerlattice public bundle proxy failure bounded diagnostic');
  assertIncludes(publicBundleRoute, "getBoundedRuntimeStringContext('path', request.nextUrl.pathname)", 'Answerlattice public bundle proxy bounded request path metadata');
  assertIncludes(publicBundleRoute, "getBoundedRuntimeStringContext('bundlePath', requestedPath)", 'Answerlattice public bundle proxy bounded bundle path metadata');
  assertNotIncludes(publicBundleRoute, 'key: `answerlattice-public-bundle:${getClientIp(request)}`', 'Answerlattice public bundle proxy raw rate-limit IP key');
  assertNotIncludes(publicBundleRoute, "secureError('[Answerlattice Bundles] Bundle proxy", 'Answerlattice public bundle proxy raw secureError');

  assertIncludes(functionsBuilder, "const ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED';", 'Answerlattice Functions context bundle changelog load failure code');
  assertIncludes(functionsBuilder, "const ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED';", 'Answerlattice Functions context bundle manifest upload failure code');
  assertIncludes(functionsBuilder, "const ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED = 'ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED';", 'Answerlattice Functions context bundle repair failure code');
  assertIncludes(functionsBuilder, 'function getContextBundleSourceErrorContext', 'Answerlattice Functions context bundle bounded source error context');
  assertIncludes(functionsBuilder, 'function getContextBundleScopeContext', 'Answerlattice Functions context bundle bounded scope context');
  assertIncludes(functionsBuilder, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice Functions context bundle entity ID boundary import');
  assertIncludes(functionsBuilder, 'const normalizeContextBundleEntityIds = (values: unknown, limit?: number): string[] => {', 'Answerlattice Functions context bundle entity ID array normalizer');
  assertIncludes(functionsBuilder, 'const fromEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(relation.fromEntityId);', 'Answerlattice Functions context bundle relation fromEntityId normalization');
  assertIncludes(functionsBuilder, 'const toEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(relation.toEntityId);', 'Answerlattice Functions context bundle relation toEntityId normalization');
  assertIncludes(functionsBuilder, 'entityIds: normalizeContextBundleEntityIds(answer.scope?.entityIds),', 'Answerlattice Functions context bundle canonical answer entity ID normalization');
  assert(
    (functionsBuilder.match(/entityIds: normalizeContextBundleEntityIds\((?:article|faq)\.entityIds, 20\),/g) || []).length >= 2,
    'Answerlattice Functions context bundle article and FAQ entity ID arrays must normalize before bundle output',
  );
  assertIncludes(functionsBuilder, 'entityChanges: normalizeContextBundleEntityIds(release.entityChanges, 50),', 'Answerlattice Functions context bundle release entity change normalization');
  assertIncludes(functionsBuilder, 'entityIds: normalizeContextBundleEntityIds(surface.entityIds, 25),', 'Answerlattice Functions context bundle surface entity ID normalization');
  assertIncludes(functionsBuilder, '.filter((relation): relation is NonNullable<ReturnType<typeof compactRelation>> => Boolean(relation));', 'Answerlattice Functions context bundle drops malformed relation endpoints');
  assertIncludes(functionsBuilder, 'uploadManifestObjectBestEffort', 'Answerlattice Functions context bundle manifest upload diagnostic helper');
  assertIncludes(functionsBuilder, 'failureCode: ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_UPLOAD_FAILED', 'Answerlattice Functions context bundle bounded manifest upload diagnostic');
  assertIncludes(functionsBuilder, 'failureCode: ANSWERLATTICE_CONTEXT_BUNDLE_CHANGELOG_LOAD_FAILED', 'Answerlattice Functions context bundle bounded changelog warning');
  assertIncludes(functionsBuilder, 'error: ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED', 'Answerlattice Functions context bundle fixed lock failure code');
  assertIncludes(functionsBuilder, 'error: ANSWERLATTICE_CONTEXT_BUNDLE_REPAIR_FAILED,', 'Answerlattice Functions context bundle fixed result failure code');
  assertNotIncludes(functionsBuilder, "uploadObject(getPublicBundlePath(publicBundleId, bundleVersion, 'manifest.json'), manifest, PUBLIC_CACHE_CONTROL).catch(() => undefined)", 'Answerlattice Functions context bundle silent public manifest upload catch');
  assertNotIncludes(functionsBuilder, "uploadObject(getPrivateBundlePath(tenantId, storeId, bundleVersion, 'manifest.json'), manifest, PRIVATE_CACHE_CONTROL).catch(() => undefined)", 'Answerlattice Functions context bundle silent private manifest upload catch');
  assertNotIncludes(functionsBuilder, 'fromEntityId: relation.fromEntityId,', 'Answerlattice Functions context bundle raw relation fromEntityId output');
  assertNotIncludes(functionsBuilder, 'toEntityId: relation.toEntityId,', 'Answerlattice Functions context bundle raw relation toEntityId output');
  assertNotIncludes(functionsBuilder, 'entityIds: answer.scope?.entityIds || [],', 'Answerlattice Functions context bundle raw canonical answer entity IDs');
  assertNotIncludes(functionsBuilder, 'entityIds: Array.isArray(article.entityIds) ? article.entityIds.slice(0, 20) : [],', 'Answerlattice Functions context bundle raw article entity IDs');
  assertNotIncludes(functionsBuilder, 'entityIds: Array.isArray(faq.entityIds) ? faq.entityIds.slice(0, 20) : [],', 'Answerlattice Functions context bundle raw FAQ entity IDs');
  assertNotIncludes(functionsBuilder, 'entityIds: Array.isArray(surface.entityIds) ? surface.entityIds.slice(0, 25) : [],', 'Answerlattice Functions context bundle raw surface entity IDs');
  assertNotIncludes(functionsBuilder, 'entityChanges: Array.isArray(release.entityChanges) ? release.entityChanges.slice(0, 50) : [],', 'Answerlattice Functions context bundle raw release entity changes');
  assertNotIncludes(functionsBuilder, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice Functions context bundle raw changelog error text');
  assertNotIncludes(functionsBuilder, 'const message = error instanceof Error ? error.message : String(error);', 'Answerlattice Functions context bundle raw repair error text extraction');
  assertNotIncludes(functionsBuilder, 'error: message.slice(0, 500)', 'Answerlattice Functions context bundle raw repair error field');
}

function verifyMutationProposalScopeGuard() {
  const proposals = read('src/database/answerlattice/mutationProposals.ts');

  assertIncludes(proposals, 'Number(proposal.tId) !== Number(tId) || Number(proposal.sId) !== Number(sId)', 'Answerlattice mutation proposal approval scope guard');
  assertIncludes(proposals, 'Number(entity.tId) !== Number(tId) || Number(entity.sId) !== Number(sId)', 'Answerlattice mutation proposal entity scope guard');
}

function verifyFirestoreRuleBoundary() {
  const rules = read('firestore-answerlattice.rules');

  assertIncludes(rules, 'allow read, write: if false;', 'Answerlattice Firestore default deny');
  assertIncludes(rules, "data.pId == 'AL'", 'Answerlattice Firestore product scope guard');
  assertIncludes(rules, 'function isAnswerlatticeTenantStoreMember(data)', 'Answerlattice Firestore tenant-store guard');
  assertIncludes(rules, 'string(data.tId) == string(request.auth.token.tenantId)', 'Answerlattice Firestore tId guard');
  assertIncludes(rules, 'string(data.sId) == string(request.auth.token.storeId)', 'Answerlattice Firestore sId guard');
}

function verifyClientCacheDiagnostics() {
  const hookDiagnostics = read('src/hooks/hookDiagnostics.ts');
  const changelogCache = read('src/hooks/useChangelogCache.ts');
  const platformChangelogAddEdit = read('src/components/templates/platform/changelog/addEditChangelog.tsx');
  const platformChangelogDisplay = read('src/components/templates/platform/changelog/displayChangelog.tsx');
  const platformChangelogPreview = read('src/components/templates/platform/changelog/ChangelogPreview.tsx');
  const articleCache = read('src/hooks/useArticleCache.ts');
  const ticketCache = read('src/hooks/useTicketCache.ts');
  const feedbackHook = read('src/hooks/useFeedback.ts');
  const recentlyViewedHelper = read('src/lib/recentlyViewed/index.ts');
  const contentFeedbackStorage = read('src/lib/contentFeedbackStorage/index.ts');

  assertIncludes(hookDiagnostics, 'logHookFailure', 'shared hook diagnostics');
  [
    ['Changelog cache hook', changelogCache],
    ['Article cache hook', articleCache],
    ['Ticket cache hook', ticketCache],
    ['Feedback hook', feedbackHook],
    ['Recently viewed storage helper', recentlyViewedHelper],
    ['Content feedback storage helper', contentFeedbackStorage],
  ].forEach(([label, source]) => {
    assertNoDirectConsole(source, label);
    assertIncludes(source, 'logHookFailure', label);
  });

  [
    ['Changelog cache hook', changelogCache, 'answerlattice_changelog_cache_fetch_failed'],
    ['Article cache hook', articleCache, 'answerlattice_article_cache_fetch_failed'],
    ['Ticket cache hook', ticketCache, 'answerlattice_ticket_cache_fetch_failed'],
    ['Feedback hook', feedbackHook, 'answerlattice_feedback_missing_page_id'],
    ['Feedback hook', feedbackHook, 'answerlattice_feedback_remove_failed'],
    ['Feedback hook', feedbackHook, 'answerlattice_feedback_submit_failed'],
    ['Feedback hook', feedbackHook, 'answerlattice_feedback_comment_submit_failed'],
    ['Recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_parse_failed'],
    ['Recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_read_failed'],
    ['Recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_write_failed'],
    ['Recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_clear_failed'],
    ['Content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_parse_failed'],
    ['Content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_read_failed'],
    ['Content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_write_failed'],
    ['Content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_clear_failed'],
    ['Platform changelog add/edit', platformChangelogAddEdit, 'answerlattice_changelog_surface_options_load_failed'],
    ['Platform changelog add/edit', platformChangelogAddEdit, 'answerlattice_changelog_summary_refresh_after_update_failed'],
    ['Platform changelog add/edit', platformChangelogAddEdit, 'answerlattice_changelog_summary_refresh_after_create_failed'],
    ['Platform changelog display', platformChangelogDisplay, 'platform_changelog_last_viewed_read_failed'],
    ['Platform changelog display', platformChangelogDisplay, 'platform_changelog_last_viewed_write_failed'],
    ['Platform changelog preview', platformChangelogPreview, 'answerlattice_changelog_preview_kb_categories_prefetch_failed'],
  ].forEach(([label, source, failureCode]) => {
    assertIncludes(source, failureCode, `${label} bounded diagnostic code`);
  });

  assertIncludes(platformChangelogAddEdit, 'rebuildProductSurfaceContentSummaryWithDiagnostics', 'Platform changelog add/edit summary refresh diagnostic helper');
  assertIncludes(platformChangelogPreview, 'logRuntimeFailure', 'Platform changelog preview bounded runtime diagnostics');
  assertIncludes(platformChangelogDisplay, 'logRuntimeFailure', 'Platform changelog display bounded runtime diagnostics');
  assertNotIncludes(platformChangelogAddEdit, 'rebuildProductSurfaceContentSummary().catch(() => undefined);', 'Platform changelog add/edit summary refresh silent catch');
  assertNotIncludes(platformChangelogPreview, 'void getCategoriesCached().catch(() => undefined);', 'Platform changelog preview KB category prefetch silent catch');
  assertNotIncludes(platformChangelogDisplay, 'catch { }', 'Platform changelog display empty localStorage catch');

  [
    [changelogCache, 'Force refresh item, skipping cache'],
    [changelogCache, 'Item fetched and cached'],
    [changelogCache, 'Item cache hit'],
    [changelogCache, 'Item cache miss, fetching'],
    [changelogCache, 'Failed to fetch item:'],
    [articleCache, 'Evicted oldest article from cache:'],
    [articleCache, 'Force refresh article, skipping cache:'],
    [articleCache, 'Article cache hit:'],
    [articleCache, 'Article cache miss, fetching:'],
    [articleCache, 'Failed to fetch article:'],
    [ticketCache, 'Force refresh all tickets'],
    [ticketCache, 'Fetched ${tickets.length} tickets and cached'],
    [ticketCache, 'Failed to fetch tickets:'],
    [ticketCache, 'Updated ticket in cache:'],
    [feedbackHook, 'pageId is required for changelog feedback'],
    [recentlyViewedHelper, 'Failed to parse recently viewed entries'],
    [contentFeedbackStorage, 'Failed to parse feedback'],
    [contentFeedbackStorage, 'localStorage unavailable:'],
    [contentFeedbackStorage, 'Failed to write ${contentType} feedback'],
    [contentFeedbackStorage, 'Failed to clear ${contentType} feedback'],
  ].forEach(([source, rawDiagnostic]) => {
    assertNotIncludes(source, rawDiagnostic, 'Answerlattice client cache raw diagnostic');
  });
}

function verifyAnswerlatticeCallableDiagnostics() {
  const firebaseFunctions = read('src/lib/firebase/functions.ts');
  const sharedRegenerateEmbedding = read('functions/src/logic/regenerateEmbedding.ts');
  const sharedPublishApprovedJob = read('functions/src/logic/publishApprovedJob.ts');
  const sharedFinalizePublish = read('functions/src/logic/finalizePublish.ts');
  const sharedEmbedArticleWorker = read('functions/src/logic/embedArticleWorker.ts');
  const sharedStartGeneration = read('functions/src/logic/startGeneration.ts');
  const sharedAiUtils = read('functions/src/utils/aiUtils.ts');
  const sharedSafeTempFile = read('functions/src/utils/safeTempFile.ts');
  const sharedKbTriggers = read('functions/src/triggers/shared.ts');
  const sharedProductionTriggers = read('functions/src/triggers/production.ts');
  const sharedDevTriggers = read('functions/src/dev-triggers.ts');
  const answerlatticeIndex = read('functions-answerlattice/src/index.ts');
  const answerlatticeRegenerateEmbedding = read('functions-answerlattice/src/logic/regenerateEmbedding.ts');
  const answerlatticePublishApprovedJob = read('functions-answerlattice/src/logic/publishApprovedJob.ts');
  const answerlatticeEmbedArticleWorker = read('functions-answerlattice/src/logic/embedArticleWorker.ts');
  const answerlatticeAiUtils = read('functions-answerlattice/src/utils/aiUtils.ts');

  assertNoDirectConsole(firebaseFunctions, 'Firebase callable client wrapper');
  assertIncludes(firebaseFunctions, "secureError('[Answerlattice Callable] Operation failed'", 'Answerlattice callable secure logging');
  assertIncludes(firebaseFunctions, 'answerlattice_regenerate_embedding_callable_failed', 'Answerlattice regenerate embedding failure code');
  assertIncludes(firebaseFunctions, 'answerlattice_publish_approved_job_callable_failed', 'Answerlattice publish approved job failure code');
  assertIncludes(firebaseFunctions, "callableName: 'regenerateEmbedding'", 'Answerlattice regenerate embedding callable name');
  assertIncludes(firebaseFunctions, "callableName: 'publishApprovedJobFn'", 'Answerlattice publish approved job callable name');
  assertIncludes(firebaseFunctions, "getBoundedFirebaseCallableStringContext('articleId', payload.articleId)", 'Answerlattice callable bounded article context');
  assertIncludes(firebaseFunctions, "getBoundedFirebaseCallableStringContext('jobId', payload.jobId)", 'Answerlattice callable bounded job context');
  assertIncludes(firebaseFunctions, 'sourceErrorName: getFirebaseCallableErrorName(error)', 'Answerlattice callable source error name');
  assertIncludes(firebaseFunctions, 'sourceErrorCode: getFirebaseCallableErrorCode(error)', 'Answerlattice callable source error code');
  assertIncludes(firebaseFunctions, 'sourceStatusCode: getFirebaseCallableErrorStatus(error)', 'Answerlattice callable source status code');
  assertNotIncludes(firebaseFunctions, 'Error calling regenerateEmbedding function:', 'Answerlattice regenerate embedding raw diagnostic');
  assertNotIncludes(firebaseFunctions, 'Error calling publishApprovedJobFn function:', 'Answerlattice publish approved job raw diagnostic');

  assertIncludes(answerlatticeIndex, 'getAnswerlatticeIndexStringContext', 'Answerlattice Functions entrypoint bounded string context');
  assertIncludes(answerlatticeIndex, 'getManualSchedulerScopeContext', 'Answerlattice manual scheduler bounded scope context');
  assertIncludes(answerlatticeIndex, 'getManualSchedulerScopeErrorResponse', 'Answerlattice manual scheduler stable scope error response');
  assertIncludes(answerlatticeIndex, "failureCode: 'answerlattice_manual_scheduler_unauthorized'", 'Answerlattice manual scheduler unauthorized failure code');
  assertIncludes(answerlatticeIndex, "...getAnswerlatticeIndexStringContext('requestIp', req.ip)", 'Answerlattice manual scheduler bounded request IP context');
  assertIncludes(answerlatticeIndex, "res.status(response.status).json({ error: response.code })", 'Answerlattice manual scheduler fixed invalid-scope response');
  assertIncludes(answerlatticeIndex, '...getManualSchedulerScopeContext(scope)', 'Answerlattice manual scheduler bounded trigger scope log');
  assertIncludes(answerlatticeIndex, "...getAnswerlatticeIndexStringContext('eventId', eventId)", 'Answerlattice integration event bounded event ID logs');
  assertNotIncludes(answerlatticeIndex, "const message = error instanceof Error ? error.message : 'Invalid manual scheduler scope.'", 'Answerlattice manual scheduler raw invalid-scope message');
  assertNotIncludes(answerlatticeIndex, 'res.status(400).json({ error: message })', 'Answerlattice manual scheduler raw invalid-scope response');
  assertNotIncludes(answerlatticeIndex, 'ip: req.ip', 'Answerlattice manual scheduler raw request IP diagnostic');
  assertNotIncludes(answerlatticeIndex, '...(scope ? { tId: scope.tId, sId: scope.sId } : {})', 'Answerlattice manual scheduler raw scope diagnostic');
  assertNotIncludes(answerlatticeIndex, "logger.info('[Answerlattice Integration] Processing event', { eventType: event.eventType, eventId });", 'Answerlattice integration raw event processing diagnostic');
  assertNotIncludes(answerlatticeIndex, "logger.info('[Answerlattice Integration] Event processed', { eventId, delivered: result.delivered, failed: result.failed });", 'Answerlattice integration raw event processed diagnostic');

  [
    ['shared regenerate embedding callable', sharedRegenerateEmbedding],
    ['Answerlattice regenerate embedding callable', answerlatticeRegenerateEmbedding],
  ].forEach(([label, source]) => {
    assertIncludes(source, 'ANSWERLATTICE_REGENERATE_EMBEDDING_FAILED', `${label} stable failure code`);
    assertIncludes(source, 'ANSWERLATTICE_REGENERATE_EMBEDDING_ARTICLE_NOT_FOUND', `${label} stable not-found code`);
    assertIncludes(source, 'function getRegenerateEmbeddingErrorContext', `${label} bounded source metadata`);
    assertIncludes(source, 'articleIdLength: articleId.length', `${label} bounded article context`);
    assertIncludes(source, "throw new HttpsError('internal', 'Could not regenerate embedding.'", `${label} generic callable error`);
    assertNotIncludes(source, 'with article id ${articleId}', `${label} raw article ID log`);
    assertNotIncludes(source, 'Article with ID ${articleId} not found.', `${label} raw article ID not-found error`);
    assertNotIncludes(source, 'Failed to regenerate embedding for article ${articleId}.', `${label} raw article ID callable error`);
    assertNotIncludes(source, 'error.message', `${label} raw exception-message detail`);
  });

  assertIncludes(
    answerlatticeRegenerateEmbedding,
    'ANSWERLATTICE_REGENERATE_EMBEDDING_SCOPE_MISSING',
    'Answerlattice regenerate embedding stable missing-scope code',
  );
  assertNotIncludes(
    answerlatticeRegenerateEmbedding,
    'Article ${articleId} is missing tenant/store scope.',
    'Answerlattice regenerate embedding raw article ID missing-scope error',
  );

  [
    ['shared publish approved job callable', sharedPublishApprovedJob],
    ['Answerlattice publish approved job callable', answerlatticePublishApprovedJob],
  ].forEach(([label, source]) => {
    assertIncludes(source, 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_FAILED', `${label} stable failure code`);
    assertIncludes(source, 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_STATUS_UPDATE_FAILED', `${label} stable status-update failure code`);
    assertIncludes(source, 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_NOT_FOUND', `${label} stable not-found code`);
    assertIncludes(source, 'function getPublishApprovedJobErrorContext', `${label} bounded source metadata`);
    assertIncludes(source, 'jobIdLength: jobId.length', `${label} bounded job context`);
    assertIncludes(source, 'errorMessage: PUBLISH_APPROVED_JOB_FAILED_MESSAGE', `${label} fixed persisted failure text`);
    assertIncludes(source, "throw new HttpsError('internal', 'Could not publish approved job.'", `${label} generic callable error`);
    assertNotIncludes(source, 'Critical error during publish orchestration:', `${label} raw error object log`);
    assertNotIncludes(source, 'Publishing failed: ${error.message}', `${label} raw persisted failure text`);
    assertNotIncludes(source, 'Failed to publish job ${jobId}.', `${label} raw job ID callable error`);
    assertNotIncludes(source, 'Failed to persist failure status for job ${jobId}:', `${label} raw job ID status-update log`);
    assertNotIncludes(source, 'job data', `${label} raw approved-job payload log`);
    assertNotIncludes(source, 'error.message', `${label} raw exception-message detail`);
  });

  assertIncludes(sharedFinalizePublish, 'ANSWERLATTICE_FINALIZE_PUBLISH_FAILED', 'shared finalize publish stable failure code');
  assertIncludes(sharedFinalizePublish, 'ANSWERLATTICE_FINALIZE_PUBLISH_STATUS_UPDATE_FAILED', 'shared finalize publish stable status-update failure code');
  assertIncludes(sharedFinalizePublish, 'function getFinalizePublishErrorContext', 'shared finalize publish bounded source metadata');
  assertIncludes(sharedFinalizePublish, 'function getFinalizePublishJobContext', 'shared finalize publish bounded job context');
  assertIncludes(sharedFinalizePublish, 'jobIdLength: jobId.length', 'shared finalize publish bounded job ID context');
  assertIncludes(sharedFinalizePublish, 'errorMessage: FINALIZE_PUBLISH_FAILED_MESSAGE', 'shared finalize publish fixed persisted failure text');
  assertNotIncludes(sharedFinalizePublish, 'with job id ${jobId}', 'shared finalize publish raw job ID log');
  assertNotIncludes(sharedFinalizePublish, 'job data ${job}', 'shared finalize publish raw job payload log');
  assertNotIncludes(sharedFinalizePublish, 'Job ${jobId}', 'shared finalize publish raw job ID status log');
  assertNotIncludes(sharedFinalizePublish, 'Worker failed to finalize publish:', 'shared finalize publish raw error-object log');
  assertNotIncludes(sharedFinalizePublish, 'Finalize publish failed: ${error.message', 'shared finalize publish raw persisted failure text');
  assertNotIncludes(sharedFinalizePublish, 'Failed to update job status after error:', 'shared finalize publish raw status-update log');
  assertNotIncludes(sharedFinalizePublish, 'error.message', 'shared finalize publish raw exception-message detail');

  [
    ['shared embed article worker', sharedEmbedArticleWorker],
    ['Answerlattice embed article worker', answerlatticeEmbedArticleWorker],
  ].forEach(([label, source]) => {
    assertIncludes(source, 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_FAILED', `${label} stable failure code`);
    assertIncludes(source, 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND', `${label} stable article-missing code`);
    assertIncludes(source, 'function getEmbedArticleWorkerErrorContext', `${label} bounded source metadata`);
    assertIncludes(source, 'function getEmbedArticleWorkerContext', `${label} bounded article/job context`);
    assertIncludes(source, 'jobIdLength: jobId.length', `${label} bounded job ID context`);
    assertIncludes(source, 'articleIdLength: articleData.id.length', `${label} bounded article ID context`);
    assertNotIncludes(source, 'with job id ${jobId}', `${label} raw job ID log`);
    assertNotIncludes(source, 'article id ${articleData.id}', `${label} raw article ID log`);
    assertNotIncludes(source, 'Article ${articleData.id}', `${label} raw article ID diagnostic`);
    assertNotIncludes(source, 'Worker failed to re-embed article ${articleData.id}:', `${label} raw article ID failure log`);
    assertNotIncludes(source, 'Worker successfully re-embedded article ${articleData.id}.', `${label} raw article ID success log`);
    assertNotIncludes(source, 'error.message', `${label} raw exception-message detail`);
  });

  assertIncludes(
    answerlatticeEmbedArticleWorker,
    'ANSWERLATTICE_EMBED_ARTICLE_WORKER_SCOPE_MISSING',
    'Answerlattice embed article worker stable missing-scope code',
  );
  assertNotIncludes(
    answerlatticeEmbedArticleWorker,
    'Article ${articleData.id} is missing tenant/store scope.',
    'Answerlattice embed article worker raw article ID missing-scope error',
  );

  assertIncludes(sharedProductionTriggers, 'FUNCTIONS_PRODUCTION_TRIGGER_DATA_MISSING', 'shared production trigger stable missing-data code');
  assertIncludes(sharedProductionTriggers, 'function getTriggerJobContext', 'shared production trigger bounded job context');
  assertIncludes(sharedProductionTriggers, 'jobIdLength: jobId.length', 'shared production trigger bounded job ID context');
  assertNotIncludes(sharedProductionTriggers, '[${jobId}] Starting generation', 'shared production trigger raw start-generation job ID log');
  assertNotIncludes(sharedProductionTriggers, '[${jobId}] No data change detected', 'shared production trigger raw finalize job ID log');
  assertNotIncludes(sharedProductionTriggers, 'Job created: ${jobId}', 'shared production trigger raw menu-image job ID log');
  assertNotIncludes(sharedProductionTriggers, 'event trigger for job ${jobId}', 'shared production trigger raw missing-data job ID log');

  assertIncludes(sharedDevTriggers, 'DEV_TRIGGER_FAILED', 'shared dev trigger stable failure code');
  assertIncludes(sharedDevTriggers, 'DEV_TRIGGER_MISSING_DATA', 'shared dev trigger stable missing-data code');
  assertIncludes(sharedDevTriggers, 'function getDevTriggerRequestContext', 'shared dev trigger bounded request context');
  assertIncludes(sharedDevTriggers, 'jobIdLength: jobId.length', 'shared dev trigger bounded job ID context');
  assertIncludes(sharedDevTriggers, 'jobDataKeyCount: jobData ? Object.keys(jobData).length : 0', 'shared dev trigger bounded job-data context');
  assertNotIncludes(sharedDevTriggers, 'Called with data:', 'shared dev trigger raw request payload log');
  assertNotIncludes(sharedDevTriggers, 'Extracted data:', 'shared dev trigger raw extracted request log');
  assertNotIncludes(sharedDevTriggers, 'Processing menu images for job ${jobId}', 'shared dev trigger raw job ID process log');
  assertNotIncludes(sharedDevTriggers, 'Manually starting generation for job ${jobId}', 'shared dev trigger raw start job ID log');
  assertNotIncludes(sharedDevTriggers, 'Manually finalizing publish for job ${jobId}', 'shared dev trigger raw finalize job ID log');
  assertNotIncludes(sharedDevTriggers, 'Successfully triggered generation for ${jobId}', 'shared dev trigger raw job ID success text');
  assertNotIncludes(sharedDevTriggers, 'Successfully triggered processing for ${jobId}', 'shared dev trigger raw menu-image success text');
  assertNotIncludes(sharedDevTriggers, 'logger.error(`[DEV_TRIGGER] Error:`, error)', 'shared dev trigger raw error-object log');

  assertIncludes(sharedStartGeneration, 'ANSWERLATTICE_START_GENERATION_FAILED', 'shared start generation stable failure code');
  assertIncludes(sharedStartGeneration, 'START_GENERATION_FAILED_MESSAGE', 'shared start generation fixed persisted failure text');
  assertIncludes(sharedStartGeneration, 'function getStartGenerationErrorContext', 'shared start generation bounded source metadata');
  assertIncludes(sharedStartGeneration, 'function getStartGenerationJobContext', 'shared start generation bounded job context');
  assertIncludes(sharedStartGeneration, 'jobIdLength: jobId.length', 'shared start generation bounded job ID context');
  assertIncludes(sharedStartGeneration, 'categoryCount: Object.keys(generatedData || {}).length', 'shared start generation generated-data count');
  assertIncludes(sharedStartGeneration, 'getKBFromSource(prompt, sourceFiles, { tId: job.tId, sId: job.sId })', 'shared start generation passes tenant/store scope to source upload helper');
  assertNotIncludes(sharedStartGeneration, 'with job id ${jobId}', 'shared start generation raw job ID log');
  assertNotIncludes(sharedStartGeneration, 'job data ${job}', 'shared start generation raw job payload log');
  assertNotIncludes(sharedStartGeneration, 'Generated data. with job id ${jobId} is ${generatedData}', 'shared start generation raw generated payload log');
  assertNotIncludes(sharedStartGeneration, 'categoryMap:.`, categoryMap', 'shared start generation raw category map log');
  assertNotIncludes(sharedStartGeneration, 'Processed article:`, article', 'shared start generation raw article payload log');
  assertNotIncludes(sharedStartGeneration, 'articlesToCreate);', 'shared start generation raw article create payload log');
  assertNotIncludes(sharedStartGeneration, 'Payload is ${UpdatedJob}', 'shared start generation raw job payload success log');
  assertNotIncludes(sharedStartGeneration, 'error.message ||', 'shared start generation raw exception-message persistence');
  assertNotIncludes(sharedStartGeneration, 'Generation failed:`, error', 'shared start generation raw error-object log');

  assertIncludes(sharedAiUtils, 'ANSWERLATTICE_KB_SOURCE_GENERATION_FAILED', 'shared AI utils stable KB generation failure code');
  assertIncludes(sharedAiUtils, 'ANSWERLATTICE_KB_SOURCE_FILE_UPLOAD_FAILED', 'shared AI utils stable source upload failure code');
  assertIncludes(sharedAiUtils, 'ANSWERLATTICE_ARTICLE_EMBEDDING_FAILED', 'shared AI utils stable embedding failure code');
  assertIncludes(sharedAiUtils, 'ANSWERLATTICE_SIMILAR_ARTICLE_LOOKUP_FAILED', 'shared AI utils stable similar-article failure code');
  assertIncludes(sharedAiUtils, 'ANSWERLATTICE_KB_SOURCE_STORAGE_PATH_REJECTED', 'shared AI utils stable source path rejection code');
  assertIncludes(sharedAiUtils, 'function getAiUtilsErrorContext', 'shared AI utils bounded source metadata');
  assertIncludes(sharedAiUtils, 'function getArticleEmbeddingContext', 'shared AI utils bounded article metadata');
  assertIncludes(sharedAiUtils, 'interface KnowledgeSourceScope', 'shared AI utils source upload scope');
  assertIncludes(sharedAiUtils, 'function isAllowedKnowledgeSourceStoragePath', 'shared AI utils source storage path allowlist');
  assertIncludes(sharedAiUtils, "storagePath.startsWith(`ingestion_source_files/${tId}/${sId}/`)", 'shared AI utils tenant/store source storage prefix');
  assertIncludes(sharedAiUtils, "const pathParts = storagePath.split('/');", 'shared AI utils source path segment check');
  assertIncludes(sharedAiUtils, 'if (!isAllowedKnowledgeSourceStoragePath(file, scope))', 'shared AI utils rejects out-of-scope source storage paths');
  assertIncludes(sharedAiUtils, 'originalurl: files[i].downloadURL', 'shared AI utils source prompt metadata uses typed download URL');
  assertOrder(
    sharedAiUtils,
    [
      'if (!isAllowedKnowledgeSourceStoragePath(file, scope))',
      'const fileBuffer = await admin.storage().bucket().file(file.storagePath).download();',
    ],
    'shared AI utils validates source storage path before download',
  );
  assertIncludes(sharedAiUtils, 'articleIdLength: article.id?.length || 0', 'shared AI utils bounded article ID context');
  assertIncludes(sharedAiUtils, "buildSafeTempFilePath(file.fileName, 'source-file')", 'shared AI utils sanitized temp path builder');
  assertIncludes(sharedAiUtils, 'finally {', 'shared AI utils cleanup runs after failed and successful uploads');
  assertIncludes(sharedSafeTempFile, 'sanitizeTempFileBasename', 'shared Functions temp-file basename sanitizer');
  assertIncludes(sharedSafeTempFile, '.replace(/\\.\\./g, "")', 'shared Functions temp-file strips traversal tokens');
  assertIncludes(sharedSafeTempFile, '.replace(/[/\\\\]/g, "")', 'shared Functions temp-file strips path separators');
  assertIncludes(sharedSafeTempFile, '.replace(/[^a-zA-Z0-9._-]/g, "_")', 'shared Functions temp-file strips unsafe basename characters');
  assertIncludes(sharedSafeTempFile, '.replace(/^\\.+/, "")', 'shared Functions temp-file strips leading dots');
  assertIncludes(sharedSafeTempFile, 'return `/tmp/${uniqueId}-${basename}`;', 'shared Functions temp-file stays under tmp with sanitized basename');
  assertNotIncludes(sharedAiUtils, 'const tempFilePath = `/tmp/${file.fileName}`', 'shared AI utils raw source filename temp path');
  assertNotIncludes(sharedAiUtils, 'originalurl: files[i].url', 'shared AI utils untyped source URL prompt metadata');
  assertNotIncludes(sharedAiUtils, 'Critical error during knowledge base generation:`, error', 'shared AI utils raw KB generation error object log');
  assertNotIncludes(sharedAiUtils, 'Knowledge base generation failed. message: ${error.message}', 'shared AI utils raw KB generation throw');
  assertNotIncludes(sharedAiUtils, 'Critical error during embedding generation:`, error', 'shared AI utils raw embedding error object log');
  assertNotIncludes(sharedAiUtils, 'Embedding generation failed for article ${article.id}', 'shared AI utils raw article ID embedding throw');
  assertNotIncludes(sharedAiUtils, 'gemini uploadResult', 'shared AI utils raw Gemini upload result log');
  assertNotIncludes(sharedAiUtils, 'logger.error("errrr", error)', 'shared AI utils raw upload error log');
  assertNotIncludes(sharedAiUtils, 'Failed to delete temporary file ${tempFilePath}', 'shared AI utils raw temp path cleanup log');
  assertNotIncludes(sharedAiUtils, 'Successfully generated and parsed knowledge base data using GenAI.`, responseText', 'shared AI utils raw GenAI response log');
  assertNotIncludes(sharedAiUtils, 'Generated knowledge base content from source using GenAI:text generated.`, responseText', 'shared AI utils raw GenAI text log');
  assertNotIncludes(sharedAiUtils, '[findSimilarArticles] failed. message: ${error.message}', 'shared AI utils raw similar-article throw');

  assertIncludes(sharedKbTriggers, 'function getSharedKbTaskContext', 'shared KB task wrapper bounded context');
  assertIncludes(sharedKbTriggers, 'articleIdLength: articleData.id?.length || 0', 'shared KB task wrapper bounded article ID context');
  assertNotIncludes(sharedKbTriggers, 'Worker starting to re-embed article ${articleData.id}.', 'shared KB task wrapper raw article ID log');
  assertNotIncludes(sharedKbTriggers, 'logger.info(`[${jobId}] Worker starting', 'shared KB task wrapper raw job ID log');

  assertIncludes(answerlatticeIndex, 'function assertFirestoreDocumentId', 'Answerlattice KB entrypoint Firestore document ID validation');
  assertIncludes(answerlatticeIndex, 'function getKbCallableContext', 'Answerlattice KB callable bounded context');
  assertIncludes(answerlatticeIndex, 'function getKbTaskContext', 'Answerlattice KB task bounded context');
  assertIncludes(answerlatticeIndex, 'callerUidLength: caller?.uid?.length || 0', 'Answerlattice KB callable bounded caller context');
  assertIncludes(answerlatticeIndex, 'articleIdLength: articleData.id?.length || 0', 'Answerlattice KB task bounded article context');
  assertNotIncludes(answerlatticeIndex, "logger.info('[Answerlattice KB] Re-embedding queued article', { jobId, articleId: articleData.id });", 'Answerlattice KB task raw job/article ID log');
  assertNotIncludes(answerlatticeIndex, 'uid: caller.uid', 'Answerlattice KB callable raw caller UID log');
  assertNotIncludes(answerlatticeIndex, 'articleId,\n        uid: caller.uid', 'Answerlattice KB callable raw article ID log');

  assertIncludes(answerlatticeAiUtils, 'ANSWERLATTICE_ARTICLE_EMBEDDING_FAILED', 'Answerlattice AI utils stable embedding failure code');
  assertIncludes(answerlatticeAiUtils, 'function getEmbeddingErrorContext', 'Answerlattice AI utils bounded source metadata');
  assertIncludes(answerlatticeAiUtils, 'function getEmbeddingArticleContext', 'Answerlattice AI utils bounded article metadata');
  assertIncludes(answerlatticeAiUtils, 'articleIdLength: article.id?.length || 0', 'Answerlattice AI utils bounded article ID context');
  assertNotIncludes(answerlatticeAiUtils, "logger.error('[Answerlattice KB] Embedding generation failed', {\n            articleId: article.id", 'Answerlattice AI utils raw article ID log');
  assertNotIncludes(answerlatticeAiUtils, 'error: error?.message || error', 'Answerlattice AI utils raw provider error log');
  assertNotIncludes(answerlatticeAiUtils, 'Embedding generation failed for article ${article.id}', 'Answerlattice AI utils raw article ID throw');
  assertNotIncludes(answerlatticeAiUtils, '${response.status} ${response.statusText}', 'Answerlattice AI utils raw provider status text throw');
}

function verifyChatAnalyticsDiagnostics() {
  const chatAnalytics = read('src/database/chatAnalytics/index.ts');
  const chatAnalyticsDiagnostics = read('src/database/chatAnalytics/diagnostics.ts');
  const helpCenterImpl = read('__docs__/answerlattice/help-center/help-center_impl.md');
  const helpCenterFirebase = read('__docs__/answerlattice/help-center/help-center_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  assertNoDirectConsole(chatAnalytics, 'Answerlattice chat analytics DAL');
  assertIncludes(chatAnalytics, 'logChatAnalyticsFailure', 'Answerlattice chat analytics bounded diagnostics');
  assertIncludes(chatAnalytics, "import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';", 'Answerlattice chat analytics imports shared strict scope helper');
  assertIncludes(chatAnalytics, 'const getChatAnalyticsScope = (session: any): ChatAnalyticsScope | null =>', 'Answerlattice chat analytics scope resolver');
  assertIncludes(chatAnalytics, 'normalizeAnswerlatticeScopeDocumentId(session?.tId ?? session?.tenantId ?? session?.user?.tenantId)', 'Answerlattice chat analytics tenant scope normalization');
  assertIncludes(chatAnalytics, 'normalizeAnswerlatticeScopeDocumentId(session?.sId ?? session?.storeId ?? session?.user?.storeId)', 'Answerlattice chat analytics store scope normalization');
  assertIncludes(chatAnalytics, "where('tId', '==', scope.tId)", 'Answerlattice chat analytics reads use normalized tenant scope');
  assertIncludes(chatAnalytics, "where('sId', '==', scope.sId)", 'Answerlattice chat analytics reads use normalized store scope');
  assertIncludes(chatAnalytics, 'const docId = `${scope.tId}_${scope.sId}_${dateStr}`;', 'Answerlattice chat analytics aggregate doc ID uses normalized scope');
  assertIncludes(chatAnalytics, 'tId: scope.tId', 'Answerlattice chat analytics aggregate data uses normalized tenant scope');
  assertIncludes(chatAnalytics, 'sId: scope.sId', 'Answerlattice chat analytics aggregate data uses normalized store scope');
  assertIncludes(chatAnalytics, "throw new Error('Missing Answerlattice chat analytics scope')", 'Answerlattice chat analytics aggregate rejects missing scope');
  assertIncludes(chatAnalytics, 'answerlattice_chat_analytics_today_live_stats_failed', 'Answerlattice today live stats fallback failure code');
  assertIncludes(chatAnalytics, "getChatAnalyticsScopeContext(session, 'getChatStatisticsOptimized', safeDays)", 'Answerlattice stats fallback bounded scope');
  assertIncludes(chatAnalytics, "getChatAnalyticsScopeContext(session, 'getChatDashboardAggregatesOptimized', safeDays)", 'Answerlattice dashboard fallback bounded scope');
  assertIncludes(chatAnalytics, 'todayStats = await getTodayLiveStats(session);', 'Answerlattice today live stats behavior preserved');
  assertIncludes(chatAnalyticsDiagnostics, "secureError('[Answerlattice Chat Analytics] Operation failed'", 'Answerlattice chat analytics secure logging');
  assertIncludes(chatAnalyticsDiagnostics, 'getBoundedChatAnalyticsStringContext', 'Answerlattice chat analytics bounded string context');
  assertIncludes(chatAnalyticsDiagnostics, 'sourceErrorName: getChatAnalyticsErrorName(error)', 'Answerlattice chat analytics source error name');
  assertIncludes(chatAnalyticsDiagnostics, 'sourceErrorCode: getChatAnalyticsErrorCode(error)', 'Answerlattice chat analytics source error code');
  assertIncludes(chatAnalyticsDiagnostics, 'sourceStatusCode: getChatAnalyticsErrorStatus(error)', 'Answerlattice chat analytics source status code');
  assertIncludes(helpCenterImpl, 'Answerlattice chat analytics scope boundary', 'Help Center impl docs must document chat analytics scope boundary');
  assertIncludes(helpCenterFirebase, 'Chat analytics scope hardening is cost-neutral', 'Help Center Firebase docs must document chat analytics scope cost boundary');
  assertIncludes(productionAudit, 'Answerlattice chat analytics scope boundary checkpoint: fixed in source.', 'Production readiness audit must document chat analytics scope hardening');
  assertIncludes(changelog, 'Answerlattice Chat Analytics Scope Boundary', 'Changelog must document chat analytics scope hardening');
  assertNotIncludes(chatAnalytics, "where('tId', '==', session.tId)", 'Answerlattice chat analytics must not query raw session tenant scope');
  assertNotIncludes(chatAnalytics, "where('sId', '==', session.sId)", 'Answerlattice chat analytics must not query raw session store scope');
  assertNotIncludes(chatAnalytics, 'const docId = `${session.tId}_${session.sId}_${dateStr}`;', 'Answerlattice chat analytics must not compose aggregate doc ID from raw session scope');
  assertNotIncludes(chatAnalytics, "Failed to fetch today's stats, using historical only:", 'Answerlattice chat analytics raw fallback warning');
}

function verifyAnswerlatticePublicClientCacheDiagnostics() {
  const cacheHelper = read('src/lib/cache/answerlatticePublicClientCache.ts');

  assertNoDirectConsole(cacheHelper, 'Answerlattice public client cache helper');
  assertIncludes(cacheHelper, "import { secureError } from '@lib/security/secureLogger';", 'Answerlattice public client cache secure logging');
  assertIncludes(cacheHelper, 'sanitizeAnswerlatticePublicCacheContext', 'Answerlattice public client cache bounded context');
  assertIncludes(cacheHelper, 'getBoundedAnswerlatticePublicCacheStringContext', 'Answerlattice public client cache bounded tenant/store context');
  assertIncludes(cacheHelper, 'logAnswerlatticePublicClientCacheFailure', 'Answerlattice public client cache normalized failure logger');
  assertIncludes(cacheHelper, 'answerlattice_public_cache_revalidation_bad_status', 'Answerlattice public client cache bad-status code');
  assertIncludes(cacheHelper, 'answerlattice_public_cache_revalidation_request_failed', 'Answerlattice public client cache request-failed code');
  assertIncludes(cacheHelper, 'segmentCount', 'Answerlattice public client cache bounded segment count');
  assertIncludes(cacheHelper, 'responseStatus: response.status', 'Answerlattice public client cache numeric response status');
  assertIncludes(cacheHelper, 'errorName: error instanceof Error ? error.name : typeof error', 'Answerlattice public client cache bounded error name');
  assertNotIncludes(cacheHelper, 'failed to revalidate public cache`,', 'Answerlattice public client cache raw context warning');
}

function verifyAnswerlatticePublicCacheRouteDiagnostics() {
  const route = read('src/app/api/revalidate/answerlattice/route.ts');

  assertIncludes(route, 'logAnswerlatticeDiagnostic', 'Answerlattice public cache route bounded success diagnostic');
  assertIncludes(route, 'logAnswerlatticeFailure', 'Answerlattice public cache route bounded failure diagnostic');
  assertIncludes(route, 'getAnswerlatticeRevalidationLogContext', 'Answerlattice public cache route bounded context helper');
  assertIncludes(route, 'answerlattice_public_cache_revalidated', 'Answerlattice public cache route stable success code');
  assertIncludes(route, 'answerlattice_public_cache_revalidation_failed', 'Answerlattice public cache route stable failure code');
  assertIncludes(route, 'segmentCount', 'Answerlattice public cache route segment count metadata');
  assertIncludes(route, 'tagCount', 'Answerlattice public cache route tag count metadata');
  assertIncludes(route, 'getAnswerlatticeScopeLogContext', 'Answerlattice public cache route bounded scope metadata');
  assertNotIncludes(route, "secureError('[Answerlattice Public Cache] Revalidation failed'", 'Answerlattice public cache route raw secure failure');
  assertNotIncludes(route, "secureLog('[Answerlattice Public Cache] Revalidated public content cache'", 'Answerlattice public cache route raw success log');
  assertNotIncludes(route, 'tenantId: scope.tId', 'Answerlattice public cache route raw tenant ID log');
  assertNotIncludes(route, 'storeId: scope.sId', 'Answerlattice public cache route raw store ID log');
  assertNotIncludes(route, 'segments,', 'Answerlattice public cache route raw segments log');
}

function verifyAnswerlatticeRuntimeDiagnostics() {
  const diagnostics = read('src/lib/answerlattice/diagnostics.ts');
  const governanceIdBoundary = read('src/lib/answerlattice/governanceIdBoundary.ts');
  const signalEmitter = read('src/lib/answerlattice/signalEmitter.ts');
  const signalMutation = read('src/lib/answerlattice/signalMutation.ts');
  const draftGenerator = read('src/lib/answerlattice/draftGenerator.ts');
  const productSurfaceContent = read('src/lib/answerlattice/productSurfaceContent.ts');
  const faqContent = read('src/lib/answerlattice/faqContent.ts');
  const faqGeneration = read('src/app/api/answerlattice/faqs/generate-from-article/route.ts');
  const knowledgeIntake = read('src/lib/answerlattice/knowledgeIntake.ts');
  const canonicalAnswers = read('src/database/answerlattice/canonicalAnswers.ts');
  const signalEvents = read('src/database/answerlattice/signalEvents.ts');
  const entityExtraction = read('src/lib/answerlattice/entityExtraction.ts');
  const entityCandidates = read('src/database/answerlattice/entityCandidates.ts');
  const entityCandidateIdBoundary = read('src/lib/answerlattice/entityCandidateIdBoundary.ts');
  const entities = read('src/database/answerlattice/entities.ts');
  const billingDocumentIdBoundary = read('src/lib/answerlattice/billingDocumentIdBoundary.ts');
  const aiAccounting = read('src/lib/answerlattice/aiAccounting.ts');
  const billing = read('src/database/answerlattice/billing.ts');
  const intakeUsageLedger = read('src/lib/answerlattice/intakeUsageLedger.ts');
  const knowledgeIntakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const onboardRoute = read('src/app/api/answerlattice/onboard/route.ts');
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  const faqManagement = read('src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx');
  const queryEmbeddings = read('src/database/queryEmbeddings/index.ts');
  const dataInventoryMap = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_data-map.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const entitySystemReadme = read('__docs__/answerlattice/entity-system/README.md');
  const entitySystemImpl = read('__docs__/answerlattice/entity-system/entity-system_impl.md');
  const entitySystemFirebase = read('__docs__/answerlattice/entity-system/entity-system_firebase.md');
  const billingReadme = read('__docs__/answerlattice/billing/README.md');
  const billingFirebase = read('__docs__/answerlattice/billing/answerlattice-billing_firebase.md');
  const knowledgeIntakeFirebase = read('__docs__/answerlattice/knowledge-intake-command-center/knowledge-intake-command-center_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertNoDirectConsole(diagnostics, 'Answerlattice runtime diagnostics helper');
  assertIncludes(diagnostics, "import { secureError, secureLog } from '@lib/security/secureLogger';", 'Answerlattice runtime diagnostics helper');
  assertIncludes(diagnostics, 'getBoundedAnswerlatticeStringContext', 'Answerlattice runtime diagnostics bounded string context');
  assertIncludes(diagnostics, 'getAnswerlatticeScopeLogContext', 'Answerlattice runtime diagnostics bounded scope context');
  assertIncludes(diagnostics, 'sourceErrorName: getAnswerlatticeErrorName(error)', 'Answerlattice runtime diagnostics source error name');
  assertIncludes(diagnostics, 'sourceErrorCode: getAnswerlatticeErrorCode(error)', 'Answerlattice runtime diagnostics source error code');
  assertIncludes(diagnostics, 'sourceStatusCode: getAnswerlatticeErrorStatus(error)', 'Answerlattice runtime diagnostics source status code');

  [
    ['Answerlattice signal emitter', signalEmitter],
    ['Answerlattice signal mutation', signalMutation],
    ['Answerlattice draft generator', draftGenerator],
    ['Answerlattice entity extraction', entityExtraction],
    ['Answerlattice entity DAL', entities],
    ['Answerlattice AI accounting', aiAccounting],
    ['Answerlattice billing DAL', billing],
    ['Answerlattice product billing server', productBillingServer],
    ['Answerlattice FAQ management', faqManagement],
    ['Answerlattice query embeddings DAL', queryEmbeddings],
  ].forEach(([label, source]) => {
    assertNoDirectConsole(source, label);
    assertIncludes(source, 'logAnswerlattice', `${label} bounded diagnostics`);
  });

  assertIncludes(signalEmitter, 'answerlattice_signal_invalid_scope_skipped', 'Answerlattice signal invalid-scope diagnostic');
  assertIncludes(signalEmitter, 'answerlattice_signal_emit_failed', 'Answerlattice signal emit failure diagnostic');
  assertIncludes(signalEmitter, "import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice signal entity ID boundary import');
  assertIncludes(signalEmitter, "const SIGNAL_UNRESOLVED_ENTITY_ID = 'unresolved';", 'Answerlattice signal unresolved entity fallback');
  assertIncludes(signalEmitter, 'const normalizeSignalEntityId = (value: unknown): string => (', 'Answerlattice signal entity ID normalizer');
  assertIncludes(signalEmitter, 'normalizeAnswerlatticeEntityId(value) || SIGNAL_UNRESOLVED_ENTITY_ID', 'Answerlattice signal entity ID boundary fallback');
  assertIncludes(signalEmitter, 'entityId: normalizeSignalEntityId(params.entityId)', 'Answerlattice server signal normalized entity ID write');
  assertIncludes(signalEmitter, 'const normalizedEntityId = normalizeSignalEntityId(params.entityId);', 'Answerlattice signal normalized entity ID before client/server emit');
  assertIncludes(signalEmitter, 'entityId: normalizedEntityId', 'Answerlattice client signal normalized entity ID write');
  assertNotIncludes(signalEmitter, "entityId: params.entityId || 'unresolved'", 'Answerlattice signal raw/default entity ID write');
  assertNotIncludes(signalEmitter, 'error?.message', 'Answerlattice signal duplicate handling must not branch on raw exception text');
  [
    ['Answerlattice data inventory map', dataInventoryMap],
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice signal entity ID boundary', `Answerlattice signal entity ID boundary documented in ${label}`);
  });
  assertIncludes(signalMutation, 'answerlattice_mutation_proposal_create_failed', 'Answerlattice mutation proposal failure diagnostic');
  assertIncludes(signalMutation, "import { normalizeAnswerlatticeResolvedEntityId } from \"@lib/answerlattice/governanceIdBoundary\";", 'Answerlattice legacy signal mutation entity ID boundary import');
  assertIncludes(signalMutation, 'const entityId = normalizeAnswerlatticeResolvedEntityId(signal.entityId);', 'Answerlattice legacy signal mutation resolved entity ID normalization');
  assertIncludes(signalMutation, 'const existing = clusterMap.get(entityId) || [];', 'Answerlattice legacy signal mutation normalized cluster read');
  assertIncludes(signalMutation, 'clusterMap.set(entityId, existing);', 'Answerlattice legacy signal mutation normalized cluster write');
  assertNotIncludes(signalMutation, 'normalizeAnswerlatticeEntityId(signal.entityId)', 'Answerlattice legacy signal mutation must reject unresolved through resolved helper');
  assertNotIncludes(signalMutation, "if (!signal.entityId || signal.entityId === 'unresolved') continue;", 'Answerlattice legacy signal mutation raw unresolved guard');
  assertNotIncludes(signalMutation, 'clusterMap.get(signal.entityId)', 'Answerlattice legacy signal mutation raw cluster read');
  assertNotIncludes(signalMutation, 'clusterMap.set(signal.entityId', 'Answerlattice legacy signal mutation raw cluster write');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeResolvedEntityId', 'Answerlattice resolved entity ID boundary helper');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeResolvedEntityIds', 'Answerlattice resolved entity ID list boundary helper');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeEntityRelationId', 'Answerlattice entity relation ID boundary helper');
  assertIncludes(governanceIdBoundary, 'normalizeAnswerlatticeEntitySearchIndexId', 'Answerlattice entity search index ID boundary helper');
  assertIncludes(governanceIdBoundary, 'entityId && entityId !== ANSWERLATTICE_UNRESOLVED_ENTITY_ID ? entityId : null', 'Answerlattice resolved entity ID helper rejects unresolved sentinel');
  assertIncludes(productSurfaceContent, "import { normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';", 'Answerlattice product surface content entity ID boundary import');
  assertIncludes(productSurfaceContent, 'entityIds: normalizeAnswerlatticeResolvedEntityIds(parsed.entityIds, MAX_ENTITY_IDS),', 'Answerlattice product surface content resolved entity IDs');
  assertNotIncludes(productSurfaceContent, 'parsed.entityIds.map(value => value.trim()).filter(Boolean)', 'Answerlattice product surface content raw entity ID trim list');
  assertIncludes(faqContent, "import { normalizeAnswerlatticeCanonicalAnswerId, normalizeAnswerlatticeResolvedEntityIds } from './governanceIdBoundary';", 'Answerlattice FAQ content entity ID boundary import');
  assertIncludes(faqContent, 'entityIds: normalizeAnswerlatticeResolvedEntityIds(parsed.entityIds, MAX_ENTITY_IDS),', 'Answerlattice FAQ save resolved entity IDs');
  assertIncludes(faqContent, 'entityIds: normalizeAnswerlatticeResolvedEntityIds(record.entityIds, MAX_ENTITY_IDS),', 'Answerlattice generated FAQ resolved entity IDs');
  assertNotIncludes(faqContent, 'record.entityIds.map(String).map(value => value.trim()).filter(Boolean)', 'Answerlattice FAQ raw generated entity ID trim list');
  assertIncludes(faqGeneration, "import { normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice FAQ generation resolved entity ID import');
  assertIncludes(faqGeneration, 'entityIds: normalizeAnswerlatticeResolvedEntityIds([...(article.entityIds || []), ...(faq.entityIds || [])], 25),', 'Answerlattice FAQ generation resolved entity IDs');
  assertNotIncludes(faqGeneration, 'entityIds: Array.from(new Set([...(article.entityIds || []), ...(faq.entityIds || [])])).slice(0, 25),', 'Answerlattice FAQ generation raw entity ID merge');
  assertIncludes(knowledgeIntake, "import { normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice Knowledge Intake resolved entity ID import');
  assertIncludes(knowledgeIntake, 'const cleanIdList = (value: unknown, maxItems: number) =>', 'Answerlattice Knowledge Intake resolved entity list helper signature');
  assertIncludes(knowledgeIntake, 'normalizeAnswerlatticeResolvedEntityIds(value, maxItems);', 'Answerlattice Knowledge Intake resolved entity list helper');
  assertNotIncludes(knowledgeIntake, ".replace(/[^a-zA-Z0-9_\\-:.]/g, '')", 'Answerlattice Knowledge Intake raw entity ID character trim');
  assertIncludes(canonicalAnswers, "import { normalizeAnswerlatticeCanonicalAnswerId, normalizeAnswerlatticeResolvedEntityId, normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice canonical answer ID and resolved entity ID import');
  assertIncludes(canonicalAnswers, 'const normalizedDocId = normalizeAnswerlatticeCanonicalAnswerId(docId);', 'Answerlattice canonical answer document ref normalizes answer ID');
  assertIncludes(canonicalAnswers, "if (!normalizedDocId) throw new Error('Invalid canonical answer id');", 'Answerlattice canonical answer document ref rejects malformed answer ID');
  assertIncludes(canonicalAnswers, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice canonical answer document ref uses normalized answer ID');
  assertIncludes(canonicalAnswers, 'const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(answerId);', 'Answerlattice canonical answer actions normalize answer ID');
  assertIncludes(canonicalAnswers, 'const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(data.id);', 'Answerlattice canonical answer update normalizes data ID');
  assertIncludes(canonicalAnswers, 'const canonicalData = { ...data, id: normalizedAnswerId };', 'Answerlattice canonical answer update composes normalized ID');
  assertIncludes(canonicalAnswers, 'await setDoc(getDocRef(normalizedAnswerId), composedData, { merge: true });', 'Answerlattice canonical answer writes use normalized answer ID');
  assertIncludes(canonicalAnswers, 'sourceId: normalizedAnswerId,', 'Answerlattice canonical cache version source uses normalized answer ID');
  assertNotIncludes(canonicalAnswers, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice canonical answers DAL must not build raw answer document refs');
  assertNotIncludes(canonicalAnswers, 'getDocRef(answerId)', 'Answerlattice canonical answer actions must not use raw answer document refs');
  assertNotIncludes(canonicalAnswers, 'getDocRef(data.id)', 'Answerlattice canonical answer update must not use raw data ID');
  assertNotIncludes(canonicalAnswers, 'sourceId: answerId', 'Answerlattice canonical cache version must not use raw answer ID');
  assertIncludes(canonicalAnswers, 'const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);', 'Answerlattice canonical active-answer lookup resolved entity ID');
  assertIncludes(canonicalAnswers, "where('scope.entityIds', 'array-contains', normalizedEntityId)", 'Answerlattice canonical active-answer normalized query key');
  assertIncludes(canonicalAnswers, 'const entityIds = normalizeAnswerlatticeResolvedEntityIds(data.scope?.entityIds, 25);', 'Answerlattice canonical write resolved entity IDs');
  assertIncludes(canonicalAnswers, 'scope: {\n                    ...data.scope,\n                    entityIds,', 'Answerlattice canonical write normalized scope entity IDs');
  assertIncludes(signalEvents, "import { normalizeAnswerlatticeResolvedEntityId, normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';", 'Answerlattice signal event query resolved entity ID import');
  assertIncludes(signalEvents, 'const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);', 'Answerlattice signal event query resolved entity ID');
  assertIncludes(signalEvents, "where('entityId', '==', normalizedEntityId)", 'Answerlattice signal event normalized query key');
  assertIncludes(signalEvents, 'const normalizedEntityIds = normalizeAnswerlatticeResolvedEntityIds(entityIds, entityIds.length);', 'Answerlattice batch signal query resolved entity IDs');
  assertIncludes(signalEvents, 'const batch = normalizedEntityIds.slice(i, i + BATCH_SIZE);', 'Answerlattice batch signal query normalized batches');
  assertNotIncludes(signalEvents, "where('entityId', '==', entityId)", 'Answerlattice signal event raw entity query key');
  assertNotIncludes(signalEvents, 'const batch = entityIds.slice(i, i + BATCH_SIZE);', 'Answerlattice batch signal raw entity IDs');
  [
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice Legacy Signal Mutation Entity ID Boundary', `${label} documents legacy signal mutation entity ID boundary`);
  });
  [
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Resolved Entity Link Boundary', `${label} documents app resolved entity link boundary`);
    assertIncludes(content, 'Answerlattice App Canonical Answer ID Boundary', `${label} documents app canonical answer ID boundary`);
  });
  assertIncludes(draftGenerator, 'answerlattice_draft_regeneration_failed', 'Answerlattice draft regeneration failure diagnostic');
  assertIncludes(draftGenerator, "error: 'Draft regeneration failed'", 'Answerlattice draft regeneration generic error text');
  assertNotIncludes(draftGenerator, 'error instanceof Error ? error.message', 'Answerlattice draft regeneration raw error text');
  assertIncludes(entityExtraction, 'answerlattice_entity_extraction_batch_failed', 'Answerlattice batch extraction failure diagnostic');
  assertIncludes(entityExtraction, 'answerlattice_entity_candidate_store_failed', 'Answerlattice candidate store failure diagnostic');
  assertIncludes(entityCandidateIdBoundary, 'ANSWERLATTICE_ENTITY_CANDIDATE_ID_MAX_LENGTH = 180', 'Answerlattice entity candidate ID max length');
  assertIncludes(entityCandidateIdBoundary, 'isValidFirestoreDocumentId(candidateId)', 'Answerlattice entity candidate ID Firestore document guard');
  assertIncludes(entityCandidates, "import { normalizeAnswerlatticeEntityCandidateId } from \"@lib/answerlattice/entityCandidateIdBoundary\";", 'Answerlattice entity candidates DAL ID boundary import');
  assertIncludes(entityCandidates, 'const normalizedDocId = normalizeAnswerlatticeEntityCandidateId(docId);', 'Answerlattice entity candidate document ref normalizes ID');
  assertIncludes(entityCandidates, 'if (!normalizedDocId) throw new Error("Invalid Answerlattice entity candidate id");', 'Answerlattice entity candidate document ref rejects malformed ID');
  assertIncludes(entityCandidates, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice entity candidate document ref uses normalized ID');
  assertIncludes(entityCandidates, 'const normalizedCandidateId = normalizeAnswerlatticeEntityCandidateId(candidateId);', 'Answerlattice entity candidate actions normalize ID');
  assertIncludes(entityCandidates, 'await setDoc(getDocRef(normalizedCandidateId), composedData, { merge: true });', 'Answerlattice entity candidate status writes use normalized ID');
  assertIncludes(entityCandidates, 'const candidateSnap = await getDoc(getDocRef(normalizedCandidateId));', 'Answerlattice entity candidate promotion read uses normalized ID');
  assertIncludes(entityCandidates, 'throw new Error("Candidate not found");', 'Answerlattice entity candidate promotion not-found error avoids raw ID');
  assertIncludes(entityCandidates, 'previousState: { candidateId: normalizedCandidateId, candidateStatus: candidate.status },', 'Answerlattice entity candidate promotion audit uses normalized ID');
  assertIncludes(entityCandidates, 'return { entity, candidateId: normalizedCandidateId, promoted: true };', 'Answerlattice entity candidate promotion result uses normalized ID');
  assertIncludes(entityCandidates, '{ candidateId: normalizedCandidateId, tId, sId },', 'Answerlattice entity candidate promotion composer input uses normalized ID');
  assertNotIncludes(entityCandidates, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice entity candidates DAL must not build raw document refs');
  assertNotIncludes(entityCandidates, 'getDocRef(candidateId)', 'Answerlattice entity candidate actions must not use raw candidate refs');
  assertNotIncludes(entityCandidates, 'Candidate ${candidateId} not found', 'Answerlattice entity candidate not-found error must not include raw ID');
  assertIncludes(entities, "normalizeAnswerlatticeResolvedEntityId", 'Answerlattice entity DAL resolved ID boundary import');
  assertIncludes(entities, "normalizeAnswerlatticeEntityRelationId", 'Answerlattice entity DAL relation ID boundary import');
  assertIncludes(entities, "normalizeAnswerlatticeEntitySearchIndexId", 'Answerlattice entity DAL search-index ID boundary import');
  assertIncludes(entities, 'const normalizedDocId = normalizeAnswerlatticeResolvedEntityId(docId);', 'Answerlattice entity document ref normalizes entity ID');
  assertIncludes(entities, 'if (!normalizedDocId) throw new Error("Invalid Answerlattice entity id");', 'Answerlattice entity document ref rejects malformed entity ID');
  assertIncludes(entities, 'return doc(answerlatticeFirebaseClient, ENTITY_COLLECTION, normalizedDocId);', 'Answerlattice entity document ref uses normalized entity ID');
  assertIncludes(entities, 'const normalizedDocId = normalizeAnswerlatticeEntityRelationId(docId);', 'Answerlattice entity relation document ref normalizes relation ID');
  assertIncludes(entities, 'return doc(answerlatticeFirebaseClient, RELATION_COLLECTION, normalizedDocId);', 'Answerlattice entity relation document ref uses normalized relation ID');
  assertIncludes(entities, 'const normalizedDocId = normalizeAnswerlatticeEntitySearchIndexId(docId);', 'Answerlattice entity search-index document ref normalizes index ID');
  assertIncludes(entities, 'return doc(answerlatticeFirebaseClient, SEARCH_INDEX_COLLECTION, normalizedDocId);', 'Answerlattice entity search-index document ref uses normalized index ID');
  assertIncludes(entities, 'const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(data.id);', 'Answerlattice entity update normalizes entity ID');
  assertIncludes(entities, 'await setDoc(getEntityDocRef(normalizedEntityId), composedData, { merge: true });', 'Answerlattice entity update writes normalized entity ref');
  assertIncludes(entities, 'sourceId: normalizedEntityId,', 'Answerlattice entity update/deprecate source ID is normalized');
  assertIncludes(entities, 'throw new Error("Entity not found");', 'Answerlattice entity deprecate not-found error avoids raw ID');
  assertIncludes(entities, 'const normalizedRelationId = normalizeAnswerlatticeEntityRelationId(relationId);', 'Answerlattice entity relation delete normalizes relation ID');
  assertIncludes(entities, 'await deleteDoc(getRelationDocRef(normalizedRelationId));', 'Answerlattice entity relation delete uses normalized ref');
  assertIncludes(entities, 'const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(data.entityId);', 'Answerlattice entity search index normalizes entity ID');
  assertIncludes(entities, 'const searchIndexId = data.id ? normalizeAnswerlatticeEntitySearchIndexId(data.id) : null;', 'Answerlattice entity search index normalizes document ID');
  assertIncludes(entities, 'await setDoc(getSearchIndexDocRef(searchIndexId), submitData, { merge: true });', 'Answerlattice entity search index writes normalized ref');
  assertIncludes(entities, 'where(\'entityId\', \'==\', normalizedEntityId)', 'Answerlattice alias sync queries normalized entity ID');
  assertIncludes(entities, 'const normalizedSurvivorId = normalizeAnswerlatticeResolvedEntityId(survivorId);', 'Answerlattice entity merge normalizes survivor ID');
  assertIncludes(entities, 'const normalizedMergedId = normalizeAnswerlatticeResolvedEntityId(mergedId);', 'Answerlattice entity merge normalizes merged ID');
  assertIncludes(entities, 'const survivorSnap = await getDoc(getEntityDocRef(normalizedSurvivorId));', 'Answerlattice entity merge survivor read uses normalized ID');
  assertIncludes(entities, 'const mergedSnap = await getDoc(getEntityDocRef(normalizedMergedId));', 'Answerlattice entity merge merged read uses normalized ID');
  assertIncludes(entities, 'throw new Error("Survivor entity not found");', 'Answerlattice entity merge survivor not-found error avoids raw ID');
  assertIncludes(entities, 'throw new Error("Merged entity not found");', 'Answerlattice entity merge merged not-found error avoids raw ID');
  assertIncludes(entities, 'entityId: normalizedSurvivorId,', 'Answerlattice entity merge audit uses normalized survivor ID');
  assertIncludes(entities, 'previousState: { mergedEntityId: normalizedMergedId, mergedName: merged.name },', 'Answerlattice entity merge audit uses normalized merged ID');
  assertIncludes(entities, '{ survivorId: normalizedSurvivorId, mergedId: normalizedMergedId, tId, sId },', 'Answerlattice entity merge composer input uses normalized IDs');
  assertNotIncludes(entities, 'doc(answerlatticeFirebaseClient, ENTITY_COLLECTION, docId)', 'Answerlattice entities DAL must not build raw entity document refs');
  assertNotIncludes(entities, 'doc(answerlatticeFirebaseClient, RELATION_COLLECTION, docId)', 'Answerlattice entities DAL must not build raw relation document refs');
  assertNotIncludes(entities, 'doc(answerlatticeFirebaseClient, SEARCH_INDEX_COLLECTION, docId)', 'Answerlattice entities DAL must not build raw search-index document refs');
  assertNotIncludes(entities, 'getEntityDocRef(data.id)', 'Answerlattice entity update must not use raw entity ID refs');
  assertNotIncludes(entities, 'getEntityDocRef(entityId)', 'Answerlattice entity deprecate must not use raw entity ID refs');
  assertNotIncludes(entities, 'getRelationDocRef(relationId)', 'Answerlattice entity relation delete must not use raw relation ID refs');
  assertNotIncludes(entities, 'getSearchIndexDocRef(data.id)', 'Answerlattice entity search-index write must not use raw index ID refs');
  assertNotIncludes(entities, 'Survivor entity ${survivorId} not found', 'Answerlattice entity merge survivor error must not include raw ID');
  assertNotIncludes(entities, 'Merged entity ${mergedId} not found', 'Answerlattice entity merge merged error must not include raw ID');
  [
    ['Entity System README', entitySystemReadme],
    ['Entity System implementation docs', entitySystemImpl],
    ['Entity System Firebase docs', entitySystemFirebase],
    ['Answerlattice data inventory map', dataInventoryMap],
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Entity Candidate ID Boundary', `Answerlattice entity candidate ID boundary documented in ${label}`);
    assertIncludes(content, 'Answerlattice App Entity DAL ID Boundary', `Answerlattice entity DAL ID boundary documented in ${label}`);
  });
  assertIncludes(entityExtraction, 'answerlattice_entity_extraction_article_failed', 'Answerlattice article extraction failure diagnostic');
  assertIncludes(entities, 'answerlattice_entity_tenant_summary_marker_failed', 'Answerlattice entity tenant summary marker failure diagnostic');
  assertIncludes(entities, 'getAnswerlatticeScopeLogContext', 'Answerlattice entity DAL bounded tenant summary marker context');
  assertIncludes(aiAccounting, 'answerlattice_ai_accounting_operation_log_failed', 'Answerlattice AI accounting operation-log failure diagnostic');
  assertIncludes(aiAccounting, 'answerlattice_ai_accounting_credit_consumption_failed', 'Answerlattice AI accounting credit-consumption failure diagnostic');
  assertIncludes(aiAccounting, 'answerlattice_ai_accounting_operation_balance_update_failed', 'Answerlattice AI accounting balance-update failure diagnostic');
  assertIncludes(aiAccounting, 'getAnswerlatticeAiAccountingLogContext', 'Answerlattice AI accounting bounded context helper');
  assertNotIncludes(aiAccounting, 'logger.error', 'Answerlattice AI accounting must not use raw logger diagnostics');
  assertNotIncludes(aiAccounting, 'operationLogError, context', 'Answerlattice AI accounting must not pass raw operation-log context');
  assertNotIncludes(aiAccounting, 'creditConsumptionError, context', 'Answerlattice AI accounting must not pass raw credit-consumption context');
  assertNotIncludes(aiAccounting, 'operationUpdateError, context', 'Answerlattice AI accounting must not pass raw operation-update context');
  assertIncludes(billing, 'answerlattice_billing_active_subscription_load_failed', 'Answerlattice billing active subscription failure diagnostic');
  assertIncludes(billingDocumentIdBoundary, 'normalizeAnswerlatticeSubscriptionId', 'Answerlattice billing subscription ID boundary helper');
  assertIncludes(billingDocumentIdBoundary, 'normalizeAnswerlatticeIntakeUsageLedgerId', 'Answerlattice billing intake usage ledger ID boundary helper');
  assertIncludes(billingDocumentIdBoundary, 'isValidFirestoreDocumentId(documentId)', 'Answerlattice billing document ID Firestore guard');
  assertIncludes(aiAccounting, "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';", 'Answerlattice AI accounting subscription ID boundary import');
  assertIncludes(aiAccounting, 'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription?.id);', 'Answerlattice AI accounting normalizes subscription ID before refs');
  assertIncludes(aiAccounting, 'if (!normalizedSubscriptionId || Number(subscription.monthlyCreditsAllowance || 0) <= 0) {', 'Answerlattice AI accounting skips monthly refresh before malformed refs');
  assertIncludes(aiAccounting, "throw new Error('Answerlattice subscription is not available.');", 'Answerlattice AI accounting fails closed before malformed credit-debit refs');
  assertIncludes(aiAccounting, 'const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSubscriptionId);', 'Answerlattice AI accounting subscription refs use normalized ID');
  assertIncludes(billing, "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';", 'Answerlattice billing DAL subscription ID boundary import');
  assertIncludes(billing, 'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscriptionId);', 'Answerlattice billing subscription ref normalizes ID');
  assertIncludes(billing, "if (!normalizedSubscriptionId) throw new Error('Invalid Answerlattice subscription id');", 'Answerlattice billing subscription ref rejects malformed ID');
  assertIncludes(billing, 'return doc(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS, normalizedSubscriptionId);', 'Answerlattice billing subscription ref uses normalized ID');
  assertIncludes(billing, 'const rawSubscriptionId = String(summary.id || summary.providerSubscriptionId || \'\').trim();', 'Answerlattice billing keeps raw subscription summary presence separate');
  assertIncludes(billing, 'const subscriptionId = normalizeAnswerlatticeSubscriptionId(rawSubscriptionId);', 'Answerlattice billing normalizes store summary subscription ID');
  assertIncludes(billing, 'if (!rawSubscriptionId || !subscriptionId) {', 'Answerlattice billing falls back before invalid summary subscription ref');
  assertIncludes(intakeUsageLedger, 'normalizeAnswerlatticeIntakeUsageLedgerId', 'Answerlattice intake ledger ID boundary import');
  assertIncludes(intakeUsageLedger, 'normalizeAnswerlatticeSubscriptionId', 'Answerlattice intake subscription ID boundary import');
  assertIncludes(intakeUsageLedger, 'const summaryId = normalizeAnswerlatticeSubscriptionId(cleanText(summary.id || summary.providerSubscriptionId, 180));', 'Answerlattice intake ledger normalizes subscription summary ID');
  assertIncludes(intakeUsageLedger, 'subscriptionRef: db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(summaryId)', 'Answerlattice intake ledger subscription ref uses normalized summary ID');
  assertIncludes(intakeUsageLedger, 'const normalizedLedgerId = normalizeAnswerlatticeIntakeUsageLedgerId(ledgerId);', 'Answerlattice intake ledger finalization/refund normalizes ledger ID');
  assertIncludes(intakeUsageLedger, 'if (!normalizedLedgerId) return;', 'Answerlattice intake ledger rejects malformed ledger ID before ref');
  assertIncludes(intakeUsageLedger, '.doc(normalizedLedgerId).set({', 'Answerlattice intake ledger finalize uses normalized ledger ID');
  assertIncludes(intakeUsageLedger, 'const ledgerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER).doc(normalizedLedgerId);', 'Answerlattice intake ledger refund uses normalized ledger ID');
  assertIncludes(knowledgeIntakeApi, "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';", 'Answerlattice Knowledge Intake API subscription ID boundary import');
  assertIncludes(knowledgeIntakeApi, 'const normalizedSummarySubscriptionId = normalizeAnswerlatticeSubscriptionId(summarySubscriptionId);', 'Answerlattice Knowledge Intake API normalizes license summary subscription ID');
  assertIncludes(knowledgeIntakeApi, 'if (normalizedSummarySubscriptionId) {', 'Answerlattice Knowledge Intake API falls through before malformed license subscription refs');
  assertIncludes(knowledgeIntakeApi, '.doc(normalizedSummarySubscriptionId).get();', 'Answerlattice Knowledge Intake API license direct-doc read uses normalized subscription ID');
  assertIncludes(onboardRoute, "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';", 'Answerlattice onboarding subscription ID boundary import');
  assertIncludes(onboardRoute, 'const subscriptionId = normalizeAnswerlatticeSubscriptionId(providerSubscriptionId);', 'Answerlattice onboarding normalizes provider subscription ID');
  assertIncludes(onboardRoute, "if (!subscriptionId) throw new Error('Invalid Answerlattice subscription id.');", 'Answerlattice onboarding rejects malformed provider subscription IDs');
  assertIncludes(onboardRoute, '.doc(subscriptionId).set({', 'Answerlattice onboarding subscription write uses normalized ID');
  assertIncludes(productBillingServer, "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';", 'Answerlattice product billing subscription ID boundary import');
  assertIncludes(productBillingServer, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice product billing scope ID boundary import');
  assertIncludes(productBillingServer, 'export function normalizeAnswerlatticeBillingScopeDocumentId(value: unknown): AnswerlatticeBillingScopeDocumentId | null', 'Answerlattice product billing scope ID normalizer');
  assertIncludes(productBillingServer, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId', 'Answerlattice product billing scope ID exact numeric guard');
  assertIncludes(productBillingServer, 'const subscriptionId = normalizeAnswerlatticeSubscriptionId(providerSubscriptionId);', 'Answerlattice product billing normalizes create provider subscription ID');
  assertIncludes(productBillingServer, 'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscriptionId);', 'Answerlattice product billing normalizes update subscription ID');
  assertIncludes(productBillingServer, 'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(id);', 'Answerlattice product billing normalizes get-by-id subscription ID');
  assertIncludes(productBillingServer, 'const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(tenantId);', 'Answerlattice product billing active lookup normalizes tenant scope');
  assertIncludes(productBillingServer, 'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(storeId);', 'Answerlattice product billing active lookup normalizes store scope');
  assertIncludes(productBillingServer, 'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();', 'Answerlattice product billing active lookup uses normalized store ref');
  assertIncludes(productBillingServer, 'const rawSummarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || \'\').trim();', 'Answerlattice product billing keeps raw summary ID separate');
  assertIncludes(productBillingServer, 'const summarySubscriptionId = normalizeAnswerlatticeSubscriptionId(rawSummarySubscriptionId);', 'Answerlattice product billing normalizes active-subscription summary ID');
  assertIncludes(productBillingServer, ".where('tenantId', '==', tenantScope.numericId)", 'Answerlattice product billing fallback query uses normalized tenant scope');
  assertIncludes(productBillingServer, ".where('storeId', '==', storeScope.numericId)", 'Answerlattice product billing fallback query uses normalized store scope');
  assertIncludes(productBillingServer, 'const subscriptionId = normalizeAnswerlatticeSubscriptionId(subscription.id || subscription.providerSubscriptionId);', 'Answerlattice product billing normalizes entitlement subscription ID');
  assertIncludes(productBillingServer, 'const providerSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription.providerSubscriptionId || subscription.id);', 'Answerlattice product billing normalizes entitlement provider subscription ID');
  assertIncludes(productBillingServer, 'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(subscription.storeId ?? subscription.sId);', 'Answerlattice product billing entitlement sync normalizes store scope');
  assertIncludes(productBillingServer, 'db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).set({', 'Answerlattice product billing entitlement sync uses normalized store ref');
  assertIncludes(productBillingServer, 'db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({', 'Answerlattice product billing entitlement write uses normalized ID');
  assertNotIncludes(aiAccounting, '.doc(subscription.id)', 'Answerlattice AI accounting must not build raw subscription refs');
  assertNotIncludes(billing, 'doc(answerlatticeFirebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS, subscriptionId)', 'Answerlattice billing must not build raw subscription document refs');
  assertNotIncludes(intakeUsageLedger, '.doc(ledgerId)', 'Answerlattice intake ledger must not build raw ledger refs');
  assertNotIncludes(intakeUsageLedger, 'const summaryId = cleanText(summary.id || summary.providerSubscriptionId, 180);', 'Answerlattice intake ledger must not use raw text-cleaned subscription summary refs');
  assertNotIncludes(knowledgeIntakeApi, '.doc(summarySubscriptionId)', 'Answerlattice Knowledge Intake API must not build raw license subscription refs');
  assertNotIncludes(onboardRoute, '.doc(providerSubscriptionId)', 'Answerlattice onboarding must not build raw provider subscription refs');
  assertNotIncludes(productBillingServer, '.doc(providerSubscriptionId)', 'Answerlattice product billing must not build raw provider subscription refs');
  assertNotIncludes(productBillingServer, '.doc(subscription.id)', 'Answerlattice product billing must not build raw subscription refs');
  assertNotIncludes(productBillingServer, '.doc(String(storeId))', 'Answerlattice product billing must not build raw store refs');
  assertNotIncludes(productBillingServer, '.doc(storeId).set({', 'Answerlattice product billing must not write raw store entitlement refs');
  assertNotIncludes(productBillingServer, 'const summarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || \'\').trim();', 'Answerlattice product billing must not use raw summary subscription refs');
  [
    ['Answerlattice Billing README', billingReadme],
    ['Answerlattice Billing Firebase docs', billingFirebase],
    ['Knowledge Intake Firebase docs', knowledgeIntakeFirebase],
    ['Answerlattice data inventory map', dataInventoryMap],
    ['Answerlattice data inventory evidence', dataInventoryEvidence],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Billing Document ID Boundary', `Answerlattice billing document ID boundary documented in ${label}`);
  });
  assertIncludes(productBillingServer, 'answerlattice_subscription_entitlement_sync_failed', 'Answerlattice product billing entitlement sync failure diagnostic');
  assertIncludes(productBillingServer, 'getAnswerlatticeBillingEntitlementLogContext', 'Answerlattice product billing bounded entitlement context');
  assertNotIncludes(productBillingServer, 'logger.error', 'Answerlattice product billing must not raw-log entitlement sync failures');
  assertNotIncludes(productBillingServer, 'Failed to sync Answerlattice subscription entitlement', 'Answerlattice product billing must not use legacy raw entitlement failure message');
  assertNotIncludes(productBillingServer, 'subscriptionId: subscription.id', 'Answerlattice product billing must not log raw subscription IDs');
  assertNotIncludes(productBillingServer, 'tenantId: subscription.tenantId', 'Answerlattice product billing must not log raw tenant IDs');
  assertNotIncludes(productBillingServer, 'storeId: subscription.storeId', 'Answerlattice product billing must not log raw store IDs');
  assertIncludes(faqManagement, 'answerlattice_faq_summary_refresh_after_save_failed', 'Answerlattice FAQ summary refresh save diagnostic');
  assertIncludes(faqManagement, 'answerlattice_faq_summary_refresh_after_archive_failed', 'Answerlattice FAQ summary refresh archive diagnostic');
  assertIncludes(faqManagement, 'getBoundedAnswerlatticeStringContext', 'Answerlattice FAQ management bounded context');
  assertIncludes(queryEmbeddings, 'answerlattice_query_embedding_stale_delete_failed', 'Answerlattice query embedding stale-delete failure diagnostic');
  assertIncludes(queryEmbeddings, "getBoundedAnswerlatticeStringContext('cacheKey', cacheKey)", 'Answerlattice query embedding bounded cache-key metadata');
  assertIncludes(queryEmbeddings, 'cacheAgeDays', 'Answerlattice query embedding bounded cache age metadata');
  assertNotIncludes(entityExtraction, 'Failed to store entity candidate "', 'Answerlattice entity extraction raw entity-name diagnostic');
  assertNotIncludes(entities, "markAnswerlatticeTenantHasEntities(data.tId, data.sId, 'entity_created').catch(() => undefined)", 'Answerlattice entity tenant summary marker silent catch');
  assertNotIncludes(signalMutation, 'Failed to create mutation proposal for entity', 'Answerlattice mutation raw entity diagnostic');
  assertNotIncludes(faqManagement, '[Answerlattice FAQ] Product surface summary refresh failed after FAQ save', 'Answerlattice FAQ raw save summary diagnostic');
  assertNotIncludes(faqManagement, '[Answerlattice FAQ] Product surface summary refresh failed after FAQ archive', 'Answerlattice FAQ raw archive summary diagnostic');
  assertNotIncludes(queryEmbeddings, 'await docRef.delete().catch(() => undefined);', 'Answerlattice query embedding stale-delete silent catch');
}

function verifyWorkflowIntegrationAdapterSafety() {
  const slackAdapter = read('functions-answerlattice/src/integrations/adapters/slackAdapter.ts');
  const emailAdapter = read('functions-answerlattice/src/integrations/adapters/emailAdapter.ts');
  const githubAdapter = read('functions-answerlattice/src/integrations/adapters/githubAdapter.ts');
  const linearAdapter = read('functions-answerlattice/src/integrations/adapters/linearAdapter.ts');
  const networkTarget = read('functions-answerlattice/src/utils/networkTarget.ts');
  const configStore = read('functions-answerlattice/src/integrations/configStore.ts');
  const eventBus = read('functions-answerlattice/src/integrations/eventBus.ts');
  const eventProcessor = read('functions-answerlattice/src/integrations/eventProcessor.ts');
  const deliveryLogger = read('functions-answerlattice/src/integrations/deliveryLogger.ts');

  assertIncludes(networkTarget, 'export async function validateNetworkTargetUrl', 'Answerlattice Functions network target validator');
  assertIncludes(networkTarget, 'isBlockedNetworkTarget', 'Answerlattice Functions network target private-address guard');
  assertIncludes(networkTarget, "error: 'blocked_resolved_address'", 'Answerlattice Functions network target DNS guard');

  assertIncludes(slackAdapter, 'resolveSlackWebhookTarget', 'Answerlattice Slack adapter target resolver');
  assertIncludes(slackAdapter, 'validateNetworkTargetUrl(parsed.toString())', 'Answerlattice Slack adapter DNS target validation');
  assertIncludes(slackAdapter, 'webhookTarget.normalizedUrl', 'Answerlattice Slack adapter normalized webhook fetch');
  assertIncludes(slackAdapter, "error: 'Slack delivery returned bad status'", 'Answerlattice Slack adapter fixed bad-status error');
  assertIncludes(slackAdapter, "error: 'Slack delivery failed'", 'Answerlattice Slack adapter fixed request failure error');
  assertNotIncludes(slackAdapter, 'fetch(config.webhookUrl', 'Answerlattice Slack adapter raw webhook fetch');
  assertNotIncludes(slackAdapter, 'const errorText = await response.text()', 'Answerlattice Slack adapter raw provider response text');
  assertNotIncludes(slackAdapter, 'sanitizeDeliveryError(errorText)', 'Answerlattice Slack adapter raw provider response persistence');
  assertNotIncludes(slackAdapter, 'sanitizeDeliveryError(error)', 'Answerlattice Slack adapter raw exception persistence');

  assertIncludes(githubAdapter, 'function encodeGithubPathSegment', 'Answerlattice GitHub adapter path-segment encoder');
  assertIncludes(githubAdapter, 'encodeURIComponent(normalized)', 'Answerlattice GitHub adapter encoded owner/repo path segments');
  assertIncludes(githubAdapter, '${encodedOwner}/${encodedRepo}/issues', 'Answerlattice GitHub adapter encoded issue endpoint');
  assertIncludes(githubAdapter, 'issueUrlPresent', 'Answerlattice GitHub adapter bounded issue URL diagnostic');
  assertIncludes(githubAdapter, "error: 'GitHub issue creation returned bad status'", 'Answerlattice GitHub adapter fixed bad-status error');
  assertIncludes(githubAdapter, "error: 'GitHub issue creation failed'", 'Answerlattice GitHub adapter fixed request failure error');
  assertNotIncludes(githubAdapter, '${config.owner}/${config.repo}/issues', 'Answerlattice GitHub adapter raw owner/repo path interpolation');
  assertNotIncludes(githubAdapter, 'issueUrl: data.html_url', 'Answerlattice GitHub adapter raw issue URL diagnostic');
  assertNotIncludes(githubAdapter, 'const errorText = await response.text()', 'Answerlattice GitHub adapter raw provider response text');
  assertNotIncludes(githubAdapter, 'sanitizeDeliveryError(errorText)', 'Answerlattice GitHub adapter raw provider response persistence');
  assertNotIncludes(githubAdapter, 'sanitizeDeliveryError(error)', 'Answerlattice GitHub adapter raw exception persistence');

  assertIncludes(linearAdapter, 'issueIdentifierPresent', 'Answerlattice Linear adapter bounded issue identifier diagnostic');
  assertIncludes(linearAdapter, 'issueIdPresent', 'Answerlattice Linear adapter bounded issue ID diagnostic');
  assertIncludes(linearAdapter, "error: 'Linear issue creation returned bad status'", 'Answerlattice Linear adapter fixed bad-status error');
  assertIncludes(linearAdapter, "error: 'Linear issue creation returned errors'", 'Answerlattice Linear adapter fixed GraphQL error');
  assertIncludes(linearAdapter, "error: 'Linear issue creation failed'", 'Answerlattice Linear adapter fixed request failure error');
  assertNotIncludes(linearAdapter, 'issueIdentifier: issue?.identifier', 'Answerlattice Linear adapter raw issue identifier diagnostic');
  assertNotIncludes(linearAdapter, 'issueId: issue?.id', 'Answerlattice Linear adapter raw issue ID diagnostic');
  assertNotIncludes(linearAdapter, 'const errorText = await response.text()', 'Answerlattice Linear adapter raw provider response text');
  assertNotIncludes(linearAdapter, 'sanitizeDeliveryError(errorText)', 'Answerlattice Linear adapter raw provider response persistence');
  assertNotIncludes(linearAdapter, 'sanitizeDeliveryError(data.errors[0]?.message', 'Answerlattice Linear adapter raw provider error persistence');
  assertNotIncludes(linearAdapter, 'sanitizeDeliveryError(error)', 'Answerlattice Linear adapter raw exception persistence');

  assertIncludes(emailAdapter, "error: 'SMTP delivery failed'", 'Answerlattice email adapter fixed SMTP failure error');
  assertNotIncludes(emailAdapter, 'error instanceof Error ? error.message', 'Answerlattice email adapter raw SMTP exception message');
  assertNotIncludes(emailAdapter, 'sanitizeDeliveryError(error', 'Answerlattice email adapter raw SMTP exception persistence');

  assertIncludes(deliveryLogger, 'boundedDeliveryStringContext', 'Answerlattice delivery logger bounded string context');
  assertIncludes(deliveryLogger, 'getDeliveryLoggerErrorContext', 'Answerlattice delivery logger source error context');
  assertIncludes(deliveryLogger, "failureCode: 'answerlattice_integration_delivery_log_write_failed'", 'Answerlattice delivery-log write failure code');
  assertIncludes(deliveryLogger, "failureCode: 'answerlattice_integration_event_status_update_failed'", 'Answerlattice event-status update failure code');
  assertIncludes(deliveryLogger, "failureCode: 'answerlattice_integration_health_update_failed'", 'Answerlattice integration-health update failure code');
  assertIncludes(deliveryLogger, "...boundedDeliveryStringContext('eventId', params.eventId)", 'Answerlattice delivery logger bounded event ID context');
  assertIncludes(deliveryLogger, 'hasTenantScope: Number.isFinite(params.tId)', 'Answerlattice delivery logger bounded tenant scope');
  assertIncludes(deliveryLogger, 'sourceErrorName', 'Answerlattice delivery logger source error name');
  assertIncludes(deliveryLogger, 'sourceErrorCode', 'Answerlattice delivery logger source error code');
  assertIncludes(deliveryLogger, 'sourceErrorStatus', 'Answerlattice delivery logger source error status');
  assertNotIncludes(deliveryLogger, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice delivery logger raw exception text');

  assertIncludes(eventBus, 'getIntegrationEventScopeContext', 'Answerlattice event bus bounded scope context');
  assertIncludes(eventBus, 'getIntegrationEventErrorContext', 'Answerlattice event bus source error context');
  assertIncludes(eventBus, "failureCode: 'answerlattice_integration_event_cap_reached'", 'Answerlattice event bus cap failure code');
  assertIncludes(eventBus, "failureCode: 'answerlattice_integration_event_emit_failed'", 'Answerlattice event bus emit failure code');
  assertIncludes(eventBus, 'payloadKeyCount: Object.keys(event.payload || {}).length', 'Answerlattice event bus emitted payload count');
  assertIncludes(eventBus, 'payloadKeyCount: Object.keys(params.payload || {}).length', 'Answerlattice event bus failure payload count');
  assertIncludes(eventBus, '...getIntegrationEventScopeContext(params)', 'Answerlattice event bus bounded scope metadata');
  assertIncludes(eventBus, 'sourceErrorName', 'Answerlattice event bus source error name');
  assertIncludes(eventBus, 'sourceErrorCode', 'Answerlattice event bus source error code');
  assertIncludes(eventBus, 'sourceErrorStatus', 'Answerlattice event bus source error status');
  assertNotIncludes(eventBus, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice event bus raw exception text');

  assertIncludes(eventProcessor, 'getEventProcessorStringContext', 'Answerlattice event processor bounded string context');
  assertIncludes(eventProcessor, 'getEventProcessorScopeContext', 'Answerlattice event processor bounded scope context');
  assertIncludes(eventProcessor, 'getEventProcessorSourceErrorContext', 'Answerlattice event processor source error context');
  assertIncludes(eventProcessor, 'logEventProcessorFailure', 'Answerlattice event processor bounded side-effect failure logger');
  assertIncludes(eventProcessor, "failureCode: 'answerlattice_integration_event_invalid_skipped'", 'Answerlattice event processor invalid-event failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_event_status_update_failed'", 'Answerlattice event processor status update failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_adapter_minute_rate_limit_check_failed'", 'Answerlattice event processor minute rate-limit failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_adapter_daily_rate_limit_check_failed'", 'Answerlattice event processor daily rate-limit failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_email_recipient_limit_check_failed'", 'Answerlattice event processor email recipient rate-limit failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_delivery_success_record_failed'", 'Answerlattice event processor success-record failure code');
  assertIncludes(eventProcessor, "'answerlattice_integration_delivery_failure_record_failed'", 'Answerlattice event processor failure-record failure code');
  assertIncludes(eventProcessor, "...getEventProcessorStringContext('eventId', eventId)", 'Answerlattice event processor bounded event ID context');
  assertIncludes(eventProcessor, '...getEventProcessorScopeContext(event)', 'Answerlattice event processor bounded scope metadata');
  assertIncludes(eventProcessor, 'sourceErrorName', 'Answerlattice event processor source error name');
  assertIncludes(eventProcessor, 'sourceErrorCode', 'Answerlattice event processor source error code');
  assertIncludes(eventProcessor, 'sourceStatusCode', 'Answerlattice event processor source status code');
  assertNotIncludes(eventProcessor, "logger.warn('[Answerlattice Integration] Invalid event skipped', { eventId });", 'Answerlattice event processor raw invalid-event ID log');
  assertNotIncludes(eventProcessor, 'tId: event.tId,\n                sId: event.sId,\n                eventId,', 'Answerlattice event processor raw delivery ID log');
  assertNotIncludes(eventProcessor, 'logger.info(\'[Answerlattice Integration] No enabled adapters for event\', {\n            tId: event.tId,\n            sId: event.sId,\n            eventId,', 'Answerlattice event processor raw no-adapter ID log');
  assertNotIncludes(eventProcessor, 'updateEventStatus(eventId, \'failed\').catch(() => { });', 'Answerlattice event processor silent invalid status catch');
  assertNotIncludes(eventProcessor, 'updateEventStatus(eventId, \'processing\').catch(() => { });', 'Answerlattice event processor silent processing status catch');
  assertNotIncludes(eventProcessor, 'consumeAdapterMinuteSlot(event.tId, event.sId, adapterType).catch(() => false)', 'Answerlattice event processor silent minute rate-limit catch');
  assertNotIncludes(eventProcessor, 'consumeAdapterDailySlot(event.tId, event.sId, adapterType).catch(() => false)', 'Answerlattice event processor silent daily rate-limit catch');
  assertNotIncludes(eventProcessor, 'filterEmailRecipientsByDailyLimit(event.tId, event.sId, recipients).catch(() => [])', 'Answerlattice event processor silent email rate-limit catch');
  assertNotIncludes(eventProcessor, 'recordDeliverySuccess(event.tId, event.sId, adapterType).catch(() => { });', 'Answerlattice event processor silent success-record catch');
  assertNotIncludes(eventProcessor, 'recordDeliveryFailure(event.tId, event.sId, adapterType, currentFailures).catch(() => { });', 'Answerlattice event processor silent failure-record catch');
  assertNotIncludes(eventProcessor, 'updateEventStatus(eventId, finalStatus).catch(() => { });', 'Answerlattice event processor silent final status catch');
  assertNotIncludes(eventProcessor, 'updateEventStatus(eventId, \'delivered\').catch(() => { });', 'Answerlattice event processor silent no-adapter status catch');

  assertIncludes(configStore, 'getIntegrationConfigScopeContext', 'Answerlattice integration config bounded scope context');
  assertIncludes(configStore, "failureCode: 'answerlattice_integration_circuit_breaker_opened'", 'Answerlattice integration config circuit-breaker failure code');
  assertIncludes(configStore, '...getIntegrationConfigScopeContext(tId, sId)', 'Answerlattice integration config bounded circuit-breaker scope');
  assertNotIncludes(configStore, "logger.warn('[Answerlattice Integration] Circuit breaker opened', {\n            tId,\n            sId,", 'Answerlattice integration config raw circuit-breaker scope log');
}

function verifyAnswerlatticeRetentionDiagnostics() {
  const dataRetention = read('functions-answerlattice/src/answerlattice/dataRetention.ts');

  assertIncludes(dataRetention, "const RETENTION_TASK_FAILED = 'ANSWERLATTICE_RETENTION_TASK_FAILED';", 'Answerlattice retention fixed task failure code');
  assertIncludes(dataRetention, 'function getRetentionErrorContext', 'Answerlattice retention bounded source error context');
  assertIncludes(dataRetention, 'sourceErrorName', 'Answerlattice retention source error name');
  assertIncludes(dataRetention, 'sourceErrorCode', 'Answerlattice retention source error code');
  assertIncludes(dataRetention, 'sourceStatusCode', 'Answerlattice retention source status code');
  assertIncludes(dataRetention, 'result.errors.push(`${name}: ${RETENTION_TASK_FAILED}`);', 'Answerlattice retention fixed scheduler error text');
  assertIncludes(dataRetention, 'failureCode: RETENTION_TASK_FAILED', 'Answerlattice retention log failure code');
  assertNotIncludes(dataRetention, 'const message = error instanceof Error ? error.message : String(error);', 'Answerlattice retention raw exception message extraction');
  assertNotIncludes(dataRetention, 'result.errors.push(`${name}: ${message}`);', 'Answerlattice retention raw scheduler error text');
  assertNotIncludes(dataRetention, "logger.warn('[Answerlattice Retention] Cleanup task failed', { name, error: message });", 'Answerlattice retention raw logger error text');
}

function verifyAnswerlatticeNightlySchedulerDiagnostics() {
  const nightly = read('functions-answerlattice/src/answerlattice/answerlatticeNightly.ts');
  const entityIdBoundary = read('functions-answerlattice/src/answerlattice/entityIdBoundary.ts');
  const automaticKnowledgeImpl = read('__docs__/answerlattice/automatic-knowledge-creation/automatic-knowledge-creation_impl.md');
  const founderTrustImpl = read('__docs__/answerlattice/founder-trust-layer/founder-trust-layer_impl.md');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  assertIncludes(nightly, "const ANSWERLATTICE_SCHEDULER_TASK_FAILED = 'ANSWERLATTICE_SCHEDULER_TASK_FAILED';", 'Answerlattice nightly fixed scheduler task failure code');
  assertIncludes(nightly, "const ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED = 'ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED';", 'Answerlattice nightly run-log write failure code');
  assertIncludes(nightly, "const ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED = 'ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED';", 'Answerlattice nightly tenant-summary backfill failure code');
  assertIncludes(nightly, "const ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED = 'ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED';", 'Answerlattice nightly graph orphan warning code');
  assertIncludes(nightly, "const ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED = 'ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED';", 'Answerlattice nightly integration adapter check failure code');
  assertIncludes(nightly, 'function getAnswerlatticeSchedulerSourceErrorContext', 'Answerlattice nightly bounded source error context');
  assertIncludes(nightly, 'function getSchedulerDiagnosticLogContext', 'Answerlattice nightly bounded diagnostic log context');
  assertIncludes(nightly, 'function getBoundedSchedulerDetails', 'Answerlattice nightly bounded diagnostic details');
  assertIncludes(nightly, 'error: ANSWERLATTICE_SCHEDULER_TASK_FAILED', 'Answerlattice nightly fixed persisted diagnostic error');
  assertIncludes(nightly, 'details: getBoundedSchedulerDetails(context.details)', 'Answerlattice nightly bounded persisted details');
  assertIncludes(nightly, "const scope = diagnostic.tId != null && diagnostic.sId != null ? 'scoped' : 'global';", 'Answerlattice nightly bounded diagnostic message scope');
  assertIncludes(nightly, 'getSchedulerDiagnosticLogContext(diagnostic)', 'Answerlattice nightly bounded diagnostic logger payloads');
  assertIncludes(nightly, 'failureCode: ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED', 'Answerlattice nightly bounded run-log write failure');
  assertIncludes(nightly, 'failureCode: ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED', 'Answerlattice nightly bounded tenant-summary backfill failure');
  assertIncludes(nightly, 'failureCode: ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED', 'Answerlattice nightly bounded graph orphan warning');
  assertIncludes(nightly, "operation: 'hasEnabledIntegrationAdapter'", 'Answerlattice nightly integration adapter check operation diagnostic');
  assertIncludes(nightly, 'diagnostic.error = ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED', 'Answerlattice nightly integration adapter check fixed diagnostic');
  assertIncludes(nightly, "details: { reason: 'adapter_check_failed' }", 'Answerlattice nightly integration adapter check failed task detail');
  assertIncludes(nightly, "logger.error('[Answerlattice Nightly] Integration adapter check failed'", 'Answerlattice nightly integration adapter check bounded log');
  assertIncludes(nightly, 'errors: tenantRun.errors.slice(0, 5).map(diagnosticToMessage)', 'Answerlattice nightly bounded integration event errors');
  assertIncludes(entityIdBoundary, 'normalizeAnswerlatticeResolvedFunctionEntityId', 'Answerlattice nightly resolved entity ID normalizer');
  assertIncludes(nightly, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice nightly impact entity ID boundary import');
  assertIncludes(nightly, 'function normalizeAnswerlatticeFunctionEntityIds(values: unknown): string[]', 'Answerlattice nightly entity ID array normalizer');
  assert(
    (nightly.match(/const entityId = normalizeAnswerlatticeResolvedFunctionEntityId\(data\.entityId\);/g) || []).length >= 2,
    'Answerlattice nightly signal entity grouping must normalize stored signal entity IDs',
  );
  assertIncludes(nightly, 'const candidateEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entry.entityId);', 'Answerlattice nightly signal resolver search-index entity ID normalization');
  assertIncludes(nightly, 'bestEntityId = candidateEntityId;', 'Answerlattice nightly signal resolver writes normalized entity ID');
  assertIncludes(nightly, 'matchedEntityIds: normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds),', 'Answerlattice nightly coverage history matched entity ID normalization');
  assertIncludes(nightly, 'const answerEntityIds = normalizeAnswerlatticeFunctionEntityIds(answer.scope?.entityIds);', 'Answerlattice nightly drift answer scope normalization');
  assertIncludes(nightly, 'const primaryEntityId = answerEntityIds[0];', 'Answerlattice nightly drift primary entity normalization');
  assertIncludes(nightly, 'const otherEntityIds = normalizeAnswerlatticeFunctionEntityIds(other.scope?.entityIds);', 'Answerlattice nightly drift scope conflict normalization');
  assert(
    (nightly.match(/const entityIds = normalizeAnswerlatticeFunctionEntityIds\(answer\.scope\?\.entityIds\);/g) || []).length >= 1,
    'Answerlattice nightly trust answer scope normalization',
  );
  assertIncludes(nightly, 'const entityIds = normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds);', 'Answerlattice nightly recurring fallback matched entity ID normalization');
  assertIncludes(nightly, 'const entityIds = normalizeAnswerlatticeFunctionEntityIds(data.scope?.entityIds);', 'Answerlattice nightly graph answer scope normalization');
  assertIncludes(nightly, 'const fromId = normalizeAnswerlatticeResolvedFunctionEntityId(rel.fromEntityId);', 'Answerlattice nightly graph relation fromEntityId normalization');
  assertIncludes(nightly, 'const toId = normalizeAnswerlatticeResolvedFunctionEntityId(rel.toEntityId);', 'Answerlattice nightly graph relation toEntityId normalization');
  assertIncludes(nightly, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]);', 'Answerlattice nightly mutation impact entity ID normalization');
  assertNotIncludes(nightly, 'const entityId = proposal.relatedEntityIds?.[0];', 'Answerlattice nightly raw impact entity ID');
  assertNotIncludes(nightly, 'const entityId = data.entityId;', 'Answerlattice nightly raw signal entity grouping');
  assertNotIncludes(nightly, 'bestEntityId = entry.entityId;', 'Answerlattice nightly raw signal resolver entity ID write');
  assertNotIncludes(nightly, 'const primaryEntityId = answer.scope?.entityIds?.[0];', 'Answerlattice nightly raw drift primary entity ID');
  assertNotIncludes(nightly, 'const entityOverlap = answer.scope?.entityIds?.some', 'Answerlattice nightly raw scope conflict entity IDs');
  assertNotIncludes(nightly, 'const entityIds = data.matchedEntityIds || [];', 'Answerlattice nightly raw matched entity IDs');
  assertNotIncludes(nightly, "const entityId = typeof signal.entityId === 'string' ? signal.entityId : '';", 'Answerlattice nightly raw trust signal entity ID');
  assertNotIncludes(nightly, 'const entityIds: string[] = Array.isArray(answer.scope?.entityIds) ? answer.scope.entityIds : [];', 'Answerlattice nightly raw trust answer entity IDs');
  assertNotIncludes(nightly, 'const entityIds: string[] = data.scope?.entityIds || [];', 'Answerlattice nightly raw graph answer entity IDs');
  assertNotIncludes(nightly, 'const fromId: string = rel.fromEntityId;', 'Answerlattice nightly raw graph fromEntityId');
  assertNotIncludes(nightly, 'const toId: string = rel.toEntityId;', 'Answerlattice nightly raw graph toEntityId');
  [
    [automaticKnowledgeImpl, 'Automatic Knowledge Creation implementation docs'],
    [dataInventoryEvidence, 'Answerlattice data inventory evidence'],
    [productionAudit, 'production-readiness audit'],
    [changelog, 'changelog'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'Answerlattice Nightly Mutation Impact Entity ID Boundary', `${label} documents nightly mutation impact entity ID boundary`);
  });
  [
    [founderTrustImpl, 'Founder Trust implementation docs'],
    [dataInventoryEvidence, 'Answerlattice data inventory evidence'],
    [productionAudit, 'production-readiness audit'],
    [changelog, 'changelog'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'Answerlattice Nightly Scheduler Stored Entity ID Boundary', `${label} documents nightly scheduler stored entity ID boundary`);
  });
  assertNotIncludes(nightly, 'error: err?.message || String(error || \'Unknown error\')', 'Answerlattice nightly raw buildDiagnostic message');
  assertNotIncludes(nightly, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice nightly raw exception logger text');
  assertNotIncludes(nightly, "logger.error('[Answerlattice Nightly] Tenant task failed', diagnostic)", 'Answerlattice nightly raw tenant task diagnostic log');
  assertNotIncludes(nightly, "logger.error('[Answerlattice Nightly] Fatal scheduler failure', diagnostic)", 'Answerlattice nightly raw fatal diagnostic log');
  assertNotIncludes(nightly, "logger.warn('[Answerlattice GraphIndex] Orphan relation(s) skipped', { tId, sId", 'Answerlattice nightly raw graph orphan scope log');
  assertNotIncludes(nightly, 'errors: tenantRun.errors.slice(0, 5),', 'Answerlattice nightly raw diagnostic object integration payload');
  assertNotIncludes(nightly, 'hasEnabledIntegrationAdapter(tId, sId).catch(() => false)', 'Answerlattice nightly silent integration adapter check fallback');
}

function verifyAnswerlatticeMasterSchedulerDiagnostics() {
  const masterScheduler = read('functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts');

  assertIncludes(masterScheduler, "const ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED = 'ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED';", 'Answerlattice master scheduler fixed task failure code');
  assertIncludes(masterScheduler, "const ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED = 'ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED';", 'Answerlattice master scheduler fixed lease-release failure code');
  assertIncludes(masterScheduler, 'function getAnswerlatticeMasterSchedulerSourceErrorContext', 'Answerlattice master scheduler bounded source error context');
  assertIncludes(masterScheduler, 'sourceErrorName', 'Answerlattice master scheduler source error name');
  assertIncludes(masterScheduler, 'sourceErrorCode', 'Answerlattice master scheduler source error code');
  assertIncludes(masterScheduler, 'sourceStatusCode', 'Answerlattice master scheduler source status code');
  assertIncludes(masterScheduler, 'lastSourceErrorName: params.summary.sourceErrorName || null', 'Answerlattice master scheduler persisted source error name');
  assertIncludes(masterScheduler, 'lastSourceErrorCode: params.summary.sourceErrorCode ?? null', 'Answerlattice master scheduler persisted source error code');
  assertIncludes(masterScheduler, 'lastSourceStatusCode: params.summary.sourceStatusCode ?? null', 'Answerlattice master scheduler persisted source status code');
  assertIncludes(masterScheduler, 'error: ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED', 'Answerlattice master scheduler fixed summary error');
  assertIncludes(masterScheduler, 'failureCode: ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED', 'Answerlattice master scheduler fixed task failure log');
  assertIncludes(masterScheduler, 'failureCode: ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED', 'Answerlattice master scheduler fixed lease-release failure log');
  assertNotIncludes(masterScheduler, 'function errorMessage(error: unknown): string', 'Answerlattice master scheduler raw error helper');
  assertNotIncludes(masterScheduler, 'return error instanceof Error ? error.message', 'Answerlattice master scheduler raw error message extraction');
  assertNotIncludes(masterScheduler, 'String(error || \'Unknown error\')', 'Answerlattice master scheduler raw error string conversion');
  assertNotIncludes(masterScheduler, 'error: summary.error', 'Answerlattice master scheduler raw summary error log');
  assertNotIncludes(masterScheduler, 'error: errorMessage(error)', 'Answerlattice master scheduler raw lease-release error log');
}

function verifyAnswerlatticeOnboardingBootstrapDiagnostics() {
  const onboardingBootstrap = read('functions-answerlattice/src/answerlattice/onboardingBootstrap.ts');

  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_GEMINI_CALL_FAILED = 'ANSWERLATTICE_BOOTSTRAP_GEMINI_CALL_FAILED';", 'Answerlattice onboarding bootstrap Gemini failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_DISCOVERY_FAILED = 'ANSWERLATTICE_BOOTSTRAP_DISCOVERY_FAILED';", 'Answerlattice onboarding bootstrap discovery failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_EXTRACTION_BATCH_FAILED = 'ANSWERLATTICE_BOOTSTRAP_EXTRACTION_BATCH_FAILED';", 'Answerlattice onboarding bootstrap extraction failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_ENTITY_CANDIDATE_WRITE_FAILED = 'ANSWERLATTICE_BOOTSTRAP_ENTITY_CANDIDATE_WRITE_FAILED';", 'Answerlattice onboarding bootstrap candidate write failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_ENTITY_PROMOTION_FAILED = 'ANSWERLATTICE_BOOTSTRAP_ENTITY_PROMOTION_FAILED';", 'Answerlattice onboarding bootstrap promotion failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_DRAFT_GENERATION_FAILED = 'ANSWERLATTICE_BOOTSTRAP_DRAFT_GENERATION_FAILED';", 'Answerlattice onboarding bootstrap draft generation failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED = 'ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED';", 'Answerlattice onboarding bootstrap tenant failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED = 'ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED';", 'Answerlattice onboarding bootstrap job-status failure code');
  assertIncludes(onboardingBootstrap, "const ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED = 'ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED';", 'Answerlattice onboarding bootstrap fatal failure code');
  assertIncludes(onboardingBootstrap, 'function getBootstrapSourceErrorContext', 'Answerlattice onboarding bootstrap bounded source error context');
  assertIncludes(onboardingBootstrap, 'function getBootstrapScopeContext', 'Answerlattice onboarding bootstrap bounded scope context');
  assertIncludes(onboardingBootstrap, 'function getBootstrapStringContext', 'Answerlattice onboarding bootstrap bounded string context');
  assertIncludes(onboardingBootstrap, 'result.errors.push(ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED);', 'Answerlattice onboarding bootstrap fixed tenant scheduler error');
  assertIncludes(onboardingBootstrap, 'result.errors.push(ANSWERLATTICE_BOOTSTRAP_FATAL_FAILED);', 'Answerlattice onboarding bootstrap fixed fatal scheduler error');
  assertIncludes(onboardingBootstrap, "'onboardingBootstrap.errorMessage': ANSWERLATTICE_BOOTSTRAP_TENANT_FAILED", 'Answerlattice onboarding bootstrap fixed job error message');
  assertIncludes(onboardingBootstrap, 'failureCode: ANSWERLATTICE_BOOTSTRAP_JOB_STATUS_MARK_FAILED', 'Answerlattice onboarding bootstrap job-status marker diagnostic');
  assertNotIncludes(onboardingBootstrap, "logger.error('[Answerlattice Bootstrap] Gemini call failed', { error });", 'Answerlattice onboarding bootstrap raw Gemini error log');
  assertNotIncludes(onboardingBootstrap, "logger.error('[Answerlattice Bootstrap] Discovery failed', { error });", 'Answerlattice onboarding bootstrap raw discovery error log');
  assertNotIncludes(onboardingBootstrap, "logger.info('[Answerlattice Bootstrap] No unprocessed articles found. Skipping extraction.', { tId, sId });", 'Answerlattice onboarding bootstrap raw no-article scope log');
  assertNotIncludes(onboardingBootstrap, 'error: error instanceof Error ? error.message : String(error)', 'Answerlattice onboarding bootstrap raw caught error text');
  assertNotIncludes(onboardingBootstrap, "const msg = `${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown error'}`;", 'Answerlattice onboarding bootstrap raw tenant result error');
  assertNotIncludes(onboardingBootstrap, 'result.errors.push(msg);', 'Answerlattice onboarding bootstrap raw tenant scheduler error');
  assertNotIncludes(onboardingBootstrap, "logger.error('[Answerlattice Bootstrap] Tenant bootstrap failed', { tId, sId, error });", 'Answerlattice onboarding bootstrap raw tenant failure log');
  assertNotIncludes(onboardingBootstrap, "} catch { /* non-blocking */ }", 'Answerlattice onboarding bootstrap silent status marker catch');
  assertNotIncludes(onboardingBootstrap, "'onboardingBootstrap.errorMessage': msg.substring(0, 500)", 'Answerlattice onboarding bootstrap raw job error message');
  assertNotIncludes(onboardingBootstrap, "logger.error('[Answerlattice Bootstrap] Fatal error', { error });", 'Answerlattice onboarding bootstrap raw fatal error log');
  assertNotIncludes(onboardingBootstrap, 'result.errors.push(`Fatal: ${error instanceof Error ? error.message : \'Unknown\'}`);', 'Answerlattice onboarding bootstrap raw fatal scheduler error');
}

function verifyAnswerlatticeTicketKnowledgeDiagnostics() {
  const entityIdBoundary = read('functions-answerlattice/src/answerlattice/entityIdBoundary.ts');
  const resolutionExtractor = read('functions-answerlattice/src/answerlattice/resolutionExtractor.ts');

  assertIncludes(entityIdBoundary, 'normalizeAnswerlatticeResolvedFunctionEntityId', 'Answerlattice Functions resolved entity ID normalizer');
  assertIncludes(resolutionExtractor, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice ticket knowledge entity ID boundary import');
  assertIncludes(resolutionExtractor, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);', 'Answerlattice ticket knowledge signal entity ID normalization');
  assertIncludes(resolutionExtractor, 'const normalizedEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entityId);', 'Answerlattice ticket knowledge entity lookup normalization');
  assertIncludes(resolutionExtractor, '.doc(normalizedEntityId).get()', 'Answerlattice ticket knowledge normalized entity document lookup');
  assertNotIncludes(resolutionExtractor, '.doc(entityId).get()', 'Answerlattice ticket knowledge raw entity document lookup');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_GEMINI_CALL_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_GEMINI_CALL_FAILED';", 'Answerlattice ticket knowledge Gemini failure code');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND = 'ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND';", 'Answerlattice ticket knowledge entity missing failure code');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED';", 'Answerlattice ticket knowledge parse failure code');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED';", 'Answerlattice ticket knowledge entity extraction failure code');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED';", 'Answerlattice ticket knowledge existing-answer lookup failure code');
  assertIncludes(resolutionExtractor, "const ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED = 'ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED';", 'Answerlattice ticket knowledge fatal failure code');
  assertIncludes(resolutionExtractor, 'function getTicketKnowledgeSourceErrorContext', 'Answerlattice ticket knowledge bounded source error context');
  assertIncludes(resolutionExtractor, 'function getTicketKnowledgeScopeContext', 'Answerlattice ticket knowledge bounded scope context');
  assertIncludes(resolutionExtractor, 'function getTicketKnowledgeStringContext', 'Answerlattice ticket knowledge bounded string context');
  assertIncludes(resolutionExtractor, 'result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_NOT_FOUND);', 'Answerlattice ticket knowledge fixed missing-entity scheduler error');
  assertIncludes(resolutionExtractor, 'result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_PARSE_FAILED);', 'Answerlattice ticket knowledge fixed parse scheduler error');
  assertIncludes(resolutionExtractor, 'result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_ENTITY_EXTRACTION_FAILED);', 'Answerlattice ticket knowledge fixed entity scheduler error');
  assertIncludes(resolutionExtractor, 'result.errors.push(ANSWERLATTICE_TICKET_KNOWLEDGE_FATAL_FAILED);', 'Answerlattice ticket knowledge fixed fatal scheduler error');
  assertIncludes(resolutionExtractor, 'failureCode: ANSWERLATTICE_TICKET_KNOWLEDGE_EXISTING_ANSWERS_LOAD_FAILED', 'Answerlattice ticket knowledge existing-answer lookup diagnostic');
  assertNotIncludes(resolutionExtractor, "logger.error('[Answerlattice TicketKnowledge] Gemini call failed', { error });", 'Answerlattice ticket knowledge raw Gemini error log');
  assertNotIncludes(resolutionExtractor, 'result.errors.push(`Entity ${cluster.entityId} not found`);', 'Answerlattice ticket knowledge raw missing entity error');
  assertNotIncludes(resolutionExtractor, 'result.errors.push(`Failed to parse extraction for entity ${entity.name}`);', 'Answerlattice ticket knowledge raw parse error');
  assertNotIncludes(resolutionExtractor, "const msg = `Entity ${cluster.entityId}: ${error instanceof Error ? error.message : 'Unknown'}`;", 'Answerlattice ticket knowledge raw entity exception message');
  assertNotIncludes(resolutionExtractor, 'result.errors.push(msg);', 'Answerlattice ticket knowledge raw scheduler error push');
  assertNotIncludes(resolutionExtractor, "logger.error('[Answerlattice TicketKnowledge] Entity extraction failed', {\n                    tId,\n                    sId,\n                    entityId: cluster.entityId,\n                    error,", 'Answerlattice ticket knowledge raw entity extraction log');
  assertNotIncludes(resolutionExtractor, "} catch { /* non-blocking */ }", 'Answerlattice ticket knowledge silent existing-answer lookup catch');
  assertNotIncludes(resolutionExtractor, "const msg = `Fatal: ${error instanceof Error ? error.message : 'Unknown'}`;", 'Answerlattice ticket knowledge raw fatal exception message');
  assertNotIncludes(resolutionExtractor, "logger.error('[Answerlattice TicketKnowledge] Fatal extraction failure', { tId, sId, error });", 'Answerlattice ticket knowledge raw fatal error log');
}

function verifyAnswerlatticeFrictionDiagnostics() {
  const frictionInsight = read('functions-answerlattice/src/answerlattice/frictionInsight.ts');
  const frictionAggregation = read('functions-answerlattice/src/answerlattice/frictionAggregation.ts');

  assertIncludes(frictionInsight, "const ANSWERLATTICE_FRICTION_INSIGHT_GEMINI_FAILED = 'ANSWERLATTICE_FRICTION_INSIGHT_GEMINI_FAILED';", 'Answerlattice friction insight Gemini failure code');
  assertIncludes(frictionInsight, "const ANSWERLATTICE_FRICTION_INSIGHT_FAILED = 'ANSWERLATTICE_FRICTION_INSIGHT_FAILED';", 'Answerlattice friction insight fatal failure code');
  assertIncludes(frictionInsight, 'function getFrictionInsightSourceErrorContext', 'Answerlattice friction insight bounded source error context');
  assertIncludes(frictionInsight, 'function getFrictionInsightScopeContext', 'Answerlattice friction insight bounded scope context');
  assertIncludes(frictionInsight, 'return { generated: false, skippedReason: ANSWERLATTICE_FRICTION_INSIGHT_FAILED };', 'Answerlattice friction insight fixed failure skipped reason');
  assertNotIncludes(frictionInsight, "logger.error('[Answerlattice Friction Insight] Gemini call failed', { error });", 'Answerlattice friction insight raw Gemini error log');
  assertNotIncludes(frictionInsight, "logger.info('[Answerlattice Friction Insight] Generated', { tId, sId, overallHealth: aiResult.insight.overallHealth });", 'Answerlattice friction insight raw success scope log');
  assertNotIncludes(frictionInsight, "logger.error('[Answerlattice Friction Insight] Failed', { tId, sId, error });", 'Answerlattice friction insight raw fatal error log');
  assertNotIncludes(frictionInsight, "skippedReason: `error: ${error instanceof Error ? error.message : 'unknown'}`", 'Answerlattice friction insight raw skipped reason');

  assertIncludes(frictionAggregation, "const ANSWERLATTICE_FRICTION_AGGREGATION_FAILED = 'ANSWERLATTICE_FRICTION_AGGREGATION_FAILED';", 'Answerlattice friction aggregation failure code');
  assertIncludes(frictionAggregation, "const ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED = 'ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED';", 'Answerlattice friction cleanup failure code');
  assertIncludes(frictionAggregation, 'function getFrictionAggregationSourceErrorContext', 'Answerlattice friction aggregation bounded source error context');
  assertIncludes(frictionAggregation, 'function getFrictionAggregationScopeContext', 'Answerlattice friction aggregation bounded scope context');
  assertIncludes(frictionAggregation, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice friction aggregation entity ID boundary import');
  assertIncludes(frictionAggregation, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);', 'Answerlattice friction aggregation signal entity ID normalization');
  assertIncludes(frictionAggregation, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(rawEntityId);', 'Answerlattice friction aggregation search-history entity ID normalization');
  assertIncludes(frictionAggregation, 'const eid = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);', 'Answerlattice friction aggregation historical entity ID normalization');
  assertNotIncludes(frictionAggregation, "logger.error('[Answerlattice Friction] Aggregation failed', { tId, sId, error });", 'Answerlattice friction aggregation raw failure log');
  assertNotIncludes(frictionAggregation, "logger.error('[Answerlattice Friction] Stats cleanup failed', { tId, sId, retentionDays, batchLimit, error });", 'Answerlattice friction cleanup raw failure log');
}

function verifyAnswerlatticePredictiveTriggerDiagnostics() {
  const predictiveTriggerSync = read('functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts');
  const dataInventoryEvidence = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_evidence.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(predictiveTriggerSync, "const ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED';", 'Answerlattice predictive trigger auto-generation failure code');
  assertIncludes(predictiveTriggerSync, "const ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED';", 'Answerlattice predictive trigger cache rebuild failure code');
  assertIncludes(predictiveTriggerSync, "const ANSWERLATTICE_PREDICTIVE_TRIGGER_EFFECTIVENESS_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_EFFECTIVENESS_FAILED';", 'Answerlattice predictive trigger effectiveness failure code');
  assertIncludes(predictiveTriggerSync, 'function getPredictiveTriggerSourceErrorContext', 'Answerlattice predictive trigger bounded source error context');
  assertIncludes(predictiveTriggerSync, 'function getPredictiveTriggerScopeContext', 'Answerlattice predictive trigger bounded scope context');
  assertIncludes(predictiveTriggerSync, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice predictive trigger entity ID boundary import');
  assertIncludes(predictiveTriggerSync, '.map(entityId => normalizeAnswerlatticeResolvedFunctionEntityId(entityId))', 'Answerlattice predictive trigger target entity ID normalization');
  assertIncludes(predictiveTriggerSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(rawEntityId);', 'Answerlattice predictive trigger answer scope entity ID normalization');
  assertIncludes(predictiveTriggerSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.action?.entityId);', 'Answerlattice predictive trigger existing action entity ID normalization');
  assertIncludes(predictiveTriggerSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(entity.entityId);', 'Answerlattice predictive trigger friction entity ID normalization');
  assertIncludes(predictiveTriggerSync, '.map(trigger => normalizeAnswerlatticeResolvedFunctionEntityId(trigger.action.entityId))', 'Answerlattice predictive trigger active trigger entity ID normalization');
  assertIncludes(predictiveTriggerSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(trigger.action?.entityId);', 'Answerlattice predictive trigger cache lookup entity ID normalization');
  assertNotIncludes(predictiveTriggerSync, ".filter((entityId): entityId is string => typeof entityId === 'string' && Boolean(entityId.trim()))", 'Answerlattice predictive trigger raw target entity ID trim filter');
  assertNotIncludes(predictiveTriggerSync, '.map(entityId => entityId.trim())', 'Answerlattice predictive trigger raw target entity ID trim map');
  assertNotIncludes(predictiveTriggerSync, 'coveredEntityIds.add(data.action.entityId);', 'Answerlattice predictive trigger raw covered action entity ID');
  assertNotIncludes(predictiveTriggerSync, 'if (!entity.entityId || !entity.entityName) continue;', 'Answerlattice predictive trigger raw friction entity guard');
  assertNotIncludes(predictiveTriggerSync, 'if (coveredEntityIds.has(entity.entityId)) continue;', 'Answerlattice predictive trigger raw covered friction entity ID');
  assertNotIncludes(predictiveTriggerSync, 'entityId: entity.entityId,', 'Answerlattice predictive trigger raw friction entity ID write');
  assertNotIncludes(predictiveTriggerSync, '.map(trigger => trigger.action.entityId as string);', 'Answerlattice predictive trigger raw active trigger entity ID list');
  assertNotIncludes(predictiveTriggerSync, 'answersByEntity.get(trigger.action.entityId)', 'Answerlattice predictive trigger raw cache lookup entity ID');
  assertIncludes(dataInventoryEvidence, 'Answerlattice Predictive Trigger Entity ID Boundary', 'Answerlattice data inventory records predictive trigger entity ID boundary');
  assertIncludes(productionAudit, 'Answerlattice Predictive Trigger Entity ID Boundary checkpoint', 'Production audit records predictive trigger entity ID boundary');
  assertIncludes(changelog, 'Answerlattice Predictive Trigger Entity ID Boundary', 'Changelog records predictive trigger entity ID boundary');
  assertIncludes(lowercaseChangelog, 'Answerlattice Predictive Trigger Entity ID Boundary', 'Lowercase changelog records predictive trigger entity ID boundary');
  assertNotIncludes(predictiveTriggerSync, "logger.error('[Predictive Trigger Sync] Auto-generation failed', { tId, sId, error });", 'Answerlattice predictive trigger raw auto-generation log');
  assertNotIncludes(predictiveTriggerSync, "logger.error('[Predictive Trigger Sync] Cache rebuild failed', { tId, sId, error });", 'Answerlattice predictive trigger raw cache rebuild log');
  assertNotIncludes(predictiveTriggerSync, "logger.error('[Predictive Trigger Sync] Effectiveness update failed', { tId, sId, error });", 'Answerlattice predictive trigger raw effectiveness log');
}

function verifyAnswerlatticeDraftGeneratorDiagnostics() {
  const draftGenerator = read('functions-answerlattice/src/answerlattice/draftGenerator.ts');

  assertIncludes(draftGenerator, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice scheduled draft entity ID boundary import');
  assertIncludes(draftGenerator, 'const normalizedEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entityId);', 'Answerlattice scheduled draft entity lookup normalization');
  assertIncludes(draftGenerator, '.doc(normalizedEntityId).get()', 'Answerlattice scheduled draft normalized entity document lookup');
  assertIncludes(draftGenerator, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]);', 'Answerlattice scheduled draft proposal entity ID normalization');
  assert(
    (draftGenerator.match(/entityId: normalizeAnswerlatticeResolvedFunctionEntityId\(proposal\.relatedEntityIds\?\.\[0\]\),/g) || []).length >= 2,
    'Answerlattice scheduled draft failure diagnostics must normalize proposal related entity IDs',
  );
  assertNotIncludes(draftGenerator, 'const entityId = proposal.relatedEntityIds?.[0];', 'Answerlattice scheduled draft raw proposal entity ID');
  assertNotIncludes(draftGenerator, 'entityId: proposal.relatedEntityIds?.[0] ?? null', 'Answerlattice scheduled draft raw diagnostic entity ID');
  assertNotIncludes(draftGenerator, '.doc(entityId).get()', 'Answerlattice scheduled draft raw entity document lookup');
  assertIncludes(draftGenerator, "const ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED = 'ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED';", 'Answerlattice scheduled draft Gemini failure code');
  assertIncludes(draftGenerator, "const ANSWERLATTICE_DRAFT_PARSE_FAILED = 'ANSWERLATTICE_DRAFT_PARSE_FAILED';", 'Answerlattice scheduled draft parse failure code');
  assertIncludes(draftGenerator, "const ANSWERLATTICE_DRAFT_PROPOSAL_FAILED = 'ANSWERLATTICE_DRAFT_PROPOSAL_FAILED';", 'Answerlattice scheduled draft proposal failure code');
  assertIncludes(draftGenerator, "const ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED = 'ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED';", 'Answerlattice scheduled draft status-marker failure code');
  assertIncludes(draftGenerator, "const ANSWERLATTICE_DRAFT_BATCH_FAILED = 'ANSWERLATTICE_DRAFT_BATCH_FAILED';", 'Answerlattice scheduled draft batch failure code');
  assertIncludes(draftGenerator, 'function getDraftSourceErrorContext', 'Answerlattice scheduled draft bounded source error context');
  assertIncludes(draftGenerator, 'function getDraftScopeContext', 'Answerlattice scheduled draft bounded scope context');
  assertIncludes(draftGenerator, 'function getDraftIdentifierContext', 'Answerlattice scheduled draft bounded identifier context');
  assertIncludes(draftGenerator, 'function getDraftDiagnosticContext', 'Answerlattice scheduled draft bounded diagnostic context');
  assertIncludes(draftGenerator, 'failureCode: ANSWERLATTICE_DRAFT_GEMINI_CALL_FAILED', 'Answerlattice scheduled draft bounded Gemini failure log');
  assertIncludes(draftGenerator, 'failureCode: ANSWERLATTICE_DRAFT_PARSE_FAILED', 'Answerlattice scheduled draft bounded parse failure log');
  assertIncludes(draftGenerator, 'failureCode: ANSWERLATTICE_DRAFT_PROPOSAL_FAILED', 'Answerlattice scheduled draft bounded proposal failure log');
  assertIncludes(draftGenerator, 'failureCode: ANSWERLATTICE_DRAFT_STATUS_MARK_FAILED', 'Answerlattice scheduled draft status-marker bounded failure log');
  assertIncludes(draftGenerator, 'failureCode: ANSWERLATTICE_DRAFT_BATCH_FAILED', 'Answerlattice scheduled draft bounded batch failure log');
  assertNotIncludes(draftGenerator, "logger.error('[Answerlattice Draft] Gemini call failed', { error });", 'Answerlattice scheduled draft raw Gemini error log');
  assertNotIncludes(draftGenerator, "logger.warn('[Answerlattice Draft] Failed to parse Gemini response', {\n                        tId,\n                        sId,\n                        proposalId: proposal.id,\n                    });", 'Answerlattice scheduled draft raw parse scope log');
  assertNotIncludes(draftGenerator, "logger.error('[Answerlattice Draft] Proposal draft generation failed', {\n                    tId,\n                    sId,\n                    proposalId: proposal.id,\n                    error,\n                });", 'Answerlattice scheduled draft raw proposal failure log');
  assertNotIncludes(draftGenerator, "} catch { /* non-blocking */ }", 'Answerlattice scheduled draft silent status-marker catch');
  assertNotIncludes(draftGenerator, "logger.error('[Answerlattice Draft] Batch failed', { tId, sId, error });", 'Answerlattice scheduled draft raw batch failure log');
}

function verifyAnswerlatticeSupportBoardSyncDiagnostics() {
  const entityIdBoundary = read('functions-answerlattice/src/answerlattice/entityIdBoundary.ts');
  const supportBoardSync = read('functions-answerlattice/src/answerlattice/supportBoardSync.ts');
  const supportBoardReadme = read('__docs__/answerlattice/support-board/README.md');
  const supportBoardImpl = read('__docs__/answerlattice/support-board/support-board_impl.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  assertIncludes(entityIdBoundary, 'ANSWERLATTICE_FUNCTION_ENTITY_ID_MAX_LENGTH = 180', 'Answerlattice Functions entity ID length cap');
  assertIncludes(entityIdBoundary, "entityId.includes('/')", 'Answerlattice Functions entity ID path separator guard');
  assertIncludes(supportBoardSync, "import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';", 'Answerlattice Support Board sync entity ID boundary import');
  assertIncludes(supportBoardSync, '.map(entityId => normalizeAnswerlatticeResolvedFunctionEntityId(entityId))', 'Answerlattice Support Board sync entity info normalization');
  assertIncludes(supportBoardSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);', 'Answerlattice Support Board sync signal entity ID normalization');
  assertIncludes(supportBoardSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(doc.data().entityId);', 'Answerlattice Support Board sync source signal entity ID normalization');
  assertIncludes(supportBoardSync, 'const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(id);', 'Answerlattice Support Board sync source entity ID set normalization');
  assertNotIncludes(supportBoardSync, 'entityIds.filter(Boolean)', 'Answerlattice Support Board sync raw entity ID filter');
  assertNotIncludes(supportBoardSync, "typeof id === 'string' && id && id !== 'unresolved'", 'Answerlattice Support Board sync raw source entity ID guard');
  assertIncludes(supportBoardSync, "const ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED = 'ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED';", 'Answerlattice Support Board sync fixed failure code');
  assertIncludes(supportBoardSync, 'interface SupportBoardSyncDiagnostic', 'Answerlattice Support Board sync bounded diagnostic type');
  assertIncludes(supportBoardSync, 'errors: SupportBoardSyncDiagnostic[];', 'Answerlattice Support Board sync bounded scheduler error type');
  assertIncludes(supportBoardSync, 'function getSupportBoardSourceErrorContext', 'Answerlattice Support Board sync bounded source error context');
  assertIncludes(supportBoardSync, 'function getSupportBoardScopeContext', 'Answerlattice Support Board sync bounded scope context');
  assertIncludes(supportBoardSync, 'result.errors.push({', 'Answerlattice Support Board sync object-shaped scheduler diagnostic');
  assertIncludes(supportBoardSync, "error: ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED", 'Answerlattice Support Board sync fixed result error');
  assertIncludes(supportBoardSync, "phase: 'support_board_sync'", 'Answerlattice Support Board sync fixed diagnostic phase');
  assertIncludes(supportBoardSync, "operation: 'syncSupportBoardNightly'", 'Answerlattice Support Board sync fixed diagnostic operation');
  assertIncludes(supportBoardSync, 'details: getSupportBoardScopeContext(tId, sId)', 'Answerlattice Support Board sync bounded diagnostic details');
  assertIncludes(supportBoardSync, 'failureCode: ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED', 'Answerlattice Support Board sync bounded failure log');
  assertIncludes(supportBoardSync, '...getSupportBoardScopeContext(tId, sId)', 'Answerlattice Support Board sync bounded scope log context');
  assertIncludes(supportBoardSync, 'exampleCount: number;', 'Answerlattice Support Board sync tracks source examples by count only');
  assertIncludes(supportBoardSync, 'this derived card stores counts and context only', 'Answerlattice Support Board sync documents count-only derived card text');
  assertNotIncludes(supportBoardSync, 'const message = error instanceof Error ? error.message : String(error);', 'Answerlattice Support Board sync raw error text extraction');
  assertNotIncludes(supportBoardSync, "logger.info('[Answerlattice SupportBoard] Nightly sync complete', {\n                tId,\n                sId,", 'Answerlattice Support Board sync raw success scope log');
  assertNotIncludes(supportBoardSync, "logger.error('[Answerlattice SupportBoard] Nightly sync failed', {\n            tId,\n            sId,\n            error: message,\n        });", 'Answerlattice Support Board sync raw failure log');
  assertNotIncludes(supportBoardSync, 'error: message', 'Answerlattice Support Board sync raw result error payload');
  assertNotIncludes(supportBoardSync, 'samples: string[];', 'Answerlattice Support Board sync must not store raw source text samples in candidate groups');
  assertNotIncludes(supportBoardSync, 'group.samples', 'Answerlattice Support Board sync must not render raw source text samples into derived cards');
  assertNotIncludes(supportBoardSync, 'Examples: ${', 'Answerlattice Support Board sync must not duplicate raw source examples in derived card descriptions');
  assertNotIncludes(supportBoardSync, 'result.errors.push(ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED);', 'Answerlattice Support Board sync must preserve failed-task accounting');
  [
    [supportBoardReadme, 'Support Board README'],
    [supportBoardImpl, 'Support Board implementation docs'],
    [productionAudit, 'Production-readiness audit'],
    [changelog, 'Changelog'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'Support Board nightly derived-card source-text duplication boundary', `${label} documents Support Board derived-card source text boundary`);
    assertIncludes(content, 'Answerlattice Functions signal-source entity ID boundary', `${label} documents Answerlattice Functions signal-source entity ID boundary`);
  });
}

function verifyAnswerlatticeReleaseActivationDiagnostics() {
  const releaseIdBoundary = read('src/lib/answerlattice/releaseIdBoundary.ts');
  const releases = read('src/database/answerlattice/releases.ts');
  const productionCertification = read('__docs__/answerlattice/answerlattice-production-certification.md');
  const activationClearance = read('__docs__/answerlattice/answerlattice-activation-clearance.md');
  const architectureEvolution = read('__docs__/answerlattice/doctrine/05-architecture-evolution.md');
  const dataInventoryMap = read('__docs__/answerlattice/data-inventory/answerlattice-data-inventory_data-map.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assertIncludes(releaseIdBoundary, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Answerlattice release ID boundary imports shared Firestore guard');
  assertIncludes(releaseIdBoundary, 'export function normalizeAnswerlatticeReleaseId(value: unknown): string | null {', 'Answerlattice release ID boundary exports normalizer');
  assertIncludes(releaseIdBoundary, 'isValidFirestoreDocumentId(releaseId)', 'Answerlattice release ID boundary validates Firestore document ID');
  assertIncludes(releases, "import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';", 'Answerlattice releases DAL ID boundary import');
  assertIncludes(releases, 'const normalizedDocId = normalizeAnswerlatticeReleaseId(docId);', 'Answerlattice release document ref normalizes release ID');
  assertIncludes(releases, "if (!normalizedDocId) throw new Error('Invalid Answerlattice release id');", 'Answerlattice release document ref rejects malformed release ID');
  assertIncludes(releases, 'return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);', 'Answerlattice release document ref uses normalized release ID');
  assertIncludes(releases, 'const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);', 'Answerlattice release actions normalize release ID');
  assertIncludes(releases, 'const releaseSnap = await getDoc(getDocRef(normalizedReleaseId));', 'Answerlattice release activation reads normalized release ID');
  assertIncludes(releases, 'await setDoc(getDocRef(normalizedReleaseId), await answerlatticeRequestBodyComposer({ status: \'processing\' }), { merge: true });', 'Answerlattice release activation processing write uses normalized release ID');
  assertIncludes(releases, 'entityId: normalizedReleaseId,', 'Answerlattice release activation audit uses normalized release ID');
  assertIncludes(releases, 'sourceId: normalizedReleaseId,', 'Answerlattice release source invalidation uses normalized release ID');
  assertIncludes(releases, '{ releaseId: normalizedReleaseId },', 'Answerlattice release action composer uses normalized release ID');
  assertNotIncludes(releases, 'doc(answerlatticeFirebaseClient, COLLECTION, docId)', 'Answerlattice releases DAL must not build raw release document refs');
  assertNotIncludes(releases, 'getDocRef(releaseId)', 'Answerlattice release actions must not use raw release document refs');
  assertNotIncludes(releases, 'entityId: releaseId', 'Answerlattice release audit must not use raw release ID');
  assertNotIncludes(releases, 'sourceId: releaseId', 'Answerlattice release source invalidation must not use raw release ID');
  assertIncludes(releases, "const ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED = 'ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED';", 'Answerlattice release activation fixed drift-evaluation failure code');
  assertIncludes(releases, 'const getReleaseActivationAuditState = (error: unknown) => {', 'Answerlattice release activation bounded audit state helper');
  assertIncludes(releases, 'failureCode: ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED', 'Answerlattice release activation fixed audit failure code');
  assertIncludes(releases, 'sourceErrorName: getReleaseActivationSourceErrorName(error)', 'Answerlattice release activation bounded source error name');
  assertIncludes(releases, 'sourceErrorCode', 'Answerlattice release activation bounded source error code');
  assertIncludes(releases, 'sourceStatusCode', 'Answerlattice release activation bounded source status code');
  assertIncludes(releases, "logRuntimeFailure('answerlattice_release_drift_evaluation_audit_log_failed'", 'Answerlattice release activation audit-log failure bounded diagnostic');
  assertIncludes(releases, "getBoundedRuntimeStringContext('releaseId', normalizedReleaseId)", 'Answerlattice release activation bounded release metadata');
  assertIncludes(releases, "getBoundedRuntimeStringContext('tenantId', release.tId)", 'Answerlattice release activation bounded tenant metadata');
  assertIncludes(releases, "getBoundedRuntimeStringContext('storeId', release.sId)", 'Answerlattice release activation bounded store metadata');
  assertNotIncludes(releases, 'newState: { error: error instanceof Error ? error.message : String(error) }', 'Answerlattice release activation raw audit error state');
  assertNotIncludes(releases, 'error.message', 'Answerlattice release activation must not store raw exception messages');
  assertNotIncludes(releases, 'String(error)', 'Answerlattice release activation must not stringify raw exceptions');
  assertNotIncludes(releases, '} catch { /* audit log failure must not cascade */ }', 'Answerlattice release activation audit-log failure silent catch');

  [
    ['Answerlattice production certification', productionCertification],
    ['Answerlattice activation clearance', activationClearance],
    ['Answerlattice architecture evolution doctrine', architectureEvolution],
    ['Answerlattice data inventory map', dataInventoryMap],
    ['production readiness audit', productionAudit],
    ['CHANGELOG', changelog],
    ['lowercase changelog', lowercaseChangelog],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'Answerlattice App Release ID Boundary', `${label} documents release ID boundary`);
  });
}

function verifyAnswerlatticeAiProviderHealthDiagnostics() {
  const aiProviderHealth = read('functions-answerlattice/src/answerlattice/aiProviderHealth.ts');

  assertIncludes(aiProviderHealth, "const ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED';", 'Answerlattice AI provider health fixed failure code');
  assertIncludes(aiProviderHealth, "const ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE';", 'Answerlattice AI provider health unexpected response code');
  assertIncludes(aiProviderHealth, 'function getProviderHealthSourceErrorContext', 'Answerlattice AI provider health bounded source error context');
  assertIncludes(aiProviderHealth, 'function getProviderHealthFailureCode', 'Answerlattice AI provider health fixed failure resolver');
  assertIncludes(aiProviderHealth, 'error: failureCode', 'Answerlattice AI provider health fixed stored error');
  assertIncludes(aiProviderHealth, '...getProviderHealthSourceErrorContext(error)', 'Answerlattice AI provider health bounded source metadata');
  assertIncludes(aiProviderHealth, 'throw new Error(failureCode);', 'Answerlattice AI provider health fixed thrown scheduler error');
  assertNotIncludes(aiProviderHealth, 'function compactError', 'Answerlattice AI provider health raw compact error helper');
  assertNotIncludes(aiProviderHealth, 'return String(error || \'Unknown provider error\').slice(0, 500);', 'Answerlattice AI provider health raw string conversion');
  assertNotIncludes(aiProviderHealth, 'error: message', 'Answerlattice AI provider health raw stored error text');
  assertNotIncludes(aiProviderHealth, 'Answerlattice Gemini provider health check failed: ${message}', 'Answerlattice AI provider health raw thrown error text');
  assertNotIncludes(aiProviderHealth, 'Gemini health check returned an unexpected response.', 'Answerlattice AI provider health raw unexpected response text');
}

function verifyAnswerlatticeGovernanceDiagnostics() {
  const governanceHub = read('src/components/templates/answerlattice/governance/index.tsx');

  assertIncludes(governanceHub, 'logAnswerlatticeFailure', 'Answerlattice governance bounded diagnostics');
  assertIncludes(governanceHub, 'answerlattice_governance_branding_config_load_failed', 'Answerlattice governance branding load failure code');
  assertIncludes(governanceHub, "getBoundedAnswerlatticeStringContext('tenantId', tId)", 'Answerlattice governance bounded tenant metadata');
  assertIncludes(governanceHub, "getBoundedAnswerlatticeStringContext('storeId', sId)", 'Answerlattice governance bounded store metadata');
  assertIncludes(governanceHub, 'ANSWERLATTICE_GOVERNANCE_TRANSLATION_RESPONSE_JSON_MAX_BYTES', 'Answerlattice governance translation response cap');
  assertIncludes(governanceHub, 'ANSWERLATTICE_GOVERNANCE_TRANSLATION_REQUEST_POLICY', 'Answerlattice governance translation shared request policy');
  assertIncludes(governanceHub, "cache: 'no-store'", 'Answerlattice governance translation request bypasses browser cache');
  assertIncludes(governanceHub, "credentials: 'same-origin'", 'Answerlattice governance translation request keeps credentials same-origin');
  assertIncludes(governanceHub, "redirect: 'manual'", 'Answerlattice governance translation request does not follow redirects');
  assertIncludes(governanceHub, '...ANSWERLATTICE_GOVERNANCE_TRANSLATION_REQUEST_POLICY', 'Answerlattice governance translation request applies shared policy');
  assertIncludes(governanceHub, 'readJsonResponseWithLimit<unknown>', 'Answerlattice governance translation bounded response parser');
  assertIncludes(governanceHub, 'isGovernanceTranslationResponse', 'Answerlattice governance translation response guard');
  assertIncludes(governanceHub, 'answerlattice_governance_translation_response_parse_failed', 'Answerlattice governance translation parse diagnostic');
  assertIncludes(governanceHub, 'answerlattice_governance_translation_response_rejected', 'Answerlattice governance translation rejected diagnostic');
  assertIncludes(governanceHub, 'answerlattice_governance_translation_response_invalid', 'Answerlattice governance translation invalid diagnostic');
  assertIncludes(governanceHub, 'answerlattice_governance_translation_request_failed', 'Answerlattice governance translation request diagnostic');
  assertNotIncludes(governanceHub, 'getBrandingConfig(tId, sId).then(setBrandingConfig).catch(() => { });', 'Answerlattice governance silent branding load catch');
  assertNotIncludes(governanceHub, "res.json().catch(() => ({ error: 'Translation failed' }))", 'Answerlattice governance translation direct JSON fallback');
  assertNotIncludes(governanceHub, "throw new Error(err.error || 'Translation failed')", 'Answerlattice governance raw translation response error');
}

function verifyAnswerlatticeSecurityLogBoundaries() {
  const diagnostics = read('src/lib/answerlattice/diagnostics.ts');
  const accessControl = read('src/lib/answerlattice/accessControl.ts');
  const dashboardReadLimit = read('src/app/api/answerlattice/readRateLimit.ts');
  const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const staffAccessServer = read('src/lib/answerlattice/staffAccessServer.ts');
  const platformIntake = read('src/app/api/platform/answerlattice-intake/route.ts');

  assertIncludes(diagnostics, 'getAnswerlatticeSecurityLogContext', 'Answerlattice shared bounded security log context helper');
  assertIncludes(diagnostics, 'getBoundedSecurityRouteContext', 'Answerlattice shared security route context helper');
  assertIncludes(diagnostics, "getBoundedAnswerlatticeStringContext('endpoint', endpoint)", 'Answerlattice shared bounded endpoint metadata');
  assertIncludes(diagnostics, "getBoundedAnswerlatticeStringContext('method', request.method)", 'Answerlattice shared bounded method metadata');

  [
    ['src/lib/answerlattice/accessControl.ts', accessControl],
    ['src/app/api/answerlattice/readRateLimit.ts', dashboardReadLimit],
    ['src/lib/answerlattice/knowledgeIntakeApi.ts', intakeApi],
    ['src/lib/answerlattice/staffAccessServer.ts', staffAccessServer],
    ['src/app/api/platform/answerlattice-intake/route.ts', platformIntake],
  ].forEach(([label, content]) => {
    assertIncludes(content, 'getAnswerlatticeSecurityLogContext', `${label} uses bounded Answerlattice security context`);
    assertNotIncludes(content, 'buildSecurityContext', `${label} must not spread raw route security context`);
  });

  assertIncludes(accessControl, "getBoundedAnswerlatticeStringContext('permission', permission)", 'Answerlattice permission denial bounds permission metadata');
  assertIncludes(dashboardReadLimit, "getBoundedAnswerlatticeStringContext('routeKey', routeKey)", 'Answerlattice dashboard read limiter bounds route key');
  assertIncludes(intakeApi, "getBoundedAnswerlatticeStringContext('rateLimitKey', options.rateLimitKey)", 'Answerlattice Knowledge Intake bounds rate-limit key');
  assertIncludes(staffAccessServer, 'getAnswerlatticeSecurityDetailsContext(details)', 'Answerlattice staff security helper bounds callsite detail metadata');
  assertIncludes(platformIntake, "getBoundedAnswerlatticeStringContext('userId', userId)", 'Answerlattice platform intake limiter bounds user id');
}

verifyDedicatedAnswerlatticeFirebase();
verifyNoAnswerlatticeDirectBodyParsers();
verifyAnswerlatticePreOnboardingPromptModal();
verifyPublicApiAndWidgetIsolation();
verifyAnswerlatticeDashboardFailureCopy();
verifyAnswerlatticeBrowserHandoffDiagnostics();
verifyAnswerlatticeHookFailureCopy();
verifyAnswerlatticeSupportBoardRelatedEntityBoundary();
verifyPublicWidgetRequestAdmission();
verifyProtectedReadRateLimitGuards();
verifyAnswerlatticeRateLimitKeyPrivacy();
verifyAnswerlatticeRebuildSyncRouteGuards();
verifyAnswerlatticeSettingsRouteGuards();
verifyAnswerlatticePaidPlanPackaging();
verifyAnswerlatticeTransactionsDiagnostics();
verifyAnswerlatticeWebsiteAnalyticsUrlBoundary();
verifyAnswerlatticeProtectedActionRouteGuards();
verifyAnswerlatticeOnboardRouteGuards();
verifyNotificationSendAdmission();
verifyNotificationDiagnostics();
verifyProtectedAiRequestAdmission();
verifyAnswerlatticeAppSuccessDiagnostics();
verifySearchAndRetrievalTruth();
verifyHostedHelpRegistryTruth();
verifyKnowledgeIntakePublishRecovery();
verifyKnowledgeIntakeSafeErrorResponses();
verifyKnowledgeIntakeMediaAdmission();
verifyArticleEntityExtractionScope();
verifyPredictiveTriggerPublicSummary();
verifyCompiledContextBundleTruth();
verifyMutationProposalScopeGuard();
verifyFirestoreRuleBoundary();
verifyClientCacheDiagnostics();
verifyAnswerlatticeCallableDiagnostics();
verifyChatAnalyticsDiagnostics();
verifyAnswerlatticePublicClientCacheDiagnostics();
verifyAnswerlatticePublicCacheRouteDiagnostics();
verifyAnswerlatticeRuntimeDiagnostics();
verifyWorkflowIntegrationAdapterSafety();
verifyAnswerlatticeRetentionDiagnostics();
verifyAnswerlatticeNightlySchedulerDiagnostics();
verifyAnswerlatticeMasterSchedulerDiagnostics();
verifyAnswerlatticeOnboardingBootstrapDiagnostics();
verifyAnswerlatticeTicketKnowledgeDiagnostics();
verifyAnswerlatticeFrictionDiagnostics();
verifyAnswerlatticePredictiveTriggerDiagnostics();
verifyAnswerlatticeDraftGeneratorDiagnostics();
verifyAnswerlatticeSupportBoardSyncDiagnostics();
verifyAnswerlatticeReleaseActivationDiagnostics();
verifyAnswerlatticeAiProviderHealthDiagnostics();
verifyAnswerlatticeGovernanceDiagnostics();
verifyAnswerlatticeSecurityLogBoundaries();

console.log('Answerlattice runtime truth verifier passed');
