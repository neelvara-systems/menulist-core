#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};
const includes = (content, value, label) => assert(content.includes(value), `${label} must include ${value}`);
const excludes = (content, value, label) => assert(!content.includes(value), `${label} must not include ${value}`);
const navLine = key => navigation.split('\n').find(line => line.includes(`{ key: '${key}',`)) || '';

const language = read('src/constants/answerlattice/customerLanguage.ts');
const navigation = read('src/constants/answerlattice/navigations.ts');
const sidebar = read('src/components/answerlattice/AnswerlatticeSidebar.tsx');
const activation = read('src/components/templates/answerlattice/activation/AnswerlatticeActivationCommandCenter.tsx');
const setupStatus = read('src/app/(answerlattice)/answerlattice/dashboard/page.tsx');
const onboarding = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
const dailyBrief = read('src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx');
const ownerSupportAssistant = read('src/lib/answerlattice/ownerSupportAssistant.ts');
const governance = read('src/components/templates/answerlattice/governance/index.tsx');
const installCenter = read('src/components/templates/answerlattice/install/AnswerlatticeInstallCenter.tsx');
const productPages = read('src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx');
const canonicalEditor = read('src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx');
const topicEditor = read('src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx');
const driftReview = read('src/components/templates/answerlattice/governance/DriftDashboard.tsx');
const friction = read('src/components/templates/answerlattice/governance/FrictionTab.tsx');
const knowledgeMap = read('src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx');
const trustMetrics = read('src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx');
const answerTests = read('src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx');
const coverageKpi = read('src/components/templates/answerlattice/AnswerlatticeCoverageKPI.tsx');
const faqManagement = read('src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx');
const languageDoc = read('__docs__/answerlattice/customer-language-contract.md');
const operatingGuide = read('__docs__/answerlattice/progressive-adoption-operating-guide.md');
const activationHelp = read('__docs__/answerlattice/client-activation-command-center/client-activation-command-center_helpdoc.md');
const activationFirebase = read('__docs__/answerlattice/client-activation-command-center/client-activation-command-center_firebase.md');
const activationMobile = read('__docs__/answerlattice/client-activation-command-center/client-activation-command-center_mobile-support.md');
const activationTests = read('__docs__/answerlattice/client-activation-command-center/client-activation-command-center_test-cases.md');
const packageJson = JSON.parse(read('package.json'));

for (const value of [
    "getLive: 'Get Live'",
    "runSupport: 'Run Support'",
    "answerQuality: 'Answer Quality'",
    "trustedAnswers: 'Trusted Answers'",
    "productTopics: 'Product Topics'",
    "answersToRecheck: 'Answers to Recheck'",
    "suggestedUpdates: 'Suggested Updates'",
    "productPagesAndFlows: 'Product Pages & Flows'",
    "setupStatus: 'Setup Status'",
    "allTools: 'All tools'",
    "showFewerTools: 'Show fewer tools'",
    "installSupport: 'Install Support'",
    "codingAgentInstall: 'Coding-agent install'",
    "copyCodingAgentInstall: 'Copy coding-agent install'",
]) {
    includes(language, value, 'customer-language contract');
}

for (const key of [
    'launch-activation',
    'launch-first-answers',
    'launch-install-center',
    'launch-readiness',
    'support-assistant',
    'support-tickets',
    'governance-answers',
]) {
    assert(navLine(key), `management navigation must include ${key}`);
    excludes(navLine(key), 'advanced: true', `${key} primary navigation item`);
}

for (const key of [
    'launch-settings',
    'launch-knowledge-intake',
    'launch-product-surfaces',
    'support-board',
    'support-conversations',
    'support-feedback',
    'support-weekly-digest',
    'support-workflow-notifications',
    'support-public-api',
    'support-knowledge-base',
    'support-faqs',
    'support-changelog',
    'support-known-issues',
    'governance-answer-tests',
    'governance-entities',
    'governance-map',
    'governance-analytics',
    'governance-health',
    'governance-history',
    'governance-candidates',
    'governance-drift',
    'governance-signal-queue',
    'governance-trust',
    'governance-branding',
    'governance-friction',
    'governance-languages',
    'governance-triggers',
]) {
    includes(navLine(key), 'advanced: true', `${key} secondary navigation item`);
}

includes(navLine('support'), 'route: ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT', 'Run Support parent route');
includes(navLine('launch-install-center'), 'ANSWERLATTICE_CUSTOMER_LANGUAGE.install.installSupport', 'Install Support navigation label');

includes(onboarding, 'Continue in AnswerLattice', 'existing-workspace continuation');
excludes(onboarding, 'mainDashboardHref', 'single existing-workspace continuation');
excludes(onboarding, '>Open dashboard<', 'single existing-workspace continuation');
includes(dailyBrief, 'Every recommendation links to the screen where you can verify and act.', 'Daily Brief owner guidance');
excludes(dailyBrief, 'Cached summary', 'Daily Brief owner surface');
excludes(dailyBrief, 'brief.readModel.firestoreReads', 'Daily Brief owner surface');
excludes(activation, 'machine-checkable', 'Get Live owner surface');
excludes(activation, 'factual launch checks', 'Get Live owner surface');
includes(activation, "We could not read this workspace's saved setup.", 'Get Live recovery guidance');
includes(setupStatus, 'Open Get Live', 'Setup Status recovery guidance');
excludes(setupStatus, 'factual launch checks', 'Setup Status owner surface');
includes(installCenter, 'open Get Live to confirm the workspace is ready', 'Install Support recovery guidance');
includes(ownerSupportAssistant, "label: 'Trusted answer coverage'", 'Daily Brief evidence language');
includes(ownerSupportAssistant, "label: 'Open Setup Status'", 'Daily Brief readiness action');
includes(ownerSupportAssistant, "label: 'Open Get Live'", 'Daily Brief install action');

for (const value of [
    'const [revealedToolGroups, setRevealedToolGroups]',
    'const authorizedNav = useMemo',
    'subNav: nav.subNav?.filter(canShowNavItem)',
    'revealedToolGroups[nav.route] === true || hasActiveAdvancedTool',
    'key: `${nav.route}::all-tools`',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.showFewerTools',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.allTools',
    'setRevealedToolGroups',
]) {
    includes(sidebar, value, 'permission-aware All tools sidebar');
}
assert(
    sidebar.indexOf('const authorizedNav = useMemo') < sidebar.indexOf('const visibleNav = useMemo'),
    'sidebar must authorize navigation before applying progressive disclosure',
);
for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'getDocs(', 'onSnapshot(', '@google/genai']) {
    excludes(sidebar, forbidden, 'local-only All tools sidebar');
}

for (const value of [
    'ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES',
    'ANSWERLATTICE_GOVERNANCE_TABS.MAP',
    'ANSWERLATTICE_GOVERNANCE_TABS.DRIFT',
    'ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE',
    'ANSWERLATTICE_GOVERNANCE_TABS.TRUST',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.allTools',
]) {
    includes(governance, value, 'Answer Quality progressive disclosure');
}

for (const value of [
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.install.installSupport',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.install.codingAgentInstall',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.install.copyCodingAgentInstall',
    'Give this to Codex, Claude Code, Cursor, Windsurf, or another coding agent',
    'Install instructions',
]) {
    includes(installCenter, value, 'coding-agent install handoff');
}

for (const value of [
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.answerQuality',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.trustedAnswers',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.answersToRecheck',
    'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedUpdates',
]) {
    includes(navigation, value, 'management navigation');
}

for (const value of [
    "ENTITIES: 'entities'",
    "DRIFT: 'drift'",
    "SIGNAL_QUEUE: 'signal-queue'",
]) {
    includes(navigation, value, 'unchanged governance route contract');
}

for (const retiredLabel of [
    "label: 'Launch Setup'",
    "label: 'Support Control'",
    "label: 'Knowledge Governance'",
    "label: 'Canonical Answers'",
    "label: 'Product Ontology'",
    "label: 'Drift Review'",
    "label: 'Signal Queue'",
    "label: 'Product Surfaces'",
    "label: 'Readiness Metrics'",
]) {
    excludes(navigation, retiredLabel, 'management navigation');
}

for (const value of [
    'How support stays manageable',
    'Add product knowledge',
    'Approve important answers',
    'Test as a customer',
    'Install support',
    'Return when attention is needed',
    'Daily Brief brings back only work that needs a decision',
]) {
    includes(activation, value, 'Activation support loop');
}

includes(setupStatus, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.setupStatus', 'Setup Status heading');
includes(setupStatus, 'Review Answer Quality', 'Setup Status answer-quality action');
includes(governance, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.trustedAnswers', 'Answer Quality tabs');
includes(governance, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics', 'Answer Quality tabs');
includes(productPages, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows', 'Product Pages and Flows heading');
includes(canonicalEditor, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.trustedAnswers', 'Trusted Answers heading');
assert(
    (canonicalEditor.match(/mode="multiple"\s+showSearch\s+optionFilterProp="label"\s+options=\{entityOptions\}/g) || []).length === 2,
    'Trusted Answer Product Topic selectors must search customer-visible labels instead of opaque ids',
);
includes(topicEditor, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics', 'Product Topics heading');
includes(driftReview, 'ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.answersToRecheck', 'Answers to Recheck heading');
includes(friction, "title: 'Product topic'", 'Product Friction topic label');
includes(friction, 'No trusted answer', 'Product Friction trusted-answer label');
includes(knowledgeMap, 'product topics', 'Knowledge Map product-topic language');
includes(knowledgeMap, 'need recheck', 'Knowledge Map freshness language');
includes(trustMetrics, 'Answers to recheck', 'Trust Metrics freshness language');
includes(trustMetrics, 'Product-topic coverage', 'Trust Metrics coverage language');
includes(answerTests, "canonical: 'Trusted answer'", 'Answer Tests trusted-answer label');
includes(coverageKpi, 'Trusted Answer Coverage', 'coverage KPI trusted-answer label');
includes(faqManagement, 'label="Product Pages & Flows"', 'FAQ Product Pages and Flows label');
includes(faqManagement, 'label="Product Topics"', 'FAQ Product Topics label');

for (const [document, label] of [
    [operatingGuide, 'progressive adoption guide'],
    [activationHelp, 'Activation help doc'],
]) {
    for (const retiredLabel of [
        'Product Surfaces',
        'Readiness Metrics',
        'Signal Queue',
        'canonical answers',
        'product entities',
        'governance screen',
    ]) {
        excludes(document, retiredLabel, label);
    }
}

excludes(language, 'firebase', 'customer-language static contract');
excludes(language, 'fetch(', 'customer-language static contract');
excludes(language, '@google/genai', 'customer-language static contract');
includes(languageDoc, 'No Firestore reads, writes, listeners, collections, indexes, Functions, Storage objects, or AI calls', 'customer-language cost boundary');
includes(languageDoc, 'Internal routes, schemas, permissions, feature flags, event names, and stored fields do not change', 'customer-language architecture boundary');
includes(languageDoc, 'The reveal is local presentation state', 'customer-language local reveal boundary');
includes(activationHelp, 'Select **All tools** inside a group', 'Activation All tools guidance');
includes(activationHelp, '**Copy coding-agent install**', 'Activation coding-agent guidance');
includes(activationFirebase, 'Compact navigation and All tools are static projections', 'Activation navigation cost boundary');
includes(activationMobile, 'All tools expands only the selected group', 'Activation mobile navigation contract');
includes(activationTests, 'All tools is built after permission and feature-flag filtering', 'Activation permission test contract');
assert(
    packageJson.scripts?.['verify:answerlattice-customer-language']
        === 'node scripts/verification/verify-answerlattice-customer-language.js',
    'package must expose the Answerlattice customer-language verifier',
);
includes(
    packageJson.scripts?.['verify:answerlattice-founder-support-controls'] || '',
    'npm run verify:answerlattice-customer-language',
    'Founder Support Controls verification chain',
);

console.log('Answerlattice customer-language verification passed.');
