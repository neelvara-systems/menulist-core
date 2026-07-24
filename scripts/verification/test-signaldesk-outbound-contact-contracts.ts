import assert from "node:assert/strict";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import {
    assertSignalDeskOutboundContactBinding,
    parseSignalDeskOutboundContactAuthority,
    signalDeskOutboundContactIdentityIdFor,
} from "@lib/signaldesk/outboundContactContracts";
import type { SignalDeskSourcePolicy } from "@type/signaldesk";

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });
const observedAt = "2026-07-21T00:00:00.000Z";
const expiresAt = "2026-08-20T00:00:00.000Z";
const targetId = "target_contact_authority";
const sourcePolicyId = "policy_contact_authority";
const sourceRunId = "source_run_contact_authority";
const email = "owner@example.com";
const identityId = signalDeskOutboundContactIdentityIdFor("email", email);
const target = {
    targetId,
    displayName: "Contact authority target",
    status: "review",
    segment: "a",
    primaryOpportunity: "no-link",
    sourceConfidence: "high",
    contactability: "ready",
    suppressionStatus: "clear",
    nextAction: "approve",
    sourcePolicyId,
    sourceRunId,
    updatedAt: observedAt,
} as const;
const policy: SignalDeskSourcePolicy = {
    accessMethod: "permissioned-referral",
    allowedContactChannels: ["email"],
    allowedFields: ["displayName", "email"],
    allowedUse: { contact: true, evidence: true, import: true, personalization: true, providerRun: false, storage: true },
    approvedAt: observedAt,
    attributionRequirements: [],
    blockedFields: [],
    createdAt: observedAt,
    expiresAt,
    lastReviewedAt: observedAt,
    name: "Contact authority policy",
    notes: "Permissioned referral evidence retained.",
    policyOwner: "founder",
    prohibitedUses: ["unapproved-send"],
    provider: null,
    rawPayloadPolicy: "never-store",
    refreshMethod: "owner-refresh",
    retentionDays: 30,
    sourcePolicyId,
    sourceType: "manual-research",
    status: "active",
    termsUrl: null,
    termsVersion: "v1",
    updatedAt: observedAt,
};
const targetDetail = {
    ...target,
    pId: SIGNALDESK_PRODUCT_CODE,
    email,
    identityHash: "a".repeat(64),
    permissionEvidenceRef: "permission-ref-1",
    updatedAt: timestamp(observedAt),
};
const sourceRun = {
    blockedCount: 0,
    createdAt: timestamp(observedAt),
    duplicateCount: 0,
    importedCount: 1,
    pId: SIGNALDESK_PRODUCT_CODE,
    sourceName: "Permissioned source",
    sourcePolicyId,
    sourceRunId,
    status: "completed",
    suppressedCount: 0,
    updatedAt: timestamp(observedAt),
};
const contact = {
    channel: "email",
    expiresAt: timestamp(expiresAt),
    identityId,
    observedAt: timestamp(observedAt),
    pId: SIGNALDESK_PRODUCT_CODE,
    permissionEvidenceRef: "permission-ref-1",
    permissionState: "permissioned",
    rawValueStored: true,
    sourceDataExpiresAt: timestamp(expiresAt),
    sourceDataLifecycleState: "active",
    sourceDataObservedAt: timestamp(observedAt),
    sourcePolicyId,
    sourceRunId,
    targetId,
    updatedAt: timestamp(observedAt),
    value: email,
};

const parse = (overrides: Record<string, unknown> = {}) => parseSignalDeskOutboundContactAuthority({
    channel: "email",
    contactDocumentId: identityId,
    nowMillis: Date.parse("2026-07-22T00:00:00.000Z"),
    policy,
    rawContact: { ...contact, ...overrides },
    rawSourceRun: sourceRun,
    rawTargetDetail: targetDetail,
    sourceRunDocumentId: sourceRunId,
    target,
});

const authority = parse();
assert.equal(authority.recipient, email);
assert.doesNotThrow(() => assertSignalDeskOutboundContactBinding({
    contactAuthorityFingerprintHash: authority.contactAuthorityFingerprintHash,
    contactIdentityId: authority.contactIdentityId,
}, authority));
for (const invalid of [
    { permissionState: "research_only" },
    { permissionEvidenceRef: "another-ref" },
    { rawValueStored: false },
    { sourceDataLifecycleState: "completed" },
    { sourceRunId: "source_run_rebound" },
    { targetId: "target_rebound" },
    { expiresAt: timestamp("2026-07-20T00:00:00.000Z"), sourceDataExpiresAt: timestamp("2026-07-20T00:00:00.000Z") },
]) assert.throws(() => parse(invalid), /SIGNALDESK_CONTACT_AUTHORITY/);
assert.throws(() => assertSignalDeskOutboundContactBinding({
    contactAuthorityFingerprintHash: "0".repeat(64),
    contactIdentityId: authority.contactIdentityId,
}, authority), /SIGNALDESK_CONTACT_AUTHORITY_BINDING_STALE/);

console.log("SignalDesk outbound contact contracts passed");
