#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FLAG = 'ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = {
  callback: 'src/app/api/answerlattice/knowledge-intake/github/callback/route.ts',
  connect: 'src/app/api/answerlattice/knowledge-intake/github/connect/route.ts',
  connection: 'src/app/api/answerlattice/knowledge-intake/github/connection/route.ts',
  contracts: 'src/lib/answerlattice/githubChangeIntakeContracts.ts',
  card: 'src/components/templates/answerlattice/knowledgeIntake/GitHubChangeIntakeCard.tsx',
  server: 'src/lib/answerlattice/githubChangeIntakeServer.ts',
  setup: 'src/app/api/answerlattice/knowledge-intake/github/setup/route.ts',
  webhook: 'src/app/api/answerlattice/webhooks/github/route.ts',
};

Object.entries(files).forEach(([label, relativePath]) => {
  assert(exists(relativePath), `missing GitHub change intake ${label}: ${relativePath}`);
});

const features = read('src/config/features.ts');
const functionsFeatures = read('functions-answerlattice/src/constants/features.ts');
const contracts = read(files.contracts);
const server = read(files.server);
const connect = read(files.connect);
const setup = read(files.setup);
const callback = read(files.callback);
const connection = read(files.connection);
const webhook = read(files.webhook);
const card = read(files.card);
const intakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
const intakeScreen = read('src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx');
const rootCollections = read('src/constants/answerlattice/database.ts');
const functionsCollections = read('functions-answerlattice/src/constants/database.ts');
const lifecycle = read('src/lib/answerlattice/workspaceLifecycleContracts.ts');
const dedicatedRules = read('firestore-answerlattice.rules');
const packageJson = JSON.parse(read('package.json'));
const productionEnv = read('.env.production.example');
const stagingEnv = read('.env.staging.example');
const readme = read('__docs__/answerlattice/native-knowledge-intake-connectors/README.md');
const spec = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_spec.md');
const implementation = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_impl.md');
const firebase = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_firebase.md');
const marketing = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_marketing.md');
const website = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_website.md');
const tests = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_test-cases.md');

assert(features.includes(`${FLAG}: false`), 'GitHub change intake must remain rollout-disabled until hosted QA');
assert(features.includes('Rollout remains false until GitHub App credentials and hosted QA evidence'), 'feature comment must describe the hosted-QA rollout gate');
assert(!functionsFeatures.includes(FLAG), 'GitHub change intake must not create a phantom Functions flag');

[connect, setup, callback, connection].forEach((route, index) => {
  assert(route.includes('withAuth'), `owner route ${index + 1} must require authentication`);
  assert(route.includes('MANAGE_INTEGRATIONS'), `owner route ${index + 1} must require integration permission`);
  assert(route.includes(FLAG), `owner route ${index + 1} must enforce the rollout flag`);
});
assert(connect.includes('createAnswerlatticeGitHubSetupState'), 'connect route must sign install state');
assert(setup.includes('verifyAnswerlatticeGitHubSetupState'), 'setup route must verify install state');
assert(setup.includes("getProductDeploymentTarget('answerlattice')"), 'setup must use the canonical stage-specific Answerlattice callback origin');
assert(!setup.includes('request.nextUrl.origin'), 'setup must not derive the OAuth callback origin from the request host');
assert(callback.includes("expectedPurpose: 'verify_installation'"), 'callback must verify OAuth state purpose');
assert(callback.includes('verifyAnswerlatticeGitHubUserInstallation'), 'callback must verify installation through GitHub user authorization');
assert(callback.includes('saveAnswerlatticeGitHubPendingConnection'), 'callback must stop at owner repository selection');
assert(callback.includes("getProductDeploymentTarget('answerlattice')"), 'callback must use the canonical stage-specific Answerlattice origin');
assert(!callback.includes('request.nextUrl.origin'), 'callback must not derive redirect targets from the request host');
assert(connection.includes('readBoundedJsonBody'), 'connection mutation must bound request bodies');
[connect, setup, callback, connection].forEach((route, index) => {
  assert(route.includes('hasActiveAnswerlatticeKnowledgeIntakeLicense'), `owner route ${index + 1} must enforce active subscription before setup or save`);
});
assert(intakeApi.includes('export async function hasActiveAnswerlatticeKnowledgeIntakeLicense'), 'connector must reuse the server-owned intake subscription boundary');

assert(webhook.includes('readBoundedTextBody'), 'webhook must bound raw request bodies');
assert(webhook.includes('validateGitHubWebhook'), 'webhook must verify X-Hub-Signature-256');
assert(webhook.includes('x-github-delivery'), 'webhook must require the stable GitHub delivery identifier');
assert(webhook.includes('checkRateLimit'), 'webhook must be rate limited');
assert(webhook.includes('result.failed > 0 ? 503 : 200'), 'failed admitted imports must request GitHub redelivery');
assert(contracts.includes('PROCESSING_LEASE_SECONDS'), 'delivery replay state must have a bounded processing lease');
assert(server.includes('recentDeliveries'), 'delivery replay hashes must be retained in compact connection state');
assert(server.includes('ensureKnowledgeIntakeJob'), 'GitHub changes must reuse Knowledge Intake jobs');
assert(server.includes('addKnowledgeSource'), 'GitHub changes must reuse Knowledge Intake sources');
assert(server.includes('hasActiveAnswerlatticeKnowledgeIntakeLicense(binding.tId, binding.sId)'), 'webhook intake must stop for inactive subscriptions');
assert(server.includes("sourceApproval: 'unreviewed'"), 'GitHub evidence must enter unreviewed');
assert(server.includes('MAX_SELECTED_REPOSITORIES'), 'selected repository fanout must be capped');
assert(server.includes('pendingInstallationId'), 'reconnect setup must remain separate from the active installation until owner confirmation');
assert(server.includes("connection.status === 'pending_repository_selection' && !pendingIsActive"), 'expired first-time setup must return to a restartable disconnected owner state without a cleanup write');
assert(server.includes("!pendingAvailable && ['needs_reconnect', 'suspended'].includes(current.status)"), 'reconnect and suspension states must require a newly verified provider handoff');
assert(server.includes('rollingJobMonth') && server.includes('rollingJobSlot'), 'rolling GitHub jobs must use a compact active-slot pointer');
assert(server.includes('const GITHUB_JOB_SLOT_LIMIT = 64'), 'monthly rolling capacity must cover the bounded daily admission ceiling');
assert(server.includes('for (let slot = startSlot; slot < GITHUB_JOB_SLOT_LIMIT; slot += 1)'), 'event intake must start at the compact active slot instead of rescanning old jobs');
assert(server.includes('Math.max(current.rollingJobSlot, Number(params.jobSlot))'), 'concurrent completions must not regress the rolling-job pointer');
assert(server.includes(".where('installationId', '==', params.installationId)"), 'repository-removal lifecycle must use one installation-scoped binding query');
assert(!server.includes('for (const repositoryId of Array.from(new Set(params.repositoryIds))'), 'repository removal must not issue one binding query per repository');
assert(server.includes('readJsonResponseWithLimit<unknown>'), 'GitHub provider JSON must be bounded before parsing');
assert(!server.includes('response.json()'), 'GitHub provider responses must not use unbounded JSON parsing');
assert(server.includes("githubFetch('https://api.github.com/graphql'"), 'merged pull request metadata must use a narrow GraphQL query');
assert(server.includes('nodes { path }'), 'pull request metadata query must request file paths only');
assert(!server.includes('/pulls/'), 'GitHub intake must not use the REST files response that includes patch text');
assert(server.includes('config.stateSecret !== config.webhookSecret'), 'setup and webhook HMAC secrets must be distinct');
assert(!server.includes('/contents/'), 'GitHub change intake must not fetch repository contents');
assert(!server.includes('.patch'), 'GitHub change intake must not fetch or store patches');
assert(!server.includes('git clone'), 'GitHub change intake must not clone repositories');

assert(card.includes('Source code and patches are not stored.'), 'owner control must state the bounded source-code boundary');
assert(card.includes('requiresVerifiedReconnect'), 'owner control must not reactivate suspended or stale access through a settings save');
assert(card.includes('canDisconnect'), 'pending GitHub setup must remain cancellable');
assert(card.includes('useAnswerlatticeAccess'), 'owner control must inherit Answerlattice access state');
assert(intakeScreen.includes('<GitHubChangeIntakeCard'), 'GitHub control must be mounted in Teach Answerlattice');
assert(intakeScreen.includes(`FEATURE_FLAGS.${FLAG}`), 'GitHub control mount must remain rollout-gated');

const collectionName = "ANSWERLATTICE_GITHUB_INTAKE_BINDINGS: 'answerlattice_githubIntakeBindings'";
assert(rootCollections.includes(collectionName), 'root Answerlattice binding collection constant missing');
assert(functionsCollections.includes(collectionName), 'Functions binding collection mirror missing');
assert(lifecycle.includes('ANSWERLATTICE_GITHUB_INTAKE_BINDINGS'), 'workspace lifecycle must include GitHub bindings');
assert(lifecycle.includes("ANSWERLATTICE_GITHUB_INTAKE_BINDINGS, productIdentity: 'dedicated', scopeFields: ['sId']"), 'binding erasure must query only its stored workspace scope field');
assert(dedicatedRules.includes('match /answerlattice_githubIntakeBindings/{docId}'), 'dedicated rules must name the server-only binding collection');
assert(dedicatedRules.includes('match /answerlattice_githubIntakeBindings/{docId} {\n      allow read, write: if false;'), 'GitHub bindings must be server-only');

[
  'ANSWERLATTICE_GITHUB_APP_ID',
  'ANSWERLATTICE_GITHUB_APP_SLUG',
  'ANSWERLATTICE_GITHUB_APP_PRIVATE_KEY',
  'ANSWERLATTICE_GITHUB_APP_CLIENT_ID',
  'ANSWERLATTICE_GITHUB_APP_CLIENT_SECRET',
  'ANSWERLATTICE_GITHUB_WEBHOOK_SECRET',
  'ANSWERLATTICE_GITHUB_STATE_SECRET',
].forEach((key) => {
  assert(productionEnv.includes(key), `production env example missing ${key}`);
  assert(stagingEnv.includes(key), `staging env example missing ${key}`);
});

assert(packageJson.scripts['test:answerlattice-github-change-intake'], 'GitHub change intake contract test script missing');
assert(packageJson.scripts['verify:answerlattice-native-intake-connectors'].includes('test:answerlattice-github-change-intake'), 'connector verifier must run contract tests');

assert(readme.includes('GitHub Change Intake'), 'README must name the admitted provider');
assert(spec.includes('only provider-specific connector admitted'), 'spec must preserve the one-provider boundary');
assert(implementation.includes('## Existing-System Wiring'), 'implementation must document existing system wiring');
assert(firebase.includes('no polling'), 'Firebase contract must prohibit polling');
assert(marketing.includes('HOLD UNTIL HOSTED QA AND FLAG ACTIVATION'), 'marketing must remain on rollout hold');
assert(website.includes('DEFERRED BY OWNER'), 'public website work must remain deferred');
assert(tests.includes('Webhook signature is verified'), 'test plan must cover signed webhook behavior');

console.log('Answerlattice GitHub change intake boundary passed.');
