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
  'src/lib/ai-menu-manager/compoundCommand.ts',
  'src/lib/ai-menu-manager/domainConversationRouter.ts',
  'src/lib/ai-menu-manager/modelRouter/routerOutcomeSchema.ts',
  'src/lib/ai-menu-manager/modelRouter/plannerContext.ts',
  'src/lib/ai-menu-manager/modelRouter/plannerActionContracts.ts',
  'src/lib/ai-menu-manager/modelRouter/providerResultPolicy.ts',
  'src/lib/ai-menu-manager/modelRouter/modelRouteCard.ts',
  'src/lib/ai-menu-manager/presentation.ts',
  'src/lib/ai-menu-manager/patchPolicy.ts',
  'src/lib/ai-menu-manager/sessionIntegrity.ts',
  'src/lib/ai-menu-manager/proposalIntegrity.ts',
  'src/lib/ai-menu-manager/projectIntegrity.ts',
  'src/lib/ai-menu-manager/routeIds.ts',
  'src/lib/ai-menu-manager/actions/projectPatches.ts',
  'src/database/aiMenuManager/server.ts',
  'src/database/aiMenuManager/index.ts',
  'src/app/api/ai-menu-manager/command/route.ts',
  'src/app/api/ai-menu-manager/plan/route.ts',
  'src/app/api/ai-menu-manager/inbox/route.ts',
  'src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts',
  'src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts',
  'src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts',
  'src/app/(main)/menu-manager/page.tsx',
  'src/app/(main)/use-menulist/ai-menu-manager/page.tsx',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  'src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx',
  'scripts/verification/test-ai-menu-manager-emulator.ts',
  'scripts/verification/test-ai-menu-manager-rules.ts',
  'scripts/verification/test-ai-menu-manager-session-integrity.ts',
  'scripts/verification/test-ai-menu-manager-proposal-integrity.ts',
  'scripts/verification/test-ai-menu-manager-project-integrity.ts',
  'scripts/verification/test-ai-menu-manager-domain-conversation.ts',
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
for (const token of [
  'Not current launch certification or deploy approval',
  'External Certification Runbook',
  '`npm run verify:production-readiness-local`',
  '`npm run verify:ai-menu-manager`',
  '`npm run verify:ai-accounting`',
  'authenticated desktop/mobile Menu Manager QA',
  'deterministic-command and approval/cancel/receipt regression evidence',
  'supported-adapter smoke behind AMM feature flags',
  'guarded cloud-planner provider smoke in the target environment',
  'public website/help copy review',
  'target Firebase deploy evidence where rules or indexes change',
  'target Vercel deploy evidence where planner/app routes or clients change',
  'production-host smoke',
]) {
  assert(aiMenuManagerTechnicalTeamFlow.includes(token), `AMM technical team flow top launch boundary must include ${token}`);
}
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
const changelogUpper = read('__docs__/changelog.md');
const changelogLower = read('__docs__/changelog.md');
assert(productionReadinessAudit.includes('AI Menu Manager technical-flow top-boundary checkpoint'), 'Production readiness audit must record AMM technical-flow top boundary');
assert(changelogLower.includes('AI Menu Manager Technical Flow Top Boundary'), 'Changelog must record AMM technical-flow top boundary');
assert(aiMenuManagerImplDoc.includes('GET /api/ai-menu-manager/sessions/{sessionId}'), 'AMM implementation doc must describe the session route fallback');
assert(aiMenuManagerImplDoc.includes('normalizeAiMenuManagerSessionSnapshot()') && aiMenuManagerImplDoc.includes('must not cast `snapshot.data()` directly'), 'AMM implementation doc must preserve the compact-session runtime boundary');
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
const definitionsBlock = (actionTypes.split('const aiMenuManagerActionDefinitions')[1] || '')
  .split('export const AI_MENU_MANAGER_ACTION_DEFINITIONS')[0] || '';
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
assert(features.includes('ENABLE_AI_MENU_MANAGER_VOICE_INPUT: false'), 'AMM voice input must stay off until a verified speech-to-command control exists');
assert(features.includes('ENABLE_AI_MENU_MANAGER_MODEL_ROUTER: true'), 'AMM model router must be enabled for unresolved bounded conversation');
assert(features.includes('ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER: true'), 'AMM cloud planner must be enabled behind deterministic-first routing');
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
assert(modelRouter.includes('result.safety.mutatesTruth !== isPreparedAction'), 'AMM model route safety must correlate mutation state to prepare_action');
assert(modelRouter.includes('result.safety.requiresApproval !== isPreparedAction'), 'AMM model route safety must correlate approval state to prepare_action');
assert(modelRouter.includes('Boolean(result.actionType) !== isPreparedAction'), 'AMM model route safety must correlate action type to prepare_action');

const modelSchemas = read('src/lib/ai-menu-manager/schemas.ts');
assert(modelSchemas.includes('AiMenuManagerPlannerResponseSchema'), 'AMM planner client response must have a runtime schema');
assert(modelSchemas.includes('Model route safety fields do not match its outcome'), 'AMM planner client response schema must correlate prepared-action safety fields');

const plannerRoute = read('src/app/api/ai-menu-manager/plan/route.ts');
assert(plannerRoute.includes('withAuth'), 'AMM planner route must use withAuth');
assert(plannerRoute.includes('PERMISSIONS.MANAGE_MENU'), 'AMM planner route must require menu permission');
assert(plannerRoute.includes("feature: 'AI_OPERATION'"), 'AMM planner route must rate-limit before provider work');
assert(plannerRoute.includes('checkSafeMode()'), 'AMM planner route must check SAFE_MODE before provider work');
assert(plannerRoute.includes('checkAICapacity('), 'AMM planner route must run AI capacity policy before provider work');
assert(plannerRoute.includes('readBoundedJsonBody') && plannerRoute.includes('AI_MENU_MANAGER_PLAN_MAX_BODY_BYTES'), 'AMM planner route must bound request bodies');
assert(plannerRoute.includes('AiMenuManagerPlannerRequestSchema.safeParse'), 'AMM planner route must validate compact context at runtime');
assert(plannerRoute.includes('listAiMenuManagerExecutableActions'), 'AMM planner route must limit prepare outcomes to current executable actions');
assert(plannerRoute.includes('buildAiMenuManagerPlannerActionContracts'), 'AMM planner must send action-specific target and value contracts');
assert(plannerRoute.includes('buildAiMenuManagerPlannerResponseSchema') && plannerRoute.includes('responseSchema:'), 'AMM planner must constrain provider output with a structured response schema');
assert(plannerRoute.includes('untrusted data') && plannerRoute.includes('Do not invent value keys'), 'AMM planner must treat owner/context text as untrusted and bind prepare outcomes to supplied contracts');
assert(plannerRoute.includes('include at least one supporting context target') && plannerRoute.includes("['answer', 'diagnostic', 'recommendation'].includes(result.outcome)"), 'AMM planner read-only outcomes must be grounded to validated selected-menu targets');
assert(plannerRoute.includes('displayName: item.name') && plannerRoute.includes('displayName: category.name') && plannerRoute.includes('displayName: params.context.project.name'), 'AMM planner must canonicalize grounded entity labels from selected MenuList context');
assert(plannerRoute.includes('assertAiMenuManagerModelRouteIsSafe'), 'AMM planner route must enforce model outcome safety');
assert(plannerRoute.includes('finalizeAiOperationAccounting'), 'AMM planner provider use must be recorded through AI accounting');
assert(!plannerRoute.includes('getAiMenuManagerProject('), 'AMM planner route must not re-read project truth already loaded by the client');
assert(!plannerRoute.includes('updateProject') && !plannerRoute.includes('writeFirestore'), 'AMM planner route must not expose or perform truth writes');
assert(plannerRoute.includes("return NextResponse.json({ route: null })"), 'AMM planner failures must fall back without breaking deterministic conversation');

const commandRoute = read('src/app/api/ai-menu-manager/command/route.ts');
assert(commandRoute.includes('withAuth'), 'Command route must use withAuth');
assert(commandRoute.includes('PERMISSIONS.MANAGE_MENU'), 'Command route must require menu permission');
assert(commandRoute.includes('DATA_WRITE'), 'Command route must apply write rate limiting');
assert(commandRoute.includes('readBoundedJsonBody'), 'Command route must use bounded JSON body parsing');
assert(commandRoute.includes('AI_MENU_MANAGER_COMMAND_MAX_BODY_BYTES'), 'Command route must define an explicit request body cap');
assert(!commandRoute.includes('request.json()'), 'Command route must not use raw request.json() parsing');
assert(commandRoute.includes('buildAiMenuManagerInvalidRequestResponse'), 'Command route must use generic validation errors');
assert(commandRoute.includes('getAiMenuManagerProposal(proposalId)'), 'Command route must return existing proposal on idempotent retry');
assert(commandRoute.includes('assertAiMenuManagerCommandProposalIdentity({ existing: existingProposal, expected: proposal })'), 'Command route must verify the complete persisted proposal identity before returning an idempotent retry');
assert(
  commandRoute.includes("'Proposal identity mismatch'")
    && commandRoute.includes("'Invalid proposal data'")
    && commandRoute.includes("{ error: 'Request conflict' }, { status: 409 }"),
  'Command route must return a fixed conflict response for identity collisions and malformed persisted proposal truth',
);
assert(commandRoute.includes('const persistedProposal = await persistAiMenuManagerCommand') || commandRoute.includes('persistedProposal = await persistAiMenuManagerCommand'), 'Command route must receive authoritative proposal truth from the persistence transaction');
assert(commandRoute.includes('cards: [persistedProposal.cardPayload]'), 'Command route must return the persisted card after a concurrent idempotent retry');
assert(commandRoute.includes('buildAiMenuManagerContextBaseHash'), 'Command route must store project base hash');
assert(commandRoute.includes('getStoreFromSession') && commandRoute.includes('needsStoreRead'), 'Command route must use session store context before adding a Firestore store read');
assert(commandRoute.includes('resolveDailySessionId({') && commandRoute.includes("'command-session'"), 'Command fallback must reject non-deterministic session IDs before session persistence');

const apiGuards = read('src/lib/ai-menu-manager/apiGuards.ts');
assert(apiGuards.includes('if (!tId || !sId || !userId)'), 'AMM selected-store scope must fail closed when canonical actor identity is missing or contradictory');
const proposalActionRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts');
assert(proposalActionRoute.includes('const userId = scope.userId;'), 'AMM proposal actions must persist the canonical guarded actor identity');
assert(!proposalActionRoute.includes("|| 'unknown'"), 'AMM proposal actions must not persist an unknown actor fallback');
assert(apiGuards.includes('getBoundedSecurityRouteContext'), 'AMM API guards must use bounded route security context');
assert(apiGuards.includes("getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId)"), 'AMM API guards must bound selected-store violation IDs');
assert(apiGuards.includes('key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`'), 'AMM API guards must use hashed rate-limit key material');
assert(apiGuards.includes("const failClosedOnProviderError = params.feature === 'AI_OPERATION';"), 'AMM provider-backed planning must fail closed when the limiter provider is unavailable');
assert(apiGuards.includes('failClosedOnProviderError,'), 'AMM API guards must forward strict AI-operation limiter policy');
assert(apiGuards.includes("const providerUnavailable = rateLimit.reason === 'provider_unavailable';"), 'AMM API guards must distinguish provider outages from exhausted quotas');
assert(apiGuards.includes('status: providerUnavailable ? 503 : 429'), 'AMM limiter provider outages must return 503 while exhausted quotas remain 429');
assert(!apiGuards.includes('buildSecurityContext'), 'AMM API guards must not spread raw security context into guard security logs');
assert(!apiGuards.includes('key: `${params.keyPrefix}:${userId'), 'AMM API guards must not store raw user IDs in limiter keys');

const routeIds = read('src/lib/ai-menu-manager/routeIds.ts');
assert(routeIds.includes('isValidFirestoreDocumentId'), 'AMM route ID boundary must use the shared Firestore document ID guard');
assert(routeIds.includes('AI_MENU_MANAGER_SESSION_ID_PATTERN = /^amm2_'), 'AMM route ID boundary must admit rule-verifiable v2 session IDs');
assert(routeIds.includes('AI_MENU_MANAGER_LEGACY_SESSION_ID_PATTERN = /^amm_[a-f0-9]{24}$/'), 'AMM route ID boundary must retain legacy session ID compatibility');
assert(routeIds.includes('AI_MENU_MANAGER_PROPOSAL_ID_PATTERN = /^amm_prop_[a-f0-9]{28}$/'), 'AMM route ID boundary must preserve deterministic proposal ID shape');
assert(routeIds.includes('AI_MENU_MANAGER_PROJECT_ID_MAX_LENGTH = 160'), 'AMM route ID boundary must keep selected project IDs bounded');
assert(routeIds.includes('normalizeAiMenuManagerSessionId') && routeIds.includes('normalizeAiMenuManagerProposalId') && routeIds.includes('normalizeAiMenuManagerProjectId'), 'AMM route ID normalizers missing');
assert(routeIds.includes('normalizeAiMenuManagerScopeDocumentId'), 'AMM route ID boundary must expose a tenant/store scope document ID normalizer');
assert(routeIds.includes('documentId !== documentId.trim()'), 'AMM route/session/project IDs must reject whitespace-mutated values');
assert(routeIds.includes('raw !== raw.trim() || !isValidFirestoreDocumentId(raw)'), 'AMM scope document IDs must reject whitespace-mutated or invalid Firestore IDs');
assert(routeIds.includes('Number.isSafeInteger(numericId)') && routeIds.includes('String(numericId) !== raw'), 'AMM scope document IDs must be exact positive MenuList numeric document IDs');

const idempotency = read('src/lib/ai-menu-manager/idempotency.ts');
assert(idempotency.includes('normalizeAiMenuManagerSessionDate') && idempotency.includes("throw new Error('Invalid session scope')"), 'AMM deterministic session IDs must reject impossible dates and malformed tenant/store/project scope');
assert(idempotency.includes("parsed.toISOString().slice(0, 10) === value"), 'AMM canonical session-date normalization must retain exact UTC calendar round-trip validation');
assert(idempotency.includes('normalizeAiMenuManagerScopeDocumentId(params.tId)') && idempotency.includes('normalizeAiMenuManagerProjectId(params.projectId)'), 'AMM deterministic session IDs must reuse canonical scope/project document-ID admission');
assert(idempotency.includes('catch {') && idempotency.includes('return false;'), 'AMM persisted session identity checks must fail closed rather than throw on corrupt stored scope');

const clientDal = read('src/database/aiMenuManager/index.ts');
assert(clientDal.includes("readApiResponse<unknown>(response, 'plan')"), 'AMM planner client must not generic-cast response JSON into a trusted route');
assert(clientDal.includes('isAiMenuManagerPlannerResponse(payload)'), 'AMM planner client must runtime-validate response JSON before use');
assert(clientDal.includes("readApiResponse<unknown>(response, 'command')") && clientDal.includes('normalizeAiMenuManagerCommandResponse(payload'), 'AMM command client must runtime-normalize untrusted server response JSON');
assert(clientDal.includes("readApiResponse<unknown>(response, 'inbox')") && clientDal.includes('normalizeAiMenuManagerInboxResponse(inboxResponse.payload'), 'AMM inbox client must runtime-normalize untrusted server response JSON');
assert(clientDal.includes("readApiResponse<unknown>(response, 'proposal_action')") && clientDal.includes('normalizeAiMenuManagerProposalActionResponse(payload'), 'AMM proposal-action client must runtime-normalize untrusted directive/status JSON');
assert(clientDal.includes("readApiResponse<unknown>(response, 'proposal_complete')") && clientDal.includes('normalizeAiMenuManagerProposalCompleteResponse(payload'), 'AMM proposal-completion client must runtime-normalize untrusted terminal receipt JSON');
assert(!clientDal.includes("readApiResponse<AiMenuManagerCommandResponse>(response, 'command')"), 'AMM command client must not generic-cast response JSON into trusted cards');
assert(!clientDal.includes("readApiResponse<AiMenuManagerInboxResponse & { sessionId: string }>(response, 'inbox')"), 'AMM inbox client must not generic-cast response JSON into trusted session state');
const pendingOperationIntegrity = read('src/lib/ai-menu-manager/pendingOperationIntegrity.ts');
const projectMutationVersion = read('src/lib/menu/projectMutationVersion.ts');
const projectDal = read('src/database/projects/index.ts');
const outletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
const sessionIntegrity = read('src/lib/ai-menu-manager/sessionIntegrity.ts');
const receiptBuilder = read('src/lib/ai-menu-manager/receiptBuilder.ts');
assert(sessionIntegrity.includes('normalizeAiMenuManagerSessionSnapshot'), 'AMM compact sessions must have one runtime normalizer');
assert(sessionIntegrity.includes('isDailySessionIdForScope({'), 'AMM compact-session normalizer must bind top-level identity to exact deterministic scope');
assert(sessionIntegrity.includes('operationCounts.get(operation.operationId) === 1'), 'AMM compact-session normalizer must discard every copy of duplicate operation IDs');
assert(sessionIntegrity.includes('MAX_COUNTER_VALUE = 1_000_000_000'), 'AMM compact-session counters must be finite bounded integers');
assert(sessionIntegrity.includes('AI_MENU_MANAGER_COMPACT_SESSION_MAX_BYTES = 700 * 1024'), 'AMM compact sessions must keep a conservative byte budget below the Firestore document limit');
assert(sessionIntegrity.includes('prepareAiMenuManagerSessionWrite') && sessionIntegrity.includes('next.artifactRefs.pop()') && sessionIntegrity.includes('compactMessages.shift()'), 'AMM size preparation must trim expendable history before rejecting new pending work');
assert(clientDal.includes('normalizeAiMenuManagerSessionSnapshot'), 'AMM client DAL must normalize untrusted compact-session snapshots before use');
assert(!clientDal.includes('sessionSnap.data() as AiMenuManagerSessionDoc'), 'AMM client DAL must not cast Firestore compact sessions directly into trusted runtime truth');
assert(receiptBuilder.includes("boundedText(params.title, 160") && receiptBuilder.includes("boundedText(params.message, 500"), 'AMM receipt persistence must bound owner-visible text centrally');
assert(receiptBuilder.includes('normalizeExecutedAt(params.executedAt)'), 'AMM receipt persistence must canonicalize invalid execution timestamps');
assert(clientDal.includes('canUserAccessStore({ sessionUser, storeId: storeScope.numericId })'), 'AMM client selected-store scope must reuse canonical accessible-store authorization');
assert(clientDal.includes('resolveDailySessionId({') && clientDal.includes('sessionId: params.sessionId'), 'AMM direct client must bind supplied session IDs to tenant/store/project/date scope');
assert(clientDal.includes('resolveDailySessionDateFromId({'), 'AMM direct client must recover the exact scoped date from a remembered v2 session ID');
assert(clientDal.includes('storeIds: session.user.storeIds') && clientDal.includes('stores: session.user.stores'), 'AMM client selected-store authorization must use the normalized session user mapping contract');
assert(!clientDal.includes('session?.storeIds') && !clientDal.includes('session?.stores'), 'AMM client selected-store authorization must not read nonexistent top-level session mapping fields');
const sendCommandBlock = (clientDal.split('export async function sendAiMenuManagerCommand')[1] || '').split('export async function getAiMenuManagerClientInbox')[0] || '';
const completionBlock = (clientDal.split('export async function completeAiMenuManagerClientOperations(params')[1] || '').split('export async function submitAiMenuManagerProposalAction')[0] || '';
assert(sendCommandBlock.includes('sessionSnapshot'), 'AMM command submit must accept the loaded compact session snapshot');
assert(sendCommandBlock.includes('persisted = await runTransaction(firebaseClient, async (transaction) => {'), 'AMM command submit must transactionally merge the compact session');
assert(sendCommandBlock.includes('const sessionSnap = await transaction.get(sessionRef);'), 'AMM command submit must read current compact truth inside the write transaction');
assert(sendCommandBlock.includes('transaction.set(sessionRef, sessionPayload, { merge: true });'), 'AMM command submit must write the compact session in the same transaction');
assert(sendCommandBlock.includes('currentSession && concurrentDuplicates.length > 0'), 'AMM command submit must converge racing duplicate commands on current persisted operations');
assert(sendCommandBlock.includes('replaceOperationId'), 'AMM command submit must replace clarification/follow-up cards in the same compact session write');
assert(clientDal.includes('buildAiMenuManagerFollowUpCommand'), 'AMM client DAL must support short follow-up rewrites from the loaded compact session');
assert(clientDal.includes('buildAiMenuManagerCommandFingerprint') && clientDal.includes('DUPLICATE_COMMAND_WINDOW_MS = 10_000'), 'AMM client DAL must suppress immediate duplicate commands from loaded pending state without another write');
assert(clientDal.includes('commandGroupSize') && clientDal.includes('matchingGroup.length === (newestMatch.commandGroupSize || 1)'), 'AMM duplicate suppression must not reuse a partially cancelled compound group');
assert(clientDal.includes('hashStableValue({ idempotencyKey, sessionId, sourceFingerprint })'), 'AMM repeated deliberate compound commands must receive distinct group ids');
assert(clientDal.includes('resolveAiMenuManagerCompoundCommand'), 'AMM client DAL must support validated compound owner commands');
assert(clientDal.includes('commandGroupId') && clientDal.includes('Prepared ${newOperations.length} updates'), 'AMM compound commands must retain grouped owner-facing card context');
assert(clientDal.includes('buildAiMenuManagerClientBatchExecution') && clientDal.includes('completeAiMenuManagerClientOperations'), 'AMM compound approvals must expose one-save and one-completion-write helpers');
assert(clientDal.includes('assertAiMenuManagerPreparedOperationGroup(params.operations)'), 'AMM grouped approval must reject incomplete or mixed-scope groups before the project save');
assert(pendingOperationIntegrity.includes('commandGroupSize !== operations.length') && pendingOperationIntegrity.includes('String(operation.sId) !== String(first.sId)'), 'AMM grouped project-save admission must require complete same-scope group metadata');
assert(clientDal.includes('compoundCommands') && clientDal.includes('plannerAttempts') && clientDal.includes('plannerAccepted') && clientDal.includes('plannerFallbacks'), 'AMM route quality counters must reuse the compact session write');
assert(clientDal.includes("'answered'"), 'AMM compact session must keep read-only answer cards without proposal docs');
assert(sendCommandBlock.includes('const loadedDuplicates = getRecentDuplicateOperations({') && sendCommandBlock.includes('const currentDuplicates = getRecentDuplicateOperations({'), 'AMM loaded duplicate shortcut must re-confirm the card against current compact truth');
assert(sendCommandBlock.includes('const sessionSnap = await getDoc(sessionRef);'), 'AMM loaded duplicate shortcut must read current compact truth before returning without a write');
assert(sendCommandBlock.indexOf('if (existingSession && loadedDuplicates.length > 0') < sendCommandBlock.indexOf('sendAiMenuManagerPlannerRequest({'), 'AMM loaded duplicate confirmation must run before any planner request');
assert(!sendCommandBlock.includes('await setDoc(sessionRef, sessionPayload'), 'AMM command submit must not overwrite compact state from a stale pre-transaction snapshot');
assert((completionBlock.match(/return runTransaction\(firebaseClient, async \(transaction\) => \{/g) || []).length === 3, 'AMM grouped completion, single completion and cancellation must each mutate current compact truth transactionally');
assert(!completionBlock.includes('await setDoc('), 'AMM completion/cancellation must not overwrite compact state from a stale UI snapshot');
assert(clientDal.includes('session.sessionId !== sessionId') && clientDal.includes('isDailySessionIdForScope({'), 'AMM direct inbox must reject corrupt compact-session identity before hydrating cards');
assert(clientDal.includes('isFirestorePermissionDenied'), 'AMM client DAL must detect compact-session permission failures');
assert(clientDal.includes('sendAiMenuManagerServerBackedCommand'), 'AMM client DAL must fall back to the guarded server route when compact session writes are denied');
assert(clientDal.includes('getAiMenuManagerServerInbox'), 'AMM client inbox must fall back to the guarded server inbox route when compact session reads are denied');
assert(clientDal.includes('if (!session) {') && clientDal.includes('return buildClientInboxFromServer({ inbox, projectId: params.projectId, scope });'), 'AMM client inbox must use bounded server recovery when the current-day compact session does not exist');
assert(clientDal.includes('const directOperations = normalizeOperations(session, params.projectId)') && clientDal.includes('operations: [...directOperations, ...serverOperations]'), 'AMM server inbox hydration must retain direct compact operations while adding server-backed proposal cards');
assert(clientDal.includes('params.cards.map<AiMenuManagerPendingOperation>'), 'AMM server-backed card projection must retain the exact pending-operation contract');
assert(clientDal.includes('proposalApiBacked: true'), 'Only proposal API projections may carry the client-only server-backing marker');
assert(sendCommandBlock.includes('reusableSession?.hasPendingOperations') && sendCommandBlock.includes('reusableSession.sessionDate'), 'AMM commands must continue a recovered unresolved session until its pending work is cleared');
assert(clientDal.includes("executionMode: 'existing_server_api'"), 'Server-backed fallback cards must be represented with the existing_server_api execution mode');
assert(clientDal.includes('const body: AiMenuManagerCommandRequest') && !clientDal.includes('body: JSON.stringify({\n            ...request'), 'AMM server fallback command must send only API fields, not the loaded project JSON');
assert(completionBlock.includes('sessionSnapshot'), 'AMM completion/cancel must accept the loaded compact session snapshot');
assert(completionBlock.includes('getMatchingSessionForOperation'), 'AMM completion/cancel must verify transaction-current compact-session scope before pending or terminal replay handling');
assert(completionBlock.includes('resolveAiMenuManagerTerminalReceiptGroup({') && completionBlock.includes('resolveAiMenuManagerTerminalReceipt({'), 'AMM direct completion and cancellation must replay current terminal receipts after a lost acknowledgement');
assert(completionBlock.includes("expectedStatus: 'cancelled'") && completionBlock.includes("status: 'cancelled'"), 'AMM direct cancellation must persist and replay durable cancelled evidence');
assert(completionBlock.includes('resolveCurrentAiMenuManagerOperationGroup({'), 'AMM grouped completion must resolve canonical persisted operation bodies inside the transaction');
assert(completionBlock.includes('resolveCurrentAiMenuManagerOperation({'), 'AMM single completion must resolve the canonical persisted operation body inside the transaction');
assert(completionBlock.includes("currentOperation.card.kind !== 'manual_task'") && completionBlock.includes("!currentOperation.card.actions.includes('mark_done')"), 'AMM manual completion must revalidate the current persisted card rather than caller-supplied card data');
assert(pendingOperationIntegrity.includes('new Set(operationIds).size !== operationIds.length'), 'AMM grouped completion must reject duplicate requested operation IDs');
assert(pendingOperationIntegrity.includes('fullPendingGroup.length !== currentOperations.length'), 'AMM grouped completion must reject partial current-group completion');
assert(pendingOperationIntegrity.includes('operation.commandGroupSize !== fullPendingGroup.length'), 'AMM grouped completion must fail closed on inconsistent persisted group metadata');
assert(pendingOperationIntegrity.includes('matches.length !== 1') && pendingOperationIntegrity.includes('TERMINAL_RECEIPT_MISMATCH_MESSAGE'), 'AMM terminal replay must reject duplicate or mismatched persisted receipts');
assert(pendingOperationIntegrity.includes('params.pendingOperations?.some((operation)') && pendingOperationIntegrity.includes('operation.operationId === params.requestedOperation.operationId'), 'AMM terminal replay must reject contradictory pending and terminal truth for one operation');
assert(pendingOperationIntegrity.includes('resolved.some((receipt) => receipt === null)'), 'AMM grouped terminal replay must reject partial receipt sets');
assert(completionBlock.includes("params.operation.card.kind !== 'manual_task'") && completionBlock.includes("!params.operation.card.actions.includes('mark_done')"), 'AMM client completion must reject manual_task completion unless the card exposes manual completion');
assert(completionBlock.includes('return runTransaction(firebaseClient, async (transaction) => {'), 'AMM completion/cancel must transactionally merge current compact truth');
assert(completionBlock.includes('const sessionSnap = await transaction.get(sessionRef);'), 'AMM completion/cancel must read the compact session inside the write transaction');
assert(completionBlock.includes('transaction.set(sessionRef') && completionBlock.includes('{ merge: true }'), 'AMM completion/cancel must write the compact session in the same transaction');
assert(!completionBlock.includes('await setDoc(sessionRef'), 'AMM completion/cancel must not overwrite compact truth from a stale loaded snapshot');
assert(clientDal.includes('ensureFirebaseAuthForSession(session)'), 'AMM client DAL must sync Firebase Auth claims before direct session reads/writes');
assert(clientDal.includes('canUserAccessStore({ sessionUser, storeId: storeScope.numericId })'), 'AMM direct client scope must use the shared fail-closed selected-store access guard');
assert(clientDal.includes('storeIds: session.user.storeIds'), 'AMM direct client scope must preserve mapped user store IDs');
assert(clientDal.includes('normalizeAiMenuManagerScopeDocumentId('), 'AMM direct client scope must normalize tenant/store IDs before Firestore use');
assert(!clientDal.includes('allowedStoreIds.size > 0'), 'AMM direct client scope must not admit an unmapped store when the session mapping is empty');
assert(clientDal.includes('pendingOperations'), 'AMM client DAL must store full pending operations in the compact session doc');
assert(clientDal.includes('buildAiMenuManagerContextPacket') && clientDal.includes('resolveAiMenuManagerCommand'), 'AMM deterministic command resolution must run from selected project context in DAL');
assert(sendCommandBlock.includes('let resolverComposerContext = followUp ? undefined : request.composerContext'), 'AMM client command resolution must pass selected composer context ids and avoid stale context on follow-ups');
assert(sendCommandBlock.includes('!draft.resolved') && sendCommandBlock.includes('sendAiMenuManagerPlannerRequest'), 'AMM must call the cloud planner only after deterministic routing is unresolved');
assert(sendCommandBlock.includes('buildAiMenuManagerPlannerContext'), 'AMM cloud fallback must send capped selected-menu context instead of raw project JSON');
assert(sendCommandBlock.includes('materializeAiMenuManagerModelRoute') && sendCommandBlock.includes('isAiMenuManagerModelResolutionCompatible') && sendCommandBlock.includes('doesAiMenuManagerModelRouteMatchResolvedEntities'), 'AMM planned prepares must be rematerialized and reproduced for the same selected entities by the deterministic resolver');
assert(sendCommandBlock.includes('listAiMenuManagerExecutableActions()'), 'AMM planner input must expose only current executable actions');
assert(clientDal.includes('appendCompactReceipt'), 'AMM completion must append the receipt during the existing compact-session write');
assert(clientDal.includes('buildAiMenuManagerClientExecutionDirective'), 'AMM client DAL must build execution directives from stored pending operations');
assert(clientDal.includes('buildAiMenuManagerContextBaseHash(context)'), 'AMM client approvals must check stale selected-project context');
assert(clientDal.includes('assertAiMenuManagerPatchAllowedForAction'), 'AMM client approvals must validate patch shape against registered action type');
const patchPolicy = read('src/lib/ai-menu-manager/patchPolicy.ts');
assert(patchPolicy.includes('TOP_LEVEL_FIELDS_BY_KIND'), 'AMM patch policy must reject undeclared top-level patch fields');
assert(patchPolicy.includes('hasValidTargetIds'), 'AMM patch policy must require canonical unique bounded target IDs');
assert(patchPolicy.includes('itemUpdateTargetsMatch'), 'AMM patch policy must correlate per-item update keys to declared targets');
assert(projectMutationVersion.includes('projectMutationVersionMillis') && projectMutationVersion.includes('projectMutationVersionIso'), 'AMM project versions must normalize browser and Admin timestamp shapes through one boundary');
assert(read('src/lib/ai-menu-manager/contextPacket.ts').includes('projectMutationVersionIso('), 'AMM context hashes must use one canonical project mutation version');
assert(read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx').includes('expectedModifiedOn: batch.directives[0].baseProjectUpdatedAt') && read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx').includes('expectedModifiedOn: directive.baseProjectUpdatedAt'), 'Desktop AMM grouped and single approvals must pass the prepared project version into the save transaction');
assert(read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx').includes('expectedModifiedOn: batch.directives[0].baseProjectUpdatedAt') && read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx').includes('expectedModifiedOn: directive.baseProjectUpdatedAt'), 'Mobile AMM grouped and single approvals must pass the prepared project version into the save transaction');
assert(projectDal.includes('expectedModifiedOn?: number | string') && projectDal.includes('projectDocumentMutationVersionMillis(freshProject'), 'The shared project transaction must enforce the optional AMM version precondition against fresh project truth');
assert(projectDal.includes('expectedModifiedOnMillis') && outletSaveRoute.includes('standardData.expectedModifiedOnMillis'), 'Linked-outlet AMM saves must enforce the same project-version precondition inside the guarded server transaction');
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

assert(!idempotency.includes("from 'crypto'") && !idempotency.includes('require('), 'AMM idempotency/hash helper must stay browser-safe for DAL-first resolver use');
assert(idempotency.includes('export function normalizeAiMenuManagerSessionDate') && idempotency.includes("parsed.toISOString().slice(0, 10) === value"), 'AMM canonical session-date normalizer must reject impossible calendar dates');

const firestoreSanitize = read('src/lib/ai-menu-manager/firestoreSanitize.ts');
const sharedFirestoreSanitize = read('src/lib/firestore/sanitizeForFirestore.ts');
assert(firestoreSanitize.includes("import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';"), 'AMM Firestore sanitizer must delegate to the shared sanitizer');
assert(firestoreSanitize.includes("sanitizeForFirestore(value, { undefinedObjectValue: 'omit' })"), 'AMM Firestore sanitizer must omit undefined object fields through the shared sanitizer');
assert(sharedFirestoreSanitize.includes('Object.getPrototypeOf(value)'), 'Shared Firestore sanitizer must preserve Timestamp and FieldValue prototype objects');
assert(!firestoreSanitize.includes('JSON.stringify'), 'AMM Firestore sanitizer must not JSON-round-trip Firestore sentinel values');
assert(!sharedFirestoreSanitize.includes('JSON.stringify'), 'Shared Firestore sanitizer must not JSON-round-trip Firestore sentinel values');

const actionRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts');
const actionServerRepo = read('src/database/aiMenuManager/server.ts');
assert(actionRoute.includes('readBoundedJsonBody'), 'Proposal action route must use bounded JSON body parsing');
assert(actionRoute.includes('AI_MENU_MANAGER_PROPOSAL_ACTION_MAX_BODY_BYTES'), 'Proposal action route must define an explicit request body cap');
assert(!actionRoute.includes('request.json()'), 'Proposal action route must not use raw request.json() parsing');
assert(actionRoute.includes('normalizeAiMenuManagerProposalId(params?.proposalId)'), 'Proposal action route must normalize route proposal ID before reads');
assert(actionRoute.indexOf('normalizeAiMenuManagerProposalId(params?.proposalId)') < actionRoute.indexOf('getAiMenuManagerProposal(proposalId)'), 'Proposal action route must reject malformed proposal IDs before Firestore proposal reads');
assert(actionRoute.includes('ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES'), 'Proposal approval must be guarded by confirmed-write flag');
assert(actionRoute.includes('client_project_mutation'), 'Proposal approval must restrict executable client project mutations');
assert(actionRoute.includes('parsed.data.projectId') && actionRoute.includes('parsed.data.actionType'), 'Proposal approval must verify selected project/action scope');
assert(actionServerRepo.includes('buildAiMenuManagerContextBaseHash(currentContext) !== proposal.baseProjectHash'), 'Proposal approval must reject stale project cards inside the authoritative transaction');
assert(actionServerRepo.includes('getAiMenuManagerProjectInTransaction(transaction'), 'Proposal approval stale checks must read project truth inside the locking transaction');
assert(!actionRoute.includes('getAiMenuManagerProject({'), 'Proposal action route must not duplicate the authoritative transaction project read');
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
assert(projectPatches.includes('normalizeAiMenuManagerProjectSnapshot'), 'Project patch application and verification must normalize direct client project truth');
assert(projectPatches.includes('expectedProjectId?: string'), 'Project already-applied verification must accept authoritative operation identity');
assert(projectPatches.includes("patch.kind === 'category_update'"), 'Category project patch support missing');
assert(projectPatches.includes("patch.kind === 'attribute_update'"), 'Attribute project patch support missing');
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
const compoundCommand = read('src/lib/ai-menu-manager/compoundCommand.ts');
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
assert(commandResolver.includes('mentionsRestore') && commandResolver.includes('is both hidden and sold out'), 'Restore must clarify when item availability and visibility are both off');
assert(compoundCommand.includes('MAX_COMPOUND_OPERATIONS = 4'), 'AMM compound commands must remain bounded');
assert(compoundCommand.includes('aiMenuManagerPatchesConflict'), 'AMM compound commands must reject overlapping project fields');
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
const { resolveAiMenuManagerCompoundCommand } = require(path.join(root, 'src/lib/ai-menu-manager/compoundCommand'));
const { buildAiMenuManagerModelRouteCard } = require(path.join(root, 'src/lib/ai-menu-manager/modelRouter/modelRouteCard'));
const {
  AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE,
  AI_MENU_MANAGER_ACTION_DEFINITIONS,
  AI_MENU_MANAGER_EXECUTABLE_ACTIONS,
} = require(path.join(root, 'src/lib/ai-menu-manager/actionTypes'));
const {
  listAiMenuManagerActionDefinitions,
  listAiMenuManagerExecutableActions,
} = require(path.join(root, 'src/lib/ai-menu-manager/actionRegistry'));
assert(Object.isFrozen(AI_MENU_MANAGER_ACTION_DEFINITIONS), 'AMM action definitions must be immutable at runtime');
assert(Object.isFrozen(AI_MENU_MANAGER_EXECUTABLE_ACTIONS), 'AMM executable action list must be immutable at runtime');
assert(Object.isFrozen(AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE), 'AMM action registry must be immutable at runtime');
assert(
  AI_MENU_MANAGER_ACTION_DEFINITIONS.every((definition) => (
    Object.isFrozen(definition)
    && Object.isFrozen(definition.sourceEvidence)
    && (!definition.requiredFlags || Object.isFrozen(definition.requiredFlags))
    && AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE[definition.actionType] === definition
  )),
  'AMM action definitions must be deeply immutable and map one-to-one into the registry',
);
assert(
  Object.keys(AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE).length === AI_MENU_MANAGER_ACTION_DEFINITIONS.length,
  'AMM action registry must contain exactly one entry per definition',
);
assert(
  listAiMenuManagerActionDefinitions() !== AI_MENU_MANAGER_ACTION_DEFINITIONS
    && listAiMenuManagerExecutableActions() !== AI_MENU_MANAGER_EXECUTABLE_ACTIONS,
  'AMM registry list accessors must return defensive copies',
);
const {
  buildAiMenuManagerPlannerActionContracts,
  buildAiMenuManagerPlannerResponseSchema,
  listAiMenuManagerPlannerContractActionTypes,
} = require(path.join(root, 'src/lib/ai-menu-manager/modelRouter/plannerActionContracts'));
const {
  isAiMenuManagerCloudOwnerCopySafe,
  isAiMenuManagerCloudPlannerOutcomeAllowed,
  resolveAiMenuManagerClarificationEntityType,
} = require(path.join(root, 'src/lib/ai-menu-manager/modelRouter/providerResultPolicy'));
const executableActionTypes = [...AI_MENU_MANAGER_EXECUTABLE_ACTIONS].sort();
const plannerContractActionTypes = listAiMenuManagerPlannerContractActionTypes().sort();
assert(
  JSON.stringify(plannerContractActionTypes) === JSON.stringify(executableActionTypes),
  'AMM planner contracts must cover exactly the current executable action list',
);
const plannerActionContracts = buildAiMenuManagerPlannerActionContracts(AI_MENU_MANAGER_EXECUTABLE_ACTIONS);
assert(plannerActionContracts.every((contract) => contract.target && contract.values.length), 'Every executable AMM planner action must declare target and value guidance');
const plannerResponseSchema = buildAiMenuManagerPlannerResponseSchema(AI_MENU_MANAGER_EXECUTABLE_ACTIONS);
assert(plannerResponseSchema.properties?.actionType?.enum?.length === AI_MENU_MANAGER_EXECUTABLE_ACTIONS.length, 'AMM structured response schema must admit only current executable action types');
assert(!plannerResponseSchema.properties?.outcome?.enum?.includes('receipt_status'), 'Cloud planner must not originate receipt/status outcomes without authoritative receipt context');
assert(isAiMenuManagerCloudPlannerOutcomeAllowed('clarification'), 'Cloud planner must allow bounded clarification');
assert(!isAiMenuManagerCloudPlannerOutcomeAllowed('receipt_status'), 'Cloud planner must reject unverified receipt/status outcomes');
assert(isAiMenuManagerCloudOwnerCopySafe('I found two matching sandwich items.'), 'Cloud planner must allow calm owner-facing copy');
assert(!isAiMenuManagerCloudOwnerCopySafe('Done. MenuList updated the item.'), 'Cloud planner must reject unverified completion claims');
assert(!isAiMenuManagerCloudOwnerCopySafe('The patch_hash is ready.'), 'Cloud planner must reject internal implementation language');
assert(resolveAiMenuManagerClarificationEntityType({
  categoryIds: new Set(['cat-drinks']),
  entityId: 'item-tea',
  itemIds: new Set(['item-tea']),
}) === 'item', 'Cloud clarification must preserve validated structured item scope');
assert(resolveAiMenuManagerClarificationEntityType({
  categoryIds: new Set(['cat-drinks']),
  entityId: 'invented-item',
  itemIds: new Set(['item-tea']),
}) === null, 'Cloud clarification must reject fabricated entity IDs');
const resolverFixtureContext = {
  projectId: 'project-1',
  defaultLanguage: 'en',
  projectName: 'Bar Menu',
  storeName: 'Grill Zilla',
  publicLinks: {
    customerAppInstallUrl: 'https://grillzilla.menulist.online/?pwa=install',
    digitalScreenHighlightsUrl: 'https://grillzilla.menulist.online/screen/screen-token?mode=highlights',
    digitalScreenUrl: 'https://grillzilla.menulist.online/screen/screen-token',
    menuUrl: 'https://grillzilla.menulist.online/bar-menu',
    officialPageUrl: 'https://grillzilla.menulist.online',
    tenantBaseUrl: 'https://grillzilla.menulist.online',
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
const textPriceContext = {
  ...resolverFixtureContext,
  items: [
    ...resolverFixtureContext.items,
    { id: 'item-market', name: 'Market platter', aliases: ['market platter'], categoryId: 'cat-drinks', categoryName: 'Drinks', fileUid: 'f1', price: 'Market Price', available: true, active: true, hasImage: true, hasDescription: true, hasDisplayPrice: true, isBestSeller: false, duration: 10 },
    { id: 'item-range', name: 'Range platter', aliases: ['range platter'], categoryId: 'cat-drinks', categoryName: 'Drinks', fileUid: 'f1', price: '199-249', available: true, active: true, hasImage: true, hasDescription: true, hasDisplayPrice: true, isBestSeller: false, duration: 10 },
  ],
};
const textPriceBulkResult = resolveAiMenuManagerCommand({
  text: 'increase all drinks by 10',
  tId: 1,
  sId: 2,
  projectId: textPriceContext.projectId,
  context: textPriceContext,
  cardId: 'text-price-bulk',
  createdAt: new Date().toISOString(),
});
assert(
  textPriceBulkResult.resolved?.patch?.itemIds?.includes('item-tea')
    && !textPriceBulkResult.resolved?.patch?.itemIds?.includes('item-market')
    && !textPriceBulkResult.resolved?.patch?.itemIds?.includes('item-range'),
  'AMM relative price arithmetic must preserve text/range prices and update only single numeric prices',
);
const textPriceRelativeResult = resolveAiMenuManagerCommand({
  text: 'increase price by 10',
  tId: 1,
  sId: 2,
  projectId: textPriceContext.projectId,
  context: textPriceContext,
  composerContext: { target: 'item', selectedEntityIds: ['item-market'] },
  cardId: 'text-price-relative',
  createdAt: new Date().toISOString(),
});
assert(
  !textPriceRelativeResult.resolved?.patch,
  'AMM relative price arithmetic must not replace a selected text price',
);
const textPriceExactResult = resolveAiMenuManagerCommand({
  text: '250',
  tId: 1,
  sId: 2,
  projectId: textPriceContext.projectId,
  context: textPriceContext,
  composerContext: { target: 'item', selectedEntityIds: ['item-market'] },
  cardId: 'text-price-exact',
  createdAt: new Date().toISOString(),
});
assert(
  textPriceExactResult.resolved?.patch?.updates?.price === '250',
  'AMM explicit fixed-price action may replace a selected text price after approval',
);
const compoundCommandParams = {
  tId: 1,
  sId: 2,
  projectId: resolverFixtureContext.projectId,
  context: resolverFixtureContext,
  createdAt: new Date().toISOString(),
};
const compoundPriceAvailability = resolveAiMenuManagerCompoundCommand({
  ...compoundCommandParams,
  text: 'Masala Tea 20 and Cold coffee sold out',
});
assert(compoundPriceAvailability?.length === 2, 'AMM compound resolver must prepare two independent owner changes');
assert(
  compoundPriceAvailability.map((part) => part.resolved.actionType).join(',') === 'item_price_update,item_availability_update',
  'AMM compound resolver must preserve each registered action type in owner order',
);
assert(resolveAiMenuManagerCompoundCommand({
  ...compoundCommandParams,
  text: 'Masala Tea 20 and Masala Tea 25',
}) === null, 'AMM compound resolver must reject conflicting patches to the same field');
const itemNameWithConnectorContext = {
  ...resolverFixtureContext,
  items: [
    ...resolverFixtureContext.items,
    { id: 'item-fish-chips', name: 'Fish and chips', aliases: ['fish and chips'], categoryId: 'cat-starters', categoryName: 'Starters', fileUid: 'f1', price: '220', available: true, active: true, hasImage: true, hasDescription: true, isBestSeller: false, duration: 12 },
  ],
};
const connectorNameCompound = resolveAiMenuManagerCompoundCommand({
  ...compoundCommandParams,
  context: itemNameWithConnectorContext,
  text: 'Fish and chips 250 and Masala Tea 20',
});
assert(connectorNameCompound?.length === 2, 'AMM compound splitting must preserve valid item names containing "and"');

function resolveRestoreForItem(itemOverrides) {
  return resolveAiMenuManagerCommand({
    text: 'Restore Cold coffee',
    tId: 1,
    sId: 2,
    projectId: resolverFixtureContext.projectId,
    context: {
      ...resolverFixtureContext,
      items: resolverFixtureContext.items.map((item) => item.id === 'item-coffee'
        ? { ...item, ...itemOverrides }
        : item),
    },
    cardId: `restore-${String(itemOverrides.available)}-${String(itemOverrides.active)}`,
    createdAt: new Date().toISOString(),
  });
}
assert(resolveRestoreForItem({ available: false, active: true }).resolved?.actionType === 'item_availability_update', 'Restore must make a sold-out visible item available');
assert(resolveRestoreForItem({ available: true, active: false }).resolved?.actionType === 'item_visibility_update', 'Restore must show an available hidden item');
assert(resolveRestoreForItem({ available: false, active: false }).card.kind === 'clarification', 'Restore must ask which state to change when an item is hidden and sold out');

const groundedModelAnswerCard = buildAiMenuManagerModelRouteCard({
  cardId: 'grounded-answer-card',
  createdAt: new Date().toISOString(),
  result: {
    outcome: 'diagnostic',
    ownerReply: 'Cold coffee is currently available.',
    provider: 'cloud_planner',
    safety: { mutatesTruth: false, requiresApproval: false, reason: 'Read-only selected-menu answer' },
    targets: [{ entityType: 'item', entityId: 'item-coffee', displayName: 'Cold coffee' }],
  },
  scope: { type: 'project', tId: 1, sId: 2, projectId: 'project-1', label: 'Grill Zilla / Bar Menu' },
});
assert(groundedModelAnswerCard?.entityRefs?.[0]?.id === 'item-coffee', 'Cloud-planned answer cards must retain validated grounding entity refs');
assert(groundedModelAnswerCard?.beforeAfterSummary?.rows?.[0]?.after === 'Cold coffee', 'Cloud-planned answer cards must show owner-visible grounding labels');
const {
  buildAiMenuManagerPlannerContext,
  doesAiMenuManagerModelRouteMatchResolvedEntities,
  isAiMenuManagerModelResolutionCompatible,
  materializeAiMenuManagerModelRoute,
} = require(path.join(root, 'src/lib/ai-menu-manager/modelRouter/plannerContext'));
const plannerContextFixture = buildAiMenuManagerPlannerContext({
  context: resolverFixtureContext,
  ownerMessage: 'chai ka rate bees kar do',
  pendingOperations: [],
});
assert(plannerContextFixture.items.length <= 32 && plannerContextFixture.categories.length <= 18, 'AMM planner context must stay capped');
assert(!('files' in plannerContextFixture) && !('projectData' in plannerContextFixture), 'AMM planner context must not contain raw project JSON');
const unicodePlannerContext = buildAiMenuManagerPlannerContext({
  context: {
    ...resolverFixtureContext,
    items: [
      ...resolverFixtureContext.items,
      { id: 'item-native-tea', name: 'चाय', aliases: ['चाय'], categoryId: 'cat-drinks', categoryName: 'Drinks', fileUid: 'f1', price: '20', available: true, active: true, hasImage: false, hasDescription: true },
    ],
  },
  ownerMessage: 'चाय का दाम बदलो',
  pendingOperations: [],
});
assert(unicodePlannerContext.items[0]?.id === 'item-native-tea', 'AMM planner relevance ranking must preserve native-language item names');
assert(unicodePlannerContext.items[0]?.aliases.includes('चाय'), 'AMM planner packet must preserve bounded native-language aliases');
const plannedPriceCommand = materializeAiMenuManagerModelRoute({
  context: resolverFixtureContext,
  result: {
    actionType: 'item_price_update',
    outcome: 'prepare_action',
    ownerReply: 'I found Masala Tea and can prepare the price change.',
    provider: 'cloud_planner',
    safety: { mutatesTruth: true, requiresApproval: true, reason: 'Prepared action only' },
    targets: [{ entityType: 'item', entityId: 'item-tea', displayName: 'Masala Tea' }],
    values: { newPrice: 20 },
  },
});
assert(plannedPriceCommand?.text === 'Set price to 20', 'AMM planner must materialize item price intent into a deterministic owner command');
assert(plannedPriceCommand?.composerContext?.selectedEntityIds?.[0] === 'item-tea', 'AMM planner must preserve the selected item id during deterministic re-resolution');
const plannedPriceResolution = resolveAiMenuManagerCommand({
  text: plannedPriceCommand.text,
  tId: 1,
  sId: 2,
  projectId: resolverFixtureContext.projectId,
  context: resolverFixtureContext,
  composerContext: plannedPriceCommand.composerContext,
  cardId: 'planner-price-card',
  createdAt: new Date().toISOString(),
});
assert(plannedPriceResolution.resolved?.actionType === 'item_price_update', 'AMM planned price intent must be reproduced by the deterministic resolver');
assert(isAiMenuManagerModelResolutionCompatible('item_price_update', plannedPriceResolution.resolved.actionType), 'AMM planned action compatibility must accept the reproduced action');
assert(doesAiMenuManagerModelRouteMatchResolvedEntities({
  result: {
    actionType: 'item_price_update',
    outcome: 'prepare_action',
    ownerReply: 'Prepare the price update.',
    provider: 'cloud_planner',
    safety: { mutatesTruth: true, requiresApproval: true, reason: 'Prepared action only' },
    targets: [{ entityType: 'item', entityId: 'item-tea' }],
  },
  resolvedEntityRefs: plannedPriceResolution.resolved.entityRefs,
}), 'AMM planned action must resolve back to the same selected entity id');
const invalidPlannedTarget = materializeAiMenuManagerModelRoute({
  context: resolverFixtureContext,
  result: {
    actionType: 'item_price_update',
    outcome: 'prepare_action',
    ownerReply: 'Prepare price update.',
    provider: 'cloud_planner',
    safety: { mutatesTruth: true, requiresApproval: true, reason: 'Prepared action only' },
    targets: [{ entityType: 'item', entityId: 'missing-item' }],
    values: { newPrice: 20 },
  },
});
assert(invalidPlannedTarget === null, 'AMM planner must reject targets outside the compact selected-menu context');
const emptyNumericPlannerValue = materializeAiMenuManagerModelRoute({
  context: resolverFixtureContext,
  result: {
    actionType: 'item_price_update',
    outcome: 'prepare_action',
    ownerReply: 'Prepare price update.',
    provider: 'cloud_planner',
    safety: { mutatesTruth: true, requiresApproval: true, reason: 'Prepared action only' },
    targets: [{ entityType: 'item', entityId: 'item-tea' }],
    values: { newPrice: '' },
  },
});
assert(emptyNumericPlannerValue === null, 'AMM planner must not coerce an empty numeric value to zero');
const { buildAiMenuManagerTimeline } = require(path.join(root, 'src/lib/ai-menu-manager/presentation'));
const activeAnswerMessage = 'Start with Cold Coffee. It is still unavailable.';
const activeAnswerTimeline = buildAiMenuManagerTimeline({
  activeCards: [{ title: 'Suggested next step', message: activeAnswerMessage }],
  compactMessages: [{
    createdAt: new Date().toISOString(),
    kind: 'reply',
    messageId: 'answer-manager',
    role: 'menu_manager',
    text: activeAnswerMessage,
  }],
  receipts: [],
});
assert(activeAnswerTimeline.length === 0, 'AMM timeline must not repeat an active answer, clarification, or unsupported card message');
const dismissedAnswerTimeline = buildAiMenuManagerTimeline({
  activeCards: [],
  compactMessages: [{
    createdAt: new Date().toISOString(),
    kind: 'reply',
    messageId: 'answer-manager',
    role: 'menu_manager',
    text: activeAnswerMessage,
  }],
  receipts: [],
});
assert(dismissedAnswerTimeline.length === 1, 'AMM timeline must preserve a dismissed card message as conversation history');
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
  ['Set special hours for a date', 'store_working_hours_update', 'manual_task'],
  ['Update holiday hours', 'store_working_hours_update', 'manual_task'],
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
const selectedItemResolverFixtures = [
  ['Rename to Kadak Tea', 'item_name_update'],
  ['Description: Strong tea with fresh spices', 'item_description_update'],
  ['Move to Starters', 'item_category_update'],
  ['Mark bestseller', 'item_bestseller_update'],
  ['Set prep time to 12 minutes', 'item_prep_time_update'],
  ['Feature this item', 'decision_blocks_update'],
];
for (const [text, expectedActionType] of selectedItemResolverFixtures) {
  const result = resolveAiMenuManagerCommand({
    text,
    tId: 't1',
    sId: 's1',
    projectId: 'project-1',
    context: resolverFixtureContext,
    composerContext: { target: 'item', selectedEntityIds: ['item-tea'] },
    cardId: `selected-item-${expectedActionType}`,
    createdAt: '2026-07-10T00:00:00.000Z',
  });
  assert(
    result.card.actionType === expectedActionType && result.card.kind === 'proposal',
    `Selected-item resolver fixture failed for "${text}": expected ${expectedActionType}/proposal, got ${result.card.actionType}/${result.card.kind}`,
  );
  assert(
    result.card.entityRefs.some((entry) => entry.kind === 'menu_item' && entry.id === 'item-tea'),
    `Selected-item resolver fixture must preserve the structured item id for "${text}"`,
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
    && ambiguousSandwichResult.card.suggestedReplies?.some((reply) => (
      reply.prompt === 'Veg Sandwich 80'
      && reply.composerContext?.target === 'item'
      && reply.composerContext?.selectedEntityIds?.[0] === 'item-veg-sandwich'
    ))
    && ambiguousSandwichResult.card.suggestedReplies?.some((reply) => (
      reply.prompt === 'Cheese Sandwich 80'
      && reply.composerContext?.target === 'item'
      && reply.composerContext?.selectedEntityIds?.[0] === 'item-cheese-sandwich'
    )),
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
assert(schemas.includes('sessionDate: sessionDateSchema.optional()'), 'AMM command schema must accept only a validated session date when continuing recovered pending work');
assert(schemas.includes('normalizeAiMenuManagerProjectId(value) === value'), 'AMM schemas must reject path-shaped selected project IDs');
assert(schemas.includes('normalizeAiMenuManagerSessionId(value) === value'), 'AMM schemas must reject malformed session IDs');
assert(schemas.includes('const sessionDateSchema') && schemas.includes('normalizeAiMenuManagerSessionDate(value) === value'), 'AMM inbox session dates must reuse the direct-ID calendar validator before Firestore reads');
assert(schemas.includes('commandContextTargetSchema') && schemas.includes('selectedEntityIds'), 'AMM command schema must validate composer context selection');
assert(schemas.includes('replaceOperationId: idSchema.optional()'), 'AMM server command schema must support replacing clarification/follow-up cards');
const completeSchemaBlock = (schemas.split('export const AiMenuManagerProposalCompleteSchema')[1] || '').split('const plannerItemSchema')[0] || '';
assert(completeSchemaBlock.includes('projectId: projectIdSchema,') && completeSchemaBlock.includes('actionType: actionTypeSchema,'), 'AMM completion must require exact selected project and registered action context');
assert(!completeSchemaBlock.includes('projectId: projectIdSchema.optional()') && !completeSchemaBlock.includes('actionType: actionTypeSchema.optional()'), 'AMM completion must not accept omitted project/action scope');

const completeRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts');
assert(completeRoute.includes('readBoundedJsonBody'), 'Completion route must use bounded JSON body parsing');
assert(completeRoute.includes('AI_MENU_MANAGER_PROPOSAL_COMPLETE_MAX_BODY_BYTES'), 'Completion route must define an explicit request body cap');
assert(!completeRoute.includes('request.json()'), 'Completion route must not use raw request.json() parsing');
assert(completeRoute.includes('normalizeAiMenuManagerProposalId(params?.proposalId)'), 'Completion route must normalize route proposal ID before reads');
assert(completeRoute.indexOf('normalizeAiMenuManagerProposalId(params?.proposalId)') < completeRoute.indexOf('getAiMenuManagerProposal(proposalId)'), 'Completion route must reject malformed proposal IDs before Firestore proposal reads');
assert(completeRoute.includes('parsed.data.projectId') && completeRoute.includes('parsed.data.actionType'), 'Completion route must verify selected project/action scope');
assert(!completeRoute.includes("error?.message || 'Completion failed'"), 'Completion route must not echo internal error messages');
assert(completeRoute.includes('ai_menu_manager_proposal_completion_failed'), 'Completion route must log failures with a stable bounded diagnostic');
assert(completeRoute.includes('getBoundedRuntimeStringContext'), 'Completion route must bound proposal completion diagnostic context');
assert(!completeRoute.includes('catch {'), 'Completion route must not silently swallow completion failures');

const sessionRoute = read('src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts');
assert(sessionRoute.includes('normalizeAiMenuManagerSessionId(params?.sessionId)'), 'Session route must normalize route session ID before reads');
assert(sessionRoute.includes("normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))"), 'Session route must normalize selected project ID before reads');
assert(sessionRoute.indexOf('normalizeAiMenuManagerSessionId(params?.sessionId)') < sessionRoute.indexOf('getAiMenuManagerInbox({'), 'Session route must reject malformed session IDs before Firestore inbox reads');
assert(sessionRoute.indexOf("normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'))") < sessionRoute.indexOf('getAiMenuManagerInbox({'), 'Session route must reject malformed selected project IDs before Firestore inbox reads');
const inboxRoute = read('src/app/api/ai-menu-manager/inbox/route.ts');
for (const [routeSource, routeLabel] of [[inboxRoute, 'Inbox route'], [sessionRoute, 'Session route']]) {
  assert(routeSource.includes('serializeAiMenuManagerInboxForJson'), `${routeLabel} must use the shared typed inbox JSON boundary`);
  assert(!routeSource.includes('function serializeForJson'), `${routeLabel} must not retain the duplicate untyped recursive serializer`);
}
assert(inboxRoute.includes('serializeAiMenuManagerInboxForJson(inbox)'), 'Inbox route must preserve the authoritative recovered-session ID');
assert(!inboxRoute.includes('...inbox,\n        sessionId,'), 'Inbox route must not pair prior-day recovered work with the requested current-day session ID');
assert(sessionRoute.includes('recoverPending: false'), 'Explicit session lookup must not substitute a different pending session');
assert(sessionRoute.includes('serializeAiMenuManagerInboxForJson(inbox)'), 'Explicit session lookup must preserve the repository result without rewriting identity');
assert(!sessionRoute.includes('...inbox,\n        sessionId,'), 'Explicit session lookup must not overwrite repository identity');

const ownerRoute = read('src/app/(main)/menu-manager/page.tsx');
assert(ownerRoute.includes('AiMenuManagerRoute'), 'AMM owner route must be mounted at /menu-manager');
assert(
  !fs.existsSync(path.join(root, 'src/app/(main)/ai-menu-manager/page.tsx')),
  'Owner AMM route must not be mounted at /ai-menu-manager because it conflicts with the public website feature page; use /menu-manager instead',
);
const legacyOwnerRoute = read('src/app/(main)/use-menulist/ai-menu-manager/page.tsx');
assert(legacyOwnerRoute.includes("redirect('/menu-manager')"), 'Legacy /use-menulist/ai-menu-manager route must redirect to independent /menu-manager route');

const serverRepo = read('src/database/aiMenuManager/server.ts');
assert(serverRepo.includes('normalizeAiMenuManagerSessionSnapshot'), 'AMM Admin DAL must normalize compact-session snapshots before use');
assert(serverRepo.includes("throw new Error('Invalid session data')"), 'AMM Admin mutation transactions must fail closed on malformed existing compact truth');
assert(!serverRepo.includes('sessionSnap.data() as AiMenuManagerSessionDoc'), 'AMM Admin DAL must not cast Firestore compact sessions directly into trusted runtime truth');
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
assert(serverRepo.includes('isDailySessionIdForScope({') && serverRepo.includes("throw new Error('Session identity mismatch')"), 'AMM server persistence/inbox must bind compact session IDs to exact scope and date');
assert(serverRepo.includes('assertAiMenuManagerSessionIdentity({'), 'AMM server persistence must reject mismatched pre-existing compact session identity before merging state');
assert(serverRepo.includes('requireProposalRef(params.proposal.proposalId)'), 'AMM command persistence must fail closed before invalid proposal document refs');
assert(serverRepo.includes('.map((entry) => normalizeAiMenuManagerProposalId(entry.proposalId))'), 'AMM inbox hydration must filter stored proposal summary IDs before proposal refs');
assert(serverRepo.includes('Array.from(new Set((session.pendingCardSummaries || [])'), 'AMM inbox hydration must deduplicate stored proposal refs before billed reads');
assert(serverRepo.includes('proposal.sessionId === session.sessionId'), 'AMM inbox hydration must reject proposal refs from another session, including after cross-day recovery');
assert(serverRepo.includes('String(proposal.tId) === scope.tId') && serverRepo.includes('String(proposal.sId) === scope.sId'), 'AMM inbox hydration must reject proposal refs from another tenant/store');
assert(serverRepo.includes('String(proposal.cardPayload?.scope?.projectId) === projectId'), 'AMM inbox hydration must verify card payload project scope before returning it');
assert(serverRepo.includes('const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;'), 'AMM proposal mutation paths must skip invalid stored session refs');
assert(!serverRepo.includes('.doc(sessionId)'), 'AMM server DAL must not directly pass sessionId into Firestore doc refs');
assert(!serverRepo.includes('.doc(proposalId)'), 'AMM server DAL must not directly pass proposalId into Firestore doc refs');
assert(!serverRepo.includes('.doc(params.projectId)'), 'AMM server DAL must not directly pass params.projectId into Firestore doc refs');
assert(!serverRepo.includes('collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)'), 'AMM server DAL must not build scoped project paths from raw tenant/store params');
assert(serverRepo.includes('if (proposalSnap.exists) {') && serverRepo.includes('assertAiMenuManagerCommandProposalIdentity({'), 'Command persistence must verify exact proposal identity before treating an existing proposal as an idempotent retry');
assert(serverRepo.includes('return existingProposal;'), 'Command persistence must return authoritative existing proposal truth from a concurrent retry');
assert(serverRepo.includes('return params.proposal;'), 'Command persistence must return the newly persisted proposal from the transaction');
assert(!serverRepo.includes('if (proposalSnap.exists) return;'), 'Command persistence must not silently accept an arbitrary existing deterministic proposal ID');
assert(serverRepo.includes('params.replaceOperationId') && serverRepo.includes('entry.proposalId !== params.replaceOperationId'), 'Server-backed command persistence must replace clarification/follow-up cards');
assert(serverRepo.includes('Execution directive expired'), 'Execution directives must expire');
assert(serverRepo.includes('projectContainsAiMenuManagerPatch'), 'Completion must verify the existing project mutation landed');
assert(serverRepo.includes('proposal.executionDirective.executionId !== params.executionId'), 'Completion must verify the current persisted execution directive inside the transaction');
assert(serverRepo.includes('return firestoreAdmin.runTransaction(async (transaction) => {'), 'Server-backed completion must return the authoritative transaction result');
assert(serverRepo.includes("proposal.receipt && ['executed', 'failed', 'manual_task'].includes(proposal.status)"), 'Completion retries must return the persisted terminal receipt');
assert(serverRepo.includes('String(session.projectId) !== String(params.projectId)'), 'Inbox reads must reject sessions from a different selected project');
assert(serverRepo.includes(".where('hasPendingOperations', '==', true)") && serverRepo.includes(".orderBy('updatedAt', 'desc')") && serverRepo.includes('.limit(1)'), 'AMM inbox recovery must use one bounded latest-pending query');
assert(serverRepo.includes("['9', 'failed-precondition', 'firestore/failed-precondition'].includes(code)") && serverRepo.includes('AI Menu Manager pending recovery index is not ready'), 'AMM inbox must preserve existing behavior while a newly deployed compound index is still building');
assert(serverRepo.includes('sessionId: session.sessionId,') && serverRepo.includes('sessionDate: session.sessionDate,'), 'AMM recovered-session identity must be validated against the recovered session, not the requested current-day ID');
assert(serverRepo.includes('prepareAiMenuManagerSessionWrite') && serverRepo.includes('buildAiMenuManagerPendingState'), 'AMM server writes must maintain pending lookup metadata and enforce the compact-session byte budget');
assert(aiMenuManagerImplDoc.includes('AMM server DAL ID boundary'), 'AMM implementation doc must document the server DAL ID boundary');
assert(aiMenuManagerImplDoc.includes('AMM scope document-ID boundary'), 'AMM implementation doc must document the tenant/store scope document-ID boundary');
assert(aiMenuManagerFirebaseDoc.includes('AMM server DAL ID boundary'), 'AMM Firebase doc must document the server DAL ID boundary');
assert(aiMenuManagerFirebaseDoc.includes('AMM scope document-ID admission'), 'AMM Firebase doc must document the scope document-ID cost boundary');
assert(aiMenuManagerFirebaseDoc.includes('Compact Session Runtime Shape Boundary') && aiMenuManagerFirebaseDoc.includes('adds no document read, write, delete'), 'AMM Firebase doc must record the cost-neutral compact-session runtime boundary');
assert(read('__docs__/ai-menu-manager/ai-menu-manager_test-cases.md').includes('AMM-SESSION-INTEGRITY-001'), 'AMM test cases must retain compact-session adversarial coverage');
assert(read('__docs__/ai-menu-manager/ai-menu-manager_test-cases.md').includes('AMM-PROPOSAL-INTEGRITY-001'), 'AMM test cases must retain server-proposal adversarial coverage');
assert(read('__docs__/ai-menu-manager/ai-menu-manager_validation.md').includes('Restart 236 compact-session validation'), 'AMM validation must record the compact-session runtime closure');
assert(read('__docs__/ai-menu-manager/ai-menu-manager_validation.md').includes('Restart 238 proposal-integrity validation'), 'AMM validation must record the proposal runtime closure');
assert(productionReadinessAudit.includes('AI Menu Manager Compact Session Runtime Boundary Checkpoint'), 'Production readiness audit must record the AMM compact-session runtime checkpoint');
assert(productionReadinessAudit.includes('AI Menu Manager Proposal Runtime Boundary Checkpoint'), 'Production readiness audit must record the AMM proposal runtime checkpoint');
assert(changelogUpper.includes('AI Menu Manager Compact Session Integrity'), 'Changelog must record the AMM compact-session integrity repair');
assert(changelogUpper.includes('AI Menu Manager Proposal Integrity'), 'Changelog must record the AMM proposal integrity repair');
assert(productionReadinessAudit.includes('AI Menu Manager server DAL ID boundary checkpoint'), 'Production readiness audit must record the AMM server DAL ID boundary checkpoint');
assert(productionReadinessAudit.includes('AI Menu Manager Scope Document ID Boundary checkpoint'), 'Production readiness audit must record the AMM scope document-ID boundary checkpoint');
assert(changelogUpper.includes('AI Menu Manager Server DAL ID Boundary'), 'Primary changelog must record the AMM server DAL ID boundary');
assert(changelogUpper.includes('AI Menu Manager Scope Document ID Boundary'), 'Primary changelog must record the AMM scope document-ID boundary');
assert(changelogLower.includes('AI Menu Manager Server DAL ID Boundary'), 'Lowercase changelog must record the AMM server DAL ID boundary');
assert(changelogLower.includes('AI Menu Manager Scope Document ID Boundary'), 'Lowercase changelog must record the AMM scope document-ID boundary');

const packageJson = read('package.json');
const aiMenuManagerEmulator = read('scripts/verification/test-ai-menu-manager-emulator.ts');
assert(packageJson.includes('"test:ai-menu-manager:emulator"'), 'AMM transactional regression emulator command must remain discoverable');
assert(packageJson.includes('"test:ai-menu-manager:rules"'), 'AMM Firestore rules emulator command must remain discoverable');
assert(aiMenuManagerEmulator.includes('inbox hydration must deduplicate refs and reject foreign or malformed proposal truth'), 'AMM emulator must cover foreign and malformed proposal hydration');
assert(aiMenuManagerEmulator.includes('malformed persisted proposal must not be repaired or mutated by an approval attempt'), 'AMM emulator must prove malformed persisted proposals fail before mutation');
assert(aiMenuManagerEmulator.includes('arbitrary session IDs must not create compact session documents'), 'AMM emulator must cover deterministic compact session identity');
assert(aiMenuManagerEmulator.includes('stale approval must not lock a directive'), 'AMM emulator must cover transaction-local stale approval rejection');
assert(aiMenuManagerEmulator.includes('concurrent retry must return persisted receipt'), 'AMM emulator must cover concurrent terminal receipt convergence');
assert(aiMenuManagerEmulator.includes('a conflicting deterministic proposal must not create or mutate the current compact session'), 'AMM emulator must reject cross-session deterministic proposal collisions without partial session writes');

const desktopRoute = read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx');
const desktopProposalCard = read('src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx');
const localActionUrl = read('src/lib/ai-menu-manager/localActionUrl.ts');
const isolatedBrowserUrl = read('src/lib/browser/openIsolatedBrowserUrl.ts');
assert(localActionUrl.includes('AI_MENU_MANAGER_LOCAL_ACTION_URL_INVALID'), 'AMM local-action URL helper must throw a fixed invalid URL code');
assert(localActionUrl.includes("url.protocol === 'https:'"), 'AMM local-action URL helper must allow HTTPS URLs');
assert(localActionUrl.includes("url.protocol === 'http:' && isKnownLocalDevelopmentHost(url)"), 'AMM local-action URL helper must allow known local-dev HTTP URLs only');
assert(localActionUrl.includes('url.username || url.password'), 'AMM local-action URL helper must reject credentialed URLs');
assert(localActionUrl.includes("host.endsWith('.menulist.digital')"), 'AMM local-action URL helper must preserve QA tenant-host testing support');
assert(!localActionUrl.includes("host.endsWith('.menulist.ai')"), 'AMM local-action URL helper must not preserve legacy .ai tenant-host testing');
assert(desktopProposalCard.includes("action.type === 'copy_url'"), 'Desktop AMM cards must support copy_url local actions');
assert(desktopProposalCard.includes("action.type === 'copy_text'"), 'Desktop AMM cards must support copy_text local actions');
assert(desktopProposalCard.includes("action.type === 'download_text'"), 'Desktop AMM cards must support download_text local actions');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_failed'), 'Desktop AMM cards must log bounded local-action failures');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_copy_unavailable'), 'Desktop AMM cards must reject unavailable local copy handoffs');
assert(desktopProposalCard.includes('ai_menu_manager_local_action_copy_fallback_failed'), 'Desktop AMM cards must reject failed textarea copy fallback');
assert(desktopProposalCard.includes('hasRuntimeClipboardWrite') && desktopProposalCard.includes('hasRuntimeCopyFallback'), 'Desktop AMM cards must use shared runtime copy support checks');
assert(desktopProposalCard.includes('let clipboardWriteError: unknown;') && desktopProposalCard.includes('clipboardWriteError = error;'), 'Desktop AMM cards must fall through to textarea fallback after rejected Clipboard API writes');
assert(desktopProposalCard.includes('clipboardWriteRejected: Boolean(clipboardWriteError)'), 'Desktop AMM cards must preserve Clipboard rejection context in unavailable-copy failures');
assert(desktopProposalCard.includes('normalizeAiMenuManagerLocalActionUrl'), 'Desktop AMM cards must normalize local-action URLs');
assert(desktopProposalCard.includes('copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value))'), 'Desktop AMM cards must normalize copy_url actions');
assert(desktopProposalCard.includes('const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);'), 'Desktop AMM cards must normalize QR local-action URLs');
assert(desktopProposalCard.includes('openAiMenuManagerLocalActionUrl(action.value)'), 'Desktop AMM cards must use the shared normalized no-opener URL handoff');
assert(desktopProposalCard.includes("getBoundedRuntimeStringContext('actionValue', action.value)"), 'Desktop AMM cards must bound local-action values in diagnostics');
assert(desktopProposalCard.includes("getBoundedRuntimeStringContext('cardId', card.cardId)"), 'Desktop AMM cards must bound card ids in local-action diagnostics');
assert(desktopProposalCard.includes('hasClipboardWrite: hasRuntimeClipboardWrite()') && desktopProposalCard.includes('hasCopyFallback: hasRuntimeCopyFallback()'), 'Desktop AMM local-action diagnostics must include copy support metadata');
assert(desktopProposalCard.includes("const copied = document.execCommand('copy');"), 'Desktop AMM cards must inspect textarea copy fallback acknowledgement');
assert(!desktopProposalCard.includes("\n                window.open(action.value, '_blank', 'noopener,noreferrer');\n                return;"), 'Desktop AMM cards must not silently open local-action URLs');
assert(!desktopProposalCard.includes("window.open(action.value, '_blank', 'noopener,noreferrer')"), 'Desktop AMM cards must not open unnormalized local-action URLs');
assert(!desktopProposalCard.includes('window.open('), 'Desktop AMM cards must not misread the intentionally severed noopener window handle as a blocked popup');
assert(!desktopProposalCard.includes("if (navigator.clipboard?.writeText) {\n        await navigator.clipboard.writeText(value);\n        return;\n    }"), 'Desktop AMM cards must not fail rejected Clipboard API writes before textarea fallback');
assert(!desktopProposalCard.includes("document.execCommand('copy');\n    document.body.removeChild(textarea);"), 'Desktop AMM cards must not treat failed textarea copy fallback as success');
assert(desktopRoute.includes('sessionProjectIdRef'), 'Desktop AMM must track session ids per selected project');
assert(desktopRoute.includes('sessionDateRef') && desktopRoute.includes('sessionDate: getSessionDateForProject(projectId)'), 'Desktop AMM must retain the validated date for remembered recovered sessions');
assert(desktopRoute.includes('getAiMenuManagerComposerContextData') && desktopRoute.includes('buildAiMenuManagerComposerPrompt'), 'Desktop AMM must support composer context selection');
assert(desktopRoute.includes('composerContext: commandContext') && desktopRoute.includes('clearComposerContext();'), 'Desktop AMM must pass exact composer context ids and clear them after use');
assert(desktopRoute.includes('amm-desktop-context-picker') && desktopRoute.includes('Work on'), 'Desktop AMM must render an inline composer context picker');
assert(desktopRoute.includes('Choose context or suggestions') && desktopRoute.includes('<Dropdown'), 'Desktop AMM must consolidate Work on and Suggestions behind one composer tool entry');
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
assert(desktopRoute.includes('projectsLoadError') && desktopRoute.includes('Menus could not be loaded') && desktopRoute.includes('has not confirmed that this store has no menus'), 'Desktop AMM must distinguish a failed menu-list read from confirmed zero menus');
assert(desktopRoute.includes('if (!canAccessDigitalScreens || !selectedProjectId)') && desktopRoute.includes('[canAccessDigitalScreens, selectedProjectId,'), 'Desktop AMM must not read optional Digital Screen context before a menu is selected');
assert(desktopRoute.includes('selectedProjectStillExists') && desktopRoute.includes('setSelectedProjectId(nextSelectedProjectId)') && desktopRoute.includes('setSelectedProject(null)'), 'Desktop AMM must clear a stale selected project after a successful empty or changed-scope project list');
assert(desktopRoute.includes('selectedProjectLoadError') && desktopRoute.includes('Selected menu could not be loaded'), 'Desktop AMM must keep selected-menu and inbox failures persistent');
assert(desktopRoute.includes('Create a menu first') && desktopRoute.includes('href="/projects"'), 'Desktop AMM must show an actionable confirmed-zero-menu state');
assert(desktopRoute.includes('isComposerUnavailable') && desktopRoute.includes('disabled={isComposerUnavailable || submitting}'), 'Desktop AMM composer tools must fail closed until a real selected menu and inbox are loaded');
assert(desktopRoute.includes("isComposerUnavailable ? 'Pending cards unavailable' : 'No pending cards'") && desktopRoute.includes("isComposerUnavailable ? 'Receipts unavailable' : 'No receipts yet'"), 'Desktop AMM must not claim empty cards or receipts while selected-menu truth is unavailable');
assert(desktopRoute.includes('variant="emptyWorkspace"') && desktopRoute.includes('variant="serverErrorContext"'), 'Desktop AMM first-use and recovery states must use shared contextual illustrations');
assert(desktopRoute.includes('activeSuggestion') && desktopRoute.includes('setActiveSuggestion(suggestion)'), 'Desktop AMM suggestions must support first-level to second-level guided navigation');
assert(desktopRoute.includes('getAiMenuManagerPromptText(prompt)'), 'Desktop AMM child suggestions must draft their configured prompt text');
assert(desktopRoute.includes('LuChevronRight') && desktopRoute.includes('Back'), 'Desktop AMM nested suggestions must expose forward and back navigation');
assert(!desktopRoute.includes('Drawer'), 'Desktop AMM suggestions must stay inside the chat frame, not open as a page-level drawer');
assert(desktopRoute.includes('amm-desktop-suggestions-tray') && desktopRoute.includes('Suggestions'), 'Desktop AMM suggestions must render as an inline chat-frame tray');
assert(desktopRoute.includes('getAiMenuManagerCardEditPrompt') && desktopRoute.includes('onDraftPrompt'), 'Desktop AMM cards must support draft-first edit/options');
assert(!desktopRoute.includes('submitPrompt(prompt.label)'), 'Desktop AMM suggestion chips must not submit directly');
assert(!desktopRoute.includes('}, [message, sessionId, storeId]);'), 'Desktop AMM must not reload inbox only because sessionId state changed');
assert(desktopRoute.includes('completeAiMenuManagerClientOperation'), 'Desktop AMM must complete deterministic cards through the client session DAL');
assert(desktopRoute.includes('sessionSnapshot: currentSession'), 'Desktop AMM must complete/cancel cards from the loaded compact session snapshot');
assert(desktopRoute.includes('buildAiMenuManagerClientExecutionDirective'), 'Desktop AMM approvals must use stored DAL execution directives');
assert(desktopRoute.includes('buildAiMenuManagerClientBatchExecution') && desktopRoute.includes('completeAiMenuManagerClientOperations'), 'Desktop AMM must apply compound cards with one project save and one compact completion write');
assert(desktopRoute.includes('Approve all') && desktopRoute.includes('updates prepared together'), 'Desktop AMM must expose a clear grouped approval control');
assert(desktopRoute.includes('isServerBackedCard') && desktopRoute.includes('submitAiMenuManagerProposalAction'), 'Desktop AMM must use guarded proposal APIs only for server-backed fallback cards');
assert(desktopRoute.includes("const isServerBackedCard = operation.proposalApiBacked === true"), 'Desktop AMM must not infer proposal backing from an execution mode persisted in compact sessions');
assert(!desktopRoute.includes("const isServerBackedCard = operation.executionMode === 'existing_server_api'"), 'Desktop AMM compact-session cards must not be sent to a proposal API without proposal backing');
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
assert(mobileNavigation.includes("titleKey: 'menuHelp'"), 'MobileNavigation must expose localized owner-friendly Menu help in the bottom tab bar');
const mobileNavigationEnUs = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
assert(mobileNavigationEnUs?.MobileNavigation?.menuHelp === 'Menu help', 'MobileNavigation English locale must retain owner-friendly Menu help copy');

const mobileScreen = read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx');
const mobileProposalCard = read('src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx');
assert(mobileProposalCard.includes("action.type === 'copy_url'"), 'Mobile AMM cards must support copy_url local actions');
assert(mobileProposalCard.includes("action.type === 'copy_text'"), 'Mobile AMM cards must support copy_text local actions');
assert(mobileProposalCard.includes("action.type === 'download_text'"), 'Mobile AMM cards must support download_text local actions');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_failed'), 'Mobile AMM cards must log bounded local-action failures');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_copy_unavailable'), 'Mobile AMM cards must reject unavailable local copy handoffs');
assert(mobileProposalCard.includes('mobile_ai_menu_manager_local_action_copy_fallback_failed'), 'Mobile AMM cards must reject failed textarea copy fallback');
assert(mobileProposalCard.includes('hasRuntimeClipboardWrite') && mobileProposalCard.includes('hasRuntimeCopyFallback'), 'Mobile AMM cards must use shared runtime copy support checks');
assert(mobileProposalCard.includes('let clipboardWriteError: unknown;') && mobileProposalCard.includes('clipboardWriteError = error;'), 'Mobile AMM cards must fall through to textarea fallback after rejected Clipboard API writes');
assert(mobileProposalCard.includes('clipboardWriteRejected: Boolean(clipboardWriteError)'), 'Mobile AMM cards must preserve Clipboard rejection context in unavailable-copy failures');
assert(mobileProposalCard.includes('normalizeAiMenuManagerLocalActionUrl'), 'Mobile AMM cards must normalize local-action URLs');
assert(mobileProposalCard.includes('copyTextToClipboard(normalizeAiMenuManagerLocalActionUrl(action.value))'), 'Mobile AMM cards must normalize copy_url actions');
assert(mobileProposalCard.includes('const actionUrl = normalizeAiMenuManagerLocalActionUrl(action.value);'), 'Mobile AMM cards must normalize QR local-action URLs');
assert(mobileProposalCard.includes('openAiMenuManagerLocalActionUrl(action.value)'), 'Mobile AMM cards must use the shared normalized no-opener URL handoff');
assert(mobileProposalCard.includes("getBoundedRuntimeStringContext('actionValue', action.value)"), 'Mobile AMM cards must bound local-action values in diagnostics');
assert(mobileProposalCard.includes("getBoundedRuntimeStringContext('cardId', card.cardId)"), 'Mobile AMM cards must bound card ids in local-action diagnostics');
assert(mobileProposalCard.includes('hasClipboardWrite: hasRuntimeClipboardWrite()') && mobileProposalCard.includes('hasCopyFallback: hasRuntimeCopyFallback()'), 'Mobile AMM local-action diagnostics must include copy support metadata');
assert(mobileProposalCard.includes("const copied = document.execCommand('copy');"), 'Mobile AMM cards must inspect textarea copy fallback acknowledgement');
assert(!mobileProposalCard.includes("\n                window.open(action.value, '_blank', 'noopener,noreferrer');\n                return;"), 'Mobile AMM cards must not silently open local-action URLs');
assert(!mobileProposalCard.includes("window.open(action.value, '_blank', 'noopener,noreferrer')"), 'Mobile AMM cards must not open unnormalized local-action URLs');
assert(!mobileProposalCard.includes('window.open('), 'Mobile AMM cards must not misread the intentionally severed noopener window handle as a blocked popup');
assert(localActionUrl.includes("import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';"), 'AMM local-action URL handoff must use the shared isolated browser helper');
assert(localActionUrl.includes('openIsolatedBrowserUrl(actionUrl);'), 'AMM local-action URL handoff must pass only its normalized URL to the shared helper');
assert(isolatedBrowserUrl.includes("anchor.rel = 'noopener noreferrer'"), 'Shared AMM browser handoff must isolate the new browsing context');
assert(isolatedBrowserUrl.includes("anchor.target = '_blank'"), 'Shared AMM browser handoff must open in a new browsing context');
assert(isolatedBrowserUrl.includes('anchor.remove();'), 'Shared AMM browser handoff must clean up its temporary DOM node');
assert(!mobileProposalCard.includes("if (navigator.clipboard?.writeText) {\n        await navigator.clipboard.writeText(value);\n        return;\n    }"), 'Mobile AMM cards must not fail rejected Clipboard API writes before textarea fallback');
assert(!mobileProposalCard.includes("document.execCommand('copy');\n    document.body.removeChild(textarea);"), 'Mobile AMM cards must not treat failed textarea copy fallback as success');
assert(mobileScreen.includes('useMobileProjects'), 'Mobile AMM must use existing mobile project provider');
assert(mobileScreen.includes('sessionProjectIdRef'), 'Mobile AMM must track session ids per selected project');
assert(mobileScreen.includes('sessionDateRef') && mobileScreen.includes('sessionDate: getSessionDateForProject(selectedProjectId)'), 'Mobile AMM must retain the validated date for remembered recovered sessions');
assert(mobileScreen.includes('getAiMenuManagerComposerContextData') && mobileScreen.includes('buildAiMenuManagerComposerPrompt'), 'Mobile AMM must support composer context selection');
assert(mobileScreen.includes('composerContext: commandContext') && mobileScreen.includes('clearComposerContext();'), 'Mobile AMM must pass exact composer context ids and clear them after use');
assert(mobileScreen.includes('Choose context or suggestions') && mobileScreen.includes('Start from') && mobileScreen.includes('Work on'), 'Mobile AMM must expose one composer tool entry for context and suggestions');
assert(mobileScreen.includes('openContextPicker') && mobileScreen.includes('setIsSuggestionsOpen(false)') && mobileScreen.includes('setIsContextPickerOpen(false)'), 'Mobile AMM Work on and Suggestions sheets must be mutually exclusive');
assert(mobileScreen.includes('filterAiMenuManagerComposerEntities') && mobileScreen.includes('toggleComposerEntity'), 'Mobile AMM context picker must support item/category entity selection');
assert(mobileScreen.includes('activeContextEntityCount') && mobileScreen.includes('shouldShowContextSearch') && mobileScreen.includes('Find item') && mobileScreen.includes('Find category'), 'Mobile AMM item/category picker must use compact conditional search');
assert(mobileScreen.includes('SearchBar') && mobileScreen.includes("maxHeight: '36vh'") && mobileScreen.includes('minHeight: 44'), 'Mobile AMM item/category picker must use compact MobileShell-friendly rows');
assert(mobileScreen.includes('currentSession') && mobileScreen.includes('sessionSnapshot: currentSession'), 'Mobile AMM must submit commands from the loaded compact session snapshot');
assert(mobileScreen.includes('Suggestions') && mobileScreen.includes('pickSuggestion') && mobileScreen.includes('setInput(prompt)'), 'Mobile AMM suggestions must fill the composer instead of executing directly');
assert(mobileScreen.includes('resolveClarification') && mobileScreen.includes('replaceOperationId: card.cardId'), 'Mobile AMM clarification choices must resolve into the next card and replace the clarification');
assert(mobileScreen.includes('getAiMenuManagerProjectPromptGroups') && mobileScreen.includes('promptGroups.map'), 'Mobile AMM suggestions must use grouped, contextual prompt rows');
assert(mobileScreen.includes('getAiMenuManagerStarterSuggestions') && mobileScreen.includes('activateStarterSuggestion'), 'Mobile AMM empty-state starter cards must use draft-only suggestion behavior');
assert(mobileScreen.includes('getAiMenuManagerAttentionSuggestions') && mobileScreen.includes('attentionSuggestions.length ?'), 'Mobile AMM empty state must prioritize loaded-menu attention cards before generic starter cards');
assert(mobileScreen.includes('hasLoadError') && mobileScreen.includes('Menu could not be loaded') && mobileScreen.includes('has not confirmed that this store has no menus'), 'Mobile AMM must distinguish project load failure from confirmed zero menus');
assert(mobileScreen.includes('if (!canAccessDigitalScreens || !selectedProjectId)') && mobileScreen.includes('[canAccessDigitalScreens, selectedProjectId,'), 'Mobile AMM must not read optional Digital Screen context before a menu is selected');
assert(mobileScreen.includes('Create a menu first') && mobileScreen.includes('Open the Menu tab'), 'Mobile AMM must route confirmed-zero-menu owners to the existing Menu tab');
assert(mobileScreen.includes('refreshProjects({ force: true, loadSelectedProject: true, showLoader: true })'), 'Mobile AMM project recovery must retry the shared scoped project provider');
assert(mobileScreen.includes("emptyLabel={isLoading ? 'Loading menu'") && mobileScreen.includes('Loading selected menu…'), 'Mobile AMM must keep provider and selected-project transitions in a plain loading state');
assert(mobileScreen.includes('variant="emptyWorkspace"') && mobileScreen.includes('variant="serverErrorContext"'), 'Mobile AMM first-use and recovery states must use shared contextual illustrations');
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
assert(mobileScreen.includes('buildAiMenuManagerClientBatchExecution') && mobileScreen.includes('completeAiMenuManagerClientOperations'), 'Mobile AMM must apply compound cards with one project save and one compact completion write');
assert(mobileScreen.includes('Approve all') && mobileScreen.includes('updates prepared together'), 'Mobile AMM must expose a touch-safe grouped approval control');
assert(mobileScreen.includes('isServerBackedCard') && mobileScreen.includes('submitAiMenuManagerProposalAction'), 'Mobile AMM must use guarded proposal APIs only for server-backed fallback cards');
assert(mobileScreen.includes("const isServerBackedCard = operation.proposalApiBacked === true"), 'Mobile AMM must not infer proposal backing from an execution mode persisted in compact sessions');
assert(!mobileScreen.includes("const isServerBackedCard = operation.executionMode === 'existing_server_api'"), 'Mobile AMM compact-session cards must not be sent to a proposal API without proposal backing');
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
      uid: 'file-1',
      extractedData: {
        data: {
          categories: [
            { id: 'cat-drinks', active: true, name: { en: 'Drinks' } },
          ],
          items: [
            {
              id: 'item-1',
              category: 'cat-drinks',
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
              category: 'cat-drinks',
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
      uid: 'file-attention',
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
const hostilePromptProject = new Proxy({}, {
  get() {
    throw new Error('hostile persisted project');
  },
});
const hostilePromptGroups = getAiMenuManagerProjectPromptGroups(hostilePromptProject);
assert(
  !hostilePromptGroups.some((group) => group.groupId === 'quick-fixes'),
  'AMM prompt groups must contain malformed persisted project access without contextual quick fixes',
);
assert(
  JSON.stringify(getAiMenuManagerAttentionSuggestions(hostilePromptProject)) === '[]',
  'AMM attention suggestions must contain malformed persisted project access',
);
assert(
  !getAiMenuManagerProjectPromptGroups({
    projectId: 'oversized-project',
    files: Array.from({ length: 101 }, (_, index) => ({ uid: `file-${index}` })),
  }).some((group) => group.groupId === 'quick-fixes'),
  'AMM prompt groups must reject contextual rows from project file sets beyond the canonical project cap',
);
for (const childPrompt of [
  'Set menu tone to Premium & Minimal',
  'Use grid layout',
  'Set theme color to Gold',
  'Show item prices',
  'Change working hours for today',
  'Set special hours for a date',
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
assert((proposalCard.includes('Choose one to continue') || proposalCard.includes('Choose an option')) && proposalCard.includes("card.kind === 'clarification'") && proposalCard.includes('onResolveClarification?.(card, reply)'), 'Desktop cards must render guided options and resolve structured clarification choices without approving');
assert((mobileCardStack.includes('Choose one to continue') || mobileCardStack.includes('Choose an option')) && mobileCardStack.includes("card.kind === 'clarification'") && mobileCardStack.includes('onResolveClarification?.(card, reply)'), 'Mobile cards must render guided options and resolve structured clarification choices without approving');
assert(desktopRoute.includes('composerContext: reply.composerContext') && mobileScreen.includes('composerContext: reply.composerContext'), 'Desktop and mobile clarification taps must preserve validated structured entity scope');
assert(proposalCard.includes('card.localActions') && proposalCard.includes('generateBrandedQrCodeDataUrl'), 'Desktop cards must render browser-local link and QR actions');
assert(mobileCardStack.includes('card.localActions') && mobileCardStack.includes('generateBrandedQrCodeDataUrl'), 'Mobile cards must render browser-local link and QR actions');
assert(proposalCard.includes('getCardKindIcon') && mobileCardStack.includes('getCardKindIcon'), 'Desktop and mobile cards must show card-kind-specific state icons');
assert(proposalCard.includes('disabled={disabled}') && mobileCardStack.includes('disabled={Boolean(workingCardId)}'), 'Desktop and mobile guided choices must block repeat taps while any card group is processing');
assert(!mobileCardStack.includes('No pending cards.'), 'Mobile AMM must not add a redundant empty card below the initial conversation state');
assert(desktopRoute.includes('Nothing changes before you approve.') && mobileScreen.includes('Nothing changes before you approve.'), 'Desktop and mobile AMM must use the same concise approval trust line');
assert(desktopRoute.includes('buildAiMenuManagerTimeline') && mobileScreen.includes('buildAiMenuManagerTimeline'), 'Desktop and mobile AMM must render compact owner, manager, and receipt conversation entries');
assert(desktopRoute.includes('getAiMenuManagerProjectStatusLine') && mobileScreen.includes('getAiMenuManagerProjectStatusLine'), 'Desktop and mobile AMM must show loaded selected-menu status without another read');
assert(proposalCard.includes('shouldShowAiMenuManagerApprovalReason') && mobileCardStack.includes('shouldShowAiMenuManagerApprovalReason'), 'Desktop and mobile cards must reserve policy detail for high-risk or unsupported work');

assert(commandResolver.includes('Choose presentation tone'), 'Theme/style commands without a preset must create a guided tone chooser');
assert(commandResolver.includes('Choose item for image'), 'Image commands without an item must create a guided item chooser');
assert(commandResolver.includes('Choose item to feature'), 'Promote-item commands without an item must create a guided item chooser');
assert(commandResolver.includes('suggestedReplies'), 'Clarification cards must carry suggested replies for next-card resolution');

const firestoreRules = read('firestore.rules');
const firestoreIndexes = read('firestore.indexes.json');
const aiMenuManagerRulesTest = read('scripts/verification/test-ai-menu-manager-rules.ts');
const aiMenuManagerEmulatorTest = read('scripts/verification/test-ai-menu-manager-emulator.ts');
const aiMenuManagerSessionIntegrityTest = read('scripts/verification/test-ai-menu-manager-session-integrity.ts');
const proposalIntegrity = read('src/lib/ai-menu-manager/proposalIntegrity.ts');
const proposalIntegrityTest = read('scripts/verification/test-ai-menu-manager-proposal-integrity.ts');
const projectIntegrity = read('src/lib/ai-menu-manager/projectIntegrity.ts');
const projectIntegrityTest = read('scripts/verification/test-ai-menu-manager-project-integrity.ts');
const aiMenuManagerServer = read('src/database/aiMenuManager/server.ts');
assert(firestoreIndexes.includes('"collectionGroup": "aiMenuManagerSessions"') && firestoreIndexes.includes('"collectionGroup": "aiMenuManagerProposals"'), 'AMM compact sessions and server-backed proposals must have explicit Firestore TTL configuration');
assert(firestoreIndexes.includes('"fieldPath": "hasPendingOperations"') && firestoreIndexes.includes('"fieldPath": "updatedAt"'), 'AMM latest-pending recovery must declare its bounded compound index');
assert((aiMenuManagerServer.match(/\.\.\.\(session\.counters \|\| \{\}\)/g) || []).length >= 2 && aiMenuManagerServer.includes('...(existingSession?.counters || {})'), 'AMM server fallback mutations must preserve compact route-quality counters');
assert(firestoreRules.includes('match /aiMenuManagerSessions/{sessionId}'), 'Firestore rules must explicitly guard AMM compact session docs');
assert(firestoreRules.includes('pendingOperations.size() <= 25'), 'Firestore rules must cap AMM pending operations');
assert(firestoreRules.includes('isValidAiMenuManagerPendingState') && firestoreRules.includes('hasPendingOperations') && firestoreRules.includes('pendingCount'), 'Firestore rules must validate AMM pending lookup metadata');
assert(aiMenuManagerEmulatorTest.includes('a new day must recover the latest scoped unresolved session') && aiMenuManagerEmulatorTest.includes('cross-day recovery must preserve normal proposal integrity filtering'), 'AMM Admin emulator must cover next-day session and proposal recovery');
assert(aiMenuManagerSessionIntegrityTest.includes('size compaction must never remove pending work') && aiMenuManagerSessionIntegrityTest.includes('Finish or cancel an existing Menu Manager card'), 'AMM compact-session tests must cover safe history trimming and oversized pending rejection');
assert(firestoreRules.includes('compactMessages.size() <= 20'), 'Firestore rules must cap AMM compact messages');
assert(firestoreRules.includes('isAiMenuManagerSessionScopeUnchanged') && firestoreRules.includes('canWriteAiMenuManagerSession(resource.data.tId, resource.data.sId)'), 'Firestore rules must verify existing AMM session scope before update');
assert(firestoreRules.includes('isDeterministicAiMenuManagerSessionId(request.resource.data, sessionId)'), 'Firestore rules must reject non-deterministic new AMM compact session document IDs');
assert(firestoreRules.includes("sessionId == 'amm2_' + data.tId + '_' + data.sId + '_' + data.sessionDate + '_' + data.projectId"), 'Firestore rules must derive the exact v2 AMM session ID from persisted scope fields without an extra read');
assert(firestoreRules.includes('isValidAiMenuManagerSessionCounters') && firestoreRules.includes('counters.keys().hasOnly(['), 'Firestore rules must allowlist compact-session counter keys');
assert(firestoreRules.includes("counters[key] is int && counters[key] >= 0 && counters[key] <= 1000000000"), 'Firestore rules must reject malformed or unbounded compact-session counters');
assert(aiMenuManagerRulesTest.includes("counters: { commands: '1' }") && aiMenuManagerRulesTest.includes('unknownCounter: 1'), 'AMM rules tests must reject wrong-type and unknown compact-session counters');
assert(firestoreRules.includes('match /aiMenuManagerProposals/{proposalId}') && firestoreRules.includes('allow read, write: if false;'), 'AMM proposal docs must remain server/Admin-only');
assert(firestoreRules.includes('match /aiMenuManagerRules/{ruleId}') && aiMenuManagerRulesTest.includes("doc(ownerDb, 'aiMenuManagerRules', 'owner-rule')"), 'AMM rule-ledger docs must remain server/Admin-only with emulator denial coverage');
assert(proposalIntegrity.includes('normalizeAiMenuManagerProposalSnapshot'), 'AMM proposal snapshots must have one canonical runtime normalizer');
assert(proposalIntegrity.includes('cardStatusMatchesProposal') && proposalIntegrity.includes('executionStatusMatchesProposal'), 'AMM proposal runtime normalization must enforce card and execution state coherence');
assert(proposalIntegrity.includes('isAiMenuManagerPatchAllowedForAction') && proposalIntegrity.includes('normalizeExecutionDirective'), 'AMM proposal runtime normalization must validate executable patch and directive contracts');
assert(aiMenuManagerServer.includes('requireAiMenuManagerProposalData') && aiMenuManagerServer.includes('normalizeAiMenuManagerProposalSnapshot'), 'AMM server reads and mutations must normalize proposal snapshots');
assert(!aiMenuManagerServer.includes('data() as AiMenuManagerProposalDoc'), 'AMM server must not trust Firestore proposal snapshots through direct casts');
assert(proposalIntegrityTest.includes('executing proposal without directive must fail closed') && proposalIntegrityTest.includes('coherent terminal proposal must normalize'), 'AMM proposal integrity tests must cover malformed executable state and valid terminal state');
assert(projectIntegrity.includes('normalizeAiMenuManagerProjectSnapshot') && projectIntegrity.includes('PUBLIC_MENU_DRAFT_DATA_LIMITS'), 'AMM project snapshots must have one bounded runtime normalizer');
assert(aiMenuManagerServer.includes('normalizeAiMenuManagerProjectSnapshot') && !aiMenuManagerServer.includes('data() as Project'), 'AMM server project reads must normalize persisted runtime shape instead of trusting direct casts');
assert(contextPacket.includes('normalizeAiMenuManagerProjectSnapshot') && contextPacket.includes('expectedProjectId?: string'), 'AMM direct context construction must normalize project truth against authoritative request identity');
assert(composerContext.includes('try {') && composerContext.includes('return { categories: [], entities: [], items: [], targets };'), 'AMM composer must fail closed to an empty context when selected project truth is malformed');
assert(desktopRoute.includes('operation.projectId') && mobileScreen.includes('operation.projectId'), 'Desktop and mobile already-applied checks must bind patch verification to operation project identity');
assert(
  projectIntegrityTest.includes('duplicate item and category IDs across files must fail closed')
    && projectIntegrityTest.includes('attribute verification must require every targeted occurrence to match')
    && projectIntegrityTest.includes('direct context construction must reject project/request identity mismatches')
    && projectIntegrityTest.includes('direct patch application must reject directive/project identity mismatches')
    && projectIntegrityTest.includes('direct patch application must reject missing directive project identity'),
  'AMM project integrity tests must cover ambiguous duplicate identity and direct client identity mismatches',
);

console.log('AI Menu Manager verification passed');
