import fs from "fs";
import path from "path";
import { FEATURE_FLAGS } from "../../src/config/features";
import { buildGrowthOSKit } from "../../src/lib/growthos/kitBuilder";
import { guardGrowthOSOutput } from "../../src/lib/growthos/outputGuard";
import { rankGrowthOSActions } from "../../src/lib/growthos/actionRanking";
import { computeGrowthOSReadiness, isGrowthOSKitExpired } from "../../src/lib/growthos/readiness";
import { evaluateGrowthOSEntitlement } from "../../src/lib/growthos/entitlements";
import { guardGrowthOSReviewReply } from "../../src/lib/growthos/reviewGuard";
import {
    buildGrowthOSSourceFacts,
    hashGrowthOSSourceFacts,
} from "../../src/lib/growthos/sourceFacts";
import type { GrowthOSOutput } from "../../src/types/growthos";

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
const entitlement = evaluateGrowthOSEntitlement({
    activeSubscription: null,
    storeDetails: storeData as any,
    storeId: storeData.storeId,
});
const deferredMatches = scanDeferredGrowthOSSurface();

assertCheck(FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON === false, "feature flag defaults off");
assertCheck(FEATURE_FLAGS.GROWTHOS_DIRECT_POSTING === "disabled", "direct posting remains disabled");
assertCheck(entitlement.allowed === false && entitlement.reason === "feature_off", "disabled feature denies entitlement");
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
