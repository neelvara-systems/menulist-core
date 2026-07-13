import { createHash } from "node:crypto";
import type {
    CampaignCueBusinessBrain,
    CampaignCuePatternCueFormat,
    CampaignCuePatternCueHookType,
    CampaignCuePatternCueObservation,
    CampaignCuePatternCuePacing,
    CampaignCuePatternCuePlatform,
    CampaignCuePatternCueRightsStatus,
    CampaignCueSourceInput,
} from "@type/campaigncue";

export const CAMPAIGNCUE_PATTERN_CUE_SCHEMA_VERSION = 1 as const;
export const CAMPAIGNCUE_PATTERN_CUE_MAX_NOTES_LENGTH = 12_000;
export const CAMPAIGNCUE_PATTERN_CUE_MAX_TAKEAWAY_LENGTH = 320;

export interface CampaignCuePatternCueBuildInput {
    businessBrain: CampaignCueBusinessBrain;
    durationSeconds?: number;
    ownerTakeaway?: string;
    platform?: CampaignCuePatternCuePlatform;
    rightsStatus: CampaignCuePatternCueRightsStatus;
    sourceUrl: string;
    transcriptOrNotes: string;
}

const compact = (value: unknown, limit: number) => (
    typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : ""
);

const primaryThing = (businessBrain: CampaignCueBusinessBrain) => {
    const service = businessBrain.catalog.services.find((item) => item.available) || businessBrain.catalog.services[0];
    const item = businessBrain.catalog.items.find((entry) => entry.available) || businessBrain.catalog.items[0];
    return service?.name || item?.name || "this business offer";
};

const safePublicHost = (hostname: string) => {
    const normalized = hostname.toLowerCase().replace(/\.$/, "");
    if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) return false;
    if (/^(?:127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(normalized)) return false;
    // Pattern Cue never needs literal-IP examples. Reject IPv6 literals rather
    // than trying to maintain an incomplete private/reserved range parser.
    if (normalized.includes(":")) return false;
    return true;
};

export const normalizeCampaignCuePatternCueUrl = (value: string): string | null => {
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== "https:" || parsed.username || parsed.password || !safePublicHost(parsed.hostname)) return null;
        const hasSensitiveQuery = Array.from(parsed.searchParams.keys()).some((key) => (
            /^(?:access_?token|auth|authorization|credential|key|password|session|signature|token|x-amz-|x-goog-)/i.test(key)
        ));
        if (hasSensitiveQuery) return null;
        parsed.hash = "";
        const normalized = parsed.toString();
        return normalized.length <= 1000 ? normalized : null;
    } catch {
        return null;
    }
};

export const inferCampaignCuePatternCuePlatform = (sourceUrl: string): CampaignCuePatternCuePlatform => {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (hostname === "youtu.be" || hostname.endsWith(".youtube.com") || hostname === "youtube.com") return "youtube";
    if (hostname.endsWith(".instagram.com") || hostname === "instagram.com") return "instagram";
    if (hostname.endsWith(".tiktok.com") || hostname === "tiktok.com") return "tiktok";
    return "other";
};

const classifyHook = (text: string): CampaignCuePatternCueHookType => {
    if (/\?/.test(text) || /\b(why|how|what|which|can you|did you|do you)\b/.test(text)) return "question";
    if (/\b(secret|most people|nobody|mistake|surprising|didn't know|did not know|wait until)\b/.test(text)) return "curiosity";
    if (/\b(show|showing|demo|demonstration|watch|step[- ]by[- ]step|before and after|before\/after|process)\b/.test(text)) return "demonstration";
    if (/\b(offer|discount|sale|deal|save|limited time|% off)\b/.test(text)) return "offer";
    if (/\b(story|journey|started|then|finally|day in the life)\b/.test(text)) return "story";
    return "direct_benefit";
};

const classifyFormat = (text: string): CampaignCuePatternCueFormat => {
    const talking = /\b(talking head|speaking to camera|face to camera|founder speaking|owner speaking)\b/.test(text);
    const demo = /\b(demo|demonstration|show the product|show the service|process|how it works)\b/.test(text);
    const montage = /\b(montage|quick cuts|b[- ]?roll|multiple clips|cut between)\b/.test(text);
    const screen = /\b(screen recording|screencast|app screen|website screen)\b/.test(text);
    const matches = [talking, demo, montage, screen].filter(Boolean).length;
    if (matches > 1) return "mixed";
    if (screen) return "screen_recording";
    if (montage) return "montage";
    if (demo) return "demonstration";
    return "talking_head";
};

const classifyPacing = (text: string, durationSeconds?: number): CampaignCuePatternCuePacing => {
    if (/\b(fast|rapid|quick cuts|high energy|jump cuts)\b/.test(text) || (durationSeconds != null && durationSeconds <= 15)) return "fast";
    if (/\b(calm|slow|gentle|unhurried|single take)\b/.test(text) || (durationSeconds != null && durationSeconds > 60)) return "calm";
    return "steady";
};

const durationBand = (seconds?: number): CampaignCuePatternCueObservation["durationBand"] => {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "unknown";
    if (seconds < 15) return "under_15_seconds";
    if (seconds <= 30) return "15_to_30_seconds";
    if (seconds <= 60) return "31_to_60_seconds";
    return "over_60_seconds";
};

const classifyCta = (text: string): CampaignCuePatternCueObservation["ctaPattern"] => {
    if (/\b(book|appointment|reserve)\b/.test(text)) return "book";
    if (/\b(call|phone)\b/.test(text)) return "call";
    if (/\b(dm|message|whatsapp|reply)\b/.test(text)) return "message";
    if (/\b(visit|come in|walk in|find us)\b/.test(text)) return "visit";
    if (/\b(link|bio|website|learn more|order online)\b/.test(text)) return "link";
    if (/\b(comment|tell us below)\b/.test(text)) return "comment";
    return "none";
};

const visualBeats = (text: string, thing: string): string[] => {
    const beats = [`Open with a clear view of ${thing}.`];
    if (/\b(owner|founder|staff|team|stylist|chef|coach)\b/.test(text)) beats.push("Show a real owner or staff moment with consent.");
    if (/\b(close[- ]?up|detail shot|product shot)\b/.test(text)) beats.push(`Use one close-up that proves ${thing} is real and current.`);
    if (/\b(process|behind the scenes|making|preparing)\b/.test(text)) beats.push("Show one real preparation or service step.");
    if (/\b(screen recording|screencast|app screen|website screen)\b/.test(text)) beats.push("Show only the owner-approved booking, menu, or destination screen.");
    beats.push("End on the verified business CTA, not the source creator's CTA.");
    return Array.from(new Set(beats)).slice(0, 6);
};

const structureFor = (hookType: CampaignCuePatternCueHookType, thing: string): string[] => [
    `Hook: use an original ${hookType.replace(/_/g, " ")} opening about ${thing}.`,
    `Proof: show one real product, service, owner, staff, or location detail for ${thing}.`,
    "Context: state only the approved business detail needed to understand the offer or action.",
    "Close: show one verified CTA and a clear final frame.",
];

const hooksFor = (
    businessBrain: CampaignCueBusinessBrain,
    thing: string,
    hookType: CampaignCuePatternCueHookType,
): string[] => {
    const locality = compact(businessBrain.locality, 80);
    const localLine = locality ? ` in ${locality}` : "";
    const templates: Record<CampaignCuePatternCueHookType, string[]> = {
        question: [
            `Looking for ${thing}${localLine}? Start with the details ${businessBrain.name} has confirmed.`,
            `What should you check before choosing ${thing}${localLine}?`,
            `Is ${thing} right for you? Here is what ${businessBrain.name} can confirm.`,
        ],
        curiosity: [
            `One detail people often miss about ${thing}${localLine}.`,
            `Before you choose ${thing}${localLine}, check this current detail from ${businessBrain.name}.`,
            `Here is the part of ${thing} worth seeing first at ${businessBrain.name}.`,
        ],
        demonstration: [
            `Watch how ${businessBrain.name} prepares ${thing}${localLine}.`,
            `Here is ${thing} from the first step to the final detail.`,
            `A close look at how ${thing} comes together at ${businessBrain.name}.`,
        ],
        offer: [
            `Here are the current confirmed details for ${thing} at ${businessBrain.name}.`,
            `${thing}${localLine}: check what is available before you visit or message.`,
            `Planning to choose ${thing}? Start with the owner-confirmed details.`,
        ],
        story: [
            `A quick look at how ${thing} comes together at ${businessBrain.name}.`,
            `From preparation to the final detail: ${thing}${localLine}.`,
            `The story behind ${thing} at ${businessBrain.name}.`,
        ],
        direct_benefit: [
            `Here is what ${businessBrain.name} is preparing for ${thing}${localLine}.`,
            `Looking for ${thing}${localLine}? Start with the details ${businessBrain.name} has confirmed.`,
            `Before you choose ${thing}${localLine}, check the current details from ${businessBrain.name}.`,
        ],
    };
    return templates[hookType];
};

export const buildCampaignCuePatternCueObservation = (
    input: CampaignCuePatternCueBuildInput,
): CampaignCuePatternCueObservation => {
    const sourceUrl = normalizeCampaignCuePatternCueUrl(input.sourceUrl);
    if (!sourceUrl) throw new Error("Pattern Cue requires a public HTTPS source link");
    const notes = compact(input.transcriptOrNotes, CAMPAIGNCUE_PATTERN_CUE_MAX_NOTES_LENGTH);
    if (notes.length < 20) throw new Error("Pattern Cue requires enough transcript or owner notes to understand the format");
    const ownerTakeaway = compact(input.ownerTakeaway, CAMPAIGNCUE_PATTERN_CUE_MAX_TAKEAWAY_LENGTH) || undefined;
    const normalizedText = `${notes} ${ownerTakeaway || ""}`.toLowerCase();
    const thing = primaryThing(input.businessBrain);
    const hookType = classifyHook(normalizedText);
    const format = classifyFormat(normalizedText);
    const pacing = classifyPacing(normalizedText, input.durationSeconds);
    const inferredPlatform = inferCampaignCuePatternCuePlatform(sourceUrl);
    const platform = inferredPlatform !== "other" ? inferredPlatform : input.platform || "other";
    const sourceHash = createHash("sha256")
        .update(JSON.stringify({ sourceUrl, notes, ownerTakeaway, durationSeconds: input.durationSeconds || null }))
        .digest("hex")
        .slice(0, 24);

    return {
        schemaVersion: CAMPAIGNCUE_PATTERN_CUE_SCHEMA_VERSION,
        sourceUrl,
        sourceHash,
        platform,
        rightsStatus: input.rightsStatus,
        analysisMode: "deterministic",
        hookType,
        format,
        pacing,
        durationBand: durationBand(input.durationSeconds),
        structure: structureFor(hookType, thing),
        visualBeats: visualBeats(normalizedText, thing),
        ctaPattern: classifyCta(normalizedText),
        candidateHooks: hooksFor(input.businessBrain, thing, hookType),
        ownerTakeaway,
        adaptationGuardrails: [
            "Reuse only the abstract format; do not copy the source script, captions, creator identity, music, footage, or distinctive wording.",
            "Use CampaignCue business facts and the owner-managed CTA only.",
            "Use real owner, staff, creator, or customer footage only with the required rights, consent, and disclosure.",
            "Do not claim virality, reach, revenue, rankings, results, or personal experience without approved proof.",
        ],
        summary: `${platform} ${format.replace(/_/g, " ")} pattern with a ${hookType.replace(/_/g, " ")} hook and ${pacing} pacing.`,
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isBoundedStringList = (value: unknown, maxItems: number) => (
    Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 600)
);

export const isCampaignCuePatternCueObservation = (
    value: unknown,
): value is CampaignCuePatternCueObservation => {
    if (!isRecord(value) || value.schemaVersion !== CAMPAIGNCUE_PATTERN_CUE_SCHEMA_VERSION) return false;
    if (typeof value.sourceUrl !== "string" || !normalizeCampaignCuePatternCueUrl(value.sourceUrl)) return false;
    if (typeof value.sourceHash !== "string" || !/^[a-f0-9]{24}$/.test(value.sourceHash)) return false;
    if (!["instagram", "tiktok", "youtube", "other"].includes(String(value.platform))) return false;
    if (!["reference_only", "owner_authorized"].includes(String(value.rightsStatus))) return false;
    if (!["deterministic", "model_candidate"].includes(String(value.analysisMode))) return false;
    if (!["question", "curiosity", "demonstration", "offer", "story", "direct_benefit"].includes(String(value.hookType))) return false;
    if (!["talking_head", "demonstration", "montage", "screen_recording", "mixed"].includes(String(value.format))) return false;
    if (!["calm", "steady", "fast"].includes(String(value.pacing))) return false;
    if (!["under_15_seconds", "15_to_30_seconds", "31_to_60_seconds", "over_60_seconds", "unknown"].includes(String(value.durationBand))) return false;
    if (!["book", "call", "message", "visit", "link", "comment", "none"].includes(String(value.ctaPattern))) return false;
    return isBoundedStringList(value.structure, 8)
        && isBoundedStringList(value.visualBeats, 8)
        && isBoundedStringList(value.candidateHooks, 4)
        && isBoundedStringList(value.adaptationGuardrails, 6)
        && typeof value.summary === "string"
        && value.summary.trim().length > 0
        && value.summary.length <= 300
        && (value.ownerTakeaway === undefined || (typeof value.ownerTakeaway === "string" && value.ownerTakeaway.length <= CAMPAIGNCUE_PATTERN_CUE_MAX_TAKEAWAY_LENGTH));
};

export const isCampaignCuePatternCueSourceInput = (input: CampaignCueSourceInput) => (
    input.sourceType === "inspiration_pattern" && isCampaignCuePatternCueObservation(input.patternCue)
);

export const getLatestCampaignCuePatternCueSource = (
    inputs: CampaignCueSourceInput[],
): CampaignCueSourceInput | undefined => inputs.find((input) => (
    input.status === "active" && isCampaignCuePatternCueSourceInput(input)
));

export const buildCampaignCuePatternCueBrief = (input?: CampaignCueSourceInput): string => {
    const pattern = input?.patternCue;
    if (!isCampaignCuePatternCueObservation(pattern)) return "";
    return [
        "Pattern Cue reference:",
        pattern.summary,
        `Original hook options:\n${pattern.candidateHooks.map((hook, index) => `${index + 1}. ${hook}`).join("\n")}`,
        `Structure:\n${pattern.structure.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
        `Visual beats:\n${pattern.visualBeats.map((beat) => `- ${beat}`).join("\n")}`,
        `Originality boundary: ${pattern.adaptationGuardrails[0]}`,
    ].join("\n\n");
};
