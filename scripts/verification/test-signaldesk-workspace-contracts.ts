import assert from "node:assert/strict";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "../../src/constants/signaldesk/database";
import { SIGNALDESK_PRODUCT_CODE } from "../../src/constants/signaldesk/product";
import {
    budgetPolicyIdFor,
    getSignalDeskSpendPeriod,
    providerAccountIdFor,
} from "../../src/lib/signaldesk/accountingContracts";
import {
    getSignalDeskWorkspaceDocumentIdentityField,
    getSignalDeskWorkspacePublicFields,
    isSignalDeskWorkspaceGenericCollection,
    projectSignalDeskWorkspaceDocument,
    projectSignalDeskWorkspaceDocuments,
    SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS,
    type SignalDeskWorkspaceGenericCollection,
} from "../../src/lib/signaldesk/workspaceContracts";

class TestTimestamp {
    constructor(private readonly value: string) {}

    toDate() {
        return new Date(this.value);
    }
}

const timestamp = (value: string) => new TestTimestamp(value);
const currentPeriod = getSignalDeskSpendPeriod("2026-07-15T10:30:00.000Z");
const updatedAt = () => timestamp("2026-07-15T10:00:00.000Z");
const earlierAt = () => timestamp("2026-07-15T09:00:00.000Z");
const laterAt = () => timestamp("2026-07-16T10:00:00.000Z");
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

interface Fixture {
    readonly collection: SignalDeskWorkspaceGenericCollection;
    readonly id: string;
    readonly raw: Readonly<Record<string, unknown>>;
}

const fixture = (
    collection: SignalDeskWorkspaceGenericCollection,
    id: string,
    raw: Readonly<Record<string, unknown>>,
): Fixture => ({
    collection,
    id,
    raw: {
        pId: SIGNALDESK_PRODUCT_CODE,
        privateContact: "owner@example.test",
        privateRecipient: "recipient@example.test",
        rawPayload: { secret: true },
        secret: "must-not-project",
        ...raw,
    },
});

const providerAccountId = providerAccountIdFor("gemini", "ai");
const budgetPolicyId = budgetPolicyIdFor("provider", "gemini");
const outcomeSummaryId = "2026-07-15_two_surface_activation_route-token_qr_target_123";

const fixtures: readonly Fixture[] = [
    fixture(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES, "activation_watch_001", {
        activationWatchId: "activation_watch_001",
        deadlineAt: null,
        lastOutcomeAt: null,
        nextAction: "Review target",
        outcomeTypes: [],
        ownerQualifiedAt: null,
        revenueAccountId: "revenue_account_001",
        source: "signaldesk-outcome-summaries",
        status: "not-started",
        targetId: "target_001",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, "ai_run_001", {
        aiRunId: "ai_run_001",
        confidence: "high",
        costEstimate: 0.02,
        createdAt: updatedAt(),
        model: "gemini-3.5-flash-lite",
        modelEvalId: "model_eval_001",
        modelRouteId: "model_route_score",
        output: { privateReasoning: "must-not-project" },
        prompt: "must-not-project",
        provider: "gemini",
        targetId: "target_001",
        task: "score",
        workerType: "ai_assist_score",
        workerVersion: "ai-assist-v1",
    }),
    fixture(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, "approval_packet_001", {
        allowedRoute: "none",
        approvalPacketId: "approval_packet_001",
        channelReadiness: "blocked",
        costImpactUsd: 0,
        recommendedAction: "hold",
        riskSummary: "No delivery authority yet",
        status: "pending",
        suppressionStatus: "clear",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE, "approval_001", {
        approvalId: "approval_001",
        channel: "email",
        priority: "normal",
        rejectionReason: null,
        reviewReason: "Founder review required",
        status: "pending",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.AUDIENCE_SEGMENTS, "audience_segment_001", {
        audienceSegmentId: "audience_segment_001",
        criteriaSummary: "Independent restaurants in Bengaluru",
        marketPodId: null,
        name: "Bengaluru restaurants",
        sourcePolicyId: "source_policy_001",
        status: "active",
        triggerType: "manual",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS, "audit_event_001", {
        action: "approval.reviewed",
        actorId: "founder_admin",
        actorRole: "founder-admin",
        auditEventId: "audit_event_001",
        createdAt: updatedAt(),
        entityId: "approval_001",
        entityType: "approval",
        reason: "Manual review",
    }),
    fixture(SIGNALDESK_COLLECTIONS.BUDGET_POLICIES, budgetPolicyId, {
        budgetPolicyId,
        dailyBudgetUsd: 5,
        monthlyBudgetUsd: 100,
        name: "Gemini budget",
        perRunBudgetUsd: 0.25,
        provider: "gemini",
        scope: "provider",
        scopeId: null,
        spendDayKey: "2026-07-15",
        spendMonthKey: "2026-07",
        spentMonthUsd: 8,
        spentTodayUsd: 2,
        status: "active",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES, "email", {
        channel: "email",
        configured: true,
        lastError: null,
        lastEventAt: updatedAt(),
        status: "healthy",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.CHANNEL_WINDOW_STATES, "channel_window_001", {
        channel: "whatsapp",
        channelWindowId: "channel_window_001",
        eligibleForHandoff: true,
        expiresAt: laterAt(),
        lastInteractionAt: updatedAt(),
        openedAt: earlierAt(),
        reason: null,
        source: "inbound",
        status: "open",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.COMMERCIAL_OFFERS, "commercial_offer_001", {
        allowedDiscountBps: 0,
        billingCadence: "monthly",
        commercialOfferId: "commercial_offer_001",
        contents: ["MenuList activation"],
        currency: "INR",
        eligibilitySummary: "Owner-qualified restaurant",
        founderApprovalConditions: [],
        name: "Owner activation",
        offerCtaId: null,
        priceMinor: 10000,
        status: "active",
        updatedAt: updatedAt(),
        version: 1,
    }),
    fixture(SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES, "opportunity_001", {
        commercialOfferId: null,
        currency: null,
        expectedCloseAt: null,
        founderAttentionMinutes: 0,
        nextAction: "Confirm owner interest",
        nextActionDueAt: null,
        opportunityId: "opportunity_001",
        probabilityPercent: 10,
        revenueAccountId: "revenue_account_001",
        stage: "qualified",
        stalledReason: null,
        status: "open",
        targetId: "target_001",
        title: "Example Restaurant activation",
        updatedAt: updatedAt(),
        valueMinor: 0,
        winLossReason: null,
    }),
    fixture(SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS, "connector_email_001", {
        accessToken: "must-not-project",
        accessTokenState: "not_required",
        apiKey: "must-not-project",
        apiKeyState: "not_required",
        appId: null,
        appSecret: "must-not-project",
        appSecretState: "not_required",
        channel: "email",
        connectorId: "connector_email_001",
        connectorKind: "email-smtp",
        displayName: "Owned email",
        envReadiness: "ready",
        fromName: "MenuList",
        instagramPageId: null,
        messengerPageId: null,
        missingEnv: [],
        notes: null,
        phoneNumber: null,
        phoneNumberId: null,
        provider: "smtp",
        replyToEmail: "reply@example.test",
        senderDomain: "example.test",
        senderEmail: "hello@example.test",
        smtpCredentialState: "configured",
        status: "active",
        updatedAt: updatedAt(),
        webhookSecret: "must-not-project",
        webhookSecretState: "not_required",
    }),
    fixture(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES, "conv_target_001", {
        channel: "email",
        conversationId: "conv_target_001",
        lastInboundAt: earlierAt(),
        lastInboundOccurredAt: earlierAt(),
        lastMessagePreview: "I am interested",
        lastOutboundAt: null,
        state: "interested",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.DEMAND_SIGNAL_SUMMARIES, "demand_signal_001", {
        count: 1,
        day: "2026-07-15",
        demandSignalId: "demand_signal_001",
        signalType: "link_click",
        sourceSurface: "website",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES, "draft_001", {
        approvalId: null,
        body: "Here is your current menu link.",
        channel: "email",
        draftId: "draft_001",
        evidencePacketId: null,
        subject: "Your current menu",
        status: "draft",
        targetId: "target_001",
        targetName: "Example Restaurant",
        templateId: "template_001",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS, "enrichment_result_001", {
        confidence: "high",
        enrichmentResultId: "enrichment_result_001",
        expiresAt: laterAt(),
        field: "email",
        provider: "hunter",
        sourcePolicyId: "source_policy_001",
        status: "verified",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
        valuePreview: "o***r@example.test",
    }),
    fixture(SIGNALDESK_COLLECTIONS.ENRICHMENT_WATERFALLS, "waterfall_001", {
        maxCostUsd: 1,
        maxCredits: 2,
        name: "Email verification",
        providerOrder: ["hunter", "zerobounce"],
        requestedField: "email",
        retentionDays: 30,
        sourcePolicyId: "source_policy_001",
        status: "active",
        stopCondition: "first-verified",
        updatedAt: updatedAt(),
        verificationRequired: true,
        waterfallId: "waterfall_001",
    }),
    fixture(SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES, "evidence_packet_001", {
        allowedUse: ["draft-preparation"],
        confidence: "high",
        evidencePacketId: "evidence_packet_001",
        rejectedFacts: [],
        summary: "Current menu link is missing.",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.MODEL_EVALS, "model_eval_001", {
        acceptanceRate: 1,
        acceptedCount: 1,
        editRate: 0,
        editedCount: 0,
        heldCount: 0,
        holdRate: 0,
        model: "gemini-3.5-flash-lite",
        modelEvalId: "model_eval_001",
        modelRouteId: "model_route_score",
        passRate: 1,
        passedSampleCount: 1,
        provider: "gemini",
        rejectedCount: 0,
        rejectedFactRate: 0,
        rejectedFactSampleCount: 0,
        rejectionRate: 0,
        reviewedSampleSize: 1,
        sampleSize: 1,
        status: "passed",
        task: "score",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.MODEL_ROUTES, "model_route_score", {
        confidenceThreshold: "medium",
        defaultModel: "gemini-3.5-flash-lite",
        defaultProvider: "gemini",
        escalationModel: null,
        escalationProvider: null,
        maxCostUsd: 1,
        modelRouteId: "model_route_score",
        status: "active",
        task: "score",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES, "operating_envelope_001", {
        approvalMode: "manual",
        approvedAt: null,
        approvedBy: null,
        budgetPolicyId: budgetPolicyId,
        channel: "manual",
        commercialOfferId: "commercial_offer_001",
        dailyVolumeCap: 1,
        executionState: "shadow",
        expiresAt: timestamp("2026-08-15T10:00:00.000Z"),
        fallbackAction: "hold",
        marketPodId: null,
        maxCostUsd: 5,
        name: "Manual activation review",
        operatingEnvelopeId: "operating_envelope_001",
        requestedApprovalMode: "manual",
        senderDomainId: null,
        sourcePolicyIds: ["source_policy_001"],
        startsAt: timestamp("2026-07-15T10:00:00.000Z"),
        status: "draft",
        stopConditions: ["Founder hold"],
        templateIds: [],
        totalVolumeCap: 10,
        updatedAt: updatedAt(),
        version: 1,
    }),
    fixture(SIGNALDESK_COLLECTIONS.OUTCOME_SUMMARIES, outcomeSummaryId, {
        channel: "qr",
        count: 1,
        day: "2026-07-15",
        evidenceRef: "menu_record:store_123",
        integrityStatus: "menulist-signed",
        latestOutcomeEventId: "outcome_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        outcomeSummaryId,
        outcomeType: "two_surface_activation",
        ownerQualifiedAt: earlierAt(),
        ownerReviewedAt: updatedAt(),
        routeTokenId: "route_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        source: "route-token",
        sourceEventId: "menulist.event.001",
        surfaces: ["qr", "website"],
        targetId: "target_123",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.PROVIDER_ACCOUNTS, providerAccountId, {
        credentialState: "configured",
        dailyBudgetUsd: 5,
        monthlyBudgetUsd: 100,
        ownerApproved: true,
        perRunBudgetUsd: 0.25,
        provider: "gemini",
        providerAccountId,
        spendDayKey: "2026-07-15",
        spendMonthKey: "2026-07",
        spentMonthUsd: 8,
        spentTodayUsd: 2,
        status: "approved",
        updatedAt: updatedAt(),
        use: "ai",
    }),
    fixture(SIGNALDESK_COLLECTIONS.PROVIDER_EVALUATIONS, "provider_evaluation_001", {
        accountingMonth: currentPeriod.spendMonthKey,
        blockedRate: 0,
        costPerUsefulResultUsd: 0.1,
        evidenceQualityScore: 90,
        populationTruncated: false,
        provider: "gemini",
        providerEvaluationId: "provider_evaluation_001",
        recommendation: "approve",
        replyOutcomeScore: 90,
        sampleSize: 1,
        status: "passed",
        suppressionRisk: "low",
        updatedAt: updatedAt(),
        use: "ai",
        verifiedContactRate: 1,
    }),
    fixture(SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION, "provider_retention_001", {
        lastRefreshedAt: null,
        provider: "google-places",
        providerRecordId: "place_001",
        providerRecordUrl: "https://example.test/place/001",
        providerSourceRetentionId: "provider_retention_001",
        rawPayloadStored: false,
        refreshDueAt: laterAt(),
        retentionExpiresAt: timestamp("2026-08-15T10:00:00.000Z"),
        sourcePolicyId: "source_policy_001",
        sourceRunId: "source_run_001",
        status: "active",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.REPLY_PLAYBOOKS, "reply_playbook_001", {
        approvedReply: "Here are the current details.",
        escalationRequired: false,
        intent: "send-details",
        nextRoute: "self-serve-preview",
        playbookId: "reply_playbook_001",
        status: "active",
        suppressionRequired: false,
        title: "Send details",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS, "revenue_account_001", {
        activationState: "not-started",
        automationState: "manual",
        category: "restaurant",
        city: "Bengaluru",
        complianceState: "eligible",
        country: "India",
        displayName: "Example Restaurant",
        engagementState: "none",
        lifecycleStage: "prospect",
        locationType: "single-location",
        nextAction: "Review target",
        organizationId: "organization_001",
        primaryTargetId: "target_001",
        revenueAccountId: "revenue_account_001",
        targetIds: ["target_001"],
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.REVENUE_CONTROL_SUMMARIES, SIGNALDESK_SUMMARY_DOCS.REVENUE, {
        activatedAccountCount: 0,
        founderAttentionMinutes: 0,
        lostOpportunityCount: 0,
        openOpportunityCount: 1,
        pipelineCurrency: "INR",
        pipelineValueMinor: 0,
        revenueAccountCount: 1,
        revenueControlSummaryId: SIGNALDESK_SUMMARY_DOCS.REVENUE,
        stalledActivationCount: 0,
        updatedAt: updatedAt(),
        weightedPipelineValueMinor: 0,
        wonOpportunityCount: 0,
    }),
    fixture(SIGNALDESK_COLLECTIONS.RUN_TIMELINES, "run_timeline_001", {
        entityId: "target_001",
        entityType: "target",
        label: "Target review",
        runTimelineId: "run_timeline_001",
        status: "ready",
        steps: [{ at: null, label: "Review evidence", status: "ready" }],
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS, "sequencer_handoff_001", {
        approvalId: "approval_001",
        blockedReason: null,
        ctaFingerprintHash: hashA,
        ctaId: "cta_001",
        currentStep: 1,
        nextSendAt: laterAt(),
        provider: "owned-email",
        recipientPreview: "o***r@example.test",
        senderDomainFingerprintHash: hashB,
        senderDomainId: "sender_domain_001",
        sequencerHandoffId: "sequencer_handoff_001",
        status: "queued",
        stepCount: 1,
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS, "sequence_step_001", {
        approvalId: "approval_001",
        body: "This full message body must never reach the workspace.",
        bodyPreview: "This full message body...",
        channel: "email",
        ctaFingerprintHash: hashA,
        ctaId: "cta_001",
        draftId: "draft_001",
        scheduledAt: laterAt(),
        senderDomainId: "sender_domain_001",
        sentAt: null,
        sequenceStepId: "sequence_step_001",
        sequencerHandoffId: "sequencer_handoff_001",
        status: "ready",
        stepNumber: 1,
        subject: "Your current menu",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.SOURCE_QUALITY_SNAPSHOTS, "source_quality_001", {
        activationRate: 0.1,
        complaintOrBounceRisk: "low",
        duplicateRate: 0,
        evidenceQualityScore: 90,
        recommendation: "continue",
        sourceName: "Google Places",
        sourcePolicyId: "source_policy_001",
        sourceQualitySnapshotId: "source_quality_001",
        sourceRunId: "source_run_001",
        targetCount: 10,
        updatedAt: updatedAt(),
        usableTargetRate: 0.9,
    }),
    fixture(SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS, "strategist_memo_001", {
        costSummary: "Spend remains within policy.",
        nextDecisions: ["Continue current source"],
        providerQualitySummary: "Evidence quality remains high.",
        recommendedMarketPodId: null,
        riskNotes: [],
        status: "ready",
        strategistMemoId: "strategist_memo_001",
        summary: "No action needed.",
        title: "Weekly review",
        updatedAt: updatedAt(),
        weekStart: "2026-07-13",
    }),
    fixture(SIGNALDESK_COLLECTIONS.TEAM_MEMBERS, "team_member_001", {
        active: true,
        createdAt: earlierAt(),
        createdBy: "founder_admin",
        email: "operator@example.test",
        emailLower: "operator@example.test",
        name: "Operator",
        permissions: ["signaldesk.view"],
        role: "operator",
        status: "active",
        teamMemberId: "team_member_001",
        updatedAt: updatedAt(),
        updatedBy: "founder_admin",
        userId: "user_001",
    }),
    fixture(SIGNALDESK_COLLECTIONS.TEMPLATE_SUMMARIES, "template_001", {
        approvedVariables: ["business_name"],
        body: "Hello {{business_name}}",
        channel: "email",
        name: "Current menu",
        status: "active",
        subject: "Your current menu",
        templateId: "template_001",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DEALS, "trust_deal_001", {
        approvalStatus: "pending",
        budgetPolicyId: null,
        dealId: "trust_deal_001",
        deliverableCount: 1,
        dueDate: "2026-08-01",
        flatFeeUsd: 0,
        nicheTestId: "niche_test_001",
        partnerId: "partner_001",
        partnerName: "Example Partner",
        paymentState: "not_due",
        pricingModel: "barter",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_DELIVERABLES, "deliverable_001", {
        dealId: "trust_deal_001",
        deliverableId: "deliverable_001",
        disclosurePresent: false,
        dueDate: "2026-08-01",
        partnerId: "partner_001",
        postUrl: null,
        reviewState: "pending",
        status: "scheduled",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_METRICS, "metrics_001", {
        activations: 1,
        capturedAt: updatedAt(),
        commentQuality: "high",
        comments: 2,
        currentListSubmissions: 1,
        deliverableId: "deliverable_001",
        metricsId: "metrics_001",
        ownerLeads: 1,
        partnerId: "partner_001",
        views: 100,
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_NICHE_TESTS, "niche_test_001", {
        angle: "Current-menu ownership",
        intendedAttempts: 3,
        marketPodId: null,
        nicheName: "Restaurant consultants",
        nicheTestId: "niche_test_001",
        partnerCount: 1,
        recommendation: "continue",
        status: "active",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_PROFILES, "partner_001", {
        audienceFitScore: 90,
        baselineReachScore: 70,
        believableUsageScore: 95,
        channel: "instagram",
        commentQualityScore: 80,
        displayName: "Example Partner",
        geography: "Bengaluru",
        partnerId: "partner_001",
        partnerType: "restaurant-consultant",
        sourceNotes: "Independent restaurant audience",
        status: "approved",
        trustFeelScore: 90,
        trustScore: 90,
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.TRUST_PARTNER_RENEWAL_DECISIONS, "renewal_001", {
        createdAt: earlierAt(),
        decisionId: "renewal_001",
        evidenceSummary: "One qualified owner activation.",
        nicheTestId: "niche_test_001",
        ownerDecision: "pending",
        partnerId: "partner_001",
        recommendation: "renew",
        updatedAt: updatedAt(),
    }),
    fixture(SIGNALDESK_COLLECTIONS.VENDOR_RUNS, "vendor_run_001", {
        blockedReason: null,
        costEstimateUsd: 0.1,
        provider: "hunter",
        requestedField: "email",
        resultCount: 1,
        status: "completed",
        targetId: "target_001",
        targetName: "Example Restaurant",
        updatedAt: updatedAt(),
        vendorRunId: "vendor_run_001",
        waterfallId: "waterfall_001",
    }),
    fixture(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS, "provider_event_001", {
        channel: "email",
        direction: "inbound",
        eventId: "provider_event_001",
        eventType: "message.received",
        headers: { authorization: "must-not-project" },
        occurredAt: earlierAt(),
        payload: { body: "must-not-project" },
        provider: "smtp",
        providerMessageId: "smtp/message/001",
        signature: "must-not-project",
        status: "received",
        targetId: "target_001",
        updatedAt: updatedAt(),
    }),
];

assert.equal(SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS.length, 43, "The generic-read inventory must stay explicit");
assert.equal(new Set(SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS).size, 43, "The generic-read inventory must be unique");
assert.deepEqual(
    fixtures.map(({ collection }) => collection).sort(),
    [...SIGNALDESK_WORKSPACE_GENERIC_COLLECTIONS].sort(),
    "Every generic-read collection needs a valid projection fixture",
);

for (const { collection, id, raw } of fixtures) {
    assert.equal(isSignalDeskWorkspaceGenericCollection(collection), true, `${collection} must be registered`);
    assert.ok(getSignalDeskWorkspaceDocumentIdentityField(collection), `${collection} needs an identity contract`);
    assert.equal(Object.isFrozen(getSignalDeskWorkspacePublicFields(collection)), true, `${collection} allowlist must be immutable`);

    const projected = projectSignalDeskWorkspaceDocument(collection, raw, id, currentPeriod);
    assert.ok(projected, `${collection}/${id} valid fixture must project`);

    const publicFields = new Set(getSignalDeskWorkspacePublicFields(collection));
    for (const key of Object.keys(projected)) {
        assert.equal(publicFields.has(key), true, `${collection}/${id} projected non-public field ${key}`);
    }
    for (const key of ["pId", "privateContact", "privateRecipient", "rawPayload", "secret"]) {
        assert.equal(key in projected, false, `${collection}/${id} leaked ${key}`);
    }

    assert.equal(
        projectSignalDeskWorkspaceDocument(collection, { ...raw, pId: "ML" }, id, currentPeriod),
        null,
        `${collection}/${id} must reject another product`,
    );
    assert.equal(
        projectSignalDeskWorkspaceDocument(collection, raw, id + "_other", currentPeriod),
        null,
        `${collection}/${id} must reject document identity mismatch`,
    );
}

const operatingEnvelopeFixture = fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES);
assert.ok(operatingEnvelopeFixture, "Operating-envelope projection fixture must exist");
assert.ok(projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES,
    {
        ...operatingEnvelopeFixture.raw,
        approvedAt: earlierAt(),
        approvedBy: "founder_admin",
        executionState: "paused",
        status: "paused",
    },
    operatingEnvelopeFixture.id,
    currentPeriod,
), "Paused operating envelope must preserve complete founder approval history");
assert.equal(projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.OPERATING_ENVELOPES,
    {
        ...operatingEnvelopeFixture.raw,
        approvedAt: earlierAt(),
        approvedBy: null,
        executionState: "paused",
        status: "paused",
    },
    operatingEnvelopeFixture.id,
    currentPeriod,
), null, "Operating envelope must reject partial approval identity");

const connector = projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS,
    fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.CONNECTOR_SETTINGS)?.raw,
    "connector_email_001",
    currentPeriod,
);
assert.ok(connector);
for (const key of ["accessToken", "apiKey", "appSecret", "webhookSecret"]) assert.equal(key in connector, false);

const aiRun = projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS,
    fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS)?.raw,
    "ai_run_001",
    currentPeriod,
);
assert.ok(aiRun);
assert.equal("output" in aiRun, false);
assert.equal("prompt" in aiRun, false);

const targetScore = projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, {
    contactabilityScore: 80,
    costEstimate: 0,
    createdAt: updatedAt(),
    currentListGapScore: 90,
    fitScore: 85,
    nextAction: "evidence",
    output: { privateReasoning: "must-not-project" },
    pId: SIGNALDESK_PRODUCT_CODE,
    reasons: ["Current list gap observed"],
    riskScore: 10,
    scoreId: "target_score_001",
    segment: "a",
    targetId: "target_001",
    workerType: "target_score",
    workerVersion: "rules-v1",
}, "target_score_001", currentPeriod);
assert.ok(targetScore, "Rule-based target-score variant must project");
assert.equal("workerType" in targetScore, false);
assert.equal("output" in targetScore, false);

const volumeRun = projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, {
    aiRunId: "ai_volume_001",
    childRunIds: ["ai_child_001"],
    completedAt: updatedAt(),
    completedPairCount: 1,
    createdAt: earlierAt(),
    createdBy: "founder_admin",
    estimatedCostUsd: 0.01,
    failedPairCount: 0,
    failureCodes: [],
    idempotencyKeyHash: hashA,
    instruction: "must-not-project",
    lockExpiresAt: null,
    maxEstimatedCostUsd: 1,
    modelCallCount: 1,
    pId: SIGNALDESK_PRODUCT_CODE,
    projectedMaxCostUsd: 0.01,
    requestFingerprintHash: hashB,
    requestedPairCount: 1,
    status: "completed",
    targetIds: ["target_001"],
    tasks: ["score"],
    updatedAt: updatedAt(),
    volumeRunId: "ai_volume_001",
    workerClaimId: "worker_claim_001",
    workerType: "ai_volume_batch",
    workerVersion: "ai-volume-v1",
}, "ai_volume_001", currentPeriod);
assert.ok(volumeRun, "Bounded AI volume-run variant must project");
for (const key of ["idempotencyKeyHash", "instruction", "requestFingerprintHash", "workerClaimId"]) {
    assert.equal(key in volumeRun, false, `AI volume projection leaked ${key}`);
}
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, {
    aiRunId: "ai_volume_lock_001",
    pId: SIGNALDESK_PRODUCT_CODE,
    workerType: "ai_volume_lock",
}, "ai_volume_lock_001", currentPeriod), null, "AI coordination locks must never enter workspace output");

const retainedVolumeRun = projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, {
    ...volumeRun,
    aiDetailLifecycleState: "completed",
    aiRunId: "ai_volume_retained_001",
    childRunIds: ["ai_child_001"],
    completedAt: updatedAt(),
    completedPairCount: 1,
    createdAt: earlierAt(),
    createdBy: "founder_admin",
    estimatedCostUsd: 0.01,
    failedPairCount: 0,
    failureCodes: [],
    lockExpiresAt: null,
    maxEstimatedCostUsd: 1,
    modelCallCount: 1,
    pId: SIGNALDESK_PRODUCT_CODE,
    requestedPairCount: 1,
    status: "completed",
    targetIds: [],
    tasks: ["score"],
    updatedAt: updatedAt(),
    volumeRunId: "ai_volume_retained_001",
    workerType: "ai_volume_batch",
    workerVersion: "ai-volume-v1",
}, "ai_volume_retained_001", currentPeriod);
assert.ok(retainedVolumeRun, "AI volume summary must survive 90-day detail removal");

const retainedScore = projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.AI_WORKER_RUNS, {
    contactabilityScore: 80,
    costEstimate: 0,
    createdAt: earlierAt(),
    currentListGapScore: 90,
    fitScore: 85,
    nextAction: "review",
    pId: SIGNALDESK_PRODUCT_CODE,
    reasons: ["Source-derived details expired; re-score after a verified source refresh."],
    riskScore: 10,
    scoreId: "target_score_retained_001",
    segment: "hold",
    targetId: "target_001",
    workerType: "target_score",
    workerVersion: "rules-v1",
}, "target_score_retained_001", currentPeriod);
assert.ok(retainedScore, "Retained target-score summary must remain projectable");

const retainedOverrides: ReadonlyArray<{
    collection: SignalDeskWorkspaceGenericCollection;
    id: string;
    overrides: Record<string, unknown>;
}> = [
    {
        collection: SIGNALDESK_COLLECTIONS.APPROVAL_QUEUE,
        id: "approval_001",
        overrides: { rejectionReason: "other", reviewReason: "Source-data retention lifecycle completed.", status: "rejected", targetName: "Retained target record" },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.DRAFT_SUMMARIES,
        id: "draft_001",
        overrides: { body: "Source-derived draft removed by retention policy.", status: "rejected", subject: "Retained draft", targetName: "Retained target record" },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.ENRICHMENT_RESULTS,
        id: "enrichment_result_001",
        overrides: { confidence: "low", expiresAt: null, field: "retained-source-field", status: "blocked", targetName: "Retained target record", valuePreview: null },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.EVIDENCE_PACKET_SUMMARIES,
        id: "evidence_packet_001",
        overrides: { allowedUse: [], confidence: "low", currentMenuPresence: undefined, rejectedFacts: ["source-data-retention"], summary: "Source-derived evidence removed by retention policy.", targetName: "Retained target record" },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.PROVIDER_SOURCE_RETENTION,
        id: "provider_retention_001",
        overrides: { providerRecordId: null, providerRecordUrl: null, rawPayloadStored: false, retentionExpiresAt: earlierAt(), status: "expired", targetName: "Retained target record" },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.REVENUE_ACCOUNTS,
        id: "revenue_account_001",
        overrides: { activationState: "not-started", automationState: "paused", complianceState: "blocked", displayName: "Retained revenue account", engagementState: "none", lifecycleStage: "nurture", nextAction: "No action; source-data retention completed." },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.COMMERCIAL_OPPORTUNITIES,
        id: "opportunity_001",
        overrides: { currency: null, expectedCloseAt: null, nextAction: "No action; source-data retention completed.", nextActionDueAt: null, probabilityPercent: 0, stage: "nurture", status: "nurture", title: "Retained commercial opportunity", valueMinor: 0 },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES,
        id: "conv_target_001",
        overrides: {
            legalRetentionReviewReason: "conversation-record",
            legalRetentionReviewRequired: true,
            sourceDataLifecycleCompletedAt: earlierAt(),
            sourceDataLifecycleKind: "source-data-retention-v1",
            sourceDataLifecycleState: "completed",
            sourceDataLifecycleToken: `source_data_target_${"a".repeat(40)}`,
            updatedBy: "signaldesk-source-data-lifecycle",
        },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.SEQUENCER_HANDOFFS,
        id: "sequencer_handoff_001",
        overrides: { blockedReason: null, nextSendAt: null, providerLeadId: null, recipientPreview: null, status: "stopped", targetName: "Retained target record" },
    },
    {
        collection: SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS,
        id: "sequence_step_001",
        overrides: { bodyPreview: "Source-derived message removed by retention policy.", scheduledAt: null, sentAt: null, status: "blocked", subject: "Retained sequence step", targetName: "Retained target record" },
    },
];
for (const retained of retainedOverrides) {
    const base = fixtures.find(({ collection, id }) => collection === retained.collection && id === retained.id);
    assert.ok(base, `Missing retained fixture ${retained.collection}/${retained.id}`);
    assert.ok(
        projectSignalDeskWorkspaceDocument(
            retained.collection,
            { ...base.raw, ...retained.overrides },
            retained.id,
            currentPeriod,
        ),
        `${retained.collection}/${retained.id} retention tombstone must remain projectable`,
    );
}

const sequenceStep = projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS,
    fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.SEQUENCER_STEPS)?.raw,
    "sequence_step_001",
    currentPeriod,
);
assert.ok(sequenceStep);
assert.equal("body" in sequenceStep, false, "Sequencer full body must never enter the workspace DTO");
assert.equal("bodyPreview" in sequenceStep, true, "Sequencer workspace DTO keeps only the bounded preview");

const providerEvent = projectSignalDeskWorkspaceDocument(
    SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS,
    fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS)?.raw,
    "provider_event_001",
    currentPeriod,
);
assert.ok(providerEvent);
for (const key of ["headers", "payload", "signature"]) assert.equal(key in providerEvent, false);
const providerEventFixture = fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS);
assert.ok(providerEventFixture);
assert.ok(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS, {
    ...providerEventFixture.raw,
    providerMessageId: "m".repeat(998),
}, providerEventFixture.id, currentPeriod), "Valid SMTP provider message IDs up to 998 characters must project");
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS, {
    ...providerEventFixture.raw,
    providerMessageId: "m".repeat(999),
}, providerEventFixture.id, currentPeriod), null, "Overlong provider message IDs must fail closed");

const approvalPacket = fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS);
assert.ok(approvalPacket);
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, {
    ...approvalPacket.raw,
    channelReadiness: "blocked",
    recommendedAction: "approve",
}, approvalPacket.id, currentPeriod), null, "Approval recommendation must have channel authority");
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.APPROVAL_PACKETS, {
    ...approvalPacket.raw,
    riskSummary: "x".repeat(1_001),
}, approvalPacket.id, currentPeriod), null, "Approval packet bounds must fail closed");

const activationWatch = fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES);
assert.ok(activationWatch);
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES, {
    ...activationWatch.raw,
    updatedAt: "2026-07-15 10:00:00",
}, activationWatch.id, currentPeriod), null, "Malformed persisted timestamp must fail closed");
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES, {
    ...activationWatch.raw,
    updatedAt: { nanoseconds: 1_000_000_000, seconds: 1_752_576_400 },
}, activationWatch.id, currentPeriod), null, "Out-of-range Firestore nanoseconds must fail closed");

const strategistMemo = fixtures.find(({ collection }) => collection === SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS);
assert.ok(strategistMemo);
assert.equal(projectSignalDeskWorkspaceDocument(SIGNALDESK_COLLECTIONS.STRATEGIST_MEMOS, {
    ...strategistMemo.raw,
    weekStart: "2026-02-30",
}, strategistMemo.id, currentPeriod), null, "Normalized-but-impossible calendar dates must fail closed");

const validAfterRejectedRows = projectSignalDeskWorkspaceDocuments(
    SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES,
    [
        ...Array.from({ length: 35 }, (_, index) => ({
            data: { ...activationWatch.raw, pId: "ML" },
            id: `wrong_product_${index}`,
        })),
        { data: activationWatch.raw, id: activationWatch.id },
    ],
    { currentPeriod, limit: 1 },
);
assert.equal(validAfterRejectedRows.length, 1, "Projection limit must apply after invalid rows are removed");
assert.equal("activationWatchId" in validAfterRejectedRows[0], true);

assert.equal(isSignalDeskWorkspaceGenericCollection("signalDeskUnknownCollection"), false);
assert.throws(
    () => projectSignalDeskWorkspaceDocuments(SIGNALDESK_COLLECTIONS.ACTIVATION_WATCHES, [], { limit: 0 }),
    /SIGNALDESK_WORKSPACE_PROJECTION_LIMIT_INVALID/,
);

console.log(`SignalDesk workspace contracts passed (${fixtures.length} collections)`);
