import fs from "fs";
import path from "path";
import { FEATURE_FLAGS } from "../../src/config/features";
import { buildGrowthOSKit } from "../../src/lib/growthos/kitBuilder";
import { guardGrowthOSOutput } from "../../src/lib/growthos/outputGuard";
import { findGrowthOSAction, rankGrowthOSActions } from "../../src/lib/growthos/actionRanking";
import { computeGrowthOSReadiness, isGrowthOSKitExpired } from "../../src/lib/growthos/readiness";
import { evaluateGrowthOSEntitlement } from "../../src/lib/growthos/entitlements";
import { guardGrowthOSReviewReply } from "../../src/lib/growthos/reviewGuard";
import { getGrowthOSTodayTriggerState } from "../../src/lib/growthos/todayTrigger";
import { normalizeStoreSwitchStoreId } from "../../src/lib/multiOutlet/storeSwitchAccess";
import {
    buildGrowthOSSourceFacts,
    hashGrowthOSSourceFacts,
} from "../../src/lib/growthos/sourceFacts";
import type { GrowthOSActionSummary, GrowthOSKitSummary, GrowthOSOutput, GrowthOSSummaryDocument } from "../../src/types/growthos";

type CheckResult = {
    detail?: string;
    name: string;
};

const checks: CheckResult[] = [];

function assertCheck(condition: unknown, name: string, detail?: string): void {
    if (!condition) {
        throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
    }
    checks.push({ detail, name });
}

function assertTextOrder(text: string, first: string, second: string, name: string): void {
    const firstIndex = text.indexOf(first);
    const secondIndex = text.indexOf(second);
    assertCheck(firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex, name);
}

function readFilesRecursive(root: string): string[] {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) return readFilesRecursive(fullPath);
        return fullPath;
    });
}

function scanDeferredGrowthOSSurface(): string[] {
    const roots = [
        "src/app/api/growthos",
        "src/components/mobile/components/GrowthKitsMobileCard.tsx",
        "src/components/templates/main-app/growthos",
        "src/database/growthos",
        "src/lib/growthos",
    ];
    const forbidden = [
        "checkAICapacity",
        "consumeAICapacity",
        "customerId",
        "estimatedLift",
        "genAI",
        "growthosAssets",
        "growthosOffers",
        "growthosOutletGroups",
        "growthosQuickReplies",
        "orders",
        "recordAiOperation",
        "revenue",
        "roi",
    ];
    const files = roots.flatMap((root) => {
        const fullPath = path.resolve(root);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            return readFilesRecursive(fullPath);
        }
        return [fullPath];
    }).filter((file) => fs.existsSync(file) && /\.(ts|tsx)$/.test(file));

    return files.flatMap((file) => {
        const text = fs.readFileSync(file, "utf8");
        return forbidden
            .filter((token) => text.includes(token))
            .map((token) => `${path.relative(process.cwd(), file)}:${token}`);
	    });
}

function scanGrowthOSMenuIntelligenceConsumers(): string[] {
    const roots = [
        "src/app/api/growthos",
        "src/components/mobile/components/GrowthKitsMobileCard.tsx",
        "src/components/templates/main-app/growthos",
        "src/database/growthos",
        "src/lib/growthos",
    ];
    const cmiTokens = [
        "getMenuIntelligence",
        "getItemPresentation",
        "getItemsByPriority",
        "MENU_INTELLIGENCE",
        "MenuIntelligenceState",
        "menuIntelligence",
        "@lib/intelligence",
        "src/lib/intelligence",
    ];
    const files = roots.flatMap((root) => {
        const fullPath = path.resolve(root);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            return readFilesRecursive(fullPath);
        }
        return [fullPath];
    }).filter((file) => fs.existsSync(file) && /\.(ts|tsx)$/.test(file));

    return files.flatMap((file) => {
        const text = fs.readFileSync(file, "utf8");
        return cmiTokens
            .filter((token) => text.includes(token))
            .map((token) => `${path.relative(process.cwd(), file)}:${token}`);
    });
}

function scanRetiredTodayActionPrompts(): string[] {
    const files = [
        "src/components/mobile/screens/MobileHoursScreen.tsx",
        "src/components/templates/main-app/today/index.tsx",
        "src/components/templates/main-app/today/components/EmptyState/index.tsx",
    ];
    const retiredTokens = [
        "Generate Today Action",
        "Generate one suggested action",
        "No today action yet",
        "No action suggestions available right now",
    ];
    return files.flatMap((file) => {
        const text = fs.readFileSync(path.resolve(file), "utf8");
        return retiredTokens
            .filter((token) => text.includes(token))
            .map((token) => `${file}:${token}`);
    });
}

function scanDeletedTodayGenerationFiles(): string[] {
    return [
        "src/app/api/campaigns/generate/route.ts",
        "src/lib/campaigns/engine.ts",
        "src/lib/staff-prompt/eligibility.ts",
        "src/lib/staff-prompt/inertia.ts",
    ].filter((file) => fs.existsSync(path.resolve(file)));
}

function scanRetiredGlobalTodayPolling(): string[] {
    const roots = [
        "src/providers",
        "src/components/organisms/sidebar",
    ];
    const retiredTokens = [
        "TodayActionProvider",
        "useTodayAction",
    ];
    const files = roots.flatMap((root) => readFilesRecursive(path.resolve(root)))
        .filter((file) => /\.(ts|tsx)$/.test(file));

    return files.flatMap((file) => {
        const text = fs.readFileSync(file, "utf8");
        return retiredTokens
            .filter((token) => text.includes(token))
            .map((token) => `${path.relative(process.cwd(), file)}:${token}`);
    });
}

function scanRetiredCampaignDalExports(): string[] {
    const file = "src/database/campaigns/index.ts";
    const text = fs.readFileSync(path.resolve(file), "utf8");
    const retiredTokens = [
        "export const syncTodayCampaignsToSummary",
        "export const createCampaign",
        "export const updateCampaignStatus",
        "export const getCampaignsByDate",
        "export const getSuppressedTypes",
        "export const getSuppressedCampaignTypes",
        "export const recordExport",
        "export const updateSuppressionStats",
    ];

    return retiredTokens
        .filter((token) => text.includes(token))
        .map((token) => `${file}:${token}`);
}

function scanGrowthOSApiJsonGuards(): string[] {
    const parser = fs.readFileSync(path.resolve("src/lib/validation/growthosSchemas.ts"), "utf8");
    const parserFailures: string[] = [];
    if (!parser.includes("readBoundedJsonBody")) {
        parserFailures.push("src/lib/validation/growthosSchemas.ts:missing-readBoundedJsonBody");
    }
    if (!parser.includes("GROWTHOS_API_MAX_BODY_BYTES")) {
        parserFailures.push("src/lib/validation/growthosSchemas.ts:missing-body-cap");
    }
    if (parser.includes("request.json()")) {
        parserFailures.push("src/lib/validation/growthosSchemas.ts:raw-request-json");
    }

    const routeFiles = [
        "src/app/api/growthos/actions/refresh/route.ts",
        "src/app/api/growthos/kits/generate/route.ts",
        "src/app/api/growthos/kits/export/route.ts",
        "src/app/api/growthos/reviews/suggest/route.ts",
    ];

    return parserFailures.concat(routeFiles.flatMap((file) => {
        const text = fs.readFileSync(path.resolve(file), "utf8");
        const failures: string[] = [];
        if (!text.includes("parseGrowthOSJsonBody")) {
            failures.push(`${file}:missing-parseGrowthOSJsonBody`);
        }
        if (!text.includes("Invalid JSON")) {
            failures.push(`${file}:missing-invalid-json-response`);
        }
        if (text.includes("await request.json()")) {
            failures.push(`${file}:raw-request-json`);
        }
        return failures;
    }));
}

function scanGrowthOSApiDiagnostics(): string[] {
    const routeFiles = [
        "src/app/api/growthos/actions/refresh/route.ts",
        "src/app/api/growthos/kits/generate/route.ts",
        "src/app/api/growthos/kits/export/route.ts",
        "src/app/api/growthos/reviews/suggest/route.ts",
    ];
    const diagnostics = fs.readFileSync(path.resolve("src/lib/growthos/diagnostics.ts"), "utf8");
    const failures: string[] = [];

    if (!diagnostics.includes("logGrowthOSApiFailure")) {
        failures.push("src/lib/growthos/diagnostics.ts:missing-logGrowthOSApiFailure");
    }
    if (!diagnostics.includes("getGrowthOSSourceErrorContext")) {
        failures.push("src/lib/growthos/diagnostics.ts:missing-source-error-context");
    }
    if (!diagnostics.includes("getGrowthOSSecurityLogContext")) {
        failures.push("src/lib/growthos/diagnostics.ts:missing-security-log-context");
    }
    if (!diagnostics.includes("getBoundedSecurityRouteContext")) {
        failures.push("src/lib/growthos/diagnostics.ts:missing-bounded-security-route-context");
    }
    if (!diagnostics.includes("new Error(failureCode)")) {
        failures.push("src/lib/growthos/diagnostics.ts:missing-fixed-error-code-capture");
    }
    if (diagnostics.includes("error instanceof Error ? error.message") || diagnostics.includes("String(error)")) {
        failures.push("src/lib/growthos/diagnostics.ts:raw-error-text");
    }

    return failures.concat(routeFiles.flatMap((file) => {
        const text = fs.readFileSync(path.resolve(file), "utf8");
        const routeFailures: string[] = [];
        if (!text.includes("logGrowthOSApiFailure(")) {
            routeFailures.push(`${file}:missing-logGrowthOSApiFailure`);
        }
        if (!text.includes("getGrowthOSBoundedStringContext(\"userId\"")) {
            routeFailures.push(`${file}:missing-bounded-user-context`);
        }
        if (!text.includes("getGrowthOSSecurityLogContext")) {
            routeFailures.push(`${file}:missing-bounded-security-context`);
        }
        if (text.includes("buildSecurityContext")) {
            routeFailures.push(`${file}:raw-security-context`);
        }
        if (text.includes("error: errorMsg")) {
            routeFailures.push(`${file}:raw-validation-error-context`);
        }
        if (text.includes("attemptedProjectId: projectId") || text.includes("attemptedKitId: kitId")) {
            routeFailures.push(`${file}:raw-attempted-id-context`);
        }
        if (text.includes("logger.error(\"GrowthOS")) {
            routeFailures.push(`${file}:raw-growthos-logger-error`);
        }
        if (text.includes("userId: session?.uId || session?.user?.id")) {
            routeFailures.push(`${file}:raw-user-id-context`);
        }
        return routeFailures;
    }));
}


const storeData = {
    currencySymbol: "₹",
    customDomain: "",
    name: "Green Bowl Cafe - Main Store",
    storeId: "dry-store",
    storeName: "Green Bowl Cafe - Main Store",
    subdomain: "green-bowl-cafe",
    tenantName: "Green Bowl Cafe",
    tenantId: 101,
    workingHours: {
        fri: "09:00-22:00",
        mon: "09:00-22:00",
        sat: "09:00-22:00",
        sun: "09:00-22:00",
        thu: "09:00-22:00",
        tue: "09:00-22:00",
        wed: "09:00-22:00",
    },
};

const projectData = {
    files: [
        {
            extractedData: {
                data: {
                    items: [
                        {
                            available: true,
                            category: "Bowls",
                            id: "paneer-bowl",
                            images: [{ url: "https://example.com/paneer-bowl.jpg" }],
                            isBestSeller: true,
                            name: { en: "Paneer Power Bowl" },
                            price: "₹180",
                        },
                        {
                            available: true,
                            category: "Drinks",
                            id: "lime-cooler",
                            isNew: true,
                            name: { en: "Lime Cooler" },
                            price: 80,
                        },
                        {
                            available: false,
                            category: "Dessert",
                            id: "free-dessert",
                            name: { en: "Free Dessert" },
                            price: 120,
                        },
                    ],
                },
            },
        },
    ],
    name: { en: "Lunch Menu" },
    projectId: "dry-project",
};

const facts = buildGrowthOSSourceFacts({
    projectData,
    projectId: "dry-project",
    sId: "dry-store",
    storeData,
    tId: "dry-tenant",
});
const readiness = computeGrowthOSReadiness(facts);
const actions = rankGrowthOSActions(facts);
const kit = buildGrowthOSKit({
    action: actions[0],
    facts,
    kitId: "growthos_dry_run",
    operationId: "00000000-0000-4000-8000-000000000001",
    now: new Date("2026-06-01T09:00:00.000Z"),
});
const publicOutputs = kit.outputs.filter((output: GrowthOSOutput) => output.destination !== "staff_brief");
const staffOutput = kit.outputs.find((output: GrowthOSOutput) => output.destination === "staff_brief");
const blockedOutput = guardGrowthOSOutput("Best in city discount available today.");
const safeReply = guardGrowthOSReviewReply({
    rating: 5,
    reviewText: "Great lunch and fast service.",
    tone: "thank_you",
});
const unsafeReply = guardGrowthOSReviewReply({
    rating: 1,
    reviewText: "I got food poisoning after dinner.",
    tone: "apology",
});
const growthOSSchemas = fs.readFileSync(path.resolve("src/lib/validation/growthosSchemas.ts"), "utf8");
const growthOSServerDal = fs.readFileSync(path.resolve("src/database/growthos/server.ts"), "utf8");
const growthOSServerEntitlements = fs.readFileSync(path.resolve("src/lib/growthos/serverEntitlements.ts"), "utf8");
const growthOSServerContext = fs.readFileSync(path.resolve("src/lib/growthos/serverContext.ts"), "utf8");
const growthOSApiGuards = fs.readFileSync(path.resolve("src/lib/growthos/apiGuards.ts"), "utf8");
const growthOSApiResponse = fs.readFileSync(path.resolve("src/lib/growthos/apiResponse.ts"), "utf8");
const firestoreRules = fs.readFileSync(path.resolve("firestore.rules"), "utf8");
const growthOSProjectReadBlock = growthOSServerDal.slice(
    growthOSServerDal.indexOf("export async function readGrowthOSProjectDataServer"),
    growthOSServerDal.indexOf("export async function readGrowthOSSummaryServer"),
);
const growthOSKitReadBlock = growthOSServerDal.slice(
    growthOSServerDal.indexOf("export async function readGrowthOSKitServer"),
    growthOSServerDal.indexOf("function statusForExportMethod"),
);
const growthOSImplDoc = fs.readFileSync(path.resolve("__docs__/growthos-addon/growthos-addon_impl.md"), "utf8");
const growthOSFirebaseDoc = fs.readFileSync(path.resolve("__docs__/growthos-addon/growthos-addon_firebase.md"), "utf8");
const growthOSTransactionEmulator = fs.readFileSync(path.resolve("scripts/verification/test-growthos-transactions-emulator.ts"), "utf8");
const productionAudit = fs.readFileSync(path.resolve("__docs__/audits/menulist-production-readiness-audit.md"), "utf8");
const changelog = fs.readFileSync(path.resolve("__docs__/changelog.md"), "utf8");
const updatedFacts = buildGrowthOSSourceFacts({
    projectData: {
        ...projectData,
        files: [
            {
                extractedData: {
                    data: {
                        items: [
                            {
                                available: true,
                                category: "Bowls",
                                id: "paneer-bowl",
                                images: [{ url: "https://example.com/paneer-bowl.jpg" }],
                                isBestSeller: true,
                                name: { en: "Paneer Power Bowl" },
                                price: "₹190",
                            },
                        ],
                    },
                },
            },
        ],
    },
    projectId: "dry-project",
    sId: "dry-store",
    storeData,
    tId: "dry-tenant",
});

const makeSummary = (overrides: Partial<GrowthOSSummaryDocument> = {}): GrowthOSSummaryDocument => ({
    date: "2026-06-01",
    eligible: true,
    latestKit: null,
    primaryAction: actions[0],
    sId: storeData.storeId,
    secondaryActions: actions.slice(1),
    sourceFactsHash: kit.sourceFactsHash,
    tId: "dry-tenant",
    ...overrides,
});
const freshKitSummary: GrowthOSKitSummary = {
    actionType: kit.actionType,
    createdAt: "2026-06-01T09:00:00.000Z",
    expiresAt: "2099-06-01T21:00:00.000Z",
    id: kit.id,
    isStale: false,
    itemName: kit.itemName,
    outputs: kit.outputs,
    sourceFactsHash: kit.sourceFactsHash,
    status: "draft",
    title: kit.title,
};
const weakGenericAction: GrowthOSActionSummary = {
    ...actions[0],
    confidence: 0.72,
    reason: "This available item is ready to share from the current menu.",
    type: "promote_item",
};
const strongActionTrigger = getGrowthOSTodayTriggerState(makeSummary({ latestKit: null }));
const weakActionTrigger = getGrowthOSTodayTriggerState(makeSummary({
    latestKit: null,
    primaryAction: weakGenericAction,
}));
const freshPackTrigger = getGrowthOSTodayTriggerState(makeSummary({
    latestKit: freshKitSummary,
    primaryAction: null,
}));
const staleDraftTrigger = getGrowthOSTodayTriggerState(makeSummary({
    latestKit: {
        ...freshKitSummary,
        expiresAt: "2020-05-30T09:00:00.000Z",
        status: "draft",
    },
    primaryAction: weakGenericAction,
}));
const staleUsedTrigger = getGrowthOSTodayTriggerState(makeSummary({
    latestKit: {
        ...freshKitSummary,
        expiresAt: "2020-05-30T09:00:00.000Z",
        status: "copied",
    },
    primaryAction: weakGenericAction,
}));

function withGrowthOSFlags<T>(overrides: Record<string, unknown>, fn: () => T): T {
    const previous = { ...FEATURE_FLAGS };
    Object.assign(FEATURE_FLAGS, overrides);
    try {
        return fn();
    } finally {
        Object.assign(FEATURE_FLAGS, previous);
    }
}

const makeSubscription = (planId: string, status = "active", tenantId = 101) => ({
    billingMode: "manual",
    cycleEndDate: new Date("2099-12-31T23:59:59.000Z"),
    manualPaymentConfirmed: true,
    pId: "ML",
    planId,
    productId: "ML",
    sId: 202,
    status,
    storeId: 202,
    tId: tenantId,
    tenantId,
} as any);

const entitlement = evaluateGrowthOSEntitlement({
    activeSubscription: null,
    storeDetails: storeData as any,
    storeId: storeData.storeId,
});
const deferredMatches = scanDeferredGrowthOSSurface();
const growthOSCmiConsumers = scanGrowthOSMenuIntelligenceConsumers();
const retiredTodayPromptMatches = scanRetiredTodayActionPrompts();
const deletedTodayGenerationFiles = scanDeletedTodayGenerationFiles();
const retiredGlobalTodayPollingMatches = scanRetiredGlobalTodayPolling();
const retiredCampaignDalExports = scanRetiredCampaignDalExports();
const growthOSApiJsonGuardFailures = scanGrowthOSApiJsonGuards();
const growthOSApiDiagnosticFailures = scanGrowthOSApiDiagnostics();
const growthOSPage = fs.readFileSync(path.resolve("src/components/templates/main-app/growthos/index.tsx"), "utf8");
const growthOSMobileCard = fs.readFileSync(path.resolve("src/components/mobile/components/GrowthKitsMobileCard.tsx"), "utf8");
const growthOSClientDal = fs.readFileSync(path.resolve("src/database/growthos/index.ts"), "utf8");
const growthOSRefreshRoute = fs.readFileSync(path.resolve("src/app/api/growthos/actions/refresh/route.ts"), "utf8");
const growthOSGenerateRoute = fs.readFileSync(path.resolve("src/app/api/growthos/kits/generate/route.ts"), "utf8");
const growthOSExportRoute = fs.readFileSync(path.resolve("src/app/api/growthos/kits/export/route.ts"), "utf8");
const growthOSReviewSuggestRoute = fs.readFileSync(path.resolve("src/app/api/growthos/reviews/suggest/route.ts"), "utf8");
const growthOSHook = fs.readFileSync(path.resolve("src/hooks/useGrowthOS.ts"), "utf8");
const growthOSClientContracts = fs.readFileSync(path.resolve("src/lib/growthos/clientContracts.ts"), "utf8");
const growthOSSourceFactsSource = fs.readFileSync(path.resolve("src/lib/growthos/sourceFacts.ts"), "utf8");
const growthOSReadiness = fs.readFileSync(path.resolve("src/lib/growthos/readiness.ts"), "utf8");

assertCheck(FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON === true, "GrowthOS master flag is enabled");
assertCheck(FEATURE_FLAGS.GROWTHOS_ADDON_ACCESS === "paid", "GrowthOS access defaults to paid plan gate");
assertCheck(FEATURE_FLAGS.GROWTHOS_DIRECT_POSTING === "disabled", "direct posting remains disabled");
assertCheck(normalizeStoreSwitchStoreId(101) === 101, "GrowthOS server entitlement scope accepts exact positive numeric IDs");
assertCheck(normalizeStoreSwitchStoreId(null) === null, "GrowthOS server entitlement scope rejects pre-onboarding null IDs");
assertCheck(normalizeStoreSwitchStoreId(0) === null, "GrowthOS server entitlement scope rejects zero IDs");
assertCheck(normalizeStoreSwitchStoreId("1e3") === null, "GrowthOS server entitlement scope rejects exponent-like IDs");
assertCheck(
    growthOSServerEntitlements.includes("const scope = resolveStorePermissionSessionScope(params.session);"),
    "GrowthOS server entitlement resolves all current session scope aliases",
);
assertCheck(
    growthOSServerEntitlements.includes("const tenantId = scope?.tenantScope.numericId ?? null;")
        && growthOSServerEntitlements.includes("const storeId = scope?.storeScope.numericId ?? null;"),
    "GrowthOS server entitlement uses exact resolved tenant and store scope",
);
assertCheck(
    !growthOSServerEntitlements.includes("Number(params.session?.tId)")
        && !growthOSServerEntitlements.includes("Number(params.session?.sId)")
        && !growthOSServerEntitlements.includes("normalizeStoreSwitchStoreId(params.session?."),
    "GrowthOS server entitlement scope does not select or coerce one raw alias",
);
assertCheck(
    growthOSServerContext.includes("const scope = resolveStorePermissionSessionScope(session);")
        && growthOSServerContext.includes("scope.tenantScope.documentId")
        && growthOSServerContext.includes("scope.storeScope.documentId"),
    "GrowthOS shared server context derives every read and summary from one exact workspace",
);
assertCheck(
    !growthOSServerContext.includes("params.session.tId")
        && !growthOSServerContext.includes("params.session.sId"),
    "GrowthOS shared server context does not select raw session scope aliases",
);
assertCheck(entitlement.allowed === false && entitlement.reason === "not_paid", "enabled GrowthOS denies stores without Pro or Multi-location");
withGrowthOSFlags({
    ENABLE_GROWTHOS_ADDON: false,
}, () => {
    const disabled = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    assertCheck(disabled.allowed === false && disabled.reason === "feature_off", "GrowthOS kill switch denies even active Pro plan");
});
withGrowthOSFlags({
    ENABLE_GROWTHOS_ADDON: true,
    GROWTHOS_ADDON_ACCESS: "paid",
    GROWTHOS_PAID_PLAN_IDS: ["menulist_pro", "menulist_multi_location"],
}, () => {
    const starter = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_official"),
        storeDetails: { ...(storeData as any), growthosEntitlement: true },
        storeId: storeData.storeId,
    });
    const pro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const premium = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_multi_location"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const expiredPro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro", "expired"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    assertCheck(starter.allowed === false && starter.reason === "not_paid", "GrowthOS denies Official even with explicit add-on flags");
    assertCheck(pro.allowed === true, "GrowthOS paid gate allows active Pro plan");
    assertCheck(premium.allowed === true, "GrowthOS paid gate allows active Multi-location plan");
    assertCheck(expiredPro.allowed === false && expiredPro.reason === "not_paid", "GrowthOS paid gate denies inactive Pro subscription");
    const foreignTenantPro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro", "active", 999),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
        tenantId: storeData.tenantId,
    });
    const answerlatticePro = evaluateGrowthOSEntitlement({
        activeSubscription: { ...makeSubscription("menulist_pro"), pId: "AL", productId: "AL" },
        storeDetails: storeData as any,
        storeId: storeData.storeId,
        tenantId: storeData.tenantId,
    });
    assertCheck(foreignTenantPro.allowed === false && foreignTenantPro.reason === "not_paid", "GrowthOS paid gate rejects another tenant's subscription");
    assertCheck(answerlatticePro.allowed === false && answerlatticePro.reason === "not_paid", "GrowthOS paid gate rejects Answerlattice subscription identity");
});
withGrowthOSFlags({
    ENABLE_GROWTHOS_ADDON: true,
    GROWTHOS_ADDON_ACCESS: "pilot",
    GROWTHOS_PAID_PLAN_IDS: ["menulist_pro", "menulist_multi_location"],
    GROWTHOS_PILOT_STORE_IDS: [storeData.storeId],
}, () => {
    const pilotWithoutPaidPlan = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_official"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const pilotWithPaidPlan = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const paidPlanOutsidePilot = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("menulist_pro"),
        storeDetails: storeData as any,
        storeId: "not-in-pilot",
    });
    assertCheck(pilotWithoutPaidPlan.allowed === false && pilotWithoutPaidPlan.reason === "not_paid", "GrowthOS pilot gate still requires Pro or Multi-location");
    assertCheck(pilotWithPaidPlan.allowed === true, "GrowthOS pilot gate allows listed Pro store");
    assertCheck(paidPlanOutsidePilot.allowed === false && paidPlanOutsidePilot.reason === "not_pilot_store", "GrowthOS pilot gate blocks paid stores outside allowlist");
});
assertCheck(facts.items.length === 3, "source facts read extracted menu items");
const missingHoursFacts = buildGrowthOSSourceFacts({
        projectData: { files: { malformed: true }, name: { en: "Legacy menu" } },
        projectId: "legacy-project",
        sId: "dry-store",
        storeData: { workingHours: { mon: { malformed: true } } },
        tId: "dry-tenant",
    });
assertCheck(
    missingHoursFacts.items.length === 0,
    "source facts contain malformed legacy arrays and hours without throwing",
);
const missingHoursReadiness = computeGrowthOSReadiness({
    ...missingHoursFacts,
    items: facts.items,
});
assertCheck(
    missingHoursReadiness.warnings.includes("Business hours are missing.")
    && !missingHoursReadiness.warnings.includes("Store is marked closed today."),
    "missing business hours remain distinct from an explicit closed-today state",
);
const explicitlyClosedFacts = buildGrowthOSSourceFacts({
    projectData,
    projectId: "closed-project",
    sId: "dry-store",
    storeData: {
        ...storeData,
        workingHours: {
            fri: "closed",
            mon: "closed",
            sat: "closed",
            sun: "closed",
            thu: "closed",
            tue: "closed",
            wed: "closed",
        },
    },
    tId: "dry-tenant",
});
assertCheck(
    computeGrowthOSReadiness(explicitlyClosedFacts).warnings.includes("Store is marked closed today."),
    "an explicit closed-today schedule retains the closed warning",
);
assertCheck(facts.items.some((item) => item.name === "Free Dessert" && item.available === false), "source facts retain unavailable item for staff guardrails");
assertCheck(readiness.status !== "blocked", "readiness allows available menu facts");
assertCheck(actions.length >= 2, "ranking creates multiple owner actions");
assertCheck(actions[0].itemName === "Paneer Power Bowl", "ranking prefers bestseller item");
assertCheck(!actions.some((action) => action.itemName === "Free Dessert"), "ranking excludes unavailable item");
assertCheck(findGrowthOSAction(actions, "unknown-action") === null, "generation rejects an unknown requested action instead of substituting another");
assertCheck(publicOutputs.length === 6, "kit builds all public/manual destinations");
assertCheck(publicOutputs.every((output) => output.preflight.status === "ready"), "public outputs pass preflight");
assertCheck(publicOutputs.every((output) => !output.text.includes("Free Dessert")), "public outputs do not mention unavailable items");
assertCheck(Boolean(staffOutput), "deterministic staff brief is included");
assertCheck(staffOutput?.preflight.status === "blocked", "staff-only blocked output does not spill onto public outputs");
assertCheck(blockedOutput.preflight.status === "blocked", "public guard blocks unsupported claims and offers");
assertCheck(Boolean(safeReply.reply), "review guard prepares low-risk reply");
assertCheck(!unsafeReply.reply && unsafeReply.publicReplyRecommended === false, "review guard blocks food-safety public reply");
assertCheck(hashGrowthOSSourceFacts(facts) !== hashGrowthOSSourceFacts(updatedFacts), "source hash changes when menu truth changes");
assertCheck(
    hashGrowthOSSourceFacts(facts) !== hashGrowthOSSourceFacts({
        ...facts,
        businessName: "Renamed Business",
    }),
    "source hash changes when owner-visible business truth changes",
);
assertCheck(
    hashGrowthOSSourceFacts(facts) !== hashGrowthOSSourceFacts({
        ...facts,
        items: facts.items.map((item, index) => index === 0 ? { ...item, isBestSeller: false } : item),
    }),
    "source hash changes when action-ranking menu truth changes",
);
assertCheck(isGrowthOSKitExpired(new Date("2026-05-30T09:00:00.000Z").toISOString()) === true, "kit expiry marks old kit stale");
assertCheck(strongActionTrigger.shouldSurface === true && strongActionTrigger.reason === "strong_menu_action", "Today Sales Pack surfaces strong menu actions");
assertCheck(weakActionTrigger.shouldSurface === false && weakActionTrigger.reason === "none", "Today Sales Pack stays quiet for weak generic actions");
assertCheck(freshPackTrigger.shouldSurface === true && freshPackTrigger.reason === "fresh_pack_ready", "Today Sales Pack surfaces a fresh prepared pack");
assertCheck(staleDraftTrigger.shouldSurface === false && staleDraftTrigger.reason === "none", "Today Sales Pack does not surface unused stale drafts");
assertCheck(staleUsedTrigger.shouldSurface === true && staleUsedTrigger.reason === "used_pack_stale", "Today Sales Pack surfaces previously used stale packs for update");
assertCheck(retiredTodayPromptMatches.length === 0, "retired Today Action generation prompts are absent from active Today surfaces", retiredTodayPromptMatches.join(", "));
assertCheck(deletedTodayGenerationFiles.length === 0, "retired Today generation code files are deleted", deletedTodayGenerationFiles.join(", "));
assertCheck(retiredGlobalTodayPollingMatches.length === 0, "retired global Today polling provider is absent", retiredGlobalTodayPollingMatches.join(", "));
assertCheck(retiredCampaignDalExports.length === 0, "retired campaign generation DAL exports are absent", retiredCampaignDalExports.join(", "));
assertCheck(growthOSApiJsonGuardFailures.length === 0, "GrowthOS APIs return 400 for invalid JSON instead of generic 500", growthOSApiJsonGuardFailures.join(", "));
assertCheck(growthOSApiDiagnosticFailures.length === 0, "GrowthOS APIs use bounded fixed-code diagnostics", growthOSApiDiagnosticFailures.join(", "));
assertCheck(growthOSSchemas.includes('import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";'), "GrowthOS schemas import shared Firestore document ID guard");
assertCheck(growthOSSchemas.includes('const growthOSProjectIdSchema = z.string()'), "GrowthOS schemas define shared project ID schema");
assertCheck(growthOSSchemas.includes('.refine(isValidFirestoreDocumentId, "Invalid project ID")'), "GrowthOS project IDs use shared Firestore document ID guard");
assertCheck(growthOSSchemas.includes('const growthOSKitIdSchema = z.string()'), "GrowthOS schemas define shared kit ID schema");
assertCheck(growthOSSchemas.includes('.refine(isValidFirestoreDocumentId, "Invalid kit ID")'), "GrowthOS kit IDs use shared Firestore document ID guard");
assertCheck(growthOSSchemas.includes('projectId: growthOSProjectIdSchema'), "GrowthOS refresh/generate requests use project ID boundary");
assertCheck(growthOSSchemas.includes('kitId: growthOSKitIdSchema'), "GrowthOS export requests use kit ID boundary");
assertCheck((growthOSSchemas.match(/operationId: z\.string\(\)\.uuid\(\)/g) || []).length >= 2, "GrowthOS generate/export requests require UUID operation identity");
assertCheck((growthOSSchemas.match(/\}\)\.strict\(\);/g) || []).length >= 4, "GrowthOS request schemas reject unexpected fields");
assertCheck(!growthOSSchemas.includes("actionType: growthOSActionTypeSchema.optional()"), "GrowthOS generate schema does not accept an ignored action type");
assertCheck(!growthOSSchemas.includes('projectId: z.string().min(1).max(100)'), "GrowthOS project IDs must not keep max-only validation");
assertCheck(!growthOSSchemas.includes('kitId: z.string().min(1).max(200)'), "GrowthOS kit IDs must not keep max-only validation");
assertCheck(growthOSServerDal.includes('function normalizeGrowthOSDocumentId(value: unknown): string | null'), "GrowthOS server DAL defines a shared document ID normalizer");
assertCheck(growthOSServerDal.includes('const documentId = value.trim();'), "GrowthOS server DAL trims document IDs before Firestore refs");
assertCheck(growthOSServerDal.includes('return isValidFirestoreDocumentId(documentId) ? documentId : null;'), "GrowthOS server DAL rejects malformed normalized document IDs");
assertCheck(growthOSServerDal.includes('function normalizeGrowthOSScopeDocumentId(value: unknown): string | null'), "GrowthOS server DAL defines a scope document ID normalizer");
assertCheck(growthOSServerDal.includes('function requireGrowthOSScopeDocumentId(value: unknown, label: string): string'), "GrowthOS server DAL requires scope document IDs before writes");
assertCheck(growthOSServerDal.includes('const projectId = normalizeGrowthOSDocumentId(params.projectId);'), "GrowthOS project reads normalize project IDs before Firestore reads");
assertCheck(growthOSServerDal.includes('const tenantDocumentId = normalizeGrowthOSScopeDocumentId(params.tId);'), "GrowthOS project reads normalize tenant scope IDs before scoped reads");
assertCheck(growthOSServerDal.includes('const storeDocumentId = normalizeGrowthOSScopeDocumentId(params.sId);'), "GrowthOS project reads normalize store scope IDs before scoped reads");
assertCheck(growthOSServerDal.includes('normalizeGrowthOSScopeAliases(tenantAliases)'), "GrowthOS legacy project reads reject conflicting tenant aliases");
assertCheck(growthOSServerDal.includes('normalizeGrowthOSScopeAliases(storeAliases)'), "GrowthOS legacy project reads reject conflicting store aliases");
assertCheck(!growthOSServerDal.includes('params.projectData?.tId ?? params.projectData?.tenantId'), "GrowthOS legacy project reads must not prefer one conflicting tenant alias");
assertCheck(growthOSTransactionEmulator.includes('GrowthOS must reject a legacy project with conflicting tenant aliases'), "GrowthOS legacy project alias conflict has emulator regression coverage");
assertCheck(growthOSTransactionEmulator.includes('Public Truth Monitor must reject a legacy project with conflicting tenant aliases'), "Public Truth Monitor legacy project alias conflict has emulator regression coverage");
assertTextOrder(
    growthOSProjectReadBlock,
    'const projectId = normalizeGrowthOSDocumentId(params.projectId);',
    '.doc(projectId)',
    "GrowthOS project ID guard runs before project document reads",
);
assertCheck(growthOSServerDal.includes('const kitId = requireGrowthOSDocumentId(kit.id, "kit");'), "GrowthOS kit writes require normalized kit IDs before Firestore writes");
assertCheck(growthOSServerDal.includes('const tenantDocumentId = requireGrowthOSScopeDocumentId(kit.tId, "tenant");'), "GrowthOS kit writes require tenant scope IDs before Firestore writes");
assertCheck(growthOSServerDal.includes('const storeDocumentId = requireGrowthOSScopeDocumentId(kit.sId, "store");'), "GrowthOS kit writes require store scope IDs before Firestore writes");
assertCheck(growthOSServerDal.includes("transaction.create(kitRef"), "GrowthOS kit writes use create-only transaction settlement");
assertCheck(growthOSServerDal.includes('return `growthos_${tId}_${sId}_${requireGrowthOSDocumentId(operationId, "operation")}`;'), "GrowthOS kit IDs bind concurrent retries to one operation");
assertCheck(
    growthOSServerDal.includes('summaryTenantDocumentId !== tenantDocumentId')
        && growthOSServerDal.includes('summaryStoreDocumentId !== storeDocumentId')
        && growthOSServerDal.includes('summaryKitId !== kitId')
        && growthOSServerDal.includes('throw new Error("GrowthOS kit and summary scope mismatch")'),
    "GrowthOS atomic kit and summary writes reject mismatched persisted scope",
);
assertCheck(
    growthOSServerDal.includes("export async function writeGrowthOSKitAndSummaryServer")
        && growthOSServerDal.includes("return firestoreAdmin.runTransaction(async (transaction)")
        && growthOSServerDal.includes("transaction.create(kitRef")
        && growthOSServerDal.includes("GrowthOS generation operation conflict"),
    "GrowthOS kit and summary writes commit atomically with exact retry settlement",
);
assertCheck(growthOSServerDal.includes('const kitId = normalizeGrowthOSDocumentId(params.kitId);'), "GrowthOS kit reads normalize kit IDs before Firestore reads");
for (const collectionName of ["growthosKits", "growthosExports"]) {
    const ruleBlock = firestoreRules.match(
        new RegExp(`match /${collectionName}/\\{tId\\}/\\{sId\\}/\\{docId\\} \\{([\\s\\S]*?)\\n    \\}`),
    )?.[1] || "";
    assertCheck(
        ruleBlock.includes("allow read, write: if false;"),
        `${collectionName} remains Admin-only so browser reads cannot bypass GrowthOS entitlement`,
    );
    assertCheck(
        !ruleBlock.includes("belongsToTenant") && !ruleBlock.includes("isPlatformAdmin"),
        `${collectionName} has no browser role or tenant-membership bypass`,
    );
}
assertTextOrder(
    growthOSKitReadBlock,
    'const kitId = normalizeGrowthOSDocumentId(params.kitId);',
    '.doc(kitId)',
    "GrowthOS kit ID guard runs before kit document reads",
);
assertCheck(growthOSServerDal.includes('const kitId = requireGrowthOSDocumentId(params.kit.id, "kit");'), "GrowthOS export recording requires normalized kit IDs before export writes");
assertCheck(!growthOSServerDal.includes('.doc(params.projectId)'), "GrowthOS project reads must not pass params.projectId directly to Firestore doc refs");
assertCheck(!growthOSServerDal.includes('.doc(params.kitId)'), "GrowthOS kit reads must not pass params.kitId directly to Firestore doc refs");
assertCheck(!growthOSServerDal.includes('.doc(kit.id)'), "GrowthOS kit writes must not pass kit.id directly to Firestore doc refs");
assertCheck(!growthOSServerDal.includes('.doc(params.kit.id)'), "GrowthOS export writes must not pass params.kit.id directly to Firestore doc refs");
assertCheck(growthOSImplDoc.includes("GrowthOS project, kit, and scope ID boundary"), "GrowthOS implementation docs record project/kit/scope ID boundary");
assertCheck(growthOSFirebaseDoc.includes("GrowthOS project/kit/scope ID admission is cost-neutral"), "GrowthOS Firebase docs record project/kit/scope ID boundary");
assertCheck(productionAudit.includes("GrowthOS project, kit, and scope ID boundary checkpoint"), "Production audit records GrowthOS project/kit/scope ID boundary");
assertCheck(changelog.includes("GrowthOS Project And Kit ID Boundary"), "Changelog records GrowthOS project/kit ID boundary");
assertCheck(growthOSReviewSuggestRoute.includes("hashPublicRateLimitValue"), "GrowthOS review guard hashes rate-limit key segments");
assertCheck(growthOSReviewSuggestRoute.includes("userRateLimitHash"), "GrowthOS review guard computes hashed user limiter segment");
assertCheck(growthOSReviewSuggestRoute.includes("tenantRateLimitHash"), "GrowthOS review guard computes hashed tenant limiter segment");
assertCheck(growthOSReviewSuggestRoute.includes("storeRateLimitHash"), "GrowthOS review guard computes hashed store limiter segment");
assertCheck(growthOSReviewSuggestRoute.includes("failClosedOnProviderError: true"), "GrowthOS review guard fails closed on limiter uncertainty");
assertCheck(growthOSReviewSuggestRoute.includes("key: `growthos-review:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`"), "GrowthOS review guard stores hashed actor/workspace limiter segments");
assertCheck(!growthOSReviewSuggestRoute.includes("key: `growthos-review:${session.uId || session.user?.id}:${session.tId}`"), "GrowthOS review guard does not store raw session identifiers in limiter keys");
assertCheck(growthOSReviewSuggestRoute.includes("const scope = resolveStorePermissionSessionScope(session);"), "GrowthOS review guard resolves exact session workspace");
assertCheck(growthOSReviewSuggestRoute.includes("const actorId = resolveCurrentSessionUserDocumentId(session);"), "GrowthOS review guard resolves exact current actor");
assertCheck(!growthOSReviewSuggestRoute.includes('|| "unknown"'), "GrowthOS review guard does not collapse missing identity into a shared limiter partition");
assertCheck(growthOSReviewSuggestRoute.includes("scope.tenantScope.numericId"), "GrowthOS review guard verifies the normalized tenant scope");
assertCheck(growthOSReviewSuggestRoute.includes("scope.storeScope.numericId"), "GrowthOS review guard verifies the normalized store scope");
assertCheck(growthOSApiResponse.includes('"Cache-Control": "private, no-store, max-age=0"'), "GrowthOS shared private response policy");
assertCheck(growthOSApiResponse.includes('"X-Content-Type-Options": "nosniff"'), "GrowthOS shared response sniffing protection");
assertCheck(growthOSApiResponse.includes("const headers = new Headers(init.headers);"), "GrowthOS shared protected header precedence");
assertCheck(growthOSApiGuards.includes("failClosedOnProviderError: true"), "GrowthOS write guard fails closed on limiter uncertainty");
assertCheck(growthOSApiGuards.includes("hashPublicRateLimitValue(input.actorId)"), "GrowthOS write guard hashes the exact actor partition");
assertCheck(growthOSApiGuards.includes("hashPublicRateLimitValue(input.tenantId)"), "GrowthOS write guard hashes the exact tenant partition");
assertCheck(growthOSApiGuards.includes("hashPublicRateLimitValue(input.storeId)"), "GrowthOS write guard hashes the exact store partition");
for (const [routeName, routeText] of [
    ["refresh", growthOSRefreshRoute],
    ["generate", growthOSGenerateRoute],
    ["export", growthOSExportRoute],
] as const) {
    assertCheck(routeText.includes("const scope = resolveStorePermissionSessionScope(session);"), `GrowthOS ${routeName} resolves one exact workspace`);
    assertCheck(routeText.includes("const actorId = resolveCurrentSessionUserDocumentId(session);"), `GrowthOS ${routeName} resolves one exact actor`);
    assertCheck(routeText.includes("applyGrowthOSWriteRateLimit({"), `GrowthOS ${routeName} uses shared write admission`);
    assertCheck(routeText.includes("storeId: scope.storeScope.documentId"), `GrowthOS ${routeName} partitions admission and persistence by exact store`);
    assertCheck(routeText.includes("tenantId: scope.tenantScope.documentId"), `GrowthOS ${routeName} partitions admission and persistence by exact tenant`);
    assertCheck(routeText.includes("scope.tenantScope.numericId"), `GrowthOS ${routeName} verifies normalized tenant access`);
    assertCheck(routeText.includes("scope.storeScope.numericId"), `GrowthOS ${routeName} verifies normalized store access`);
    assertCheck(routeText.includes("growthOSPrivateJson"), `GrowthOS ${routeName} uses the shared private JSON boundary`);
    assertCheck(routeText.includes("withGrowthOSPrivateHeaders"), `GrowthOS ${routeName} stamps bounded helper responses`);
    assertCheck(!routeText.includes("NextResponse.json("), `GrowthOS ${routeName} has no direct JSON response bypass`);
    assertCheck(!routeText.includes("checkDataWriteLimit"), `GrowthOS ${routeName} has no generic unpartitioned write limiter`);
    assertCheck(!routeText.includes("session.tId") && !routeText.includes("session.sId"), `GrowthOS ${routeName} does not select raw workspace aliases`);
    assertCheck(
        !routeText.includes("session?.uId || session?.user?.id"),
        `GrowthOS ${routeName} does not select a first-match actor alias`,
    );
}
assertCheck(
    growthOSServerDal.includes("export async function recordGrowthOSExportServer(params: {")
        && growthOSServerDal.includes("actorId: string;")
        && growthOSServerDal.includes('const actorId = requireGrowthOSDocumentId(params.actorId, "actor");'),
    "GrowthOS durable export attribution requires an exact actor argument",
);
assertCheck(
    growthOSServerDal.includes("export async function readGrowthOSExportReplayServer(params: {")
        && growthOSServerDal.includes("sId: string | number;")
        && growthOSServerDal.includes("tId: string | number;"),
    "GrowthOS export replay requires explicit canonical workspace arguments",
);
assertCheck(
    !growthOSServerDal.includes("params.session?.uId || params.session?.user?.id")
        && !growthOSServerDal.includes("params.session?.tId")
        && !growthOSServerDal.includes("params.session?.sId"),
    "GrowthOS export persistence does not derive actor or workspace from ambiguous session aliases",
);
assertCheck(
    growthOSExportRoute.includes("recordGrowthOSExportServer({\n            actorId,")
        && growthOSExportRoute.includes("readGrowthOSExportReplayServer({\n            actorId,"),
    "GrowthOS export route passes the exact actor to replay and durable settlement",
);
assertCheck(growthOSExportRoute.includes('failureCode: "growthos_export_kit_not_found"'), "GrowthOS export route diagnoses missing projected kits without raw data");
assertCheck(growthOSExportRoute.includes('failureCode: "growthos_export_output_not_found"'), "GrowthOS export route diagnoses missing projected outputs without raw data");
assertCheck(!growthOSExportRoute.includes("failureCode: \"growthos_export_kit_not_found\",\n                kitId,"), "GrowthOS export not-found diagnostics must not log raw kit IDs");
assertCheck(growthOSReviewSuggestRoute.includes("growthOSPrivateJson"), "GrowthOS review guard shared private JSON boundary");
assertCheck(growthOSReviewSuggestRoute.includes("withGrowthOSPrivateHeaders"), "GrowthOS review guard helper-response policy");
assertCheck(!growthOSReviewSuggestRoute.includes("NextResponse.json("), "GrowthOS review guard has no direct JSON response bypass");
assertCheck(growthOSHook.includes("getGrowthOSSummaryCacheKey(scope)"), "GrowthOS SWR cache key includes exact tenant/store scope");
assertCheck(!growthOSHook.includes('? "growthos-summary" : null'), "GrowthOS SWR must not use one global summary key");
assertCheck(
    growthOSPage.includes('["growthos-projects", clientScope.tId, clientScope.sId]'),
    "GrowthOS project-list cache key includes exact tenant/store scope",
);
assertCheck(
    growthOSPage.includes("setSelectedProjectId(null);")
        && growthOSPage.includes("[clientScope?.sId, clientScope?.tId]"),
    "GrowthOS desktop clears selected project when tenant/store scope changes",
);
assertCheck(growthOSClientDal.includes("projectGrowthOSSummaryForScope(snap.data(), expectedScope)"), "GrowthOS browser DAL projects and corroborates returned summary scope");
assertCheck(growthOSClientContracts.includes('["growthos-summary", scope.tId, scope.sId] as const'), "GrowthOS summary cache identity includes tenant and store");
assertCheck(growthOSClientContracts.includes("projectGrowthOSKitForScope"), "GrowthOS persisted kit and response DTOs use an exact scope projector");
assertCheck(growthOSClientContracts.includes("projectGrowthOSExportForScope"), "GrowthOS persisted export replays use an exact scope projector");
assertCheck(growthOSClientContracts.includes("return new Date(millis).toISOString();"), "GrowthOS timestamps serialize to public ISO strings");
assertCheck(growthOSServerDal.includes("projectGrowthOSKitForScope(existingKitSnap.data()"), "GrowthOS generation replay validates persisted kits");
assertCheck(growthOSServerDal.includes("projectGrowthOSExportForScope(existingExportSnap.data()"), "GrowthOS export replay validates persisted exports");
assertCheck(!growthOSServerDal.includes("snap.data() as GrowthOSKit"), "GrowthOS server reads must not assert raw kit documents");
assertCheck(!growthOSServerDal.includes("snap.data() as Partial<GrowthOSExport>"), "GrowthOS server reads must not assert raw export documents");
assertCheck(growthOSClientDal.includes("projectGrowthOSKitForScope(data.kit, scope)"), "GrowthOS client validates generated kit responses");
assertCheck(growthOSClientDal.includes("projectGrowthOSSummaryForScope(data.summary, scope)"), "GrowthOS client validates mutation summary responses");
assertCheck(!growthOSClientDal.includes("return payload as T"), "GrowthOS client must not trust generic JSON response types");
assertCheck(growthOSReadiness.includes("export function getGrowthOSTimestampMillis(value: unknown)"), "GrowthOS expiry uses an unknown-input timestamp boundary");
assertCheck(!growthOSReadiness.includes("expiresAt?: any"), "GrowthOS expiry no longer accepts an unchecked any boundary");
assertCheck(deferredMatches.length === 0, "deferred GrowthOS scope has no provider, posting, offer, order, or ROI hooks", deferredMatches.join(", "));
assertCheck(growthOSCmiConsumers.length === 0, "GrowthOS does not consume CMI/menuIntelligence until its own feature loop certifies that boundary", growthOSCmiConsumers.join(", "));
assertCheck(growthOSPage.includes("GROWTHOS_REFRESH_FAILED_DESCRIPTION"), "GrowthOS owner failure notifications use fixed descriptions");
assertCheck(
    growthOSPage.includes("pendingOperationsRef.current.has(\"generate\")")
        && growthOSPage.includes("pendingOperationsRef.current.has(operationKey)"),
    "Desktop Growth Kits synchronously suppress duplicate pending mutations",
);
assertCheck(!growthOSPage.includes("(error as Error).message"), "GrowthOS owner failure notifications do not show raw exception messages");
[
    "desktop_growthos_refresh_failed",
    "desktop_growthos_generate_failed",
    "desktop_growthos_copy_failed",
    "desktop_growthos_share_failed",
    "desktop_growthos_download_failed",
    "desktop_growthos_mark_used_failed",
    "desktop_growthos_review_reply_failed",
    "desktop_growthos_review_reply_copy_failed",
].forEach((failureCode) => {
    assertCheck(growthOSPage.includes(failureCode), `Desktop Growth Kits must log ${failureCode}`);
});
assertCheck(growthOSPage.includes("desktop_growthos_copy_clipboard_unavailable"), "Desktop Growth Kits must define unavailable clipboard failure code");
assertCheck(growthOSPage.includes("desktop_growthos_copy_fallback_failed"), "Desktop Growth Kits must define fallback copy failure code");
assertCheck(growthOSPage.includes("hasDesktopGrowthOSClipboardWrite"), "Desktop Growth Kits must check Clipboard API support");
assertCheck(growthOSPage.includes("hasDesktopGrowthOSCopyFallback"), "Desktop Growth Kits must check textarea fallback support");
assertCheck(growthOSPage.includes("getDesktopGrowthOSCopySupportContext"), "Desktop Growth Kits must centralize copy support diagnostics");
assertCheck(growthOSPage.includes('hasClipboardWrite: hasDesktopGrowthOSClipboardWrite()'), "Desktop Growth Kits must log Clipboard API support metadata");
assertCheck(growthOSPage.includes('hasCopyFallback: hasDesktopGrowthOSCopyFallback()'), "Desktop Growth Kits must log textarea fallback support metadata");
assertCheck(growthOSPage.includes('const copied = document.execCommand("copy");'), "Desktop Growth Kits textarea copy must check acknowledgement");
assertCheck(growthOSPage.includes('logGrowthOSApiFailure("[GrowthOS Desktop] Operation failed"'), "Desktop Growth Kits must use bounded GrowthOS diagnostics");
assertCheck(growthOSPage.includes('getGrowthOSBoundedStringContext("projectId", selectedProjectId)'), "Desktop Growth Kits must bound project id diagnostics");
assertCheck(growthOSPage.includes('getGrowthOSBoundedStringContext("storeId", storeDetails?.storeId)'), "Desktop Growth Kits must bound store id diagnostics");
assertCheck(growthOSPage.includes('getGrowthOSBoundedStringContext("outputId", output?.id)'), "Desktop Growth Kits must bound output id diagnostics");
assertCheck(growthOSPage.includes("outputTextLength: output?.text?.length || 0"), "Desktop Growth Kits must log only output text length");
assertCheck(growthOSPage.includes("reviewTextLength: reviewText.trim().length"), "Desktop Growth Kits must log only review text length");
assertCheck(growthOSPage.includes("reviewReplyTextLength: reviewResult.reply.length"), "Desktop Growth Kits must log only review reply text length");
assertCheck(growthOSPage.includes('aria-label="Menu"'), "Desktop Growth Kits menu selector must have an accessible name");
assertCheck(growthOSPage.includes('aria-label="Review rating"'), "Desktop Growth Kits review rating selector must have an accessible name");
assertTextOrder(growthOSPage, 'const copied = await copyToClipboard(output.text);', 'await recordUse(output, "copy");', "Desktop Growth Kits must record copy only after copy succeeds");
assertTextOrder(growthOSPage, 'if (!copied) throw new Error("desktop_growthos_share_fallback_copy_failed");', 'await recordUse(output, "share");', "Desktop Growth Kits must record share only after native share or fallback copy succeeds");
assertCheck(growthOSPage.includes('latestKit.status === "used" ? "Marked done" : "Done"'), "Desktop Growth Kits must visibly preserve the completed staff action");
assertCheck(growthOSPage.includes('if (latestKit?.status === "used") return;'), "Desktop Growth Kits must block repeated mark-used writes");
assertTextOrder(growthOSPage, 'downloadText(`${output.destination}.txt`, output.text);', 'await recordUse(output, "download");', "Desktop Growth Kits must record download only after download starts");
assertCheck(!growthOSPage.includes('onClick={() => copyToClipboard(reviewResult.reply || "")}'), "Desktop Growth Kits review reply copy must not be fire-and-forget");
[
    "mobile_growthos_refresh_failed",
    "mobile_growthos_generate_failed",
    "mobile_growthos_copy_failed",
    "mobile_growthos_share_failed",
    "mobile_growthos_mark_used_failed",
].forEach((failureCode) => {
    assertCheck(growthOSMobileCard.includes(failureCode), `Mobile Growth Kits must log ${failureCode}`);
});
assertCheck(growthOSMobileCard.includes("mobile_growthos_copy_clipboard_unavailable"), "Mobile Growth Kits must define unavailable clipboard failure code");
assertCheck(
    growthOSMobileCard.includes("pendingOperationsRef.current.has('generate')")
        && growthOSMobileCard.includes("pendingOperationsRef.current.has(operationKey)"),
    "Mobile Growth Kits synchronously suppress duplicate pending mutations",
);
assertCheck(growthOSMobileCard.includes("mobile_growthos_copy_fallback_failed"), "Mobile Growth Kits must define fallback copy failure code");
assertCheck(growthOSMobileCard.includes("hasMobileGrowthOSClipboardWrite"), "Mobile Growth Kits must check Clipboard API support");
assertCheck(growthOSMobileCard.includes("hasMobileGrowthOSCopyFallback"), "Mobile Growth Kits must check textarea fallback support");
assertCheck(growthOSMobileCard.includes("getMobileGrowthOSCopySupportContext"), "Mobile Growth Kits must centralize copy support diagnostics");
assertCheck(growthOSMobileCard.includes("hasClipboardWrite: hasMobileGrowthOSClipboardWrite()"), "Mobile Growth Kits must log Clipboard API support metadata");
assertCheck(growthOSMobileCard.includes("hasCopyFallback: hasMobileGrowthOSCopyFallback()"), "Mobile Growth Kits must log textarea fallback support metadata");
assertCheck(growthOSMobileCard.includes("const copied = document.execCommand('copy');"), "Mobile Growth Kits textarea copy must check acknowledgement");
assertCheck(growthOSMobileCard.includes("logGrowthOSApiFailure('[GrowthOS Mobile] Operation failed'"), "Mobile Growth Kits must use bounded GrowthOS diagnostics");
assertCheck(growthOSMobileCard.includes("getGrowthOSBoundedStringContext('projectId', projectId)"), "Mobile Growth Kits must bound project id diagnostics");
assertCheck(growthOSMobileCard.includes("getGrowthOSBoundedStringContext('kitId', latestKit?.id)"), "Mobile Growth Kits must bound kit id diagnostics");
assertCheck(growthOSMobileCard.includes("getGrowthOSBoundedStringContext('outputId', output?.id)"), "Mobile Growth Kits must bound output id diagnostics");
assertCheck(growthOSMobileCard.includes("outputTextLength: output?.text?.length || 0"), "Mobile Growth Kits must log only output text length");
assertTextOrder(growthOSMobileCard, "const copied = await copyText(output.text);", "await record(output, 'copy');", "Mobile Growth Kits must record copy only after copy succeeds");
assertTextOrder(growthOSMobileCard, "if (!copied) throw new Error('mobile_growthos_share_fallback_copy_failed');", "await record(output, 'share');", "Mobile Growth Kits must record share only after native share or fallback copy succeeds");
assertCheck(growthOSMobileCard.includes("latestKit?.status === 'used' ? 'Marked done' : 'Done'"), "Mobile Growth Kits must visibly preserve the completed staff action");
assertCheck(growthOSMobileCard.includes("if (latestKit?.status === 'used') return;"), "Mobile Growth Kits must block repeated mark-used writes");
assertCheck(growthOSServerDal.includes('currentKit.status === "used" && nextStatus !== "used"'), "Growth Kits must preserve used status across later exports");
assertCheck(growthOSSourceFactsSource.includes('...(facts.todayHoursLabel ? { todayHoursLabel: facts.todayHoursLabel } : {})'), "Growth Kits source summaries must omit an unknown hours label before persistence");
assertCheck(growthOSClientContracts.includes('todayHoursLabel: z.string().max(500).nullish().transform((value) => value ?? undefined)'), "Growth Kits must normalize legacy nullable hours labels");
assertCheck(!growthOSMobileCard.includes("(error as Error).message"), "Mobile Growth Kits failure toasts must not show raw exception messages");
assertCheck(!growthOSClientDal.includes("payload?.message || payload?.error"), "GrowthOS client helper does not throw raw API response text");
assertCheck(growthOSClientDal.includes("GROWTHOS_CLIENT_REQUEST_POLICY"), "GrowthOS client helper defines a shared browser request policy");
assertCheck(growthOSClientDal.includes("fetchGrowthOSIdempotentMutation"), "GrowthOS client retries ambiguous generate/export transport once with one operation identity");
assertCheck(growthOSClientDal.includes('cache: "no-store"'), "GrowthOS client requests bypass browser cache");
assertCheck(growthOSClientDal.includes('credentials: "same-origin"'), "GrowthOS client requests keep credentials same-origin");
assertCheck(growthOSClientDal.includes('redirect: "manual"'), "GrowthOS client requests do not follow redirects");
assertCheck((growthOSClientDal.match(/\.\.\.GROWTHOS_CLIENT_REQUEST_POLICY/g) || []).length >= 4, "GrowthOS client POSTs spread the shared request policy");
assertCheck(growthOSClientDal.includes("readJsonResponseWithLimit<unknown>(response, GROWTHOS_CLIENT_RESPONSE_JSON_MAX_BYTES)"), "GrowthOS client helper uses bounded response JSON parsing");
assertCheck(growthOSClientDal.includes("growthos_client_response_parse_failed"), "GrowthOS client helper logs malformed or oversized response parsing failures");
assertCheck(growthOSClientDal.includes("growthos_client_response_rejected"), "GrowthOS client helper logs rejected response envelopes");
assertCheck(growthOSClientDal.includes("growthos_client_response_invalid"), "GrowthOS client helper logs invalid successful response envelopes");
assertCheck(!growthOSClientDal.includes("response.json().catch(() => null)"), "GrowthOS client helper must not silently swallow response parse failures");

console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    checkCount: checks.length,
    checks,
    dryRun: {
        actionIds: actions.map((action) => action.id),
        kitId: kit.id,
        outputDestinations: kit.outputs.map((output) => output.destination),
        sourceFactsHash: kit.sourceFactsHash,
    },
}, null, 2));
