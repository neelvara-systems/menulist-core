import assert from "node:assert/strict";
import {
    canServeSignalDeskMobileWorkspaceSection,
    createEmptySignalDeskWorkspace,
    getSignalDeskOverview,
    getSignalDeskWorkspace,
    hasSignalDeskWorkspaceSectionAccess,
    isExactSignalDeskMobileReadonlyMode,
    isSignalDeskClientDataEnvelope,
    isSignalDeskKillSwitchData,
    isSignalDeskOverviewData,
    isSignalDeskWorkspaceData,
    parseSignalDeskWorkspaceSection,
    SIGNALDESK_WORKSPACE_ARRAY_KEYS,
    SIGNALDESK_WORKSPACE_SECTIONS,
} from "../../src/database/signaldesk";
import {
    canCommitSignalDeskRefresh,
    createSignalDeskLatestRequestCoordinator,
    isSignalDeskRefreshCurrentSection,
} from "../../src/hooks/signaldesk/useSignalDeskOverview";
import type {
    SignalDeskOverview,
    SignalDeskPermission,
    SignalDeskRole,
    SignalDeskSection,
    SignalDeskWorkspaceResponse,
} from "../../src/types/signaldesk";
import { NextRequest } from "next/server";

const ALL_PERMISSIONS: SignalDeskPermission[] = [
    "signaldesk.view",
    "signaldesk.configure",
    "target.review",
    "contact.reveal",
    "draft.create",
    "draft.approve",
    "message.export",
    "message.send",
    "source.configure",
    "channel.configure",
    "policy.approve",
    "kill-switch.activate",
    "kill-switch.deactivate",
    "audit.view",
];

const ROLE_PERMISSIONS: Record<SignalDeskRole, SignalDeskPermission[]> = {
    "founder-admin": ALL_PERMISSIONS,
    "growth-manager": [
        "signaldesk.view",
        "target.review",
        "draft.create",
        "draft.approve",
        "message.export",
        "source.configure",
        "channel.configure",
        "audit.view",
    ],
    operator: ["signaldesk.view", "target.review", "draft.create", "message.export"],
    "compliance-reviewer": [
        "signaldesk.view",
        "policy.approve",
        "kill-switch.activate",
        "audit.view",
    ],
    "readonly-analyst": ["signaldesk.view"],
    "system-worker": [],
};

const EXPECTED_ROLE_SECTIONS: Record<SignalDeskRole, SignalDeskSection[]> = {
    "founder-admin": [...SIGNALDESK_WORKSPACE_SECTIONS],
    "growth-manager": [...SIGNALDESK_WORKSPACE_SECTIONS],
    operator: [
        "dashboard",
        "mission",
        "revenue",
        "targets",
        "imports",
        "approvals",
        "templates",
        "inbox",
        "attribution",
        "ai",
        "channels",
        "content",
    ],
    "compliance-reviewer": [
        "dashboard",
        "attribution",
        "policies",
        "partners",
        "control-room",
        "audit",
    ],
    "readonly-analyst": ["dashboard"],
    "system-worker": [],
};

const validOverview = (): SignalDeskOverview => ({
    access: {
        active: true,
        email: "analyst@example.test",
        firebaseConfigured: true,
        isPlatformAdmin: false,
        name: "SignalDesk Analyst",
        permissions: ["signaldesk.view"],
        role: "readonly-analyst",
        userId: "user_signaldesk_analyst",
    },
    activeKillSwitches: [],
    controlRoom: {
        activeKillSwitchCount: 0,
        channelStatus: "healthy",
        costStatus: "healthy",
        demandSignalCount: 1,
        openIncidentCount: 0,
        outcomeCount: 2,
        sourceStatus: "healthy",
        targetCount: 3,
        updatedAt: "2026-07-15T10:00:00.000Z",
    },
    cost: {
        aiCostEstimate: 0.25,
        firestoreReadEstimate: 0.01,
        firestoreWriteEstimate: 0.02,
        providerCostEstimate: 0.5,
        updatedAt: "2026-07-15T10:00:00.000Z",
    },
    incidents: [],
    metrics: [
        { key: "targets", label: "Targets", tone: "neutral", value: 3 },
        { key: "cost", label: "Daily Cost Estimate", tone: "neutral", value: "$0.75" },
    ],
    queues: {
        approvalBacklog: 0,
        humanReview: 1,
        inboxBacklog: 0,
        overdue: 0,
    },
    setup: {
        firebaseConfigured: true,
        providerSendEnabled: false,
        runtimeEnabled: true,
    },
});

const validWorkspace = (section: SignalDeskSection = "dashboard"): SignalDeskWorkspaceResponse => ({
    ...validOverview(),
    workspace: createEmptySignalDeskWorkspace(section),
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assertSectionAndPermissionContracts = () => {
    assert.equal(parseSignalDeskWorkspaceSection(null), "dashboard");
    assert.equal(parseSignalDeskWorkspaceSection("dashboard"), "dashboard");
    assert.equal(parseSignalDeskWorkspaceSection("unknown"), null);
    assert.equal(parseSignalDeskWorkspaceSection(""), null);
    assert.equal(parseSignalDeskWorkspaceSection(" dashboard "), null);

    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS) as Array<[
        SignalDeskRole,
        SignalDeskPermission[],
    ]>) {
        const expectedSections = new Set(EXPECTED_ROLE_SECTIONS[role]);
        for (const section of SIGNALDESK_WORKSPACE_SECTIONS) {
            assert.equal(
                hasSignalDeskWorkspaceSectionAccess({ permissions, role }, section),
                expectedSections.has(section),
                `${role} section access mismatch for ${section}`,
            );
        }
    }

    assert.equal(
        hasSignalDeskWorkspaceSectionAccess({ permissions: ["audit.view"], role: "compliance-reviewer" }, "audit"),
        false,
        "A section permission must not replace the baseline SignalDesk view permission",
    );
    assert.equal(
        hasSignalDeskWorkspaceSectionAccess({ permissions: ALL_PERMISSIONS, role: "readonly-analyst" }, "audit"),
        false,
        "Readonly analysts must remain dashboard-only even if a malformed membership adds permissions",
    );
};

const assertMobileProjectionContracts = async () => {
    assert.equal(isExactSignalDeskMobileReadonlyMode("mobile-readonly"), true);
    for (const value of [null, "", "mobile", "MOBILE-READONLY", "mobile-readonly ", "desktop"]) {
        assert.equal(isExactSignalDeskMobileReadonlyMode(value), false);
    }
    const mobileRequest = (headers: HeadersInit) => new NextRequest("http://localhost/api/signaldesk/workspace", {
        headers,
    });
    process.env.UPSTASH_REDIS_REST_URL ||= "http://127.0.0.1:1";
    process.env.UPSTASH_REDIS_REST_TOKEN ||= "signaldesk-test-token";
    const { isSignalDeskMobileRequest } = await import("../../src/lib/signaldesk/apiGuards");
    assert.equal(isSignalDeskMobileRequest(mobileRequest({ "x-signaldesk-client-mode": "mobile-readonly" })), true);
    assert.equal(isSignalDeskMobileRequest(mobileRequest({ "x-signaldesk-client-mode": "mobile-readonly-other" })), false);
    assert.equal(isSignalDeskMobileRequest(mobileRequest({ "sec-ch-ua-mobile": "?1" })), true);
    assert.equal(isSignalDeskMobileRequest(mobileRequest({ "user-agent": "Mozilla/5.0 (Linux; Android 15) Mobile" })), true);
    assert.equal(isSignalDeskMobileRequest(mobileRequest({ "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)" })), false);
    for (const section of SIGNALDESK_WORKSPACE_SECTIONS) {
        assert.equal(
            canServeSignalDeskMobileWorkspaceSection(section),
            section === "dashboard",
            `Mobile section decision mismatch for ${section}`,
        );
    }

    const projected = createEmptySignalDeskWorkspace("dashboard");
    assert.equal(projected.section, "dashboard");
    assert.deepEqual(Object.keys(projected).sort(), ["section", ...SIGNALDESK_WORKSPACE_ARRAY_KEYS].sort());
    for (const key of SIGNALDESK_WORKSPACE_ARRAY_KEYS) {
        assert.deepEqual(projected[key], [], `Mobile projection must empty ${key}`);
    }
};

const assertRuntimeSchemaContracts = () => {
    const overview = validOverview();
    const workspace = validWorkspace();
    assert.equal(isSignalDeskClientDataEnvelope({ data: overview }), true);
    assert.equal(isSignalDeskClientDataEnvelope({ data: overview, requestId: "unexpected" }), false);
    assert.equal(isSignalDeskClientDataEnvelope({}), false);
    assert.equal(isSignalDeskOverviewData(overview), true);
    assert.equal(isSignalDeskWorkspaceData(workspace, "dashboard"), true);

    const wrongSection = validWorkspace("targets");
    assert.equal(isSignalDeskWorkspaceData(wrongSection, "dashboard"), false);
    assert.equal(isSignalDeskWorkspaceData(wrongSection, "targets"), true);

    const unknownOverviewKey = { ...clone(overview), internal: true };
    assert.equal(isSignalDeskOverviewData(unknownOverviewKey), false);
    const unknownWorkspaceKey = clone(workspace) as SignalDeskWorkspaceResponse & {
        workspace: SignalDeskWorkspaceResponse["workspace"] & { privateRows?: unknown[] };
    };
    unknownWorkspaceKey.workspace.privateRows = [];
    assert.equal(isSignalDeskWorkspaceData(unknownWorkspaceKey, "dashboard"), false);

    const missingCollection = clone(workspace) as unknown as Record<string, unknown>;
    delete (missingCollection.workspace as Record<string, unknown>).targets;
    assert.equal(isSignalDeskWorkspaceData(missingCollection, "dashboard"), false);

    const malformedCollection = clone(workspace);
    (malformedCollection.workspace.targets as unknown) = {};
    assert.equal(isSignalDeskWorkspaceData(malformedCollection, "dashboard"), false);
    (malformedCollection.workspace.targets as unknown) = ["not-a-row"];
    assert.equal(isSignalDeskWorkspaceData(malformedCollection, "dashboard"), false);
    (malformedCollection.workspace.targets as unknown) = Array.from({ length: 501 }, () => ({}));
    assert.equal(isSignalDeskWorkspaceData(malformedCollection, "dashboard"), false);

    const invalidRole = clone(overview);
    (invalidRole.access.role as unknown) = "super-admin";
    assert.equal(isSignalDeskOverviewData(invalidRole), false);
    const systemWorkerRole = clone(overview);
    systemWorkerRole.access.role = "system-worker";
    assert.equal(isSignalDeskOverviewData(systemWorkerRole), false);
    const invalidPermission = clone(overview);
    (invalidPermission.access.permissions as unknown) = ["signaldesk.view", "private.read"];
    assert.equal(isSignalDeskOverviewData(invalidPermission), false);
    const duplicatePermission = clone(overview);
    duplicatePermission.access.permissions = ["signaldesk.view", "signaldesk.view"];
    assert.equal(isSignalDeskOverviewData(duplicatePermission), false);
    const nullableAccessEmail = clone(overview);
    (nullableAccessEmail.access.email as unknown) = null;
    assert.equal(isSignalDeskOverviewData(nullableAccessEmail), false);
    const malformedTimestamp = clone(overview);
    malformedTimestamp.controlRoom.updatedAt = "next Tuesday";
    assert.equal(isSignalDeskOverviewData(malformedTimestamp), false);

    for (const invalidCounter of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
        const malformed = clone(overview);
        malformed.controlRoom.targetCount = invalidCounter;
        assert.equal(isSignalDeskOverviewData(malformed), false);
    }
    for (const invalidCost of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
        const malformed = clone(overview);
        malformed.cost.providerCostEstimate = invalidCost;
        assert.equal(isSignalDeskOverviewData(malformed), false);
    }
    for (const invalidMetric of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const malformed = clone(overview);
        malformed.metrics[0].value = invalidMetric;
        assert.equal(isSignalDeskOverviewData(malformed), false);
    }
    for (const invalidMetric of ["-1", "$-0.25", "NaN", "Infinity"]) {
        const malformed = clone(overview);
        malformed.metrics[0].value = invalidMetric;
        assert.equal(isSignalDeskOverviewData(malformed), false);
    }

    const validActivePause = {
        activatedAt: "2026-07-15T10:00:00.000Z",
        activatedBy: "founder-user",
        deactivatedAt: null,
        deactivatedBy: null,
        killSwitchId: "scope_email",
        reason: "Pause email pending founder review.",
        scope: "email",
        status: "active",
        updatedAt: "2026-07-15T10:00:00.000Z",
    };
    assert.equal(isSignalDeskKillSwitchData(validActivePause), true);
    assert.equal(isSignalDeskKillSwitchData({ ...validActivePause, killSwitchId: "scope_whatsapp" }), false);
    assert.equal(isSignalDeskKillSwitchData({ ...validActivePause, activatedAt: null }), false);
    assert.equal(isSignalDeskKillSwitchData({ ...validActivePause, updatedAt: "next Tuesday" }), false);
    assert.equal(isSignalDeskKillSwitchData({ ...validActivePause, expiresAt: null }), false);
};

const assertMobileGetHeaders = async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalFetch = globalThis.fetch;
    const requests: Array<{ input: string; init?: RequestInit }> = [];

    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            matchMedia: () => ({ matches: true }),
            navigator: { userAgent: "SignalDesk mobile regression test" },
        },
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ input: String(input), init });
        const data = String(input).includes("workspace") ? validWorkspace() : validOverview();
        return new Response(JSON.stringify({ data }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    }) as typeof fetch;

    try {
        await getSignalDeskOverview();
        await getSignalDeskWorkspace("dashboard");
    } finally {
        globalThis.fetch = originalFetch;
        if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
        else delete (globalThis as { window?: unknown }).window;
    }

    assert.equal(requests.length, 2);
    for (const request of requests) {
        assert.deepEqual(request.init?.headers, { "x-signaldesk-client-mode": "mobile-readonly" });
        assert.equal(request.init?.cache, "no-store");
    }
};

const assertLatestResponseCoordinator = async () => {
    assert.equal(isSignalDeskRefreshCurrentSection("dashboard", "dashboard"), true);
    assert.equal(isSignalDeskRefreshCurrentSection("dashboard", "targets"), false);
    assert.equal(canCommitSignalDeskRefresh(true, "dashboard", "dashboard"), true);
    assert.equal(canCommitSignalDeskRefresh(false, "dashboard", "dashboard"), false);
    assert.equal(canCommitSignalDeskRefresh(true, "dashboard", "targets"), false);
    const coordinator = createSignalDeskLatestRequestCoordinator();
    coordinator.activate();
    const first = coordinator.start();
    const second = coordinator.start();
    assert.equal(first.signal.aborted, true);
    assert.equal(first.isCurrent(), false);
    assert.equal(second.signal.aborted, false);
    assert.equal(second.isCurrent(), true);

    const committed: string[] = [];
    const commitIfCurrent = async (request: ReturnType<typeof coordinator.start>, value: string) => {
        await Promise.resolve();
        if (request.isCurrent()) committed.push(value);
        request.finish();
    };
    await Promise.all([
        commitIfCurrent(first, "stale"),
        commitIfCurrent(second, "latest"),
    ]);
    assert.deepEqual(committed, ["latest"]);

    const unmounted = coordinator.start();
    coordinator.dispose();
    assert.equal(unmounted.signal.aborted, true);
    assert.equal(unmounted.isCurrent(), false);

    coordinator.activate();
    const remounted = coordinator.start();
    assert.equal(remounted.isCurrent(), true);
    remounted.finish();
};

const main = async () => {
    assertSectionAndPermissionContracts();
    await assertMobileProjectionContracts();
    assertRuntimeSchemaContracts();
    await assertMobileGetHeaders();
    await assertLatestResponseCoordinator();
    console.log("SignalDesk workspace/client contract tests passed");
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
