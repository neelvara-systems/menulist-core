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
  'src/lib/ai-menu-manager/actions/projectPatches.ts',
  'src/database/aiMenuManager/server.ts',
  'src/database/aiMenuManager/index.ts',
  'src/app/api/ai-menu-manager/command/route.ts',
  'src/app/api/ai-menu-manager/inbox/route.ts',
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
  'system_unsupported_action',
];

const requiredFlags = [
  'ENABLE_AI_MENU_MANAGER',
  'ENABLE_AI_MENU_MANAGER_MOBILE',
  'ENABLE_AI_MENU_MANAGER_VOICE_INPUT',
  'ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS',
  'ENABLE_AI_MENU_MANAGER_RULES',
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

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

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

const commandRoute = read('src/app/api/ai-menu-manager/command/route.ts');
assert(commandRoute.includes('withAuth'), 'Command route must use withAuth');
assert(commandRoute.includes('PERMISSIONS.MANAGE_MENU'), 'Command route must require menu permission');
assert(commandRoute.includes('DATA_WRITE'), 'Command route must apply write rate limiting');
assert(commandRoute.includes('buildAiMenuManagerInvalidRequestResponse'), 'Command route must use generic validation errors');
assert(commandRoute.includes('getAiMenuManagerProposal(proposalId)'), 'Command route must return existing proposal on idempotent retry');
assert(commandRoute.includes('buildAiMenuManagerContextBaseHash'), 'Command route must store project base hash');
assert(commandRoute.includes('getStoreFromSession') && commandRoute.includes('needsStoreRead'), 'Command route must use session store context before adding a Firestore store read');

const clientDal = read('src/database/aiMenuManager/index.ts');
const sendCommandBlock = (clientDal.split('export async function sendAiMenuManagerCommand')[1] || '').split('export async function getAiMenuManagerClientInbox')[0] || '';
const completionBlock = (clientDal.split('export async function completeAiMenuManagerClientOperation')[1] || '').split('export async function submitAiMenuManagerProposalAction')[0] || '';
assert(sendCommandBlock.includes('sessionSnapshot'), 'AMM command submit must accept the loaded compact session snapshot');
assert(sendCommandBlock.includes('setDoc(sessionRef, sessionPayload, { merge: true })'), 'AMM command submit must write the compact session without a transaction read');
assert(!sendCommandBlock.includes('runTransaction'), 'AMM command submit must not transaction-read the compact session');
assert(completionBlock.includes('sessionSnapshot'), 'AMM completion/cancel must accept the loaded compact session snapshot');
assert(completionBlock.includes('getMatchingOperationSessionSnapshot'), 'AMM completion/cancel must verify the loaded compact session scope before writing');
assert(completionBlock.includes('setDoc(sessionRef') && completionBlock.includes('{ merge: true }'), 'AMM completion/cancel must write the compact session without a transaction read');
assert(!completionBlock.includes('runTransaction'), 'AMM completion/cancel must not transaction-read the compact session for deterministic cards');
assert(clientDal.includes('ensureFirebaseAuthForSession(session)'), 'AMM client DAL must sync Firebase Auth claims before direct session reads/writes');
assert(clientDal.includes('pendingOperations'), 'AMM client DAL must store full pending operations in the compact session doc');
assert(clientDal.includes('buildAiMenuManagerContextPacket') && clientDal.includes('resolveAiMenuManagerCommand'), 'AMM deterministic command resolution must run from selected project context in DAL');
assert(sendCommandBlock.includes('composerContext: request.composerContext'), 'AMM client command resolution must pass selected composer context ids into the resolver');
assert(clientDal.includes('buildAiMenuManagerClientExecutionDirective'), 'AMM client DAL must build execution directives from stored pending operations');
assert(clientDal.includes('buildAiMenuManagerContextBaseHash(context)'), 'AMM client approvals must check stale selected-project context');
assert(clientDal.includes('MAX_PENDING_OPERATIONS = 25'), 'AMM pending operation cap must be explicit in client DAL');
assert(clientDal.includes('sendAiMenuManagerServerCommand'), 'AMM API command route should remain only as an explicit server fallback');
assert(!clientDal.includes('collection(DB_COLLECTIONS.AI_MENU_MANAGER_PROPOSALS'), 'Client DAL must not write proposal docs for deterministic actions');

const idempotency = read('src/lib/ai-menu-manager/idempotency.ts');
assert(!idempotency.includes("from 'crypto'") && !idempotency.includes('require('), 'AMM idempotency/hash helper must stay browser-safe for DAL-first resolver use');

const firestoreSanitize = read('src/lib/ai-menu-manager/firestoreSanitize.ts');
assert(firestoreSanitize.includes('Object.getPrototypeOf(value)'), 'AMM Firestore sanitizer must preserve Timestamp and FieldValue prototype objects');
assert(!firestoreSanitize.includes('JSON.stringify'), 'AMM Firestore sanitizer must not JSON-round-trip Firestore sentinel values');

const actionRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts');
assert(actionRoute.includes('ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES'), 'Proposal approval must be guarded by confirmed-write flag');
assert(actionRoute.includes('client_project_mutation'), 'Proposal approval must restrict executable client project mutations');
assert(actionRoute.includes('parsed.data.projectId') && actionRoute.includes('parsed.data.actionType'), 'Proposal approval must verify selected project/action scope');
assert(actionRoute.includes('buildAiMenuManagerContextBaseHash(currentContext)'), 'Proposal approval must reject stale project cards');

const projectPatches = read('src/lib/ai-menu-manager/actions/projectPatches.ts');
assert(projectPatches.includes('applyAiMenuManagerProjectPatch'), 'Project patch helper missing');
assert(projectPatches.includes('projectContainsAiMenuManagerPatch'), 'Patch verification helper missing');
assert(projectPatches.includes("patch.kind === 'category_update'"), 'Category project patch support missing');
assert(projectPatches.includes("patch.kind === 'attribute_update'"), 'Attribute project patch support missing');

const contextPacket = read('src/lib/ai-menu-manager/contextPacket.ts');
assert(contextPacket.includes('exactMatches.length > 1') && contextPacket.includes('candidates[0].score - candidates[1].score'), 'Ambiguous item names must not auto-select the first match');
assert(contextPacket.includes('findAiMenuManagerCategoryByName'), 'Category name resolver missing');

const commandResolver = read('src/lib/ai-menu-manager/commandResolver.ts');
assert(commandResolver.includes('khatam'), 'Mixed-language availability commands must include khatam handling');
assert(commandResolver.includes('resolveFeaturedSectionCommand'), 'Featured section commands must resolve through a registered adapter');
assert(commandResolver.includes('decision_blocks_update'), 'Featured section commands must use the decision block project patch');
assert(commandResolver.includes('resolveCategoryVisibilityCommand'), 'Category visibility commands must resolve through a registered adapter');
assert(commandResolver.includes('deactivate'), 'Visibility commands must support deactivate wording');
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
  ],
  categories: [
    { id: 'cat-drinks', name: 'Drinks', aliases: ['drinks'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 1 },
    { id: 'cat-starters', name: 'Starters', aliases: ['starters'], active: true, fileUid: 'f1', hasImage: false, timeSlotsCount: 0, orderIndex: 2 },
  ],
};
const resolverFixtures = [
  ['Masala tea 20 now', 'item_price_update', 'proposal'],
  ['Tea 20', 'item_price_update', 'proposal'],
  ['Cold coffee sold out', 'item_availability_update', 'proposal'],
  ['Cold coffee over', 'item_availability_update', 'proposal'],
  ['Masala chai khatam hai', 'system_clarification_request', 'clarification'],
  ['deactivate Cold coffee item', 'item_visibility_update', 'proposal'],
  ['deactivate Drinks category', 'category_visibility_update', 'proposal'],
  ['rename Cold coffee to Iced coffee', 'item_name_update', 'proposal'],
  ['rename Drinks category to Beverages', 'category_name_update', 'proposal'],
  ['Cold coffee description to Chilled creamy coffee', 'item_description_update', 'proposal'],
  ['move Cold coffee to Starters', 'item_category_update', 'proposal'],
  ['mark Cold coffee as bestseller', 'item_bestseller_update', 'proposal'],
  ['set Cold coffee prep time to 10 minutes', 'item_prep_time_update', 'proposal'],
  ['increase all drinks by 10', 'bulk_price_update', 'proposal'],
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
  ['Post this on Instagram', 'system_unsupported_action', 'unsupported'],
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
for (const text of ['Update this on Zomato', 'Post this on Instagram']) {
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
      && !result.card.actions.includes('mark_done'),
    `External fixture failed for "${text}": external platforms must be explicit not-supported cards without completion controls`,
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
assert(schemas.includes('projectId: idSchema'), 'AMM inbox requests must require selected project context');
assert(schemas.includes('commandContextTargetSchema') && schemas.includes('selectedEntityIds'), 'AMM command schema must validate composer context selection');

const completeRoute = read('src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts');
assert(completeRoute.includes('parsed.data.projectId') && completeRoute.includes('parsed.data.actionType'), 'Completion route must verify selected project/action scope');
assert(!completeRoute.includes("error?.message || 'Completion failed'"), 'Completion route must not echo internal error messages');

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
assert(serverRepo.includes('if (proposalSnap.exists) return;'), 'Command persistence must avoid duplicate proposal/session writes on retry');
assert(serverRepo.includes('Execution directive expired'), 'Execution directives must expire');
assert(serverRepo.includes('projectContainsAiMenuManagerPatch'), 'Completion must verify the existing project mutation landed');
assert(serverRepo.includes('String(session.projectId) !== String(params.projectId)'), 'Inbox reads must reject sessions from a different selected project');

const desktopRoute = read('src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx');
const desktopProposalCard = read('src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx');
assert(desktopProposalCard.includes("action.type === 'copy_url' || action.type === 'copy_text'"), 'Desktop AMM cards must support copy_text local actions');
assert(desktopProposalCard.includes("action.type === 'download_text'"), 'Desktop AMM cards must support download_text local actions');
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
assert(desktopRoute.includes('getAiMenuManagerProjectPromptGroups') && desktopRoute.includes('promptGroups.map'), 'Desktop AMM suggestions must use grouped, contextual prompt rows');
assert(desktopRoute.includes('getAiMenuManagerStarterSuggestions') && desktopRoute.includes('activateStarterSuggestion'), 'Desktop AMM empty-state starter cards must use draft-only suggestion behavior');
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
assert(!desktopRoute.includes('submitAiMenuManagerProposalAction'), 'Desktop deterministic AMM flow must not use proposal action API');
assert(!desktopRoute.includes('completeAiMenuManagerClientProposal'), 'Desktop deterministic AMM flow must not use proposal completion API');

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
assert(mobileProposalCard.includes("action.type === 'copy_url' || action.type === 'copy_text'"), 'Mobile AMM cards must support copy_text local actions');
assert(mobileProposalCard.includes("action.type === 'download_text'"), 'Mobile AMM cards must support download_text local actions');
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
assert(mobileScreen.includes('getAiMenuManagerProjectPromptGroups') && mobileScreen.includes('promptGroups.map'), 'Mobile AMM suggestions must use grouped, contextual prompt rows');
assert(mobileScreen.includes('getAiMenuManagerStarterSuggestions') && mobileScreen.includes('activateStarterSuggestion'), 'Mobile AMM empty-state starter cards must use draft-only suggestion behavior');
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
assert(!mobileScreen.includes('submitAiMenuManagerProposalAction'), 'Mobile deterministic AMM flow must not use proposal action API');
assert(!mobileScreen.includes('completeAiMenuManagerClientProposal'), 'Mobile deterministic AMM flow must not use proposal completion API');

const promptHints = read('src/lib/ai-menu-manager/projectPromptHints.ts');
assert(promptHints.includes('getAiMenuManagerProjectPromptGroups'), 'AMM prompt helper must expose grouped contextual suggestions');
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
assert(proposalCard.includes('Choose an option') && proposalCard.includes('onDraftPrompt?.(reply.prompt)'), 'Desktop cards must render guided options as draft prompts');
assert(mobileCardStack.includes('Choose an option') && mobileCardStack.includes('onDraftPrompt?.(reply.prompt)'), 'Mobile cards must render guided options as draft prompts');
assert(proposalCard.includes('card.localActions') && proposalCard.includes('generateBrandedQrCodeDataUrl'), 'Desktop cards must render browser-local link and QR actions');
assert(mobileCardStack.includes('card.localActions') && mobileCardStack.includes('generateBrandedQrCodeDataUrl'), 'Mobile cards must render browser-local link and QR actions');

assert(commandResolver.includes('Choose presentation tone'), 'Theme/style commands without a preset must create a guided tone chooser');
assert(commandResolver.includes('Choose item for image'), 'Image commands without an item must create a guided item chooser');
assert(commandResolver.includes('Choose item to feature'), 'Promote-item commands without an item must create a guided item chooser');
assert(commandResolver.includes('suggestedReplies'), 'Clarification cards must carry suggested draft replies');

const firestoreRules = read('firestore.rules');
assert(firestoreRules.includes('match /aiMenuManagerSessions/{sessionId}'), 'Firestore rules must explicitly guard AMM compact session docs');
assert(firestoreRules.includes('pendingOperations.size() <= 25'), 'Firestore rules must cap AMM pending operations');
assert(firestoreRules.includes('compactMessages.size() <= 20'), 'Firestore rules must cap AMM compact messages');
assert(firestoreRules.includes('isAiMenuManagerSessionScopeUnchanged') && firestoreRules.includes('canWriteAiMenuManagerSession(resource.data.tId, resource.data.sId)'), 'Firestore rules must verify existing AMM session scope before update');
assert(firestoreRules.includes('match /aiMenuManagerProposals/{proposalId}') && firestoreRules.includes('allow read, write: if false;'), 'AMM proposal docs must remain server/Admin-only');

console.log('AI Menu Manager verification passed');
