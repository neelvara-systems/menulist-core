#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

let failures = 0;

const assert = (condition, message) => {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
};

const billableRoutes = [
  'src/app/api/business-copy/route.ts',
  'src/app/api/campaigns/caption/route.ts',
  'src/app/api/descriptions/route.ts',
  'src/app/api/image-editing/route.ts',
  'src/app/api/image-generation/batch-generation/route.ts',
  'src/app/api/image-generation/route.ts',
  'src/app/api/menu-card-export/design-advisor/route.ts',
  'src/app/api/new-item-metadata/route.ts',
  'src/app/api/reviews/suggest/route.ts',
  'src/app/api/seo/route.ts',
  'src/app/api/translations/route.ts',
];

for (const route of billableRoutes) {
  const source = read(route);
  assert(source.includes('finalizeAiOperationAccounting'), `${route} uses shared AI accounting finalizer`);
  assert(!source.includes('@database/aiOperations'), `${route} does not import client AI operation DAL`);
  assert(!/\baddAiOperation\s*\(/.test(source), `${route} does not write AI operations with client SDK`);
  assert(!/\bconsumeAICapacity\s*\(/.test(source), `${route} does not bypass shared credit finalizer`);
  assert(!/\brecordAiOperationForSession\s*\(/.test(source), `${route} does not bypass shared operation finalizer`);
}

const accounting = read('src/lib/ai/accounting.ts');
assert(accounting.includes('recordAiOperationForSession'), 'shared accounting finalizer records session operations');
assert(accounting.includes('recordAiOperation(operationInput)'), 'shared accounting finalizer records worker operations without session');
assert(accounting.includes('operation log failed'), 'shared accounting finalizer treats operation logging as best effort');
assert(accounting.includes('consumeAICapacity'), 'shared accounting finalizer consumes billable credits');
assert(accounting.includes('throw creditConsumptionError'), 'shared accounting finalizer fails paid requests when credit consumption fails');
assert(
  accounting.indexOf('operation log failed') < accounting.indexOf('if (capacitySubscription && unitsConsumed > 0)'),
  'shared accounting finalizer does not let log failure skip credit consumption'
);

const aiOperationsDal = read('src/database/aiOperations/index.tsx');
assert(aiOperationsDal.includes('Client AI operation writes are disabled'), 'legacy addAiOperation helper is disabled with explicit message');
assert(!/\baddDoc\s*\(/.test(aiOperationsDal), 'client AI operation DAL no longer writes documents');

const rules = read('firestore.rules');
const aiOperationsRules = rules.match(/match \/menulistAiOperations\/\{tId\}\/\{sId\}\/\{docId\} \{[\s\S]*?\n\s*\}/);
assert(Boolean(aiOperationsRules), 'Firestore rules include menulistAiOperations scoped collection');
assert(Boolean(aiOperationsRules && aiOperationsRules[0].includes('allow read: if isAuthenticated() && isPlatformAdmin();')), 'full AI operation documents are platform-read-only in Firestore rules');
assert(Boolean(aiOperationsRules && aiOperationsRules[0].includes('allow write: if false;')), 'menulistAiOperations writes are server/Admin-only');

const aiOperationsApi = read('src/app/api/ai-operations/route.ts');
assert(aiOperationsApi.includes('sanitizeOwnerOperation'), 'AI operations API sanitizes owner transaction responses');
assert(aiOperationsApi.includes('PLATFORM_ONLY_FIELDS'), 'AI operations API has explicit platform-only field denylist');
assert(aiOperationsApi.includes('OWNER_VISIBLE_FIELDS'), 'AI operations API uses an owner-visible allowlist');
assert(aiOperationsApi.includes("'realCostPaise'"), 'AI operations API keeps actual provider cost platform-only');
assert(aiOperationsApi.includes("'ourChargePaise'"), 'AI operations API keeps configured owner charge platform-only');
assert(aiOperationsApi.includes("'marginPaise'"), 'AI operations API keeps margin platform-only');
assert(aiOperationsApi.includes('getActionFilteredDocs'), 'AI operations API supports action filtering without relying on dynamic collection composite indexes');
assert(aiOperationsApi.includes("platformRole === 'PLATFORM'"), 'AI operations API returns full operation rows only to platform role');
assert(aiOperationsApi.includes("withAuth"), 'AI operations API is protected by auth middleware');
assert(aiOperationsApi.includes("getRateLimitForFeature('DATA_READ')"), 'AI operations API rate-limits read requests before Firestore reads');

const common = read('src/constants/common.ts');
const actionBlock = common.match(/export const AI_ACTIONS_TYPES:[\s\S]*?\{([\s\S]*?)\n\}/);
assert(Boolean(actionBlock), 'AI_ACTIONS_TYPES registry is present');
const actionKeys = actionBlock
  ? Array.from(actionBlock[1].matchAll(/\b([A-Z0-9_]+):\s*"[^"]+"/g)).map((match) => match[1]).sort()
  : [];

const unitCosts = read('src/constants/AI/unitCosts.ts');
const extractCostKeys = (registryName) => {
  const marker = `export const ${registryName}`;
  const start = unitCosts.indexOf(marker);
  if (start === -1) return [];

  const bodyStart = unitCosts.indexOf('{', start);
  const bodyEnd = unitCosts.indexOf('\n};', bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) return [];

  const body = unitCosts.slice(bodyStart, bodyEnd);
  return Array.from(body.matchAll(/\[AI_ACTIONS_TYPES\.([A-Z0-9_]+)\]/g)).map((match) => match[1]).sort();
};

const unitCostKeys = extractCostKeys('AI_UNIT_COSTS');
const realCostKeys = extractCostKeys('GEMINI_COST_USD');
const missingUnitCostKeys = actionKeys.filter((key) => !unitCostKeys.includes(key));
const missingRealCostKeys = actionKeys.filter((key) => !realCostKeys.includes(key));

assert(missingUnitCostKeys.length === 0, `all AI actions have explicit unit costs${missingUnitCostKeys.length ? `: ${missingUnitCostKeys.join(', ')}` : ''}`);
assert(missingRealCostKeys.length === 0, `all AI actions have explicit real-cost entries${missingRealCostKeys.length ? `: ${missingRealCostKeys.join(', ')}` : ''}`);
assert(unitCosts.includes('assertKnownAiAction'), 'unit cost lookup fails closed for unknown AI actions');
assert(!/AI_UNIT_COSTS\[actionType\]\s*\?\?\s*0/.test(unitCosts), 'unit cost lookup does not silently default unknown actions to free');
assert(!/GEMINI_COST_USD\[actionType\]\s*\?\?\s*0/.test(unitCosts), 'real-cost lookup does not silently default unknown actions to zero cost');

const explicitlyFreeActions = [
  'IMAGE_PROCESSING',
  'ADD_DESCRIPTION',
  'NEW_ITEM_METADATA',
  'MENU_INTAKE_IDENTITY',
  'PUBLIC_MENU_EXTRACTION',
];
for (const actionKey of explicitlyFreeActions) {
  const freeEntry = new RegExp(`\\[AI_ACTIONS_TYPES\\.${actionKey}\\]:\\s*0\\b`);
  assert(freeEntry.test(unitCosts), `${actionKey} is explicitly zero-unit for initial/setup output`);
}

const capacityCheck = read('src/lib/ai/capacityCheck.ts');
assert(
  capacityCheck.indexOf('if (isFreeTierAction(actionType))') !== -1
    && capacityCheck.indexOf('if (isFreeTierAction(actionType))') < capacityCheck.indexOf('if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS)'),
  'free actions short-circuit before paid enhancement kill switch and subscription lookup'
);

const extractionFunction = read('functions/src/logic/processMenuImages.ts');
assert(extractionFunction.includes('unitsConsumed: 0'), 'Cloud Function extraction audit stamps owner units as 0');

const linkTextExtractionFunction = read('functions/src/logic/menuLinkTextExtraction.ts');
assert(linkTextExtractionFunction.includes('unitsConsumed: 0'), 'deterministic menu-link extraction stamps owner units as 0');

const extractionJobFunction = read('functions/src/logic/processMenuImagesJob.ts');
assert(extractionJobFunction.includes('unitsConsumed: result.transaction.unitsConsumed || 0'), 'extraction jobs persist zero owner units in transaction summary');

const extractionMonitor = read('src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx');
assert(extractionMonitor.includes('Owner Units'), 'extraction monitor labels owner units separately from token audit cost');
assert(extractionMonitor.includes('rawBatchResponses'), 'extraction monitor exposes stored raw provider responses for platform debugging');
assert(extractionMonitor.includes('Total Tokens'), 'extraction monitor shows token usage breakdown for platform cost audit');
assert(extractionMonitor.includes('formatInrPaise'), 'extraction monitor formats paise-denominated AI cost as INR');

const extractionCostMonitor = read('src/components/templates/main-app/platform/extractionMonitor/CostMonitor.tsx');
assert(extractionCostMonitor.includes('formatInrPaise'), 'desktop extraction cost monitor formats stored paise values as INR');
assert(extractionCostMonitor.includes('Stored as paise and shown as INR'), 'desktop extraction cost monitor documents paise storage in UI');

const mobileExtractionMonitor = read('src/components/mobile/screens/MobileExtractionMonitorScreen.tsx');
assert(mobileExtractionMonitor.includes('formatInrPaise'), 'mobile extraction monitor formats stored paise values as INR');
assert(!mobileExtractionMonitor.includes('formatInrAmount'), 'mobile extraction monitor does not treat paise as whole rupees');

const ownerTransactionsPage = read('src/components/templates/main-app/transactions/index.tsx');
assert(!ownerTransactionsPage.includes("title: 'Tokens'"), 'desktop owner transaction table does not expose token counts');
assert(!ownerTransactionsPage.includes("dataIndex: 'totalTokenCount'"), 'desktop owner transaction table has no token-count column');
assert(ownerTransactionsPage.includes('getAiOperationOwnerSummary'), 'desktop owner transaction table shows shared owner-facing result summaries');
assert(ownerTransactionsPage.includes('pagination={false}'), 'desktop owner transaction table uses custom cursor pagination instead of fake total pagination');
assert(ownerTransactionsPage.includes('pageCursorsRef'), 'desktop owner transaction pagination tracks page cursors');
assert(ownerTransactionsPage.includes('No-credit actions'), 'desktop owner transaction page distinguishes free setup actions from charged actions');
assert(ownerTransactionsPage.includes('getExistingProjectsListWithoutLoader'), 'desktop owner transaction page uses read-only project summary lookup');
assert(!ownerTransactionsPage.includes('getMetadataProjectsList'), 'desktop owner transaction page does not use project lookup that can create defaults');

const aiOperationsDalAfterHardening = read('src/database/aiOperations/index.tsx');
assert(aiOperationsDalAfterHardening.includes('/api/ai-operations'), 'AI operations DAL reads through the sanitized server API');
assert(!aiOperationsDalAfterHardening.includes('@firebase/firestore'), 'AI operations DAL does not import browser Firestore query helpers');
assert(!aiOperationsDalAfterHardening.includes('firebaseClient'), 'AI operations DAL does not read full AI operation docs from the browser');

const ownerTransactionModal = read('src/components/templates/main-app/transactions/TransactionDetailsModal.tsx');
assert(ownerTransactionModal.includes("platformRole === 'PLATFORM'"), 'desktop transaction raw AI debug is platform-role gated');
assert(!ownerTransactionModal.includes('Descriptions.Item label="Total Charge"'), 'desktop owner transaction details do not show internal provider charge');
assert(ownerTransactionModal.includes('Full AI transaction object'), 'desktop platform transaction debug can inspect full AI transaction object');
assert(ownerTransactionModal.includes('Actual Provider Cost'), 'desktop platform transaction debug shows actual AI provider cost when recorded');
assert(ownerTransactionModal.includes('getAiOperationOwnerSummary'), 'desktop transaction details show shared owner-facing result summary');

const mobileTransactionsPage = read('src/components/mobile/screens/MobileTransactionsScreen.tsx');
assert(mobileTransactionsPage.includes("platformRole === 'PLATFORM'"), 'mobile transaction raw AI debug is platform-role gated');
assert(!mobileTransactionsPage.includes('tx.totalTokenCount.toLocaleString()} tokens'), 'mobile owner transaction list does not expose token counts');
assert(mobileTransactionsPage.includes('Platform Debug'), 'mobile platform transaction debug can inspect internal AI accounting fields');
assert(mobileTransactionsPage.includes('getAiOperationOwnerSummary'), 'mobile owner transaction list shows shared owner-facing result summaries');
assert(mobileTransactionsPage.includes('formatInrPaise'), 'mobile platform transaction debug formats paise-denominated cost values as INR');
assert(mobileTransactionsPage.includes('No-credit actions'), 'mobile owner transaction screen distinguishes free setup actions from charged actions');

const operationPresentation = read('src/lib/ai/operationPresentation.ts');
assert(operationPresentation.includes('formatAiOperationActionLabel'), 'AI operation presentation helper centralizes owner action labels');
assert(operationPresentation.includes('getAiOperationOwnerSummary'), 'AI operation presentation helper centralizes owner result summaries');
assert(operationPresentation.includes('formatAiOperationCredits'), 'AI operation presentation helper centralizes owner credit wording');

if (failures > 0) {
  console.error(`\nAI accounting hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nAI accounting hardening verification passed.');
