import {
    CAMPAIGNCUE_OFFER_PAGE_MAX_TTL_DAYS,
    CAMPAIGNCUE_OFFER_PAGE_SCHEMA_VERSION,
    CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN,
} from "@constant/campaigncue/offerPage";
import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCuePublicOfferPage,
} from "@type/campaigncue";

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 1_200;
const MAX_BUSINESS_NAME_LENGTH = 120;
const MAX_LOCALITY_LENGTH = 160;
const MAX_CTA_LABEL_LENGTH = 60;
const MAX_DESTINATION_LENGTH = 2_048;
const MAX_TERM_LENGTH = 240;
const MAX_TERMS = 4;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const compactText = (value: unknown, maxLength: number) => (
    typeof value === "string"
        ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
        : ""
);

const parseIso = (value: unknown) => {
    if (typeof value !== "string") return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
};

export function normalizeCampaignCueOfferDestination(value: unknown): string | null {
    const candidate = compactText(value, MAX_DESTINATION_LENGTH);
    if (!candidate) return null;
    if (/^tel:\+?[0-9][0-9 -]{6,20}$/i.test(candidate)) return candidate.replace(/[ -]/g, "");
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
        parsed.hash = "";
        return parsed.toString().slice(0, MAX_DESTINATION_LENGTH);
    } catch {
        return null;
    }
}

function businessDestination(businessBrain: CampaignCueBusinessBrain): string | null {
    for (const candidate of [
        businessBrain.contacts.bookingUrl,
        businessBrain.contacts.publicMenuUrl,
        businessBrain.contacts.website,
    ]) {
        const normalized = normalizeCampaignCueOfferDestination(candidate);
        if (normalized) return normalized;
    }
    const whatsappDigits = compactText(businessBrain.contacts.whatsapp, 40).replace(/\D/g, "");
    if (whatsappDigits.length >= 8 && whatsappDigits.length <= 15) return `https://wa.me/${whatsappDigits}`;
    const phoneDigits = compactText(businessBrain.contacts.phone, 40).replace(/[^0-9+]/g, "");
    return phoneDigits.length >= 8 ? normalizeCampaignCueOfferDestination(`tel:${phoneDigits}`) : null;
}

function selectedCampaignOutput(campaign: CampaignCueCampaign) {
    const priorities = ["google_local", "whatsapp", "creative"];
    return priorities
        .map((channel) => campaign.outputs.find((output) => output.channel === channel && output.trustGate === "clear"))
        .find(Boolean)
        || campaign.outputs.find((output) => output.trustGate === "clear");
}

export class CampaignCueOfferPageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CampaignCueOfferPageError";
    }
}

export function buildCampaignCuePublicOfferPage(params: {
    businessBrain: CampaignCueBusinessBrain;
    campaign: CampaignCueCampaign;
    now: Date;
    publishedBy: string;
    slug: string;
}): CampaignCuePublicOfferPage {
    if (!CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(params.slug)) {
        throw new CampaignCueOfferPageError("Campaign page slug is invalid.");
    }
    if (params.campaign.trustGate !== "clear") {
        throw new CampaignCueOfferPageError("Resolve Campaign Pack trust checks before publishing a page.");
    }
    if (params.campaign.pack?.missingInputIds.length) {
        throw new CampaignCueOfferPageError("Confirm all required Campaign Pack details before publishing a page.");
    }
    if (params.campaign.pack?.commercialGate?.status !== "ready") {
        throw new CampaignCueOfferPageError("Resolve commercial checks before publishing a page.");
    }
    const freshnessExpiry = parseIso(params.campaign.pack?.freshness?.expiresAt);
    if (params.campaign.pack?.freshness?.status !== "current" || !freshnessExpiry || freshnessExpiry <= params.now.getTime()) {
        throw new CampaignCueOfferPageError("Create a fresh Campaign Pack before publishing a page.");
    }

    const output = selectedCampaignOutput(params.campaign);
    if (!output) throw new CampaignCueOfferPageError("A checked campaign output is required before publishing a page.");
    const destination = normalizeCampaignCueOfferDestination(output.fields.destination) || businessDestination(params.businessBrain);
    if (!destination) throw new CampaignCueOfferPageError("Add one verified HTTPS, WhatsApp, booking, menu, or phone destination before publishing.");

    const title = compactText(output.fields.headline || params.campaign.title, MAX_TITLE_LENGTH);
    const body = compactText(output.fields.body || output.text || params.campaign.brief, MAX_BODY_LENGTH);
    const businessName = compactText(params.businessBrain.name, MAX_BUSINESS_NAME_LENGTH);
    if (!title || !body || !businessName) throw new CampaignCueOfferPageError("Campaign page title, copy, and business name are required.");

    const maxExpiry = params.now.getTime() + CAMPAIGNCUE_OFFER_PAGE_MAX_TTL_DAYS * 24 * 60 * 60 * 1_000;
    const expiresAt = new Date(Math.min(freshnessExpiry, maxExpiry)).toISOString();
    const publishedAt = params.now.toISOString();
    const terms = (output.fields.handoffFields || [])
        .filter((field) => /term|condition|valid|date|price/i.test(field.label))
        .map((field) => compactText(field.value, MAX_TERM_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TERMS);

    return {
        schemaVersion: CAMPAIGNCUE_OFFER_PAGE_SCHEMA_VERSION,
        slug: params.slug,
        workspaceId: params.campaign.workspaceId,
        campaignId: params.campaign.id,
        status: "published",
        title,
        body,
        businessName,
        locality: compactText(params.businessBrain.locality, MAX_LOCALITY_LENGTH) || undefined,
        ctaLabel: compactText(output.fields.cta, MAX_CTA_LABEL_LENGTH) || "Contact business",
        destination,
        terms,
        theme: {
            primaryColor: HEX_COLOR.test(params.businessBrain.brandKit.primaryColor || "")
                ? params.businessBrain.brandKit.primaryColor!
                : "#123F3A",
        },
        sourceOutputId: compactText(output.id, 160) || undefined,
        publishedBy: compactText(params.publishedBy, 160),
        publishedAt,
        updatedAt: publishedAt,
        expiresAt,
    };
}

const OFFER_KEYS = new Set([
    "schemaVersion", "slug", "workspaceId", "campaignId", "status", "title", "body", "businessName",
    "locality", "ctaLabel", "destination", "terms", "theme", "sourceOutputId", "publishedBy", "publishedAt",
    "updatedAt", "expiresAt",
]);

export function parseCampaignCuePublicOfferPageRecord(
    value: unknown,
    expectedSlug: string,
    now = new Date(),
): CampaignCuePublicOfferPage | null {
    if (!isRecord(value) || Object.keys(value).some((key) => !OFFER_KEYS.has(key))) return null;
    if (
        value.schemaVersion !== CAMPAIGNCUE_OFFER_PAGE_SCHEMA_VERSION
        || value.slug !== expectedSlug
        || !CAMPAIGNCUE_OFFER_PAGE_SLUG_PATTERN.test(expectedSlug)
        || value.status !== "published"
        || !isRecord(value.theme)
        || Object.keys(value.theme).some((key) => key !== "primaryColor")
    ) return null;

    const title = compactText(value.title, MAX_TITLE_LENGTH);
    const body = compactText(value.body, MAX_BODY_LENGTH);
    const businessName = compactText(value.businessName, MAX_BUSINESS_NAME_LENGTH);
    const ctaLabel = compactText(value.ctaLabel, MAX_CTA_LABEL_LENGTH);
    const destination = normalizeCampaignCueOfferDestination(value.destination);
    const workspaceId = compactText(value.workspaceId, 180);
    const campaignId = compactText(value.campaignId, 180);
    const publishedBy = compactText(value.publishedBy, 180);
    const publishedAtTime = parseIso(value.publishedAt);
    const updatedAtTime = parseIso(value.updatedAt);
    const expiresAtTime = parseIso(value.expiresAt);
    const terms = Array.isArray(value.terms)
        ? value.terms.map((term) => compactText(term, MAX_TERM_LENGTH)).filter(Boolean).slice(0, MAX_TERMS)
        : [];
    const primaryColor = compactText(value.theme.primaryColor, 9);
    if (
        !title || !body || !businessName || !ctaLabel || !destination || !workspaceId || !campaignId || !publishedBy
        || !publishedAtTime || !updatedAtTime || !expiresAtTime || expiresAtTime <= now.getTime()
        || !HEX_COLOR.test(primaryColor)
        || (Array.isArray(value.terms) && terms.length !== value.terms.length)
    ) return null;

    return {
        schemaVersion: CAMPAIGNCUE_OFFER_PAGE_SCHEMA_VERSION,
        slug: expectedSlug,
        workspaceId,
        campaignId,
        status: "published",
        title,
        body,
        businessName,
        locality: compactText(value.locality, MAX_LOCALITY_LENGTH) || undefined,
        ctaLabel,
        destination,
        terms,
        theme: { primaryColor },
        sourceOutputId: compactText(value.sourceOutputId, 160) || undefined,
        publishedBy,
        publishedAt: new Date(publishedAtTime).toISOString(),
        updatedAt: new Date(updatedAtTime).toISOString(),
        expiresAt: new Date(expiresAtTime).toISOString(),
    };
}
