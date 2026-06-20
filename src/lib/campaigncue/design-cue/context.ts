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

export const cleanDesignCueText = (value?: string | null) => (
    String(value || "").replace(/\s+/g, " ").trim()
);

export const truncateDesignCueText = (value: string, maxLength: number) => {
    const normalized = cleanDesignCueText(value);
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
};

const titleizeBusinessType = (value?: string) => (
    cleanDesignCueText(value || "local business").replace(/_/g, " ")
);

const getPrimaryItem = (businessBrain?: CampaignCueBusinessBrain) => {
    const catalog = businessBrain?.catalog;
    return [...(catalog?.items || []), ...(catalog?.services || [])].find((item) => item.available);
};

const getDestination = (businessBrain?: CampaignCueBusinessBrain) => {
    const contacts = businessBrain?.contacts;
    return cleanDesignCueText(contacts?.bookingUrl)
        || cleanDesignCueText(contacts?.publicMenuUrl)
        || cleanDesignCueText(contacts?.website)
        || cleanDesignCueText(contacts?.whatsapp)
        || cleanDesignCueText(contacts?.phone)
        || "Use the best active contact link.";
};

const getContactLine = (businessBrain?: CampaignCueBusinessBrain): Pick<
    CampaignCueDesignCueContext,
    "contactKind" | "contactLine" | "hasContactLine"
> => {
    const contacts = businessBrain?.contacts;
    const whatsapp = cleanDesignCueText(contacts?.whatsapp);
    if (whatsapp) return { contactKind: "whatsapp", contactLine: whatsapp, hasContactLine: true };
    const phone = cleanDesignCueText(contacts?.phone);
    if (phone) return { contactKind: "phone", contactLine: phone, hasContactLine: true };
    const bookingUrl = cleanDesignCueText(contacts?.bookingUrl);
    if (bookingUrl) return { contactKind: "booking_url", contactLine: bookingUrl, hasContactLine: true };
    const publicMenuUrl = cleanDesignCueText(contacts?.publicMenuUrl);
    if (publicMenuUrl) return { contactKind: "public_menu", contactLine: publicMenuUrl, hasContactLine: true };
    const website = cleanDesignCueText(contacts?.website);
    if (website) return { contactKind: "website", contactLine: website, hasContactLine: true };
    return { contactKind: "missing", contactLine: "", hasContactLine: false };
};

export const getDesignCueDocumentText = (documentValue: CreativeEditorDocument) => (
    documentValue.elements
        .map((element) => {
            if (element.type === "text" || element.type === "pathText") return element.text;
            if (element.type === "qr") return element.value;
            return "";
        })
        .filter(Boolean)
        .join(" ")
);

export const isDesignCueTextElement = (
    element?: CreativeEditorElement | null,
): element is Extract<CreativeEditorElement, { type: "pathText" | "text" }> => (
    Boolean(element && (element.type === "pathText" || element.type === "text"))
);

export const buildCampaignCueDesignCueContext = (params: {
    document: CreativeEditorDocument;
    overview?: CampaignCueOverview | null;
    selectedElement?: CreativeEditorElement | null;
    selectedText?: string;
}): CampaignCueDesignCueContext => {
    const businessBrain = params.overview?.businessBrain;
    const brand = params.document.metadata?.brand;
    const businessNameSource = cleanDesignCueText(businessBrain?.name || brand?.name);
    const localitySource = cleanDesignCueText(businessBrain?.locality || params.overview?.locations?.[0]?.locality);
    const contact = getContactLine(businessBrain);
    return {
        brandColor: cleanDesignCueText(businessBrain?.brandKit?.primaryColor || brand?.primaryColor) || DEFAULT_BRAND_COLOR,
        brandFeel: businessBrain?.brandKit?.playbook?.brandFeel || [],
        brandAvoidList: businessBrain?.brandKit?.playbook?.avoidList || [],
        brandVisualMotifs: businessBrain?.brandKit?.playbook?.visualMotifs || [],
        brandVoice: cleanDesignCueText(businessBrain?.brandKit?.voice || brand?.voice) || "friendly",
        businessName: businessNameSource || DEFAULT_BUSINESS_NAME,
        businessType: titleizeBusinessType(businessBrain?.businessType),
        contactKind: contact.contactKind,
        contactLine: contact.contactLine,
        destination: getDestination(businessBrain),
        documentText: getDesignCueDocumentText(params.document),
        hasBusinessName: Boolean(businessNameSource),
        hasContactLine: contact.hasContactLine,
        hasLocality: Boolean(localitySource),
        latestCampaign: params.overview?.campaigns?.[0],
        locality: localitySource || DEFAULT_LOCALITY,
        primaryItem: getPrimaryItem(businessBrain),
        selectedElement: params.selectedElement,
        selectedText: cleanDesignCueText(params.selectedText),
        sourceFacts: params.overview?.sourceFacts || [],
    };
};

export const getCampaignCueDesignCueOfferSubject = (context: CampaignCueDesignCueContext) => (
    cleanDesignCueText(context.latestCampaign?.title)
    || cleanDesignCueText(context.primaryItem?.name)
    || `${context.businessName} update`
);

export const getCampaignCueDesignCuePrimaryItemLine = (context: CampaignCueDesignCueContext) => {
    if (!context.primaryItem) return "A fresh update is ready for customers.";
    const price = context.primaryItem.priceLabel ? ` (${context.primaryItem.priceLabel})` : "";
    return `${context.primaryItem.name}${price} is ready for customers.`;
};
