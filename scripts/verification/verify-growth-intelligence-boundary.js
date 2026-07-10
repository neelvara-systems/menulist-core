const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) failures.push(`${label} missing token: ${token}`);
}

function forbidToken(source, token, label) {
  if (source.includes(token)) failures.push(`${label} must not include token: ${token}`);
}

const attribution = read('src/lib/growth/acquisitionAttribution.ts');
[
  "MENULIST_PUBLIC_SURFACE: 'menulist_public_surface'",
  "PHYSICAL_PARTNER: 'physical_partner'",
  "FOUNDER_PILOT: 'founder_pilot'",
  "POWERED_BY: 'powered_by'",
  "PRODUCT_LOOP: 'product_loop'",
  'normalizeGrowthAcquisitionAttribution',
  'buildCreateMenuPath',
].forEach((token) => requireToken(attribution, token, 'acquisition attribution contract'));
['tenantId', 'storeId', 'customerId', 'ownerId', 'referrer']
  .forEach((token) => forbidToken(attribution, token, 'acquisition URL contract'));

const publicAttribution = read('src/components/customer/PublicMenuListAttribution.tsx');
requireToken(publicAttribution, 'PUBLIC_SURFACE_GROWTH_ATTRIBUTION', 'public attribution component');
requireToken(publicAttribution, '`${appUrl}/create-menu`', 'public attribution component');

const createClient = read('src/app/(website)/create-menu/CreateMenuClient.tsx');
[
  'growthAcquisitionSource',
  'growthAcquisitionMedium',
  'growthAcquisitionCampaign',
  'buildCreateMenuPath(growthAcquisition)',
  'growthAcquisition,',
].forEach((token) => requireToken(createClient, token, 'create-menu client'));

const createRoute = read('src/app/api/public/create-menu/route.ts');
[
  'normalizeGrowthAcquisitionAttribution',
  "stage: 'draft_created'",
  'recordFounderGrowthEvent',
  '...(growthAcquisition ? { growthAcquisition } : {})',
].forEach((token) => requireToken(createRoute, token, 'create-menu API'));

const claimRoute = read('src/app/api/public/create-menu/claim/route.ts');
[
  'normalizeGrowthAcquisitionAttribution(draft.growthAcquisition)',
  "stage: 'business_claimed'",
  'recordFounderGrowthEvent',
  '...(growthAcquisition ? { growthAcquisition } : {})',
].forEach((token) => requireToken(claimRoute, token, 'create-menu claim API'));

const growthReadModel = read('src/lib/ops/founderGrowthReadModel.ts');
[
  "const SUMMARY_DOC_ID = 'founderMonitorGrowth'",
  'DB_COLLECTIONS.PUBLIC_MENU_DRAFTS',
  'transaction.get(draftRef)',
  'growthTelemetry.draftCreatedRecordedAt',
  'growthTelemetry.businessClaimedRecordedAt',
  'FieldValue.increment(1)',
].forEach((token) => requireToken(growthReadModel, token, 'founder growth read model'));

const storeType = read('src/types/platform/store.ts');
requireToken(storeType, 'growthAcquisition?: GrowthAcquisitionAttribution', 'store acquisition type');
forbidToken(storeType, "source: 'menulist_public_surface'", 'store acquisition type');

const cancellationReasons = read('src/lib/billing/cancellationReasons.ts');
[
  "NO_LONGER_NEEDED: 'no_longer_needed'",
  "MISSING_FUNCTIONALITY: 'missing_functionality'",
  "OTHER: 'other'",
  'sanitizeCancellationReasonDetail',
].forEach((token) => requireToken(cancellationReasons, token, 'cancellation reason contract'));

const desktopCancellation = read('src/components/templates/main-app/billing/CancellationModal.tsx');
requireToken(desktopCancellation, 'CANCELLATION_REASON_OPTIONS', 'desktop cancellation');
requireToken(desktopCancellation, 'CANCELLATION_REASON.OTHER', 'desktop cancellation');

const mobileCancellation = read('src/components/mobile/screens/MobileBillingScreen.tsx');
[
  'CANCELLATION_REASON_OPTIONS',
  'showCancellationReasons',
  'cancellationReasonDetail',
  "t('cancellationReasonTitle')",
  "t(`cancellationReasons.${option.code}`)",
  "t('continueCancellation')",
].forEach((token) => requireToken(mobileCancellation, token, 'mobile cancellation'));
forbidToken(mobileCancellation, "reason: 'mobile_cancellation'", 'mobile cancellation');

const cancelRoute = read('src/app/api/razorpay/cancel-subscription/route.ts');
[
  'normalizeCancellationReasonCode(reason)',
  "const isLegacyMobileCancellation = reason === 'mobile_cancellation'",
  'cancellationReasonCode === CANCELLATION_REASON.OTHER',
  'sanitizeCancellationReasonDetail(otherReason)',
  'cancellationReasonCode,',
  "source: 'owner'",
  'recordFounderSubscriptionChurn',
].forEach((token) => requireToken(cancelRoute, token, 'cancel-subscription API'));
forbidToken(cancelRoute, 'otherReason: ${otherReason}', 'cancel-subscription audit remark');

const revenueReadModel = read('src/lib/ops/founderRevenueReadModel.ts');
['cancellationReasonCode', 'churnReasons', 'transaction.get(movementRef)']
  .forEach((token) => requireToken(revenueReadModel, token, 'founder revenue read model'));

const founderRoute = read('src/app/api/platform/founder-monitor/route.ts');
['founderMonitorGrowth', 'buildGrowthSummary', 'churnReasons', 'growth,']
  .forEach((token) => requireToken(founderRoute, token, 'founder monitor API'));

const docs = read('__docs__/growth-intelligence/README.md');
requireToken(docs, 'verify:growth-intelligence-boundary', 'growth intelligence README');

if (failures.length) {
  console.error('FAIL verify-growth-intelligence-boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS verify-growth-intelligence-boundary');
console.log('Validated public-loop attribution, idempotent founder counters, and structured desktop/mobile cancellation reasons.');
