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
  'image_item_generate',
  'menu_publish',
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
assert(commandResolver.includes('menu_design_mood_update') && commandResolver.includes('premium-minimal'), 'Premium menu style commands must resolve to the design mood adapter');

const { resolveAiMenuManagerCommand } = require(path.join(root, 'src/lib/ai-menu-manager/commandResolver'));
const resolverFixtureContext = {
  projectId: 'project-1',
  defaultLanguage: 'en',
  projectName: 'Bar Menu',
  storeName: 'Grill Zilla',
  menuDesign: { mood: 'clean', layout: 'card', showImages: true, showItemPrices: true },
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
  ['Show Cold coffee in Featured section', 'decision_blocks_update', 'proposal'],
  ['Show Featured section', 'decision_blocks_update', 'proposal'],
  ['Show note: Fresh menu today', 'menu_special_note_update', 'proposal'],
  ['Make menu premium', 'menu_design_mood_update', 'proposal'],
  ['Make menu look premium', 'menu_design_mood_update', 'proposal'],
  ['change the theme', 'system_clarification_request', 'clarification'],
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

const mobileShell = read('src/components/mobile/MobileShell.tsx');
assert(mobileShell.includes('/menu-manager'), 'MobileShell independent Menu Manager route mapping missing');
assert(mobileShell.includes("tab: 'aiMenuManager'"), 'MobileShell direct route must resolve to the Menu Manager bottom tab');
assert(mobileShell.includes("activeTab === 'aiMenuManager'"), 'MobileShell must render Menu Manager as a first-class tab screen');
assert(mobileShell.includes("FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER") && mobileShell.includes("FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_MOBILE"), 'MobileShell Menu Manager tab must be feature-flag guarded');

const mobileNavigation = read('src/components/mobile/MobileNavigation.tsx');
assert(mobileNavigation.includes("'aiMenuManager'"), 'MobileNavigation must include the Menu Manager tab key');
assert(mobileNavigation.includes("title: 'Manager'"), 'MobileNavigation must expose Menu Manager in the bottom tab bar');

const mobileScreen = read('src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx');
assert(mobileScreen.includes('useMobileProjects'), 'Mobile AMM must use existing mobile project provider');
assert(mobileScreen.includes('projectId: card.scope.projectId'), 'Mobile approvals must send selected project scope');

console.log('AI Menu Manager verification passed');
