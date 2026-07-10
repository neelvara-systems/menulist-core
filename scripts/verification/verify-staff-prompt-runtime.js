#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function listFiles(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return [];
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    return [entryPath];
  });
}

function assertIncludes(source, token, message) {
  assert(source.includes(token), message);
}

function assertNotIncludes(source, token, message) {
  assert(!source.includes(token), message);
}

const campaignsDal = read('src/database/campaigns/index.ts');
const desktopToday = read('src/components/templates/main-app/today/index.tsx');
const desktopStaffPrompt = read('src/components/templates/main-app/today/components/StaffPromptSection/index.tsx');
const mobileToday = read('src/components/mobile/screens/MobileHoursScreen.tsx');
const types = read('src/types/campaigns.ts');
const readme = read('__docs__/staff-prompt/README.md');
const specDoc = read('__docs__/staff-prompt/staff-prompt_spec.md');
const implDoc = read('__docs__/staff-prompt/staff-prompt_impl.md');
const marketingDoc = read('__docs__/staff-prompt/staff-prompt_marketing.md');
const firebaseDoc = read('__docs__/staff-prompt/staff-prompt_firebase.md');
const websiteDoc = read('__docs__/staff-prompt/staff-prompt_website.md');
const mobileDoc = read('__docs__/staff-prompt/staff-prompt_mobile-support.md');
const validationDoc = read('__docs__/staff-prompt/staff-prompt_validation.md');
const codeReviewDoc = read('__docs__/staff-prompt/staff-prompt_code-review.md');
const logicVerificationDoc = read('__docs__/staff-prompt/staff-prompt_logic-verification.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const productionReadinessReadme = read('__docs__/production-readiness/README.md');
const changelog = read('__docs__/changelog.md');

const activeStaffPromptHelperFiles = listFiles('src/lib/staff-prompt');
assert(
  activeStaffPromptHelperFiles.length === 0,
  `standalone staff-prompt helper files stay absent from active source${exists('src/lib/staff-prompt') ? ' (empty folder is tolerated)' : ''}`,
);

[
  'const docRef = getCampaignsSummaryDocRef(session);',
  'const docSnap = await getDoc(docRef);',
  'if (data.today?.date !== today)',
  'staffPrompt: undefined',
  'staffPrompt: data.staffPrompt',
  'physicalSurfaces: data.physicalSurfaces',
].forEach((token) => {
  assertIncludes(campaignsDal, token, `Today DAL preserves summary-read Staff Prompt token ${token}`);
});

assertNotIncludes(
  campaignsDal,
  "from '@lib/staff-prompt",
  'campaign DAL does not import a standalone staff-prompt generator',
);

[
  'staffPrompt?: StaffPrompt;',
  'export interface StaffPrompt',
  'eligible: boolean;',
  'text: string;',
].forEach((token) => {
  assertIncludes(types, token, `campaign summary type preserves Staff Prompt token ${token}`);
});

[
  '|| (staffPrompt?.eligible || false)',
  'staffPromptText: staffPrompt?.eligible ? staffPrompt.text : undefined',
  '<StaffPromptSection staffPrompt={staffPrompt} />',
].forEach((token) => {
  assertIncludes(desktopToday, token, `desktop Today gates Staff Prompt token ${token}`);
});

[
  'if (!staffPrompt?.eligible) return null;',
  'Staff prompt for today',
  'Say this when customers ask:',
  '&quot;{staffPrompt.text}&quot;',
  'Applies today',
].forEach((token) => {
  assertIncludes(desktopStaffPrompt, token, `desktop StaffPromptSection keeps read-only copy token ${token}`);
});

[
  '<Button',
  'onClick=',
  'fetch(',
  'setDoc(',
  'addDoc(',
].forEach((token) => {
  assertNotIncludes(desktopStaffPrompt, token, `desktop StaffPromptSection stays display-only without ${token}`);
});

[
  '|| (staffPrompt?.eligible || false)',
  'staffPromptText: staffPrompt?.eligible ? staffPrompt.text : undefined',
  '{staffPrompt?.eligible ? (',
  '&quot;{staffPrompt.text}&quot;',
].forEach((token) => {
  assertIncludes(mobileToday, token, `mobile Today/Hours gates Staff Prompt token ${token}`);
});

[
  'Read-only Today staff line',
  'there is no separate staff-prompt generation engine in active code',
].forEach((token) => {
  assertIncludes(readme, token, `Staff Prompt README documents runtime token ${token}`);
});

assertNotIncludes(
  readme,
  'AI-Powered Staff Training Prompts',
  'Staff Prompt README does not over-position runtime as AI-powered staff training',
);

[
  'Historical spec evidence; active runtime is read-only Today summary display; not current launch certification',
  'active runtime is the read-only Today summary consumer only',
  'no standalone Staff Prompt generator, provider call, staff-facing route, owner setting, mobile-only write, or public Staff Prompt landing page',
  '`npm run verify:staff-prompt-runtime`',
  'upstream summary-writer evidence for `platformSummary/campaigns_{sId}.staffPrompt`',
  '## Historical Definition of Done',
  'not current implementation or launch approval',
].forEach((token) => {
  assertIncludes(specDoc, token, `Staff Prompt spec preserves runtime boundary token ${token}`);
});

[
  'Historical implementation plan; active runtime is read-only Today summary display; not current launch certification',
  'Active code does not include a standalone `src/lib/staff-prompt` generator',
  '`npm run verify:staff-prompt-runtime`',
  'upstream summary-writer evidence for `platformSummary/campaigns_{sId}.staffPrompt`',
  'The table below is the January 2026 implementation-plan checklist. It is not current release approval',
  'not current implementation or launch approval',
].forEach((token) => {
  assertIncludes(implDoc, token, `Staff Prompt implementation plan preserves runtime boundary token ${token}`);
});

[
  'Source-gated marketing evidence; active runtime is read-only Today summary display; not current launch certification',
  'not standalone sales approval',
  'There is no standalone Staff Prompt product, staff-facing route, staff app, provider call, owner setting, prompt generator, mobile-only write, or public Staff Prompt landing page in active code.',
  '`npm run verify:staff-prompt-runtime`',
  'Do not pitch a standalone Staff Prompt product or promise staff behavior changes without target runtime evidence.',
  'No staff app. No scripts. Just a quiet Today line when the source data supports it.',
  'Use release-specific evidence before making numeric conversion or ticket-size claims',
  'not current sales or launch approval',
].forEach((token) => {
  assertIncludes(marketingDoc, token, `Staff Prompt marketing preserves runtime boundary token ${token}`);
});

const activeDocs = `${specDoc}\n${implDoc}\n${marketingDoc}`;
[
  '**Status:** 🔒 **LOCKED — READY FOR IMPLEMENTATION**',
  '**Document Status:** 🔒 LOCKED — Ready for implementation',
  '**Status:** 🔧 **DEV-READY**',
  '**Document Status:** 🔧 DEV-READY',
  '**Status:** 🔒 **LOCKED — USE AS-IS**',
  '**Document Status:** 🔒 LOCKED — Ready for sales team',
  'MenuList gives your staff exactly what to say',
  'one sentence that works every time',
  'MenuList watches what customers actually choose',
  'System does the watching',
  '73% of customers ask staff what to order',
  'You say it → Staff repeats it → Customers decide',
  'Owner says it → Staff mirrors it → Customers decide faster.',
  'daily intelligence that tells your staff what to say',
].forEach((token) => {
  assertNotIncludes(activeDocs, token, `Staff Prompt active docs reject stale implementation/sales token ${token}`);
});

[
  'Collections Used:** `platformSummary/campaigns_{sId}`',
  'Cloud Functions:** None',
  'No new reads, writes, deletes, listeners, Storage objects, Functions, or provider calls',
].forEach((token) => {
  assertIncludes(firebaseDoc, token, `Staff Prompt Firebase doc documents zero-incremental-cost token ${token}`);
});

[
  'Do not publish a standalone Staff Prompt page from this doc',
  'No standalone public route',
  'No staff-facing phone reference view',
  'Use this only as a supporting proof point inside Today/MenuList owner workflow copy',
].forEach((token) => {
  assertIncludes(websiteDoc, token, `Staff Prompt website doc avoids unsupported public surface token ${token}`);
});

[
  'not a separate staff chat or training portal',
  'There are no owner settings, staff-facing routes, prompt generation controls, or mobile-only writes.',
].forEach((token) => {
  assertIncludes(mobileDoc, token, `Staff Prompt mobile doc documents MobileShell read-only token ${token}`);
});

[
  'Historical Validation Result: Source Evidence Only',
  'Current release approval still requires the active production-readiness audit',
  'authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`',
  'If the release scope claims generated prompts end-to-end',
].forEach((token) => {
  assertIncludes(validationDoc, token, `Staff Prompt validation doc preserves launch boundary token ${token}`);
});

[
  '## ✅ FINAL VERDICT: READY FOR TESTING',
  '## 🚀 PRODUCTION QUALITY GATE: PASS',
  '**Ready For:** Vercel deploy + SMB testing',
  '**Status:** SHIP READY',
].forEach((token) => {
  assertNotIncludes(validationDoc, token, `Staff Prompt validation doc rejects stale launch token ${token}`);
});

[
  'This code-review note is historical source evidence only',
  'Current release approval still requires the active production-readiness audit',
  'This note does not certify the current release.',
].forEach((token) => {
  assertIncludes(codeReviewDoc, token, `Staff Prompt code review preserves launch boundary token ${token}`);
});

assertNotIncludes(
  codeReviewDoc,
  'Production ready.',
  'Staff Prompt code review does not present historical review as current production approval',
);

[
  'Historical logic verification evidence; not current launch certification',
  'Historical Logic Verification Result: Source Evidence Only',
  'Current Staff Prompt approval requires the active production-readiness audit',
  'External Certification Runbook',
  '`npm run verify:staff-prompt-runtime`',
  'authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`',
  'upstream summary-writer evidence for `platformSummary/campaigns_{sId}.staffPrompt`',
].forEach((token) => {
  assertIncludes(logicVerificationDoc, token, `Staff Prompt logic verification preserves launch boundary token ${token}`);
});

[
  '**Status:** ✅ **DEPLOYABLE**',
  'PRODUCTION READINESS: SAFE',
  '## FINAL VERDICT: ✅ DEPLOYABLE',
  'Staff Prompt logic verification complete. All 4 flows verified. Zero critical issues.',
].forEach((token) => {
  assertNotIncludes(logicVerificationDoc, token, `Staff Prompt logic verification rejects stale launch token ${token}`);
});

[
  'Staff Prompt runtime/source gate',
  'Staff Prompt validation/code-review launch-boundary checkpoint',
  'verify:staff-prompt-runtime',
  'no separate staff-facing route, helper generator, provider call, owner setting, mobile-only write, or public Staff Prompt landing page',
].forEach((token) => {
  assertIncludes(audit, token, `production audit records Staff Prompt source gate token ${token}`);
});

[
  'Clarified Staff Prompt spec/implementation/marketing docs',
  'authenticated desktop/mobile Today QA with an eligible target-store `staffPrompt`',
].forEach((token) => {
  assertIncludes(productionReadinessReadme, token, `production-readiness README records Staff Prompt launch boundary token ${token}`);
});

[
  'Staff Prompt spec, implementation, and marketing docs no longer act as implementation or sales approval',
  'verify:staff-prompt-runtime',
].forEach((token) => {
  assertIncludes(changelog, token, `changelog records Staff Prompt launch boundary token ${token}`);
});

if (failures > 0) {
  console.error(`Staff Prompt runtime verifier failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Staff Prompt runtime verifier passed.');
