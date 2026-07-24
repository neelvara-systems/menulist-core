import fs from "fs";
import path from "path";
import { FEATURE_FLAGS } from "../../src/config/features";
import { buildGrowthOSKit } from "../../src/lib/growthos/kitBuilder";
import { guardGrowthOSOutput } from "../../src/lib/growthos/outputGuard";
import { rankGrowthOSActions } from "../../src/lib/growthos/actionRanking";
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
const growthOSKitReadBlock = growthOSServerDal.slice(
    growthOSServerDal.indexOf("export async function readGrowthOSKitServer"),
    growthOSServerDal.indexOf("function statusForExportMethod"),
);
const growthOSImplDoc = fs.readFileSync(path.resolve("__docs__/growthos-addon/growthos-addon_impl.md"), "utf8");
const growthOSFirebaseDoc = fs.readFileSync(path.resolve("__docs__/growthos-addon/growthos-addon_firebase.md"), "utf8");
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
const growthOSReviewSuggestRoute = fs.readFileSync(path.resolve("src/app/api/growthos/reviews/suggest/route.ts"), "utf8");

assertCheck(FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON === true, "GrowthOS master flag is enabled");
assertCheck(FEATURE_FLAGS.GROWTHOS_ADDON_ACCESS === "paid", "GrowthOS access defaults to paid plan gate");
assertCheck(FEATURE_FLAGS.GROWTHOS_DIRECT_POSTING === "disabled", "direct posting remains disabled");
assertCheck(normalizeStoreSwitchStoreId(101) === 101, "GrowthOS server entitlement scope accepts exact positive numeric IDs");
assertCheck(normalizeStoreSwitchStoreId(null) === null, "GrowthOS server entitlement scope rejects pre-onboarding null IDs");
assertCheck(normalizeStoreSwitchStoreId(0) === null, "GrowthOS server entitlement scope rejects zero IDs");
assertCheck(normalizeStoreSwitchStoreId("1e3") === null, "GrowthOS server entitlement scope rejects exponent-like IDs");
assertCheck(
    growthOSServerEntitlements.includes("const tenantId = normalizeStoreSwitchStoreId(params.session?.tId);"),
    "GrowthOS server entitlement tenant scope uses the exact positive ID normalizer",
);
assertCheck(
    growthOSServerEntitlements.includes("const storeId = normalizeStoreSwitchStoreId(params.session?.sId);"),
    "GrowthOS server entitlement store scope uses the exact positive ID normalizer",
);
assertCheck(
    !growthOSServerEntitlements.includes("Number(params.session?.tId)")
        && !growthOSServerEntitlements.includes("Number(params.session?.sId)"),
    "GrowthOS server entitlement scope does not coerce null or malformed IDs",
);
assertCheck(entitlement.allowed === false && entitlement.reason === "not_paid", "enabled GrowthOS denies stores without Pro or Premium");
withGrowthOSFlags({
    ENABLE_GROWTHOS_ADDON: false,
}, () => {
    const disabled = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    assertCheck(disabled.allowed === false && disabled.reason === "feature_off", "GrowthOS kill switch denies even active Pro plan");
});
withGrowthOSFlags({
    ENABLE_GROWTHOS_ADDON: true,
    GROWTHOS_ADDON_ACCESS: "paid",
    GROWTHOS_PAID_PLAN_IDS: ["pro", "premium"],
}, () => {
    const starter = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("starter"),
        storeDetails: { ...(storeData as any), growthosEntitlement: true },
        storeId: storeData.storeId,
    });
    const pro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const premium = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("premium"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const expiredPro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro", "expired"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    assertCheck(starter.allowed === false && starter.reason === "not_paid", "GrowthOS denies starter even with explicit add-on flags");
    assertCheck(pro.allowed === true, "GrowthOS paid gate allows active Pro plan");
    assertCheck(premium.allowed === true, "GrowthOS paid gate allows active Premium plan");
    assertCheck(expiredPro.allowed === false && expiredPro.reason === "not_paid", "GrowthOS paid gate denies inactive Pro subscription");
    const foreignTenantPro = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro", "active", 999),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
        tenantId: storeData.tenantId,
    });
    const answerlatticePro = evaluateGrowthOSEntitlement({
        activeSubscription: { ...makeSubscription("pro"), pId: "AL", productId: "AL" },
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
    GROWTHOS_PAID_PLAN_IDS: ["pro", "premium"],
    GROWTHOS_PILOT_STORE_IDS: [storeData.storeId],
}, () => {
    const pilotWithoutPaidPlan = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("starter"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const pilotWithPaidPlan = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro"),
        storeDetails: storeData as any,
        storeId: storeData.storeId,
    });
    const paidPlanOutsidePilot = evaluateGrowthOSEntitlement({
        activeSubscription: makeSubscription("pro"),
        storeDetails: storeData as any,
        storeId: "not-in-pilot",
    });
    assertCheck(pilotWithoutPaidPlan.allowed === false && pilotWithoutPaidPlan.reason === "not_paid", "GrowthOS pilot gate still requires Pro or Premium");
    assertCheck(pilotWithPaidPlan.allowed === true, "GrowthOS pilot gate allows listed Pro store");
    assertCheck(paidPlanOutsidePilot.allowed === false && paidPlanOutsidePilot.reason === "not_pilot_store", "GrowthOS pilot gate blocks paid stores outside allowlist");
});
assertCheck(facts.items.length === 3, "source facts read extracted menu items");
assertCheck(facts.items.some((item) => item.name === "Free Dessert" && item.available === false), "source facts retain unavailable item for staff guardrails");
assertCheck(readiness.status !== "blocked", "readiness allows available menu facts");
assertCheck(actions.length >= 2, "ranking creates multiple owner actions");
assertCheck(actions[0].itemName === "Paneer Power Bowl", "ranking prefers bestseller item");
assertCheck(!actions.some((action) => action.itemName === "Free Dessert"), "ranking excludes unavailable item");
assertCheck(publicOutputs.length === 6, "kit builds all public/manual destinations");
assertCheck(publicOutputs.every((output) => output.preflight.status === "ready"), "public outputs pass preflight");
assertCheck(publicOutputs.every((output) => !output.text.includes("Free Dessert")), "public outputs do not mention unavailable items");
assertCheck(Boolean(staffOutput), "deterministic staff brief is included");
assertCheck(staffOutput?.preflight.status === "blocked", "staff-only blocked output does not spill onto public outputs");
assertCheck(blockedOutput.preflight.status === "blocked", "public guard blocks unsupported claims and offers");
assertCheck(Boolean(safeReply.reply), "review guard prepares low-risk reply");
assertCheck(!unsafeReply.reply && unsafeReply.publicReplyRecommended === false, "review guard blocks food-safety public reply");
assertCheck(hashGrowthOSSourceFacts(facts) !== hashGrowthOSSourceFacts(updatedFacts), "source hash changes when menu truth changes");
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
assertTextOrder(
    growthOSServerDal,
    'const projectId = normalizeGrowthOSDocumentId(params.projectId);',
    '.doc(projectId)',
    "GrowthOS project ID guard runs before project document reads",
);
assertCheck(growthOSServerDal.includes('const kitId = requireGrowthOSDocumentId(kit.id, "kit");'), "GrowthOS kit writes require normalized kit IDs before Firestore writes");
assertCheck(growthOSServerDal.includes('const tenantDocumentId = requireGrowthOSScopeDocumentId(kit.tId, "tenant");'), "GrowthOS kit writes require tenant scope IDs before Firestore writes");
assertCheck(growthOSServerDal.includes('const storeDocumentId = requireGrowthOSScopeDocumentId(kit.sId, "store");'), "GrowthOS kit writes require store scope IDs before Firestore writes");
assertCheck(growthOSServerDal.includes('sanitizeForAdminFirestore({ ...kit, id: kitId })'), "GrowthOS kit writes persist the normalized kit ID");
assertCheck(growthOSServerDal.includes('return `growthos_${tId}_${sId}_${randomUUID()}`;'), "GrowthOS kit IDs remain collision-resistant under concurrent generation");
assertCheck(
    growthOSServerDal.includes('summaryTenantDocumentId !== tenantDocumentId')
        && growthOSServerDal.includes('summaryStoreDocumentId !== storeDocumentId')
        && growthOSServerDal.includes('summaryKitId !== kitId')
        && growthOSServerDal.includes('throw new Error("GrowthOS kit and summary scope mismatch")'),
    "GrowthOS atomic kit and summary writes reject mismatched persisted scope",
);
assertCheck(
    growthOSServerDal.includes("export async function writeGrowthOSKitAndSummaryServer")
        && growthOSServerDal.includes("batch.set(kitRef")
        && growthOSServerDal.includes("batch.set(summaryRef")
        && growthOSServerDal.includes("await batch.commit();"),
    "GrowthOS kit and summary writes commit atomically",
);
assertCheck(growthOSServerDal.includes('const kitId = normalizeGrowthOSDocumentId(params.kitId);'), "GrowthOS kit reads normalize kit IDs before Firestore reads");
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
assertCheck(growthOSReviewSuggestRoute.includes("key: `growthos-review:${userRateLimitHash}:${tenantRateLimitHash}`"), "GrowthOS review guard stores hashed limiter segments");
assertCheck(!growthOSReviewSuggestRoute.includes("key: `growthos-review:${session.uId || session.user?.id}:${session.tId}`"), "GrowthOS review guard does not store raw session identifiers in limiter keys");
assertCheck(deferredMatches.length === 0, "deferred GrowthOS scope has no provider, posting, offer, order, or ROI hooks", deferredMatches.join(", "));
assertCheck(growthOSCmiConsumers.length === 0, "GrowthOS does not consume CMI/menuIntelligence until its own feature loop certifies that boundary", growthOSCmiConsumers.join(", "));
assertCheck(growthOSPage.includes("GROWTHOS_REFRESH_FAILED_DESCRIPTION"), "GrowthOS owner failure notifications use fixed descriptions");
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
assertTextOrder(growthOSPage, 'const copied = await copyToClipboard(output.text);', 'await recordUse(output, "copy");', "Desktop Growth Kits must record copy only after copy succeeds");
assertTextOrder(growthOSPage, 'if (!copied) throw new Error("desktop_growthos_share_fallback_copy_failed");', 'await recordUse(output, "share");', "Desktop Growth Kits must record share only after native share or fallback copy succeeds");
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
assertCheck(!growthOSMobileCard.includes("(error as Error).message"), "Mobile Growth Kits failure toasts must not show raw exception messages");
assertCheck(!growthOSClientDal.includes("payload?.message || payload?.error"), "GrowthOS client helper does not throw raw API response text");
assertCheck(growthOSClientDal.includes("GROWTHOS_CLIENT_REQUEST_POLICY"), "GrowthOS client helper defines a shared browser request policy");
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
