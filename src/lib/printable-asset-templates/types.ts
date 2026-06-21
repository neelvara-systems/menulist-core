import type { MenuKitAssetKey } from '@lib/menu-kit/menuKitGenerator';
import type { MenuPdfOptions } from '@lib/export/menuPdfGenerator';

export type PrintableAssetTypeId =
    | 'print_menu'
    | 'table_tent'
    | 'single_table_card'
    | 'counter_sticker'
    | 'entrance_poster'
    | 'feedback_qr'
    | 'campaign_flyer'
    | 'gift_certificate'
    | 'business_card'
    | 'staff_id_card'
    | 'event_invitation'
    | 'postcard'
    | 'product_tag'
    | 'campaign_poster'
    | 'complete_menu_kit';

export type PrintableTemplateFamilyId =
    | 'classic-luxe'
    | 'executive-dark'
    | 'botanical-heritage'
    | 'modern-calm'
    | 'brand-banner'
    | 'soft-curve'
    | 'qr-first'
    | 'local-bold'
    | 'clean-utility';

export type PrintableTemplateTier = 'starter' | 'pro' | 'premium';
export type PrintableAssetOutputFormat = 'pdf' | 'png' | 'zip';

export type PrintableTemplateFamily = {
    accentLabel: string;
    bestFor: string;
    description: string;
    id: PrintableTemplateFamilyId;
    label: string;
    tier: PrintableTemplateTier;
    tone: 'light' | 'dark' | 'heritage' | 'minimal' | 'bold' | 'utility';
};

export type PrintableAssetType = {
    defaultTemplateId: PrintableTemplateFamilyId;
    description: string;
    id: PrintableAssetTypeId;
    menuKitAssetKey?: MenuKitAssetKey;
    outputFormat: PrintableAssetOutputFormat;
    placement:
        | 'tables'
        | 'counter'
        | 'entrance'
        | 'feedback'
        | 'full-menu'
        | 'promotion'
        | 'gift'
        | 'identity'
        | 'event'
        | 'postcard'
        | 'retail'
        | 'bundle';
    requiresFeedback?: boolean;
    requiresMenuItems?: boolean;
    size: string;
    supportedOutputFormats?: PrintableAssetOutputFormat[];
    title: string;
};

export type PrintableAssetRenderInput = {
    activePlanType?: string | null;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    businessCategory?: string;
    businessType?: string;
    contactAddress?: string | null;
    contactEmail?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactRole?: string | null;
    feedbackUrl?: string | null;
    lastPublishedAt?: Date;
    locale?: string;
    logoUrl?: string | null;
    menuUrl: string;
    obpBaseUrl?: string;
    outputFormat?: PrintableAssetOutputFormat;
    printMenuOptions?: MenuPdfOptions;
    projectId?: string | null;
    shortLink: string;
    socialHandle?: string | null;
    storeName: string;
    templateFamilyId: PrintableTemplateFamilyId;
};

export type PrintableAssetRenderResult = {
    blob: Blob;
    filename: string;
    label: string;
    mimeType: string;
    outputFormat: PrintableAssetOutputFormat;
};
