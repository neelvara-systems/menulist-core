const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contractPaths = [
  'src/data/shared/emailOs.ts',
  'functions/src/sharedData/emailOs.ts',
  'functions-answerlattice/src/sharedData/emailOs.ts',
];
const canonicalContract = read(contractPaths[0]);
for (const contractPath of contractPaths.slice(1)) {
  assert(read(contractPath) === canonicalContract, `${contractPath} must exactly mirror the root EmailOS contract`);
}

const requiredFiles = [
  '__docs__/email-os/README.md',
  '__docs__/email-os/email-os_spec.md',
  '__docs__/email-os/email-os_impl.md',
  '__docs__/email-os/email-os_marketing.md',
  '__docs__/email-os/email-os_website.md',
  '__docs__/email-os/email-os_helpdoc.md',
  '__docs__/email-os/email-os_firebase.md',
  '__docs__/email-os/email-os_mobile-support.md',
  '__docs__/email-os/email-os_test-cases.md',
  '__docs__/email-os/email-os_validation.md',
  'src/lib/email-os/provider.ts',
  'src/lib/email-os/render.ts',
  'functions/src/emailOs/provider.ts',
  'functions/src/emailOs/render.ts',
  'functions/src/emailOs/webhook.ts',
  'functions-answerlattice/src/emailOs/provider.ts',
  'functions-answerlattice/src/emailOs/http.ts',
  'functions-answerlattice/src/emailOs/render.ts',
  'functions-answerlattice/src/emailOs/webhook.ts',
];
for (const filePath of requiredFiles) {
  assert(fs.existsSync(path.join(ROOT, filePath)), `${filePath} is required by EmailOS`);
}

const answerlatticeWebhookTransport = read('functions-answerlattice/src/emailOs/http.ts');
const answerlatticeFunctionSecrets = read('functions-answerlattice/src/config/secrets.ts');
assert(answerlatticeWebhookTransport.includes("invoker: 'public'"), 'Answerlattice EmailOS webhook transport must admit external Resend delivery');
assert(answerlatticeWebhookTransport.includes('ANSWERLATTICE_SECRET_GROUPS.EMAIL_OS_WEBHOOK'), 'Answerlattice EmailOS webhook must bind only its webhook secret group');
assert(answerlatticeFunctionSecrets.includes("RESEND_WEBHOOK_SECRET: defineSecret('ANSWERLATTICE_RESEND_WEBHOOK_SECRET')"), 'Answerlattice EmailOS webhook signing secret must be required at deployment');
assert(answerlatticeFunctionSecrets.includes('EMAIL_OS_WEBHOOK: ['), 'Answerlattice EmailOS webhook must use a required secret group');
assert(!answerlatticeFunctionSecrets.includes("RESEND_WEBHOOK_SECRET: defineOptionalProviderSecret('ANSWERLATTICE_RESEND_WEBHOOK_SECRET')"), 'Answerlattice EmailOS webhook signing secret must not depend on the optional outbound-provider gate');

const rootFlags = read('src/config/features.ts');
const menuListFlags = read('functions/src/constants/features.ts');
const answerlatticeFlags = read('functions-answerlattice/src/constants/features.ts');
assert(rootFlags.includes('ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND: false'), 'MenuList root provider send must default off');
assert(rootFlags.includes('ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND: true'), 'Answerlattice root provider path must be enabled and remain credential-gated');
assert(rootFlags.includes('ENABLE_CAMPAIGNCUE_EMAIL_OS_PROVIDER_SEND: false'), 'CampaignCue provider send must default off');
assert(menuListFlags.includes('ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND: false'), 'MenuList Functions provider send must default off');
assert(answerlatticeFlags.includes('ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND: true'), 'Answerlattice Functions provider path must be enabled and remain credential-gated');
assert(rootFlags.includes('ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND: false'), 'SignalDesk provider send must remain off');
assert(read('functions/src/config/secrets.ts').includes('SECRETS.MENULIST_RESEND_API_KEY'), 'MenuList Functions must declare its Resend API secret');
assert(answerlatticeFunctionSecrets.includes('ANSWERLATTICE_SECRETS.RESEND_API_KEY'), 'Answerlattice Functions must declare its Resend API secret');

for (const webhookPath of ['functions/src/emailOs/webhook.ts', 'functions-answerlattice/src/emailOs/webhook.ts']) {
  const source = read(webhookPath);
  assert(source.includes('.webhooks.verify('), `${webhookPath} must verify the provider signature`);
  assert(source.includes('request.rawBody'), `${webhookPath} must verify the raw request body`);
  assert(source.includes('runTransaction'), `${webhookPath} must deduplicate receipts transactionally`);
  assert(source.includes('shouldAdvanceEmailOsDeliveryStatus'), `${webhookPath} must enforce monotonic delivery state`);
  assert(source.includes('event.localDeliveryId'), `${webhookPath} must resolve early webhooks by the internal delivery tag`);
  assert(source.includes('isEmailOsProviderEventBoundToProduct'), `${webhookPath} must reject events without a matching product delivery`);
  assert(source.includes('delivery_not_bound'), `${webhookPath} must ignore unbound shared-team events without writing product state`);
  assert(source.includes('providerMessageIdHash'), `${webhookPath} must retain provider identity on delivery updates`);
  assert(source.indexOf('transaction.get(query)') < source.indexOf('transaction.create(receiptRef'), `${webhookPath} must complete transaction reads before writes`);
  assert(source.includes("FieldValue.delete()"), `${webhookPath} must prevent active suppressions from expiring`);
  assert(!source.includes('EMAIL_OS_PROVIDER_SEND) {'), `${webhookPath} reconciliation must survive an outbound-send pause`);
}

for (const providerPath of [
  'src/lib/email-os/provider.ts',
  'functions/src/emailOs/provider.ts',
  'functions-answerlattice/src/emailOs/provider.ts',
]) {
  const source = read(providerPath);
  assert(source.includes('idempotencyKey'), `${providerPath} must send with an idempotency key`);
  assert(source.includes('transaction.create(deliveryRef'), `${providerPath} must claim the local delivery before calling the provider`);
  assert(source.includes('EMAIL_OS_DELIVERY_TAG_NAME'), `${providerPath} must attach the internal delivery identity tag`);
  assert(source.includes('EMAIL_OS_PRODUCT_TAG_NAME'), `${providerPath} must attach the immutable product-routing tag`);
  assert(source.includes("'outcome_unknown'"), `${providerPath} must preserve ambiguous provider outcomes`);
  assert(source.includes('EMAIL_OS_SUPPRESSIONS'), `${providerPath} must check local suppressions`);
  assert(!source.includes('console.log'), `${providerPath} must not log raw provider data`);
}

const ownerEmail = read('src/lib/owner-notifications/channels/email.ts');
const ownerProcessor = read('src/lib/owner-notifications/index.ts');
const genericNotifications = read('src/lib/notifications/index.ts');
assert(ownerEmail.includes('productCode: OwnerNotificationProductId'), 'Owner email must require an ML or AL product identity');
assert(ownerProcessor.includes('productCode: event.productId'), 'Owner notification processing must retain the event product identity');
assert(genericNotifications.includes("productId !== PRODUCT_IDS.MENULIST && productId !== PRODUCT_IDS.ANSWERLATTICE"), 'Generic notifications must reject unsupported product identities');
assert(canonicalContract.includes("CC: {\n        productCode: 'CC',\n        activationState: 'export_only'"), 'CampaignCue must remain export-only');
assert(canonicalContract.includes("MC: {\n        productCode: 'MC',\n        activationState: 'disabled'"), 'MyCodex email must remain disabled');
assert(canonicalContract.includes('MAX_TAG_COUNT: 6'), 'Two provider tag slots must remain reserved for product and delivery identity');
assert(canonicalContract.includes('MAX_ATTACHMENT_COUNT: 1'), 'EmailOS must admit at most one bounded attachment');
assert(canonicalContract.includes("contentType: 'application/pdf'"), 'EmailOS attachments must stay PDF-only');
assert(canonicalContract.includes("contentBase64.startsWith('JVBERi0')"), 'EmailOS attachments must require a PDF file signature');
for (const providerPath of ['src/lib/email-os/provider.ts', 'functions/src/emailOs/provider.ts', 'functions-answerlattice/src/emailOs/provider.ts']) {
  assert(read(providerPath).includes('attachments: envelope.attachments?.map'), `${providerPath} must forward validated local attachment bytes`);
}
assert(canonicalContract.includes("EMAIL_OS_PRODUCT_TAG_NAME = 'email_os_product'"), 'EmailOS must define the reserved product-routing tag');

const ttlPolicies = [
  ['firestore.indexes.json', 'emailOsDeliveries', 'emailOsWebhookReceipts', 'emailOsSuppressions'],
  ['firestore-answerlattice.indexes.json', 'answerlattice_emailOsDeliveries', 'answerlattice_emailOsWebhookReceipts', 'answerlattice_emailOsSuppressions'],
];
for (const [indexPath, ...collectionGroups] of ttlPolicies) {
  const indexConfig = readJson(indexPath);
  for (const collectionGroup of collectionGroups) {
    assert(indexConfig.fieldOverrides.some((entry) => (
      entry.collectionGroup === collectionGroup && entry.fieldPath === 'expiresAt' && entry.ttl === true
    )), `${indexPath} must enable expiresAt TTL for ${collectionGroup}`);
  }
}

for (const packagePath of ['package.json', 'functions/package.json', 'functions-answerlattice/package.json']) {
  const packageJson = readJson(packagePath);
  assert(packageJson.dependencies['@react-email/render'] === '2.1.0', `${packagePath} must pin @react-email/render`);
  assert(packageJson.dependencies.resend === '6.20.0', `${packagePath} must pin resend`);
}

console.log('EmailOS source, boundary, dependency, and activation checks passed.');
