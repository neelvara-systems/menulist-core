#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listRuntimeSourceFiles(directory) {
  const absoluteDirectory = path.join(ROOT, directory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listRuntimeSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(callback, message) {
  let threw = false;
  try {
    callback();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function assertBefore(source, earlierToken, laterToken, message) {
  const earlierIndex = source.indexOf(earlierToken);
  const laterIndex = source.indexOf(laterToken);
  assert(earlierIndex >= 0, `${message}: missing earlier token`);
  assert(laterIndex >= 0, `${message}: missing later token`);
  assert(earlierIndex < laterIndex, message);
}

function verifyClassificationRuntime() {
  const { classifyReview } = require(path.join(ROOT, 'functions/src/reviews/classificationRules.ts'));

  assert(
    classifyReview(5, 'Five star rating and kind staff.').classification === 'benign',
    'the keyword rat must not match inside rating',
  );
  assert(
    classifyReview(1, 'We saw a rat in the kitchen.').classification === 'negative_high_risk',
    'the standalone keyword rat must remain high risk',
  );
  assert(
    classifyReview(2, 'The manager discriminated against us.').classification === 'negative_high_risk',
    'staff discrimination variants must remain high risk',
  );
  assert(
    classifyReview(4, 'Do you offer vegan meals?').classification === 'informational',
    'questions must remain informational when no higher-priority risk matches',
  );
  assert(
    classifyReview(5, undefined).classification === 'benign',
    'a rating-only positive review must remain benign',
  );
  assertThrows(() => classifyReview(0, 'invalid'), 'rating zero must fail closed');
  assertThrows(() => classifyReview(6, 'invalid'), 'rating six must fail closed');
  assertThrows(() => classifyReview(Number.NaN, 'invalid'), 'NaN rating must fail closed');
  assertThrows(() => classifyReview(5, null), 'non-string comments must fail closed');
}

function verifySourceBoundary() {
  const rules = read('functions/src/reviews/classificationRules.ts');
  const statesRoute = read('src/app/api/reviews/states/route.ts');
  const suggestRoute = read('src/app/api/reviews/suggest/route.ts');
  const reviewTypes = read('src/types/reviews.ts');
  const databaseConstants = read('src/constants/database.ts');
  const firestoreRules = read('firestore.rules');
  const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
  const implementationDoc = read('__docs__/reviews-reputation/reviews-reputation_impl.md');
  const reviewsReadme = read('__docs__/reviews-reputation/README.md');
  const reviewsWebsite = read('__docs__/reviews-reputation/reviews-reputation_website.md');
  const reviewsHelp = read('__docs__/reviews-reputation/reviews-reputation_helpdoc.md');
  const reviewsMarketing = read('__docs__/reviews-reputation/reviews-reputation_marketing.md');
  const protectionReadme = read('__docs__/reputation-protection/README.md');
  const protectionImplementation = read('__docs__/reputation-protection/reputation-protection_impl.md');
  const protectionWebsite = read('__docs__/reputation-protection/reputation-protection_website.md');
  const protectionHelp = read('__docs__/reputation-protection/reputation-protection_helpdoc.md');
  const protectionMarketing = read('__docs__/reputation-protection/reputation-protection_marketing.md');
  const protectionMobile = read('__docs__/reputation-protection/reputation-protection_mobile-support.md');
  const featureFlags = read('src/config/features.ts');
  const packageJson = JSON.parse(read('package.json'));

  assert(rules.includes('containsWholeKeyword(comment, keyword)'), 'classification must use whole-keyword admission');
  assert(rules.includes('throw new TypeError("Invalid review rating")'), 'classification must reject invalid ratings');
  assert(rules.includes('throw new TypeError("Invalid review comment")'), 'classification must reject invalid comment values');
  assert(!rules.includes('lowerComment.includes(keyword.toLowerCase())'), 'classification must not use substring keyword matching');
  assert(statesRoute.includes('FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION'), 'review state route must stay parent-flag gated');
  assert(suggestRoute.includes('!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST'), 'reply suggestion must require both flags');
  assertBefore(
    statesRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION)',
    'await checkRateLimit({',
    'disabled review-state requests must stop before rate-limit work',
  );
  assertBefore(
    statesRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION)',
    'const db = admin.firestore();',
    'disabled review-state requests must stop before Firestore work',
  );
  assertBefore(
    suggestRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST)',
    "await import('@lib/ops/safeMode')",
    'disabled reply suggestions must stop before SAFE_MODE work',
  );
  assertBefore(
    suggestRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST)',
    'await checkRateLimit({',
    'disabled reply suggestions must stop before rate-limit work',
  );
  assertBefore(
    suggestRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST)',
    'await checkAICapacity(',
    'disabled reply suggestions must stop before AI-capacity work',
  );
  assertBefore(
    suggestRoute,
    'if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST)',
    'await model.generateContent({',
    'disabled reply suggestions must stop before provider work',
  );
  assert(suggestRoute.includes("logRuntimeFailure('review_reply_generation_failed'"), 'provider fallback must emit bounded failure diagnostics');
  assert(suggestRoute.includes('usedFallback: true'), 'provider fallback diagnostics must identify fallback use');
  assert(
    /match \/reviews\/\{tId\}\/\{sId\}\/\{docId\} \{[\s\S]{0,300}allow read, write: if false;/.test(firestoreRules),
    'dormant raw reviews must remain denied to every browser identity',
  );
  assert(firestoreRules.includes('match /reviewsState/{docId}'), 'review state rules must use the flat collection');
  assert(
    /match \/reviewsState\/\{docId\} \{[\s\S]{0,400}allow read, write: if false;/.test(firestoreRules),
    'review state documents must remain Admin-SDK-only so browsers cannot bypass the boolean-only API projection',
  );
  assert(
    statesRoute.includes('data: { hasBlockActive, hasEscalationActive }'),
    'review state API must retain the boolean-only owner projection',
  );
  assert(statesRoute.includes('.collection(DB_COLLECTIONS.REVIEWS_STATE)'), 'review state route must use the canonical flat collection');
  assert(statesRoute.includes('.where("tId", "==", tenantId)'), 'review state route must scope the flat collection by tenant');
  assert(statesRoute.includes('.where("sId", "==", storeId)'), 'review state route must scope the flat collection by store');
  assert(reviewTypes.includes('Collection: reviewsState/{reviewId}; tenant/store ownership lives in tId/sId fields'), 'review state type must document the flat persisted contract');
  assert(databaseConstants.includes('Path: reviewsState/{reviewId}; tId/sId fields own'), 'database constant must document the flat persisted contract');
  const reviewsStateIndexSignatures = firestoreIndexes.indexes
    .filter((index) => index.collectionGroup === 'reviewsState')
    .map((index) => index.fields.map((field) => field.fieldPath).join(','))
    .sort();
  assert(
    JSON.stringify(reviewsStateIndexSignatures) === JSON.stringify([
      'tId,sId,blockActive,autoExpiresAt',
      'tId,sId,escalationActive,autoExpiresAt',
    ]),
    'reviewsState must retain only the two composites required by the dormant bounded state queries',
  );
  assert(!implementationDoc.includes('reviewsState/{tId}/{sId}/{reviewId}'), 'maintained implementation docs must not describe a nested state collection');
  assert(featureFlags.includes('ENABLE_REVIEWS_REPUTATION: false'), 'reviews master flag must remain disabled');
  assert(featureFlags.includes('ENABLE_AI_REPLY_ASSIST: false'), 'reply-assist flag must remain disabled');
  assert(!protectionReadme.includes('REVIEWS_REPLY_ASSIST:'), 'reputation overview must not invent a reply-assist flag');
  assert(!protectionReadme.includes('REVIEWS_CLASSIFICATION:'), 'reputation overview must not invent a classification flag');
  assert(protectionReadme.includes('SCAFFOLDING ONLY'), 'reputation overview must identify scaffolding-only status');
  assert(protectionImplementation.includes('Existing Scaffolding (Not Ready to Activate)'), 'implementation plan must refuse activation from scaffolding');
  assert(protectionWebsite.includes('NOT APPROVED FOR PUBLICATION'), 'reputation website copy must remain publication-blocked');
  assert(protectionHelp.includes('NOT AN ACTIVE CUSTOMER HELP ARTICLE'), 'reputation help copy must remain publication-blocked');
  assert(protectionMarketing.includes('HOLD — NOT CURRENT SALES ENABLEMENT'), 'reputation marketing copy must remain on hold');
  assert(protectionMobile.includes('No mobile reputation screen or detail sheet exists.'), 'mobile docs must record missing review surfaces');
  assert(protectionMobile.includes('Do not add or document `antd-mobile`'), 'mobile docs must reject the unavailable UI dependency');
  assert(reviewsReadme.includes('DORMANT, INCOMPLETE SCAFFOLDING'), 'reviews overview must retain incomplete dormant product status');
  assert(reviewsReadme.includes('provider access alone is insufficient'), 'reviews overview must reject provider-only activation');
  assert(reviewsWebsite.includes('NOT APPROVED FOR PUBLICATION'), 'reviews website copy must remain publication-blocked');
  assert(reviewsHelp.includes('NOT AN ACTIVE CUSTOMER HELP ARTICLE'), 'reviews help copy must remain publication-blocked');
  assert(reviewsMarketing.includes('HISTORICAL HOLD'), 'reviews marketing copy must remain on hold');
  assert(!reviewsMarketing.includes('🔒 APPROVED LANGUAGE ONLY'), 'reviews marketing footer must not restore obsolete approval status');
  assert(!fs.existsSync(path.join(ROOT, 'functions/src/reviews/reviewsIngestion.ts')), 'GBP review ingestion must not be claimed as an existing function');
  assert(!fs.existsSync(path.join(ROOT, 'functions/src/reviews/reviewsClassifier.ts')), 'review-state writer must not be claimed as an existing function');
  assert(!fs.existsSync(path.join(ROOT, 'src/app/api/reviews/reply/route.ts')), 'Google reply posting must not be claimed as an existing route');
  assert(!featureFlags.includes('Cloud Function ingests reviews nightly'), 'feature flags must not claim absent review ingestion');
  assert(!featureFlags.includes('Infrastructure is built and ready'), 'feature flags must not claim the dormant fragments are activation-ready');
  assert(featureFlags.includes('There is no GBP review ingestion, persistence, dashboard mount, reply'), 'feature flags must record the missing review runtime');

  const activeSource = listRuntimeSourceFiles('src')
    .filter((relativePath) => !relativePath.endsWith('reviews/ReputationGuard.tsx') && !relativePath.endsWith('reviews/ReviewReplyTool.tsx'))
    .map(read)
    .join('\n');
  assert(!activeSource.includes('<ReputationGuard'), 'dormant ReputationGuard must not be mounted');
  assert(!activeSource.includes('<ReviewReplyTool'), 'dormant ReviewReplyTool must not be mounted');
  assert(packageJson.scripts['verify:reviews-reputation-boundary'] === 'node scripts/verification/verify-reviews-reputation-boundary.js', 'package must expose the reviews verifier');
  assert(packageJson.scripts['test:reviews:rules']?.includes('scripts/verification/test-reviews-reputation-rules.ts'), 'package must expose the reviews rules emulator test');
}

verifyClassificationRuntime();
verifySourceBoundary();
console.log('Reviews and reputation boundary verification passed.');
