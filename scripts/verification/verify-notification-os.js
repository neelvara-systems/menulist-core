const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  read("src/data/shared/notificationOs.ts") ===
    read("functions/src/sharedData/notificationOs.ts"),
  "NotificationOS root and Functions contracts must match exactly",
);
for (const file of [
  "__docs__/notification-os/README.md",
  "__docs__/notification-os/notification-os_spec.md",
  "__docs__/notification-os/notification-os_impl.md",
  "__docs__/notification-os/notification-os_firebase.md",
  "__docs__/notification-os/notification-os_mobile-support.md",
  "__docs__/notification-os/notification-os_test-cases.md",
  "src/app/api/notification-os/preferences/route.ts",
  "src/lib/notification-os/onboardingDefaults.ts",
  "src/lib/notification-os/readiness.ts",
  "src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx",
  "src/components/mobile/screens/MobileNotificationSettingsScreen.tsx",
])
  assert(
    fs.existsSync(path.join(ROOT, file)),
    `${file} is required by NotificationOS`,
  );

const rootProcessor = read("src/lib/owner-notifications/index.ts");
const functionsProcessor = read(
  "functions/src/ownerNotifications/processor.ts",
);
for (const [name, source] of [
  ["root", rootProcessor],
  ["functions", functionsProcessor],
]) {
  assert(
    source.includes("planNotificationOsChannels"),
    `${name} owner processor must use the shared planner`,
  );
  assert(
    source.includes("result.ambiguous"),
    `${name} owner processor must preserve ambiguous provider outcomes`,
  );
  assert(
    /event\.priority === ["']critical["']\s*\?\s*["']all_eligible_critical["']/.test(source),
    `${name} owner processor must bypass non-critical channel preference only for critical events`,
  );
}
const recipientResolver = read(
  "src/lib/owner-notifications/recipientResolver.ts",
);
assert(
  !recipientResolver.includes(
    "phoneVerified: Boolean(params.whatsappNumber) && (\n            whatsappConsent",
  ),
  "WhatsApp consent must never be treated as phone verification",
);
assert(
  !functionsProcessor.includes(
    "phoneVerified: Boolean(whatsappNumber) && (\n      whatsappConsent",
  ),
  "Functions must keep phone verification separate from consent",
);

const firingSources = {
  "ML:STORE_PUBLISHED": read("functions/src/triggers/operations.ts"),
  "ML:MENU_PUBLISH_FAILED": read("functions/src/triggers/operations.ts"),
  "ML:PAYMENT_SUCCESS":
    read("src/app/api/razorpay/verify-subscription/route.ts") +
    read("src/app/api/razorpay/webhook/route.ts"),
  "ML:PAYMENT_RECOVERED": read("src/app/api/razorpay/webhook/route.ts"),
  "ML:PAYMENT_FAILED": read("src/app/api/razorpay/webhook/route.ts"),
  "ML:GRACE_PERIOD_STARTED": read("src/app/api/razorpay/webhook/route.ts"),
  "ML:RENEWAL_REMINDER": read("functions/src/messaging/messagingEngine.ts"),
  "ML:SUSPENSION_WARNING": read("functions/src/messaging/messagingEngine.ts"),
  "ML:CREDIT_PURCHASE_SUCCESS":
    read("src/app/api/razorpay/verify-topup/route.ts") +
    read("src/app/api/razorpay/webhook/route.ts"),
  "ML:CREDITS_LOW": read("src/lib/ai/capacityCheck.ts") + read("src/data/shared/creditNotificationPolicy.ts"),
  "ML:CREDITS_EXHAUSTED": read("src/lib/ai/capacityCheck.ts") + read("src/data/shared/creditNotificationPolicy.ts"),
  "ML:SUBSCRIPTION_ACTIVATED": read("src/app/api/razorpay/webhook/route.ts"),
  "ML:SUBSCRIPTION_COMPLETED": read("src/app/api/razorpay/webhook/route.ts"),
  "ML:SUBSCRIPTION_CANCELLED":
    read("src/app/api/razorpay/cancel-subscription/route.ts") +
    read("src/app/api/razorpay/webhook/route.ts"),
  "ML:SUBSCRIPTION_PAUSED":
    read("src/app/api/razorpay/pause-subscription/route.ts") +
    read("src/app/api/razorpay/webhook/route.ts"),
  "ML:SUBSCRIPTION_RESUMED":
    read("src/app/api/razorpay/resume-subscription/route.ts") +
    read("src/app/api/razorpay/webhook/route.ts"),
  "ML:SUBSCRIPTION_UPGRADED": read(
    "src/app/api/razorpay/upgrade-subscription/route.ts",
  ),
  "ML:MENU_STALE": read("functions/src/analytics/stalenessCheck.ts"),
  "ML:REFUND_PROCESSED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:ANSWERLATTICE_NOTIFICATION_TEST": read(
    "src/app/api/answerlattice/notifications/test/route.ts",
  ),
  "AL:PAYMENT_SUCCESS": read("src/app/api/razorpay/verify-subscription/route.ts") + read("src/app/api/razorpay/webhook/route.ts"),
  "AL:PAYMENT_RECOVERED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:PAYMENT_FAILED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:GRACE_PERIOD_STARTED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:CREDIT_PURCHASE_SUCCESS": read("src/app/api/razorpay/verify-topup/route.ts") + read("src/app/api/razorpay/webhook/route.ts"),
  "AL:CREDITS_LOW": read("src/lib/answerlattice/creditNotifications.ts") + read("src/lib/answerlattice/intakeUsageLedger.ts") + read("src/data/shared/creditNotificationPolicy.ts"),
  "AL:CREDITS_EXHAUSTED": read("src/lib/answerlattice/creditNotifications.ts") + read("src/lib/answerlattice/intakeUsageLedger.ts") + read("src/data/shared/creditNotificationPolicy.ts"),
  "AL:SUBSCRIPTION_ACTIVATED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:SUBSCRIPTION_COMPLETED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:SUBSCRIPTION_CANCELLED": read("src/app/api/razorpay/cancel-subscription/route.ts") + read("src/app/api/razorpay/webhook/route.ts"),
  "AL:SUBSCRIPTION_PAUSED": read("src/app/api/razorpay/pause-subscription/route.ts") + read("src/app/api/razorpay/webhook/route.ts"),
  "AL:SUBSCRIPTION_RESUMED": read("src/app/api/razorpay/resume-subscription/route.ts") + read("src/app/api/razorpay/webhook/route.ts"),
  "AL:SUBSCRIPTION_UPGRADED": read("src/app/api/razorpay/upgrade-subscription/route.ts"),
  "AL:REFUND_PROCESSED": read("src/app/api/razorpay/webhook/route.ts"),
  "AL:WIDGET_CONNECTION_VERIFIED": read("src/app/api/widget/config/route.ts"),
};
for (const [key, source] of Object.entries(firingSources)) {
  const trigger = key.split(":")[1];
  assert(new RegExp(`["']${trigger}["']`).test(source), `${key} must retain a real producer`);
}
const nextLifecycleProducers = [
  "src/lib/ai/capacityCheck.ts",
  "src/app/api/razorpay/cancel-subscription/route.ts",
  "src/app/api/razorpay/resume-subscription/route.ts",
  "src/app/api/razorpay/upgrade-subscription/route.ts",
  "src/app/api/razorpay/verify-topup/route.ts",
  "src/app/api/razorpay/pause-subscription/route.ts",
  "src/app/api/razorpay/verify-subscription/route.ts",
  "src/app/api/razorpay/webhook/route.ts",
];
for (const file of nextLifecycleProducers) {
  assert(
    !/(?<!await )sendLifecycleMessage\(\{/.test(read(file)),
    `${file} must await durable lifecycle enqueue/processing`,
  );
}
const razorpayWebhook = read("src/app/api/razorpay/webhook/route.ts");
assert(
  !razorpayWebhook.includes("if (subForMsg?.email)"),
  "Payment failure must not exclude a phone-only owner before NotificationOS resolves channels",
);
assert(
  razorpayWebhook.includes("if (subForMsg)"),
  "Payment failure must enqueue from authoritative subscription scope even without email",
);
assert(
  !razorpayWebhook.includes("shouldSendMenuListBillingMessages"),
  "Shared Razorpay truth must not suppress Answerlattice owner billing notifications",
);
assert(
  /sendLifecycleMessage\(\{\s*productId:\s*eventProductId/.test(razorpayWebhook),
  "Shared Razorpay webhook lifecycle sends must retain the resolved product identity",
);
const lifecycleMessaging = read("src/lib/messaging/index.ts");
assert(
  lifecycleMessaging.includes("productId === PRODUCT_IDS.ANSWERLATTICE"),
  "Lifecycle messaging must route Answerlattice through its own Firebase owner-notification target",
);
assert(
  lifecycleMessaging.includes("if (productId === PRODUCT_IDS.ANSWERLATTICE) return false"),
  "Answerlattice lifecycle delivery must never fall through to the MenuList legacy sender",
);
assert(
  /const ownerPaymentEventType = paymentRecovered\s*\? ["']PAYMENT_RECOVERED["']\s*: ["']PAYMENT_SUCCESS["']/.test(razorpayWebhook),
  "Recovered charges must replace, not duplicate, the ordinary payment receipt",
);
assert(
  /requestedRegistryEntry\.producerStatus === ["']reserved["']/.test(rootProcessor),
  "Next owner processor must reject reserved triggers before claiming an event",
);
assert(
  /registryEntry\.producerStatus !== ["']active["']/.test(functionsProcessor),
  "Functions owner processor must reject non-active triggers before claiming an event",
);

const genericNotifications = read("src/lib/notifications/index.ts");
const answerlatticeNotificationTest = read(
  "src/app/api/answerlattice/notifications/test/route.ts",
);
const answerlatticeActivation = read(
  "src/lib/answerlattice/activationSummary.ts",
);
const answerlatticeSettings = read(
  "src/components/templates/answerlattice/AnswerlatticeSettings.tsx",
);
assert(
  genericNotifications.includes(
    "isOwnerNotificationEmailConfigured(productId)",
  ),
  "Readiness must recognize EmailOS/Resend or SMTP through the effective sender boundary",
);
assert(
  answerlatticeNotificationTest.includes("if (!readiness.emailConfigured)"),
  "Answerlattice firing test must use effective email readiness",
);
assert(
  answerlatticeActivation.includes("notificationReadiness.emailConfigured"),
  "Answerlattice activation must use effective email readiness",
);
assert(
  answerlatticeSettings.includes('name="supportEmail"'),
  "Answerlattice settings must retain the responsive support delivery address control",
);
assert(
  recipientResolver.includes("cleanEmail(data.supportEmail)"),
  "Answerlattice owner delivery must fall back to the workspace support address",
);
const preferencesRoute = read(
  "src/app/api/notification-os/preferences/route.ts",
);
assert(
  preferencesRoute.includes("db.getAll(storeRef, userRef)"),
  "Preference mutation must fetch account and store once together",
);
assert(
  preferencesRoute.includes("db.batch()"),
  "Preference projection and consent audit must be atomic",
);
assert(
  preferencesRoute.includes("batch.create(auditRef"),
  "Consent evidence must use immutable create semantics",
);
assert(
  preferencesRoute.includes("phoneVerifiedAt"),
  "WhatsApp consent must require verified phone evidence",
);
assert(
  preferencesRoute.includes("isInternalNotificationEmail"),
  "Synthetic auth email identities must be excluded",
);
assert(
  preferencesRoute.includes("parsed.data.whatsappConsent !== 'revoke'"),
  "Consent revocation must remain available independently of channel readiness",
);
assert(
  !preferencesRoute.includes("String(user.displayEmail || user.email"),
  "Owner-editable display email must not become verified implicitly",
);
const readiness = read("src/lib/notification-os/readiness.ts");
const onboardingDefaults = read("src/lib/notification-os/onboardingDefaults.ts");
assert(
  onboardingDefaults.includes("channelMode: 'email_and_whatsapp'"),
  "New MenuList stores must default to every eligible owner channel",
);
assert(
  onboardingDefaults.includes("isInternalNotificationEmail") &&
    onboardingDefaults.includes("phoneVerifiedAt"),
  "Onboarding defaults must exclude internal email identities and require phone verification evidence",
);
assert(
  !onboardingDefaults.includes("whatsappConsent: true"),
  "Onboarding contact capture must not imply WhatsApp notification consent",
);
assert(
  readiness.includes("resolveNotificationOsContactReadiness"),
  "Shared contact readiness must serve desktop and mobile",
);
assert(
  readiness.includes("phoneLoginEnabled === true"),
  "An owner-edited phone must not become a verified WhatsApp destination",
);
assert(
  readiness.includes("isInternalNotificationEmail"),
  "Internal phone-auth email identities must stay unavailable",
);
assert(
  readiness.includes("canSaveNotificationOsMode"),
  "Invalid channel combinations must be blocked before a save attempt",
);
const desktopSettings = read(
  "src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx",
);
assert(
  desktopSettings.includes("Delivery readiness"),
  "Desktop settings must show verified channel readiness",
);
assert(
  desktopSettings.includes("disabled={!hasChanges || !selectionReady}"),
  "Desktop settings must avoid unchanged or invalid writes",
);
assert(
  desktopSettings.includes("hasChanges && modeNeedsWhatsApp(mode) && !whatsappConsent") &&
    desktopSettings.includes("hasChanges && !selectionReady && !revokingConsent") &&
    desktopSettings.includes("savedSelectionHasUnavailableChannel"),
  "Desktop settings must reserve corrective warnings for drafts and explain unavailable channels in a saved selection calmly",
);
assert(
  desktopSettings.includes("const [messageApi, messageContextHolder] = message.useMessage();") &&
    desktopSettings.includes("{messageContextHolder}") &&
    desktopSettings.includes("messageApi.success('Notification settings saved')") &&
    desktopSettings.includes("messageApi.error('Could not save notification settings.')"),
  "Desktop settings must render scoped success and bounded failure feedback",
);
assert(
  !desktopSettings.includes("message.success(") &&
    !desktopSettings.includes("message.error(") &&
    !desktopSettings.includes("error.message"),
  "Desktop settings must not use detached feedback or expose raw errors",
);
const mobileSettings = read(
  "src/components/mobile/screens/MobileNotificationSettingsScreen.tsx",
);
assert(
  mobileSettings.includes("Delivery readiness"),
  "Mobile settings must show verified channel readiness",
);
assert(
  mobileSettings.includes("disabled={!hasChanges || !selectionReady}"),
  "Mobile settings must avoid unchanged or invalid writes",
);
assert(
  mobileSettings.includes("hasChanges && modeNeedsWhatsApp(mode) && !whatsappConsent") &&
    mobileSettings.includes("hasChanges && !selectionReady && !revokingConsent") &&
    mobileSettings.includes("savedSelectionHasUnavailableChannel"),
  "Mobile settings must reserve corrective warnings for drafts and explain unavailable channels in a saved selection calmly",
);
assert(
  mobileSettings.includes("Toast.show({ content: 'Could not save notification settings.'") &&
    !mobileSettings.includes("error.message"),
  "Mobile settings must retain bounded failure feedback without raw errors",
);
const desktopBusinessSettings = read(
  "src/components/templates/main-app/businessSettings/index.tsx",
);
assert(
  desktopBusinessSettings.includes(
    "FEATURE_FLAGS.ENABLE_NOTIFICATION_OS && isOwnerAccount",
  ),
  "Desktop navigation must match the owner-only API contract",
);
const mobileMore = read("src/components/mobile/screens/MobileMoreScreen.tsx");
assert(
  mobileMore.includes(
    "screen === 'notificationSettings') return canManageStore && isOwnerAccount",
  ),
  "Mobile deep links must match the owner-only API contract",
);
assert(
  mobileMore.includes("pickItems(businessIdentityItems, ['notificationSettings', 'users', 'roles', 'locations', 'locale', 'timeSlots'])"),
  "Mobile owner navigation must expose the admitted notification settings screen",
);
const firestoreRules = read("firestore.rules");
assert(
  firestoreRules.includes(
    "'notificationSettings'",
  ),
  "Browser store updates must preserve server-managed notification settings",
);
assert(
  firestoreRules.includes("match /{document=**}") &&
    firestoreRules.includes("allow read, write: if false;"),
  "MenuList rules must retain the global default-deny boundary",
);
const notificationRulesTest = read(
  "scripts/verification/test-notification-os-rules.ts",
);
for (const collection of [
  "emailOsDeliveries",
  "emailOsWebhookReceipts",
  "emailOsSuppressions",
  "whatsappOsMessageRefs",
  "whatsappOsWebhookReceipts",
  "whatsappOsConsentEvents",
]) {
  assert(
    notificationRulesTest.includes(`'${collection}'`),
    `${collection} must remain in the executable default-deny rules matrix`,
  );
}
const answerlatticeRules = read("firestore-answerlattice.rules");
for (const collection of [
  "answerlattice_emailOsDeliveries",
  "answerlattice_emailOsWebhookReceipts",
  "answerlattice_emailOsSuppressions",
  "answerlattice_whatsappOsMessageRefs",
  "answerlattice_whatsappOsWebhookReceipts",
  "answerlattice_whatsappOsConsentEvents",
]) {
  assert(
    answerlatticeRules.includes(`match /${collection}/{documentId}`),
    `${collection} must have an explicit Answerlattice server-only rules boundary`,
  );
}

console.log(
  "NotificationOS source, single-resolution, consent, desktop, and mobile checks passed.",
);
