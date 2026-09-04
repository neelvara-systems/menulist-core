import { normalizeMenuKitInput } from '@lib/menu-kit/types';
import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '@data/shared/publicMenuDraftData';
import { normalizeMenuCardLogoUrl } from '@lib/menu-card-export/source/buildPrintSource';
import { isPrintableAssetTypeId } from './assetTypes';
import { isPrintableTemplateFamilyId, normalizePrintableTemplateFamilyId } from './templateFamilies';
import { normalizeMenuKitAssetStyleMap } from './stylePreferences';
import type {
    PrintableAssetOutputFormat,
    PrintableAssetRenderInput,
    PrintableCampaignContent,
    PrintableFlyerCampaignContent,
    PrintableGiftCertificateContent,
    PrintableInvitationContent,
    PrintablePostcardContent,
    PrintableProductTagContent,
} from './types';

const OUTPUT_FORMATS = new Set<PrintableAssetOutputFormat>(['pdf', 'png', 'zip']);
const MAX_PRINTABLE_TEXT_LENGTH = 240;
const MAX_PRINTABLE_PROJECT_ID_LENGTH = 1_500;
const FLYER_CAMPAIGN_TEXT_LIMITS = {
    details: 180,
    headline: 70,
    offer: 90,
    terms: 140,
    validUntil: 60,
} as const;
const POSTCARD_TEXT_LIMITS = {
    headline: 70,
    message: 180,
} as const;
const GIFT_CERTIFICATE_TEXT_LIMITS = {
    certificateNumber: 40,
    message: 140,
    recipient: 70,
    sender: 70,
    validUntil: 60,
    value: 40,
} as const;
const INVITATION_TEXT_LIMITS = {
    date: 50,
    location: 120,
    occasion: 80,
    time: 40,
} as const;
const PRODUCT_TAG_TEXT_LIMITS = {
    detail: 100,
    name: 70,
    optionName: 80,
    optionPrice: 30,
    options: PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM,
    price: 30,
} as const;

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined;
    } catch {
        return undefined;
    }
}

function normalizeText(value: unknown, maxLength = MAX_PRINTABLE_TEXT_LENGTH): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.slice(0, maxLength).trim();
    return normalized || undefined;
}

function normalizeHttpsUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length > 4_096) return undefined;
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
        return parsed.toString();
    } catch {
        return undefined;
    }
}

export function normalizePrintableFlyerCampaignContent(value: unknown): PrintableFlyerCampaignContent | undefined {
    const headline = normalizeText(readOwnField(value, 'headline'), FLYER_CAMPAIGN_TEXT_LIMITS.headline);
    if (!headline) return undefined;

    const details = normalizeText(readOwnField(value, 'details'), FLYER_CAMPAIGN_TEXT_LIMITS.details);
    const offer = normalizeText(readOwnField(value, 'offer'), FLYER_CAMPAIGN_TEXT_LIMITS.offer);
    const terms = normalizeText(readOwnField(value, 'terms'), FLYER_CAMPAIGN_TEXT_LIMITS.terms);
    const validUntil = normalizeText(readOwnField(value, 'validUntil'), FLYER_CAMPAIGN_TEXT_LIMITS.validUntil);

    return {
        headline,
        ...(offer ? { offer } : {}),
        ...(details ? { details } : {}),
        ...(validUntil ? { validUntil } : {}),
        ...(terms ? { terms } : {}),
    };
}

export function normalizePrintableCampaignContent(value: unknown): PrintableCampaignContent | undefined {
    return normalizePrintableFlyerCampaignContent(value);
}

export function normalizePrintablePostcardContent(value: unknown): PrintablePostcardContent | undefined {
    const headline = normalizeText(readOwnField(value, 'headline'), POSTCARD_TEXT_LIMITS.headline);
    if (!headline) return undefined;
    const message = normalizeText(readOwnField(value, 'message'), POSTCARD_TEXT_LIMITS.message);
    return {
        headline,
        ...(message ? { message } : {}),
    };
}

export function normalizePrintableGiftCertificateContent(value: unknown): PrintableGiftCertificateContent | undefined {
    const certificateNumber = normalizeText(readOwnField(value, 'certificateNumber'), GIFT_CERTIFICATE_TEXT_LIMITS.certificateNumber);
    const message = normalizeText(readOwnField(value, 'message'), GIFT_CERTIFICATE_TEXT_LIMITS.message);
    const recipient = normalizeText(readOwnField(value, 'recipient'), GIFT_CERTIFICATE_TEXT_LIMITS.recipient);
    const sender = normalizeText(readOwnField(value, 'sender'), GIFT_CERTIFICATE_TEXT_LIMITS.sender);
    const validUntil = normalizeText(readOwnField(value, 'validUntil'), GIFT_CERTIFICATE_TEXT_LIMITS.validUntil);
    const certificateValue = normalizeText(readOwnField(value, 'value'), GIFT_CERTIFICATE_TEXT_LIMITS.value);
    if (!certificateNumber && !message && !recipient && !sender && !validUntil && !certificateValue) return undefined;
    return {
        ...(recipient ? { recipient } : {}),
        ...(sender ? { sender } : {}),
        ...(message ? { message } : {}),
        ...(certificateValue ? { value: certificateValue } : {}),
        ...(validUntil ? { validUntil } : {}),
        ...(certificateNumber ? { certificateNumber } : {}),
    };
}

export function normalizePrintableInvitationContent(value: unknown): PrintableInvitationContent | undefined {
    const date = normalizeText(readOwnField(value, 'date'), INVITATION_TEXT_LIMITS.date);
    const location = normalizeText(readOwnField(value, 'location'), INVITATION_TEXT_LIMITS.location);
    const occasion = normalizeText(readOwnField(value, 'occasion'), INVITATION_TEXT_LIMITS.occasion);
    const time = normalizeText(readOwnField(value, 'time'), INVITATION_TEXT_LIMITS.time);
    if (!date && !location && !occasion && !time) return undefined;
    return {
        ...(occasion ? { occasion } : {}),
        ...(date ? { date } : {}),
        ...(time ? { time } : {}),
        ...(location ? { location } : {}),
    };
}

export function normalizePrintableProductTagContent(value: unknown): PrintableProductTagContent | undefined {
    const name = normalizeText(readOwnField(value, 'name'), PRODUCT_TAG_TEXT_LIMITS.name);
    if (!name) return undefined;
    const detail = normalizeText(readOwnField(value, 'detail'), PRODUCT_TAG_TEXT_LIMITS.detail);
    const price = normalizeText(readOwnField(value, 'price'), PRODUCT_TAG_TEXT_LIMITS.price);
    const rawOptions = readOwnField(value, 'options');
    const options = (Array.isArray(rawOptions) ? rawOptions : [])
        .slice(0, PRODUCT_TAG_TEXT_LIMITS.options)
        .map((option) => {
            const optionName = normalizeText(readOwnField(option, 'name'), PRODUCT_TAG_TEXT_LIMITS.optionName);
            const priceLabel = normalizeText(readOwnField(option, 'priceLabel'), PRODUCT_TAG_TEXT_LIMITS.optionPrice);
            return optionName
                ? { name: optionName, ...(priceLabel ? { priceLabel } : {}) }
                : null;
        })
        .filter((option): option is NonNullable<typeof option> => option !== null);
    return {
        name,
        ...(detail ? { detail } : {}),
        ...(options.length > 0 ? { options } : {}),
        ...(price ? { price } : {}),
    };
}

export function normalizePrintableAssetRenderInput(value: unknown): PrintableAssetRenderInput | null {
    const assetTypeId = readOwnField(value, 'assetTypeId');
    const templateFamilyId = readOwnField(value, 'templateFamilyId');
    if (
        typeof assetTypeId !== 'string'
        || !isPrintableAssetTypeId(assetTypeId)
        || typeof templateFamilyId !== 'string'
        || !isPrintableTemplateFamilyId(templateFamilyId)
    ) {
        return null;
    }

    const menuKitInput = normalizeMenuKitInput(value);
    if (!menuKitInput) return null;
    const safeMenuKitInput = { ...menuKitInput };
    delete safeMenuKitInput.logoUrl;

    const outputFormatValue = readOwnField(value, 'outputFormat');
    const outputFormat = typeof outputFormatValue === 'string' && OUTPUT_FORMATS.has(outputFormatValue as PrintableAssetOutputFormat)
        ? outputFormatValue as PrintableAssetOutputFormat
        : undefined;
    const projectId = normalizeText(readOwnField(value, 'projectId'), MAX_PRINTABLE_PROJECT_ID_LENGTH);
    const logoUrl = normalizeMenuCardLogoUrl(readOwnField(value, 'logoUrl'));
    const printMenuOptions = readOwnField(value, 'printMenuOptions');
    const contactAddress = normalizeText(readOwnField(value, 'contactAddress'));
    const contactEmail = normalizeText(readOwnField(value, 'contactEmail'));
    const contactName = normalizeText(readOwnField(value, 'contactName'));
    const contactPhone = normalizeText(readOwnField(value, 'contactPhone'));
    const contactRole = normalizeText(readOwnField(value, 'contactRole'));
    const socialHandle = normalizeText(readOwnField(value, 'socialHandle'));
    const staffName = normalizeText(readOwnField(value, 'staffName'), 80);
    const staffRole = normalizeText(readOwnField(value, 'staffRole'), 80);
    const tagline = normalizeText(readOwnField(value, 'tagline'));
    const feedbackUrl = normalizeHttpsUrl(readOwnField(value, 'feedbackUrl'));
    const obpBaseUrl = normalizeHttpsUrl(readOwnField(value, 'obpBaseUrl'));
    const assetTemplateFamilyIds = normalizeMenuKitAssetStyleMap(readOwnField(value, 'assetTemplateFamilyIds'));
    const campaignContent = normalizePrintableCampaignContent(
        readOwnField(value, 'campaignContent') ?? readOwnField(value, 'flyerCampaign'),
    );
    const postcardContent = normalizePrintablePostcardContent(readOwnField(value, 'postcardContent'));
    const giftCertificateContent = normalizePrintableGiftCertificateContent(readOwnField(value, 'giftCertificateContent'));
    const invitationContent = normalizePrintableInvitationContent(readOwnField(value, 'invitationContent'));
    const productTagContent = normalizePrintableProductTagContent(readOwnField(value, 'productTagContent'));
    const normalizedTemplateFamilyId = normalizePrintableTemplateFamilyId(templateFamilyId);

    return {
        ...safeMenuKitInput,
        assetTypeId,
        templateFamilyId: normalizedTemplateFamilyId,
        ...(outputFormat ? { outputFormat } : {}),
        ...(projectId && !projectId.includes('/') ? { projectId } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        ...(contactAddress ? { contactAddress } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactName ? { contactName } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        ...(contactRole ? { contactRole } : {}),
        ...(socialHandle ? { socialHandle } : {}),
        ...(assetTypeId === 'staff_id_card' && staffName ? { staffName } : {}),
        ...(assetTypeId === 'staff_id_card' && staffName && staffRole ? { staffRole } : {}),
        ...(tagline ? { tagline } : {}),
        ...(feedbackUrl ? { feedbackUrl } : {}),
        ...(obpBaseUrl ? { obpBaseUrl } : {}),
        ...(assetTypeId === 'campaign_flyer' && campaignContent
            ? { campaignContent, flyerCampaign: campaignContent }
            : {}),
        ...(assetTypeId === 'campaign_poster' && campaignContent
            ? { campaignContent }
            : {}),
        ...(assetTypeId === 'postcard' && postcardContent
            ? { postcardContent }
            : {}),
        ...(assetTypeId === 'gift_certificate' && giftCertificateContent
            ? { giftCertificateContent }
            : {}),
        ...(assetTypeId === 'event_invitation' && invitationContent
            ? { invitationContent }
            : {}),
        ...(assetTypeId === 'product_tag' && productTagContent
            ? { productTagContent }
            : {}),
        ...(assetTypeId === 'complete_menu_kit' && Object.keys(assetTemplateFamilyIds).length
            ? { assetTemplateFamilyIds }
            : {}),
        ...(assetTypeId === 'print_menu' && printMenuOptions && typeof printMenuOptions === 'object' && !Array.isArray(printMenuOptions)
            ? { printMenuOptions: printMenuOptions as PrintableAssetRenderInput['printMenuOptions'] }
            : {}),
    };
}

export function admitPrintableAssetRenderInput(value: unknown): PrintableAssetRenderInput {
    const normalized = normalizePrintableAssetRenderInput(value);
    if (!normalized) throw new Error('Invalid printable asset input');
    return normalized;
}
