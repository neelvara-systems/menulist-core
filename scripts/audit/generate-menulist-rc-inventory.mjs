import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";

const ROOT = process.cwd();
const OUTPUT = path.join(
    ROOT,
    "__docs__/audits/menulist-rc-certification-inventory.csv",
);
const RUNTIME_EVIDENCE_PATH = path.join(
    ROOT,
    "__docs__/audits/menulist-rc-runtime-evidence.json",
);
const runtimeEvidence = fs.existsSync(RUNTIME_EVIDENCE_PATH)
    ? JSON.parse(fs.readFileSync(RUNTIME_EVIDENCE_PATH, "utf8"))
    : {};
const privateRouteAccessEvidence = runtimeEvidence.privateRouteAccess ?? null;
const privateRouteAccessRoutes = new Set(privateRouteAccessEvidence?.routes ?? []);
const apiAnonymousBoundaryEvidence = runtimeEvidence.apiAnonymousBoundary ?? null;
const authenticatedOwnerNavigationEvidence = runtimeEvidence.authenticatedOwnerNavigation ?? null;
const authenticatedOwnerNavigationRoutes = new Set(authenticatedOwnerNavigationEvidence?.routes ?? []);
const authenticatedOwnerControlEvidence = runtimeEvidence.authenticatedOwnerControlInteractions ?? null;
const localPlatformControlEvidence = runtimeEvidence.localPlatformControlInteractions ?? null;
const publicCustomerControlEvidence = runtimeEvidence.publicCustomerControlInteractions ?? null;
const creativeEditorControlEvidence = runtimeEvidence.creativeEditorControlInteractions ?? null;
const websiteHeaderControlEvidence = runtimeEvidence.websiteHeaderControlInteractions ?? null;
const unauthorizedRecoveryControlEvidence = runtimeEvidence.unauthorizedRecoveryControlInteractions ?? null;
const notFoundRecoveryControlEvidence = runtimeEvidence.notFoundRecoveryControlInteractions ?? null;
const msgPreviewRecoveryControlEvidence = runtimeEvidence.msgPreviewRecoveryControlInteractions ?? null;
const authEntryControlEvidence = runtimeEvidence.authEntryControlInteractions ?? null;
const pricingControlEvidence = runtimeEvidence.pricingControlInteractions ?? null;
const contactFormControlEvidence = runtimeEvidence.contactFormControlInteractions ?? null;
const createMenuEntryControlEvidence = runtimeEvidence.createMenuEntryControlInteractions ?? null;
const hoursCheckControlEvidence = runtimeEvidence.hoursCheckControlInteractions ?? null;
const publicTruthCheckControlEvidence = runtimeEvidence.publicTruthCheckControlInteractions ?? null;
const photoGapCheckControlEvidence = runtimeEvidence.photoGapCheckControlInteractions ?? null;
const qrLinkHealthCheckControlEvidence = runtimeEvidence.qrLinkHealthCheckControlInteractions ?? null;
const googleProfileBasicsControlEvidence = runtimeEvidence.googleProfileBasicsControlInteractions ?? null;
const menuReadabilityControlEvidence = runtimeEvidence.menuReadabilityControlInteractions ?? null;
const socialBioLinkControlEvidence = runtimeEvidence.socialBioLinkControlInteractions ?? null;
const bookingInquiryControlEvidence = runtimeEvidence.bookingInquiryControlInteractions ?? null;
const customerLinkPreviewControlEvidence = runtimeEvidence.customerLinkPreviewControlInteractions ?? null;
const priceAvailabilityControlEvidence = runtimeEvidence.priceAvailabilityControlInteractions ?? null;
const whatsappActionControlEvidence = runtimeEvidence.whatsappActionControlInteractions ?? null;
const menuPdfCleanupControlEvidence = runtimeEvidence.menuPdfCleanupControlInteractions ?? null;
const customerQuestionCoverageControlEvidence = runtimeEvidence.customerQuestionCoverageControlInteractions ?? null;
const businessFactsCopyPackControlEvidence = runtimeEvidence.businessFactsCopyPackControlInteractions ?? null;
const customerFaqReplyPackControlEvidence = runtimeEvidence.customerFaqReplyPackControlInteractions ?? null;
const whatsappReplyPackControlEvidence = runtimeEvidence.whatsappReplyPackControlInteractions ?? null;
const printShareToolControlEvidence = runtimeEvidence.printShareToolControlInteractions ?? null;
const toolReportControlEvidence = runtimeEvidence.toolReportControlInteractions ?? null;
const publicToolFollowupControlEvidence = runtimeEvidence.publicToolFollowupControlInteractions ?? null;
const publicToolReportActionControlEvidence = runtimeEvidence.publicToolReportActionControlInteractions ?? null;
const customerLinkSocialBioCompletionControlEvidence = runtimeEvidence.customerLinkSocialBioCompletionControlInteractions ?? null;
const websitePreferenceControlEvidence = runtimeEvidence.websitePreferenceControlInteractions ?? null;
const localMobileOwnerControlEvidence = runtimeEvidence.localMobileOwnerControlInteractions ?? null;
const CREATIVE_EDITOR_RUNTIME_SOURCE_FILES = [
    "src/modules/creative-editor/CreativeEditor.tsx",
    "src/app/(internal)/creative-editor-smoke/CreativeEditorSmokeClient.tsx",
];
const currentCreativeEditorSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of CREATIVE_EDITOR_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const creativeEditorControlEvidenceIsCurrent = (
    creativeEditorControlEvidence?.result === "PASS"
    && creativeEditorControlEvidence?.sourceManifestSha256
        === currentCreativeEditorSourceManifestSha256
);
const WEBSITE_HEADER_RUNTIME_SOURCE_FILES = [
    "src/components/website/Header.tsx",
    "src/components/website/WebsiteAnalyticsConsent.tsx",
    "src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx",
];
const currentWebsiteHeaderSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_HEADER_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteHeaderControlEvidenceIsCurrent = (
    websiteHeaderControlEvidence?.result === "PASS"
    && websiteHeaderControlEvidence?.sourceManifestSha256
        === currentWebsiteHeaderSourceManifestSha256
);
const UNAUTHORIZED_RECOVERY_SOURCE_FILE = "src/app/(global-pages)/unauthorized/page.tsx";
const currentUnauthorizedRecoverySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    hash.update(UNAUTHORIZED_RECOVERY_SOURCE_FILE);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, UNAUTHORIZED_RECOVERY_SOURCE_FILE)));
    hash.update("\0");
    return hash.digest("hex");
})();
const unauthorizedRecoveryControlEvidenceIsCurrent = (
    unauthorizedRecoveryControlEvidence?.result === "PASS"
    && unauthorizedRecoveryControlEvidence?.sourceManifestSha256
        === currentUnauthorizedRecoverySourceManifestSha256
);
const NOT_FOUND_RECOVERY_SOURCE_FILE = "src/app/(global-pages)/404/page.tsx";
const currentNotFoundRecoverySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    hash.update(NOT_FOUND_RECOVERY_SOURCE_FILE);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, NOT_FOUND_RECOVERY_SOURCE_FILE)));
    hash.update("\0");
    return hash.digest("hex");
})();
const notFoundRecoveryControlEvidenceIsCurrent = (
    notFoundRecoveryControlEvidence?.result === "PASS"
    && notFoundRecoveryControlEvidence?.sourceManifestSha256
        === currentNotFoundRecoverySourceManifestSha256
);
const MSG_PREVIEW_RECOVERY_SOURCE_FILE = "src/app/(global-pages)/msg-preview/[sessionId]/page.tsx";
const currentMsgPreviewRecoverySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    hash.update(MSG_PREVIEW_RECOVERY_SOURCE_FILE);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, MSG_PREVIEW_RECOVERY_SOURCE_FILE)));
    hash.update("\0");
    return hash.digest("hex");
})();
const msgPreviewRecoveryControlEvidenceIsCurrent = (
    msgPreviewRecoveryControlEvidence?.result === "PASS"
    && msgPreviewRecoveryControlEvidence?.sourceManifestSha256
        === currentMsgPreviewRecoverySourceManifestSha256
);
const AUTH_ENTRY_RUNTIME_SOURCE_FILES = [
    "src/components/templates/loginPage/index.tsx",
    "src/components/templates/forgotPassword/index.tsx",
];
const currentAuthEntrySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of AUTH_ENTRY_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const authEntryControlEvidenceIsCurrent = (
    authEntryControlEvidence?.result === "PASS"
    && authEntryControlEvidence?.sourceManifestSha256
        === currentAuthEntrySourceManifestSha256
);
const PRICING_RUNTIME_SOURCE_FILES = [
    "src/components/website/pricing-pages/index.tsx",
    "src/components/website/pricing-pages/CurrencySwitcher.tsx",
    "src/components/website/pricing-pages/OnboardingModal.tsx",
    "src/components/website/pricing-pages/PlanCard.tsx",
    "src/components/website/pricing-pages/PricingFaq.tsx",
    "src/components/website/pricing-pages/SubscriptionManagement.tsx",
];
const currentPricingSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of PRICING_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const pricingControlEvidenceIsCurrent = (
    pricingControlEvidence?.result === "PASS"
    && pricingControlEvidence?.sourceManifestSha256
        === currentPricingSourceManifestSha256
);
const currentSingleSourceManifestSha256 = (relativePath) => {
    const hash = crypto.createHash("sha256");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
    hash.update("\0");
    return hash.digest("hex");
};
const CONTACT_FORM_SOURCE_FILE = "src/components/website/contact/ContactPage.tsx";
const contactFormControlEvidenceIsCurrent = (
    contactFormControlEvidence?.result === "PASS"
    && contactFormControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(CONTACT_FORM_SOURCE_FILE)
);
const CREATE_MENU_ENTRY_SOURCE_FILE = "src/app/(website)/create-menu/CreateMenuClient.tsx";
const createMenuEntryControlEvidenceIsCurrent = (
    createMenuEntryControlEvidence?.result === "PASS"
    && createMenuEntryControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(CREATE_MENU_ENTRY_SOURCE_FILE)
);
const HOURS_CHECK_SOURCE_FILE = "src/components/website/hoursCheck/HoursCheckPage.tsx";
const hoursCheckControlEvidenceIsCurrent = (
    hoursCheckControlEvidence?.result === "PASS"
    && hoursCheckControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(HOURS_CHECK_SOURCE_FILE)
);
const PUBLIC_TRUTH_CHECK_SOURCE_FILE = "src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx";
const publicTruthCheckControlEvidenceIsCurrent = (
    publicTruthCheckControlEvidence?.result === "PASS"
    && publicTruthCheckControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PUBLIC_TRUTH_CHECK_SOURCE_FILE)
);
const PHOTO_GAP_CHECK_SOURCE_FILE = "src/components/website/photoGapCheck/PhotoGapCheckPage.tsx";
const photoGapCheckControlEvidenceIsCurrent = (
    photoGapCheckControlEvidence?.result === "PASS"
    && photoGapCheckControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PHOTO_GAP_CHECK_SOURCE_FILE)
);
const QR_LINK_HEALTH_CHECK_SOURCE_FILE = "src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx";
const qrLinkHealthCheckControlEvidenceIsCurrent = (
    qrLinkHealthCheckControlEvidence?.result === "PASS"
    && qrLinkHealthCheckControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(QR_LINK_HEALTH_CHECK_SOURCE_FILE)
);
const GOOGLE_PROFILE_BASICS_SOURCE_FILE = "src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx";
const googleProfileBasicsControlEvidenceIsCurrent = (
    googleProfileBasicsControlEvidence?.result === "PASS"
    && googleProfileBasicsControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(GOOGLE_PROFILE_BASICS_SOURCE_FILE)
);
const MENU_READABILITY_SOURCE_FILE = "src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx";
const menuReadabilityControlEvidenceIsCurrent = (
    menuReadabilityControlEvidence?.result === "PASS"
    && menuReadabilityControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(MENU_READABILITY_SOURCE_FILE)
);
const SOCIAL_BIO_LINK_SOURCE_FILE = "src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx";
const socialBioLinkControlEvidenceIsCurrent = (
    socialBioLinkControlEvidence?.result === "PASS"
    && socialBioLinkControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(SOCIAL_BIO_LINK_SOURCE_FILE)
);
const BOOKING_INQUIRY_SOURCE_FILE = "src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx";
const bookingInquiryControlEvidenceIsCurrent = (
    bookingInquiryControlEvidence?.result === "PASS"
    && bookingInquiryControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(BOOKING_INQUIRY_SOURCE_FILE)
);
const CUSTOMER_LINK_PREVIEW_SOURCE_FILE = "src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx";
const customerLinkPreviewControlEvidenceIsCurrent = (
    customerLinkPreviewControlEvidence?.result === "PASS"
    && customerLinkPreviewControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(CUSTOMER_LINK_PREVIEW_SOURCE_FILE)
);
const PRICE_AVAILABILITY_SOURCE_FILE = "src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx";
const priceAvailabilityControlEvidenceIsCurrent = (
    priceAvailabilityControlEvidence?.result === "PASS"
    && priceAvailabilityControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PRICE_AVAILABILITY_SOURCE_FILE)
);
const WHATSAPP_ACTION_SOURCE_FILE = "src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx";
const whatsappActionControlEvidenceIsCurrent = (
    whatsappActionControlEvidence?.result === "PASS"
    && whatsappActionControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(WHATSAPP_ACTION_SOURCE_FILE)
);
const MENU_PDF_CLEANUP_SOURCE_FILE = "src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx";
const menuPdfCleanupControlEvidenceIsCurrent = (
    menuPdfCleanupControlEvidence?.result === "PASS"
    && menuPdfCleanupControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(MENU_PDF_CLEANUP_SOURCE_FILE)
);
const CUSTOMER_QUESTION_COVERAGE_SOURCE_FILE = "src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx";
const customerQuestionCoverageControlEvidenceIsCurrent = (
    customerQuestionCoverageControlEvidence?.result === "PASS"
    && customerQuestionCoverageControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(CUSTOMER_QUESTION_COVERAGE_SOURCE_FILE)
);
const BUSINESS_FACTS_COPY_PACK_SOURCE_FILE = "src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx";
const businessFactsCopyPackControlEvidenceIsCurrent = (
    businessFactsCopyPackControlEvidence?.result === "PASS"
    && businessFactsCopyPackControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(BUSINESS_FACTS_COPY_PACK_SOURCE_FILE)
);
const CUSTOMER_FAQ_REPLY_PACK_SOURCE_FILE = "src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx";
const customerFaqReplyPackControlEvidenceIsCurrent = (
    customerFaqReplyPackControlEvidence?.result === "PASS"
    && customerFaqReplyPackControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(CUSTOMER_FAQ_REPLY_PACK_SOURCE_FILE)
);
const WHATSAPP_REPLY_PACK_SOURCE_FILE = "src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx";
const whatsappReplyPackControlEvidenceIsCurrent = (
    whatsappReplyPackControlEvidence?.result === "PASS"
    && whatsappReplyPackControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(WHATSAPP_REPLY_PACK_SOURCE_FILE)
);
const PRINT_SHARE_TOOL_SOURCE_FILE = "src/components/website/printShareTools/PrintShareToolPage.tsx";
const printShareToolControlEvidenceIsCurrent = (
    printShareToolControlEvidence?.result === "PASS"
    && printShareToolControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PRINT_SHARE_TOOL_SOURCE_FILE)
);
const TOOL_REPORT_SOURCE_FILE = "src/components/website/toolReports/ToolReportPage.tsx";
const toolReportControlEvidenceIsCurrent = (
    toolReportControlEvidence?.result === "PASS"
    && toolReportControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(TOOL_REPORT_SOURCE_FILE)
);
const PUBLIC_TOOL_FOLLOWUP_SOURCE_FILES = [
    "src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx",
    "src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx",
    "src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx",
    "src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx",
    "src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx",
    "src/components/website/hoursCheck/HoursCheckPage.tsx",
    "src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx",
    "src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx",
    "src/components/website/photoGapCheck/PhotoGapCheckPage.tsx",
    "src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx",
    "src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx",
    "src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx",
    "src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx",
    "src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx",
];
const currentPublicToolFollowupSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of PUBLIC_TOOL_FOLLOWUP_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const publicToolFollowupControlEvidenceIsCurrent = (
    publicToolFollowupControlEvidence?.result === "PASS"
    && publicToolFollowupControlEvidence?.sourceManifestSha256
        === currentPublicToolFollowupSourceManifestSha256
);
const publicToolReportActionControlEvidenceIsCurrent = (
    publicToolReportActionControlEvidence?.result === "PASS"
    && publicToolReportActionControlEvidence?.sourceManifestSha256
        === currentPublicToolFollowupSourceManifestSha256
);
const CUSTOMER_LINK_SOCIAL_BIO_COMPLETION_SOURCE_FILES = [
    "src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx",
    "src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx",
];
const currentCustomerLinkSocialBioCompletionManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of CUSTOMER_LINK_SOCIAL_BIO_COMPLETION_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const customerLinkSocialBioCompletionControlEvidenceIsCurrent = (
    customerLinkSocialBioCompletionControlEvidence?.result === "PASS"
    && customerLinkSocialBioCompletionControlEvidence?.sourceManifestSha256
        === currentCustomerLinkSocialBioCompletionManifestSha256
);
const WEBSITE_PREFERENCE_SOURCE_FILES = [
    "src/components/website/shared/WebsiteThemeSwitcher.tsx",
    "src/components/website/shared/WebsiteLanguageSwitcher.tsx",
    "src/components/website/shared/WebsiteAnalyticsPreferencesButton.tsx",
    "src/components/website/shared/ScrollToTopButton.tsx",
];
const currentWebsitePreferenceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_PREFERENCE_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websitePreferenceControlEvidenceIsCurrent = (
    websitePreferenceControlEvidence?.result === "PASS"
    && websitePreferenceControlEvidence?.sourceManifestSha256
        === currentWebsitePreferenceManifestSha256
);
const LOCAL_MOBILE_OWNER_SOURCE_FILES = [
    "src/components/mobile/antd.tsx",
    "src/components/mobile/MobileShell.tsx",
    "src/components/mobile/MobileNavigation.tsx",
    "src/components/mobile/screens/MobileHoursScreen.tsx",
    "src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx",
    "src/components/mobile/components/MobileSpecialHoursManager.tsx",
    "src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx",
    "src/components/mobile/screens/MobileMenuScreen.tsx",
    "src/components/mobile/screens/MobileSpecialMenuScreen.tsx",
    "src/components/mobile/screens/MobileUsersScreen.tsx",
    "src/components/mobile/screens/MobileRolesScreen.tsx",
    "src/components/mobile/screens/MobileShareScreen.tsx",
    "src/components/mobile/components/MobileProjectSelectorSheet.tsx",
    "src/components/mobile/components/MobileLinkCard.tsx",
    "src/components/mobile/components/CommunicationKit.tsx",
    "src/components/mobile/components/MobileQrCodeSheet.tsx",
    "src/components/mobile/components/MobileCompliancePagesEditor.tsx",
    "src/components/mobile/components/MobileTempStatusConfigurator.tsx",
    "src/components/mobile/screens/MobileDomainSettingsScreen.tsx",
    "src/components/mobile/screens/MobileMoreScreen.tsx",
    "src/components/mobile/screens/MobileResellerDashboardScreen.tsx",
    "src/components/mobile/screens/MobileResellerOnboardingScreen.tsx",
    "src/components/mobile/screens/MobileBillingScreen.tsx",
    "src/components/mobile/screens/MobileLocationsScreen.tsx",
    "src/components/mobile/screens/MobileTransactionsScreen.tsx",
    "src/components/mobile/screens/MobileHelpScreen.tsx",
    "src/components/mobile/screens/MobileFeedbackScreen.tsx",
    "src/components/mobile/screens/MobileDigitalScreensScreen.tsx",
    "src/components/mobile/screens/MobileBasicSettingsScreen.tsx",
    "src/components/mobile/screens/MobileOfficialPageScreen.tsx",
    "src/components/mobile/sheets/ColorPickerSheet.tsx",
    "src/components/mobile/sheets/MobileOfficialPagePreviewSheet.tsx",
    "src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx",
    "src/components/mobile/components/PresenceMonitor.tsx",
    "src/components/mobile/screens/MobileBusinessAttributesScreen.tsx",
    "src/components/mobile/screens/MobileCustomerAppScreen.tsx",
    "src/components/mobile/screens/MobileLocaleSettingsScreen.tsx",
    "src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx",
    "src/components/mobile/screens/MobileTimeSlotsScreen.tsx",
    "src/components/mobile/screens/MobilePosSyncScreen.tsx",
    "src/components/mobile/sheets/AppSettingsSheet.tsx",
    "src/components/mobile/screens/MobileDesignEditorScreen.tsx",
    "src/components/mobile/sheets/ItemEditSheet.tsx",
    "src/components/mobile/sheets/CategoryManagerSheet.tsx",
    "src/components/mobile/sheets/BulkActionsSheet.tsx",
    "src/components/mobile/sheets/MobileCategoryEditSheet.tsx",
    "src/components/mobile/sheets/AIDefaultsSheet.tsx",
    "src/components/mobile/sheets/GenerateDescriptionsSheet.tsx",
    "src/components/mobile/sheets/TextCaseSheet.tsx",
    "src/components/atoms/IconPicker/index.tsx",
    "src/components/atoms/IconPicker/LucideIconGrid.tsx",
    "src/components/atoms/IconPicker/EmojiGrid.tsx",
    "src/components/atoms/phoneNumberInput/index.tsx",
    "src/components/shared/ProjectSelector.tsx",
    "src/components/atoms/OutletContextBanner/index.tsx",
    "src/components/molecules/StoreSwitcher/index.tsx",
    "src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx",
    "src/components/templates/main-app/feedback/FeedbackQrDownload.tsx",
    "src/components/organisms/headerComponent/profileActionsModal/index.tsx",
    "src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx",
    "src/components/templates/main-app/businessSettings/index.tsx",
    "src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/LocationInfoTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/ContactPersonTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/AnalyticsTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx",
    "src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx",
    "src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/SocialMediaTab.tsx",
    "src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx",
    "src/components/templates/main-app/projects/index.tsx",
    "src/components/templates/main-app/projects/FileList.tsx",
    "src/components/templates/main-app/ShareLinkCard.tsx",
    "src/components/templates/main-app/projects/ProjectsSubHeader.tsx",
    "src/components/templates/main-app/projects/ProcessGuideModal.tsx",
    "src/components/templates/main-app/projects/editorView/Editor.tsx",
    "src/components/templates/main-app/projects/editorView/EditorContent.tsx",
    "src/components/templates/main-app/projects/editorView/EditorQualityBanner.tsx",
    "src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx",
    "src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx",
    "src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx",
    "src/components/templates/main-app/projects/editorView/ReorderSortableItem.tsx",
    "src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx",
    "src/components/templates/main-app/projects/editorView/editCategoryModal.tsx",
    "src/components/templates/main-app/projects/b2cView/previewModal.tsx",
    "src/components/templates/main-app/projects/b2cView/sidebar/index.tsx",
    "src/components/templates/main-app/projects/b2cView/shareModal/index.tsx",
    "src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx",
    "src/components/templates/main-app/projects/editorView/EditorFiltersPopover.tsx",
    "src/components/templates/main-app/projects/editorView/KeyboardShortcutsHelp.tsx",
    "src/components/templates/main-app/projects/LanguageSelector.tsx",
    "src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx",
    "src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx",
    "src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/ActionEngine.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/ActiveInactiveAction.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/MoveCategoryAction.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction.tsx",
    "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction.tsx",
    "src/components/templates/main-app/projects/editorView/editItemModal.tsx",
    "src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx",
    "src/components/templates/main-app/projects/editorView/utils/editorOperations.ts",
    "src/components/templates/main-app/reseller/ResellerDashboard.tsx",
    "src/components/templates/main-app/reseller/OnboardingWizard.tsx",
    "src/components/templates/main-app/transactions/index.tsx",
    "src/components/templates/main-app/menuListHelpCenter/index.tsx",
    "src/components/templates/main-app/useMenuList/index.tsx",
    "src/components/templates/main-app/billing/index.tsx",
    "src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx",
    "src/components/templates/main-app/today/index.tsx",
    "src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx",
    "src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx",
    "src/lib/printable-asset-templates/renderPrintableAsset.ts",
    "src/lib/printable-asset-templates/editorDocumentAdapter.ts",
    "src/lib/print-menu-surfaces/templates/tableTentTemplate.ts",
    "src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts",
    "src/lib/menu-kit/templates/entrancePosterTemplate.ts",
    "src/app/(main)/layout.tsx",
    "src/app/(main)/locations/page.tsx",
    "src/components/organisms/OutletRenameModal/index.tsx",
    "src/lib/accessibility/antConfirmDialog.tsx",
    "src/lib/projects/projectSelection.ts",
    "src/lib/projects/editorProjectComparison.ts",
    "src/lib/media/itemPhotoCaptureAssist.ts",
    "src/hooks/useSpecialMenus.ts",
    "src/database/projects/index.ts",
    "src/app/api/projects/delete/route.ts",
    "src/lib/firestore/summaryProjectsWriter.ts",
    "src/lib/firestore/parseSummaryProjects.ts",
    "src/lib/staffManagement/client.ts",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx",
    "src/components/shared/media/ItemPhotoCaptureAssist.tsx",
    "src/components/shared/media/MediaAspectRatioSelector.tsx",
    "src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx",
    "src/app/client/obp/OBPResolvedSurface.tsx",
    "src/app/client/obp/OBPActions.tsx",
    "src/lib/phone/phoneNumber.ts",
    "src/lib/obp/publicLinks.ts",
    "src/lib/obp/generateOBPUrl.ts",
    "src/components/customer/PublicMenuListAttribution.tsx",
    "src/constants/urls.ts",
    "src/app/screen/[token]/MenuBoardDisplay.tsx",
    "src/app/screen/[token]/ScreenDisplay.tsx",
    "src/app/screen/[token]/ScreenAttribution.tsx",
    "src/app/screen/[token]/page.tsx",
    "src/app/api/digital-screens/route.ts",
    "src/hooks/useDigitalScreenSeenSignal.ts",
];
const currentLocalMobileOwnerManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of LOCAL_MOBILE_OWNER_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const localMobileOwnerControlEvidenceIsCurrent = (
    localMobileOwnerControlEvidence?.result === "PASS"
    && localMobileOwnerControlEvidence?.sourceManifestSha256
        === currentLocalMobileOwnerManifestSha256
);
const controlEvidenceSets = [
    authenticatedOwnerControlEvidence,
    localPlatformControlEvidence,
    publicCustomerControlEvidence,
    creativeEditorControlEvidenceIsCurrent ? creativeEditorControlEvidence : null,
    websiteHeaderControlEvidenceIsCurrent ? websiteHeaderControlEvidence : null,
    unauthorizedRecoveryControlEvidenceIsCurrent ? unauthorizedRecoveryControlEvidence : null,
    notFoundRecoveryControlEvidenceIsCurrent ? notFoundRecoveryControlEvidence : null,
    msgPreviewRecoveryControlEvidenceIsCurrent ? msgPreviewRecoveryControlEvidence : null,
    authEntryControlEvidenceIsCurrent ? authEntryControlEvidence : null,
    pricingControlEvidenceIsCurrent ? pricingControlEvidence : null,
    contactFormControlEvidenceIsCurrent ? contactFormControlEvidence : null,
    createMenuEntryControlEvidenceIsCurrent ? createMenuEntryControlEvidence : null,
    hoursCheckControlEvidenceIsCurrent ? hoursCheckControlEvidence : null,
    publicTruthCheckControlEvidenceIsCurrent ? publicTruthCheckControlEvidence : null,
    photoGapCheckControlEvidenceIsCurrent ? photoGapCheckControlEvidence : null,
    qrLinkHealthCheckControlEvidenceIsCurrent ? qrLinkHealthCheckControlEvidence : null,
    googleProfileBasicsControlEvidenceIsCurrent ? googleProfileBasicsControlEvidence : null,
    menuReadabilityControlEvidenceIsCurrent ? menuReadabilityControlEvidence : null,
    socialBioLinkControlEvidenceIsCurrent ? socialBioLinkControlEvidence : null,
    bookingInquiryControlEvidenceIsCurrent ? bookingInquiryControlEvidence : null,
    customerLinkPreviewControlEvidenceIsCurrent ? customerLinkPreviewControlEvidence : null,
    priceAvailabilityControlEvidenceIsCurrent ? priceAvailabilityControlEvidence : null,
    whatsappActionControlEvidenceIsCurrent ? whatsappActionControlEvidence : null,
    menuPdfCleanupControlEvidenceIsCurrent ? menuPdfCleanupControlEvidence : null,
    customerQuestionCoverageControlEvidenceIsCurrent ? customerQuestionCoverageControlEvidence : null,
    businessFactsCopyPackControlEvidenceIsCurrent ? businessFactsCopyPackControlEvidence : null,
    customerFaqReplyPackControlEvidenceIsCurrent ? customerFaqReplyPackControlEvidence : null,
    whatsappReplyPackControlEvidenceIsCurrent ? whatsappReplyPackControlEvidence : null,
    printShareToolControlEvidenceIsCurrent ? printShareToolControlEvidence : null,
    toolReportControlEvidenceIsCurrent ? toolReportControlEvidence : null,
    publicToolFollowupControlEvidenceIsCurrent ? publicToolFollowupControlEvidence : null,
    publicToolReportActionControlEvidenceIsCurrent ? publicToolReportActionControlEvidence : null,
    customerLinkSocialBioCompletionControlEvidenceIsCurrent ? customerLinkSocialBioCompletionControlEvidence : null,
    websitePreferenceControlEvidenceIsCurrent ? websitePreferenceControlEvidence : null,
    localMobileOwnerControlEvidenceIsCurrent ? localMobileOwnerControlEvidence : null,
]
    .filter((evidenceSet) => evidenceSet?.result === "PASS");
const controlEvidenceBySourceAction = new Map();
for (const evidenceSet of controlEvidenceSets) {
    for (const interaction of evidenceSet.interactions ?? []) {
        for (const controlAction of interaction.controlActions ?? []) {
            controlEvidenceBySourceAction.set(
                `${interaction.source}|${controlAction}`,
                { evidenceSet, interaction },
            );
        }
    }
}
const publicWebsiteRouteRenderEvidence = runtimeEvidence.publicWebsiteRouteRender ?? null;
const localPageRenderEvidence = runtimeEvidence.currentLocalProductionRouteSmoke ?? null;
const functionExportRuntimeEvidence = runtimeEvidence.menuListFunctionExportRuntimeBoundary ?? null;
const dynamicRouteRecoveryEvidence = runtimeEvidence.dynamicRouteRecoveryBoundary ?? null;
const appShellCompositionEvidence = runtimeEvidence.appShellCompositionBoundary ?? null;
const appErrorBoundaryRuntimeEvidence = runtimeEvidence.appErrorBoundaryRuntime ?? null;
const featureFlagRegistryRuntimeEvidence = runtimeEvidence.featureFlagRegistryRuntime ?? null;
const APP_ERROR_BOUNDARY_SOURCE_FILES = [
    "src/app/(global-pages)/error.tsx",
    "src/app/client/error.tsx",
    "src/app/error.tsx",
];
const currentAppErrorBoundarySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of APP_ERROR_BOUNDARY_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const appErrorBoundaryRuntimeEvidenceIsCurrent = (
    appErrorBoundaryRuntimeEvidence?.result === "PASS_COMPONENT_RUNTIME"
    && appErrorBoundaryRuntimeEvidence?.sourceManifestSha256
        === currentAppErrorBoundarySourceManifestSha256
);
const APP_SHELL_COMPOSITION_SOURCE_FILES = [
    "src/app/(global-pages)/layout.tsx",
    "src/app/(global-pages)/msg-preview/[sessionId]/layout.tsx",
    "src/app/(main)/layout.tsx",
    "src/app/(main)/ops/layout.tsx",
    "src/app/(main)/platform/layout.tsx",
    "src/app/(main)/reseller/layout.tsx",
    "src/app/(main)/reseller/manage/layout.tsx",
    "src/app/(website)/[locale]/layout.tsx",
    "src/app/(website)/layout.tsx",
    "src/app/client/layout.tsx",
    "src/app/layout.tsx",
    "src/app/client/not-found.tsx",
    "src/app/feedback/[projectId]/not-found.tsx",
    "src/app/not-found.tsx",
    "src/app/loading.tsx",
];
const currentAppShellCompositionSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of APP_SHELL_COMPOSITION_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const appShellCompositionEvidenceIsCurrent = (
    appShellCompositionEvidence?.result === "PASS_COMPOSED_RUNTIME_BOUNDARY"
    && appShellCompositionEvidence?.sourceManifestSha256
        === currentAppShellCompositionSourceManifestSha256
);
const DYNAMIC_ROUTE_RECOVERY_SOURCE_FILES = [
    "src/app/(global-pages)/msg-preview/[sessionId]/page.tsx",
    "src/app/(website)/create-menu/preview/[draftId]/page.tsx",
    "src/app/client/[[...slug]]/page.tsx",
    "src/app/feedback/[projectId]/page.tsx",
    "src/app/feedback/[projectId]/not-found.tsx",
    "src/app/screen/[token]/page.tsx",
    "src/app/not-found.tsx",
    "src/proxy.ts",
];
const currentDynamicRouteRecoverySourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of DYNAMIC_ROUTE_RECOVERY_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const dynamicRouteRecoveryEvidenceIsCurrent = (
    dynamicRouteRecoveryEvidence?.result === "PASS_INVALID_STATE_RECOVERY"
    && dynamicRouteRecoveryEvidence?.sourceManifestSha256
        === currentDynamicRouteRecoverySourceManifestSha256
);
const FUNCTION_RUNTIME_SOURCE_FILES = [
    "functions/src/aggregateCustomerAnalytics.ts",
    "functions/src/config/secrets.ts",
    "functions/src/decisionBlocksScoring.ts",
    "functions/src/dev-triggers.ts",
    "functions/src/emailOs/http.ts",
    "functions/src/emailOs/webhook.ts",
    "functions/src/index.ts",
    "functions/src/messagingOnboarding/webhookHandler.ts",
    "functions/src/schedulers/masterScheduler.ts",
    "functions/src/schedulers/menulistMaintenanceScheduler.ts",
    "functions/src/triggers/messaging.ts",
    "functions/src/triggers/operations.ts",
    "functions/src/triggers/production.ts",
    "functions/src/triggers/shared.ts",
];
const currentFunctionSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of FUNCTION_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const functionRuntimeEvidenceIsCurrent = (
    functionExportRuntimeEvidence?.result === "PASS_PARTIAL_RUNTIME_BOUNDARIES"
    && functionExportRuntimeEvidence?.sourceManifestSha256 === currentFunctionSourceManifestSha256
);
const fullLocalFunctionContractExports = new Set(
    functionExportRuntimeEvidence?.fullLocalContractExports ?? [],
);
const partialFunctionRuntimeBoundaryExports = new Set(
    functionExportRuntimeEvidence?.partialRuntimeBoundaryExports ?? [],
);
const publicSitemapPath = path.join(ROOT, "public/sitemap.xml");
const publicSitemapPaths = fs.existsSync(publicSitemapPath)
    ? [...fs.readFileSync(publicSitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => {
            try {
                return new URL(match[1]).pathname;
            } catch {
                return null;
            }
        })
        .filter(Boolean)
    : [];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ANSWERLATTICE_COMPATIBILITY_FUNCTION_EXPORTS = new Set([
    "backfillAggregates",
    "embedArticleWorker",
    "publishApprovedJobFn",
    "regenerateEmbedding",
    "triggerAggregationManual",
]);
const SOURCE_RESOLUTION_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const APP_SPECIAL_FILE = /\/(page|layout|route|loading|error|not-found)\.(?:tsx?|jsx?)$/;
const ROUTE_FILE = /\/route\.(?:tsx?|jsx?)$/;
const PAGE_FILE = /\/page\.(?:tsx?|jsx?)$/;
const CONTROL_PATTERNS = [
    ["button", /<(?:button|Button|IconButton|WebsiteButton)\b/],
    ["link", /<(?:a|Link|NavLink)\b/],
    ["form", /<(?:form\b|Form(?!\.)\b)/],
    ["input", /<(?:input|Input|InputNumber|TextArea|textarea)\b/],
    ["selection", /<(?:select|Select|Checkbox|Radio|Switch|DatePicker|TimePicker|Segmented|ColorPicker|Rate|Slider|RangePicker|TreeSelect|Tree)\b/],
    ["disclosure", /<(?:Collapse|Tabs|Dropdown|Menu|Popover|AccordionTrigger)\b/],
    ["dialog-action-surface", /<(?:Modal|Drawer|Popconfirm)\b/],
    ["upload", /<(?:Upload|input)\b[^>]*\btype\s*=\s*["']file["']/],
    ["action-handler", /\bonClick\s*=|\bonPress\s*=|\bonAction\s*=/],
];
const CONCRETE_CONTROL_KINDS = new Set([
    "button",
    "link",
    "form",
    "input",
    "selection",
    "disclosure",
    "dialog-action-surface",
    "upload",
]);
const ANSWERLATTICE_MOBILE_MORE_ACTION_KEYS = new Set([
    "answerlatticeIntakeMonitor",
    "answerlatticeHub",
    "knowledgeBase",
    "kbGeneration",
    "changelog",
    "answerlatticeWidget",
    "supportTickets",
    "feedbackAdmin",
    "answerlatticeIntake",
    "chatManagement",
    "chatInsights",
    "chatBackfill",
    "chatWeeklyDigest",
    "chatRoiCalculator",
]);

function controlKindsForLine(line) {
    const matchedKinds = CONTROL_PATTERNS
        .filter(([, pattern]) => pattern.test(line))
        .map(([kind]) => kind);
    const hasConcreteControl = matchedKinds.some((kind) => CONCRETE_CONTROL_KINDS.has(kind));

    return matchedKinds.filter((kind) => {
        // onClick/onPress/onAction is the backing handler for a concrete
        // element on the same line, not a second user-triggerable control.
        if (kind === "action-handler" && hasConcreteControl) return false;
        // A file input is one upload control, not both an input and upload.
        if (kind === "input" && matchedKinds.includes("upload")) return false;
        return true;
    });
}

function propertyNameText(property) {
    const name = property?.name;
    if (!name) return null;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }
    return null;
}

function keyedMenuActionsByLine(source, relativePath) {
    const scriptKind = relativePath.endsWith(".tsx")
        ? ts.ScriptKind.TSX
        : relativePath.endsWith(".jsx")
            ? ts.ScriptKind.JSX
            : relativePath.endsWith(".ts")
                ? ts.ScriptKind.TS
                : ts.ScriptKind.JS;
    const sourceFile = ts.createSourceFile(
        relativePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
    );
    const actions = new Map();

    const visit = (node) => {
        if (ts.isObjectLiteralExpression(node)) {
            const keyProperty = node.properties.find((property) => (
                ts.isPropertyAssignment(property) && propertyNameText(property) === "key"
            ));
            const hasAction = node.properties.some((property) => (
                ["onClick", "onPress", "onAction"].includes(propertyNameText(property))
            ));
            if (keyProperty && hasAction) {
                const keyValue = keyProperty.initializer;
                if (ts.isStringLiteral(keyValue) || ts.isNoSubstitutionTemplateLiteral(keyValue)) {
                    actions.set(
                        sourceFile.getLineAndCharacterOfPosition(keyProperty.getStart(sourceFile)).line,
                        keyValue.text,
                    );
                } else {
                    actions.set(
                        sourceFile.getLineAndCharacterOfPosition(keyProperty.getStart(sourceFile)).line,
                        keyValue.getText(sourceFile),
                    );
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return actions;
}

function jsxBackingHandlerLines(source, relativePath) {
    const scriptKind = relativePath.endsWith(".tsx")
        ? ts.ScriptKind.TSX
        : relativePath.endsWith(".jsx")
            ? ts.ScriptKind.JSX
            : relativePath.endsWith(".ts")
                ? ts.ScriptKind.TS
                : ts.ScriptKind.JS;
    const sourceFile = ts.createSourceFile(
        relativePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
    );
    const handlerLines = new Set();
    const concreteElementNames = new Set([
        "button",
        "Button",
        "IconButton",
        "WebsiteButton",
        "a",
        "Link",
        "NavLink",
        "form",
        "Form",
        "input",
        "Input",
        "InputNumber",
        "TextArea",
        "textarea",
        "select",
        "Select",
        "Checkbox",
        "Radio",
        "Switch",
        "DatePicker",
        "TimePicker",
        "Segmented",
        "ColorPicker",
        "Rate",
        "Slider",
        "RangePicker",
        "TreeSelect",
        "Tree",
        "Collapse",
        "Tabs",
        "Dropdown",
        "Menu",
        "Popover",
        "AccordionTrigger",
        "Modal",
        "Drawer",
        "Popconfirm",
        "Upload",
    ]);

    function jsxTagNameText(tagName) {
        if (ts.isIdentifier(tagName)) return tagName.text;
        if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
        return tagName.getText(sourceFile);
    }

    function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            if (concreteElementNames.has(jsxTagNameText(node.tagName))) {
                for (const property of node.attributes.properties) {
                    if (!ts.isJsxAttribute(property)) continue;
                    if (!["onClick", "onPress", "onAction", "onSubmit"].includes(property.name.text)) continue;
                    handlerLines.add(
                        sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line,
                    );
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return handlerLines;
}

const COLUMNS = [
    "inventory_id",
    "item_type",
    "product_area",
    "route_or_component",
    "screen_or_tab",
    "role",
    "tenant_state",
    "store_state",
    "subscription_or_entitlement_state",
    "feature_flag_state",
    "viewport",
    "control_or_action",
    "expected_behavior",
    "backing_api_dal_data_path",
    "test_type",
    "test_result",
    "defect_id",
    "regression_test_added",
    "final_verification_status",
    "evidence_or_notes",
];

function walk(directory, output = []) {
    if (!fs.existsSync(directory)) return output;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if ([".git", ".next", "node_modules", "coverage"].includes(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute, output);
        else output.push(absolute);
    }
    return output;
}

function relative(file) {
    return path.relative(ROOT, file).split(path.sep).join("/");
}

function routeFromAppFile(file) {
    const rel = relative(file).slice("src/app".length);
    const withoutSpecialFile = rel.replace(
        /\/(?:page|route|layout|loading|error|not-found)\.(?:tsx?|jsx?)$/,
        "",
    );
    const segments = withoutSpecialFile
        .split("/")
        .filter(Boolean)
        .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
    return `/${segments.join("/")}` || "/";
}

const ANSWERLATTICE_LEGACY_PLATFORM_ROUTE_PREFIXES = [
    "/platform/changelog",
    "/platform/chat-backfill",
    "/platform/chat-insights",
    "/platform/chat-management",
    "/platform/chat-roi-calculator",
    "/platform/chat-weekly-digest",
    "/platform/feedback-admin",
    "/platform/kb-generation",
    "/platform/knowledge-base",
    "/platform/support-tickets",
];
const ANSWERLATTICE_LEGACY_COMPONENT_PREFIXES = [
    "src/components/templates/main-app/platform/answerlatticeintakemonitor/",
    "src/components/templates/platform/changelog/",
    "src/components/templates/platform/chatmanagement/",
    "src/components/templates/platform/feedbackadmin/",
    "src/components/templates/platform/kbgeneration/",
    "src/components/templates/platform/knowledgebase/",
    "src/components/templates/platform/supporttickets/",
    "src/components/organisms/knowledgebaseexplorer/",
    "src/components/organisms/supportticket/",
    "src/components/organisms/addsupportticket/",
];

function isAnswerlatticeLegacyPlatformRoute(route) {
    return ANSWERLATTICE_LEGACY_PLATFORM_ROUTE_PREFIXES.some((prefix) => (
        route === prefix || route.startsWith(`${prefix}/`)
    ));
}

function classifyProduct(file, route = "") {
    const relativeFile = relative(file).toLowerCase();
    const value = `${relativeFile} ${route}`.toLowerCase();
    if (
        value.includes("answerlattice")
        || value.includes("src/components/templates/main-app/helpcenter/")
        || ANSWERLATTICE_LEGACY_COMPONENT_PREFIXES.some((prefix) => relativeFile.startsWith(prefix))
        || isAnswerlatticeLegacyPlatformRoute(route)
        || route.startsWith("/widget")
        || route.startsWith("/api/widget")
    ) return "Answerlattice boundary";
    if (value.includes("campaigncue")) return "CampaignCue boundary";
    if (value.includes("signaldesk")) return "SignalDesk boundary";
    if (value.includes("mycodex")) return "MyCodex boundary";
    if (value.includes("sites/neelvara")) return "Neelvara boundary";
    // GrowthOS is the internal implementation namespace for the shipped
    // MenuList Growth Kits add-on. It has no standalone host or app surface,
    // so its owner page, APIs, data paths, and reachable controls remain part
    // of MenuList release certification.
    if (value.includes("growthos") || route.startsWith("/growth-kits")) return "MenuList";
    if (value.includes("kitstamp")) return "KitStamp boundary";
    return "MenuList";
}

function csv(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function makeRow(values) {
    return Object.fromEntries(COLUMNS.map((column) => [column, values[column] ?? ""]));
}

function methodList(source) {
    const methods = new Set();
    for (const match of source.matchAll(/export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) {
        methods.add(match[1]);
    }
    for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const specifier of match[1].split(",")) {
            const exportedName = specifier.trim().split(/\s+as\s+/i).at(-1);
            if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(exportedName)) methods.add(exportedName);
        }
    }
    for (const match of source.matchAll(/export\s+const\s*\{([^}]+)\}\s*=/g)) {
        for (const name of match[1].split(",").map((value) => value.trim())) {
            if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(name)) methods.add(name);
        }
    }
    return [...methods].sort().join("|") || "UNRESOLVED_METHOD";
}

const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8"));
const aliasEntries = Object.entries(tsconfig.compilerOptions?.paths ?? {})
    .map(([pattern, targets]) => ({
        prefix: pattern.replace(/\*$/, ""),
        targetPrefix: String(targets[0] ?? "").replace(/\*$/, ""),
    }))
    .sort((left, right) => right.prefix.length - left.prefix.length);

function resolveSourceImport(importer, specifier) {
    let candidateBase = null;
    if (specifier.startsWith(".")) {
        candidateBase = path.resolve(path.dirname(importer), specifier);
    } else if (specifier.startsWith("src/")) {
        candidateBase = path.join(ROOT, specifier);
    } else {
        const alias = aliasEntries.find((entry) => specifier.startsWith(entry.prefix));
        if (alias) {
            candidateBase = path.join(ROOT, alias.targetPrefix, specifier.slice(alias.prefix.length));
        }
    }
    if (!candidateBase) return null;

    const candidates = [
        candidateBase,
        ...SOURCE_RESOLUTION_EXTENSIONS.map((extension) => `${candidateBase}${extension}`),
        ...SOURCE_RESOLUTION_EXTENSIONS.map((extension) => path.join(candidateBase, `index${extension}`)),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function importedSourceFiles(file) {
    const source = fs.readFileSync(file, "utf8");
    const specifiers = new Set();
    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
        specifiers.add(match[1]);
    }
    return [...specifiers]
        .map((specifier) => resolveSourceImport(file, specifier))
        .filter(Boolean);
}

function featureFlagState(source) {
    const flags = [...source.matchAll(/FEATURE_FLAGS\.(ENABLE_[A-Z0-9_]+)/g)]
        .map((match) => match[1]);
    return [...new Set(flags)].sort().join("|") || "NO_DIRECT_FLAG_GUARD";
}

function appSurfaceProfile(file, route, itemType, product, source) {
    const rel = relative(file);
    const isMain = rel.startsWith("src/app/(main)/");
    const isWebsite = rel.startsWith("src/app/(website)/");
    const isApi = itemType === "api-route";

    if (product !== "MenuList") {
        return {
            role: "SEPARATION_BOUNDARY_ONLY",
            tenant_state: "PRODUCT_HOST_BOUNDARY",
            store_state: "OUT_OF_SCOPE_EXCEPT_ISOLATION",
            subscription_or_entitlement_state: "OUT_OF_SCOPE_EXCEPT_ISOLATION",
            viewport: isApi ? "SERVER" : "RESPONSIVE_WHERE_RENDERED",
        };
    }

    if (isApi) {
        const authSignals = [];
        if (/getServerSession|requireAuthenticated|requireApiAuth|withAuth|session\b/.test(source)) authSignals.push("AUTHENTICATED");
        if (/requirePlatformAdmin|PLATFORM_USER_ROLE|platformRole/.test(source)) authSignals.push("PLATFORM_ADMIN");
        if (/validatePublicApiKey|hasPublicApiCredentialScope|X-API-Key/i.test(source)) authSignals.push("PUBLIC_API_KEY");
        if (/checkRateLimit|getRateLimitForFeature/.test(source)) authSignals.push("RATE_LIMITED");
        if (/timingSafeEqual|hasValid\w*Secret|verify\w*Signature|validate\w*Signature/.test(source)) authSignals.push("SERVER_SECRET_OR_SIGNATURE");
        if (/tenantId|tenantID|tenant_id|x-tenant-/.test(source)) authSignals.push("TENANT_SCOPED");
        if (/storeId|storeID|store_id/.test(source)) authSignals.push("STORE_SCOPED");
        if (
            route === "/api/auth/[...nextauth]"
            || route === "/api/auth/phone-otp/start"
            || route === "/api/auth/phone-otp/verify"
            || route === "/api/auth/validate-claim"
        ) authSignals.push("PUBLIC_AUTH_ENTRY");
        if (
            route === "/api/csp-report"
            || route === "/api/test/rate-limit"
            || route === "/api/version"
            || route === "/client/robots"
            || route === "/developers/openapi"
            || route === "/manifest.webmanifest"
            || route === "/serwist/[path]"
        ) authSignals.push("PUBLIC_PLATFORM_OR_STATIC");
        if (route.startsWith("/api/public/")) authSignals.push("PUBLIC_CUSTOMER_OR_INTAKE");
        if (route === "/api/razorpay/webhook") authSignals.push("PROVIDER_WEBHOOK_BOUNDARY");
        if (route === "/api/screen/seen") authSignals.push("PUBLIC_SCREEN_TOKEN");
        return {
            role: authSignals.join("|") || "PUBLIC_OR_GUARD_TRACE_REQUIRED",
            tenant_state: authSignals.includes("TENANT_SCOPED") ? "VALID_AND_INVALID_TENANT" : "NOT_ROUTE_DERIVABLE",
            store_state: authSignals.includes("STORE_SCOPED") ? "VALID_MISSING_AND_FOREIGN_STORE" : "NOT_ROUTE_DERIVABLE",
            subscription_or_entitlement_state: /subscription|entitlement|credit|plan/i.test(`${route} ${source}`)
                ? "ACTIVE|UNPAID|PENDING|EXPIRED_AS_APPLICABLE"
                : "NOT_ROUTE_DERIVABLE",
            viewport: "SERVER",
        };
    }

    if (isMain) {
        const recoveryRoute = route === "/billing" || route === "/help-center" || route.startsWith("/help-center/");
        const platformRoute = route === "/platform" || route.startsWith("/platform/") || route === "/ops" || route.startsWith("/ops/");
        const resellerManage = route === "/reseller/manage" || route.startsWith("/reseller/manage/");
        const resellerRoute = route === "/reseller" || route.startsWith("/reseller/");
        const noStoreRoute = recoveryRoute || platformRoute || resellerRoute;
        return {
            role: platformRoute || resellerManage
                ? "PLATFORM_ADMIN"
                : resellerRoute
                    ? "PLATFORM_OR_RESELLER"
                    : "MENULIST_OWNER_OR_AUTHORIZED_STAFF",
            tenant_state: platformRoute ? "PLATFORM_CONTEXT" : "AUTHENTICATED_MENULIST_TENANT",
            store_state: noStoreRoute ? "STORE_OPTIONAL_OR_ROUTE_SPECIFIC" : "ACTIVE_SELECTED_STORE",
            subscription_or_entitlement_state: platformRoute || resellerRoute
                ? "ROLE_GATED_NOT_OWNER_PLAN_GATED"
                : recoveryRoute
                    ? "ACTIVE|STARTER|UNPAID|PENDING|EXPIRED"
                    : "ACTIVE_PAID_OR_BOUNDED_STARTER_ROUTE",
            viewport: route === "/platform/test-sentry" ? "DESKTOP_ONLY" : "DESKTOP_AND_MOBILE_SHELL",
        };
    }

    if (isWebsite) {
        return {
            role: "UNAUTHENTICATED_VISITOR_AND_AUTHENTICATED_VISITOR",
            tenant_state: "PLATFORM_WEBSITE",
            store_state: "NOT_APPLICABLE",
            subscription_or_entitlement_state: "PUBLIC_PRESENTATION_OR_AUTH_HANDOFF",
            viewport: "SMALL_MOBILE|PHONE|TABLET|DESKTOP",
        };
    }

    if (route.startsWith("/client/") || route.startsWith("/screen/") || route.startsWith("/feedback/")) {
        return {
            role: "PUBLIC_CUSTOMER",
            tenant_state: "VALID|INVALID|MALFORMED_TENANT",
            store_state: "ACTIVE|MISSING|UNPUBLISHED|ARCHIVED_OR_DISABLED",
            subscription_or_entitlement_state: "PUBLICATION_AND_ENTITLEMENT_GATED",
            viewport: route.startsWith("/screen/") ? "SCREEN|MOBILE|DESKTOP" : "SMALL_MOBILE|PHONE|TABLET|DESKTOP",
        };
    }

    return {
        role: "ROUTE_GUARD_TRACE_REQUIRED",
        tenant_state: "ROUTE_STATE_TRACE_REQUIRED",
        store_state: "ROUTE_STATE_TRACE_REQUIRED",
        subscription_or_entitlement_state: "ROUTE_STATE_TRACE_REQUIRED",
        viewport: "RESPONSIVE_WHERE_RENDERED",
    };
}

function appRuntimeEvidence(file, route, itemType, product) {
    if (
        itemType === "api-route"
        && product === "MenuList"
        && apiAnonymousBoundaryEvidence?.result === "PASS"
        && apiAnonymousBoundaryEvidence.handlers === 140
        && apiAnonymousBoundaryEvidence.methodProbes === 157
    ) {
        return {
            test_result: "PASS_ANONYMOUS_BOUNDARY",
            final_verification_status: "ANONYMOUS_BOUNDARY_PASSED_FUNCTIONAL_STATE_PENDING",
            evidence_or_notes: `Anonymous empty/invalid probe across every exported method; ${apiAnonymousBoundaryEvidence.testedAt}; no 5xx, timeout, or protected 2xx; authenticated and valid public behavior remains separately pending`,
        };
    }
    if (
        itemType === "page"
        && product === "MenuList"
        && relative(file).startsWith("src/app/(website)/")
        && publicWebsiteRouteRenderEvidence?.result === "PASS"
        && publicWebsiteRouteRenderEvidence.sitemapRouteCount === 186
        && publicSitemapPaths.some((candidate) => routePatternMatches(route, candidate))
    ) {
        return {
            test_result: "PASS_BROWSER_RENDER",
            final_verification_status: "RENDER_PASSED_CONTROL_INTERACTION_PENDING",
            evidence_or_notes: `${publicWebsiteRouteRenderEvidence.browser}; current sitemap concrete route rendered main and heading; ${publicWebsiteRouteRenderEvidence.testedAt}; individual controls remain separately pending`,
        };
    }
    if (
        itemType === "page"
        && product === "MenuList"
        && relative(file).startsWith("src/app/(main)/")
        && authenticatedOwnerNavigationEvidence?.result === "PASS"
        && authenticatedOwnerNavigationRoutes.has(route)
    ) {
        return {
            test_result: "PASS_AUTHENTICATED_RENDER",
            final_verification_status: "AUTHENTICATED_RENDER_PASSED_CONTROL_INTERACTION_PENDING",
            evidence_or_notes: `${authenticatedOwnerNavigationEvidence.browser}; entitled owner reached ${route} on exact hosted build ${authenticatedOwnerNavigationEvidence.servedBuildId}; ${authenticatedOwnerNavigationEvidence.testedAt}; route rendered without generic load failure or horizontal overflow; child controls remain separately pending`,
        };
    }
    if (
        itemType !== "page"
        || (
            product !== "MenuList"
            && !(product === "Answerlattice boundary" && isAnswerlatticeLegacyPlatformRoute(route))
        )
        || !relative(file).startsWith("src/app/(main)/")
        || privateRouteAccessEvidence?.result !== "PASS"
        || !privateRouteAccessRoutes.has(route)
    ) return {};

    const concreteRoute = privateRouteAccessEvidence.concreteRouteOverrides?.[route] ?? route;
    const expectedCallback = privateRouteAccessEvidence.canonicalCallbackOverrides?.[route] ?? concreteRoute;
    return {
        test_result: product === "MenuList" ? "PASS_ACCESS_BOUNDARY" : "PASS_SEPARATION_ACCESS_BOUNDARY",
        final_verification_status: product === "MenuList"
            ? "ACCESS_PASSED_FUNCTIONAL_INTERACTION_PENDING"
            : "SEPARATION_ACCESS_BOUNDARY_PASSED",
        evidence_or_notes: `${privateRouteAccessEvidence.browser}; signed-out ${concreteRoute} -> /signin callback ${expectedCallback}; ${privateRouteAccessEvidence.testedAt}; ${product === "MenuList" ? "authenticated controls remain separately pending" : "Answerlattice behavior remains outside MenuList certification"}`,
    };
}

function localPageRenderRuntimeEvidence(route, itemType, product) {
    if (
        itemType !== "page"
        || product !== "MenuList"
        || route.includes("[")
        || localPageRenderEvidence?.result !== "PASS_RENDER_BOUNDARY"
        || !Number.isInteger(localPageRenderEvidence.nonDynamicMenuListPageRoutes)
        || typeof localPageRenderEvidence.routeManifestSha256 !== "string"
    ) return {};
    return {
        test_result: "PASS_LOCAL_HTTP_RENDER",
        final_verification_status: "LOCAL_HTTP_RENDER_PASSED_CONTROL_INTERACTION_PENDING",
        evidence_or_notes: `${localPageRenderEvidence.browser}; exact current non-dynamic route manifest completed without timeout or 5xx; ${localPageRenderEvidence.testedAt}; dynamic state and individual controls remain separately pending`,
    };
}

function dynamicRouteRecoveryRuntimeEvidence(route, itemType, product) {
    if (
        itemType !== "page"
        || product !== "MenuList"
        || !dynamicRouteRecoveryEvidenceIsCurrent
        || !dynamicRouteRecoveryEvidence.routes?.[route]
    ) return {};
    return {
        test_result: "PASS_INVALID_STATE_RECOVERY",
        final_verification_status: "INVALID_STATE_RECOVERY_PASSED_VALID_STATE_SEPARATELY_SCOPED",
        evidence_or_notes: `${dynamicRouteRecoveryEvidence.browser}; ${dynamicRouteRecoveryEvidence.viewport}; ${dynamicRouteRecoveryEvidence.testedAt}; ${dynamicRouteRecoveryEvidence.routes[route]}`,
    };
}

function appShellCompositionRuntimeEvidence(file, itemType, product) {
    const source = relative(file);
    if (
        product !== "MenuList"
        || !["layout", "loading", "not-found"].includes(itemType)
        || !appShellCompositionEvidenceIsCurrent
        || !appShellCompositionEvidence.files?.[source]
    ) return {};
    return {
        test_result: "PASS_COMPOSED_RUNTIME_BOUNDARY",
        final_verification_status: "COMPOSED_RUNTIME_BOUNDARY_PASSED",
        evidence_or_notes: `${appShellCompositionEvidence.browser}; ${appShellCompositionEvidence.testedAt}; ${appShellCompositionEvidence.files[source]}`,
    };
}

function appErrorRuntimeEvidence(file, itemType, product) {
    const source = relative(file);
    if (
        product !== "MenuList"
        || itemType !== "error"
        || !appErrorBoundaryRuntimeEvidenceIsCurrent
        || !appErrorBoundaryRuntimeEvidence.files?.includes(source)
    ) return {};
    return {
        test_type: "component-runtime",
        test_result: "PASS_COMPONENT_RUNTIME",
        regression_test_added: "YES",
        final_verification_status: "COMPONENT_RUNTIME_PASSED",
        evidence_or_notes: `${appErrorBoundaryRuntimeEvidence.environment}; ${appErrorBoundaryRuntimeEvidence.testedAt}; ${appErrorBoundaryRuntimeEvidence.evidence}`,
    };
}

function controlRuntimeEvidence(source, controlAction) {
    const matchedEvidence = controlEvidenceBySourceAction.get(`${source}|${controlAction}`);
    if (!matchedEvidence) return {};
    const { evidenceSet, interaction } = matchedEvidence;
    return {
        test_type: evidenceSet.testType ?? "hosted-browser-interaction",
        test_result: evidenceSet.testResult ?? "PASS_HOSTED_INTERACTION",
        regression_test_added: evidenceSet.regressionTestAdded ?? "",
        final_verification_status: evidenceSet.finalVerificationStatus ?? "HOSTED_INTERACTION_PASSED",
        evidence_or_notes: evidenceSet.servedBuildId
            ? `${evidenceSet.browser}; exact hosted build ${evidenceSet.servedBuildId}; ${evidenceSet.testedAt}; ${interaction.evidence}`
            : `${evidenceSet.browser}; ${evidenceSet.viewport}; ${evidenceSet.testedAt}; ${interaction.evidence}`,
    };
}

function routePatternMatches(pattern, candidate) {
    if (pattern === candidate) return true;
    const escaped = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]/g, "(?:/.*)?")
        .replace(/\\\[\\\.\\\.\\\.[^\]]+\\\]/g, ".+")
        .replace(/\\\[[^\]]+\\\]/g, "[^/]+");
    return new RegExp(`^${escaped}$`).test(candidate);
}

const rows = [];
let sequence = 1;
const add = (values) => {
    const id = `MLRC-${String(sequence).padStart(6, "0")}`;
    sequence += 1;
    rows.push(makeRow({
        inventory_id: id,
        role: "DERIVE_FROM_RUNTIME_GUARD",
        tenant_state: "DERIVE_FROM_RUNTIME_GUARD",
        store_state: "DERIVE_FROM_RUNTIME_GUARD",
        subscription_or_entitlement_state: "DERIVE_FROM_RUNTIME_GUARD",
        feature_flag_state: "CURRENT_AND_MATERIAL_ALTERNATE",
        viewport: "DERIVE_FROM_SURFACE",
        test_result: "NOT_RUN",
        regression_test_added: "NO",
        final_verification_status: "DISCOVERED_UNTESTED",
        ...values,
    }));
};

const appFiles = walk(path.join(ROOT, "src/app"))
    .filter((file) => APP_SPECIAL_FILE.test(file))
    .sort();

for (const file of appFiles) {
    const rel = relative(file);
    const route = routeFromAppFile(file);
    const product = classifyProduct(file, route);
    const name = path.basename(file).split(".")[0];
    const source = fs.readFileSync(file, "utf8");
    const itemType = ROUTE_FILE.test(file) ? "api-route" : name;
    const profile = appSurfaceProfile(file, route, itemType, product, source);
    const recordedRuntimeEvidence = {
        ...localPageRenderRuntimeEvidence(route, itemType, product),
        ...dynamicRouteRecoveryRuntimeEvidence(route, itemType, product),
        ...appShellCompositionRuntimeEvidence(file, itemType, product),
        ...appErrorRuntimeEvidence(file, itemType, product),
        ...appRuntimeEvidence(file, route, itemType, product),
    };
    add({
        item_type: itemType,
        product_area: product,
        route_or_component: route,
        screen_or_tab: rel,
        ...profile,
        feature_flag_state: featureFlagState(source),
        control_or_action: ROUTE_FILE.test(file) ? methodList(source) : `render:${name}`,
        expected_behavior: "Resolve current source, host, authorization, lifecycle, and failure contract",
        backing_api_dal_data_path: rel,
        test_type: ROUTE_FILE.test(file) ? "boundary-and-runtime" : "browser-and-source",
        evidence_or_notes: product === "MenuList" ? "In-scope candidate" : "Separation boundary only",
        ...recordedRuntimeEvidence,
    });
}

const sourceFiles = walk(path.join(ROOT, "src"))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)));
const sourceFileSet = new Set(sourceFiles);
const importGraph = new Map(sourceFiles.map((file) => [
    file,
    importedSourceFiles(file).filter((dependency) => sourceFileSet.has(dependency)),
]));
const reachableRoutesByFile = new Map();
for (const pageFile of appFiles.filter((file) => PAGE_FILE.test(file))) {
    const route = routeFromAppFile(pageFile);
    const visited = new Set();
    const pending = [pageFile];
    let ancestor = path.dirname(pageFile);
    const appRoot = path.join(ROOT, "src/app");
    while (ancestor.startsWith(appRoot)) {
        for (const basename of ["layout", "loading", "error", "not-found", "global-error"]) {
            for (const extension of SOURCE_RESOLUTION_EXTENSIONS) {
                const specialFile = path.join(ancestor, `${basename}${extension}`);
                if (sourceFileSet.has(specialFile)) pending.push(specialFile);
            }
        }
        if (ancestor === appRoot) break;
        ancestor = path.dirname(ancestor);
    }
    while (pending.length > 0) {
        const current = pending.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const routes = reachableRoutesByFile.get(current) ?? new Set();
        routes.add(route);
        reachableRoutesByFile.set(current, routes);
        for (const dependency of importGraph.get(current) ?? []) pending.push(dependency);
    }
}

const uiRoots = ["src/components", "src/modules", "src/app"];
const uiFiles = uiRoots
    .flatMap((root) => walk(path.join(ROOT, root)))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort();

function isStaticallyHiddenNonUserControl(lines, index, kind) {
    if (kind !== "input") return false;

    const ancestorWindow = lines
        .slice(Math.max(0, index - 10), index + 1)
        .join("\n");
    let nearestFormItemStart = -1;
    for (let cursor = index - 1; cursor >= Math.max(0, index - 10); cursor -= 1) {
        if (lines[cursor].includes("</Form.Item>")) break;
        if (lines[cursor].includes("<Form.Item")) {
            nearestFormItemStart = cursor;
            break;
        }
    }
    if (
        nearestFormItemStart >= 0
        && /<Form\.Item\b[^>]*\bhidden\b/.test(
            lines.slice(nearestFormItemStart, index + 1).join("\n"),
        )
    ) return true;

    const elementLines = [];
    for (let cursor = index; cursor < Math.min(lines.length, index + 12); cursor += 1) {
        elementLines.push(lines[cursor]);
        if (lines[cursor].includes("/>")) break;
    }
    const elementSource = elementLines.join("\n");
    if (!elementSource.includes("tabIndex={-1}")) return false;

    const explicitAriaHidden = /aria-hidden\s*=\s*(?:\{\s*true\s*\}|["']true["'])/;
    const bareAriaHidden = /\baria-hidden(?=\s|>)/;
    const isAriaHidden = explicitAriaHidden.test(elementSource)
        || explicitAriaHidden.test(ancestorWindow)
        || bareAriaHidden.test(elementSource)
        || bareAriaHidden.test(ancestorWindow);
    const hasNativeHiddenAttribute = /\bhidden(?=\s|\/?>)/.test(elementSource);
    const hasStaticDisplayNone = /style=\{\{\s*display:\s*['"]none['"]\s*\}\}/.test(
        `${ancestorWindow}\n${elementSource}`,
    );

    return isAriaHidden && (hasNativeHiddenAttribute || hasStaticDisplayNone);
}

function staticallyDisabledControlLines(source, relativePath) {
    const sourceFile = ts.createSourceFile(
        relativePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx')
            ? ts.ScriptKind.TSX
            : ts.ScriptKind.TS,
    );
    const disabledLines = new Set();

    function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const hasBareDisabledAttribute = node.attributes.properties.some((property) => (
                ts.isJsxAttribute(property)
                && property.name.text === 'disabled'
                && property.initializer === undefined
            ));
            if (hasBareDisabledAttribute) {
                disabledLines.add(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return disabledLines;
}

for (const file of uiFiles) {
    const rel = relative(file);
    const reachableRoutes = [...(reachableRoutesByFile.get(file) ?? [])].sort();
    const product = (
        reachableRoutes.length > 0
        && reachableRoutes.every((route) => classifyProduct(file, route) === "Answerlattice boundary")
    )
        ? "Answerlattice boundary"
        : classifyProduct(file);
    const renderedSurface = reachableRoutes.length > 0
        ? reachableRoutes.join("|")
        : "UNREACHED_BY_APP_PAGE_STATIC_GRAPH";
    const reachabilityEvidence = reachableRoutes.length > 0
        ? {}
        : {
            test_type: "static-app-page-reachability",
            test_result: "PASS_NOT_SHIPPED",
            final_verification_status: "SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE",
        };
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/);
    const menuActionsByLine = keyedMenuActionsByLine(source, rel);
    const backingHandlerLines = jsxBackingHandlerLines(source, rel);
    const disabledControlLines = staticallyDisabledControlLines(source, rel);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const kinds = new Set(controlKindsForLine(line));
        if (backingHandlerLines.has(index)) {
            kinds.delete("action-handler");
        }
        if (menuActionsByLine.has(index)) kinds.add("menu-action");
        for (const kind of kinds) {
            const controlProduct = (
                kind === "menu-action"
                && rel === "src/components/mobile/screens/MobileMoreScreen.tsx"
                && ANSWERLATTICE_MOBILE_MORE_ACTION_KEYS.has(menuActionsByLine.get(index))
            )
                ? "Answerlattice boundary"
                : product;
            const controlAction = `${kind}@${index + 1}`;
            const hiddenNonUserControl = isStaticallyHiddenNonUserControl(lines, index, kind);
            const disabledNonUserControl = disabledControlLines.has(index);
            const staticNonUserEvidence = hiddenNonUserControl || disabledNonUserControl
                ? {
                    test_type: hiddenNonUserControl
                        ? "static-hidden-control-contract"
                        : "static-disabled-control-contract",
                    test_result: "PASS_NOT_USER_TRIGGERABLE",
                    regression_test_added: "YES",
                    final_verification_status: hiddenNonUserControl
                        ? "STATICALLY_HIDDEN_NOT_USER_TRIGGERABLE"
                        : "STATICALLY_DISABLED_NOT_USER_TRIGGERABLE",
                }
                : {};
            add({
                item_type: "user-control-candidate",
                product_area: controlProduct,
                route_or_component: rel,
                screen_or_tab: renderedSurface,
                control_or_action: controlAction,
                expected_behavior: "Resolve label, reachability, guard, mutation, feedback, and recovery contract",
                backing_api_dal_data_path: "TRACE_REQUIRED",
                test_type: "runtime-interaction-required",
                evidence_or_notes: `${reachableRoutes.length > 0 ? `Reachable from ${reachableRoutes.length} page route(s). ` : "No page import path found. "}${line.trim().replace(/\s+/g, " ").slice(0, 200)}`,
                ...reachabilityEvidence,
                ...controlRuntimeEvidence(rel, controlAction),
                ...staticNonUserEvidence,
            });
        }
    }
}

const featureSource = fs.readFileSync(path.join(ROOT, "src/config/features.ts"), "utf8");
const featureReaderSources = sourceFiles
    .filter((file) => relative(file) !== "src/config/features.ts")
    .map((file) => fs.readFileSync(file, "utf8"));
const featureReaderFiles = sourceFiles
    .filter((file) => relative(file) !== "src/config/features.ts")
    .filter((file) => /\bFEATURE_FLAGS\.ENABLE_[A-Z0-9_]+\b/.test(fs.readFileSync(file, "utf8")))
    .sort();
const currentFeatureFlagSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const file of [path.join(ROOT, "src/config/features.ts"), ...featureReaderFiles]) {
        hash.update(relative(file));
        hash.update("\0");
        hash.update(fs.readFileSync(file));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const featureFlagRegistryRuntimeEvidenceIsCurrent = (
    featureFlagRegistryRuntimeEvidence?.result === "PASS_REGISTRY_RUNTIME_BOUNDARY"
    && featureFlagRegistryRuntimeEvidence?.sourceManifestSha256
        === currentFeatureFlagSourceManifestSha256
);
for (const match of featureSource.matchAll(/^\s*(ENABLE_[A-Z0-9_]+)\s*:/gm)) {
    const flag = match[1];
    const product = classifyProduct(path.join(ROOT, "src/config/features.ts"), flag);
    const hasRuntimeReader = featureReaderSources.some((source) => (
        new RegExp(`\\bFEATURE_FLAGS\\.${flag}\\b`).test(source)
    ));
    const dormantEvidence = !hasRuntimeReader
        ? {
            test_result: "PASS_NOT_SHIPPED",
            final_verification_status: "DECLARED_FLAG_WITHOUT_RUNTIME_READER",
            evidence_or_notes: "Declared in the shared registry but has no FEATURE_FLAGS runtime reader under src; no enabled/disabled product state is shipped",
        }
        : {};
    const registryRuntimeEvidence = hasRuntimeReader && featureFlagRegistryRuntimeEvidenceIsCurrent
        ? {
            test_result: "PASS_PARTIAL_FLAG_REGISTRY_BOUNDARY",
            regression_test_added: "YES",
            final_verification_status: "PARTIAL_FLAG_READER_AND_REGISTRY_BOUNDARY",
            evidence_or_notes: `${featureFlagRegistryRuntimeEvidence.evidence} ${featureFlagRegistryRuntimeEvidence.scopeLimit} Source manifest ${currentFeatureFlagSourceManifestSha256}.`,
        }
        : {};
    add({
        item_type: "feature-flag",
        product_area: product,
        route_or_component: "src/config/features.ts",
        screen_or_tab: flag,
        control_or_action: "enabled-and-disabled-state",
        expected_behavior: "Flag-on behavior is reachable and flag-off behavior fails closed without dead navigation",
        backing_api_dal_data_path: "TRACE_FLAG_READERS",
        test_type: "source-and-material-runtime-state",
        evidence_or_notes: "Current declaration discovered programmatically",
        ...dormantEvidence,
        ...registryRuntimeEvidence,
    });
}

const functionsIndex = path.join(ROOT, "functions/src/index.ts");
if (fs.existsSync(functionsIndex)) {
    const source = fs.readFileSync(functionsIndex, "utf8");
    const exports = new Map();
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const assignment = line.match(/^\s*exports\.([A-Za-z0-9_]+)\s*=/);
        if (assignment) exports.set(assignment[1], index + 1);
        const direct = line.match(/^export\s+\{([^}]+)\}/);
        if (direct) {
            for (const name of direct[1].split(",").map((value) => value.trim()).filter(Boolean)) {
                exports.set(name.split(/\s+as\s+/).at(-1), index + 1);
            }
        }
    }
    for (const block of source.matchAll(/export\s+\{([\s\S]*?)\}\s*(?:from\s+["'][^"']+["'])?\s*;/g)) {
        const line = source.slice(0, block.index).split(/\r?\n/).length;
        for (const name of block[1].split(",").map((value) => value.trim()).filter(Boolean)) {
            exports.set(name.split(/\s+as\s+/).at(-1), line);
        }
    }
    for (const [name, line] of [...exports.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        const product = ANSWERLATTICE_COMPATIBILITY_FUNCTION_EXPORTS.has(name)
            ? "Answerlattice boundary"
            : "MenuList";
        const environmentState = name.startsWith("dev_trigger")
            ? "EMULATOR_ONLY"
            : ["startGeneration", "retryGeneration", "finalizePublish", "processMenuImagesJob"].includes(name)
                ? "DEPLOYED_ONLY"
                : "ALL_FUNCTION_ENVIRONMENTS";
        const hasFullLocalRuntimeContract = (
            product === "MenuList"
            && functionRuntimeEvidenceIsCurrent
            && fullLocalFunctionContractExports.has(name)
        );
        const hasPartialRuntimeBoundary = (
            product === "MenuList"
            && functionRuntimeEvidenceIsCurrent
            && partialFunctionRuntimeBoundaryExports.has(name)
        );
        const runtimeFields = hasFullLocalRuntimeContract
            ? {
                test_type: "compiled-function-runtime-and-isolated-emulator",
                test_result: "PASS_LOCAL_CURRENT_CONTRACT",
                regression_test_added: "YES",
                final_verification_status: "PASS_LOCAL_DEPLOYED_RETEST_PENDING",
                evidence_or_notes: `${functionExportRuntimeEvidence.evidence} Source manifest ${currentFunctionSourceManifestSha256}.`,
            }
            : hasPartialRuntimeBoundary
                ? {
                    test_type: "compiled-function-runtime-and-isolated-emulator",
                    test_result: "PASS_PARTIAL_RUNTIME_BOUNDARY",
                    regression_test_added: "YES",
                    final_verification_status: "PARTIAL_LOCAL_RUNTIME_BOUNDARY",
                    evidence_or_notes: `${functionExportRuntimeEvidence.evidence} Source manifest ${currentFunctionSourceManifestSha256}.`,
                }
                : {};
        add({
            item_type: "firebase-function-export",
            product_area: product,
            route_or_component: "functions/src/index.ts",
            screen_or_tab: name,
            feature_flag_state: environmentState,
            control_or_action: `export:${name}`,
            expected_behavior: "Resolve trigger, region, authorization, bounds, idempotency, retry, logging, and cost contract",
            backing_api_dal_data_path: "TRACE_FUNCTION_EXPORT",
            test_type: "source-emulator-and-deployed-readback-as-applicable",
            evidence_or_notes: `${product === "MenuList" ? "MenuList-owned export" : "Fail-closed Answerlattice compatibility boundary"}; functions/src/index.ts:${line}`,
            ...runtimeFields,
        });
    }
}

const output = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((column) => csv(row[column])).join(",")),
].join("\n");

fs.writeFileSync(OUTPUT, `${output}\n`, "utf8");

const counts = rows.reduce((summary, row) => {
    summary.total += 1;
    summary.byType[row.item_type] = (summary.byType[row.item_type] ?? 0) + 1;
    summary.byProduct[row.product_area] = (summary.byProduct[row.product_area] ?? 0) + 1;
    return summary;
}, { total: 0, byType: {}, byProduct: {} });

console.log(JSON.stringify({ output: relative(OUTPUT), ...counts }, null, 2));
