import assert from "node:assert/strict";
import {
  isInternalNotificationEmail,
  planNotificationOsChannels,
} from "../../src/data/shared/notificationOs";
import { OWNER_NOTIFICATION_REGISTRY } from "../../src/data/shared/ownerNotificationRegistry";
import { resolveMenuListCreditNotification } from "../../src/data/shared/creditNotificationPolicy";
import { renderOwnerNotificationTemplate } from "../../src/lib/owner-notifications/templates";
import {
  channelsForOwnerNotificationMode,
  modeNeedsWhatsApp,
  modeRequiresEmail,
  normalizeOwnerNotificationSettings,
} from "../../src/lib/notification-os/preferences";
import {
  canSaveNotificationOsMode,
  resolveNotificationOsContactReadiness,
} from "../../src/lib/notification-os/readiness";

const base = {
  allowedChannels: ["email", "whatsapp"] as const,
  enabledChannels: { email: true, whatsapp: true },
  email: "owner@example.com",
  emailInternalIdentity: false,
  emailVerified: true,
  phoneVerified: true,
  requiresWhatsAppConsent: true,
  whatsappConsentGranted: true,
  whatsappNumber: "+919876543210",
};

assert.deepEqual(
  planNotificationOsChannels({ ...base, mode: "email_only" })
    .filter((item) => item.eligible)
    .map((item) => item.channel),
  ["email"],
);

const modeMatrix = [
  ["email_only", ["email"]],
  ["whatsapp_only", ["whatsapp"]],
  ["email_and_whatsapp", ["email", "whatsapp"]],
  ["all_eligible_critical", ["email", "whatsapp"]],
] as const;
for (const [mode, expected] of modeMatrix) {
  assert.deepEqual(
    planNotificationOsChannels({ ...base, mode })
      .filter((item) => item.eligible)
      .map((item) => item.channel),
    expected,
    `${mode} must produce its complete eligible channel set`,
  );
}
for (const preferredChannel of ["email", "whatsapp"] as const) {
  assert.deepEqual(
    planNotificationOsChannels({
      ...base,
      mode: "preferred_available",
      preferredChannels: [
        preferredChannel,
        preferredChannel === "email" ? "whatsapp" : "email",
      ],
    })
      .filter((item) => item.eligible)
      .map((item) => item.channel),
    [preferredChannel],
    `preferred mode must choose ${preferredChannel} without duplicating delivery`,
  );
}
assert.deepEqual(
  planNotificationOsChannels({ ...base, mode: "whatsapp_only" })
    .filter((item) => item.eligible)
    .map((item) => item.channel),
  ["whatsapp"],
);
assert.deepEqual(
  planNotificationOsChannels({ ...base, mode: "email_and_whatsapp" })
    .filter((item) => item.eligible)
    .map((item) => item.channel),
  ["email", "whatsapp"],
);
assert.deepEqual(
  planNotificationOsChannels({
    ...base,
    email: undefined,
    mode: "preferred_available",
    preferredChannels: ["email", "whatsapp"],
  })
    .filter((item) => item.eligible)
    .map((item) => item.channel),
  ["whatsapp"],
  "preferred mode must fall back without another scope read",
);
assert.equal(
  planNotificationOsChannels({
    ...base,
    mode: "whatsapp_only",
    whatsappConsentGranted: false,
  }).find((item) => item.channel === "whatsapp")?.reason,
  "whatsapp_consent_missing",
);
assert.equal(
  planNotificationOsChannels({
    ...base,
    mode: "email_only",
    enabledChannels: { email: false, whatsapp: true },
  }).find((item) => item.channel === "email")?.reason,
  "channel_disabled",
);
assert.equal(
  planNotificationOsChannels({
    ...base,
    mode: "email_only",
    emailInternalIdentity: true,
  }).find((item) => item.channel === "email")?.reason,
  "email_internal_identity",
);
assert.equal(
  planNotificationOsChannels({
    ...base,
    mode: "email_only",
    emailVerified: false,
  }).find((item) => item.channel === "email")?.reason,
  "email_not_verified",
);
assert.equal(
  planNotificationOsChannels({
    ...base,
    mode: "whatsapp_only",
    phoneVerified: false,
  }).find((item) => item.channel === "whatsapp")?.reason,
  "whatsapp_phone_not_verified",
);
assert.deepEqual(
  planNotificationOsChannels({
    ...base,
    mode: "email_and_whatsapp",
    requestedChannels: ["whatsapp"],
  })
    .filter((item) => item.eligible)
    .map((item) => item.channel),
  ["whatsapp"],
  "event policy must remain the final channel admission boundary",
);
assert.equal(
  isInternalNotificationEmail("owner@msg.menulist.ai", ["msg.menulist.ai"]),
  true,
);
assert.equal(
  isInternalNotificationEmail("owner@example.com", ["msg.menulist.ai"]),
  false,
);
assert.deepEqual(channelsForOwnerNotificationMode("email_and_whatsapp"), [
  "email",
  "whatsapp",
]);

const legacy = normalizeOwnerNotificationSettings({
  preferredChannel: "email",
});
assert.equal(legacy.channelMode, "email_only");
assert.deepEqual(legacy.preferredChannels, ["email"]);
const revoked = normalizeOwnerNotificationSettings({
  whatsappConsent: true,
  whatsappConsented: true,
  whatsappConsentStatus: "revoked",
  whatsappConsentedAt: "2026-08-14T10:00:00.000Z",
  whatsappConsentRevokedAt: "2026-08-15T10:00:00.000Z",
  whatsappConsentSource: "owner_settings",
  whatsappConsentPolicyVersion: "2026-08-15",
  consentedAt: "2026-08-14T10:00:00.000Z",
  preferredChannel: "whatsapp",
  preferredChannels: ["whatsapp", "email"],
  channelMode: "preferred_available",
});
assert.equal(
  revoked.whatsappConsent,
  false,
  "explicit revocation must override legacy granted booleans",
);
assert.equal(revoked.whatsappConsented, false);
assert.equal(revoked.whatsappConsentRevokedAt, "2026-08-15T10:00:00.000Z");
assert.equal(revoked.whatsappConsentedAt, "2026-08-14T10:00:00.000Z");
assert.equal(revoked.whatsappConsentSource, "owner_settings");
assert.equal(revoked.whatsappConsentPolicyVersion, "2026-08-15");
assert.equal(revoked.consentedAt, "2026-08-14T10:00:00.000Z");
assert.equal(revoked.preferredChannel, "whatsapp");
assert.equal(modeRequiresEmail("email_only"), true);
assert.equal(modeRequiresEmail("email_and_whatsapp"), true);
assert.equal(modeRequiresEmail("whatsapp_only"), false);
assert.equal(modeRequiresEmail("preferred_available"), false);
assert.equal(modeNeedsWhatsApp("preferred_available"), false);

const googleIdentityReadiness = resolveNotificationOsContactReadiness(
  {},
  {
    email: "owner@example.com",
    isVerified: true,
  },
);
assert.equal(googleIdentityReadiness.emailReady, true);
assert.equal(googleIdentityReadiness.whatsappReady, false);
assert.equal(googleIdentityReadiness.emailDisplay, "o•••@example.com");

const phoneIdentityReadiness = resolveNotificationOsContactReadiness(
  {},
  {
    dialCode: "+91",
    email: "phone-user@msg.menulist.ai",
    isVerified: true,
    phoneLoginEnabled: true,
    phoneNumber: "9876543210",
  },
);
assert.equal(phoneIdentityReadiness.emailReady, false);
assert.equal(phoneIdentityReadiness.whatsappReady, true);
assert.equal(phoneIdentityReadiness.whatsappDisplay, "•••• 3210");

assert.equal(
  canSaveNotificationOsMode({
    emailReady: true,
    mode: "email_only",
    revokingConsent: false,
    whatsappConsent: false,
    whatsappReady: false,
  }),
  true,
);
assert.equal(
  canSaveNotificationOsMode({
    emailReady: false,
    mode: "email_only",
    revokingConsent: false,
    whatsappConsent: false,
    whatsappReady: true,
  }),
  false,
);
assert.equal(
  canSaveNotificationOsMode({
    emailReady: true,
    mode: "preferred_available",
    revokingConsent: false,
    whatsappConsent: false,
    whatsappReady: false,
  }),
  true,
);
assert.equal(
  canSaveNotificationOsMode({
    emailReady: true,
    mode: "email_and_whatsapp",
    revokingConsent: false,
    whatsappConsent: false,
    whatsappReady: true,
  }),
  false,
);
assert.equal(
  canSaveNotificationOsMode({
    emailReady: false,
    mode: "whatsapp_only",
    revokingConsent: true,
    whatsappConsent: false,
    whatsappReady: false,
  }),
  true,
);

assert.deepEqual(resolveMenuListCreditNotification({ monthlyAllowance: 100, remainingCredits: 11 }), { eventType: null, lowThreshold: 10 });
assert.deepEqual(resolveMenuListCreditNotification({ monthlyAllowance: 100, remainingCredits: 10 }), { eventType: "CREDITS_LOW", lowThreshold: 10 });
assert.deepEqual(resolveMenuListCreditNotification({ monthlyAllowance: 20, remainingCredits: 5 }), { eventType: "CREDITS_LOW", lowThreshold: 5 });
assert.deepEqual(resolveMenuListCreditNotification({ monthlyAllowance: 100, remainingCredits: 0 }), { eventType: "CREDITS_EXHAUSTED", lowThreshold: 10 });

const registryKeys = new Set<string>();
for (const entry of OWNER_NOTIFICATION_REGISTRY) {
  const registryKey = `${entry.productId}:${entry.triggerType}`;
  assert.equal(
    registryKeys.has(registryKey),
    false,
    `${registryKey} must be unique`,
  );
  registryKeys.add(registryKey);
  const plannedChannels = planNotificationOsChannels({
    ...base,
    allowedChannels: entry.defaultChannels,
    mode:
      entry.priority === "critical"
        ? "all_eligible_critical"
        : "email_and_whatsapp",
    requiresWhatsAppConsent: entry.requiresWhatsAppConsent,
  })
    .filter((item) => item.eligible)
    .map((item) => item.channel);
  assert.deepEqual(
    plannedChannels,
    entry.defaultChannels,
    `${registryKey} must dry-plan every registry-approved channel when both contacts are verified`,
  );
  if (entry.producerStatus === "active") {
    assert.notEqual(
      renderOwnerNotificationTemplate(entry.productId, entry.templateKey, {
        amount: 100,
        currency: "INR",
        remainingCredits: 5,
        storeName: "Dry Run Store",
      }),
      null,
      `${registryKey} must have a renderable active template`,
    );
  }
  if (entry.producerStatus === "alias") {
    assert.ok(
      entry.canonicalTriggerType,
      `${registryKey} alias must identify its canonical trigger`,
    );
  }
}

console.log(
  `NotificationOS routing, fallback, identity, preference, and ${registryKeys.size}-trigger dry-firing contracts passed.`,
);
