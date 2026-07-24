import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { sourcePolicyAllowsContactChannel } from "@lib/signaldesk/sourcePolicyContracts";
import {
    parseSignalDeskContactIdentityDocument,
    parseSignalDeskSourceRunDocument,
} from "@lib/signaldesk/targetContracts";
import { createHash } from "crypto";
import type { SignalDeskOutboundChannel, SignalDeskSourcePolicy, SignalDeskTargetSummary } from "@type/signaldesk";

export type SupportedOutboundContactChannel = Extract<SignalDeskOutboundChannel, "email" | "whatsapp" | "instagram">;

export type SignalDeskOutboundContactAuthority = {
    channel: SupportedOutboundContactChannel;
    contactAuthorityFingerprintHash: string;
    contactIdentityId: string;
    expiresAt: string;
    observedAt: string;
    permissionEvidenceRef: string;
    recipient: string;
    sourcePolicyId: string;
    sourceRunId: string;
    targetId: string;
};

type SignalDeskOutboundContactBinding = {
    contactAuthorityFingerprintHash?: unknown;
    contactIdentityId?: unknown;
};

const CLOCK_SKEW_MS = 5 * 60 * 1_000;

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

const timestampToMillis = (value: unknown): number | null => {
    if (typeof value !== "object" || value === null || !("toDate" in value) || typeof value.toDate !== "function") {
        return null;
    }
    try {
        const date = value.toDate();
        const millis = date instanceof Date ? date.getTime() : Number.NaN;
        return Number.isFinite(millis) ? millis : null;
    } catch {
        return null;
    }
};

export const getSignalDeskOutboundRecipient = (
    rawTargetDetail: unknown,
    targetId: string,
    channel: SupportedOutboundContactChannel,
): string => {
    if (typeof rawTargetDetail !== "object" || rawTargetDetail === null || Array.isArray(rawTargetDetail)) {
        throw new Error("SIGNALDESK_CONTACT_AUTHORITY_TARGET_SHAPE_INVALID");
    }
    const detail = rawTargetDetail as Record<string, unknown>;
    if (detail.pId !== SIGNALDESK_PRODUCT_CODE || detail.targetId !== targetId) {
        throw new Error("SIGNALDESK_CONTACT_AUTHORITY_TARGET_MISMATCH");
    }
    const rawRecipient = channel === "email"
        ? detail.email
        : channel === "whatsapp"
            ? detail.phone
            : detail.instagram;
    if (typeof rawRecipient !== "string") return "";
    const recipient = rawRecipient.trim();
    if (channel === "email" && (recipient !== recipient.toLowerCase() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))) return "";
    if (channel === "whatsapp" && !/^\+\d{8,15}$/.test(recipient)) return "";
    if (channel === "instagram" && !/^[a-z0-9._]{1,30}$/.test(recipient)) return "";
    return recipient;
};

export const signalDeskOutboundContactIdentityIdFor = (
    channel: SupportedOutboundContactChannel,
    recipient: string,
) => `${channel}_${hashValue(recipient)}`;

export const parseSignalDeskOutboundContactAuthority = (params: {
    channel: SupportedOutboundContactChannel;
    contactDocumentId: string;
    nowMillis?: number;
    policy: SignalDeskSourcePolicy;
    rawContact: unknown;
    rawSourceRun: unknown;
    rawTargetDetail: unknown;
    sourceRunDocumentId: string;
    target: SignalDeskTargetSummary;
}): SignalDeskOutboundContactAuthority => {
    const recipient = getSignalDeskOutboundRecipient(params.rawTargetDetail, params.target.targetId, params.channel);
    if (!recipient) throw new Error("SIGNALDESK_CONTACT_AUTHORITY_RECIPIENT_REQUIRED");
    const expectedIdentityId = signalDeskOutboundContactIdentityIdFor(params.channel, recipient);
    if (params.contactDocumentId !== expectedIdentityId) throw new Error("SIGNALDESK_CONTACT_AUTHORITY_IDENTITY_MISMATCH");
    const contact = parseSignalDeskContactIdentityDocument(params.rawContact, params.contactDocumentId);
    const sourceRun = parseSignalDeskSourceRunDocument(params.rawSourceRun, params.sourceRunDocumentId);
    const rawContact = params.rawContact as Record<string, unknown>;
    const detail = params.rawTargetDetail as Record<string, unknown>;
    const observedAtMillis = timestampToMillis(rawContact.observedAt);
    const expiresAtMillis = timestampToMillis(rawContact.expiresAt);
    const lifecycleObservedAtMillis = timestampToMillis(rawContact.sourceDataObservedAt);
    const lifecycleExpiresAtMillis = timestampToMillis(rawContact.sourceDataExpiresAt);
    const policyExpiresAtMillis = Date.parse(params.policy.expiresAt);
    const nowMillis = params.nowMillis ?? Date.now();
    const permissionEvidenceRef = contact.permissionEvidenceRef?.trim() || "";

    if (
        params.target.sourcePolicyId !== params.policy.sourcePolicyId
        || params.target.sourceRunId !== sourceRun.sourceRunId
        || detail.sourcePolicyId !== params.policy.sourcePolicyId
        || detail.sourceRunId !== sourceRun.sourceRunId
        || sourceRun.sourcePolicyId !== params.policy.sourcePolicyId
        || sourceRun.status === "blocked"
        || contact.channel !== params.channel
        || contact.identityId !== expectedIdentityId
        || contact.value !== recipient
        || contact.targetId !== params.target.targetId
        || contact.sourcePolicyId !== params.policy.sourcePolicyId
        || contact.sourceRunId !== sourceRun.sourceRunId
        || contact.permissionState !== "permissioned"
        || !permissionEvidenceRef
        || permissionEvidenceRef !== detail.permissionEvidenceRef
        || rawContact.pId !== SIGNALDESK_PRODUCT_CODE
        || rawContact.rawValueStored !== true
        || rawContact.sourceDataLifecycleState !== "active"
        || observedAtMillis === null
        || expiresAtMillis === null
        || lifecycleObservedAtMillis !== observedAtMillis
        || lifecycleExpiresAtMillis !== expiresAtMillis
        || !Number.isFinite(policyExpiresAtMillis)
        || expiresAtMillis !== policyExpiresAtMillis
        || observedAtMillis > nowMillis + CLOCK_SKEW_MS
        || expiresAtMillis <= nowMillis
        || !sourcePolicyAllowsContactChannel(params.policy, params.channel)
    ) throw new Error("SIGNALDESK_CONTACT_AUTHORITY_STALE");

    const observedAt = new Date(observedAtMillis).toISOString();
    const expiresAt = new Date(expiresAtMillis).toISOString();
    const contactAuthorityFingerprintHash = hashValue(JSON.stringify({
        channel: params.channel,
        contactIdentityId: expectedIdentityId,
        expiresAt,
        observedAt,
        permissionEvidenceRef,
        recipientHash: hashValue(recipient),
        sourcePolicyId: params.policy.sourcePolicyId,
        sourceRunId: sourceRun.sourceRunId,
        targetId: params.target.targetId,
    }));
    return {
        channel: params.channel,
        contactAuthorityFingerprintHash,
        contactIdentityId: expectedIdentityId,
        expiresAt,
        observedAt,
        permissionEvidenceRef,
        recipient,
        sourcePolicyId: params.policy.sourcePolicyId,
        sourceRunId: sourceRun.sourceRunId,
        targetId: params.target.targetId,
    };
};

export const assertSignalDeskOutboundContactBinding = (
    binding: SignalDeskOutboundContactBinding,
    authority: SignalDeskOutboundContactAuthority,
) => {
    if (
        binding.contactIdentityId !== authority.contactIdentityId
        || binding.contactAuthorityFingerprintHash !== authority.contactAuthorityFingerprintHash
    ) throw new Error("SIGNALDESK_CONTACT_AUTHORITY_BINDING_STALE");
};
