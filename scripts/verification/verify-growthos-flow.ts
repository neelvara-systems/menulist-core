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


const storeData = {
    currencySymbol: "₹",
    customDomain: "",
    name: "Green Bowl Cafe - Main Store",
    storeId: "dry-store",
    storeName: "Green Bowl Cafe - Main Store",
    subdomain: "green-bowl-cafe",
    tenantName: "Green Bowl Cafe",
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

const makeSubscription = (planId: string, status = "active") => ({
    planId,
    status,
} as any);

const entitlement = evaluateGrowthOSEntitlement({
    activeSubscription: null,
    storeDetails: storeData as any,
    storeId: storeData.storeId,
});
const deferredMatches = scanDeferredGrowthOSSurface();
const retiredTodayPromptMatches = scanRetiredTodayActionPrompts();
const deletedTodayGenerationFiles = scanDeletedTodayGenerationFiles();
const retiredGlobalTodayPollingMatches = scanRetiredGlobalTodayPolling();
const retiredCampaignDalExports = scanRetiredCampaignDalExports();

assertCheck(FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON === true, "GrowthOS master flag is enabled");
assertCheck(FEATURE_FLAGS.GROWTHOS_ADDON_ACCESS === "paid", "GrowthOS access defaults to paid plan gate");
assertCheck(FEATURE_FLAGS.GROWTHOS_DIRECT_POSTING === "disabled", "direct posting remains disabled");
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
assertCheck(deferredMatches.length === 0, "deferred GrowthOS scope has no provider, posting, offer, order, or ROI hooks", deferredMatches.join(", "));

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
