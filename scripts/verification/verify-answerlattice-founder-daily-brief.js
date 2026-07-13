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

function assertFile(relPath) {
  assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`);
}

const featureFlags = read('src/config/features.ts');
const navigation = read('src/constants/answerlattice/navigations.ts');
const dashboardLayout = read('src/components/answerlattice/AnswerlatticeDashboardLayout.tsx');
const dashboardPage = read('src/app/(answerlattice)/answerlattice/dashboard/page.tsx');
const activationPage = read('src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx');
const assistantLib = read('src/lib/answerlattice/ownerSupportAssistant.ts');
const assistantUi = read('src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx');
const assistantPage = read('src/app/(answerlattice)/answerlattice/support-assistant/page.tsx');
const briefRoute = read('src/app/api/answerlattice/support-assistant/brief/route.ts');
const queryRoute = read('src/app/api/answerlattice/support-assistant/query/route.ts');
const productPage = read('src/app/sites/answerlattice/product/page.tsx');
const supportControlPage = read('src/app/sites/answerlattice/product/support-control/page.tsx');
const faqPage = read('src/app/sites/answerlattice/faq/page.tsx');
const updatesPage = read('src/app/sites/answerlattice/updates/page.tsx');
const answerlatticeReadme = read('__docs__/answerlattice/README.md');
const ownerAssistantReadme = read('__docs__/answerlattice/owner-support-assistant/README.md');
const ownerAssistantImpl = read('__docs__/answerlattice/owner-support-assistant/owner-support-assistant_impl.md');
const ownerAssistantFirebase = read('__docs__/answerlattice/owner-support-assistant/owner-support-assistant_firebase.md');
const changelog = read('__docs__/changelog.md');

[
  'README.md',
  'founder-daily-brief_spec.md',
  'founder-daily-brief_impl.md',
  'founder-daily-brief_firebase.md',
  'founder-daily-brief_mobile-support.md',
  'founder-daily-brief_test-cases.md',
  'founder-daily-brief_marketing.md',
  'founder-daily-brief_website.md',
  'founder-daily-brief_helpdoc.md',
].forEach((fileName) => assertFile(`__docs__/answerlattice/founder-daily-brief/${fileName}`));

const founderDailyBriefReadme = read('__docs__/answerlattice/founder-daily-brief/README.md');
const founderDailyBriefSpec = read('__docs__/answerlattice/founder-daily-brief/founder-daily-brief_spec.md');
const founderDailyBriefImpl = read('__docs__/answerlattice/founder-daily-brief/founder-daily-brief_impl.md');
const founderDailyBriefFirebase = read('__docs__/answerlattice/founder-daily-brief/founder-daily-brief_firebase.md');

assertIncludes(featureFlags, 'ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF: true', 'feature flag');
assertIncludes(featureFlags, 'no additional Firestore reads beyond the existing five-summary', 'feature flag cost note');

assertIncludes(navigation, "key: 'support-assistant', label: 'Daily Brief'", 'Support Control navigation label');
assert(
  navigation.indexOf("key: 'support-assistant'") < navigation.indexOf("key: 'support-board'"),
  'Daily Brief must appear before Support Board in Support Control navigation',
);
assert(
  navigation.indexOf("key: 'support-assistant'") < navigation.indexOf("key: 'support-knowledge-base'"),
  'Daily Brief must appear before Knowledge Base in Support Control navigation',
);
assertIncludes(dashboardLayout, 'ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) return ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT', 'support-only fallback route');
assert(
  dashboardLayout.indexOf('ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT') < dashboardLayout.indexOf('ENABLE_ANSWERLATTICE_SUPPORT_BOARD ? ANSWERLATTICE_ROUTES.SUPPORT_BOARD'),
  'support-only fallback must prefer Daily Brief before Support Board',
);
assertIncludes(dashboardPage, 'Today&apos;s Brief', 'dashboard Daily Brief shortcut');
assertIncludes(dashboardPage, 'openRoute(ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT)', 'dashboard Daily Brief route');
assertIncludes(activationPage, 'Today&apos;s Brief', 'activation Daily Brief shortcut');
assertIncludes(activationPage, 'openRoute(ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT)', 'activation Daily Brief route');

assertIncludes(assistantLib, 'export type AnswerlatticeFounderDailyBrief', 'Founder Daily Brief type');
assertIncludes(assistantLib, 'buildFounderDailyBrief', 'Founder Daily Brief builder');
assertIncludes(assistantLib, 'ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF', 'Founder Daily Brief flag gate');
assertIncludes(assistantLib, "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`)", 'coverage summary read');
assertIncludes(assistantLib, "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`)", 'trust summary read');
assertIncludes(assistantLib, "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`supportBoardSummary_${tId}_${sId}`)", 'Support Board summary read');
assertIncludes(assistantLib, "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`frictionSnapshot_${tId}_${sId}`)", 'friction summary read');
assertIncludes(assistantLib, "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`knowledgeIntakeSummary_${tId}_${sId}`)", 'Knowledge Intake summary read');
assertIncludes(assistantLib, 'const snapshots = await db.getAll(...refs);', 'bounded five-summary read');
assertIncludes(assistantLib, "readModel: { firestoreReads: packet.cacheHit ? 0 : 5, source: 'summary_only', cacheHit: packet.cacheHit }", 'summary-only read model');
assertIncludes(assistantLib, "'release'", 'release intent');
assertIncludes(assistantLib, "'install'", 'install intent');
assertIncludes(assistantLib, "'reply'", 'reply intent');
assertIncludes(assistantLib, "'cost'", 'cost intent');
assertIncludes(assistantLib, 'This brief is computed from existing summaries', 'brief cost note');
assertNotIncludes(assistantLib, '@google/genai', 'Founder Daily Brief server runtime');
assertNotIncludes(assistantLib, 'generateContent', 'Founder Daily Brief server runtime');
assertNotIncludes(assistantLib, 'answerlattice_aiOperations', 'Founder Daily Brief server runtime');
assertNotIncludes(assistantLib, '.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).add(', 'Founder Daily Brief server runtime');

assertIncludes(assistantUi, 'Daily Support Brief', 'Support Assistant UI title');
assertIncludes(assistantUi, "Today&apos;s plan", 'Support Assistant UI daily plan');
assertIncludes(assistantUi, 'brief.dailyBrief.actions.map', 'Support Assistant UI daily actions');
assertIncludes(assistantUi, 'DAILY_FOCUS_META', 'Support Assistant UI owner-readable focus labels');
assertIncludes(assistantUi, 'action.costImpact', 'Support Assistant UI cost transparency');
assertIncludes(assistantUi, 'Summary updated', 'Support Assistant UI summary freshness');
assertIncludes(assistantUi, 'style={{ minHeight: 44', 'Support Assistant UI mobile touch target');
assertIncludes(assistantPage, "title: 'Daily Brief | Answerlattice'", 'Support Assistant page metadata');

assertIncludes(briefRoute, 'ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT', 'brief route parent flag');
assertIncludes(briefRoute, 'applyAnswerlatticeDashboardReadRateLimit', 'brief route read rate limit');
assertIncludes(briefRoute, 'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT', 'brief route permission');
assertIncludes(queryRoute, 'SUPPORT_ASSISTANT_QUERY_MAX_BODY_BYTES = 4 * 1024', 'query route body cap');
assertIncludes(queryRoute, 'checkRateLimit', 'query route rate limit');
assertIncludes(queryRoute, 'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT', 'query route permission');

assertIncludes(productPage, 'Start with a daily support brief', 'Answerlattice product page');
assertIncludes(productPage, 'reads summaries and stays read-only', 'Answerlattice product page read-only claim');
assertNotIncludes(productPage, 'Ask a read-only Support Assistant', 'Answerlattice product page duplicate card');
assertIncludes(supportControlPage, 'Daily Founder Brief', 'Support Control public page');
assertIncludes(supportControlPage, 'performs no mutation', 'Support Control public page boundary');
assertIncludes(faqPage, 'What does Daily Brief change?', 'Answerlattice FAQ');
assertIncludes(updatesPage, 'read-only Daily Founder Brief', 'Answerlattice updates page');

assertIncludes(answerlatticeReadme, 'Founder Daily Brief', 'Answerlattice README index');
assertIncludes(ownerAssistantReadme, 'dailyBrief', 'Owner Support Assistant README');
assertIncludes(ownerAssistantReadme, 'release, install, reply, cost', 'Owner Support Assistant README intents');
assertIncludes(ownerAssistantImpl, 'Deterministic ten-intent classifier', 'Owner Support Assistant implementation docs');
assertIncludes(ownerAssistantFirebase, 'adds no read, write, listener, scheduler, provider call, or support-credit debit', 'Owner Support Assistant Firebase docs');
assertIncludes(founderDailyBriefReadme, 'No new Firestore collection.', 'Founder Daily Brief README boundary');
assertIncludes(founderDailyBriefSpec, 'New assistant task queue', 'Founder Daily Brief spec boundary');
assertIncludes(founderDailyBriefImpl, 'no new route', 'Founder Daily Brief implementation boundary');
assertIncludes(founderDailyBriefFirebase, 'adds no incremental Firestore reads', 'Founder Daily Brief Firebase cost boundary');
assertIncludes(changelog, 'Answerlattice Founder Daily Brief', 'changelog entry');
assertIncludes(changelog, 'adds no Firestore collection, read beyond the existing brief request, write, realtime listener, scheduler, provider call, support-credit debit', 'changelog cost boundary');

console.log('Answerlattice Founder Daily Brief boundary verifier passed');
