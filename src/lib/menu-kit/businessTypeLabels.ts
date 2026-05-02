/**
 * Business Type Labels for Menu Kit
 *
 * Maps business categories to appropriate terminology so that
 * print assets, social images, and copy use the right words
 * (e.g., "menu" for restaurants, "services" for salons).
 *
 * Uses getBusinessCategory() from shared businessTypes.ts.
 *
 * @see src/data/shared/businessTypes.ts
 */

import { getBusinessCategory } from '@data/shared/businessTypes';

export interface OfferingLabels {
    // ── Menu Kit (Print + Social assets) ──
    /** Uppercase singular: "MENU", "SERVICES", "CATALOG" */
    offeringUpper: string;
    /** Title case singular: "Menu", "Services", "Catalog" */
    offeringTitle: string;
    /** Lowercase singular: "menu", "services", "catalog" */
    offeringLower: string;
    /** "Scan to view our full menu" / "Scan to view our services" */
    scanToView: string;
    /** "SCAN TO VIEW MENU" / "SCAN TO VIEW SERVICES" */
    scanToViewUpper: string;
    /** "SCAN FOR MENU" / "SCAN FOR SERVICES" */
    scanForUpper: string;
    /** "MENU IS LIVE" / "SERVICES ARE LIVE" */
    isLiveUpper: string;
    /** "Updated Menu" / "Updated Services" */
    updatedTitle: string;
    /** "OFFICIAL MENU" / "OFFICIAL SERVICES" */
    officialUpper: string;
    /** "Menu & prices updated regularly" / "Services & prices updated regularly" */
    updatedRegularly: string;
    /** Staff script line */
    staffScript: string;
    /** Share message: "Here is our menu:" / "Here is our service list:" */
    shareMessagePrefix: string;
    /** GBP hint label: "menu" / "services" */
    gbpLabel: string;
    /** "menu" / "service list" / "product catalog" — for conversational copy */
    offeringPhrase: string;

    // ── Dashboard / Analytics labels ──
    /** "Menu Scans" / "Page Views" — dashboard metric title */
    scansLabel: string;
    /** "Item Taps" / "Item Taps" — universal */
    itemTapsLabel: string;
    /** "Number of times customers scanned your menu" / "...viewed your page" */
    scansTooltip: string;
    /** "Total Menu Views" / "Total Page Views" */
    totalViewsLabel: string;
    /** "Menu Views" / "Page Views" — chart/radio label */
    viewsLabel: string;
    /** "Top Menu Items" / "Top Items" */
    topItemsLabel: string;
    /** "Menu Performance" / "Performance" */
    performanceLabel: string;
    /** "Your Menu This Month" / "Your Page This Month" */
    thisMonthLabel: string;

    // ── Share flow labels ──
    /** "Share your menu" / "Share your services" */
    shareTitle: string;
    /** "Send this instead of menu photos or PDFs. Customers always see your latest menu." */
    shareSubtitle: string;
    /** "Share this link with your staff so everyone sends the same updated menu." */
    shareStaffHint: string;
    /** "your latest menu" / "your latest offerings" */
    yourLatest: string;

    // ── Editor / Processing labels ──
    /** "Welcome to Your Menu Editor!" / "Welcome to Your Editor!" */
    editorWelcome: string;
    /** "Review and edit your menu data here." / "Review and edit your data here." */
    editorWelcomeDesc: string;
    /** "Upload Your Menu" / "Upload Your Content" */
    uploadLabel: string;
    /** "Upload photos or PDFs of your menu." / "Upload photos or PDFs of your content." */
    uploadDesc: string;
    /** "AI automatically reads your menu" / "AI automatically reads your content" */
    aiExtractsDesc: string;
    /** Processing states - title and description */
    processingTitle: string;
    processingDesc: string;
    processingStepUploading: string;
    processingStepAI: string;
    processingStepExtracting: string;
    processingStepFinalizing: string;
    processingComplete: string;
    /** "Publish Your Menu" / "Publish Your Page" */
    publishLabel: string;
    /** "your digital menu" / "your digital page" */
    digitalLabel: string;
    /** "Rearrange Menu" / "Rearrange Items" */
    rearrangeLabel: string;
    /** "Menu Command Center" / "Command Center" */
    commandCenterLabel: string;
    /** "which languages your menu is available in" / "which languages your page is available in" */
    languageDesc: string;
    /** "descriptions for your menu items" / "descriptions for your items" */
    descriptionDesc: string;
    /** "photos for your menu items" / "photos for your items" */
    imagesDesc: string;
    /** "This Store is Linked to Your Main Menu" / "This Store is Linked to Your Main Page" */
    outletLinkedLabel: string;

    // ── Billing / Subscription labels ──
    /** "Subscribe to get started with your menu." / "Subscribe to get started." */
    subscribeDesc: string;
    /** "...translations for your menu." / "...translations for your content." */
    creditsDesc: string;

    // ── Items terminology ──
    /** "items" / "services" / "products" — lowercase plural for generic item references */
    itemsPlural: string;
    /** "item" / "service" / "product" — lowercase singular */
    itemSingular: string;
}

const CATEGORY_LABELS: Record<string, OfferingLabels> = {
    food: {
        offeringUpper: 'MENU', offeringTitle: 'Menu', offeringLower: 'menu',
        scanToView: 'Scan to view our full menu', scanToViewUpper: 'SCAN TO VIEW MENU', scanForUpper: 'SCAN FOR MENU',
        isLiveUpper: 'MENU IS LIVE  ✅', updatedTitle: 'Updated Menu  ✅', officialUpper: 'OFFICIAL MENU',
        updatedRegularly: 'Menu & prices updated regularly',
        staffScript: 'Menu? Please scan the QR on the table or at the counter.',
        shareMessagePrefix: 'Here is our menu:', gbpLabel: 'menu', offeringPhrase: 'menu',
        // Dashboard
        scansLabel: 'Menu Scans', itemTapsLabel: 'Item Taps',
        scansTooltip: 'Number of times customers scanned your menu',
        totalViewsLabel: 'Total Menu Views', viewsLabel: 'Menu Views',
        topItemsLabel: 'Top Menu Items', performanceLabel: 'Menu Performance',
        thisMonthLabel: 'Your Menu This Month',
        // Share
        shareTitle: 'Share your menu',
        shareSubtitle: 'Send this instead of menu photos or PDFs. Customers always see your latest menu.',
        shareStaffHint: 'Share this link with your staff so everyone sends the same updated menu.',
        yourLatest: 'your latest menu',
        // Editor
        editorWelcome: 'Welcome to Your Menu Editor!',
        editorWelcomeDesc: 'Review and edit your menu data here. Your items have been extracted automatically.',
        uploadLabel: 'Upload Your Menu', uploadDesc: 'Upload photos or PDFs of your menu. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your menu and extract item names, prices, and descriptions.',
        // Processing states
        processingTitle: 'Creating Your Digital Menu',
        processingDesc: 'We\'re reading your menu images and extracting all items, prices, and descriptions. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your menu images...',
        processingStepAI: 'Analyzing your menu layout...',
        processingStepExtracting: 'Extracting menu items and prices...',
        processingStepFinalizing: 'Finalizing your digital menu...',
        processingComplete: 'Your menu is ready!',
        publishLabel: 'Publish Your Menu', digitalLabel: 'your digital menu',
        rearrangeLabel: 'Rearrange Menu', commandCenterLabel: 'Menu Command Center',
        languageDesc: 'Choose which languages your menu is available in',
        descriptionDesc: 'Generate descriptions for your menu items automatically',
        imagesDesc: 'Upload photos for your menu items',
        outletLinkedLabel: 'This Store is Linked to Your Main Menu',
        // Billing
        subscribeDesc: 'Subscribe to get started with your menu.',
        creditsDesc: 'More generated images, descriptions, and translations for your menu.',
        // Items
        itemsPlural: 'items', itemSingular: 'item',
    },
    service: {
        offeringUpper: 'SERVICES', offeringTitle: 'Services', offeringLower: 'services',
        scanToView: 'Scan to view our services', scanToViewUpper: 'SCAN TO VIEW SERVICES', scanForUpper: 'SCAN FOR SERVICES',
        isLiveUpper: 'SERVICES ARE LIVE  ✅', updatedTitle: 'Updated Services  ✅', officialUpper: 'OFFICIAL SERVICES',
        updatedRegularly: 'Services & prices updated regularly',
        staffScript: 'Services? Please scan the QR at the reception.',
        shareMessagePrefix: 'Here is our service list:', gbpLabel: 'services', offeringPhrase: 'service list',
        scansLabel: 'Page Views', itemTapsLabel: 'Service Taps',
        scansTooltip: 'Number of times customers viewed your page',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Services', performanceLabel: 'Page Performance',
        thisMonthLabel: 'Your Page This Month',
        shareTitle: 'Share your services',
        shareSubtitle: 'Send this link to customers. They always see your latest services and prices.',
        shareStaffHint: 'Share this link with your staff so everyone sends the same updated service list.',
        yourLatest: 'your latest services',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your services here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your service list. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract service names, prices, and descriptions.',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital page',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your page is available in',
        descriptionDesc: 'Generate descriptions for your services automatically',
        imagesDesc: 'Upload photos for your services',
        outletLinkedLabel: 'This Store is Linked to Your Main Page',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your content.',
        // Processing states
        processingTitle: 'Creating Your Service Page',
        processingDesc: 'We\'re reading your service documents and extracting all services and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting services and prices...',
        processingStepFinalizing: 'Finalizing your service page...',
        processingComplete: 'Your service page is ready!',
        itemsPlural: 'services', itemSingular: 'service',
    },
    retail: {
        offeringUpper: 'CATALOG', offeringTitle: 'Catalog', offeringLower: 'catalog',
        scanToView: 'Scan to view our catalog', scanToViewUpper: 'SCAN TO VIEW CATALOG', scanForUpper: 'SCAN FOR CATALOG',
        isLiveUpper: 'CATALOG IS LIVE  ✅', updatedTitle: 'Updated Catalog  ✅', officialUpper: 'OFFICIAL CATALOG',
        updatedRegularly: 'Products & prices updated regularly',
        staffScript: 'Products? Please scan the QR to browse our catalog.',
        shareMessagePrefix: 'Here is our product catalog:', gbpLabel: 'catalog', offeringPhrase: 'product catalog',
        scansLabel: 'Page Views', itemTapsLabel: 'Product Taps',
        scansTooltip: 'Number of times customers viewed your catalog',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Products', performanceLabel: 'Catalog Performance',
        thisMonthLabel: 'Your Catalog This Month',
        shareTitle: 'Share your catalog',
        shareSubtitle: 'Send this link to customers. They always see your latest products and prices.',
        shareStaffHint: 'Share this link with your staff so everyone sends the same updated catalog.',
        yourLatest: 'your latest catalog',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your products here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your catalog. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract product names, prices, and descriptions.',
        // Processing states
        processingTitle: 'Creating Your Product Catalog',
        processingDesc: 'We\'re reading your product documents and extracting all products and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting products and prices...',
        processingStepFinalizing: 'Finalizing your product catalog...',
        processingComplete: 'Your catalog is ready!',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital catalog',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your catalog is available in',
        descriptionDesc: 'Generate descriptions for your products automatically',
        imagesDesc: 'Upload photos for your products',
        outletLinkedLabel: 'This Store is Linked to Your Main Catalog',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your catalog.',
        itemsPlural: 'products', itemSingular: 'product',
    },
    health: {
        offeringUpper: 'SERVICES', offeringTitle: 'Services', offeringLower: 'services',
        scanToView: 'Scan to view our services', scanToViewUpper: 'SCAN TO VIEW SERVICES', scanForUpper: 'SCAN FOR SERVICES',
        isLiveUpper: 'SERVICES ARE LIVE  ✅', updatedTitle: 'Updated Services  ✅', officialUpper: 'OFFICIAL SERVICES',
        updatedRegularly: 'Services & pricing updated regularly',
        staffScript: 'Services? Please scan the QR at the front desk.',
        shareMessagePrefix: 'Here are our services:', gbpLabel: 'services', offeringPhrase: 'service list',
        scansLabel: 'Page Views', itemTapsLabel: 'Service Taps',
        scansTooltip: 'Number of times customers viewed your page',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Services', performanceLabel: 'Page Performance',
        thisMonthLabel: 'Your Page This Month',
        shareTitle: 'Share your services',
        shareSubtitle: 'Send this link to customers. They always see your latest services and pricing.',
        shareStaffHint: 'Share this link with your staff so everyone sends the same updated service list.',
        yourLatest: 'your latest services',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your services here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your service list. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract service names, prices, and descriptions.',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital page',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your page is available in',
        descriptionDesc: 'Generate descriptions for your services automatically',
        imagesDesc: 'Upload photos for your services',
        outletLinkedLabel: 'This Store is Linked to Your Main Page',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your content.',
        // Processing states
        processingTitle: 'Creating Your Service Page',
        processingDesc: 'We\'re reading your documents and extracting all services and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting services and prices...',
        processingStepFinalizing: 'Finalizing your service page...',
        processingComplete: 'Your service page is ready!',
        itemsPlural: 'services', itemSingular: 'service',
    },
    professional: {
        offeringUpper: 'SERVICES', offeringTitle: 'Services', offeringLower: 'services',
        scanToView: 'Scan to view our services', scanToViewUpper: 'SCAN TO VIEW SERVICES', scanForUpper: 'SCAN FOR SERVICES',
        isLiveUpper: 'SERVICES ARE LIVE  ✅', updatedTitle: 'Updated Services  ✅', officialUpper: 'OFFICIAL SERVICES',
        updatedRegularly: 'Services updated regularly',
        staffScript: 'Services? Please scan the QR for details.',
        shareMessagePrefix: 'Here are our services:', gbpLabel: 'services', offeringPhrase: 'service list',
        scansLabel: 'Page Views', itemTapsLabel: 'Service Taps',
        scansTooltip: 'Number of times customers viewed your page',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Services', performanceLabel: 'Page Performance',
        thisMonthLabel: 'Your Page This Month',
        shareTitle: 'Share your services',
        shareSubtitle: 'Send this link to customers. They always see your latest services.',
        shareStaffHint: 'Share this link with your team so everyone sends the same updated service list.',
        yourLatest: 'your latest services',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your services here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your services. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract service names, prices, and descriptions.',
        // Processing states
        processingTitle: 'Creating Your Service Page',
        processingDesc: 'We\'re reading your documents and extracting all services and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting services and prices...',
        processingStepFinalizing: 'Finalizing your service page...',
        processingComplete: 'Your service page is ready!',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital page',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your page is available in',
        descriptionDesc: 'Generate descriptions for your services automatically',
        imagesDesc: 'Upload photos for your services',
        outletLinkedLabel: 'This Store is Linked to Your Main Page',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your content.',
        itemsPlural: 'services', itemSingular: 'service',
    },
    creative: {
        offeringUpper: 'SERVICES', offeringTitle: 'Services', offeringLower: 'services',
        scanToView: 'Scan to view our offerings', scanToViewUpper: 'SCAN TO VIEW OFFERINGS', scanForUpper: 'SCAN FOR OFFERINGS',
        isLiveUpper: 'OFFERINGS ARE LIVE  ✅', updatedTitle: 'Updated Offerings  ✅', officialUpper: 'OFFICIAL OFFERINGS',
        updatedRegularly: 'Offerings & pricing updated regularly',
        staffScript: 'Offerings? Please scan the QR for details.',
        shareMessagePrefix: 'Here are our offerings:', gbpLabel: 'offerings', offeringPhrase: 'offerings',
        scansLabel: 'Page Views', itemTapsLabel: 'Item Taps',
        scansTooltip: 'Number of times customers viewed your page',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Offerings', performanceLabel: 'Page Performance',
        thisMonthLabel: 'Your Page This Month',
        // Processing states
        processingTitle: 'Creating Your Service Page',
        processingDesc: 'We\'re reading your documents and extracting all offerings and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting offerings and prices...',
        processingStepFinalizing: 'Finalizing your service page...',
        processingComplete: 'Your service page is ready!',
        shareTitle: 'Share your offerings',
        shareSubtitle: 'Send this link to customers. They always see your latest offerings and pricing.',
        shareStaffHint: 'Share this link with your team so everyone sends the same updated page.',
        yourLatest: 'your latest offerings',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your offerings here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your offerings. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract names, prices, and descriptions.',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital page',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your page is available in',
        descriptionDesc: 'Generate descriptions for your offerings automatically',
        imagesDesc: 'Upload photos for your offerings',
        outletLinkedLabel: 'This Store is Linked to Your Main Page',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your content.',
        itemsPlural: 'offerings', itemSingular: 'offering',
    },
    specialty: {
        offeringUpper: 'SERVICES', offeringTitle: 'Services', offeringLower: 'services',
        scanToView: 'Scan to view our services', scanToViewUpper: 'SCAN TO VIEW SERVICES', scanForUpper: 'SCAN FOR SERVICES',
        isLiveUpper: 'SERVICES ARE LIVE  ✅', updatedTitle: 'Updated Services  ✅', officialUpper: 'OFFICIAL SERVICES',
        // Processing states
        processingTitle: 'Creating Your Service Page',
        processingDesc: 'We\'re reading your documents and extracting all services and prices. This usually takes 1-2 minutes.',
        processingStepUploading: 'Uploading your documents...',
        processingStepAI: 'Analyzing your document layout...',
        processingStepExtracting: 'Extracting services and prices...',
        processingStepFinalizing: 'Finalizing your service page...',
        processingComplete: 'Your service page is ready!',
        updatedRegularly: 'Services & pricing updated regularly',
        staffScript: 'Services? Please scan the QR for details.',
        shareMessagePrefix: 'Here are our services:', gbpLabel: 'services', offeringPhrase: 'service list',
        scansLabel: 'Page Views', itemTapsLabel: 'Item Taps',
        scansTooltip: 'Number of times customers viewed your page',
        totalViewsLabel: 'Total Page Views', viewsLabel: 'Page Views',
        topItemsLabel: 'Top Services', performanceLabel: 'Page Performance',
        thisMonthLabel: 'Your Page This Month',
        shareTitle: 'Share your services',
        shareSubtitle: 'Send this link to customers. They always see your latest services and pricing.',
        shareStaffHint: 'Share this link with your team so everyone sends the same updated page.',
        yourLatest: 'your latest services',
        editorWelcome: 'Welcome to Your Editor!',
        editorWelcomeDesc: 'Review and edit your services here. Your content has been extracted automatically.',
        uploadLabel: 'Upload Your Content', uploadDesc: 'Upload photos or PDFs of your services. You can upload multiple files at once.',
        aiExtractsDesc: 'We automatically read your content and extract service names, prices, and descriptions.',
        publishLabel: 'Publish Your Page', digitalLabel: 'your digital page',
        rearrangeLabel: 'Rearrange Items', commandCenterLabel: 'Command Center',
        languageDesc: 'Choose which languages your page is available in',
        descriptionDesc: 'Generate descriptions for your services automatically',
        imagesDesc: 'Upload photos for your services',
        outletLinkedLabel: 'This Store is Linked to Your Main Page',
        subscribeDesc: 'Subscribe to get started.',
        creditsDesc: 'More generated images, descriptions, and translations for your content.',
        itemsPlural: 'services', itemSingular: 'service',
    },
};

/** Default labels — used for food/restaurant (most common) and unknown types */
const DEFAULT_LABELS = CATEGORY_LABELS.food;

/**
 * Get businessType-aware labels for Menu Kit assets and copy.
 * @param businessType - The store's businessType value (e.g., "Restaurant", "Salon")
 * @returns OfferingLabels with appropriate terminology
 */
export function getOfferingLabels(businessType?: string): OfferingLabels {
    if (!businessType) return DEFAULT_LABELS;
    const category = getBusinessCategory(businessType);
    if (!category) return DEFAULT_LABELS;
    return CATEGORY_LABELS[category] || DEFAULT_LABELS;
}
