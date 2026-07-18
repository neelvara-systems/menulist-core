#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function addCheck(name, passed, detail = '') {
  checks.push({ name, passed, detail });
}

function contains(filePath, patterns, name) {
  const content = read(filePath);
  const missing = patterns.filter((pattern) => {
    if (pattern instanceof RegExp) return !pattern.test(content);
    return !content.includes(pattern);
  });
  addCheck(name, missing.length === 0, missing.map(String).join(', '));
}

function notContains(filePath, patterns, name) {
  const content = read(filePath);
  const found = patterns.filter((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(content);
    return content.includes(pattern);
  });
  addCheck(name, found.length === 0, found.map(String).join(', '));
}

function pathMissing(relativePath, name) {
  addCheck(name, !exists(relativePath), relativePath);
}

contains(
  'src/lib/onboarding/starterActivation.ts',
  [
    'STARTER_DISTRIBUTION_ACTIVATION_TARGET = 2',
    'STARTER_ACTIVATION_SIGNAL_DETAILS',
    'menulist_recorded',
    'owner_confirmed_external',
    'buildStarterActivationSummary',
    'systemRecordedCount',
    'ownerConfirmedCount',
    'normalizeStarterActivationTimestamp',
    'applyStarterActivationSignalToStoreDetails',
    'applyStarterPresenceUpdateToStoreDetails',
  ],
  'Starter activation has a validated shared summary and acknowledgement projection model',
);

contains(
  'src/components/onboarding/StarterActivationBanner.tsx',
  [
    'buildStarterActivationSummary',
    'How we know: MenuList recorded',
    'owner confirmed',
  ],
  'Starter banner explains how completed activation actions are known',
);

contains(
  'src/components/templates/main-app/useMenuList/PresenceMonitor.tsx',
  [
    'buildStarterActivationSummary',
    'Activation proof',
    'How we know: MenuList recorded',
    'Owner confirmed this external placement.',
    'MenuList',
  ],
  'Desktop discovery setup shows activation proof and separates recorded versus owner-confirmed actions',
);

contains(
  'src/components/mobile/components/PresenceMonitor.tsx',
  [
    'buildStarterActivationSummary',
    "t('activationTitle')",
    "t('activationHowKnown'",
    "t('ownerConfirmed')",
    "t('menuListRecorded')",
  ],
  'Mobile discovery setup shows the same activation proof state',
);

contains(
  'public/locales/menulist.ai/en-US.json',
  [
    '"activationTitle": "Activation proof"',
    '"activationHowKnown": "How we know: MenuList recorded {systemCount}, owner confirmed {ownerCount}."',
    '"ownerConfirmed": "Owner confirmed"',
    '"menuListRecorded": "MenuList"',
  ],
  'English mobile discovery copy includes activation proof labels',
);

contains(
  'public/locales/menulist.ai/hi-IN.json',
  [
    '"trackingNote": "Some steps are recorded by MenuList. External platforms are owner-confirmed."',
    '"activationTitle": "Activation proof"',
    '"activationHowKnown": "How we know: MenuList recorded {systemCount}, owner confirmed {ownerCount}."',
    '"ownerConfirmed": "Owner confirmed"',
    '"menuListRecorded": "MenuList"',
  ],
  'Hindi mobile discovery copy has the required activation proof keys',
);

contains(
  'src/database/stores/index.tsx',
  [
    'assertStarterActivationSignalUpdateSucceeded',
    'recordStarterActivationSignal',
    'updateMenuPresence',
    'starterActivationSignals.actions',
    'menuPresence.${surface}',
    'shouldRecordStarterActivationSignal(store as StoreDataType)',
    'STARTER_ACTIVATION_PRESENCE_SIGNAL_BY_SURFACE[surface]',
    'deleteField()',
    'recordedAt: now',
  ],
  'Activation truth uses acknowledged authoritative store-local starter and presence fields',
);

contains(
  'src/components/mobile/screens/MobileShareScreen.tsx',
  [
    'assertStarterActivationSignalUpdateSucceeded',
    'applyStarterActivationSignalToStoreDetails',
    'setStoreDetails',
  ],
  'Mobile sharing refreshes acknowledged activation truth without another read',
);

contains(
  'src/components/templates/main-app/useMenuList/index.tsx',
  [
    'assertStarterActivationSignalUpdateSucceeded',
    'applyStarterActivationSignalToStoreDetails',
    'setStoreDetails',
  ],
  'Desktop sharing refreshes acknowledged activation truth without another read',
);

notContains(
  'src/lib/signaldesk/workflowServer.ts',
  [
    'recordStarterActivationSignal',
    'updateMenuPresence',
    'starterActivationSignals.actions',
    'menuPresence.',
  ],
  'SignalDesk workflow server does not mutate MenuList starter activation truth',
);

pathMissing(
  'src/app/(website)/activation-concierge',
  'No standalone public Activation Concierge route was added',
);

pathMissing(
  'src/app/(website)/signaldesk',
  'No public SignalDesk website route was added',
);

contains(
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_impl.md',
  [
    'Decision implemented',
    'buildStarterActivationSummary',
    'no new route',
    'SignalDesk remains observer-only',
  ],
  'Activation Concierge docs record the implemented existing-route decision',
);

for (const docPath of [
  '__docs__/menulist-activation-concierge/README.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_spec.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_impl.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_firebase.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_mobile-support.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_helpdoc.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_marketing.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_website.md',
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_test-cases.md',
]) {
  contains(docPath, ['Local source complete'], `${docPath} local source status`);
}

notContains(
  '__docs__/menulist-activation-concierge/menulist-activation-concierge_marketing.md',
  ['starter activation tracks whether the link is actually used on customer surfaces'],
  'Activation Concierge marketing avoids unsupported customer-use proof',
);

const failed = checks.filter((check) => !check.passed);

checks.forEach((check) => {
  const marker = check.passed ? 'PASS' : 'FAIL';
  const detail = check.passed ? '' : ` -> ${check.detail}`;
  console.log(`${marker} ${check.name}${detail}`);
});

if (failed.length > 0) {
  console.error(`\n${failed.length} activation concierge verification check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} activation concierge verification checks passed.`);
