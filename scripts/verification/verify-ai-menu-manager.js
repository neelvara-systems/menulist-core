const fs = require('fs');
const path = require('path');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
});
require('tsconfig-paths/register');

const root = process.cwd();
const requiredFiles = [
  'src/types/aiMenuManager.ts',
  'src/lib/ai-menu-manager/actionTypes.ts',
  'src/lib/ai-menu-manager/actionRegistry.ts',
  'src/lib/ai-menu-manager/approvalPolicy.ts',
  'src/lib/ai-menu-manager/composerContext.ts',
  'src/lib/ai-menu-manager/commandResolver.ts',
  'src/lib/ai-menu-manager/domainConversationRouter.ts',
  'src/lib/ai-menu-manager/modelRouter/routerOutcomeSchema.ts',
  'src/lib/ai-menu-manager/patchPolicy.ts',
  'src/lib/ai-menu-manager/routeIds.ts',
  'src/lib/ai-menu-manager/actions/projectPatches.ts',
  'src/database/aiMenuManager/server.ts',
  'src/database/aiMenuManager/index.ts',
  'src/app/api/ai-menu-manager/command/route.ts',
  'src/app/api/ai-menu-manager/inbox/route.ts',
  'src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts',
  'src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts',
  'src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts',
  'src/app/(main)/menu-manager/page.tsx',
  'src/app/(main)/use-menulist/ai-menu-manager/page.tsx',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  'src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx',
];

const requiredActionTypes = [
  'item_price_update',
  'item_availability_update',
  'item_visibility_update',
  'category_visibility_update',
  'item_name_update',
  'item_description_update',
  'item_category_update',
  'item_attribute_price_update',
  'item_attribute_visibility_update',
  'item_bestseller_update',
  'item_metadata_update',
  'decision_blocks_update',
  'menu_special_note_update',
  'menu_design_mood_update',
  'menu_design_layout_update',
  'menu_design_preset_apply',
  'menu_design_visibility_update',
  'menu_design_color_update',
  'menu_design_background_update',
  'menu_design_settings_open',
  'menu_temp_status_set',
  'menu_temp_status_clear',
  'image_item_generate',
  'menu_publish',
  'menu_qr_download',
  'menu_share_copy_link',
  'store_working_hours_update',
  'store_time_slot_preset_create',
  'customer_app_settings_update',
  'customer_app_install_link_share',
  'digital_screen_status_card',
  'digital_screen_link_share',
  'public_presence_link_share',
  'public_presence_qr_download',
  'pos_sync_setup_info_copy',
  'pos_sync_technical_summary_copy',
  'pos_sync_sample_payload_download',
  'billing_screen_open',
  'feedback_link_share',
  'feedback_qr_download',
  'system_context_answer',
  'system_unsupported_action',
];

const requiredFlags = [
  'ENABLE_AI_MENU_MANAGER',
  'ENABLE_AI_MENU_MANAGER_MOBILE',
  'ENABLE_AI_MENU_MANAGER_VOICE_INPUT',
  'ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS',
  'ENABLE_AI_MENU_MANAGER_RULES',
  'ENABLE_AI_MENU_MANAGER_MODEL_ROUTER',
  'ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER',
  'ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST',
  'ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES',
  'ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS',
  'AI_MENU_MANAGER_SESSION_STORAGE_MODE',
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoRawUiErrorMessages(source, label) {
  for (const rawPattern of [
    'error?.message',
    'error.message ||',
    'message.error(error.message',
    'Toast.show({ content: error',
    'message: error?.message',
    '${error.message}',
  ]) {
    assert(!source.includes(rawPattern), `${label} must not surface raw exception text via ${rawPattern}`);
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

const aiMenuManagerReadme = read('__docs__/ai-menu-manager/README.md');
assert(aiMenuManagerReadme.includes('not current launch certification'), 'AMM README must not present local source gates as launch certification');
assert(aiMenuManagerReadme.includes('supported-adapter smoke behind AMM feature flags'), 'AMM README must route current adapter approval to smoke evidence');
assert(!aiMenuManagerReadme.includes('controlled launch ready'), 'AMM README must not use controlled-launch-ready release wording');
const aiMenuManagerTechnicalTeamFlow = read('__docs__/ai-menu-manager/ai-menu-manager_technical-team-flow.md');
assert(aiMenuManagerTechnicalTeamFlow.includes('not current launch certification'), 'AMM technical team flow must not present local source gates as launch certification');
assert(aiMenuManagerTechnicalTeamFlow.includes('Current release approval requires the production-readiness audit'), 'AMM technical team flow must route approval to active production-readiness gates');
assert(aiMenuManagerTechnicalTeamFlow.includes('supported-adapter smoke behind AMM feature flags'), 'AMM technical team flow must require adapter smoke evidence before release claims');
assert(aiMenuManagerTechnicalTeamFlow.includes('discovery/reserved adapter rows'), 'AMM technical team flow must describe non-runtime checklist rows as reserved adapters');
assert(!/ready for controlled launch|controlled launch ready|ready for testing|ship ready/i.test(aiMenuManagerTechnicalTeamFlow), 'AMM technical team flow must not use stale launch-readiness wording');
const aiMenuManagerWebsiteDoc = read('__docs__/ai-menu-manager/ai-menu-manager_website.md');
assert(aiMenuManagerWebsiteDoc.includes('Claim boundaries:'), 'AMM website doc must keep explicit public claim boundaries');
assert(aiMenuManagerWebsiteDoc.includes('AI Menu Manager handles verified daily menu operations'), 'AMM website doc must scope public capability copy to verified daily operations');
assert(aiMenuManagerWebsiteDoc.includes('full speech-to-command is verified for launch use'), 'AMM website doc must require verification before full speech-to-command launch claims');
assert(!/full speech-to-command is production-ready/i.test(aiMenuManagerWebsiteDoc), 'AMM website doc must not use unqualified production-ready wording for speech claims');
const aiMenuManagerSpec = read('__docs__/ai-menu-manager/ai-menu-manager_spec.md');
assert(aiMenuManagerSpec.includes('## Website Claim Guard'), 'AMM spec must keep the website claim guard');
assert(aiMenuManagerSpec.includes('Website and launch copy may say AI Menu Manager handles verified daily menu operations'), 'AMM spec must define allowed website claim scope');
assert(aiMenuManagerSpec.includes('full speech-to-command is verified for launch use'), 'AMM spec must require verification before full speech-to-command launch claims');
assert(!/full speech-to-command is production-ready/i.test(aiMenuManagerSpec), 'AMM spec must not use unqualified production-ready wording for speech claims');
const aiMenuManagerImplDoc = read('__docs__/ai-menu-manager/ai-menu-manager_impl.md');
const aiMenuManagerFirebaseDoc = read('__docs__/ai-menu-manager/ai-menu-manager_firebase.md');
const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelogUpper = read('__docs__/CHANGELOG.md');
const changelogLower = read('__docs__/changelog.md');
assert(aiMenuManagerImplDoc.includes('GET /api/ai-menu-manager/sessions/{sessionId}'), 'AMM implementation doc must describe the session route fallback');
assert(aiMenuManagerImplDoc.includes('route `proposalId` must match the deterministic `amm_prop_` proposal ID shape before proposal reads'), 'AMM implementation doc must document proposal route ID admission');
assert(aiMenuManagerFirebaseDoc.includes('AMM route ID boundary'), 'AMM Firebase doc must document route ID admission before reads');
assert(productionReadinessAudit.includes('AI Menu Manager route ID boundary checkpoint'), 'Production readiness audit must record the AMM route ID boundary checkpoint');
assert(changelogUpper.includes('AI Menu Manager Route ID Boundary'), 'Primary changelog must record the AMM route ID boundary');
assert(changelogLower.includes('AI Menu Manager Route ID Boundary'), 'Lowercase changelog must record the AMM route ID boundary');

const actionTypes = read('src/lib/ai-menu-manager/actionTypes.ts');
for (const actionType of requiredActionTypes) {
  assert(actionTypes.includes(actionType), `Missing action type: ${actionType}`);
}
const actionTypeBlock = (actionTypes.match(/export const AI_MENU_MANAGER_ACTION_TYPES = \{([\s\S]*?)\} as const/) || [])[1] || '';
const declaredActionValues = [...actionTypeBlock.matchAll(/:\s*'([a-z0-9_]+)'/g)]
  .map((entry) => entry[1])
  .filter((value) => value.includes('_'));
const definitionsBlock = actionTypes.split('export const AI_MENU_MANAGER_ACTION_DEFINITIONS')[1] || '';
for (const actionType of declaredActionValues) {
  assert(definitionsBlock.includes(`'${actionType}'`) || definitionsBlock.includes(`.${actionType.toUpperCase()}`), `Action type has no registry definition: ${actionType}`);
}
const definitionCount = (definitionsBlock.match(/actionType:/g) || []).length;
for (const field of ['manualEquivalent:', 'executionMode:', 'approvalLevel:', 'costClass:', 'mobileBehavior:', 'sourceEvidence:', 'readiness:']) {
  const count = (definitionsBlock.match(new RegExp(field, 'g')) || []).length;
  assert(count === definitionCount, `Every action definition must declare ${field.replace(':', '')}`);
}
assert(actionTypes.includes("ITEM_PRICE_UPDATE") && actionTypes.includes("approvalLevel: 'high_confirm'"), 'Price updates must use high_confirm approval');
assert(actionTypes.includes("SYSTEM_UNSUPPORTED_ACTION") && actionTypes.includes("costClass: 'C5 manual only'"), 'Unsupported external actions must be manual-only');
const sourceEvidenceMatches = [...actionTypes.matchAll(/sourceEvidence:\s*\[([\s\S]*?)\]/g)];
for (const match of sourceEvidenceMatches) {
  const paths = [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  assert(paths.length > 0, 'Every action definition must include at least one source evidence path');
  for (const evidencePath of paths) {
    const filePath = evidencePath.split(':')[0];
    assert(fs.existsSync(path.join(root, filePath)), `Source evidence path does not exist: ${evidencePath}`);
  }
}

const features = read('src/config/features.ts');
for (const flag of requiredFlags) {
  assert(features.includes(flag), `Missing feature flag: ${flag}`);
}
assert(features.includes('ENABLE_AI_MENU_MANAGER_MODEL_ROUTER: false'), 'AMM model router must default off to avoid provider cost');
assert(features.includes('ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER: false'), 'AMM cloud planner must default off to avoid AI provider cost');
assert(features.includes('ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST: false'), 'AMM local assist must default off until device support is verified');

const modelRouter = read('src/lib/ai-menu-manager/modelRouter/routerOutcomeSchema.ts');
for (const outcome of ['answer', 'diagnostic', 'recommendation', 'clarification', 'prepare_action', 'local_export', 'manual_handoff', 'unsupported', 'receipt_status']) {
  assert(modelRouter.includes(`'${outcome}'`), `AMM model router outcome missing: ${outcome}`);
}
for (const forbiddenTool of ['updateProject', 'writeFirestore', 'publishMenuDirectly', 'postToExternalPlatform', 'executeRule']) {
  assert(!modelRouter.includes(forbiddenTool), `AMM model router must not expose write tool: ${forbiddenTool}`);
}
assert(modelRouter.includes('AI_MENU_MANAGER_SAFE_MODEL_TOOLS') && modelRouter.includes('prepare_price_update_card') && modelRouter.includes('prepare_unsupported_card'), 'AMM model router must expose prepare/read-only tool names only');
assert(modelRouter.includes('if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER)'), 'AMM model router providers must stay disabled when the main AMM flag is off');

const commandRoute = read('src/app/api/ai-menu-manager/command/route.ts');
assert(commandRoute.includes('withAuth'), 'Command route must use withAuth');
assert(commandRoute.includes('PERMISSIONS.MANAGE_MENU'), 'Command route must require menu permission');
assert(commandRoute.includes('DATA_WRITE'), 'Command route must apply write rate limiting');
assert(commandRoute.includes('readBoundedJsonBody'), 'Command route must use bounded JSON body parsing');
assert(commandRoute.includes('AI_MENU_MANAGER_COMMAND_MAX_BODY_BYTES'), 'Command route must define an explicit request body cap');
assert(!commandRoute.includes('request.json()'), 'Command route must not use raw request.json() parsing');
assert(commandRoute.includes('buildAiMenuManagerInvalidRequestResponse'), 'Command route must use generic validation errors');
assert(commandRoute.includes('getAiMenuManagerProposal(proposalId)'), 'Command route must return existing proposal on idempotent retry');
assert(commandRoute.includes('buildAiMenuManagerContextBaseHash'), 'Command route must store project base hash');
assert(commandRoute.includes('getStoreFromSession') && commandRoute.includes('needsStoreRead'), 'Command route must use session store context before adding a Firestore store read');

const apiGuards = read('src/lib/ai-menu-manager/apiGuards.ts');
assert(apiGuards.includes('getBoundedSecurityRouteContext'), 'AMM API guards must use bounded route security context');
assert(apiGuards.includes("getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)"), 'AMM API guards must bound selected-store violation IDs');
assert(apiGuards.includes('key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`'), 'AMM API guards must use hashed rate-limit key material');
assert(!apiGuards.includes('buildSecurityContext'), 'AMM API guards must not spread raw security context into guard security logs');
assert(!apiGuards.includes('key: `${params.keyPrefix}:${userId'), 'AMM API guards must not store raw user IDs in limiter keys');

const routeIds = read('src/lib/ai-menu-manager/routeIds.ts');
assert(routeIds.includes('isValidFirestoreDocumentId'), 'AMM route ID boundary must use the shared Firestore document ID guard');
assert(routeIds.includes('AI_MENU_MANAGER_SESSION_ID_PATTERN = /^amm_[a-f0-9]{24}$/'), 'AMM route ID boundary must preserve deterministic session ID shape');
assert(routeIds.includes('AI_MENU_MANAGER_PROPOSAL_ID_PATTERN = /^amm_prop_[a-f0-9]{28}$/'), 'AMM route ID boundary must preserve deterministic proposal ID shape');
assert(routeIds.includes('AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH = 160'), 'AMM route ID boundary must keep selected project IDs bounded');
assert(routeIds.includes('normalizeAiMenuManagerSessionId') && routeIds.includes('normalizeAiMenuManagerProposalId') && routeIds.includes('normalizeAiMenuManagerProjectId'), 'AMM route ID normalizers missing');
assert(routeIds.includes('normalizeAiMenuManagerScopeDocumentId'), 'AMM route ID boundary must expose a tenant/store scope document ID normalizer');
assert(routeIds.includes('documentId !== documentId.trim()'), 'AMM route/session/project IDs must reject whitespace-mutated values');
assert(routeIds.includes('raw !== raw.trim() || !isValidFirestoreDocumentId(raw)'), 'AMM scope document IDs must reject whitespace-mutated or invalid Firestore IDs');
assert(routeIds.includes('Number.isSafeInteger(numericId)') && routeIds.includes('String(numericId) !== raw'), 'AMM scope document IDs must be exact positive MenuList numeric document IDs');

const clientDal = read('src/database/aiMenuManager/index.ts');
const sendCommandBlock = (clientDal.split('export async function sendAiMenuManagerCommand')[1] || '').split('export async function getAiMenuManagerClientInbox')[0] || '';
const completionBlock = (clientDal.split('export async function completeAiMenuManagerClientOperation')[1] || '').split('export async function submitAiMenuManagerProposalAction')[0] || '';
assert(sendCommandBlock.includes('sessionSnapshot'), 'AMM command submit must accept the loaded compact session snapshot');
assert(sendCommandBlock.includes('setDoc(sessionRef, sessionPayload, { merge: true })'), 'AMM command submit must write the compact session without a transaction read');
assert(sendCommandBlock.includes('replaceOperationId'), 'AMM command submit must replace clarification/follow-up cards in the same compact session write');
assert(clientDal.includes('buildAiMenuManagerFollowUpCommand'), 'AMM client DAL must support short follow-up rewrites from the loaded compact session');
assert(clientDal.includes("'answered'"), 'AMM compact session must keep read-only answer cards without proposal docs');
assert(!sendCommandBlock.includes('runTransaction'), 'AMM command submit must not transaction-read the compact session');
assert(clientDal.includes('isFirestorePermissionDenied'), 'AMM client DAL must detect compact-session permission failures');
assert(clientDal.includes('sendAiMenuManagerServerBackedCommand'), 'AMM client DAL must fall back to the guarded server route when compact session writes are denied');
assert(clientDal.includes('getAiMenuManagerServerInbox'), 'AMM client inbox must fall back to the guarded server inbox route when compact session reads are denied');
assert(clientDal.includes("executionMode: 'existing_server_api'"), 'Server-backed fallback cards must be represented with the existing_server_api execution mode');
assert(clientDal.includes('const body: AiMenuManagerCommandRequest') && !clientDal.includes('body: JSON.stringify({\n            ...request'), 'AMM server fallback command must send only API fields, not the loaded project JSON');
assert(completionBlock.includes('sessionSnapshot'), 'AMM completion/cancel must accept the loaded compact session snapshot');
assert(completionBlock.includes('getMatchingOperationSessionSnapshot'), 'AMM completion/cancel must verify the loaded compact session scope before writing');
assert(completionBlock.includes("params.operation.card.kind !== 'manual_task'") && completionBlock.includes("!params.operation.card.actions.includes('mark_done')"), 'AMM client completion must reject manual_task completion unless the card exposes manual completion');
assert(completionBlock.includes('setDoc(sessionRef') && completionBlock.includes('{ merge: true }'), 'AMM completion/cancel must write the compact session without a transaction read');
assert(!completionBlock.includes('runTransaction'), 'AMM completion/cancel must not transaction-read the compact session for deterministic cards');
assert(clientDal.includes('ensureFirebaseAuthForSession(session)'), 'AMM client DAL must sync Firebase Auth claims before direct session reads/writes');
assert(clientDal.includes('pendingOperations'), 'AMM client DAL must store full pending operations in the compact session doc');
assert(clientDal.includes('buildAiMenuManagerContextPacket') && clientDal.includes('resolveAiMenuManagerCommand'), 'AMM deterministic command resolution must run from selected project context in DAL');
assert(sendCommandBlock.includes('composerContext: followUp ? undefined : request.composerContext'), 'AMM client command resolution must pass selected composer context ids and avoid stale context on follow-ups');
assert(clientDal.includes('buildAiMenuManagerClientExecutionDirective'), 'AMM client DAL must build execution directives from stored pending operations');
assert(clientDal.includes('buildAiMenuManagerContextBaseHash(context)'), 'AMM client approvals must check stale selected-project context');
assert(clientDal.includes('assertAiMenuManagerPatchAllowedForAction'), 'AMM client approvals must validate patch shape against registered action type');
assert(clientDal.includes("operation.card.actionType === 'item_visibility_update'"), 'AMM follow-up handling must support safe item visibility card updates');
assert(clientDal.includes("operation.card.actionType === 'category_visibility_update'"), 'AMM follow-up handling must support safe category visibility card updates');
assert(clientDal.includes("operation.card.actionType === 'menu_special_note_update'"), 'AMM follow-up handling must support safe menu note card updates');
assert(clientDal.includes('MAX_PENDING_OPERATIONS = 25'), 'AMM pending operation cap must be explicit in client DAL');
assert(clientDal.includes('sendAiMenuManagerServerCommand'), 'AMM API command route should remain only as an explicit server fallback');
assert(clientDal.includes('AI_MENU_MANAGER_REQUEST_POLICY'), 'AMM client fallback API calls must share an explicit browser request policy');
assert(clientDal.includes("cache: 'no-store'"), 'AMM client fallback API calls must bypass browser cache');
assert(clientDal.includes("credentials: 'same-origin'"), 'AMM client fallback API calls must keep credentials same-origin');
assert(clientDal.includes("redirect: 'manual'"), 'AMM client fallback API calls must not follow redirects');
assert((clientDal.match(/\.\.\.AI_MENU_MANAGER_REQUEST_POLICY/g) || []).length >= 3, 'AMM mutating fallback API calls must spread the shared request policy');
assert(clientDal.includes('AI_MENU_MANAGER_REQUEST_POLICY);'), 'AMM inbox fallback API call must use the shared request policy');
assert(clientDal.includes('AI_MENU_MANAGER_RESPONSE_JSON_MAX_BYTES = 64 * 1024'), 'AMM client API responses must define an explicit bounded JSON cap');
assert(clientDal.includes('readJsonResponseWithLimit'), 'AMM client API responses must use bounded JSON parsing');
assert(clientDal.includes('ai_menu_manager_response_parse_failed'), 'AMM client API response parse failures must log a stable bounded diagnostic');
assert(clientDal.includes("code: 'response_parse_failed'"), 'AMM client API successful malformed responses must throw a stable local code');
assert(clientDal.includes("code: 'empty_response'"), 'AMM client API successful empty responses must throw a stable local code');
assert(clientDal.includes("message: 'Menu Manager response could not be read'"), 'AMM client API parse failures must use fixed local failure text');
assert(clientDal.includes('error.status = params.status'), 'AMM client API rejection must keep HTTP status only');
assert(!clientDal.includes('response.json().catch(() => ({}))'), 'AMM client API responses must not silently fall back on malformed JSON');
assert(!clientDal.includes('collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS'), 'Client DAL must not write proposal docs for deterministic actions');
assert(!clientDal.includes('payload?.message || payload?.error'), 'AMM client API rejection must not propagate raw response message/error text');
assert(!clientDal.includes('error.payload = payload'), 'AMM client API rejection must not attach raw response payloads');

const idempotency = read('src/lib/ai-menu-manager/idempotency.ts');
assert(!idempotency.includes("from 'crypto'") && !idempotency.includes('require('), 'AMM idempotency/hash helper must stay browser-safe for DAL-first resolver use');

const firestoreSanitize = read('src/lib/ai-menu-manager/firestoreSanitize.ts');
assert(firestoreSanitize.includes('Object.getPrototypeOf(value)'), 'AMM Firestore sanitizer must preserve Timestamp and FieldValue prototype objects');
assert(!firestoreSanitize.includes('JSON.stringify'), 'AMM Firestore sanitizer must not JSON-round-trip Firestore sentinel values');

const actionRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts');
assert(actionRoute.includes('readBoundedJsonBody'), 'Proposal action route must use bounded JSON body parsing');
assert(actionRoute.includes('AI_MENU_MANAGER_PROPOSAL_ACTION_MAX_BODY_BYTES'), 'Proposal action route must define an explicit request body cap');
assert(!actionRoute.includes('request.json()'), 'Proposal action route must not use raw request.json() parsing');
assert(actionRoute.includes('normalizeAiMenuManagerProposalId(params?.proposalId)'), 'Proposal action route must normalize route proposal ID before reads');
assert(actionRoute.indexOf('normalizeAiMenuManagerProposalId(params?.proposalId)') < actionRoute.indexOf('getAiMenuManagerProposal(proposalId)'), 'Proposal action route must reject malformed proposal IDs before Firestore proposal reads');
assert(actionRoute.includes('ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES'), 'Proposal approval must be guarded by confirmed-write flag');
assert(actionRoute.includes('client_project_mutation'), 'Proposal approval must restrict executable client project mutations');
assert(actionRoute.includes('parsed.data.projectId') && actionRoute.includes('parsed.data.actionType'), 'Proposal approval must verify selected project/action scope');
assert(actionRoute.includes('buildAiMenuManagerContextBaseHash(currentContext)'), 'Proposal approval must reject stale project cards');
assert(
  actionRoute.includes("proposal.cardPayload?.kind !== 'manual_task'")
    && actionRoute.includes("!proposal.cardPayload.actions?.includes('mark_done')"),
  'Proposal action route must reject mark_done unless the card explicitly exposes manual completion',
);
assert(actionRoute.includes('logRuntimeFailure'), 'Proposal action route must use bounded runtime diagnostics');
assert(actionRoute.includes('getBoundedRuntimeStringContext'), 'Proposal action route must bound proposal action diagnostic context');
assert(actionRoute.includes('ai_menu_manager_proposal_status_update_failed'), 'Proposal action route must log status update failures with a stable code');
assert(actionRoute.includes('ai_menu_manager_proposal_approval_failed'), 'Proposal action route must log approval failures with a stable code');
assert(!actionRoute.includes("secureError('[AI Menu Manager] Proposal status update failed'"), 'Proposal action route must not raw-log caught route failures');
assert(!actionRoute.includes('catch {'), 'Proposal action route must not silently swallow approval failures');

const projectPatches = read('src/lib/ai-menu-manager/actions/projectPatches.ts');
assert(projectPatches.includes('applyAiMenuManagerProjectPatch'), 'Project patch helper missing');
assert(projectPatches.includes('projectContainsAiMenuManagerPatch'), 'Patch verification helper missing');
assert(projectPatches.includes("patch.kind === 'category_update'"), 'Category project patch support missing');
assert(projectPatches.includes("patch.kind === 'attribute_update'"), 'Attribute project patch support missing');
const patchPolicy = read('src/lib/ai-menu-manager/patchPolicy.ts');
assert(patchPolicy.includes('PATCH_POLICIES'), 'AMM patch policy must declare action-scoped patch policies');
assert(patchPolicy.includes('item_price_update') && patchPolicy.includes("itemFields: ['price']"), 'Price action patch policy must allow only price item fields');
assert(patchPolicy.includes('menu_design_color_update') && patchPolicy.includes("brandFields: ['accentColor']"), 'Design color patch policy must allow only brand accent color');
const serverDal = read('src/database/aiMenuManager/server.ts');
assert(serverDal.includes('assertAiMenuManagerPatchAllowedForAction'), 'Server-backed AMM approvals must validate patch shape against registered action type');
assert(serverDal.includes('Manual completion is not allowed for this card'), 'Server DAL must reject manual completion for unsupported/non-manual cards');

const contextPacket = read('src/lib/ai-menu-manager/contextPacket.ts');
assert(contextPacket.includes('exactMatches.length > 1') && contextPacket.includes('candidates[0].score - candidates[1].score'), 'Ambiguous item names must not auto-select the first match');
assert(contextPacket.includes('findAiMenuManagerCategoryByName'), 'Category name resolver missing');
assert(contextPacket.includes('findAiMenuManagerItemCandidates') && contextPacket.includes('findAiMenuManagerCategoryCandidates'), 'Context packet must expose candidate helpers for one-tap ambiguity resolution');
assert(contextPacket.includes('tokenAliases(itemName)') && contextPacket.includes('tokenAliases(categoryName)'), 'Context packet must include token aliases so natural short item/category names can resolve or clarify');

const commandResolver = read('src/lib/ai-menu-manager/commandResolver.ts');
const domainConversationRouter = read('src/lib/ai-menu-manager/domainConversationRouter.ts');
assert(commandResolver.includes('khatam'), 'Mixed-language availability commands must include khatam handling');
assert(commandResolver.includes('resolveDomainConversationCommand'), 'AMM command resolver must support read-only MenuList-domain answers');
assert(domainConversationRouter.includes('system_context_answer') && domainConversationRouter.includes('Menu truth'), 'Domain conversation answers must use explicit read-only context cards');
assert(domainConversationRouter.includes('missingImageItems') && domainConversationRouter.includes('missingDescriptionItems') && domainConversationRouter.includes('unavailableItems'), 'Domain conversation answers must cover menu content and availability checks');
assert(domainConversationRouter.includes('resolveSurfaceFreshnessQuestion') && domainConversationRouter.includes('resolvePrintFreshnessQuestion') && domainConversationRouter.includes('resolveEntityStateQuestion'), 'Domain conversation answers must cover QR/public freshness, print freshness, and item/category state diagnostics');
assert(domainConversationRouter.includes('resolvePromotionRecommendationQuestion') && domainConversationRouter.includes('resolveCustomerPriceConcernQuestion'), 'Domain conversation answers must cover promotion recommendations and customer price concern diagnostics');
assert(commandResolver.includes('suggestedReplies: resolved.suggestedReplies'), 'Unsupported AMM cards must pass through safe suggested replies without enabling completion');
assert(commandResolver.includes('resolveFeaturedSectionCommand'), 'Featured section commands must resolve through a registered adapter');
assert(commandResolver.includes('decision_blocks_update'), 'Featured section commands must use the decision block project patch');
assert(commandResolver.includes('resolveCategoryVisibilityCommand'), 'Category visibility commands must resolve through a registered adapter');
assert(commandResolver.includes('deactivate'), 'Visibility commands must support deactivate wording');
assert(
  commandResolver.indexOf('|| resolveDesignCommand(params.text, params.context)') > -1
  && commandResolver.indexOf('|| domainConversation') > -1
  && commandResolver.indexOf('|| resolveDesignCommand(params.text, params.context)') < commandResolver.indexOf('|| domainConversation'),
  'Explicit design commands must resolve before broad read-only domain answers',
);
assert(commandResolver.includes('asksForPresetStyle'), 'Design preset commands such as "Make menu premium" must not fall through to clarification');
assert(commandResolver.includes('menu_design_preset_apply') && commandResolver.includes('premium-minimal'), 'Premium menu style commands must resolve to the design preset adapter');
assert(commandResolver.includes('Choose presentation tone') && commandResolver.includes('MenuMood.CLEAN') && commandResolver.includes('MENU_MOODS'), 'Theme commands must show existing presentation tone choices');
assert(commandResolver.includes('Choose menu layout') && commandResolver.includes('MenuLayout.GRID'), 'Layout commands must show existing List/Grid/Card choices');
assert(commandResolver.includes('Choose theme color') && commandResolver.includes('BRAND_COLOR_PRESETS'), 'Theme color commands must show existing brand color choices');
assert(commandResolver.includes('Choose display option') && commandResolver.includes('showCategoryIcons'), 'Display option commands must show existing design display choices');
assert(commandResolver.includes('resolveMobileMoreFlowCommand') && commandResolver.includes('MOBILE_MORE_FLOW_MATCHES'), 'Mobile More manual flows must resolve to explicit cards');
assert(commandResolver.includes('More > Business Profile') && commandResolver.includes('More > Digital Screens') && commandResolver.includes('More > POS Sync'), 'Mobile More flow resolver must cover core existing owner flows');
assert(commandResolver.includes('Choose temporary status') && commandResolver.includes('Choose working-hours change') && commandResolver.includes('Choose customer app task'), 'Mobile More guided flows must expose bounded choice cards');
assert(!commandResolver.includes("actionType: 'system_manual_task_create'"), 'Known AMM resolver paths must not map to generic system_manual_task_create');
assert(commandResolver.includes("'menu_share_copy_link'") && commandResolver.includes("'menu_qr_download'") && commandResolver.includes("'customer_app_install_link_share'") && commandResolver.includes("'digital_screen_link_share'") && commandResolver.includes("type: 'copy_text'") && commandResolver.includes("type: 'download_text'"), 'Local export resolvers must expose exact copy/download actions');

const { resolveAiMenuManagerCommand } = require(path.join(root, 'src/lib/ai-menu-manager/commandResolver'));
const {
  AI_MENU_MANAGER_ACTION_DEFINITIONS,
  AI_MENU_MANAGER_EXECUTABLE_ACTIONS,
} = require(path.join(root, 'src/lib/ai-menu-manager/actionTypes'));
const resolverFixtureContext = {
  projectId: 'project-1',
  defaultLanguage: 'en',
  projectName: 'Bar Menu',
  storeName: 'Grill Zilla',
  publicLinks: {
    customerAppInstallUrl: 'https://grillzilla.menulist.ai/?pwa=install',
    digitalScreenHighlightsUrl: 'https://grillzilla.menulist.ai/screen/screen-token?mode=highlights',
    digitalScreenUrl: 'https://grillzilla.menulist.ai/screen/screen-token',
    menuUrl: 'https://grillzilla.menulist.ai/bar-menu',
    officialPageUrl: 'https://grillzilla.menulist.ai',
    tenantBaseUrl: 'https://grillzilla.menulist.ai',
  },
  menuDesign: { accentColor: '#22c55e', mood: 'clean', layout: 'card', showCategoryIcons: true, showCategoryTabs: false, showImages: true, showItemPrices: true },
  decisionBlocks: { enablePopular: false, enableQuickPick: true, enableBestValue: true },
  items: [
    { id: 'item-tea', name: 'Masala Tea', aliases: ['masala tea', 'tea'], categoryId: 'cat-drinks', categoryName: 'Drinks', fileUid: 'f1', price: '15', available: true, active: true, hasImage: false, hasDescription: true, isBestSeller: false, duration: 5 },
    { id: 'item-coffee', name: 'Cold coffee', aliases: ['cold coffee', 'coffee'], categoryId: 'cat-drinks', categoryName: 'Drinks', fileUid: 'f1', price: '90', available: true, active: true, hasImage: true, hasDescription: true, isBestSeller: false, duration: 8 },
    { id: 'item-paneer', name: 'Paneer tikka', aliases: ['paneer tikka', 'paneer'], categoryId: 'cat-starters', categoryName: 'Starters', fileUid: 'f1', price: '180', available: true, active: true, hasImage: false, hasDescription: false, isBestSeller: false, duration: 15 },
    { id: 'item-veg-sandwich', name: 'Veg Sandwich', aliases: ['veg sandwich', 'sandwich'], categoryId: 'cat-starters', categoryName: 'Starters', fileUid: 'f1', price: '70', available: true, active: true, hasImage: true, hasDescription: true, isBestSeller: false, duration: 10 },
    { id: 'item-cheese-sandwich', name: 'Cheese Sandwich', aliases: ['cheese sandwich', 'sandwich'], categoryId: 'cat-starters', categoryName: 'Starters', fileUid: 'f1', price: '90', available: true, active: true, hasImage: true, hasDescription: true, isBestSeller: false, duration: 10 },
  ],
  categories: [
    { id: 'cat-drinks', name: 'Drinks', aliases: ['drinks', 'tea'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 1 },
    { id: 'cat-starters', name: 'Starters', aliases: ['starters'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 2 },
  ],
};
const resolverFixtures = [
  ['Masala tea 20 now', 'item_price_update', 'proposal'],
  ['Tea 20', 'item_price_update', 'proposal'],
  ['Cold coffee sold out', 'item_availability_update', 'proposal'],
  ['Cold coffee over', 'item_availability_update', 'proposal'],
  ['Masala chai khatam hai', 'system_clarification_request', 'clarification'],
  ['Sandwich 80', 'system_clarification_request', 'clarification'],
  ['deactivate Cold coffee item', 'item_visibility_update', 'proposal'],
  ['deactivate Drinks category', 'category_visibility_update', 'proposal'],
  ['rename Cold coffee to Iced coffee', 'item_name_update', 'proposal'],
  ['rename Masala Tea to Kadak Masala Tea', 'item_name_update', 'proposal'],
  ['rename Drinks category to Beverages', 'category_name_update', 'proposal'],
  ['Cold coffee description to Chilled creamy coffee', 'item_description_update', 'proposal'],
  ['Add description for Masala Tea: Strong tea with fresh spices.', 'item_description_update', 'proposal'],
  ['move Cold coffee to Starters', 'item_category_update', 'proposal'],
  ['mark Cold coffee as bestseller', 'item_bestseller_update', 'proposal'],
  ['set Cold coffee prep time to 10 minutes', 'item_prep_time_update', 'proposal'],
  ['increase all drinks by 10', 'bulk_price_update', 'proposal'],
  ['increase all drinks price by 10', 'bulk_price_update', 'proposal'],
  ['increase all drinks by 10 percent', 'bulk_price_update', 'proposal'],
  ['mark all drinks unavailable', 'bulk_availability_update', 'proposal'],
  ['Selected items: Masala Tea, Cold coffee. increase price by 10', 'bulk_price_update', 'proposal'],
  ['Selected items: Masala Tea, Cold coffee. sold out', 'bulk_availability_update', 'proposal'],
  ['Selected item: Masala Tea. 25', 'item_price_update', 'proposal'],
  ['Selected item: Masala Tea. hide', 'item_visibility_update', 'proposal'],
  ['Show Cold coffee in Featured section', 'decision_blocks_update', 'proposal'],
  ['Show Featured section', 'decision_blocks_update', 'proposal'],
  ['Show note: Fresh menu today', 'menu_special_note_update', 'proposal'],
  ['Make menu premium', 'menu_design_preset_apply', 'proposal'],
  ['Make menu look premium', 'menu_design_preset_apply', 'proposal'],
  ['change the theme', 'system_clarification_request', 'clarification'],
  ['Set menu tone to Premium & Minimal', 'menu_design_mood_update', 'proposal'],
  ['change the menu layout', 'system_clarification_request', 'clarification'],
  ['Use grid layout', 'menu_design_layout_update', 'proposal'],
  ['change theme color', 'system_clarification_request', 'clarification'],
  ['Set theme color to Gold', 'menu_design_color_update', 'proposal'],
  ['change display options', 'system_clarification_request', 'clarification'],
  ['Hide item prices', 'menu_design_visibility_update', 'proposal'],
  ['Show category icons', 'menu_design_visibility_update', 'proposal'],
  ['Open menu design', 'menu_design_settings_open', 'manual_task'],
  ['Copy menu link', 'menu_share_copy_link', 'manual_task'],
  ['Download menu QR', 'menu_qr_download', 'manual_task'],
  ['Copy official page link', 'public_presence_link_share', 'manual_task'],
  ['Download official page QR', 'public_presence_qr_download', 'manual_task'],
  ['Change working hours', 'system_clarification_request', 'clarification'],
  ['Change working hours for today', 'store_working_hours_update', 'manual_task'],
  ['Set temporary status', 'system_clarification_request', 'clarification'],
  ['Set temporary status: closed today', 'menu_temp_status_set', 'manual_task'],
  ['Clear temporary status', 'menu_temp_status_clear', 'manual_task'],
  ['Set lunch time slot', 'store_time_slot_preset_create', 'manual_task'],
  ['Setup customer app', 'system_clarification_request', 'clarification'],
  ['Open customer app settings', 'customer_app_settings_update', 'manual_task'],
  ['Copy customer app install link', 'customer_app_install_link_share', 'manual_task'],
  ['Show menu on TV', 'system_clarification_request', 'clarification'],
  ['Copy digital screen link', 'digital_screen_link_share', 'manual_task'],
  ['Open digital screens', 'digital_screen_status_card', 'manual_task'],
  ['Copy POS setup details', 'pos_sync_setup_info_copy', 'manual_task'],
  ['Copy POS technical summary', 'pos_sync_technical_summary_copy', 'manual_task'],
  ['Download POS sample payload', 'pos_sync_sample_payload_download', 'manual_task'],
  ['Manage feedback', 'system_clarification_request', 'clarification'],
  ['Copy feedback link', 'feedback_link_share', 'manual_task'],
  ['Show feedback QR', 'feedback_qr_download', 'manual_task'],
  ['Open billing', 'billing_screen_open', 'manual_task'],
  ['Open platform tenants', 'system_unsupported_action', 'unsupported'],
  ['Open platform users', 'system_unsupported_action', 'unsupported'],
  ['Generate image for masala tea', 'image_item_generate', 'manual_task'],
  ['Import this menu PDF', 'menu_file_upload', 'manual_task'],
  ['Import from this menu link https://example.com/menu', 'menu_link_import', 'manual_task'],
  ['Apply these extracted changes', 'menu_import_review_apply', 'manual_task'],
  ['Add today special rajma chawal 129', 'item_create', 'manual_task'],
  ['Create weekend special menu', 'special_menu_create', 'manual_task'],
  ['Activate weekend special menu', 'special_menu_activate', 'manual_task'],
  ['Publish this menu', 'menu_publish', 'manual_task'],
  ['Update this on Zomato', 'system_unsupported_action', 'unsupported'],
  ['Update this on Uber Eats', 'system_unsupported_action', 'unsupported'],
  ['Post this on Instagram', 'system_unsupported_action', 'unsupported'],
  ['What should I fix today?', 'system_context_answer', 'answer'],
  ['Which items have no photos?', 'system_context_answer', 'answer'],
  ['Which items are missing descriptions?', 'system_context_answer', 'answer'],
  ['What items are unavailable?', 'system_context_answer', 'answer'],
  ['Is my menu ready to share?', 'system_context_answer', 'answer'],
  ['Can I increase Masala Tea price?', 'system_context_answer', 'answer'],
  ['Why is my QR menu old?', 'system_context_answer', 'answer'],
  ['Why is print menu wrong?', 'system_context_answer', 'answer'],
  ['Why is Cold coffee hidden?', 'system_context_answer', 'answer'],
  ["What is today's weather?", 'system_unsupported_action', 'unsupported'],
  ['Tell me cricket score', 'system_unsupported_action', 'unsupported'],
];
for (const [text, expectedActionType, expectedKind] of resolverFixtures) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    cardId: `fixture-${expectedActionType}`,
    createdAt: '2026-06-18T00:00:00.000Z',
  });
  assert(
    result.card.actionType === expectedActionType && result.card.kind === expectedKind,
    `Resolver fixture failed for "${text}": expected ${expectedActionType}/${expectedKind}, got ${result.card.actionType}/${result.card.kind}`,
  );
}
const ambiguousSandwichResult = resolveAiMenuManagerCommand({
  text: 'Sandwich 80',
  tId: 't1',
  sId: 's1',
  projectId: 'project-1',
  context: resolverFixtureContext,
  cardId: 'ambiguous-sandwich',
  createdAt: '2026-06-18T00:00:00.000Z',
});
assert(
  ambiguousSandwichResult.card.kind === 'clarification'
    && ambiguousSandwichResult.card.suggestedReplies?.some((reply) => reply.prompt === 'Veg Sandwich 80')
    && ambiguousSandwichResult.card.suggestedReplies?.some((reply) => reply.prompt === 'Cheese Sandwich 80'),
  'Ambiguous item price commands must produce one-tap clarification options that create the next proposal card',
);
const imageDraftResult = resolveAiMenuManagerCommand({
  text: 'Generate image for masala tea',
  tId: 't1',
  sId: 's1',
  projectId: 'project-1',
  context: resolverFixtureContext,
  cardId: 'image-draft-copy',
  createdAt: '2026-06-18T00:00:00.000Z',
});
assert(
  imageDraftResult.card.message.includes('draft') && imageDraftResult.card.message.includes('until you choose one'),
  'Image generation cards must clearly say generated images stay draft until owner action',
);
const publishSurfaceResult = resolveAiMenuManagerCommand({
  text: 'Publish this menu',
  tId: 't1',
  sId: 's1',
  projectId: 'project-1',
  context: resolverFixtureContext,
  cardId: 'publish-copy',
  createdAt: '2026-06-18T00:00:00.000Z',
});
assert(
  publishSurfaceResult.card.message.includes('MenuList-controlled surfaces')
    && publishSurfaceResult.card.beforeAfterSummary?.rows.some((row) => row.after?.includes('MenuList-controlled surfaces')),
  'Publish cards must scope impact to MenuList-controlled surfaces',
);
const resolverCoveredActionTypes = new Set(resolverFixtures
  .filter(([, , expectedKind]) => expectedKind === 'proposal')
  .map(([, expectedActionType]) => expectedActionType));
for (const actionType of AI_MENU_MANAGER_EXECUTABLE_ACTIONS) {
  assert(
    resolverCoveredActionTypes.has(actionType),
    `Executable AMM action lacks resolver fixture coverage: ${actionType}`,
  );
}
const readyClientMutationActions = AI_MENU_MANAGER_ACTION_DEFINITIONS
  .filter((definition) => definition.readiness === 'ready_adapter' && definition.executionMode === 'client_project_mutation')
  .map((definition) => definition.actionType);
for (const actionType of readyClientMutationActions) {
  assert(
    AI_MENU_MANAGER_EXECUTABLE_ACTIONS.includes(actionType),
    `Ready client mutation action is not listed as executable: ${actionType}`,
  );
}
for (const actionType of AI_MENU_MANAGER_EXECUTABLE_ACTIONS) {
  const definition = AI_MENU_MANAGER_ACTION_DEFINITIONS.find((entry) => entry.actionType === actionType);
  assert(
    definition?.readiness === 'ready_adapter' && definition?.executionMode === 'client_project_mutation',
    `Executable AMM action must be a ready client mutation adapter: ${actionType}`,
  );
}
for (const text of [
  'What should I fix today?',
  'Which items have no photos?',
  'Is my menu ready to share?',
  'Why is my QR menu old?',
  'Why is print menu wrong?',
  'Why is Cold coffee hidden?',
  'What should I promote today?',
  'Customer says Cold coffee price is wrong',
]) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    cardId: `domain-answer-${text}`,
    createdAt: '2026-06-18T00:00:00.000Z',
  });
  assert(
    result.card.kind === 'answer'
      && result.card.actionType === 'system_context_answer'
      && result.card.status === 'answered'
      && !result.card.actions.includes('approve')
      && !result.card.actions.includes('mark_done')
      && !result.resolved?.patch,
    `Domain answer fixture failed for "${text}": answers must be read-only cards without approval or patch writes`,
  );
}
for (const text of ['Update this on Zomato', 'Update this on Uber Eats', 'Post this on Instagram']) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    cardId: `external-${text}`,
    createdAt: '2026-06-18T00:00:00.000Z',
  });
  assert(
    result.card.kind === 'unsupported'
      && result.card.actionType === 'system_unsupported_action'
      && result.card.title.includes('not supported')
      && !result.card.actions.includes('mark_done')
      && result.card.suggestedReplies?.some((reply) => reply.prompt === 'Copy menu link'),
    `External fixture failed for "${text}": external platforms must be explicit not-supported cards with safe MenuList outputs and without completion controls`,
  );
}
for (const text of ["What is today's weather?", 'Tell me cricket score']) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    cardId: `general-out-of-scope-${text}`,
    createdAt: '2026-06-18T00:00:00.000Z',
  });
  assert(
    result.card.kind === 'unsupported'
      && result.card.actionType === 'system_unsupported_action'
      && result.card.title.includes('Menu Manager')
      && !result.card.actions.includes('mark_done'),
    `General question fixture failed for "${text}": AMM must not answer generic live/general questions`,
  );
}
for (const text of ['Change working hours', 'Set temporary status', 'Setup customer app', 'Show menu on TV', 'Manage feedback']) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    cardId: `guided-${text}`,
    createdAt: '2026-06-18T00:00:00.000Z',
  });
  assert(
    result.card.kind === 'clarification' && (result.card.suggestedReplies || []).length >= 4,
    `Guided More fixture failed for "${text}": expected option rows`,
  );
}
const duplicateNameContext = {
  ...resolverFixtureContext,
  items: [
    { id: 'tea-old', name: 'Tea', aliases: ['tea'], categoryId: 'cat-old', categoryName: 'Old Drinks', fileUid: 'f1', price: '10', available: true, active: true, hasImage: false, hasDescription: false, isBestSeller: false, duration: 5 },
    { id: 'tea-selected', name: 'Tea', aliases: ['tea'], categoryId: 'cat-new', categoryName: 'New Drinks', fileUid: 'f1', price: '30', available: true, active: true, hasImage: false, hasDescription: false, isBestSeller: false, duration: 5 },
  ],
  categories: [
    { id: 'cat-old', name: 'Drinks', aliases: ['drinks'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 1 },
    { id: 'cat-new', name: 'Drinks', aliases: ['drinks'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 2 },
  ],
};
const selectedDuplicateItemResult = resolveAiMenuManagerCommand({
  text: 'Selected item: Tea. 25',
  tId: 't1',
  sId: 's1',
  projectId: 'project-1',
  context: duplicateNameContext,
  composerContext: { target: 'item', selectedEntityIds: ['tea-selected'] },
  cardId: 'selected-duplicate-item',
  createdAt: '2026-06-18T00:00:00.000Z',
});
assert(
  selectedDuplicateItemResult.card.kind === 'proposal'
    && selectedDuplicateItemResult.card.actionType === 'item_price_update'
    && selectedDuplicateItemResult.card.entityRefs.some((entry) => entry.id === 'tea-selected'),
  'Composer-selected item ids must resolve duplicate item names to the picked item',
);
const selectedDuplicateCategoryResult = resolveAiMenuManagerCommand({
  text: 'Selected category: Drinks. increase price by 10',
  tId: 't1',
  sId: 's1',
  projectId: 'project-1',
  context: duplicateNameContext,
  composerContext: { target: 'category', selectedEntityIds: ['cat-new'] },
  cardId: 'selected-duplicate-category',
  createdAt: '2026-06-18T00:00:00.000Z',
});
assert(
  selectedDuplicateCategoryResult.card.kind === 'proposal'
    && selectedDuplicateCategoryResult.card.actionType === 'bulk_price_update'
    && selectedDuplicateCategoryResult.resolved?.patch?.itemIds?.includes('tea-selected')
    && !selectedDuplicateCategoryResult.resolved?.patch?.itemIds?.includes('tea-old'),
  'Composer-selected category ids must resolve duplicate category names to the picked category',
);

const extractedDataTypes = read('src/components/templates/main-app/projects/types/extractedData.types.ts');
const expectedCategoryFields = ['id', 'active', 'name', 'extractionIdAliases', 'icon', 'images', 'timeSlots', 'orderIndex'];
const expectedAttributeFields = ['name', 'id', 'price', 'active', 'orderIndex'];
const expectedItemFields = [
  'id',
  'extractionIdAliases',
  'attributes',
  'category',
  'name',
  'description',
  'descriptionSource',
  'price',
  'images',
  'tags',
  'active',
  'available',
  'isBestSeller',
  'decisionFacts',
  'allergens',
  'dietaryTags',
  'spiceLevel',
  'nutritionInfo',
  'skillLevel',
  'targetAudience',
  'materials',
  'warranty',
  'duration',
  'ownerBoost',
  'orderIndex',
  'qualityReview',
];
for (const field of [...expectedCategoryFields, ...expectedAttributeFields, ...expectedItemFields]) {
  assert(extractedDataTypes.includes(`${field}`), `Expected extracted data field missing from source type: ${field}`);
  assert(actionTypes.includes(`field: '${field}'`), `AMM field coverage missing for extracted data key: ${field}`);
}
for (const coverageConst of [
  'AI_MENU_MANAGER_CATEGORY_FIELD_ACTION_COVERAGE',
  'AI_MENU_MANAGER_ATTRIBUTE_FIELD_ACTION_COVERAGE',
  'AI_MENU_MANAGER_ITEM_FIELD_ACTION_COVERAGE',
]) {
  assert(actionTypes.includes(coverageConst), `Missing field coverage constant: ${coverageConst}`);
}

const schemas = read('src/lib/ai-menu-manager/schemas.ts');
assert(schemas.includes('AI_MENU_MANAGER_ACTION_TYPES') && schemas.includes('knownActionTypes.has'), 'Proposal schemas must reject unknown action types');
assert(schemas.includes('projectId: projectIdSchema'), 'AMM inbox requests must require selected project context through the project ID boundary');
assert(schemas.includes('sessionId: sessionIdSchema.optional()'), 'AMM command/inbox schemas must validate deterministic session IDs');
assert(schemas.includes('normalizeAiMenuManagerProjectId(value) === value'), 'AMM schemas must reject path-shaped selected project IDs');
assert(schemas.includes('normalizeAiMenuManagerSessionId(value) === value'), 'AMM schemas must reject malformed session IDs');
assert(schemas.includes('commandContextTargetSchema') && schemas.includes('selectedEntityIds'), 'AMM command schema must validate composer context selection');
assert(schemas.includes('replaceOperationId: idSchema.optional()'), 'AMM server command schema must support replacing clarification/follow-up cards');

const completeRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts');
assert(completeRoute.includes('readBoundedJsonBody'), 'Completion route must use bounded JSON body parsing');
assert(completeRoute.includes('AI_MENU_MANAGER_PROPOSAL_COMPLETE_MAX_BODY_BYTES'), 'Completion route must define an explicit request body cap');
assert(!completeRoute.includes('request.json()'), 'Completion route must not use raw request.json() parsing');
assert(completeRoute.includes('normalizeAiMenuManagerProposalId(params?.proposalId)'), 'Completion route must normalize route proposal ID before reads');
assert(completeRoute.indexOf('normalizeAiMenuManagerProposalId(params?.proposalId)') < completeRoute.indexOf('getAiMenuManagerProposal(proposalId)'), 'Completion route must reject malformed proposal IDs before Firestore proposal reads');
assert(completeRoute.includes('parsed.data.projectId') && completeRoute.includes('parsed.data.actionType'), 'Completion route must verify selected project/action scope');
assert(!completeRoute.includes("error?.message || 'Completion failed'"), 'Completion route must not echo internal error messages');

const sessionRoute = read('src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts');
assert(sessionRoute.includes('normalizeAiMenuManagerSessionId(params?.sessionId)'), 'Session route must normalize route session ID before reads');
assert(sessionRoute.includes("normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))"), 'Session route must normalize selected project ID before reads');
assert(sessionRoute.indexOf('normalizeAiMenuManagerSessionId(params?.sessionId)') < sessionRoute.indexOf('getAiMenuManagerInbox({'), 'Session route must reject malformed session IDs before Firestore inbox reads');
assert(sessionRoute.indexOf("normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))") < sessionRoute.indexOf('getAiMenuManagerInbox({'), 'Session route must reject malformed selected project IDs before Firestore inbox reads');

const ownerRoute = read('src/app/(main)/menu-manager/page.tsx');
assert(ownerRoute.includes('AiMenuManagerRoute'), 'AMM owner route must be mounted at /menu-manager');
assert(
  !fs.existsSync(path.join(root, 'src/app/(main)/ai-menu-manager/page.tsx')),
  'Owner AMM route must not be mounted at /ai-menu-manager because it conflicts with the public website feature page; use /menu-manager instead',
);
const legacyOwnerRoute = read('src/app/(main)/use-menulist/ai-menu-manager/page.tsx');
assert(legacyOwnerRoute.includes("redirect('/menu-manager')"), 'Legacy /use-menulist/ai-menu-manager route must redirect to independent /menu-manager route');

const serverRepo = read('src/database/aiMenuManager/server.ts');
assert(serverRepo.includes('MAX_COMPACT_MESSAGES = 20'), 'Compact message cap must be explicit');
assert(serverRepo.includes('MAX_PENDING_SUMMARIES = 25'), 'Pending summary cap must be explicit');
assert(serverRepo.includes('MAX_RECEIPTS = 20'), 'Receipt cap must be explicit');
assert(serverRepo.includes('MAX_IDEMPOTENCY_KEYS = 10'), 'Idempotency cap must be explicit');
assert(serverRepo.includes('normalizeAiMenuManagerSessionId(sessionId)'), 'AMM server DAL must normalize session IDs before session document refs');
assert(serverRepo.includes('normalizeAiMenuManagerProposalId(proposalId)'), 'AMM server DAL must normalize proposal IDs before proposal document refs');
assert(serverRepo.includes('normalizeAiMenuManagerProjectId(params.projectId)'), 'AMM server DAL must normalize selected project IDs before project document refs');
assert(serverRepo.includes('normalizeAiMenuManagerScopeDocumentId(params.tId)'), 'AMM server DAL must normalize tenant scope before scoped project refs');
assert(serverRepo.includes('normalizeAiMenuManagerScopeDocumentId(params.sId)'), 'AMM server DAL must normalize store scope before scoped project refs');
assert(serverRepo.includes('requireAiMenuManagerScopeDocumentIds(params)'), 'AMM server DAL mutations must fail closed before invalid tenant/store scope refs');
assert(serverRepo.includes('.doc(scope.tId)') && serverRepo.includes('.collection(scope.sId)'), 'AMM server DAL scoped project refs must use normalized tenant/store scope');
assert(serverRepo.includes('requireSessionRef(params.sessionId)'), 'AMM command persistence must fail closed before invalid session document refs');
assert(serverRepo.includes('requireProposalRef(params.proposal.proposalId)'), 'AMM command persistence must fail closed before invalid proposal document refs');
assert(serverRepo.includes('.map((entry) => normalizeAiMenuManagerProposalId(entry.proposalId))'), 'AMM inbox hydration must filter stored proposal summary IDs before proposal refs');
assert(serverRepo.includes('const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;'), 'AMM proposal mutation paths must skip invalid stored session refs');
assert(!serverRepo.includes('.doc(sessionId)'), 'AMM server DAL must not directly pass sessionId into Firestore doc refs');
assert(!serverRepo.includes('.doc(proposalId)'), 'AMM server DAL must not directly pass proposalId into Firestore doc refs');
assert(!serverRepo.includes('.doc(params.projectId)'), 'AMM server DAL must not directly pass params.projectId into Firestore doc refs');
assert(!serverRepo.includes('collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)'), 'AMM server DAL must not build scoped project paths from raw tenant/store params');
assert(serverRepo.includes('if (proposalSnap.exists) return;'), 'Command persistence must avoid duplicate proposal/session writes on retry');
assert(serverRepo.includes('params.replaceOperationId') && serverRepo.includes('entry.proposalId !== params.replaceOperationId'), 'Server-backed command persistence must replace clarification/follow-up cards');
assert(serverRepo.includes('Execution directive expired'), 'Execution directives must expire');
assert(serverRepo.includes('projectContainsAiMenuManagerPatch'), 'Completion must verify the existing project mutation landed');
assert(serverRepo.includes('String(session.projectId) !== String(params.projectId)'), 'Inbox reads must reject sessions from a different selected project');
assert(aiMenuManagerImplDoc.includes('AMM server DAL ID boundary'), 'AMM implementation doc must document the server DAL ID boundary');
assert(aiMenuManagerImplDoc.includes('AMM scope document-ID boundary'), 'AMM implementation doc must document the tenant/store scope document-ID boundary');
assert(aiMenuManagerFirebaseDoc.includes('AMM server DAL ID boundary'), 'AMM Firebase doc must document the server DAL ID boundary');
assert(aiMenuManagerFirebaseDoc.includes('AMM scope document-ID admission'), 'AMM Firebase doc must document the scope document-ID cost boundary');
assert(productionReadinessAudit.includes('AI Menu Manager server DAL ID boundary checkpoint'), 'Production readiness audit must record the AMM server DAL ID boundary checkpoint');
assert(productionReadinessAudit.includes('AI Menu Manager Scope Document ID Boundary checkpoint'), 'Production readiness audit must record the AMM scope document-ID boundary checkpoint');
assert(changelogUpper.includes('AI Menu Manager Server DAL ID Boundary'), 'Primary changelog must record the AMM server DAL ID boundary');
assert(changelogUpper.includes('AI Menu Manager Scope Document ID Boundary'), 'Primary changelog must record the AMM scope document-ID boundary');
assert(changelogLower.includes('AI Menu Manager Server DAL ID Boundary'), 'Lowercase changelog must record the AMM server DAL ID boundary');
assert(changelogLower.includes('AI Menu Manager Scope Document ID Boundary'), 'Lowercase changelog must record the AMM scope document-ID boundary');

const desktopRoute = read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx');
const desktopProposalCard = read('src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx');
const localActionUrl = read('src/lib/ai-menu-manager/localActionUrl.ts');
assert(localActionUrl.includes('AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID'), 'AMM local-action URL helper must throw a fixed invalid URL code');
assert(localActionUrl.includes("url.protocol === 'https:'"), 'AMM local-action URL helper must allow HTTPS URLs');
assert(localActionUrl.includes("url.protocol === 'http:' && isKnownLocalDevelopmentHost(url)"), 'AMM local-action URL helper must allow known local-dev HTTP URLs only');
assert(localActionUrl.includes('url.username || url.password'), 'AMM local-action URL helper must reject credentialed URLs');
assert(localActionUrl.includes("host.endsWith('.menulist.ai')"), 'AMM local-action URL helper must preserve local tenant-host testing support');
assert(desktopProposalCard.includes("action.type === 'copy_url'"), 'Desktop AMM cards must support copy_url local actions');
assert(desktopProposalCard.includes("action.type === 'copy_text'"), 'Desktop AMM cards must support copy_text local actions');
assert(desktopProposalCard.includes("action.type === 'download_text'"), 'Desktop AMM cards must support download_text local actions');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_failed'), 'Desktop AMM cards must log bounded local-action failures');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_open_blocked'), 'Desktop AMM cards must detect blocked local-action URL opens');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_copy_unavailable'), 'Desktop AMM cards must reject unavailable local copy handoffs');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_copy_fallback_failed'), 'Desktop AMM cards must reject failed textarea copy fallback');
assert(desktopProposalCard.includes('hasRuntimeClipboardWrite') && desktopProposalCard.includes('hasRuntimeCopyFallback'), 'Desktop AMM cards must use shared runtime copy support checks');
assert(desktopProposalCard.includes('let clipboardWriteError: unknown;') && desktopProposalCard.includes('clipboardWriteError = error;'), 'Desktop AMM cards must fall through to textarea fallback after rejected Clipboard API writes');
assert(desktopProposalCard.includes('clipboardWriteRejected: Boolean(clipboardWriteError)'), 'Desktop AMM cards must preserve Clipboard rejection context in unavailable-copy failures');
assert(desktopProposalCard.includes('normalizeAiMenuManagerLocalActionUrl'), 'Desktop AMM cards must normalize local-action URLs');
assert(desktopProposalCard.includes('copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value))'), 'Desktop AMM cards must normalize copy_url actions');
assert(desktopProposalCard.includes('const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);'), 'Desktop AMM cards must normalize open/QR local-action URLs');
assert(desktopProposalCard.includes("const opened = window.open(actionUrl, '_blank', 'noopener,noreferrer')"), 'Desktop AMM cards must use safe normalized local-action URL opens');
assert(desktopProposalCard.includes("getBoundedRuntimeStringContext('actionValue', action.value)"), 'Desktop AMM cards must bound local-action values in diagnostics');
assert(desktopProposalCard.includes("getBoundedRuntimeStringContext('cardId', card.cardId)"), 'Desktop AMM cards must bound card ids in local-action diagnostics');
assert(desktopProposalCard.includes('hasClipboardWrite: hasRuntimeClipboardWrite()') && desktopProposalCard.includes('hasCopyFallback: hasRuntimeCopyFallback()'), 'Desktop AMM local-action diagnostics must include copy support metadata');
assert(desktopProposalCard.includes("const copied = document.execCommand('copy');"), 'Desktop AMM cards must inspect textarea copy fallback acknowledgement');
assert(!desktopProposalCard.includes("\n                window.open(action.value, '_blank', 'noopener,noreferrer');\n                return;"), 'Desktop AMM cards must not silently open local-action URLs');
assert(!desktopProposalCard.includes("window.open(action.value, '_blank', 'noopener,noreferrer')"), 'Desktop AMM cards must not open unnormalized local-action URLs');
assert(!desktopProposalCard.includes("if (navigator.clipboard?.writeText) {\n        await navigator.clipboard.writeText(value);\n        return;\n    }"), 'Desktop AMM cards must not fail rejected Clipboard API writes before textarea fallback');
assert(!desktopProposalCard.includes("document.execCommand('copy');\n    document.body.removeChild(textarea);"), 'Desktop AMM cards must not treat failed textarea copy fallback as success');
assert(desktopRoute.includes('sessionProjectIdRef'), 'Desktop AMM must track session ids per selected project');
assert(desktopRoute.includes('getAiMenuManagerComposerContextData') && desktopRoute.includes('buildAiMenuManagerComposerPrompt'), 'Desktop AMM must support composer context selection');
assert(desktopRoute.includes('composerContext: commandContext') && desktopRoute.includes('clearComposerContext();'), 'Desktop AMM must pass exact composer context ids and clear them after use');
assert(desktopRoute.includes('amm-desktop-context-picker') && desktopRoute.includes('Work on'), 'Desktop AMM must render an inline composer context picker');
assert(desktopRoute.includes('toggleContextPicker') && desktopRoute.includes('setIsSuggestionsOpen(false)') && desktopRoute.includes('setIsContextPickerOpen(false)'), 'Desktop AMM Work on and Suggestions panels must be mutually exclusive');
assert(desktopRoute.includes('filterAiMenuManagerComposerEntities') && desktopRoute.includes('toggleComposerEntity'), 'Desktop AMM context picker must support item/category entity selection');
assert(desktopRoute.includes('activeContextEntityCount') && desktopRoute.includes('shouldShowContextSearch') && desktopRoute.includes('Find item') && desktopRoute.includes('Find category'), 'Desktop AMM item/category picker must use compact conditional search');
assert(desktopRoute.includes("gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'") && desktopRoute.includes('minHeight: 38'), 'Desktop AMM item/category picker must use compact selectable rows/grid cells');
assert(desktopRoute.includes('currentSession') && desktopRoute.includes('sessionSnapshot: currentSession'), 'Desktop AMM must submit commands from the loaded compact session snapshot');
assert(desktopRoute.includes('Suggestions') && desktopRoute.includes('pickSuggestion') && desktopRoute.includes('setInput(prompt)'), 'Desktop AMM suggestions must fill the composer instead of executing directly');
assert(desktopRoute.includes('resolveClarification') && desktopRoute.includes('replaceOperationId: card.cardId'), 'Desktop AMM clarification choices must resolve into the next card and replace the clarification');
assert(desktopRoute.includes('getAiMenuManagerProjectPromptGroups') && desktopRoute.includes('promptGroups.map'), 'Desktop AMM suggestions must use grouped, contextual prompt rows');
assert(desktopRoute.includes('getAiMenuManagerStarterSuggestions') && desktopRoute.includes('activateStarterSuggestion'), 'Desktop AMM empty-state starter cards must use draft-only suggestion behavior');
assert(desktopRoute.includes('getAiMenuManagerAttentionSuggestions') && desktopRoute.includes('attentionSuggestions.length ?'), 'Desktop AMM empty state must prioritize loaded-menu attention cards before generic starter cards');
assert(desktopRoute.includes('activeSuggestion') && desktopRoute.includes('setActiveSuggestion(suggestion)'), 'Desktop AMM suggestions must support first-level to second-level guided navigation');
assert(desktopRoute.includes('getAiMenuManagerPromptText(prompt)'), 'Desktop AMM child suggestions must draft their configured prompt text');
assert(desktopRoute.includes('LuChevronRight') && desktopRoute.includes('Back'), 'Desktop AMM nested suggestions must expose forward and back navigation');
assert(!desktopRoute.includes('Drawer'), 'Desktop AMM suggestions must stay inside the chat frame, not open as a page-level drawer');
assert(desktopRoute.includes('amm-desktop-suggestions-tray') && desktopRoute.includes('Hide suggestions'), 'Desktop AMM suggestions must render as an inline chat-frame tray');
assert(desktopRoute.includes('getAiMenuManagerCardEditPrompt') && desktopRoute.includes('onDraftPrompt'), 'Desktop AMM cards must support draft-first edit/options');
assert(!desktopRoute.includes('submitPrompt(prompt.label)'), 'Desktop AMM suggestion chips must not submit directly');
assert(!desktopRoute.includes('}, [message, sessionId, storeId]);'), 'Desktop AMM must not reload inbox only because sessionId state changed');
assert(desktopRoute.includes('completeAiMenuManagerClientOperation'), 'Desktop AMM must complete deterministic cards through the client session DAL');
assert(desktopRoute.includes('sessionSnapshot: currentSession'), 'Desktop AMM must complete/cancel cards from the loaded compact session snapshot');
assert(desktopRoute.includes('buildAiMenuManagerClientExecutionDirective'), 'Desktop AMM approvals must use stored DAL execution directives');
assert(desktopRoute.includes('isServerBackedCard') && desktopRoute.includes('submitAiMenuManagerProposalAction'), 'Desktop AMM must use guarded proposal APIs only for server-backed fallback cards');
assert(desktopRoute.includes('completeAiMenuManagerClientProposal'), 'Desktop AMM must complete server-backed fallback cards through the guarded proposal completion API');
assert(desktopRoute.includes("card.kind === 'manual_task' && card.actions.includes('mark_done')"), 'Desktop AMM must only mark done cards that are manual tasks and expose mark_done');
assert(!desktopRoute.includes("card.kind === 'manual_task' || card.actions.includes('mark_done')"), 'Desktop AMM must not mark non-manual cards done just because mark_done appears in actions');
assert(desktopRoute.includes('assertProjectUpdateSucceeded('), 'Desktop AMM must acknowledge project update writes before completion');
assert(desktopRoute.includes('ai_menu_manager_project_update_rejected'), 'Desktop AMM must reject swallowed project update writes with a stable code');
assertNoRawUiErrorMessages(desktopRoute, 'Desktop AMM route');
for (const failureCode of [
  'ai_menu_manager_projects_load_failed',
  'ai_menu_manager_selected_project_load_failed',
  'ai_menu_manager_prompt_submit_failed',
  'ai_menu_manager_project_update_failed',
  'ai_menu_manager_project_update_failed_proposal_completion_failed',
  'ai_menu_manager_project_update_failed_operation_completion_failed',
  'ai_menu_manager_card_apply_failed',
  'ai_menu_manager_card_cancel_failed',
]) {
  assert(desktopRoute.includes(failureCode), `Desktop AMM route must log bounded failure code ${failureCode}`);
}
assert(!desktopRoute.includes('}).catch(() => null);'), 'Desktop AMM route must not silently swallow project-update failed-completion attempts');
assert(desktopRoute.includes("message: 'Project update failed'"), 'Desktop AMM must persist generic project update failure text');
assert(desktopRoute.includes("message.error('Unable to apply this card.')"), 'Desktop AMM apply failure UI must use fixed copy');

const mobileShell = read('src/components/mobile/MobileShell.tsx');
assert(mobileShell.includes('/menu-manager'), 'MobileShell independent Menu Manager route mapping missing');
assert(mobileShell.includes("tab: 'aiMenuManager'"), 'MobileShell direct route must resolve to the Menu Manager bottom tab');
assert(mobileShell.includes("activeTab === 'aiMenuManager'"), 'MobileShell must render Menu Manager as a first-class tab screen');
assert(mobileShell.includes("FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER") && mobileShell.includes("FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_MOBILE"), 'MobileShell Menu Manager tab must be feature-flag guarded');

const mobileNavigation = read('src/components/mobile/MobileNavigation.tsx');
assert(mobileNavigation.includes("'aiMenuManager'"), 'MobileNavigation must include the Menu Manager tab key');
assert(mobileNavigation.includes("title: 'Manager'"), 'MobileNavigation must expose Menu Manager in the bottom tab bar');

const mobileScreen = read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx');
const mobileProposalCard = read('src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx');
assert(mobileProposalCard.includes("action.type === 'copy_url'"), 'Mobile AMM cards must support copy_url local actions');
assert(mobileProposalCard.includes("action.type === 'copy_text'"), 'Mobile AMM cards must support copy_text local actions');
assert(mobileProposalCard.includes("action.type === 'download_text'"), 'Mobile AMM cards must support download_text local actions');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_failed'), 'Mobile AMM cards must log bounded local-action failures');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_open_blocked'), 'Mobile AMM cards must detect blocked local-action URL opens');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_copy_unavailable'), 'Mobile AMM cards must reject unavailable local copy handoffs');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_copy_fallback_failed'), 'Mobile AMM cards must reject failed textarea copy fallback');
assert(mobileProposalCard.includes('hasRuntimeClipboardWrite') && mobileProposalCard.includes('hasRuntimeCopyFallback'), 'Mobile AMM cards must use shared runtime copy support checks');
assert(mobileProposalCard.includes('let clipboardWriteError: unknown;') && mobileProposalCard.includes('clipboardWriteError = error;'), 'Mobile AMM cards must fall through to textarea fallback after rejected Clipboard API writes');
assert(mobileProposalCard.includes('clipboardWriteRejected: Boolean(clipboardWriteError)'), 'Mobile AMM cards must preserve Clipboard rejection context in unavailable-copy failures');
assert(mobileProposalCard.includes('normalizeAiMenuManagerLocalActionUrl'), 'Mobile AMM cards must normalize local-action URLs');
assert(mobileProposalCard.includes('copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value))'), 'Mobile AMM cards must normalize copy_url actions');
assert(mobileProposalCard.includes('const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);'), 'Mobile AMM cards must normalize open/QR local-action URLs');
assert(mobileProposalCard.includes("const opened = window.open(actionUrl, '_blank', 'noopener,noreferrer')"), 'Mobile AMM cards must use safe normalized local-action URL opens');
assert(mobileProposalCard.includes("getBoundedRuntimeStringContext('actionValue', action.value)"), 'Mobile AMM cards must bound local-action values in diagnostics');
assert(mobileProposalCard.includes("getBoundedRuntimeStringContext('cardId', card.cardId)"), 'Mobile AMM cards must bound card ids in local-action diagnostics');
assert(mobileProposalCard.includes('hasClipboardWrite: hasRuntimeClipboardWrite()') && mobileProposalCard.includes('hasCopyFallback: hasRuntimeCopyFallback()'), 'Mobile AMM local-action diagnostics must include copy support metadata');
assert(mobileProposalCard.includes("const copied = document.execCommand('copy');"), 'Mobile AMM cards must inspect textarea copy fallback acknowledgement');
assert(!mobileProposalCard.includes("\n                window.open(action.value, '_blank', 'noopener,noreferrer');\n                return;"), 'Mobile AMM cards must not silently open local-action URLs');
assert(!mobileProposalCard.includes("window.open(action.value, '_blank', 'noopener,noreferrer')"), 'Mobile AMM cards must not open unnormalized local-action URLs');
assert(!mobileProposalCard.includes("if (navigator.clipboard?.writeText) {\n        await navigator.clipboard.writeText(value);\n        return;\n    }"), 'Mobile AMM cards must not fail rejected Clipboard API writes before textarea fallback');
assert(!mobileProposalCard.includes("document.execCommand('copy');\n    document.body.removeChild(textarea);"), 'Mobile AMM cards must not treat failed textarea copy fallback as success');
assert(mobileScreen.includes('useMobileProjects'), 'Mobile AMM must use existing mobile project provider');
assert(mobileScreen.includes('sessionProjectIdRef'), 'Mobile AMM must track session ids per selected project');
assert(mobileScreen.includes('getAiMenuManagerComposerContextData') && mobileScreen.includes('buildAiMenuManagerComposerPrompt'), 'Mobile AMM must support composer context selection');
assert(mobileScreen.includes('composerContext: commandContext') && mobileScreen.includes('clearComposerContext();'), 'Mobile AMM must pass exact composer context ids and clear them after use');
assert(mobileScreen.includes('Choose work context') && mobileScreen.includes('Work on'), 'Mobile AMM must expose the context picker from the composer');
assert(mobileScreen.includes('openContextPicker') && mobileScreen.includes('setIsSuggestionsOpen(false)') && mobileScreen.includes('setIsContextPickerOpen(false)'), 'Mobile AMM Work on and Suggestions sheets must be mutually exclusive');
assert(mobileScreen.includes('filterAiMenuManagerComposerEntities') && mobileScreen.includes('toggleComposerEntity'), 'Mobile AMM context picker must support item/category entity selection');
assert(mobileScreen.includes('activeContextEntityCount') && mobileScreen.includes('shouldShowContextSearch') && mobileScreen.includes('Find item') && mobileScreen.includes('Find category'), 'Mobile AMM item/category picker must use compact conditional search');
assert(mobileScreen.includes('SearchBar') && mobileScreen.includes("maxHeight: '36vh'") && mobileScreen.includes('minHeight: 44'), 'Mobile AMM item/category picker must use compact MobileShell-friendly rows');
assert(mobileScreen.includes('currentSession') && mobileScreen.includes('sessionSnapshot: currentSession'), 'Mobile AMM must submit commands from the loaded compact session snapshot');
assert(mobileScreen.includes('Show suggestions') && mobileScreen.includes('pickSuggestion') && mobileScreen.includes('setInput(prompt)'), 'Mobile AMM suggestions must fill the composer instead of executing directly');
assert(mobileScreen.includes('resolveClarification') && mobileScreen.includes('replaceOperationId: card.cardId'), 'Mobile AMM clarification choices must resolve into the next card and replace the clarification');
assert(mobileScreen.includes('getAiMenuManagerProjectPromptGroups') && mobileScreen.includes('promptGroups.map'), 'Mobile AMM suggestions must use grouped, contextual prompt rows');
assert(mobileScreen.includes('getAiMenuManagerStarterSuggestions') && mobileScreen.includes('activateStarterSuggestion'), 'Mobile AMM empty-state starter cards must use draft-only suggestion behavior');
assert(mobileScreen.includes('getAiMenuManagerAttentionSuggestions') && mobileScreen.includes('attentionSuggestions.length ?'), 'Mobile AMM empty state must prioritize loaded-menu attention cards before generic starter cards');
assert(mobileScreen.includes('activeSuggestion') && mobileScreen.includes('setActiveSuggestion(suggestion)'), 'Mobile AMM suggestions must support first-level to second-level guided navigation');
assert(mobileScreen.includes('getAiMenuManagerPromptText(prompt)'), 'Mobile AMM child suggestions must draft their configured prompt text');
assert(mobileScreen.includes('LuChevronRight') && mobileScreen.includes('Back'), 'Mobile AMM nested suggestions must expose forward and back navigation');
assert(mobileScreen.includes('<Popup'), 'Mobile AMM suggestions must remain a MobileShell-friendly bottom sheet');
assert(mobileScreen.includes('getAiMenuManagerCardEditPrompt') && mobileScreen.includes('onDraftPrompt'), 'Mobile AMM cards must support draft-first edit/options');
assert(!mobileScreen.includes('submitPrompt(prompt.label)'), 'Mobile AMM suggestion chips must not submit directly');
assert(!mobileScreen.includes('}, [selectedProjectId, sessionId, storeId]);'), 'Mobile AMM must not reload inbox only because sessionId state changed');
assert(mobileScreen.includes('completeAiMenuManagerClientOperation'), 'Mobile AMM must complete deterministic cards through the client session DAL');
assert(mobileScreen.includes('sessionSnapshot: currentSession'), 'Mobile AMM must complete/cancel cards from the loaded compact session snapshot');
assert(mobileScreen.includes('buildAiMenuManagerClientExecutionDirective'), 'Mobile AMM approvals must use stored DAL execution directives');
assert(mobileScreen.includes('isServerBackedCard') && mobileScreen.includes('submitAiMenuManagerProposalAction'), 'Mobile AMM must use guarded proposal APIs only for server-backed fallback cards');
assert(mobileScreen.includes('completeAiMenuManagerClientProposal'), 'Mobile AMM must complete server-backed fallback cards through the guarded proposal completion API');
assert(mobileScreen.includes("card.kind === 'manual_task' && card.actions.includes('mark_done')"), 'Mobile AMM must only mark done cards that are manual tasks and expose mark_done');
assert(!mobileScreen.includes("card.kind === 'manual_task' || card.actions.includes('mark_done')"), 'Mobile AMM must not mark non-manual cards done just because mark_done appears in actions');
assert(mobileScreen.includes('assertProjectUpdateSucceeded('), 'Mobile AMM must acknowledge project update writes before completion');
assert(mobileScreen.includes('mobile_ai_menu_manager_project_update_rejected'), 'Mobile AMM must reject swallowed project update writes with a stable code');
assertNoRawUiErrorMessages(mobileScreen, 'Mobile AMM screen');
for (const failureCode of [
  'mobile_ai_menu_manager_inbox_load_failed',
  'mobile_ai_menu_manager_prompt_submit_failed',
  'mobile_ai_menu_manager_project_update_failed',
  'mobile_ai_menu_manager_project_update_failed_proposal_completion_failed',
  'mobile_ai_menu_manager_project_update_failed_operation_completion_failed',
  'mobile_ai_menu_manager_card_apply_failed',
  'mobile_ai_menu_manager_card_cancel_failed',
]) {
  assert(mobileScreen.includes(failureCode), `Mobile AMM screen must log bounded failure code ${failureCode}`);
}
assert(!mobileScreen.includes('}).catch(() => null);'), 'Mobile AMM screen must not silently swallow project-update failed-completion attempts');
assert(mobileScreen.includes("message: 'Project update failed'"), 'Mobile AMM must persist generic project update failure text');
assert(mobileScreen.includes("Toast.show({ content: 'Unable to apply card.' })"), 'Mobile AMM apply failure UI must use fixed copy');

const promptHints = read('src/lib/ai-menu-manager/projectPromptHints.ts');
assert(promptHints.includes('getAiMenuManagerProjectPromptGroups'), 'AMM prompt helper must expose grouped contextual suggestions');
assert(promptHints.includes('getAiMenuManagerAttentionSuggestions'), 'AMM prompt helper must expose loaded-menu attention suggestions');
assert(promptHints.includes("'quick-fixes'") && promptHints.includes("'promote'") && promptHints.includes("'publish-import'") && promptHints.includes("'more-daily'") && promptHints.includes("'more-tools'"), 'AMM prompt groups must cover quick fixes, promotion, publish/import, daily operations, and More tools');
assert(promptHints.includes('children?: AiMenuManagerPromptSuggestion[]'), 'AMM prompt suggestions must support nested guided child options');
assert(promptHints.includes('getAiMenuManagerPromptText'), 'AMM prompt helper must expose draft text for child suggestions');
for (const promptLayer of [
  'Change presentation tone',
  'Change item layout',
  'Change theme color',
  'Change display options',
  'Change working hours',
  'Set temporary status',
  'Change time slots',
  'Customer app',
  'Digital screens',
  'Manage feedback',
]) {
  assert(promptHints.includes(promptLayer), `Missing guided top-level suggestion: ${promptLayer}`);
}
const {
  getAiMenuManagerAttentionSuggestions,
  getAiMenuManagerProjectPromptGroups,
  getAiMenuManagerPromptText,
  getAiMenuManagerStarterSuggestions,
} = require(path.join(root, 'src/lib/ai-menu-manager/projectPromptHints'));
const promptGroupsFixture = getAiMenuManagerProjectPromptGroups({
  projectId: 'project-1',
  defaultLanguage: 'en',
  languages: ['en'],
  files: [
    {
      extractedData: {
        data: {
          items: [
            {
              id: 'item-1',
              active: true,
              available: true,
              name: { en: 'Chocolate milk shake' },
              price: '200',
              images: [],
              description: {},
              isBestSeller: false,
            },
            {
              id: 'item-2',
              active: true,
              available: true,
              name: { en: 'Fruit and nut smoothie' },
              price: '180',
              images: ['image-1'],
              description: { en: 'Fresh smoothie' },
              isBestSeller: false,
            },
          ],
        },
      },
    },
  ],
});
function collectPromptTexts(groups) {
  const texts = [];
  for (const group of groups) {
    for (const suggestion of group.suggestions || []) {
      texts.push(suggestion.label, getAiMenuManagerPromptText(suggestion));
      for (const child of suggestion.children || []) {
        texts.push(child.label, getAiMenuManagerPromptText(child));
      }
    }
  }
  return texts;
}
const promptFixtureTexts = collectPromptTexts(promptGroupsFixture);
const starterFixtureTexts = getAiMenuManagerStarterSuggestions(promptGroupsFixture).map((suggestion) => suggestion.label);
assert(starterFixtureTexts.length >= 3, 'AMM starter suggestions must include three owner-friendly draft cards when menu context exists');
assert(starterFixtureTexts.includes('Store closed today'), 'AMM starter suggestions must prioritize daily temporary status work');
assert(starterFixtureTexts.includes('Change working hours'), 'AMM starter suggestions must prioritize daily working-hours work');
assert(starterFixtureTexts.some((text) => text.includes('sold out')), 'AMM starter suggestions must include a contextual sold-out draft when menu items exist');
const attentionFixtureTexts = getAiMenuManagerAttentionSuggestions({
  projectId: 'project-attention',
  defaultLanguage: 'en',
  languages: ['en'],
  files: [
    {
      extractedData: {
        data: {
          categories: [
            { id: 'cat-desserts', active: false, name: { en: 'Desserts' } },
            { id: 'cat-drinks', active: true, name: { en: 'Drinks' } },
          ],
          items: [
            {
              id: 'item-soda',
              active: true,
              available: false,
              category: 'cat-drinks',
              name: { en: 'Fresh Lime Soda' },
              price: '80',
              images: ['image-1'],
              description: { en: 'Lime soda' },
            },
            {
              id: 'item-lassi',
              active: true,
              available: true,
              category: 'cat-drinks',
              name: { en: 'Mango Lassi' },
              images: [],
              description: {},
            },
          ],
        },
      },
    },
  ],
}).map((suggestion) => suggestion.label);
assert(attentionFixtureTexts.includes('Show Desserts category'), 'AMM attention suggestions must surface hidden categories from loaded project context');
assert(attentionFixtureTexts.includes('Make Fresh Lime Soda available'), 'AMM attention suggestions must surface unavailable loaded-context items before generic prompts');
assert(attentionFixtureTexts.length <= 3, 'AMM attention suggestions must stay compact for the first screen');
for (const childPrompt of [
  'Set menu tone to Premium & Minimal',
  'Use grid layout',
  'Set theme color to Gold',
  'Show item prices',
  'Change working hours for today',
  'Set temporary status: closed today',
  'Copy customer app install link',
  'Copy digital screen link',
  'Download feedback QR',
]) {
  assert(promptFixtureTexts.includes(childPrompt), `Missing guided child suggestion prompt: ${childPrompt}`);
}

const composerContext = read('src/lib/ai-menu-manager/composerContext.ts');
assert(composerContext.includes('AI_MENU_MANAGER_COMPOSER_TARGETS'), 'AMM composer context targets must be centralized');
for (const targetLabel of ['Item', 'Category', 'Menu design', 'Digital menu', 'Official page', 'Digital screens', 'Feedback', 'Store settings']) {
  assert(composerContext.includes(`label: '${targetLabel}'`), `Missing composer context target: ${targetLabel}`);
}
assert(composerContext.includes('buildAiMenuManagerComposerPrompt'), 'AMM composer context must build explicit owner-readable prompt text');
assert(composerContext.includes('Selected items') && composerContext.includes('Selected category'), 'AMM composer context must encode selected item/category context into sent text');

const proposalCard = read('src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx');
const mobileCardStack = read('src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx');
assert(!proposalCard.includes('actionType.replaceAll') && !mobileCardStack.includes('actionType.replaceAll'), 'AMM cards must not expose internal action ids to owners');
assert(proposalCard.includes('Choose an option') && proposalCard.includes("card.kind === 'clarification'") && proposalCard.includes('onResolveClarification?.(card, reply.prompt)'), 'Desktop cards must render guided options and resolve clarification choices without approving');
assert(mobileCardStack.includes('Choose an option') && mobileCardStack.includes("card.kind === 'clarification'") && mobileCardStack.includes('onResolveClarification?.(card, reply.prompt)'), 'Mobile cards must render guided options and resolve clarification choices without approving');
assert(proposalCard.includes('card.localActions') && proposalCard.includes('generateBrandedQrCodeDataUrl'), 'Desktop cards must render browser-local link and QR actions');
assert(mobileCardStack.includes('card.localActions') && mobileCardStack.includes('generateBrandedQrCodeDataUrl'), 'Mobile cards must render browser-local link and QR actions');

assert(commandResolver.includes('Choose presentation tone'), 'Theme/style commands without a preset must create a guided tone chooser');
assert(commandResolver.includes('Choose item for image'), 'Image commands without an item must create a guided item chooser');
assert(commandResolver.includes('Choose item to feature'), 'Promote-item commands without an item must create a guided item chooser');
assert(commandResolver.includes('suggestedReplies'), 'Clarification cards must carry suggested replies for next-card resolution');

const firestoreRules = read('firestore.rules');
assert(firestoreRules.includes('match /aiMenuManagerSessions/{sessionId}'), 'Firestore rules must explicitly guard AMM compact session docs');
assert(firestoreRules.includes('pendingOperations.size() <= 25'), 'Firestore rules must cap AMM pending operations');
assert(firestoreRules.includes('compactMessages.size() <= 20'), 'Firestore rules must cap AMM compact messages');
assert(firestoreRules.includes('isAiMenuManagerSessionScopeUnchanged') && firestoreRules.includes('canWriteAiMenuManagerSession(resource.data.tId, resource.data.sId)'), 'Firestore rules must verify existing AMM session scope before update');
assert(firestoreRules.includes('match /aiMenuManagerProposals/{proposalId}') && firestoreRules.includes('allow read, write: if false;'), 'AMM proposal docs must remain server/Admin-only');

console.log('AI Menu Manager verification passed');
