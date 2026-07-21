#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FLAG = 'ENABLE_ANSWERLATTICE_SIGNAL_QUALITY';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listSourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const features = read('src/config/features.ts');
const functionsFeatures = read('functions-answerlattice/src/constants/features.ts');
const nightly = read('functions-answerlattice/src/answerlattice/answerlatticeNightly.ts');
const legacyMutation = read('src/lib/answerlattice/signalMutation.ts');
const proposalReview = read('src/components/templates/answerlattice/MutationProposalReview.tsx');
const governanceContracts = read('src/lib/answerlattice/governanceContracts.ts');
const governanceServer = read('src/lib/answerlattice/governanceServer.ts');
const functionsFlags = read('functions-answerlattice/src/constants/features.ts');
const integrationAdapters = [
  'functions-answerlattice/src/integrations/adapters/slackAdapter.ts',
  'functions-answerlattice/src/integrations/adapters/emailAdapter.ts',
  'functions-answerlattice/src/integrations/adapters/githubAdapter.ts',
  'functions-answerlattice/src/integrations/adapters/linearAdapter.ts',
].map(read).join('\n');
const readme = read('__docs__/answerlattice/signal-quality-scoring/README.md');
const firebase = read('__docs__/answerlattice/signal-quality-scoring/signal-quality-scoring_firebase.md');
const marketing = read('__docs__/answerlattice/signal-quality-scoring/signal-quality-scoring_marketing.md');
const tracker = read('__docs__/answerlattice/system-inventory/answerlattice-feature-flow-audit-tracker.md');

assert(features.includes(`${FLAG}: false`), 'signal-quality placeholder must remain disabled');
assert(features.includes('RESERVED ONLY: no app or Functions runtime reads this flag.'), 'signal-quality comment must state the no-runtime boundary');
assert(!functionsFeatures.includes(FLAG), 'a phantom Functions signal-quality flag must not exist');

const runtimeFlagReferences = [
  ...listSourceFiles('src'),
  ...listSourceFiles('functions-answerlattice/src'),
  ...listSourceFiles('packages/answerlattice-web/src'),
  ...listSourceFiles('public/widget'),
].filter((relativePath) => relativePath !== 'src/config/features.ts')
  .filter((relativePath) => read(relativePath).includes(FLAG));
assert(
  runtimeFlagReferences.length === 0,
  `reserved signal-quality flag must have no runtime consumers: ${runtimeFlagReferences.join(', ')}`,
);

const legacyMutationCallers = [
  ...listSourceFiles('src'),
  ...listSourceFiles('functions-answerlattice/src'),
  ...listSourceFiles('packages/answerlattice-web/src'),
  ...listSourceFiles('public/widget'),
]
  .filter((relativePath) => relativePath !== 'src/lib/answerlattice/signalMutation.ts')
  .filter((relativePath) => read(relativePath).includes('runSignalMutationEngine'));
assert(
  legacyMutationCallers.length === 0,
  `legacy app signal mutation utility must not be treated as production scoring: ${legacyMutationCallers.join(', ')}`,
);

assert(legacyMutation.includes('severity × time decay'), 'legacy weighting reference must remain identifiable');
assert(nightly.includes('escalationCount: cluster.escalation'), 'production proposals must preserve escalation evidence');
assert(!nightly.includes('async function autoAdjustConfidence'), 'support usage must not auto-adjust canonical answer confidence');
assert(nightly.includes("reason: 'unsafe_usage_proxy_retired'"), 'nightly logs must explain the retired confidence adjustment task');
assert(functionsFlags.includes('Canonical answer confidence is never auto-adjusted'), 'Functions flag contract must reject support-volume confidence mutation');
assert(governanceContracts.includes('escalationCount: z.number().int().nonnegative().max(1_000_000).optional()'), 'stored escalation evidence boundary');
assert(!governanceServer.includes('Number(proposal.confidenceScore'), 'proposal evidence scores must not become canonical answer confidence');
assert(governanceServer.includes("validationSource: 'manual'"), 'human approval must remain the canonical validation authority');
assert(proposalReview.includes('Evidence: {proposal.signalSummary.ticketCount} tickets'), 'proposal review transparent evidence counts');
assert(proposalReview.includes('{proposal.signalSummary.escalationCount || 0} escalations'), 'proposal review escalation count');
assert(!proposalReview.includes("'Signal strength'"), 'proposal review must not show an opaque signal-strength score');
assert(proposalReview.includes('Extractor score:'), 'ticket-resolution extraction must be labeled as an extractor score');
assert(!proposalReview.includes('Extractor confidence:'), 'ticket-resolution extraction must not be presented as answer confidence');
assert(!integrationAdapters.includes('**Confidence:**'), 'workflow notifications must not publish proposal confidence');
assert(!integrationAdapters.includes('<strong>Confidence:</strong>'), 'email notifications must not publish proposal confidence');

const publicCopy = listSourceFiles('src/app/sites/answerlattice')
  .map((relativePath) => read(relativePath))
  .join('\n')
  .toLowerCase();
[
  'signal quality score',
  'ai-ranked knowledge gaps',
  'calibrated proposal confidence',
].forEach((claim) => {
  assert(!publicCopy.includes(claim), `public copy must not claim ${claim}`);
});

assert(readme.includes('VALIDATE FIRST - RESERVED SCORING PLACEHOLDER'), 'signal-quality README decision boundary');
assert(readme.includes('At least 100 reviewed proposals across at least three active workspaces.'), 'signal-quality calibration evidence gate');
assert(firebase.includes('adds no read or write operation'), 'signal-quality zero-operation delta');
assert(marketing.includes('No public scoring claim approved'), 'signal-quality marketing hold');
assert(
  tracker.includes('### Feature 42 — Signal-Quality Scoring\n\n**Status:** Local source complete'),
  'signal-quality feature tracker completion state',
);

console.log('Answerlattice signal-quality scoring boundary passed.');
