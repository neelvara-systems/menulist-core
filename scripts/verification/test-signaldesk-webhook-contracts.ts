import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SIGNALDESK_PRODUCT_CODE } from "../../src/constants/signaldesk/product";
import {
    assertSignalDeskWebhookContactTargetCoupling,
    assertSignalDeskWebhookConversationId,
    buildSignalDeskWebhookTargetTransition,
    canApplySignalDeskWebhookInboundToTarget,
    classifySignalDeskWebhookInboundMessage,
    getSignalDeskWebhookLegalRetentionFields,
    isSignalDeskWebhookTargetRetentionHeld,
    parseSignalDeskWebhookChannelHealthDocument,
    parseSignalDeskWebhookContactAuthority,
    parseSignalDeskWebhookDeliveryAuthority,
    parseSignalDeskWebhookEventDocument,
    parseSignalDeskWebhookTargetLifecycleState,
    resolveSignalDeskWebhookTargetAuthority,
    selectSignalDeskWebhookDeliveryAuthority,
    shouldCreateSignalDeskWebhookFallbackConversation,
    signalDeskWebhookContactIdentityIdFor,
    signalDeskWebhookSuppressionIdentityFor,
} from "../../src/lib/signaldesk/webhookContracts";
import type { SignalDeskTargetSummary } from "../../src/types/signaldesk";

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const timestamp = (iso = "2026-07-15T10:00:00.000Z") => ({ toDate: () => new Date(iso) });
const target = (overrides: Partial<SignalDeskTargetSummary> = {}): SignalDeskTargetSummary => ({
    contactability: "ready",
    displayName: "Example Restaurant",
    latestConversationId: "conv_target_1",
    nextAction: "reply",
    primaryOpportunity: "missing-current-list",
    segment: "a",
    sourceConfidence: "high",
    sourcePolicyId: "policy_1",
    sourceRunId: "run_1",
    status: "contacted",
    suppressionStatus: "clear",
    targetId: "target_1",
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
});

const email = "owner@example.com";
assert.equal(classifySignalDeskWebhookInboundMessage("I am not interested, thank you."), "not_interested");
assert.equal(classifySignalDeskWebhookInboundMessage("No thanks."), "not_interested");
assert.equal(classifySignalDeskWebhookInboundMessage("Yes, please send pricing."), "interested");
assert.equal(classifySignalDeskWebhookInboundMessage("Please do not contact me again."), "dnc");
const emailIdentityId = signalDeskWebhookContactIdentityIdFor("email", email);
assert.equal(emailIdentityId, `email_${hashValue(email)}`);
assert.equal(signalDeskWebhookContactIdentityIdFor("whatsapp", "91 98765 43210"), `whatsapp_${hashValue("+919876543210")}`);
assert.deepEqual(signalDeskWebhookSuppressionIdentityFor("whatsapp", "91 98765 43210", "target_1"), {
    identityHash: hashValue("+919876543210"),
    suppressionId: `phone_${hashValue("+919876543210")}`,
});
assert.notEqual(
    signalDeskWebhookSuppressionIdentityFor("whatsapp", "91 98765 43210", "target_1")?.suppressionId,
    `phone_${hashValue("919876543210")}`,
    "webhook suppression must use the same authoritative +E.164 identity as outbound guards",
);
assert.equal(signalDeskWebhookContactIdentityIdFor("email", "not-an-email"), null);
assert.equal(assertSignalDeskWebhookConversationId("conv_target_1"), "conv_target_1");
assert.throws(() => assertSignalDeskWebhookConversationId("conv/target_1"), /CONVERSATION_ID_INVALID/);

if (!emailIdentityId) throw new Error("Test contact identity was not generated");
const contact = parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: " Owner@Example.com ",
    provider: "email",
    raw: {
        channel: "email",
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "expired",
        privateProviderPayload: "must-not-project",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_1",
        targetId: "target_1",
        value: email,
    },
});
assert.equal(contact.targetId, "target_1");
assert.equal("privateProviderPayload" in contact, false);
const retainedContact = parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: email,
    provider: "email",
    raw: {
        channel: "email",
        identityHash: hashValue(JSON.stringify(["email", email])),
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "expired",
        rawValueStored: false,
        sourceDataLifecycleCompletedAt: timestamp(),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourceDataLifecycleToken: "retention_token_1",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_original",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
});
assert.equal(retainedContact.value, email, "the signed inbound identity may re-correlate a scrubbed contact by its deterministic document ID");
assert.equal(retainedContact.targetId, "target_1");
assert.throws(() => parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: email,
    provider: "email",
    raw: {
        channel: "email",
        identityHash: "f".repeat(64),
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "expired",
        rawValueStored: false,
        sourceDataLifecycleCompletedAt: timestamp(),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourceDataLifecycleToken: "retention_token_1",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_original",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
}), /CONTACT_IDENTITY_SHAPE_INVALID|CONTACT_AUTHORITY_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: "attacker@example.com",
    provider: "email",
    raw: {
        channel: "email",
        identityHash: "f".repeat(64),
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "expired",
        rawValueStored: false,
        sourceDataLifecycleCompletedAt: timestamp(),
        sourceDataLifecycleKind: "source-data-retention-v1",
        sourceDataLifecycleState: "completed",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_original",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
}), /CONTACT_IDENTITY_SHAPE_INVALID|CONTACT_AUTHORITY_MISMATCH/);
assert.doesNotThrow(() => assertSignalDeskWebhookContactTargetCoupling(contact, target()));
assert.throws(
    () => assertSignalDeskWebhookContactTargetCoupling(contact, target({ sourcePolicyId: "policy_2" })),
    /CONTACT_TARGET_LINEAGE_MISMATCH/,
);
assert.throws(
    () => assertSignalDeskWebhookContactTargetCoupling(contact, target({ sourceRunId: "run_2" })),
    /CONTACT_TARGET_LINEAGE_MISMATCH/,
);
assert.throws(
    () => assertSignalDeskWebhookContactTargetCoupling(contact, target({ sourceRunId: null })),
    /CONTACT_TARGET_LINEAGE_MISMATCH/,
);
assert.throws(() => parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: email,
    provider: "email",
    raw: {
        channel: "email",
        identityId: emailIdentityId,
        pId: "ML",
        permissionState: "permissioned",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_1",
        targetId: "target_1",
        value: email,
    },
}), /CONTACT_IDENTITY_PRODUCT_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: email,
    provider: "email",
    raw: {
        channel: "whatsapp",
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "permissioned",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_1",
        targetId: "target_1",
        value: email,
    },
}), /CONTACT_AUTHORITY_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookContactAuthority({
    documentId: emailIdentityId,
    identity: email,
    provider: "email",
    raw: {
        channel: "email",
        identityId: emailIdentityId,
        pId: SIGNALDESK_PRODUCT_CODE,
        permissionState: "permissioned",
        sourcePolicyId: "policy_1",
        sourceRunId: "run_1",
        targetId: "foreign/target",
        value: email,
    },
}), /CONTACT_AUTHORITY_MISMATCH/);

const deliveryRaw = {
    approvalId: "approval_1",
    body: "Hello owner",
    createdAt: timestamp(),
    createdBy: "system-worker",
    ctaFingerprintHash: "a".repeat(64),
    ctaId: "cta_1",
    draftId: "draft_1",
    exportId: "send_delivery_1",
    pId: SIGNALDESK_PRODUCT_CODE,
    provider: "smtp",
    providerMessageId: "message-1@example.com",
    senderDomainFingerprintHash: "b".repeat(64),
    senderDomainId: "sender_domain_1",
    status: "sent",
    subject: "Your current list",
    targetId: "target_1",
    targetName: "Example Restaurant",
    channel: "email",
};
const delivery = parseSignalDeskWebhookDeliveryAuthority({
    documentId: "send_delivery_1",
    provider: "email",
    providerMessageId: "message-1@example.com",
    raw: { ...deliveryRaw, providerSecret: "must-not-project" },
});
assert.equal(delivery.targetId, "target_1");
assert.equal("providerSecret" in delivery, false);
assert.throws(() => parseSignalDeskWebhookDeliveryAuthority({
    documentId: "send_delivery_1",
    provider: "email",
    providerMessageId: "message-1@example.com",
    raw: { ...deliveryRaw, provider: "meta-whatsapp" },
}), /DELIVERY_PROVIDER_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookDeliveryAuthority({
    documentId: "send_delivery_1",
    provider: "email",
    providerMessageId: "message-1@example.com",
    raw: { ...deliveryRaw, status: "exported" },
}), /DELIVERY_STATUS_INVALID/);
assert.throws(() => selectSignalDeskWebhookDeliveryAuthority([delivery, { ...delivery, exportId: "send_delivery_2" }]), /DELIVERY_AMBIGUOUS/);

assert.equal(resolveSignalDeskWebhookTargetAuthority({
    contact,
    delivery: null,
    direction: "inbound",
    suppliedTargetId: "target_1",
}), "target_1");
assert.throws(() => resolveSignalDeskWebhookTargetAuthority({
    contact: null,
    delivery: null,
    direction: "inbound",
    suppliedTargetId: "target_1",
}), /SUPPLIED_TARGET_UNTRUSTED/);
assert.throws(() => resolveSignalDeskWebhookTargetAuthority({
    contact,
    delivery: null,
    direction: "inbound",
    suppliedTargetId: "target_2",
}), /SUPPLIED_TARGET_UNTRUSTED/);
assert.equal(resolveSignalDeskWebhookTargetAuthority({
    contact: null,
    delivery,
    direction: "status",
    suppliedTargetId: null,
}), "target_1");
assert.throws(() => resolveSignalDeskWebhookTargetAuthority({
    contact: { ...contact, targetId: "target_2" },
    delivery,
    direction: "status",
    suppliedTargetId: null,
}), /TARGET_AUTHORITY_CONFLICT/);
assert.throws(() => resolveSignalDeskWebhookTargetAuthority({
    contact,
    delivery: null,
    direction: "status",
    suppliedTargetId: "target_1",
}), /SUPPLIED_TARGET_UNTRUSTED/);

const retentionBoundaryMillis = Date.parse("2026-07-15T10:00:00.000Z");
const futureRetentionExpiry = timestamp("2026-07-15T10:00:01.000Z");
const dueRetentionExpiry = timestamp("2026-07-15T10:00:00.000Z");
assert.equal(parseSignalDeskWebhookTargetLifecycleState({
    sourceDataExpiresAt: futureRetentionExpiry,
    sourceDataLifecycleState: "active",
}), "active");
assert.equal(isSignalDeskWebhookTargetRetentionHeld({
    sourceDataExpiresAt: futureRetentionExpiry,
    sourceDataLifecycleState: "active",
}, retentionBoundaryMillis), false);
assert.equal(isSignalDeskWebhookTargetRetentionHeld({
    sourceDataExpiresAt: dueRetentionExpiry,
    sourceDataLifecycleState: "active",
}, retentionBoundaryMillis), true, "scheduler lag must not reopen retention-due targets");
assert.throws(() => parseSignalDeskWebhookTargetLifecycleState({
    sourceDataLifecycleState: "active",
}), /TARGET_LIFECYCLE_EXPIRY_INVALID/);
assert.throws(() => parseSignalDeskWebhookTargetLifecycleState({
    sourceDataExpiresAt: "2026-07-15T10:00:01.000Z",
    sourceDataLifecycleState: "active",
}), /TARGET_LIFECYCLE_EXPIRY_INVALID/);
assert.throws(() => parseSignalDeskWebhookTargetLifecycleState({
    sourceDataExpiresAt: { toMillis: () => 0 },
    sourceDataLifecycleState: "active",
}), /TARGET_LIFECYCLE_EXPIRY_INVALID/);
assert.equal(parseSignalDeskWebhookTargetLifecycleState({
    nextAction: "hold",
    sourceDataLifecycleState: "completed",
    status: "held",
}), "completed");
assert.throws(() => parseSignalDeskWebhookTargetLifecycleState({
    nextAction: "reply",
    sourceDataLifecycleState: "completed",
    status: "replied",
}), /TARGET_LIFECYCLE_HOLD_INVALID/);
assert.equal(canApplySignalDeskWebhookInboundToTarget(target({
    latestConversationId: null,
    nextAction: "hold",
    status: "held",
}), false, "completed"), true, "retained targets must accept inbound capture without reopening");
assert.equal(canApplySignalDeskWebhookInboundToTarget(target({
    latestConversationId: null,
    status: "ready",
}), false, "active", false), false);
assert.equal(canApplySignalDeskWebhookInboundToTarget(target({
    latestConversationId: null,
    nextAction: "hold",
    status: "held",
}), false, "active", true), true, "retention-due active targets must accept held inbound capture");
assert.equal(shouldCreateSignalDeskWebhookFallbackConversation(false, false), false);
assert.equal(shouldCreateSignalDeskWebhookFallbackConversation(true, false), true);
assert.equal(
    shouldCreateSignalDeskWebhookFallbackConversation(false, true),
    true,
    "retention-held inbound must create a legal-review conversation when the historical conversation is absent",
);
assert.deepEqual(buildSignalDeskWebhookTargetTransition({
    conversationId: "conv_target_1",
    inboundState: "interested",
    lifecycleState: "completed",
    ownerQualifiedAtValue: timestamp(),
    requiresIncidentPause: false,
    shouldSuppress: false,
    target: target({ nextAction: "hold", status: "held" }),
}), {
    nextAction: "hold",
    status: "held",
});
assert.deepEqual(buildSignalDeskWebhookTargetTransition({
    conversationId: "conv_email_target_1",
    inboundState: "privacy_request",
    lifecycleState: "completed",
    ownerQualifiedAtValue: timestamp(),
    requiresIncidentPause: true,
    shouldSuppress: true,
    target: target({ nextAction: "hold", status: "held" }),
}), {
    nextAction: "hold",
    status: "held",
    suppressionStatus: "complaint",
});
assert.deepEqual(buildSignalDeskWebhookTargetTransition({
    conversationId: "conv_target_1",
    inboundState: "interested",
    lifecycleState: "active",
    ownerQualifiedAtValue: timestamp(),
    retentionHeld: true,
    requiresIncidentPause: false,
    shouldSuppress: false,
    target: target(),
}), {
    nextAction: "hold",
    status: "held",
}, "scheduler-lag retention capture must not qualify or reopen the target");
assert.deepEqual(getSignalDeskWebhookLegalRetentionFields("completed", false), {
    legalRetentionReviewReason: "post-retention-inbound-communication",
    legalRetentionReviewRequired: true,
});
assert.deepEqual(getSignalDeskWebhookLegalRetentionFields("active", true), {
    legalRetentionReviewReason: "rights-or-complaint-communication",
    legalRetentionReviewRequired: true,
});
assert.deepEqual(getSignalDeskWebhookLegalRetentionFields("active", false, true), {
    legalRetentionReviewReason: "post-retention-inbound-communication",
    legalRetentionReviewRequired: true,
});

const webhookEvent = parseSignalDeskWebhookEventDocument({
    documentId: "webhook_email_event_1",
    expectedProvider: "email",
    raw: {
        channel: "email",
        createdAt: timestamp(),
        direction: "inbound",
        eventFingerprintHash: "c".repeat(64),
        eventId: "webhook_email_event_1",
        eventType: "email.reply",
        externalIdHash: "d".repeat(64),
        inboundState: "interested",
        occurredAt: timestamp(),
        pId: SIGNALDESK_PRODUCT_CODE,
        payloadHash: "e".repeat(64),
        privateRawBody: "must-not-project",
        provider: "email",
        providerMessageId: "reply-message-1",
        revenueSyncStatus: "pending",
        status: "processed",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
});
assert.equal(webhookEvent.targetId, "target_1");
assert.equal("privateRawBody" in webhookEvent, false);
assert.throws(() => parseSignalDeskWebhookEventDocument({
    documentId: "webhook_email_event_1",
    expectedProvider: "whatsapp",
    raw: {
        channel: "email",
        createdAt: timestamp(),
        direction: "inbound",
        eventFingerprintHash: "c".repeat(64),
        eventId: "webhook_email_event_1",
        eventType: "email.reply",
        externalIdHash: "d".repeat(64),
        occurredAt: timestamp(),
        pId: SIGNALDESK_PRODUCT_CODE,
        payloadHash: "e".repeat(64),
        provider: "email",
        providerMessageId: "reply-message-1",
        status: "processed",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
}), /EVENT_DOCUMENT_PROVIDER_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookEventDocument({
    documentId: "webhook_email_event_1",
    expectedProvider: "email",
    raw: {
        channel: "email",
        createdAt: timestamp(),
        direction: "inbound",
        eventFingerprintHash: "c".repeat(64),
        eventId: "webhook_email_event_1",
        eventType: "email.reply",
        externalIdHash: "d".repeat(64),
        occurredAt: timestamp(),
        pId: SIGNALDESK_PRODUCT_CODE,
        payloadHash: "e".repeat(64),
        provider: "email",
        providerMessageId: "reply-message-1",
        status: "processed",
        targetId: null,
        updatedAt: timestamp(),
    },
}), /EVENT_DOCUMENT_STATUS_INVALID/);
assert.throws(() => parseSignalDeskWebhookEventDocument({
    documentId: "webhook_email_event_1",
    expectedProvider: "email",
    raw: {
        channel: "email",
        createdAt: timestamp(),
        direction: "inbound",
        eventFingerprintHash: "c".repeat(64),
        eventId: "webhook_email_event_1",
        eventType: "email.reply",
        externalIdHash: "d".repeat(64),
        inboundState: "dnc",
        occurredAt: timestamp(),
        pId: SIGNALDESK_PRODUCT_CODE,
        payloadHash: "e".repeat(64),
        provider: "email",
        providerMessageId: "reply-message-1",
        revenueSyncStatus: "pending",
        status: "processed",
        targetId: "target_1",
        updatedAt: timestamp(),
    },
}), /EVENT_DOCUMENT_REVENUE_STATE_INVALID/);

const legacyHealth = parseSignalDeskWebhookChannelHealthDocument({
    documentId: "email",
    raw: {
        channel: "email",
        configured: true,
        lastError: null,
        lastEventAt: timestamp(),
        status: "healthy",
        updatedAt: timestamp(),
    },
});
assert.equal(legacyHealth.requiresCanonicalRewrite, true);
assert.equal(legacyHealth.status, "healthy", "canonicalizing a legacy healthy document must not pause the channel");
const blockedHealth = parseSignalDeskWebhookChannelHealthDocument({
    documentId: "email",
    raw: {
        channel: "email",
        configured: true,
        lastError: "Complaint received",
        lastEventAt: timestamp(),
        pId: SIGNALDESK_PRODUCT_CODE,
        status: "blocked",
        updatedAt: timestamp(),
    },
});
assert.equal(blockedHealth.status, "paused");
assert.equal(blockedHealth.requiresCanonicalRewrite, true);
assert.throws(() => parseSignalDeskWebhookChannelHealthDocument({
    documentId: "email",
    raw: {
        channel: "email",
        configured: true,
        foreignProductField: true,
        lastError: null,
        status: "healthy",
        updatedAt: timestamp(),
    },
}), /CHANNEL_HEALTH_PRODUCT_MISMATCH/);
assert.throws(() => parseSignalDeskWebhookChannelHealthDocument({
    documentId: "email",
    raw: {
        channel: "email",
        configured: true,
        lastError: null,
        pId: "ML",
        status: "healthy",
        updatedAt: timestamp(),
    },
}), /CHANNEL_HEALTH_PRODUCT_MISMATCH/);

console.log("SignalDesk webhook contracts passed");
