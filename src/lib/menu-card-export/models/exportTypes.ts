export type MenuCardExportStatus = 'ready' | 'failed';

export type MenuCardExportPreset =
    | 'home_print'
    | 'whatsapp'
    | 'print_shop_packet'
    | 'table_menu'
    | 'takeaway_insert'
    | 'staff_reference'
    | 'multi_location_batch'
    | 'page_images'
    | 'qr_insert';

export type MenuCardDensity = 'comfortable' | 'balanced' | 'compact';
export type MenuCardPaperSize = 'a4' | 'a5' | 'letter';
export type MenuCardOrientation = 'portrait' | 'landscape';

export type MenuCardExportSettings = {
    preset: MenuCardExportPreset;
    paperSize: MenuCardPaperSize;
    orientation: MenuCardOrientation;
    density: MenuCardDensity;
    styleId: string;
    printableThemeId?: string;
    includeCoverPage?: boolean;
    includeLogo: boolean;
    includeDescriptions: boolean;
    includePhotos: boolean;
    includeQr: boolean;
    includeContactBlock: boolean;
    includeUpdatedDate: boolean;
};

export type MenuCardSafeOverrides = {
    startCategoryOnNewPage?: string[];
    keepCategoryTogether?: string[];
    compactCategories?: string[];
    hideDescriptionsForCategories?: string[];
};

export type MenuCardGeneratedArtifact = {
    blob: Blob;
    filename: string;
    mimeType: string;
    pageCount: number;
    sourceHash: string;
};

export type MenuCardLocalHistoryRecord = {
    id: string;
    projectId: string;
    storeName: string;
    projectName: string;
    preset: MenuCardExportPreset;
    styleId: string;
    pageCount: number;
    sourceHash: string;
    fileName: string;
    generatedAt: string;
};
