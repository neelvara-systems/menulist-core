const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const contract of ['functions/src/sharedData/whatsappOs.ts', 'functions-answerlattice/src/sharedData/whatsappOs.ts']) {
  assert(read('src/data/shared/whatsappOs.ts') === read(contract), `${contract} must exactly mirror the root WhatsAppOS contract`);
}
for (const file of [
  '__docs__/whatsapp-os/README.md',
  '__docs__/whatsapp-os/whatsapp-os_spec.md',
  '__docs__/whatsapp-os/whatsapp-os_impl.md',
  '__docs__/whatsapp-os/whatsapp-os_firebase.md',
  '__docs__/whatsapp-os/whatsapp-os_mobile-support.md',
  '__docs__/whatsapp-os/whatsapp-os_test-cases.md',
  'src/lib/whatsapp-os/provider.ts',
  'functions/src/whatsappOs/provider.ts',
  'functions/src/whatsappOs/webhook.ts',
  'functions-answerlattice/src/whatsappOs/webhook.ts',
  'functions-answerlattice/src/whatsappOs/http.ts',
]) assert(fs.existsSync(path.join(ROOT, file)), `${file} is required by WhatsAppOS`);

for (const provider of ['src/lib/whatsapp-os/provider.ts', 'functions/src/whatsappOs/provider.ts']) {
  const source = read(provider);
  assert(source.includes('assertWhatsAppOsSendRequest'), `${provider} must validate the shared request contract`);
  assert(source.includes('WHATSAPP_OS_MESSAGE_REFS'), `${provider} must persist a provider reference`);
  assert(source.includes('runTransaction'), `${provider} must collision-check provider references`);
  assert(!source.includes('console.log'), `${provider} must not log provider payloads`);
}
const sharedContract = read('src/data/shared/whatsappOs.ts');
assert(sharedContract.includes('WHATSAPP_OS_TEMPLATE_REGISTRY'), 'WhatsAppOS must own a product-scoped lifecycle template registry');
assert(sharedContract.includes("approvalState !== 'approved'"), 'Unapproved lifecycle templates must fail before provider work');
assert(sharedContract.includes('WHATSAPP_OS_WORKFLOW_CLASS_MISMATCH'), 'Workflow and message classification must be runtime validated');
assert(sharedContract.includes("headerType?: 'document'"), 'WhatsAppOS templates must declare document-header policy explicitly');
assert(sharedContract.includes('MAX_DOCUMENT_BYTES: 8 * 1024 * 1024'), 'WhatsAppOS PDF attachments must remain bounded below provider limits');
assert(sharedContract.includes("contentType: 'application/pdf'"), 'WhatsAppOS document attachments must remain PDF-only');
assert(sharedContract.includes("contentBase64.startsWith('JVBERi0')"), 'WhatsAppOS document attachments must require a PDF file signature');
assert(sharedContract.includes("headerType: 'document'"), 'Billing-document delivery must require a document-header template');
const webhook = read('functions/src/whatsappOs/webhook.ts');
assert(webhook.includes('shouldAdvanceWhatsAppOsProviderStatus'), 'Webhook status changes must be monotonic');
assert(webhook.includes('transaction.create(receiptRef'), 'Webhook receipts must be idempotent');
assert(webhook.includes('transaction.create(mappingRef'), 'An early provider callback must leave a resolvable placeholder');
assert(webhook.includes("body.object !== 'whatsapp_business_account'"), 'Webhook parsing must admit only WhatsApp Business Account payloads');
assert(webhook.includes("rawChange.field !== 'messages'"), 'Webhook parsing must admit only message changes');
assert(webhook.indexOf('transaction.get(mappingRef)') < webhook.indexOf('transaction.create(receiptRef'), 'Webhook transaction must finish reads before writes');
assert(!webhook.includes('rawStatus.recipient_id'), 'Webhook persistence must not retain recipient phone values');
const answerlatticeWebhook = read('functions-answerlattice/src/whatsappOs/webhook.ts');
assert(answerlatticeWebhook.includes("request.header('x-hub-signature-256')"), 'Answerlattice webhook must verify the Meta signature');
assert(answerlatticeWebhook.includes('timingSafeEqual'), 'Answerlattice webhook signature comparison must be timing-safe');
assert(answerlatticeWebhook.includes('shouldAdvanceWhatsAppOsProviderStatus'), 'Answerlattice webhook states must be monotonic');
assert(answerlatticeWebhook.includes("body.object !== 'whatsapp_business_account'"), 'Answerlattice webhook must admit only WhatsApp Business Account payloads');
assert(!answerlatticeWebhook.includes('!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WHATSAPP_OS_PROVIDER_SEND'), 'Answerlattice webhook reconciliation must survive an outbound-send pause');
assert(read('functions-answerlattice/src/constants/features.ts').includes('ENABLE_ANSWERLATTICE_WHATSAPP_OS_PROVIDER_SEND: false'), 'Answerlattice provider send must default off');
const rootProvider = read('src/lib/whatsapp-os/provider.ts');
assert(rootProvider.includes("request.productCode === 'AL' ? answerlatticeFirestoreAdmin : firestoreAdmin"), 'Answerlattice provider references must stay in the Answerlattice Firebase project');
assert(rootProvider.includes("current.get('unresolved') === true"), 'Provider reference persistence must reconcile early webhook placeholders');
assert(rootProvider.includes('providerStatusAt: statusOccurredAt'), 'Early webhook reconciliation must advance the owning workflow document');
assert(rootProvider.includes('WHATSAPP_OS_PROVIDER_REFERENCE_PERSIST_UNKNOWN'), 'Accepted provider sends must preserve ambiguous mapping-persistence outcomes');
assert(rootProvider.includes('uploadProviderDocument'), 'App-side WhatsAppOS must upload private PDF bytes to Meta before template delivery');
assert(rootProvider.includes('deleteRejectedProviderDocument'), 'App-side WhatsAppOS must clean up orphaned Meta media after a confirmed send rejection');
assert(rootProvider.includes("method: 'DELETE'"), 'App-side WhatsAppOS media cleanup must use the provider delete endpoint');
assert(rootProvider.includes("type: 'document'"), 'App-side WhatsAppOS must send the uploaded PDF as a document header');
const functionsProvider = read('functions/src/whatsappOs/provider.ts');
assert(functionsProvider.includes('uploadProviderDocument'), 'Functions WhatsAppOS must upload private PDF bytes to Meta before template delivery');
assert(functionsProvider.includes('deleteRejectedProviderDocument'), 'Functions WhatsAppOS must clean up orphaned Meta media after a confirmed send rejection');
assert(functionsProvider.includes('media.mediaId && !result.ambiguous'), 'Functions WhatsAppOS must preserve media when the provider send outcome is ambiguous');
assert(functionsProvider.includes("type: 'document'"), 'Functions WhatsAppOS must send the uploaded PDF as a document header');

const indexes = readJson('firestore.indexes.json');
for (const collectionGroup of ['whatsappOsMessageRefs', 'whatsappOsWebhookReceipts']) {
  assert(indexes.fieldOverrides.some((entry) => entry.collectionGroup === collectionGroup && entry.fieldPath === 'expiresAt' && entry.ttl === true), `TTL is required for ${collectionGroup}`);
}
const answerlatticeIndexes = readJson('firestore-answerlattice.indexes.json');
for (const collectionGroup of ['answerlattice_whatsappOsMessageRefs', 'answerlattice_whatsappOsWebhookReceipts']) {
  assert(answerlatticeIndexes.fieldOverrides.some((entry) => entry.collectionGroup === collectionGroup && entry.fieldPath === 'expiresAt' && entry.ttl === true), `Answerlattice TTL is required for ${collectionGroup}`);
}
const phoneOtp = read('src/lib/auth/phoneOtp.ts');
assert(phoneOtp.includes("workflow: 'phone_otp'"), 'Phone OTP must route through WhatsAppOS');
const adapter = read('functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts');
assert(adapter.includes('postWhatsAppOsProviderBody'), 'Messaging onboarding must reuse the WhatsAppOS provider client');
const rootOwnerChannel = read('src/lib/owner-notifications/channels/whatsapp.ts');
assert(rootOwnerChannel.includes('getWhatsAppOsTemplateDefinition'), 'Owner lifecycle delivery must resolve templates from WhatsAppOS governance');
assert(rootOwnerChannel.includes('templateDefinition?.messageClasses[0] || params.messageClass'), 'Owner lifecycle delivery must use the governed template classification');
assert(read('functions/src/ownerNotifications/processor.ts').includes('templateDefinition?.messageClasses[0] || params.messageClass'), 'Functions owner lifecycle delivery must use the governed template classification');
assert(!read('src/lib/owner-notifications/index.ts').includes('event.metadata.whatsappTemplateName'), 'Owner events must not inject arbitrary Meta template names');
assert(!read('functions/src/ownerNotifications/processor.ts').includes('params.metadata.whatsappTemplateName'), 'Functions owner events must not inject arbitrary Meta template names');

console.log('WhatsAppOS source, provider, webhook, retention, OTP, and onboarding checks passed.');
