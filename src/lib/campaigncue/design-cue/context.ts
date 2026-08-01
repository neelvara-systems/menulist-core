import type {
    CampaignCueBusinessBrain,
    CampaignCueCampaign,
    CampaignCueCatalogItem,
    CampaignCueOverview,
    CampaignCueSourceFact,
} from "@type/campaigncue";
import type {
    CreativeEditorDocument,
    CreativeEditorElement,
} from "@/modules/creative-editor/types";

export interface CampaignCueDesignCueContext {
    brandColor: string;
    brandFeel: string[];
    brandAvoidList: string[];
    brandVisualMotifs: string[];
    brandVoice: string;
    businessName: string;
    businessType: string;
    contactLine: string;
    contactKind: "booking_url" | "phone" | "public_menu" | "website" | "whatsapp" | "missing";
    destination: string;
    documentText: string;
    hasBusinessName: boolean;
    hasContactLine: boolean;
    hasLocality: boolean;
    latestCampaign?: CampaignCueCampaign;
    locality: string;
    primaryItem?: CampaignCueCatalogItem;
    selectedElement?: CreativeEditorElement | null;
    selectedText: string;
    sourceFacts: CampaignCueSourceFact[];
}

const DEFAULT_BUSINESS_NAME = "this business";
const DEFAULT_BRAND_COLOR = "#24564d";
const DEFAULT_LOCALITY = "";
const MAX_CONTEXT_TEXT_LENGTH = 4_000;
const MAX_CONTEXT_LIST_ITEMS = 50;
const MAX_CONTEXT_LIST_TEXT_LENGTH = 240;

const readDesignCueValue = <T>(reader: () => T, fallback: T): T => {
    try {
        return reader();
    } catch {
        return fallback;
    }
};

export const cleanDesignCueText = (value?: unknown) => (
    typeof value === "string"
        ? value.replace(/\s+/g, " ").trim().slice(0, MAX_CONTEXT_TEXT_LENGTH)
        : ""
);

export const truncateDesignCueText = (value: string, maxLength: number) => {
    const normalized = cleanDesignCueText(value);
    const safeMaxLength = Number.isSafeInteger(maxLength)
        ? Math.max(0, Math.min(MAX_CONTEXT_TEXT_LENGTH, maxLength))
        : 0;
    if (normalized.length <= safeMaxLength) return normalized;
    if (safeMaxLength <= 3) return ".".repeat(safeMaxLength);
    return `${normalized.slice(0, safeMaxLength - 3).trimEnd()}...`;
};

const titleizeBusinessType = (value?: string) => (
    cleanDesignCueText(value || "local business").replace(/_/g, " ")
);

const getPrimaryItem = (businessBrain?: CampaignCueBusinessBrain) => {
    try {
        const catalog = businessBrain?.catalog;
        return [
            ...Array.from(catalog?.items || []).slice(0, MAX_CONTEXT_LIST_ITEMS),
            ...Array.from(catalog?.services || []).slice(0, MAX_CONTEXT_LIST_ITEMS),
        ].find((item) => item.available === true);
    } catch {
        return undefined;
    }
};

const getDestination = (businessBrain?: CampaignCueBusinessBrain) => {
    const contacts = readDesignCueValue(() => businessBrain?.contacts, undefined);
    return cleanDesignCueText(readDesignCueValue(() => contacts?.bookingUrl, undefined))
        || cleanDesignCueText(readDesignCueValue(() => contacts?.publicMenuUrl, undefined))
        || cleanDesignCueText(readDesignCueValue(() => contacts?.website, undefined))
        || cleanDesignCueText(readDesignCueValue(() => contacts?.whatsapp, undefined))
        || cleanDesignCueText(readDesignCueValue(() => contacts?.phone, undefined))
        || "Use the best active contact link.";
};

const getContactLine = (businessBrain?: CampaignCueBusinessBrain): Pick<
    CampaignCueDesignCueContext,
    "contactKind" | "contactLine" | "hasContactLine"
> => {
    const contacts = readDesignCueValue(() => businessBrain?.contacts, undefined);
    const whatsapp = cleanDesignCueText(readDesignCueValue(() => contacts?.whatsapp, undefined));
    if (whatsapp) return { contactKind: "whatsapp", contactLine: whatsapp, hasContactLine: true };
    const phone = cleanDesignCueText(readDesignCueValue(() => contacts?.phone, undefined));
    if (phone) return { contactKind: "phone", contactLine: phone, hasContactLine: true };
    const bookingUrl = cleanDesignCueText(readDesignCueValue(() => contacts?.bookingUrl, undefined));
    if (bookingUrl) return { contactKind: "booking_url", contactLine: bookingUrl, hasContactLine: true };
    const publicMenuUrl = cleanDesignCueText(readDesignCueValue(() => contacts?.publicMenuUrl, undefined));
    if (publicMenuUrl) return { contactKind: "public_menu", contactLine: publicMenuUrl, hasContactLine: true };
    const website = cleanDesignCueText(readDesignCueValue(() => contacts?.website, undefined));
    if (website) return { contactKind: "website", contactLine: website, hasContactLine: true };
    return { contactKind: "missing", contactLine: "", hasContactLine: false };
};

export const getDesignCueDocumentText = (documentValue: CreativeEditorDocument) => (
    (() => {
        try {
            return Array.from(documentValue.elements)
                .slice(0, 500)
                .map((element) => {
                    if (element.type === "text" || element.type === "pathText") return cleanDesignCueText(element.text);
                    if (element.type === "qr") return cleanDesignCueText(element.value);
                    return "";
                })
                .filter(Boolean)
                .join(" ")
                .slice(0, MAX_CONTEXT_TEXT_LENGTH);
        } catch {
            return "";
        }
    })()
);

export const isDesignCueTextElement = (
    element?: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "pathText" | "text" }> => (
    readDesignCueValue(
        () => Boolean(element && (element.type === "pathText" || element.type === "text")),
        false,
    )
);

export const buildCampaignCueDesignCueContext = (params: {
    document: CreativeEditorDocument;
    overview?: CampaignCueOverview | null;
    selectedElement?: CreativeEditorElement | null;
    selectedText?: string;
}): CampaignCueDesignCueContext => {
    const businessBrain = readDesignCueValue(() => params.overview?.businessBrain, undefined);
    const brand = readDesignCueValue(() => params.document.metadata?.brand, undefined);
    const businessNameSource = cleanDesignCueText(
        readDesignCueValue(() => businessBrain?.name, undefined)
        || readDesignCueValue(() => brand?.name, undefined),
    );
    const localitySource = cleanDesignCueText(
        readDesignCueValue(() => businessBrain?.locality, undefined)
        || readDesignCueValue(() => params.overview?.locations?.[0]?.locality, undefined),
    );
    const contact = getContactLine(businessBrain);
    const normalizeContextList = (value: unknown): string[] => {
        if (!Array.isArray(value)) return [];
        try {
            return Array.from(value)
                .slice(0, MAX_CONTEXT_LIST_ITEMS)
                .map((entry) => cleanDesignCueText(entry).slice(0, MAX_CONTEXT_LIST_TEXT_LENGTH))
                .filter(Boolean);
        } catch {
            return [];
        }
    };
    return {
        brandColor: cleanDesignCueText(
            readDesignCueValue(() => businessBrain?.brandKit?.primaryColor, undefined)
            || readDesignCueValue(() => brand?.primaryColor, undefined),
        ) || DEFAULT_BRAND_COLOR,
        brandFeel: normalizeContextList(readDesignCueValue(() => businessBrain?.brandKit?.playbook?.brandFeel, undefined)),
        brandAvoidList: normalizeContextList(readDesignCueValue(() => businessBrain?.brandKit?.playbook?.avoidList, undefined)),
        brandVisualMotifs: normalizeContextList(readDesignCueValue(() => businessBrain?.brandKit?.playbook?.visualMotifs, undefined)),
        brandVoice: cleanDesignCueText(
            readDesignCueValue(() => businessBrain?.brandKit?.voice, undefined)
            || readDesignCueValue(() => brand?.voice, undefined),
        ) || "friendly",
        businessName: businessNameSource || DEFAULT_BUSINESS_NAME,
        businessType: titleizeBusinessType(readDesignCueValue(() => businessBrain?.businessType, undefined)),
        contactKind: contact.contactKind,
        contactLine: contact.contactLine,
        destination: getDestination(businessBrain),
        documentText: getDesignCueDocumentText(params.document),
        hasBusinessName: Boolean(businessNameSource),
        hasContactLine: contact.hasContactLine,
        hasLocality: Boolean(localitySource),
        latestCampaign: readDesignCueValue(() => params.overview?.campaigns?.[0], undefined),
        locality: localitySource || DEFAULT_LOCALITY,
        primaryItem: getPrimaryItem(businessBrain),
        selectedElement: params.selectedElement,
        selectedText: cleanDesignCueText(params.selectedText),
        sourceFacts: (() => {
            try {
                return Array.from(readDesignCueValue(() => params.overview?.sourceFacts, undefined) || [])
                    .slice(0, MAX_CONTEXT_LIST_ITEMS);
            } catch {
                return [];
            }
        })(),
    };
};

export const getCampaignCueDesignCueOfferSubject = (context: CampaignCueDesignCueContext) => (
    cleanDesignCueText(readDesignCueValue(() => context.latestCampaign?.title, undefined))
    || cleanDesignCueText(readDesignCueValue(() => context.primaryItem?.name, undefined))
    || `${cleanDesignCueText(readDesignCueValue(() => context.businessName, DEFAULT_BUSINESS_NAME)) || DEFAULT_BUSINESS_NAME} update`
);

export const getCampaignCueDesignCuePrimaryItemLine = (context: CampaignCueDesignCueContext) => {
    const primaryItem = readDesignCueValue(() => context.primaryItem, undefined);
    if (!primaryItem) return "A fresh update is ready for customers.";
    const itemName = cleanDesignCueText(readDesignCueValue(() => primaryItem.name, undefined));
    const priceLabel = cleanDesignCueText(readDesignCueValue(() => primaryItem.priceLabel, undefined));
    const price = priceLabel ? ` (${priceLabel})` : "";
    return itemName ? `${itemName}${price} is ready for customers.` : "A fresh update is ready for customers.";
};
