import type { MenuKitAssetKey } from '@lib/menu-kit/types';
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
    | 'craft-kitchen'
    | 'ember-house'
    | 'coastal-table'
    | 'sunday-table'
    | 'counter-rush'
    | 'roastery-ledger'
    | 'patisserie-conservatory'
    | 'gelateria-riviera'
    | 'salon-atelier'
    | 'petal-studio'
    | 'pearl-veil'
    | 'terracotta-glow'
    | 'glasshouse-beauty'
    | 'ritual-sanctuary'
    | 'eucalyptus-retreat'
    | 'mineral-spring'
    | 'lotus-stillness'
    | 'sunlit-ritual'
    | 'performance-circuit'
    | 'ink-vine'
    | 'midnight-gold'
    | 'sunset-atelier'
    | 'rosewater-editorial'
    | 'mineral-sanctuary'
    | 'noir-studio'
    | 'bombay-chronicle'
    | 'indian-atelier'
    | 'art-deco-garden'
    | 'japanese-night-luxe'
    | 'tea-salon-heritage'
    | 'lankan-block-print'
    | 'gallery-ledger'
    | 'vital-current'
    | 'workshop-atlas'
    | 'neighbourhood-standard'
    | 'field-notes'
    | 'boutique-window'
    | 'market-label'
    | 'civic-letterpress'
    | 'modern-practice'
    | 'studio-contact-sheet'
    | 'maker-ledger'
    | 'clinical-calm'
    | 'mindful-motion'
    | 'hospitality-house'
    | 'future-workshop'
    | 'modern-calm'
    | 'brand-banner'
    | 'soft-curve'
    | 'qr-first'
    | 'local-bold'
    | 'clean-utility';

export type PrintableTemplateTier = 'starter' | 'pro' | 'premium';
export type PrintableAssetOutputFormat = 'pdf' | 'png' | 'zip';

export type PrintableCampaignContent = {
    details?: string;
    headline: string;
    offer?: string;
    terms?: string;
    validUntil?: string;
};

/** @deprecated Use PrintableCampaignContent for both Flyer and Campaign Poster. */
export type PrintableFlyerCampaignContent = PrintableCampaignContent;

export type PrintablePostcardContent = {
    headline: string;
    message?: string;
};

export type PrintableGiftCertificateContent = {
    certificateNumber?: string;
    message?: string;
    recipient?: string;
    sender?: string;
    validUntil?: string;
    value?: string;
};

export type PrintableInvitationContent = {
    date?: string;
    location?: string;
    occasion?: string;
    time?: string;
};

export type PrintableProductTagContent = {
    detail?: string;
    name: string;
    options?: readonly {
        name: string;
        priceLabel?: string;
    }[];
    price?: string;
};

export type PrintableTemplateVisibility =
    | { scope: 'common' }
    | { businessCategories: readonly string[]; scope: 'business-category' }
    | { businessTypes: readonly string[]; scope: 'business-type' };

export type PrintableTemplateFamily = {
    accentLabel: string;
    bestFor: string;
    description: string;
    id: PrintableTemplateFamilyId;
    label: string;
    tier: PrintableTemplateTier;
    tone: 'light' | 'dark' | 'heritage' | 'minimal' | 'bold' | 'utility';
    visibility: PrintableTemplateVisibility;
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
    assetTemplateFamilyIds?: Partial<Record<MenuKitAssetKey, PrintableTemplateFamilyId>>;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    businessCategory?: string;
    businessType?: string;
    contactAddress?: string | null;
    contactEmail?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactRole?: string | null;
    campaignContent?: PrintableCampaignContent;
    feedbackUrl?: string | null;
    flyerCampaign?: PrintableFlyerCampaignContent;
    giftCertificateContent?: PrintableGiftCertificateContent;
    invitationContent?: PrintableInvitationContent;
    lastPublishedAt?: Date;
    locale?: string;
    logoUrl?: string | null;
    menuUrl: string;
    obpBaseUrl?: string;
    outputFormat?: PrintableAssetOutputFormat;
    printMenuOptions?: MenuPdfOptions;
    projectId?: string | null;
    postcardContent?: PrintablePostcardContent;
    productTagContent?: PrintableProductTagContent;
    shortLink: string;
    socialHandle?: string | null;
    staffName?: string | null;
    staffRole?: string | null;
    storeName: string;
    tagline?: string | null;
    templateFamilyId: PrintableTemplateFamilyId;
};

export type PrintableAssetRenderResult = {
    blob: Blob;
    filename: string;
    label: string;
    mimeType: string;
    outputFormat: PrintableAssetOutputFormat;
};
