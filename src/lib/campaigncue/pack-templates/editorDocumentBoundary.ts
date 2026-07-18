import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import { CampaignCuePackTemplateEditorDocumentSchema } from "@lib/validation/campaigncueCueLayersSchemas";
import type {
    CreativeEditorDocument,
    CreativeEditorElement,
    CreativeEditorMetadata,
    CreativeEditorTextPlaceholder,
} from "@/modules/creative-editor/types";

const SLOT_TOKEN = /^\{\{campaigncue:([a-zA-Z0-9_-]+)\}\}$/;
const MAX_TEMPLATE_PLACEHOLDERS = 40;

export interface CampaignCuePackTemplateBusinessFacts {
    brandKit?: {
        accentColor?: string;
        fontFamily?: string;
        name?: string;
        primaryColor?: string;
        secondaryColor?: string;
        voice?: string;
    };
    contacts: {
        bookingUrl?: string;
        phone?: string;
        publicMenuUrl?: string;
        website?: string;
        whatsapp?: string;
    };
    locality?: string;
    name: string;
}

const normalizeSlotId = (value: string, fallback: string) => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return normalized.length >= 3 ? normalized : fallback;
};

const tokenForSlot = (slotId: string) => `{{campaigncue:${slotId}}}`;

const getPlaceholderValueMap = (documentValue: CreativeEditorDocument) => {
    const byValue = new Map<string, string>();
    documentValue.metadata?.textPlaceholders?.forEach((placeholder, index) => {
        const value = placeholder.value.trim();
        if (!value || byValue.has(value)) return;
        byValue.set(value, normalizeSlotId(placeholder.id, `slot-${index + 1}`));
    });
    return byValue;
};

const stripElementSourceRefs = <T extends CreativeEditorElement>(element: T): T => {
    const { sourceRefs: _sourceRefs, ...rest } = element;
    return rest as T;
};

function prepareElements(
    elements: readonly CreativeEditorElement[],
    placeholderByValue: ReadonlyMap<string, string>,
    usedSlots: Set<string>,
): CreativeEditorElement[] {
    const prepared: CreativeEditorElement[] = [];
    for (const element of elements) {
        if (element.type === "image") continue;
        const stripped = stripElementSourceRefs(element);
        if (stripped.type === "text" || stripped.type === "pathText") {
            const slotId = placeholderByValue.get(stripped.text.trim()) || "custom-text";
            usedSlots.add(slotId);
            prepared.push({ ...stripped, text: tokenForSlot(slotId) });
            continue;
        }
        if (stripped.type === "qr") {
            const slotId = placeholderByValue.get(stripped.value.trim()) || "destination";
            usedSlots.add(slotId);
            prepared.push({ ...stripped, value: tokenForSlot(slotId) });
            continue;
        }
        prepared.push(stripped);
    }
    return prepared;
}

const safeTemplateMetadata = (
    metadata: CreativeEditorMetadata | undefined,
    templateId: string,
    usedSlots: ReadonlySet<string>,
): CreativeEditorMetadata => {
    const labelById = new Map(
        (metadata?.textPlaceholders || []).map((placeholder, index) => [
            normalizeSlotId(placeholder.id, `slot-${index + 1}`),
            placeholder.label,
        ]),
    );
    const textPlaceholders: CreativeEditorTextPlaceholder[] = Array.from(usedSlots)
        .slice(0, MAX_TEMPLATE_PLACEHOLDERS)
        .map((slotId) => ({
            id: slotId,
            label: labelById.get(slotId) || (slotId === "custom-text" ? "Editable text" : slotId.replace(/[-_]/g, " ")),
            value: tokenForSlot(slotId),
        }));
    const brand = metadata?.brand ? {
        accentColor: metadata.brand.accentColor,
        fontFamily: metadata.brand.fontFamily,
        primaryColor: metadata.brand.primaryColor,
        secondaryColor: metadata.brand.secondaryColor,
    } : undefined;
    return {
        brand,
        printFrames: metadata?.printFrames,
        templateId,
        textPlaceholders,
        trustGate: "needs_fix",
        updatedAt: new Date().toISOString(),
    };
};

export function prepareCampaignCuePackTemplateEditorDocument(params: {
    document: CreativeEditorDocument;
    templateId: string;
    workspaceId: string;
}): CreativeEditorDocument | undefined {
    if (
        params.document.productContext.productId !== CAMPAIGNCUE_PRODUCT_CODE
        || params.document.productContext.workspaceId !== params.workspaceId
    ) {
        throw new Error("Editor document belongs to another CampaignCue workspace.");
    }
    const placeholderByValue = getPlaceholderValueMap(params.document);
    const usedSlots = new Set<string>();
    const elements = prepareElements(params.document.elements, placeholderByValue, usedSlots);
    const pages = params.document.pages?.map((page) => ({
        ...page,
        elements: prepareElements(page.elements, placeholderByValue, usedSlots),
    }));
    if (!elements.length) return undefined;

    const candidate: CreativeEditorDocument = {
        ...params.document,
        elements,
        id: `cc_pack_template_${params.templateId}`,
        metadata: safeTemplateMetadata(params.document.metadata, params.templateId, usedSlots),
        pages,
        productContext: {
            productId: CAMPAIGNCUE_PRODUCT_CODE,
            sourceSurface: "pack-template",
            workspaceId: params.workspaceId,
        },
        title: "Reusable campaign layout",
    };
    return CampaignCuePackTemplateEditorDocumentSchema.parse(candidate) as CreativeEditorDocument;
}

const valueForSlot = (
    slotId: string,
    facts: CampaignCuePackTemplateBusinessFacts,
) => {
    const destination = facts.contacts.bookingUrl
        || facts.contacts.publicMenuUrl
        || facts.contacts.website
        || facts.contacts.whatsapp
        || facts.contacts.phone
        || "";
    switch (slotId) {
        case "business-name": return facts.name || "Business name";
        case "locality": return facts.locality || "Location";
        case "phone": return facts.contacts.phone || "Phone";
        case "website": return facts.contacts.website || "Website";
        case "booking-link": return facts.contacts.bookingUrl || "Booking link";
        case "menu-link": return facts.contacts.publicMenuUrl || "Menu link";
        case "destination": return destination || "Add destination";
        case "campaign-title":
        case "headline": return "Campaign headline";
        case "body": return "Add current campaign details";
        case "cta": return "Add call to action";
        default: return "Edit this text";
    }
};

function hydrateElements(
    elements: readonly CreativeEditorElement[],
    facts: CampaignCuePackTemplateBusinessFacts,
): CreativeEditorElement[] {
    return elements.map((element) => {
        if (element.type === "text" || element.type === "pathText") {
            const slotId = element.text.match(SLOT_TOKEN)?.[1];
            return slotId ? { ...element, text: valueForSlot(slotId, facts) } : element;
        }
        if (element.type === "qr") {
            const slotId = element.value.match(SLOT_TOKEN)?.[1];
            return slotId ? { ...element, value: valueForSlot(slotId, facts) } : element;
        }
        return element;
    });
}

export function hydrateCampaignCuePackTemplateEditorDocument(params: {
    businessFacts: CampaignCuePackTemplateBusinessFacts;
    document: CreativeEditorDocument;
    template: { description: string; title: string };
    workspaceId: string;
}): CreativeEditorDocument {
    const durable = CampaignCuePackTemplateEditorDocumentSchema.parse(params.document) as CreativeEditorDocument;
    if (
        durable.productContext.productId !== CAMPAIGNCUE_PRODUCT_CODE
        || durable.productContext.workspaceId !== params.workspaceId
    ) {
        throw new Error("Saved editor layout belongs to another CampaignCue workspace.");
    }
    const placeholders = durable.metadata?.textPlaceholders?.map((placeholder) => ({
        ...placeholder,
        value: valueForSlot(placeholder.id, params.businessFacts),
    }));
    const hydrated: CreativeEditorDocument = {
        ...durable,
        elements: hydrateElements(durable.elements, params.businessFacts),
        metadata: {
            ...durable.metadata,
            brand: {
                ...durable.metadata?.brand,
                ...params.businessFacts.brandKit,
                name: params.businessFacts.name,
            },
            textPlaceholders: placeholders,
            trustGate: "needs_fix",
            updatedAt: new Date().toISOString(),
        },
        pages: durable.pages?.map((page) => ({
            ...page,
            elements: hydrateElements(page.elements, params.businessFacts),
        })),
        title: params.template.title,
    };
    return CampaignCuePackTemplateEditorDocumentSchema.parse(hydrated) as CreativeEditorDocument;
}
