import type {
    CampaignCueInboxBusinessField,
    CampaignCueInboxCandidate,
    CampaignCueInboxCandidateKind,
    CampaignCueInboxParseResult,
    CampaignCueSourceInputType,
} from "@type/campaigncue";

export const CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH = 4_000;
export const CAMPAIGNCUE_INBOX_MAX_CANDIDATES = 8;
export const CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH = 1_200;

export const buildCampaignCueInboxBatchId = (requestHash: string) => {
    if (!/^[a-f0-9]{64}$/.test(requestHash)) throw new Error("Invalid Campaign Inbox request hash.");
    return `cc_inbox_${requestHash.slice(0, 24)}`;
};

export const buildCampaignCueInboxSourceInputIds = (requestHash: string, count: number) => {
    if (!Number.isInteger(count) || count < 1 || count > CAMPAIGNCUE_INBOX_MAX_CANDIDATES) {
        throw new Error("Invalid Campaign Inbox candidate count.");
    }
    const batchId = buildCampaignCueInboxBatchId(requestHash);
    const requestPrefix = batchId.slice("cc_inbox_".length);
    return Array.from({ length: count }, (_, index) => (
        `cc_source_inbox_${requestPrefix.slice(0, 16)}_${String(index + 1).padStart(2, "0")}`
    ));
};

type SourceInputType = Exclude<CampaignCueSourceInputType, "inspiration_pattern">;

type CampaignCueInboxLabelRule = {
    aliases: readonly string[];
    businessField?: CampaignCueInboxBusinessField;
    destination: CampaignCueInboxCandidate["destination"];
    kind: CampaignCueInboxCandidateKind;
    label: string;
    reason: string;
    recommendedStatus: CampaignCueInboxCandidate["recommendedStatus"];
    sourceType?: SourceInputType;
};

const LABEL_RULES: readonly CampaignCueInboxLabelRule[] = [
    {
        aliases: ["offer", "promotion", "special"],
        destination: "source_input",
        kind: "offer",
        label: "Offer",
        reason: "Use as a current campaign offer after your review.",
        recommendedStatus: "active",
        sourceType: "offer",
    },
    {
        aliases: ["price", "offer price", "package price"],
        destination: "source_input",
        kind: "price",
        label: "Price",
        reason: "Keep the owner-confirmed price attached to this campaign source.",
        recommendedStatus: "active",
        sourceType: "offer",
    },
    {
        aliases: ["discount", "offer discount"],
        destination: "source_input",
        kind: "discount",
        label: "Discount",
        reason: "Use only after checking the saved commercial policy.",
        recommendedStatus: "active",
        sourceType: "offer",
    },
    {
        aliases: ["terms", "offer terms", "conditions"],
        destination: "source_input",
        kind: "terms",
        label: "Offer terms",
        reason: "Keep the terms beside the offer for Trust Center review.",
        recommendedStatus: "active",
        sourceType: "offer",
    },
    {
        aliases: ["availability", "slots", "stock", "capacity"],
        destination: "source_input",
        kind: "availability",
        label: "Availability",
        reason: "Use as the current owner-confirmed availability note.",
        recommendedStatus: "active",
        sourceType: "manual_note",
    },
    {
        aliases: ["event", "date", "starts", "start date", "ends", "end date", "valid until"],
        destination: "source_input",
        kind: "event",
        label: "Campaign timing",
        reason: "Keep the entered timing exactly as written for review.",
        recommendedStatus: "active",
        sourceType: "event",
    },
    {
        aliases: ["photo", "image", "asset", "file"],
        destination: "source_input",
        kind: "asset_note",
        label: "Asset note",
        reason: "Record the note now; the file and its rights still need review.",
        recommendedStatus: "needs_review",
        sourceType: "upload_metadata",
    },
    {
        aliases: ["note", "update", "other"],
        destination: "source_input",
        kind: "note",
        label: "Owner update",
        reason: "Keep this as a reviewable note without inferring business facts.",
        recommendedStatus: "needs_review",
        sourceType: "manual_note",
    },
    {
        aliases: ["phone", "phone number", "contact number"],
        businessField: "phone",
        destination: "business_details",
        kind: "phone",
        label: "Phone number",
        reason: "Confirm this protected contact in Business Details.",
        recommendedStatus: "needs_review",
    },
    {
        aliases: ["whatsapp", "whatsapp number"],
        businessField: "whatsapp",
        destination: "business_details",
        kind: "whatsapp",
        label: "WhatsApp number",
        reason: "Confirm this protected contact in Business Details.",
        recommendedStatus: "needs_review",
    },
    {
        aliases: ["website", "website link", "site"],
        businessField: "website",
        destination: "business_details",
        kind: "website",
        label: "Website",
        reason: "Confirm this reusable destination in Business Details.",
        recommendedStatus: "needs_review",
    },
    {
        aliases: ["menu", "menu link", "catalog", "catalog link"],
        businessField: "publicMenuUrl",
        destination: "business_details",
        kind: "menu_link",
        label: "Menu or catalog link",
        reason: "Confirm this reusable destination in Business Details.",
        recommendedStatus: "needs_review",
    },
    {
        aliases: ["booking", "booking link", "appointment link"],
        businessField: "bookingUrl",
        destination: "business_details",
        kind: "booking_link",
        label: "Booking link",
        reason: "Confirm this protected destination in Business Details.",
        recommendedStatus: "needs_review",
    },
    {
        aliases: ["location", "address", "locality", "area"],
        businessField: "locality",
        destination: "business_details",
        kind: "location",
        label: "Location",
        reason: "Confirm this protected location in Business Details.",
        recommendedStatus: "needs_review",
    },
] as const;

const compactWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeLabel = (value: string) => compactWhitespace(value.normalize("NFKC"))
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ruleByAlias = new Map(
    LABEL_RULES.flatMap((rule) => rule.aliases.map((alias) => [normalizeLabel(alias), rule] as const)),
);

const candidateKey = (candidate: Omit<CampaignCueInboxCandidate, "id">) => [
    candidate.destination,
    candidate.businessField || "",
    candidate.sourceType || "",
    normalizeLabel(candidate.label),
    compactWhitespace(candidate.value).toLocaleLowerCase("en-US"),
].join(":");

const buildCandidate = (
    rule: CampaignCueInboxLabelRule,
    value: string,
): Omit<CampaignCueInboxCandidate, "id"> => ({
    businessField: rule.businessField,
    destination: rule.destination,
    kind: rule.kind,
    label: rule.label,
    reason: rule.reason,
    recommendedStatus: rule.recommendedStatus,
    sourceType: rule.sourceType,
    value,
});

const noteRule = LABEL_RULES.find((rule) => rule.kind === "note") as CampaignCueInboxLabelRule;

export function parseCampaignCueInboxText(rawText: string): CampaignCueInboxParseResult {
    const text = rawText.normalize("NFKC").trim();
    if (!text) {
        return {
            blocked: true,
            candidates: [],
            notices: ["Add at least one current business update."],
        };
    }
    if (text.length > CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH) {
        return {
            blocked: true,
            candidates: [],
            notices: [`Keep this update under ${CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH.toLocaleString("en-US")} characters.`],
        };
    }

    const parsed: Array<Omit<CampaignCueInboxCandidate, "id">> = [];
    const noteLines: string[] = [];
    const notices: string[] = [];
    let blocked = false;

    for (const rawLine of text.split(/\r?\n/)) {
        const line = compactWhitespace(rawLine);
        if (!line) continue;
        const separatorIndex = line.search(/[:：]/);
        if (separatorIndex <= 0) {
            noteLines.push(line);
            continue;
        }
        const rawLabel = line.slice(0, separatorIndex);
        const value = compactWhitespace(line.slice(separatorIndex + 1));
        const rule = ruleByAlias.get(normalizeLabel(rawLabel));
        if (!rule || !value) {
            noteLines.push(line);
            continue;
        }
        if (value.length > CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH) {
            blocked = true;
            notices.push(`${rule.label} is too long. Keep each detail under ${CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH.toLocaleString("en-US")} characters.`);
            continue;
        }
        parsed.push(buildCandidate(rule, value));
    }

    if (noteLines.length) {
        const noteValue = noteLines.join("\n");
        if (noteValue.length > CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH) {
            blocked = true;
            notices.push(`The unlabelled update is too long. Keep it under ${CAMPAIGNCUE_INBOX_MAX_VALUE_LENGTH.toLocaleString("en-US")} characters.`);
        } else {
            parsed.push(buildCandidate(noteRule, noteValue));
        }
    }

    const uniqueCandidates: Array<Omit<CampaignCueInboxCandidate, "id">> = [];
    const seen = new Set<string>();
    for (const candidate of parsed) {
        const key = candidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueCandidates.push(candidate);
    }

    if (uniqueCandidates.length > CAMPAIGNCUE_INBOX_MAX_CANDIDATES) {
        blocked = true;
        notices.push(`Keep one update to ${CAMPAIGNCUE_INBOX_MAX_CANDIDATES} details. Save this group, then add the rest.`);
    }

    const candidates = uniqueCandidates
        .slice(0, CAMPAIGNCUE_INBOX_MAX_CANDIDATES)
        .map((candidate, index) => ({
            ...candidate,
            id: `cc_inbox_candidate_${index + 1}`,
        }));

    if (!candidates.length && !notices.length) {
        notices.push("Add at least one detail after a label, or keep the update as a short note.");
        blocked = true;
    }

    return { blocked, candidates, notices };
}

export const campaignCueInboxCandidateToSourceInput = (candidate: CampaignCueInboxCandidate) => {
    if (candidate.destination !== "source_input" || !candidate.sourceType) return null;
    return {
        candidateId: candidate.id,
        label: candidate.label,
        sourceType: candidate.sourceType,
        status: candidate.recommendedStatus,
        value: candidate.value,
    } as const;
};

export const campaignCueInboxCandidateToBusinessPatch = (candidate: CampaignCueInboxCandidate) => {
    if (candidate.destination !== "business_details" || !candidate.businessField) return null;
    return { [candidate.businessField]: candidate.value } as Partial<Record<CampaignCueInboxBusinessField, string>>;
};
