export const dynamic = "force-dynamic";

import {
    applySignalDeskRateLimit,
    logSignalDeskValidationFailure,
    parseSignalDeskJsonBody,
    requireSignalDeskAccess,
    requireSignalDeskRuntime,
} from "@lib/signaldesk/apiGuards";
import {
    captureSignalDeskDemandSignalServer,
    captureSignalDeskReplyServer,
    createSignalDeskApprovalPacketServer,
    prepareSignalDeskChannelHandoffServer,
    createSignalDeskDraftServer,
    createSignalDeskEvidenceServer,
    createSignalDeskSequencerHandoffServer,
    createSignalDeskSourcePolicyServer,
    exportSignalDeskMessageServer,
    importSignalDeskTargetsServer,
    recordSignalDeskOutcomeServer,
    runSignalDeskEnrichmentWaterfallServer,
    reviewSignalDeskApprovalServer,
    runSignalDeskAiAssistServer,
    runSignalDeskSourceProviderServer,
    scoreSignalDeskTargetServer,
    seedSignalDeskDefaultsServer,
    sendSignalDeskOwnedSequenceStepServer,
    sendSignalDeskApprovedMessageServer,
    upsertSignalDeskAudienceSegmentServer,
    upsertSignalDeskBudgetPolicyServer,
    upsertSignalDeskConnectorSettingServer,
    upsertSignalDeskEnrichmentWaterfallServer,
    upsertSignalDeskModelRouteServer,
    upsertSignalDeskProviderAccountServer,
    upsertSignalDeskSelfServiceCtaServer,
    upsertSignalDeskSenderDomainServer,
} from "@lib/signaldesk/workflowServer";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import type { SignalDeskPermission } from "@type/signaldesk";
import { withAuth } from "@/middleware/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const ActionEnvelopeSchema = z.object({
    action: z.enum([
        "seed-defaults",
        "create-source-policy",
        "import-targets",
        "score-target",
        "create-evidence",
        "create-draft",
        "review-approval",
        "export-message",
        "capture-reply",
        "record-outcome",
        "capture-demand-signal",
        "run-source-provider",
        "run-ai-assist",
        "prepare-channel-handoff",
        "send-approved-message",
        "upsert-provider-account",
        "upsert-budget-policy",
        "upsert-connector-setting",
        "upsert-model-route",
        "upsert-enrichment-waterfall",
        "upsert-audience-segment",
        "upsert-sender-domain",
        "upsert-self-service-cta",
        "run-enrichment-waterfall",
        "create-approval-packet",
        "create-sequencer-handoff",
        "send-owned-sequence-step",
    ]),
    payload: z.unknown().default({}),
});

const SourcePolicySchema = z.object({
    allowContact: z.boolean(),
    allowEvidence: z.boolean(),
    allowPersonalization: z.boolean(),
    name: z.string().trim().min(2).max(120),
    notes: z.string().trim().max(500).optional(),
    retentionDays: z.number().int().min(1).max(365),
    sourceType: z.enum(["manual-csv", "manual-research", "owned-demand", "provider", "other"]),
});

const ImportTargetsSchema = z.object({
    rows: z.array(z.object({
        category: z.string().trim().max(120).optional(),
        city: z.string().trim().max(120).optional(),
        country: z.string().trim().max(120).optional(),
        currentListUrl: z.string().trim().max(500).optional(),
        displayName: z.string().trim().min(2).max(180),
        email: z.string().trim().max(180).optional(),
        instagram: z.string().trim().max(180).optional(),
        notes: z.string().trim().max(500).optional(),
        phone: z.string().trim().max(80).optional(),
        website: z.string().trim().max(500).optional(),
    })).min(1).max(50),
    sourceName: z.string().trim().min(2).max(160),
    sourcePolicyId: z.string().trim().min(3).max(160),
});

const TargetSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
});

const DraftSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
    templateId: z.string().trim().min(3).max(160).optional(),
});

const ReviewApprovalSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
    reason: z.string().trim().max(500).optional(),
    status: z.enum(["approved", "rejected"]),
});

const ExportMessageSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
});

const CaptureReplySchema = z.object({
    channel: z.enum(["email", "manual", "whatsapp", "instagram", "messenger"]),
    message: z.string().trim().min(1).max(4000),
    targetId: z.string().trim().min(3).max(160),
});

const RecordOutcomeSchema = z.object({
    channel: z.enum(["email", "manual", "qr", "share", "claim"]),
    outcomeType: z.enum(["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"]),
    source: z.enum(["manual", "route-token", "demand-signal"]),
    targetId: z.string().trim().min(3).max(160).optional(),
});

const CaptureDemandSignalSchema = z.object({
    signalType: z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]),
    sourceSurface: z.enum(["menu", "qr", "website", "manual", "other"]),
    targetId: z.string().trim().min(3).max(160).optional(),
    targetName: z.string().trim().max(180).optional(),
});

const SourceProviderRunSchema = z.object({
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    maxResults: z.number().int().min(1).max(20).default(10),
    provider: z.enum(["google-places", "foursquare", "apify"]),
    query: z.string().trim().min(3).max(180),
    sourcePolicyId: z.string().trim().min(3).max(160),
});

const AiAssistSchema = z.object({
    instruction: z.string().trim().max(500).optional(),
    targetId: z.string().trim().min(3).max(160),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
});

const ChannelActionSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
    channel: z.enum(["email", "whatsapp", "instagram", "messenger"]),
});

const ProviderIdSchema = z.enum([
    "google-places",
    "foursquare",
    "apify",
    "manual",
    "owned-email",
    "apollo",
    "hunter",
    "zerobounce",
    "firecrawl",
    "tavily",
    "exa",
    "postmark",
    "resend",
    "smartlead",
    "instantly",
    "lemlist",
    "gemini",
    "openai",
    "anthropic",
]);

const ProviderAccountSchema = z.object({
    credentialState: z.enum(["missing", "configured", "not_required"]),
    dailyBudgetUsd: z.number().min(0).max(10000),
    disabledReason: z.string().trim().max(500).optional(),
    monthlyBudgetUsd: z.number().min(0).max(100000),
    ownerApproved: z.boolean(),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema,
    status: z.enum(["approved", "blocked", "evaluation", "disabled"]),
    use: z.enum(["discovery", "enrichment", "verification", "research", "sender", "sequencer", "ai"]),
});

const BudgetPolicySchema = z.object({
    dailyBudgetUsd: z.number().min(0).max(10000),
    monthlyBudgetUsd: z.number().min(0).max(100000),
    name: z.string().trim().min(2).max(120),
    perRunBudgetUsd: z.number().min(0).max(1000),
    provider: ProviderIdSchema.optional(),
    scope: z.enum(["global", "provider", "market-pod", "model-route", "sequencer"]),
    scopeId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const ModelRouteSchema = z.object({
    confidenceThreshold: z.enum(["high", "medium", "low"]),
    defaultModel: z.string().trim().min(2).max(120),
    defaultProvider: z.enum(["gemini", "openai", "anthropic"]),
    escalationModel: z.string().trim().max(120).optional(),
    escalationProvider: z.enum(["gemini", "openai", "anthropic"]).optional(),
    maxCostUsd: z.number().min(0).max(100),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    task: z.enum(["score", "evidence", "draft", "reply-classification", "approval-packet", "weekly-strategist", "vendor-audit"]),
});

const EnrichmentWaterfallSchema = z.object({
    maxCostUsd: z.number().min(0).max(1000),
    maxCredits: z.number().int().min(1).max(50),
    name: z.string().trim().min(2).max(120),
    providerOrder: z.array(ProviderIdSchema).min(1).max(12),
    requestedField: z.enum(["email", "phone", "company", "website", "evidence"]),
    retentionDays: z.number().int().min(1).max(365),
    sourcePolicyId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    stopCondition: z.enum(["first-verified", "first-candidate", "manual-review"]),
    verificationRequired: z.boolean(),
});

const AudienceSegmentSchema = z.object({
    criteriaSummary: z.string().trim().min(2).max(500),
    marketPodId: z.string().trim().max(160).optional(),
    name: z.string().trim().min(2).max(120),
    sourcePolicyId: z.string().trim().max(160).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    triggerType: z.enum(["demand-signal", "source-run", "outcome", "manual", "website-evidence"]),
});

const SenderDomainSchema = z.object({
    authenticationState: z.enum(["missing", "partial", "ready"]),
    bounceRate: z.number().min(0).max(1),
    brandRisk: z.enum(["low", "medium", "high"]),
    complaintRate: z.number().min(0).max(1),
    domain: z.string().trim().min(2).max(180),
    provider: ProviderIdSchema.optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
    unsubscribeReady: z.boolean(),
    volumeRampState: z.enum(["not_started", "low_volume", "paused", "ready"]),
});

const ConnectorSettingSchema = z.object({
    appId: z.string().trim().max(180).optional(),
    connectorKind: z.enum(["email-smtp", "meta-whatsapp", "meta-instagram", "meta-messenger", "smartlead", "apify"]),
    displayName: z.string().trim().min(2).max(120),
    fromName: z.string().trim().max(120).optional(),
    instagramPageId: z.string().trim().max(180).optional(),
    messengerPageId: z.string().trim().max(180).optional(),
    notes: z.string().trim().max(500).optional(),
    phoneNumber: z.string().trim().max(80).optional(),
    phoneNumberId: z.string().trim().max(180).optional(),
    replyToEmail: z.string().trim().max(180).optional(),
    senderDomain: z.string().trim().max(180).optional(),
    senderEmail: z.string().trim().max(180).optional(),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const SelfServiceCtaSchema = z.object({
    copy: z.string().trim().min(2).max(500),
    ctaType: z.enum(["preview", "route-draft", "menu-health", "qr-public-menu", "claim-start", "two-surface-proof"]),
    label: z.string().trim().min(2).max(80),
    status: z.enum(["active", "inactive", "hold", "blocked"]),
});

const RunWaterfallSchema = z.object({
    targetId: z.string().trim().min(3).max(160),
    waterfallId: z.string().trim().min(3).max(160),
});

const ApprovalPacketSchema = z.object({
    approvalId: z.string().trim().min(3).max(160).optional(),
    targetId: z.string().trim().min(3).max(160).optional(),
});

const SequencerHandoffSchema = z.object({
    approvalId: z.string().trim().min(3).max(160),
    provider: z.enum(["owned-email", "smartlead", "instantly", "lemlist"]),
    senderDomainId: z.string().trim().max(160).optional(),
});

const OwnedSequenceStepSchema = z.object({
    sequencerHandoffId: z.string().trim().min(3).max(180),
});

const permissionForAction = (action: z.infer<typeof ActionEnvelopeSchema>["action"]): SignalDeskPermission => {
    if (action === "seed-defaults") return "signaldesk.configure";
    if (action === "create-source-policy") return "source.configure";
    if (action === "import-targets") return "target.review";
    if (action === "score-target") return "target.review";
    if (action === "create-evidence") return "target.review";
    if (action === "create-draft") return "draft.create";
    if (action === "review-approval") return "draft.approve";
    if (action === "export-message") return "message.export";
    if (action === "capture-reply") return "message.export";
    if (action === "record-outcome") return "target.review";
    if (action === "run-source-provider") return "source.configure";
    if (action === "run-ai-assist") return "target.review";
    if (action === "prepare-channel-handoff") return "message.export";
    if (action === "send-approved-message") return "message.send";
    if (action === "upsert-provider-account") return "signaldesk.configure";
    if (action === "upsert-budget-policy") return "policy.approve";
    if (action === "upsert-connector-setting") return "channel.configure";
    if (action === "upsert-model-route") return "signaldesk.configure";
    if (action === "upsert-enrichment-waterfall") return "source.configure";
    if (action === "upsert-audience-segment") return "source.configure";
    if (action === "upsert-sender-domain") return "channel.configure";
    if (action === "upsert-self-service-cta") return "signaldesk.configure";
    if (action === "run-enrichment-waterfall") return "target.review";
    if (action === "create-approval-packet") return "target.review";
    if (action === "create-sequencer-handoff") return "message.export";
    if (action === "send-owned-sequence-step") return "message.send";
    return "target.review";
};

const SAFE_ACTION_ERRORS = new Set([
    "Active source policy is required",
    "Active template is required",
    "Approval is not pending",
    "Approval must be approved before export",
    "Approval not found",
    "Contact use is not approved for this target",
    "Draft is required before export",
    "Draft must be approved before export",
    "Draft personalization is not approved for this target",
    "Evidence packet is required before draft",
    "Evidence use is not approved for this source policy",
    "Evidence use is not approved for this target",
    "Channel provider is not configured",
    "Channel recipient is not configured",
    "Email provider is not configured",
    "Enrichment waterfall is not active",
    "Enrichment waterfall not found",
    "Apify provider is not configured",
    "Apify source broker is disabled",
    "Foursquare provider is blocked pending source approval",
    "Google Places provider is not configured",
    "Meta provider is not configured",
    "No valid target rows supplied",
    "No provider results returned",
    "Owned email sequencer is disabled",
    "Owned sequence is not ready",
    "Owned sequence not found",
    "Owned sequence step is not due",
    "Owned sequence step not found",
    "Outbound export is paused",
    "Provider source policy is required",
    "Provider account is not registered",
    "Provider account is not approved",
    "Provider account credentials are not configured",
    "Provider per-run budget exceeded",
    "Provider daily budget exceeded",
    "Provider monthly budget exceeded",
    "Provider budget policy is not active",
    "Sender domain is not ready",
    "SignalDesk campaign rail is paused",
    "SignalDesk AI provider calls are disabled",
    "SignalDesk AI provider is not configured",
    "SignalDesk AI route is not active",
    "SignalDesk AI route provider is not enabled",
    "SignalDesk AI workers are paused",
    "SignalDesk assisted channels are disabled",
    "SignalDesk Firebase is not configured",
    "SignalDesk provider send is disabled",
    "SignalDesk source providers are disabled",
    "SignalDesk source providers are paused",
    "Target contact is not export-ready",
    "Target has prior contact or outcome",
    "Target is not draft-ready",
    "Target is suppressed",
    "Target not found",
    "Template is inactive",
]);

const getSafeActionErrorMessage = (error: unknown) => {
    if (error instanceof Error && SAFE_ACTION_ERRORS.has(error.message)) return error.message;
    return "SignalDesk action failed";
};

const validatePayload = <T>(schema: z.ZodType<T>, payload: unknown, context: {
    action?: string;
    request: NextRequest;
    session: any;
}) => {
    const validation = validateAPIInput(schema, payload);
    if (validation.success !== true) {
        logSignalDeskValidationFailure({
            action: context.action,
            details: validation.error,
            request: context.request,
            session: context.session,
        });
        return {
            response: NextResponse.json({ error: "Invalid input", details: validation.error }, { status: 400 }),
            success: false as const,
        };
    }
    return {
        data: validation.data,
        success: true as const,
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const disabled = requireSignalDeskRuntime();
    if (disabled) return disabled;

    const body = await parseSignalDeskJsonBody({ request, session });
    if (!body.success) return body.response;

    const envelope = validatePayload(ActionEnvelopeSchema, body.data, {
        action: "action-envelope",
        request,
        session,
    });
    if (!envelope.success) return envelope.response;

    const accessResult = await requireSignalDeskAccess(request, session, permissionForAction(envelope.data.action));
    if ("response" in accessResult) return accessResult.response;

    const rateLimit = await applySignalDeskRateLimit({
        feature: envelope.data.action === "score-target" || envelope.data.action === "run-ai-assist" ? "AI_OPERATION" : "DATA_WRITE",
        keyPrefix: `action:${envelope.data.action}`,
        request,
        session,
    });
    if (rateLimit) return rateLimit;

    try {
        if (envelope.data.action === "seed-defaults") {
            return NextResponse.json({ data: await seedSignalDeskDefaultsServer(accessResult.access) });
        }
        if (envelope.data.action === "create-source-policy") {
            const payload = validatePayload(SourcePolicySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskSourcePolicyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "import-targets") {
            const payload = validatePayload(ImportTargetsSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await importSignalDeskTargetsServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "score-target") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await scoreSignalDeskTargetServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-evidence") {
            const payload = validatePayload(TargetSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskEvidenceServer(accessResult.access, payload.data.targetId) });
        }
        if (envelope.data.action === "create-draft") {
            const payload = validatePayload(DraftSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskDraftServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "review-approval") {
            const payload = validatePayload(ReviewApprovalSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await reviewSignalDeskApprovalServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "export-message") {
            const payload = validatePayload(ExportMessageSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await exportSignalDeskMessageServer(accessResult.access, payload.data.approvalId) });
        }
        if (envelope.data.action === "capture-reply") {
            const payload = validatePayload(CaptureReplySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await captureSignalDeskReplyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "record-outcome") {
            const payload = validatePayload(RecordOutcomeSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await recordSignalDeskOutcomeServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-source-provider") {
            const payload = validatePayload(SourceProviderRunSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskSourceProviderServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-ai-assist") {
            const payload = validatePayload(AiAssistSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskAiAssistServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "prepare-channel-handoff") {
            const payload = validatePayload(ChannelActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await prepareSignalDeskChannelHandoffServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "send-approved-message") {
            const payload = validatePayload(ChannelActionSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await sendSignalDeskApprovedMessageServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-provider-account") {
            const payload = validatePayload(ProviderAccountSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskProviderAccountServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-budget-policy") {
            const payload = validatePayload(BudgetPolicySchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskBudgetPolicyServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-connector-setting") {
            const payload = validatePayload(ConnectorSettingSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskConnectorSettingServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-model-route") {
            const payload = validatePayload(ModelRouteSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskModelRouteServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-enrichment-waterfall") {
            const payload = validatePayload(EnrichmentWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskEnrichmentWaterfallServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-audience-segment") {
            const payload = validatePayload(AudienceSegmentSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskAudienceSegmentServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-sender-domain") {
            const payload = validatePayload(SenderDomainSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskSenderDomainServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "upsert-self-service-cta") {
            const payload = validatePayload(SelfServiceCtaSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await upsertSignalDeskSelfServiceCtaServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "run-enrichment-waterfall") {
            const payload = validatePayload(RunWaterfallSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await runSignalDeskEnrichmentWaterfallServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-approval-packet") {
            const payload = validatePayload(ApprovalPacketSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskApprovalPacketServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "create-sequencer-handoff") {
            const payload = validatePayload(SequencerHandoffSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await createSignalDeskSequencerHandoffServer(accessResult.access, payload.data as any) });
        }
        if (envelope.data.action === "send-owned-sequence-step") {
            const payload = validatePayload(OwnedSequenceStepSchema, envelope.data.payload, {
                action: envelope.data.action,
                request,
                session,
            });
            if (!payload.success) return payload.response;
            return NextResponse.json({ data: await sendSignalDeskOwnedSequenceStepServer(accessResult.access, payload.data as any) });
        }

        const payload = validatePayload(CaptureDemandSignalSchema, envelope.data.payload, {
            action: envelope.data.action,
            request,
            session,
        });
        if (!payload.success) return payload.response;
        return NextResponse.json({ data: await captureSignalDeskDemandSignalServer(accessResult.access, payload.data as any) });
    } catch (error) {
        secureError("[SignalDesk API] Action failed", error as Error, {
            action: envelope.data.action,
            userId: accessResult.access.userId,
        });
        const message = getSafeActionErrorMessage(error);
        return NextResponse.json({ error: message }, { status: message === "SignalDesk action failed" ? 500 : 400 });
    }
});
