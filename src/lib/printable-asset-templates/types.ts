import type { MenuKitAssetKey } from '@lib/menu-kit/menuKitGenerator';
import type { MenuPdfOptions } from '@lib/export/menuPdfGenerator';

export type PrintableAssetTypeId =
    | 'print_menu'
    | 'table_tent'
    | 'single_table_card'
    | 'counter_sticker'
    | 'entrance_poster'
    | 'feedback_qr'
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
    outputFormat: 'pdf' | 'png' | 'zip';
    placement: 'tables' | 'counter' | 'entrance' | 'feedback' | 'full-menu' | 'bundle';
    requiresFeedback?: boolean;
    requiresMenuItems?: boolean;
    size: string;
    title: string;
};

export type PrintableAssetRenderInput = {
    activePlanType?: string | null;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    businessCategory?: string;
    businessType?: string;
    feedbackUrl?: string | null;
    lastPublishedAt?: Date;
    locale?: string;
    logoUrl?: string | null;
    menuUrl: string;
    obpBaseUrl?: string;
    printMenuOptions?: MenuPdfOptions;
    projectId?: string | null;
    shortLink: string;
    storeName: string;
    templateFamilyId: PrintableTemplateFamilyId;
};

export type PrintableAssetRenderResult = {
    blob: Blob;
    filename: string;
    label: string;
    mimeType: string;
};
