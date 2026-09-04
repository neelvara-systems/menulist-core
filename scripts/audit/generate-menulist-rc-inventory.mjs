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
const currentLocalOwnerControlEvidence = runtimeEvidence.currentLocalOwnerControlInteractions ?? null;
const localPlatformControlEvidence = runtimeEvidence.localPlatformControlInteractions ?? null;
const publicCustomerControlEvidence = runtimeEvidence.publicCustomerControlInteractions ?? null;
const currentLocalPublicControlEvidence = runtimeEvidence.currentLocalPublicControlInteractions ?? null;
const creativeEditorControlEvidence = runtimeEvidence.creativeEditorControlInteractions ?? null;
const creativeEditorNativeBoundaryEvidence = runtimeEvidence.creativeEditorNativeBoundaryControls ?? null;
const creativeEditorNotShippedEvidence = runtimeEvidence.creativeEditorNotShippedControls ?? null;
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
const websiteHomepageControlEvidence = runtimeEvidence.websiteHomepageControlInteractions ?? null;
const websiteFaqControlEvidence = runtimeEvidence.websiteFaqControlInteractions ?? null;
const websiteIndustryControlEvidence = runtimeEvidence.websiteIndustryControlInteractions ?? null;
const websiteInformationalControlEvidence = runtimeEvidence.websiteInformationalControlInteractions ?? null;
const websiteWhatsappControlEvidence = runtimeEvidence.websiteWhatsappControlInteractions ?? null;
const websiteResourceArticleControlEvidence = runtimeEvidence.websiteResourceArticleControlInteractions ?? null;
const websitePublicFeatureControlEvidence = runtimeEvidence.websitePublicFeatureControlInteractions ?? null;
const websiteFooterControlEvidence = runtimeEvidence.websiteFooterControlInteractions ?? null;
const localMobileOwnerControlEvidence = runtimeEvidence.localMobileOwnerControlInteractions ?? null;
const bulkActionsControlEvidence = runtimeEvidence.bulkActionsControlInteractions ?? null;
const mobileMoreControlEvidence = runtimeEvidence.mobileMoreControlInteractions ?? null;
const mobileMoreFeatureDisabledControlEvidence = runtimeEvidence.mobileMoreFeatureDisabledControls ?? null;
const mobileMoreSafetyBlockedControlEvidence = runtimeEvidence.mobileMoreSafetyBlockedControls ?? null;
const mobileMenuControlEvidence = runtimeEvidence.mobileMenuControlInteractions ?? null;
const mobileMenuNativeBoundaryControlEvidence = runtimeEvidence.mobileMenuNativeBoundaryControls ?? null;
const mobileItemEditAlternateFixtureEvidence = runtimeEvidence.mobileItemEditAlternateFixtureControls ?? null;
const mobileItemEditProviderBoundaryEvidence = runtimeEvidence.mobileItemEditProviderBoundaryControl ?? null;
const mobileItemProductTagCurrentIntegrationEvidence = runtimeEvidence.mobileItemProductTagCurrentIntegrationControl ?? null;
const mobileShareControlEvidence = runtimeEvidence.mobileShareControlInteractions ?? null;
const mobileShareFeatureDisabledControlEvidence = runtimeEvidence.mobileShareFeatureDisabledControls ?? null;
const mobileShareNotShippedControlEvidence = runtimeEvidence.mobileShareNotShippedControls ?? null;
const mobileShareNativeBoundaryControlEvidence = runtimeEvidence.mobileShareNativeBoundaryControls ?? null;
const printableAssetControlEvidence = runtimeEvidence.printableAssetControlInteractions ?? null;
const printableAssetNativeBoundaryControlEvidence = runtimeEvidence.printableAssetNativeBoundaryControls ?? null;
const platformNotificationMonitorControlEvidence = runtimeEvidence.platformNotificationMonitorControlInteractions ?? null;
const platformNotificationMonitorNativeBoundaryControlEvidence = runtimeEvidence.platformNotificationMonitorNativeBoundaryControls ?? null;
const ownerNotificationMonitorControlEvidence = runtimeEvidence.ownerNotificationMonitorControlInteractions ?? null;
const ownerNotificationMonitorSafetyBlockedControlEvidence = runtimeEvidence.ownerNotificationMonitorSafetyBlockedControls ?? null;
const ownerNotificationMonitorNativeBoundaryControlEvidence = runtimeEvidence.ownerNotificationMonitorNativeBoundaryControls ?? null;
const opsControlRoomContinuationEvidence = runtimeEvidence.opsControlRoomContinuationInteractions ?? null;
const opsControlRoomSafetyBlockedEvidence = runtimeEvidence.opsControlRoomSafetyBlockedControls ?? null;
const resellerDesktopOnboardingContinuationEvidence = runtimeEvidence.resellerDesktopOnboardingContinuationInteractions ?? null;
const mobileResellerOnboardingContinuationEvidence = runtimeEvidence.mobileResellerOnboardingContinuationInteractions ?? null;
const mobileResellerManagementContinuationEvidence = runtimeEvidence.mobileResellerManagementContinuationInteractions ?? null;
const mobileResellerDashboardContinuationEvidence = runtimeEvidence.mobileResellerDashboardContinuationInteractions ?? null;
const desktopResellerManagementContinuationEvidence = runtimeEvidence.desktopResellerManagementContinuationInteractions ?? null;
const desktopResellerOfflineFeatureDisabledEvidence = runtimeEvidence.desktopResellerOfflineFeatureDisabledControls ?? null;
const mobileResellerOfflineFeatureDisabledEvidence = runtimeEvidence.mobileResellerOfflineFeatureDisabledControls ?? null;
const platformAssetTemplateLifecycleEvidence = runtimeEvidence.platformAssetTemplateLifecycleInteractions ?? null;
const reportLeadMonitorContinuationEvidence = runtimeEvidence.reportLeadMonitorContinuationInteractions ?? null;
const reportLeadMonitorNativeBoundaryEvidence = runtimeEvidence.reportLeadMonitorNativeBoundaryControls ?? null;
const websiteEnquiryMonitorContinuationEvidence = runtimeEvidence.websiteEnquiryMonitorContinuationInteractions ?? null;
const websiteEnquiryMonitorNativeBoundaryEvidence = runtimeEvidence.websiteEnquiryMonitorNativeBoundaryControls ?? null;
const platformUserContinuationEvidence = runtimeEvidence.platformUserContinuationInteractions ?? null;
const desktopAiImageGeneratorControlEvidence = runtimeEvidence.desktopAiImageGeneratorControlInteractions ?? null;
const desktopAiImageGeneratorProviderBlockedEvidence = runtimeEvidence.desktopAiImageGeneratorProviderBlockedControls ?? null;
const desktopAiImageGeneratorNativeBoundaryEvidence = runtimeEvidence.desktopAiImageGeneratorNativeBoundaryControls ?? null;
const desktopPosSyncContinuationEvidence = runtimeEvidence.desktopPosSyncContinuationInteractions ?? null;
const desktopPosSyncProviderBlockedEvidence = runtimeEvidence.desktopPosSyncProviderBlockedControls ?? null;
const desktopPosSyncNativeBoundaryEvidence = runtimeEvidence.desktopPosSyncNativeBoundaryControls ?? null;
const mobileSharedControlContinuationEvidence = runtimeEvidence.mobileSharedControlContinuationInteractions ?? null;
const mobileSharedNativeBoundaryEvidence = runtimeEvidence.mobileSharedNativeBoundaryControls ?? null;
const desktopProjectShareContinuationEvidence = runtimeEvidence.desktopProjectShareContinuationInteractions ?? null;
const desktopProjectShareExternalHandoffEvidence = runtimeEvidence.desktopProjectShareExternalHandoffControls ?? null;
const desktopProjectShareNativeBoundaryEvidence = runtimeEvidence.desktopProjectShareNativeBoundaryControls ?? null;
const desktopMenuCardExportContinuationEvidence = runtimeEvidence.desktopMenuCardExportContinuationInteractions ?? null;
const desktopMenuCardExportProviderBlockedEvidence = runtimeEvidence.desktopMenuCardExportProviderBlockedControls ?? null;
const desktopMenuCardExportNativeBoundaryEvidence = runtimeEvidence.desktopMenuCardExportNativeBoundaryControls ?? null;
const desktopMenuCardExportFixtureBlockedEvidence = runtimeEvidence.desktopMenuCardExportFixtureBlockedControls ?? null;
const desktopActiveSubscriptionLifecycleEvidence = runtimeEvidence.desktopActiveSubscriptionLifecycleInteractions ?? null;
const desktopActiveSubscriptionProviderBlockedEvidence = runtimeEvidence.desktopActiveSubscriptionProviderBlockedControls ?? null;
const desktopActiveSubscriptionFeatureDisabledEvidence = runtimeEvidence.desktopActiveSubscriptionFeatureDisabledControls ?? null;
const desktopTraditionalEditorContinuationEvidence = runtimeEvidence.desktopTraditionalEditorContinuationInteractions ?? null;
const desktopTraditionalEditorFixtureBlockedEvidence = runtimeEvidence.desktopTraditionalEditorFixtureBlockedControls ?? null;
const desktopCategoryEditorContinuationEvidence = runtimeEvidence.desktopCategoryEditorContinuationInteractions ?? null;
const desktopCategoryEditorProviderBlockedEvidence = runtimeEvidence.desktopCategoryEditorProviderBlockedControls ?? null;
const desktopCategoryEditorFixtureBlockedEvidence = runtimeEvidence.desktopCategoryEditorFixtureBlockedControls ?? null;
const desktopAiMenuManagerContinuationEvidence = runtimeEvidence.desktopAiMenuManagerContinuationInteractions ?? null;
const desktopAiMenuManagerProviderBlockedEvidence = runtimeEvidence.desktopAiMenuManagerProviderBlockedControls ?? null;
const desktopAiMenuManagerFixtureBlockedEvidence = runtimeEvidence.desktopAiMenuManagerFixtureBlockedControls ?? null;
const desktopPastActivityFeatureDisabledEvidence = runtimeEvidence.desktopPastActivityFeatureDisabledControls ?? null;
const desktopResellerOnboardingProviderResultEvidence = runtimeEvidence.desktopResellerOnboardingProviderResultControls ?? null;
const mobileExtractionReviewFixtureBlockedEvidence = runtimeEvidence.mobileExtractionReviewFixtureBlockedControls ?? null;
const desktopAiEditProviderResultEvidence = runtimeEvidence.desktopAiEditProviderResultControls ?? null;
const desktopAiEditNativeBoundaryEvidence = runtimeEvidence.desktopAiEditNativeBoundaryControls ?? null;
const desktopAiEditFixtureBlockedEvidence = runtimeEvidence.desktopAiEditFixtureBlockedControls ?? null;
const mediaImageAdjustNativeBoundaryEvidence = runtimeEvidence.mediaImageAdjustNativeBoundaryControls ?? null;
const batchImageGenerationProviderResultEvidence = runtimeEvidence.batchImageGenerationProviderResultControls ?? null;
const platformSentrySafetyBlockedEvidence = runtimeEvidence.platformSentrySafetyBlockedControls ?? null;
const platformSentryExternalHandoffEvidence = runtimeEvidence.platformSentryExternalHandoffControls ?? null;
const platformFontPresetFixtureBlockedEvidence = runtimeEvidence.platformFontPresetFixtureBlockedControls ?? null;
const platformFontPresetNativeBoundaryEvidence = runtimeEvidence.platformFontPresetNativeBoundaryControls ?? null;
const mobileBillingAlternateLifecycleEvidence = runtimeEvidence.mobileBillingAlternateLifecycleControls ?? null;
const mobileMenuAlternateFixtureEvidence = runtimeEvidence.mobileMenuAlternateFixtureControls ?? null;
const mobileMenuUploadNativeExtractionEvidence = runtimeEvidence.mobileMenuUploadNativeExtractionControls ?? null;
const desktopDomainSettingsExternalBoundaryEvidence = runtimeEvidence.desktopDomainSettingsExternalBoundaryControls ?? null;
const mobileHoursAlternateStateEvidence = runtimeEvidence.mobileHoursAlternateStateControls ?? null;
const mobileFeedbackFixtureBlockedEvidence = runtimeEvidence.mobileFeedbackFixtureBlockedControls ?? null;
const phoneOtpProviderBoundaryEvidence = runtimeEvidence.phoneOtpProviderBoundaryControls ?? null;
const mobileDomainSettingsExternalBoundaryEvidence = runtimeEvidence.mobileDomainSettingsExternalBoundaryControls ?? null;
const growthOsEntitlementProviderBoundaryEvidence = runtimeEvidence.growthOsEntitlementProviderBoundaryControls ?? null;
const analyticsGuideExternalHandoffEvidence = runtimeEvidence.analyticsGuideExternalHandoffControls ?? null;
const publicObpExternalHandoffEvidence = runtimeEvidence.publicObpExternalHandoffControls ?? null;
const publicObpPlaceholderFixtureEvidence = runtimeEvidence.publicObpPlaceholderFixtureControl ?? null;
const mobileResellerOnboardingProviderResultEvidence = runtimeEvidence.mobileResellerOnboardingProviderResultControls ?? null;
const printableAssetAlternateStateBoundaryEvidence = runtimeEvidence.printableAssetAlternateStateBoundaryControls ?? null;
const loginClaimLifecycleBoundaryEvidence = runtimeEvidence.loginClaimLifecycleBoundaryControls ?? null;
const mobileShareAlternateNativeBoundaryEvidence = runtimeEvidence.mobileShareAlternateNativeBoundaryControls ?? null;
const desktopUseMenuListAlternateStateEvidence = runtimeEvidence.desktopUseMenuListAlternateStateControls ?? null;
const desktopProjectLifecycleCurrentBrowserEvidence = runtimeEvidence.desktopProjectLifecycleCurrentBrowserControls ?? null;
const desktopProjectEditAlternateProviderEvidence = runtimeEvidence.desktopProjectEditAlternateProviderControls ?? null;
const desktopProjectEditLanguageFixtureEvidence = runtimeEvidence.desktopProjectEditLanguageFixtureControls ?? null;
const desktopSpecialMenuLanguageProviderEvidence = runtimeEvidence.desktopSpecialMenuLanguageProviderControls ?? null;
const desktopStoreCustomizationFixtureEvidence = runtimeEvidence.desktopStoreCustomizationFixtureControls ?? null;
const currentOwnerSettingsProjectReboundEvidence = runtimeEvidence.currentOwnerSettingsProjectReboundControls ?? null;
const ownerProjectProviderBoundaryEvidence = runtimeEvidence.ownerProjectProviderBoundaryControls ?? null;
const ownerSettingsNativeBoundaryEvidence = runtimeEvidence.ownerSettingsNativeBoundaryControls ?? null;
const ownerSettingsAlternateFixtureEvidence = runtimeEvidence.ownerSettingsAlternateFixtureControls ?? null;
const billingCancellationLifecycleEvidence = runtimeEvidence.billingCancellationLifecycleControls ?? null;
const currentOwnerMediaAnalyticsLifecycleEvidence = runtimeEvidence.currentOwnerMediaAnalyticsLifecycleControls ?? null;
const analyticsWizardExternalHandoffEvidence = runtimeEvidence.analyticsWizardExternalHandoffControls ?? null;
const ownerMediaNativeBoundaryEvidence = runtimeEvidence.ownerMediaNativeBoundaryControls ?? null;
const ownerMediaProviderBoundaryEvidence = runtimeEvidence.ownerMediaProviderBoundaryControls ?? null;
const ownerMediaFixtureBlockedEvidence = runtimeEvidence.ownerMediaFixtureBlockedControls ?? null;
const publicImageViewerInternalHandlersEvidence = runtimeEvidence.publicImageViewerInternalHandlers ?? null;
const ownerMediaDestructiveSafetyEvidence = runtimeEvidence.ownerMediaDestructiveSafetyControls ?? null;
const pricingOnboardingAlternateLifecycleEvidence = runtimeEvidence.pricingOnboardingAlternateLifecycleControls ?? null;
const publicBusinessActionExternalHandoffEvidence = runtimeEvidence.publicBusinessActionExternalHandoffControls ?? null;
const publicBusinessActionFixtureEvidence = runtimeEvidence.publicBusinessActionFixtureControls ?? null;
const feedbackQrNativeAndExternalEvidence = runtimeEvidence.feedbackQrNativeAndExternalControls ?? null;
const currentAnalyticsSettingsDraftEvidence = runtimeEvidence.currentAnalyticsSettingsDraftControls ?? null;
const ownerAlternateFeatureFixtureEvidence = runtimeEvidence.ownerAlternateFeatureFixtureControls ?? null;
const ownerAiGenerationProviderBoundaryEvidence = runtimeEvidence.ownerAiGenerationProviderBoundaryControls ?? null;
const digitalScreenOwnerUploadNativeEvidence = runtimeEvidence.digitalScreenOwnerUploadNativeControls ?? null;
const ownerAlternateLifecycleComponentEvidence = runtimeEvidence.ownerAlternateLifecycleComponentControls ?? null;
const ownerNativeArtifactComponentEvidence = runtimeEvidence.ownerNativeArtifactComponentControls ?? null;
const ownerProviderDependentComponentEvidence = runtimeEvidence.ownerProviderDependentComponentControls ?? null;
const publicSharingExternalComponentEvidence = runtimeEvidence.publicSharingExternalComponentControls ?? null;
const currentBehavioralContractControlEvidence = runtimeEvidence.currentBehavioralContractControlCoverage ?? null;
const remainingAlternateFixtureComponentEvidence = runtimeEvidence.remainingAlternateFixtureComponentControls ?? null;
const remainingProviderDependentComponentEvidence = runtimeEvidence.remainingProviderDependentComponentControls ?? null;
const remainingNativeArtifactComponentEvidence = runtimeEvidence.remainingNativeArtifactComponentControls ?? null;
const currentAdjacentContractComponentEvidence = runtimeEvidence.currentAdjacentContractComponentControls ?? null;
const aiSearchExternalBoundaryEvidence = runtimeEvidence.aiSearchExternalBoundaryControls ?? null;
const notificationPreferredChannelBrowserEvidence = runtimeEvidence.notificationPreferredChannelBrowserControls ?? null;
const notificationWhatsAppFixtureEvidence = runtimeEvidence.notificationWhatsAppFixtureBlockedControls ?? null;
const businessSettingsReversibleBrowserEvidence = runtimeEvidence.businessSettingsReversibleBrowserControls ?? null;
const feedbackReviewExternalHandoffEvidence = runtimeEvidence.feedbackReviewExternalHandoffControl ?? null;
const platformPullApiKeyBrowserEvidence = runtimeEvidence.platformPullApiKeyBrowserControls ?? null;
const platformPullApiKeyNativeClipboardEvidence = runtimeEvidence.platformPullApiKeyNativeClipboardControl ?? null;
const socialMediaDraftBrowserEvidence = runtimeEvidence.socialMediaDraftBrowserControls ?? null;
const compliancePageLifecycleBrowserEvidence = runtimeEvidence.compliancePageLifecycleBrowserControls ?? null;
const googleListingReminderBrowserEvidence = runtimeEvidence.googleListingReminderBrowserControl ?? null;
const googleListingNativeClipboardEvidence = runtimeEvidence.googleListingNativeClipboardControls ?? null;
const googleListingExternalHandoffEvidence = runtimeEvidence.googleListingExternalHandoffControls ?? null;
const businessSettingsSaveLifecycleEvidence = runtimeEvidence.businessSettingsSaveLifecycleControls ?? null;
const timeSlotPresetEntryBrowserEvidence = runtimeEvidence.timeSlotPresetEntryBrowserControl ?? null;
const workingHoursDraftBrowserEvidence = runtimeEvidence.workingHoursDraftBrowserControl ?? null;
const businessCopyProviderBoundaryEvidence = runtimeEvidence.businessCopyProviderBoundaryControl ?? null;
const businessCopyRepairFixtureEvidence = runtimeEvidence.businessCopyRepairFixtureControl ?? null;
const websiteAuthenticatedDashboardEvidence = runtimeEvidence.websiteAuthenticatedDashboardControl ?? null;
const websiteLogoutSafetyEvidence = runtimeEvidence.websiteLogoutSafetyControl ?? null;
const transactionsPaginationFixtureEvidence = runtimeEvidence.transactionsPaginationFixtureControls ?? null;
const feedbackCardExternalReplyEvidence = runtimeEvidence.feedbackCardExternalReplyControls ?? null;
const feedbackCardNativeReplyCopyEvidence = runtimeEvidence.feedbackCardNativeReplyCopyControl ?? null;
const messagePreviewSuccessFixtureEvidence = runtimeEvidence.messagePreviewSuccessFixtureControls ?? null;
const messagePreviewWhatsAppHandoffEvidence = runtimeEvidence.messagePreviewWhatsAppHandoffControl ?? null;
const obpMenuCtaAlternateLifecycleEvidence = runtimeEvidence.obpMenuCtaAlternateLifecycleControls ?? null;
const obpMenuCtaCommentEvidence = runtimeEvidence.obpMenuCtaCommentCandidate ?? null;
const menuBreadcrumbAlternateLayoutEvidence = runtimeEvidence.menuBreadcrumbAlternateLayoutControls ?? null;
const globalErrorRuntimeEvidence = runtimeEvidence.globalErrorRuntimeControls ?? null;
const rootErrorRuntimeEvidence = runtimeEvidence.rootErrorRuntimeControls ?? null;
const storeAccessRecoveryRuntimeEvidence = runtimeEvidence.storeAccessRecoveryRuntimeControls ?? null;
const mobileTextCaseReversibleEvidence = runtimeEvidence.mobileTextCaseReversibleControls ?? null;
const mobileTextCaseMaskBoundaryEvidence = runtimeEvidence.mobileTextCaseMaskBoundaryControl ?? null;
const mobileTextCaseApplySafetyEvidence = runtimeEvidence.mobileTextCaseApplySafetyControl ?? null;
const decisionBlocksReversibleEvidence = runtimeEvidence.decisionBlocksReversibleBrowserControls ?? null;
const decisionBlocksSaveSafetyEvidence = runtimeEvidence.decisionBlocksSaveSafetyControl ?? null;
const decisionChoicePosterDesktopEvidence = runtimeEvidence.decisionChoicePosterDesktopBrowserControl ?? null;
const decisionChoicePosterMobileEvidence = runtimeEvidence.decisionChoicePosterMobileComponentControl ?? null;
const mobileNotificationReversibleEvidence = runtimeEvidence.mobileNotificationReversibleBrowserControls ?? null;
const mobileNotificationWhatsAppFixtureEvidence = runtimeEvidence.mobileNotificationWhatsAppFixtureControl ?? null;
const mobileNotificationSaveSafetyEvidence = runtimeEvidence.mobileNotificationSaveSafetyControl ?? null;
const mobileAdvancedSocialEditorEvidence = runtimeEvidence.mobileAdvancedSocialEditorBrowserControls ?? null;
const mobileAdvancedSocialExternalEvidence = runtimeEvidence.mobileAdvancedSocialExternalControl ?? null;
const mobileAdvancedSocialRemoveFixtureEvidence = runtimeEvidence.mobileAdvancedSocialRemoveFixtureControl ?? null;
const creativeEditorAlternateDraftQrEvidence = runtimeEvidence.creativeEditorAlternateDraftQrControls ?? null;
const businessHealthProjectScopeCurrentEvidence = runtimeEvidence.businessHealthProjectScopeCurrentControls ?? null;
const publicTruthOwnerCheckCurrentEvidence = runtimeEvidence.publicTruthOwnerCheckCurrentControls ?? null;
const publicTruthMonitorCurrentEvidence = runtimeEvidence.publicTruthMonitorCurrentControls ?? null;
const verticalSidebarCurrentEvidence = runtimeEvidence.verticalSidebarCurrentControls ?? null;
const horizontalSidebarCurrentEvidence = runtimeEvidence.horizontalSidebarCurrentControls ?? null;
const appBreadcrumbCurrentEvidence = runtimeEvidence.appBreadcrumbCurrentControls ?? null;
const analyticsExportRuntimeEvidence = runtimeEvidence.analyticsExportRuntimeControls ?? null;
const projectConfirmModalRuntimeEvidence = runtimeEvidence.projectConfirmModalRuntimeControls ?? null;
const errorRecoveryAlertRuntimeEvidence = runtimeEvidence.errorRecoveryAlertRuntimeControls ?? null;
const projectSelectorRuntimeEvidence = runtimeEvidence.projectSelectorRuntimeControls ?? null;
const aiSearchActionButtonsRuntimeEvidence = runtimeEvidence.aiSearchActionButtonsRuntimeControls ?? null;
const aiSearchSearchBarRuntimeEvidence = runtimeEvidence.aiSearchSearchBarRuntimeControls ?? null;
const aiSearchLocalResultsRuntimeEvidence = runtimeEvidence.aiSearchLocalResultsRuntimeControls ?? null;
const welcomeModalRuntimeEvidence = runtimeEvidence.welcomeModalRuntimeControls ?? null;
const upgradeConfirmationRuntimeEvidence = runtimeEvidence.upgradeConfirmationRuntimeControls ?? null;
const messageReferencesRuntimeEvidence = runtimeEvidence.messageReferencesRuntimeControls ?? null;
const creditPackRuntimeEvidence = runtimeEvidence.creditPackRuntimeControls ?? null;
const creditPackSignInExternalEvidence = runtimeEvidence.creditPackSignInExternalBoundaryControl ?? null;
const privacyPolicyMailtoBoundaryEvidence = runtimeEvidence.privacyPolicyMailtoBoundaryControls ?? null;
const remainingCurrentComponentControlEvidence = runtimeEvidence.remainingCurrentComponentControlInteractions ?? null;
const remainingCurrentBrowserControlEvidence = runtimeEvidence.remainingCurrentBrowserControlInteractions ?? null;
const remainingCurrentNativeBoundaryEvidence = runtimeEvidence.remainingCurrentNativeBoundaryControls ?? null;
const remainingCurrentExternalBoundaryEvidence = runtimeEvidence.remainingCurrentExternalBoundaryControls ?? null;
const remainingCurrentProviderBoundaryEvidence = runtimeEvidence.remainingCurrentProviderBoundaryControls ?? null;
const remainingCurrentNotTriggerableEvidence = runtimeEvidence.remainingCurrentNotUserTriggerableControls ?? null;
const remainingCurrentAlternateLifecycleEvidence = runtimeEvidence.remainingCurrentAlternateLifecycleControls ?? null;
const remainingCurrentSafetyBoundaryEvidence = runtimeEvidence.remainingCurrentSafetyBoundaryControls ?? null;
const remainingCurrentFixtureBoundaryEvidence = runtimeEvidence.remainingCurrentFixtureBoundaryControls ?? null;
const currentPrintableDesktopBrowserEvidence = runtimeEvidence.currentPrintableDesktopBrowserControls ?? null;
const currentItemProductTagDesktopBrowserEvidence = runtimeEvidence.currentItemProductTagDesktopBrowserControls ?? null;
const currentPrintableAlternateLifecycleEvidence = runtimeEvidence.currentPrintableAlternateLifecycleControls ?? null;
const currentPrintableSafetyEvidence = runtimeEvidence.currentPrintableSafetyControls ?? null;
const currentPrintableFixtureEvidence = runtimeEvidence.currentPrintableFixtureControls ?? null;
const currentPrintableNativeEvidence = runtimeEvidence.currentPrintableNativeControls ?? null;
const currentPrintableExternalEvidence = runtimeEvidence.currentPrintableExternalControls ?? null;
const pricingPlansModalRuntimeEvidence = runtimeEvidence.pricingPlansModalRuntimeControls ?? null;
const editSpecialMenuScheduleRuntimeEvidence = runtimeEvidence.editSpecialMenuScheduleRuntimeControls ?? null;
const menuFiltersRuntimeEvidence = runtimeEvidence.menuFiltersRuntimeControls ?? null;
const menuLanguageSwitcherRuntimeEvidence = runtimeEvidence.menuLanguageSwitcherRuntimeControls ?? null;
const transactionDetailsRuntimeEvidence = runtimeEvidence.transactionDetailsRuntimeControls ?? null;
const articleViewModalRecoveryRuntimeEvidence = runtimeEvidence.articleViewModalRecoveryRuntimeControls ?? null;
const publicCookieConsentRuntimeEvidence = runtimeEvidence.publicCookieConsentRuntimeControls ?? null;
const masterUpdateBannerRuntimeEvidence = runtimeEvidence.masterUpdateBannerRuntimeControls ?? null;
const dateRangeSelectorRuntimeEvidence = runtimeEvidence.dateRangeSelectorRuntimeControls ?? null;
const installInstructionsRuntimeEvidence = runtimeEvidence.installInstructionsRuntimeControls ?? null;
const installPromptRuntimeEvidence = runtimeEvidence.installPromptRuntimeControls ?? null;
const lucideIconGridRuntimeEvidence = runtimeEvidence.lucideIconGridRuntimeControls ?? null;
const mobileTempStatusConfiguratorRuntimeEvidence = runtimeEvidence.mobileTempStatusConfiguratorRuntimeControls ?? null;
const mobileMenuCommandSheetRuntimeEvidence = runtimeEvidence.mobileMenuCommandSheetRuntimeControls ?? null;
const mobileCompliancePagesRuntimeEvidence = runtimeEvidence.mobileCompliancePagesRuntimeControls ?? null;
const mobileCompliancePageExternalEvidence = runtimeEvidence.mobileCompliancePageExternalBoundaryControl ?? null;
const mobileSchedulerMonitorRuntimeEvidence = runtimeEvidence.mobileSchedulerMonitorRuntimeControls ?? null;
const mobileSchedulerRecoverySafetyEvidence = runtimeEvidence.mobileSchedulerRecoverySafetyBoundaryControl ?? null;
const commandCenterActiveInactiveRuntimeEvidence = runtimeEvidence.commandCenterActiveInactiveRuntimeControls ?? null;
const commandCenterAvailabilityRuntimeEvidence = runtimeEvidence.commandCenterAvailabilityRuntimeControls ?? null;
const commandCenterPricingRuntimeEvidence = runtimeEvidence.commandCenterPricingRuntimeControls ?? null;
const commandCenterTextCaseRuntimeEvidence = runtimeEvidence.commandCenterTextCaseRuntimeControls ?? null;
const languageSelectorRuntimeEvidence = runtimeEvidence.languageSelectorRuntimeControls ?? null;
const ownerAppUpdatePromptRuntimeEvidence = runtimeEvidence.ownerAppUpdatePromptRuntimeControls ?? null;
const ownerAppUpdateRefreshNativeEvidence = runtimeEvidence.ownerAppUpdateRefreshNativeBoundaryControl ?? null;
const starRatingRuntimeEvidence = runtimeEvidence.starRatingRuntimeControl ?? null;
const mediaAspectRatioRuntimeEvidence = runtimeEvidence.mediaAspectRatioRuntimeControl ?? null;
const ownerAssistantInputRuntimeEvidence = runtimeEvidence.ownerAssistantInputRuntimeControls ?? null;
const reorderSortableItemRuntimeEvidence = runtimeEvidence.reorderSortableItemRuntimeControls ?? null;
const billingHistoryEmailRuntimeEvidence = runtimeEvidence.billingHistoryEmailRuntimeControl ?? null;
const billingHistoryInvoiceExternalEvidence = runtimeEvidence.billingHistoryInvoiceExternalBoundaryControl ?? null;
const analyticsEmptyStateRuntimeEvidence = runtimeEvidence.analyticsEmptyStateRuntimeControl ?? null;
const analyticsRefreshRuntimeEvidence = runtimeEvidence.analyticsRefreshRuntimeControl ?? null;
const analyticsMetricCardRuntimeEvidence = runtimeEvidence.analyticsMetricCardRuntimeControl ?? null;
const analyticsStatCardRuntimeEvidence = runtimeEvidence.analyticsStatCardRuntimeControl ?? null;
const mobileLocalizedLanguageRuntimeEvidence = runtimeEvidence.mobileLocalizedLanguageRuntimeControl ?? null;
const searchSuggestionsRuntimeEvidence = runtimeEvidence.searchSuggestionsRuntimeControl ?? null;
const businessHealthSuggestedQuestionRuntimeEvidence = runtimeEvidence.businessHealthSuggestedQuestionRuntimeControl ?? null;
const ownerAssistantSourceDisclosureRuntimeEvidence = runtimeEvidence.ownerAssistantSourceDisclosureRuntimeControl ?? null;
const mobileLinkCardRuntimeEvidence = runtimeEvidence.mobileLinkCardRuntimeControl ?? null;
const menuFilterChipsRuntimeEvidence = runtimeEvidence.menuFilterChipsRuntimeControl ?? null;
const analyticsDataTableSearchRuntimeEvidence = runtimeEvidence.analyticsDataTableSearchRuntimeControl ?? null;
const analyticsFeedbackListRuntimeEvidence = runtimeEvidence.analyticsFeedbackListRuntimeControl ?? null;
const analyticsKnowledgeGapsRuntimeEvidence = runtimeEvidence.analyticsKnowledgeGapsRuntimeControl ?? null;
const analyticsTopQuestionsRuntimeEvidence = runtimeEvidence.analyticsTopQuestionsRuntimeControl ?? null;
const skipToContentRuntimeEvidence = runtimeEvidence.skipToContentRuntimeControl ?? null;
const scrollToBottomRuntimeEvidence = runtimeEvidence.scrollToBottomRuntimeControl ?? null;
const backToTopRuntimeEvidence = runtimeEvidence.backToTopRuntimeControl ?? null;
const emojiGridSearchRuntimeEvidence = runtimeEvidence.emojiGridSearchRuntimeControl ?? null;
const todayPrimaryCardRuntimeEvidence = runtimeEvidence.todayPrimaryCardRuntimeControls ?? null;
const businessHealthHeaderRuntimeEvidence = runtimeEvidence.businessHealthHeaderRuntimeControl ?? null;
const loadingMessageCancelRuntimeEvidence = runtimeEvidence.loadingMessageCancelRuntimeControl ?? null;
const aiButtonIconRuntimeEvidence = runtimeEvidence.aiButtonIconRuntimeControl ?? null;
const knowledgeBaseSourceFileRuntimeEvidence = runtimeEvidence.knowledgeBaseSourceFileRuntimeControl ?? null;
const todayOperationalSectionRuntimeEvidence = runtimeEvidence.todayOperationalSectionRuntimeControl ?? null;
const noSubscriptionViewPlansRuntimeEvidence = runtimeEvidence.noSubscriptionViewPlansRuntimeControl ?? null;
const emptyProjectStateRuntimeEvidence = runtimeEvidence.emptyProjectStateRuntimeControl ?? null;
const feedbackIntelligenceDisclosureRuntimeEvidence = runtimeEvidence.feedbackIntelligenceDisclosureRuntimeControl ?? null;
const CREATIVE_EDITOR_RUNTIME_SOURCE_FILES = [
    "src/modules/creative-editor/CreativeEditor.tsx",
    "src/app/(internal)/creative-editor-smoke/CreativeEditorSmokeClient.tsx",
    "src/app/(internal)/creative-editor-smoke/page.tsx",
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
const creativeEditorNativeBoundaryEvidenceIsCurrent = (
    creativeEditorNativeBoundaryEvidence?.result === "PASS"
    && creativeEditorNativeBoundaryEvidence?.sourceManifestSha256
        === currentCreativeEditorSourceManifestSha256
);
const creativeEditorNotShippedEvidenceIsCurrent = (
    creativeEditorNotShippedEvidence?.result === "PASS"
    && creativeEditorNotShippedEvidence?.sourceManifestSha256
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
const PLATFORM_NOTIFICATION_MONITOR_SOURCE_FILE = "src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx";
const platformNotificationMonitorControlEvidenceIsCurrent = (
    platformNotificationMonitorControlEvidence?.result === "PASS"
    && platformNotificationMonitorControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PLATFORM_NOTIFICATION_MONITOR_SOURCE_FILE)
);
const platformNotificationMonitorNativeBoundaryControlEvidenceIsCurrent = (
    platformNotificationMonitorNativeBoundaryControlEvidence?.result === "PASS"
    && platformNotificationMonitorNativeBoundaryControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(PLATFORM_NOTIFICATION_MONITOR_SOURCE_FILE)
);
const OWNER_NOTIFICATION_MONITOR_SOURCE_FILE = "src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx";
const ownerNotificationMonitorControlEvidenceIsCurrent = (
    ownerNotificationMonitorControlEvidence?.result === "PASS"
    && ownerNotificationMonitorControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(OWNER_NOTIFICATION_MONITOR_SOURCE_FILE)
);
const ownerNotificationMonitorSafetyBlockedControlEvidenceIsCurrent = (
    ownerNotificationMonitorSafetyBlockedControlEvidence?.result === "PASS"
    && ownerNotificationMonitorSafetyBlockedControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(OWNER_NOTIFICATION_MONITOR_SOURCE_FILE)
);
const ownerNotificationMonitorNativeBoundaryControlEvidenceIsCurrent = (
    ownerNotificationMonitorNativeBoundaryControlEvidence?.result === "PASS"
    && ownerNotificationMonitorNativeBoundaryControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(OWNER_NOTIFICATION_MONITOR_SOURCE_FILE)
);
const OPS_CONTROL_ROOM_SOURCE_FILE = "src/components/templates/main-app/platform/opsControlRoom/index.tsx";
const opsControlRoomContinuationEvidenceIsCurrent = (
    opsControlRoomContinuationEvidence?.result === "PASS"
    && opsControlRoomContinuationEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(OPS_CONTROL_ROOM_SOURCE_FILE)
);
const opsControlRoomSafetyBlockedEvidenceIsCurrent = (
    opsControlRoomSafetyBlockedEvidence?.result === "PASS"
    && opsControlRoomSafetyBlockedEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(OPS_CONTROL_ROOM_SOURCE_FILE)
);
const isCurrentSingleSourceEvidence = (evidence, relativePath) => (
    evidence?.result === "PASS"
    && evidence?.sourceManifestSha256 === currentSingleSourceManifestSha256(relativePath)
);
const currentSourceManifestSha256 = (relativePaths) => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of relativePaths) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
};
const isCurrentMultiSourceEvidence = (evidence, relativePaths) => (
    evidence?.result === "PASS"
    && evidence?.sourceManifestSha256 === currentSourceManifestSha256(relativePaths)
);
const REMAINING_CURRENT_COMPONENT_CONTROL_SOURCE_FILES = [
    "src/components/antdComponent/drawerElement/index.tsx",
    "src/components/mobile/components/MobileBusinessHealthCard.tsx",
    "src/components/templates/main-app/projects/ProcessGuideModal.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantMessageList.tsx",
    "src/components/templates/main-app/projects/editorView/EditorWelcomeBanner.tsx",
    "src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx",
    "src/components/templates/main-app/projects/jobScreens/ExtractionJobSuccessModal.tsx",
    "src/components/website/pricing-pages/FeatureComparisonTable.tsx",
    "src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx",
];
const remainingCurrentComponentControlEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    remainingCurrentComponentControlEvidence,
    REMAINING_CURRENT_COMPONENT_CONTROL_SOURCE_FILES,
);
const REMAINING_CURRENT_BROWSER_CONTROL_SOURCE_FILES = [
    "src/components/templates/main-app/dashboard/MenuQualitySignals.tsx",
    "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx",
];
const remainingCurrentBrowserControlEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    remainingCurrentBrowserControlEvidence,
    REMAINING_CURRENT_BROWSER_CONTROL_SOURCE_FILES,
);
const interactionSourceFiles = (evidence) => [
    ...new Set((evidence?.interactions ?? []).map((interaction) => interaction.source)),
];
const isCurrentInteractionSourceEvidence = (evidence) => (
    evidence?.result === "PASS"
    && evidence?.sourceManifestSha256 === currentSourceManifestSha256(interactionSourceFiles(evidence))
);
const remainingCurrentNativeBoundaryEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentNativeBoundaryEvidence);
const remainingCurrentExternalBoundaryEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentExternalBoundaryEvidence);
const remainingCurrentProviderBoundaryEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentProviderBoundaryEvidence);
const remainingCurrentNotTriggerableEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentNotTriggerableEvidence);
const remainingCurrentAlternateLifecycleEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentAlternateLifecycleEvidence);
const remainingCurrentSafetyBoundaryEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentSafetyBoundaryEvidence);
const remainingCurrentFixtureBoundaryEvidenceIsCurrent = isCurrentInteractionSourceEvidence(remainingCurrentFixtureBoundaryEvidence);
const currentPrintableDesktopBrowserEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableDesktopBrowserEvidence);
const currentItemProductTagDesktopBrowserEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentItemProductTagDesktopBrowserEvidence);
const currentPrintableAlternateLifecycleEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableAlternateLifecycleEvidence);
const currentPrintableSafetyEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableSafetyEvidence);
const currentPrintableFixtureEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableFixtureEvidence);
const currentPrintableNativeEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableNativeEvidence);
const currentPrintableExternalEvidenceIsCurrent = isCurrentInteractionSourceEvidence(currentPrintableExternalEvidence);
const resellerDesktopOnboardingContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    resellerDesktopOnboardingContinuationEvidence,
    "src/components/templates/main-app/reseller/OnboardingWizard.tsx",
);
const mobileResellerOnboardingContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileResellerOnboardingContinuationEvidence,
    "src/components/mobile/screens/MobileResellerOnboardingScreen.tsx",
);
const mobileResellerManagementContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileResellerManagementContinuationEvidence,
    "src/components/mobile/screens/MobileResellerManagementScreen.tsx",
);
const mobileResellerDashboardContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileResellerDashboardContinuationEvidence,
    "src/components/mobile/screens/MobileResellerDashboardScreen.tsx",
);
const desktopResellerManagementContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopResellerManagementContinuationEvidence,
    "src/components/templates/main-app/reseller/ResellerManagement.tsx",
);
const desktopResellerOfflineFeatureDisabledEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopResellerOfflineFeatureDisabledEvidence,
    "src/components/templates/main-app/reseller/ResellerDashboard.tsx",
);
const mobileResellerOfflineFeatureDisabledEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileResellerOfflineFeatureDisabledEvidence,
    "src/components/mobile/screens/MobileResellerDashboardScreen.tsx",
);
const platformAssetTemplateLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformAssetTemplateLifecycleEvidence,
    "src/components/templates/platform/assetTemplates/index.tsx",
);
const desktopAiImageGeneratorControlEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiImageGeneratorControlEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx",
);
const desktopAiImageGeneratorProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiImageGeneratorProviderBlockedEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx",
);
const desktopAiImageGeneratorNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiImageGeneratorNativeBoundaryEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx",
);
const desktopPosSyncContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopPosSyncContinuationEvidence,
    "src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx",
);
const desktopPosSyncProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopPosSyncProviderBlockedEvidence,
    "src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx",
);
const desktopPosSyncNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopPosSyncNativeBoundaryEvidence,
    "src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx",
);
const mobileSharedControlContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileSharedControlContinuationEvidence,
    "src/components/mobile/antd.tsx",
);
const mobileSharedNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileSharedNativeBoundaryEvidence,
    "src/components/mobile/antd.tsx",
);
const desktopProjectShareContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopProjectShareContinuationEvidence,
    "src/components/templates/main-app/projects/b2cView/shareModal/index.tsx",
);
const desktopProjectShareExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopProjectShareExternalHandoffEvidence,
    "src/components/templates/main-app/projects/b2cView/shareModal/index.tsx",
);
const desktopProjectShareNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopProjectShareNativeBoundaryEvidence,
    "src/components/templates/main-app/projects/b2cView/shareModal/index.tsx",
);
const desktopMenuCardExportContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopMenuCardExportContinuationEvidence,
    "src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx",
);
const desktopMenuCardExportProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopMenuCardExportProviderBlockedEvidence,
    "src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx",
);
const desktopMenuCardExportNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopMenuCardExportNativeBoundaryEvidence,
    "src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx",
);
const desktopMenuCardExportFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopMenuCardExportFixtureBlockedEvidence,
    "src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx",
);
const desktopActiveSubscriptionLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopActiveSubscriptionLifecycleEvidence,
    "src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx",
);
const desktopActiveSubscriptionProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopActiveSubscriptionProviderBlockedEvidence,
    "src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx",
);
const desktopActiveSubscriptionFeatureDisabledEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopActiveSubscriptionFeatureDisabledEvidence,
    "src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx",
);
const desktopTraditionalEditorContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopTraditionalEditorContinuationEvidence,
    "src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx",
);
const desktopTraditionalEditorFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopTraditionalEditorFixtureBlockedEvidence,
    "src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx",
);
const desktopCategoryEditorContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopCategoryEditorContinuationEvidence,
    "src/components/templates/main-app/projects/editorView/editCategoryModal.tsx",
);
const desktopCategoryEditorProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopCategoryEditorProviderBlockedEvidence,
    "src/components/templates/main-app/projects/editorView/editCategoryModal.tsx",
);
const desktopCategoryEditorFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopCategoryEditorFixtureBlockedEvidence,
    "src/components/templates/main-app/projects/editorView/editCategoryModal.tsx",
);
const desktopAiMenuManagerContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiMenuManagerContinuationEvidence,
    "src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx",
);
const desktopAiMenuManagerProviderBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiMenuManagerProviderBlockedEvidence,
    "src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx",
);
const desktopAiMenuManagerFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiMenuManagerFixtureBlockedEvidence,
    "src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx",
);
const desktopPastActivityFeatureDisabledEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopPastActivityFeatureDisabledEvidence,
    "src/components/templates/main-app/today/PastActivity/index.tsx",
);
const desktopResellerOnboardingProviderResultEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopResellerOnboardingProviderResultEvidence,
    "src/components/templates/main-app/reseller/OnboardingWizard.tsx",
);
const mobileExtractionReviewFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileExtractionReviewFixtureBlockedEvidence,
    "src/components/mobile/sheets/ExtractionReviewSheet.tsx",
);
const desktopAiEditProviderResultEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiEditProviderResultEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx",
);
const desktopAiEditNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiEditNativeBoundaryEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx",
);
const desktopAiEditFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopAiEditFixtureBlockedEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx",
);
const mediaImageAdjustNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mediaImageAdjustNativeBoundaryEvidence,
    "src/components/shared/media/MediaImageAdjustModal.tsx",
);
const batchImageGenerationProviderResultEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    batchImageGenerationProviderResultEvidence,
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx",
);
const platformSentrySafetyBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformSentrySafetyBlockedEvidence,
    "src/components/pages/TestSentryPage/index.tsx",
);
const platformSentryExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformSentryExternalHandoffEvidence,
    "src/components/pages/TestSentryPage/index.tsx",
);
const platformFontPresetFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformFontPresetFixtureBlockedEvidence,
    "src/components/templates/platform/fontPresets/index.tsx",
);
const platformFontPresetNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformFontPresetNativeBoundaryEvidence,
    "src/components/templates/platform/fontPresets/index.tsx",
);
const mobileBillingAlternateLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileBillingAlternateLifecycleEvidence,
    "src/components/mobile/screens/MobileBillingScreen.tsx",
);
const mobileMenuAlternateFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileMenuAlternateFixtureEvidence,
    "src/components/mobile/screens/MobileMenuScreen.tsx",
);
const mobileMenuUploadNativeExtractionEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileMenuUploadNativeExtractionEvidence,
    "src/components/mobile/sheets/MenuUploadSheet.tsx",
);
const desktopDomainSettingsExternalBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopDomainSettingsExternalBoundaryEvidence,
    "src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx",
);
const mobileHoursAlternateStateEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileHoursAlternateStateEvidence,
    "src/components/mobile/screens/MobileHoursScreen.tsx",
);
const mobileFeedbackFixtureBlockedEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileFeedbackFixtureBlockedEvidence,
    "src/components/mobile/screens/MobileFeedbackScreen.tsx",
);
const phoneOtpProviderBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    phoneOtpProviderBoundaryEvidence,
    "src/components/auth/PhoneOtpAuthPanel.tsx",
);
const mobileDomainSettingsExternalBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileDomainSettingsExternalBoundaryEvidence,
    "src/components/mobile/screens/MobileDomainSettingsScreen.tsx",
);
const growthOsEntitlementProviderBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    growthOsEntitlementProviderBoundaryEvidence,
    "src/components/templates/main-app/growthos/index.tsx",
);
const analyticsGuideExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    analyticsGuideExternalHandoffEvidence,
    "src/components/templates/main-app/businessSettings/tabs/AnalyticsGuideModal.tsx",
);
const publicObpExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    publicObpExternalHandoffEvidence,
    "src/app/client/obp/OBPExternalLinks.tsx",
);
const publicObpPlaceholderFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    publicObpPlaceholderFixtureEvidence,
    "src/app/client/obp/OBPExternalLinks.tsx",
);
const mobileResellerOnboardingProviderResultEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileResellerOnboardingProviderResultEvidence,
    "src/components/mobile/screens/MobileResellerOnboardingScreen.tsx",
);
const printableAssetAlternateStateBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    printableAssetAlternateStateBoundaryEvidence,
    "src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx",
);
const loginClaimLifecycleBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    loginClaimLifecycleBoundaryEvidence,
    "src/components/templates/loginPage/index.tsx",
);
const mobileShareAlternateNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileShareAlternateNativeBoundaryEvidence,
    "src/components/mobile/screens/MobileShareScreen.tsx",
);
const desktopUseMenuListAlternateStateEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopUseMenuListAlternateStateEvidence,
    "src/components/templates/main-app/useMenuList/index.tsx",
);
const desktopProjectLifecycleCurrentBrowserEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    desktopProjectLifecycleCurrentBrowserEvidence,
    [
        "src/components/templates/main-app/projects/ProjectDetails/ProjectSelector.tsx",
        "src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx",
        "src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx",
        "src/components/templates/main-app/projects/editorView/BulkStatusMenuModal.tsx",
    ],
);
const desktopProjectEditAlternateProviderEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopProjectEditAlternateProviderEvidence,
    "src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx",
);
const desktopProjectEditLanguageFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopProjectEditLanguageFixtureEvidence,
    "src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx",
);
const desktopSpecialMenuLanguageProviderEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopSpecialMenuLanguageProviderEvidence,
    "src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx",
);
const desktopStoreCustomizationFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    desktopStoreCustomizationFixtureEvidence,
    "src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx",
);
const currentOwnerSettingsProjectReboundEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    currentOwnerSettingsProjectReboundEvidence,
    [
        "src/components/mobile/components/MobileProjectSelectorSheet.tsx",
        "src/components/mobile/screens/MobileCustomerAppScreen.tsx",
        "src/components/mobile/screens/MobileRolesScreen.tsx",
        "src/components/mobile/sheets/AppSettingsSheet.tsx",
        "src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx",
        "src/components/templates/main-app/projects/editorView/EditorContent.tsx",
        "src/components/mobile/screens/MobileLocaleSettingsScreen.tsx",
        "src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx",
        "src/components/templates/main-app/projects/index.tsx",
    ],
);
const ownerProjectProviderBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerProjectProviderBoundaryEvidence,
    [
        "src/components/mobile/components/MobileProjectSelectorSheet.tsx",
        "src/components/templates/main-app/projects/index.tsx",
    ],
);
const ownerSettingsNativeBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerSettingsNativeBoundaryEvidence,
    [
        "src/components/mobile/screens/MobileCustomerAppScreen.tsx",
        "src/components/mobile/sheets/AppSettingsSheet.tsx",
        "src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx",
        "src/components/templates/main-app/projects/index.tsx",
    ],
);
const ownerSettingsAlternateFixtureEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerSettingsAlternateFixtureEvidence,
    [
        "src/components/mobile/components/MobileProjectSelectorSheet.tsx",
        "src/components/mobile/screens/MobileCustomerAppScreen.tsx",
        "src/components/mobile/screens/MobileLocaleSettingsScreen.tsx",
        "src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx",
        "src/components/templates/main-app/projects/index.tsx",
    ],
);
const billingCancellationLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    billingCancellationLifecycleEvidence,
    "src/components/templates/main-app/billing/CancellationModal.tsx",
);
const currentOwnerMediaAnalyticsLifecycleEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    currentOwnerMediaAnalyticsLifecycleEvidence,
    [
        "src/components/mobile/components/MobileSpecialHoursManager.tsx",
        "src/components/mobile/screens/MobileDigitalScreensScreen.tsx",
        "src/components/mobile/sheets/ItemEditSheet.tsx",
        "src/components/templates/main-app/businessSettings/tabs/AnalyticsSetupWizard.tsx",
        "src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx",
        "src/components/templates/main-app/projects/FileList.tsx",
        "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx",
        "src/components/templates/main-app/projects/editorView/editItemModal.tsx",
    ],
);
const analyticsWizardExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    analyticsWizardExternalHandoffEvidence,
    "src/components/templates/main-app/businessSettings/tabs/AnalyticsSetupWizard.tsx",
);
const ownerMediaBoundarySourceFiles = [
    "src/components/mobile/sheets/ItemEditSheet.tsx",
    "src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx",
    "src/components/templates/platform/assets/detailsModal.tsx",
    "src/components/templates/main-app/projects/editorView/editItemModal.tsx",
];
const ownerMediaNativeBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerMediaNativeBoundaryEvidence,
    ownerMediaBoundarySourceFiles,
);
const ownerMediaProviderBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerMediaProviderBoundaryEvidence,
    ownerMediaBoundarySourceFiles,
);
const ownerMediaFixtureBlockedEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerMediaFixtureBlockedEvidence,
    [
        "src/components/shared/media/PublicImageViewer.tsx",
        "src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx",
        "src/components/templates/main-app/projects/FileList.tsx",
        "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx",
        "src/components/mobile/sheets/ItemEditSheet.tsx",
        "src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx",
        "src/components/templates/platform/assets/detailsModal.tsx",
    ],
);
const publicImageViewerInternalHandlersEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    publicImageViewerInternalHandlersEvidence,
    "src/components/shared/media/PublicImageViewer.tsx",
);
const ownerMediaDestructiveSafetyEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerMediaDestructiveSafetyEvidence,
    [
        "src/components/templates/main-app/projects/FileList.tsx",
        "src/components/templates/platform/assets/detailsModal.tsx",
    ],
);
const pricingOnboardingAlternateLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    pricingOnboardingAlternateLifecycleEvidence,
    "src/components/website/pricing-pages/OnboardingModal.tsx",
);
const publicBusinessActionSourceFiles = [
    "src/app/client/obp/OBPActions.tsx",
    "src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx",
];
const publicBusinessActionExternalHandoffEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    publicBusinessActionExternalHandoffEvidence,
    publicBusinessActionSourceFiles,
);
const publicBusinessActionFixtureEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    publicBusinessActionFixtureEvidence,
    publicBusinessActionSourceFiles,
);
const feedbackQrNativeAndExternalEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    feedbackQrNativeAndExternalEvidence,
    "src/components/templates/main-app/feedback/FeedbackQrDownload.tsx",
);
const currentAnalyticsSettingsDraftEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    currentAnalyticsSettingsDraftEvidence,
    "src/components/templates/main-app/businessSettings/tabs/AnalyticsTab.tsx",
);
const ownerAlternateFeatureFixtureEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerAlternateFeatureFixtureEvidence,
    [
        "src/components/atoms/timeSlotPresetForm/index.tsx",
        "src/components/mobile/sheets/SmartRecommendationsSheet.tsx",
        "src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx",
        "src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx",
        "src/components/atoms/IconPicker/index.tsx",
    ],
);
const ownerAiGenerationProviderBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    ownerAiGenerationProviderBoundaryEvidence,
    [
        "src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx",
        "src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx",
        "src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx",
        "src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx",
    ],
);
const digitalScreenOwnerUploadNativeEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    digitalScreenOwnerUploadNativeEvidence,
    "src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx",
);
const ownerAlternateLifecycleComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(ownerAlternateLifecycleComponentEvidence, [
    "src/components/mobile/components/PresenceMonitor.tsx", "src/components/mobile/screens/MobileFeedbackDetail.tsx",
    "src/components/mobile/sheets/CategoryManagerSheet.tsx",
    "src/components/mobile/sheets/MobileCategoryEditSheet.tsx", "src/components/templates/main-app/projects/SpecialMenuCard.tsx",
]);
const ownerNativeArtifactComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(ownerNativeArtifactComponentEvidence, [
    "src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx", "src/components/templates/main-app/projects/PdfViewer.tsx",
    "src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx", "src/components/templates/main-app/projects/editorView/ZoomableImage.tsx",
    "src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx",
]);
const ownerProviderDependentComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(ownerProviderDependentComponentEvidence, [
    "src/components/mobile/sheets/ManageLanguagesSheet.tsx", "src/components/shared/media/MediaImageCard.tsx",
    "src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx", "src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx", "src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx",
]);
const publicSharingExternalComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(publicSharingExternalComponentEvidence, [
    "src/components/templates/main-app/businessSettings/OBPLinkCard.tsx", "src/components/templates/main-app/projects/ShareModal.tsx",
    "src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx",
]);
const currentBehavioralContractControlEvidenceIsCurrent = isCurrentMultiSourceEvidence(currentBehavioralContractControlEvidence, [
    "src/components/templates/main-app/businessSettings/tabs/SpecialHoursEditor.tsx", "src/components/mobile/screens/MobileBusinessHealthScreen.tsx",
    "src/components/mobile/screens/MobileOfficialPageScreen.tsx", "src/components/mobile/screens/MobilePosSyncScreen.tsx",
    "src/components/mobile/screens/MobileSpecialMenuScreen.tsx", "src/components/molecules/FeedbackSection/index.tsx",
    "src/components/atoms/GuestFeedbackForm/index.tsx", "src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx",
    "src/components/mobile/sheets/MobileOwnerReferralSheet.tsx",
]);
const remainingAlternateFixtureComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(remainingAlternateFixtureComponentEvidence, [
    "src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx", "src/components/mobile/screens/MobileTransactionsScreen.tsx",
    "src/components/mobile/screens/MobileUsersScreen.tsx", "src/components/mobile/screens/MobileLocationsScreen.tsx",
    "src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx", "src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx",
    "src/components/mobile/components/MobileMasterUpdateNotice.tsx", "src/components/organisms/MasterUpdateBanner/MasterUpdateDetailModal.tsx",
    "src/components/templates/main-app/businessSettings/TempStatusCard.tsx", "src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx",
    "src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx", "src/components/templates/main-app/today/index.tsx",
    "src/components/templates/main-app/users/StaffLoginDetailsContent.tsx", "src/components/templates/main-app/users/usersList/userForm/storesMapping.tsx",
]);
const remainingProviderDependentComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(remainingProviderDependentComponentEvidence, [
    "src/components/mobile/components/GrowthKitsMobileCard.tsx", "src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx",
    "src/components/mobile/sheets/AIDefaultsSheet.tsx", "src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx", "src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx",
    "src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx", "src/components/mobile/sheets/GenerateDescriptionsSheet.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/SubjectProfileSelector.tsx", "src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx",
    "src/modules/creative-editor/DesignCuePanel.tsx",
]);
const remainingNativeArtifactComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(remainingNativeArtifactComponentEvidence, [
    "src/components/mobile/sheets/ColorPickerSheet.tsx", "src/components/templates/platform/assets/index.tsx",
]);
const currentAdjacentContractComponentEvidenceIsCurrent = isCurrentMultiSourceEvidence(currentAdjacentContractComponentEvidence, [
    "src/components/mobile/screens/MobileBusinessAttributesScreen.tsx", "src/components/mobile/screens/MobileDashboardScreen.tsx",
    "src/components/mobile/screens/MobileOpsControlRoomScreen.tsx", "src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx",
    "src/components/shared/printableAssets/FlyerCampaignFields.tsx", "src/components/templates/main-app/projects/b2bView.tsx",
]);
const aiSearchExternalBoundaryEvidenceIsCurrent = isCurrentMultiSourceEvidence(aiSearchExternalBoundaryEvidence, [
    "src/components/organisms/AISearchModal/FeedbackModal.tsx", "src/components/organisms/AISearchModal/SearchResultDisplay.tsx",
]);
const NOTIFICATION_SETTINGS_SOURCE_FILE = "src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx";
const notificationPreferredChannelBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    notificationPreferredChannelBrowserEvidence,
    NOTIFICATION_SETTINGS_SOURCE_FILE,
);
const notificationWhatsAppFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    notificationWhatsAppFixtureEvidence,
    NOTIFICATION_SETTINGS_SOURCE_FILE,
);
const businessSettingsReversibleBrowserEvidenceIsCurrent = isCurrentMultiSourceEvidence(
    businessSettingsReversibleBrowserEvidence,
    [
        "src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx",
        "src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx",
        "src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx",
    ],
);
const feedbackReviewExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    feedbackReviewExternalHandoffEvidence,
    "src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx",
);
const INTEGRATIONS_SETTINGS_SOURCE_FILE = "src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx";
const platformPullApiKeyBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformPullApiKeyBrowserEvidence,
    INTEGRATIONS_SETTINGS_SOURCE_FILE,
);
const platformPullApiKeyNativeClipboardEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformPullApiKeyNativeClipboardEvidence,
    INTEGRATIONS_SETTINGS_SOURCE_FILE,
);
const socialMediaDraftBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    socialMediaDraftBrowserEvidence,
    "src/components/templates/main-app/businessSettings/tabs/SocialMediaTab.tsx",
);
const compliancePageLifecycleBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    compliancePageLifecycleBrowserEvidence,
    "src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx",
);
const GOOGLE_LISTING_GUIDE_SOURCE_FILE = "src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx";
const googleListingReminderBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    googleListingReminderBrowserEvidence,
    GOOGLE_LISTING_GUIDE_SOURCE_FILE,
);
const googleListingNativeClipboardEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    googleListingNativeClipboardEvidence,
    GOOGLE_LISTING_GUIDE_SOURCE_FILE,
);
const googleListingExternalHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    googleListingExternalHandoffEvidence,
    GOOGLE_LISTING_GUIDE_SOURCE_FILE,
);
const businessSettingsSaveLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    businessSettingsSaveLifecycleEvidence,
    "src/components/templates/main-app/businessSettings/index.tsx",
);
const timeSlotPresetEntryBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    timeSlotPresetEntryBrowserEvidence,
    "src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx",
);
const workingHoursDraftBrowserEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    workingHoursDraftBrowserEvidence,
    "src/components/templates/main-app/businessSettings/tabs/WorkingHoursTab.tsx",
);
const BUSINESS_COPY_SETUP_SOURCE_FILE = "src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx";
const businessCopyProviderBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    businessCopyProviderBoundaryEvidence,
    BUSINESS_COPY_SETUP_SOURCE_FILE,
);
const businessCopyRepairFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    businessCopyRepairFixtureEvidence,
    BUSINESS_COPY_SETUP_SOURCE_FILE,
);
const WEBSITE_HEADER_SOURCE_FILE = "src/components/website/Header.tsx";
const websiteAuthenticatedDashboardEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    websiteAuthenticatedDashboardEvidence,
    WEBSITE_HEADER_SOURCE_FILE,
);
const websiteLogoutSafetyEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    websiteLogoutSafetyEvidence,
    WEBSITE_HEADER_SOURCE_FILE,
);
const transactionsPaginationFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    transactionsPaginationFixtureEvidence,
    "src/components/templates/main-app/transactions/index.tsx",
);
const FEEDBACK_CARD_SOURCE_FILE = "src/components/templates/main-app/feedback/FeedbackCard.tsx";
const feedbackCardExternalReplyEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    feedbackCardExternalReplyEvidence,
    FEEDBACK_CARD_SOURCE_FILE,
);
const feedbackCardNativeReplyCopyEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    feedbackCardNativeReplyCopyEvidence,
    FEEDBACK_CARD_SOURCE_FILE,
);
const MESSAGE_PREVIEW_SOURCE_FILE = "src/app/(global-pages)/msg-preview/[sessionId]/page.tsx";
const messagePreviewSuccessFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    messagePreviewSuccessFixtureEvidence,
    MESSAGE_PREVIEW_SOURCE_FILE,
);
const messagePreviewWhatsAppHandoffEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    messagePreviewWhatsAppHandoffEvidence,
    MESSAGE_PREVIEW_SOURCE_FILE,
);
const OBP_MENU_CTA_SOURCE_FILE = "src/app/client/obp/OBPMenuCTA.tsx";
const obpMenuCtaAlternateLifecycleEvidenceIsCurrent = isCurrentSingleSourceEvidence(obpMenuCtaAlternateLifecycleEvidence, OBP_MENU_CTA_SOURCE_FILE);
const obpMenuCtaCommentEvidenceIsCurrent = isCurrentSingleSourceEvidence(obpMenuCtaCommentEvidence, OBP_MENU_CTA_SOURCE_FILE);
const menuBreadcrumbAlternateLayoutEvidenceIsCurrent = isCurrentSingleSourceEvidence(menuBreadcrumbAlternateLayoutEvidence, "src/app/client/[[...slug]]/MenuBreadcrumb.tsx");
const globalErrorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(globalErrorRuntimeEvidence, "src/app/(global-pages)/error.tsx");
const rootErrorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(rootErrorRuntimeEvidence, "src/app/error.tsx");
const storeAccessRecoveryRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(storeAccessRecoveryRuntimeEvidence, "src/components/auth/StoreAccessRecovery.tsx");
const MOBILE_TEXT_CASE_SOURCE_FILE = "src/components/mobile/sheets/TextCaseSheet.tsx";
const mobileTextCaseReversibleEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileTextCaseReversibleEvidence, MOBILE_TEXT_CASE_SOURCE_FILE);
const mobileTextCaseMaskBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileTextCaseMaskBoundaryEvidence, MOBILE_TEXT_CASE_SOURCE_FILE);
const mobileTextCaseApplySafetyEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileTextCaseApplySafetyEvidence, MOBILE_TEXT_CASE_SOURCE_FILE);
const DECISION_BLOCKS_SETTINGS_SOURCE_FILE = "src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx";
const decisionBlocksReversibleEvidenceIsCurrent = isCurrentSingleSourceEvidence(decisionBlocksReversibleEvidence, DECISION_BLOCKS_SETTINGS_SOURCE_FILE);
const decisionBlocksSaveSafetyEvidenceIsCurrent = isCurrentSingleSourceEvidence(decisionBlocksSaveSafetyEvidence, DECISION_BLOCKS_SETTINGS_SOURCE_FILE);
const decisionChoicePosterDesktopEvidenceIsCurrent = isCurrentSingleSourceEvidence(decisionChoicePosterDesktopEvidence, DECISION_BLOCKS_SETTINGS_SOURCE_FILE);
const decisionChoicePosterMobileEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    decisionChoicePosterMobileEvidence,
    "src/components/mobile/sheets/SmartRecommendationsSheet.tsx",
);
const MOBILE_NOTIFICATION_SETTINGS_SOURCE_FILE = "src/components/mobile/screens/MobileNotificationSettingsScreen.tsx";
const mobileNotificationReversibleEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileNotificationReversibleEvidence, MOBILE_NOTIFICATION_SETTINGS_SOURCE_FILE);
const mobileNotificationWhatsAppFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileNotificationWhatsAppFixtureEvidence, MOBILE_NOTIFICATION_SETTINGS_SOURCE_FILE);
const mobileNotificationSaveSafetyEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileNotificationSaveSafetyEvidence, MOBILE_NOTIFICATION_SETTINGS_SOURCE_FILE);
const MOBILE_ADVANCED_SETTINGS_SOURCE_FILE = "src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx";
const mobileAdvancedSocialEditorEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileAdvancedSocialEditorEvidence, MOBILE_ADVANCED_SETTINGS_SOURCE_FILE);
const mobileAdvancedSocialExternalEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileAdvancedSocialExternalEvidence, MOBILE_ADVANCED_SETTINGS_SOURCE_FILE);
const mobileAdvancedSocialRemoveFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileAdvancedSocialRemoveFixtureEvidence, MOBILE_ADVANCED_SETTINGS_SOURCE_FILE);
const creativeEditorAlternateDraftQrEvidenceIsCurrent = isCurrentSingleSourceEvidence(creativeEditorAlternateDraftQrEvidence, "src/modules/creative-editor/CreativeEditor.tsx");
const businessHealthProjectScopeCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(businessHealthProjectScopeCurrentEvidence, "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx");
const publicTruthOwnerCheckCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(publicTruthOwnerCheckCurrentEvidence, "src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx");
const publicTruthMonitorCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(publicTruthMonitorCurrentEvidence, "src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx");
const verticalSidebarCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(verticalSidebarCurrentEvidence, "src/components/organisms/sidebar/index.tsx");
const horizontalSidebarCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(horizontalSidebarCurrentEvidence, "src/components/organisms/sidebar/horizontalSidebar.tsx");
const appBreadcrumbCurrentEvidenceIsCurrent = isCurrentSingleSourceEvidence(appBreadcrumbCurrentEvidence, "src/components/organisms/headerComponent/appBreadcrumb/appBreadcrumb.tsx");
const analyticsExportRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsExportRuntimeEvidence, "src/components/analytics/ExportButton.tsx");
const projectConfirmModalRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(projectConfirmModalRuntimeEvidence, "src/components/templates/main-app/projects/ProjectDetails/ProjectConfirmModal.tsx");
const errorRecoveryAlertRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(errorRecoveryAlertRuntimeEvidence, "src/components/templates/main-app/projects/ErrorRecoveryAlert.tsx");
const projectSelectorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(projectSelectorRuntimeEvidence, "src/components/shared/ProjectSelector.tsx");
const aiSearchActionButtonsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(aiSearchActionButtonsRuntimeEvidence, "src/components/organisms/AISearchModal/ActionButtons.tsx");
const aiSearchSearchBarRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(aiSearchSearchBarRuntimeEvidence, "src/components/organisms/AISearchModal/SearchBar.tsx");
const aiSearchLocalResultsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(aiSearchLocalResultsRuntimeEvidence, "src/components/organisms/AISearchModal/LocalSearchResults.tsx");
const welcomeModalRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(welcomeModalRuntimeEvidence, "src/components/templates/main-app/projects/WelcomeModal.tsx");
const upgradeConfirmationRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(upgradeConfirmationRuntimeEvidence, "src/components/templates/main-app/billing/UpgradeConfirmationModal.tsx");
const messageReferencesRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(messageReferencesRuntimeEvidence, "src/components/templates/main-app/helpChat/MessageReferences.tsx");
const creditPackRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(creditPackRuntimeEvidence, "src/components/website/pricing-pages/CreditPackCard.tsx");
const creditPackSignInExternalEvidenceIsCurrent = isCurrentSingleSourceEvidence(creditPackSignInExternalEvidence, "src/components/website/pricing-pages/CreditPackCard.tsx");
const privacyPolicyMailtoBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(privacyPolicyMailtoBoundaryEvidence, "src/components/website/legal/PrivacyPolicyPage.tsx");
const pricingPlansModalRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(pricingPlansModalRuntimeEvidence, "src/components/templates/main-app/billing/PricingPlansModal.tsx");
const editSpecialMenuScheduleRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(editSpecialMenuScheduleRuntimeEvidence, "src/components/templates/main-app/projects/EditSpecialMenuScheduleModal.tsx");
const menuFiltersRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(menuFiltersRuntimeEvidence, "src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx");
const menuLanguageSwitcherRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(menuLanguageSwitcherRuntimeEvidence, "src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher.tsx");
const transactionDetailsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(transactionDetailsRuntimeEvidence, "src/components/templates/main-app/transactions/TransactionDetailsModal.tsx");
const articleViewModalRecoveryRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(articleViewModalRecoveryRuntimeEvidence, "src/components/organisms/ArticleViewModal/index.tsx");
const publicCookieConsentRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(publicCookieConsentRuntimeEvidence, "src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx");
const masterUpdateBannerRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(masterUpdateBannerRuntimeEvidence, "src/components/organisms/MasterUpdateBanner/index.tsx");
const dateRangeSelectorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(dateRangeSelectorRuntimeEvidence, "src/components/analytics/DateRangeSelector.tsx");
const installInstructionsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(installInstructionsRuntimeEvidence, "src/components/customerApp/InstallInstructions.tsx");
const installPromptRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(installPromptRuntimeEvidence, "src/components/customerApp/InstallPrompt.tsx");
const lucideIconGridRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(lucideIconGridRuntimeEvidence, "src/components/atoms/IconPicker/LucideIconGrid.tsx");
const mobileTempStatusConfiguratorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileTempStatusConfiguratorRuntimeEvidence, "src/components/mobile/components/MobileTempStatusConfigurator.tsx");
const mobileMenuCommandSheetRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileMenuCommandSheetRuntimeEvidence, "src/components/mobile/components/MobileMenuCommandSheet.tsx");
const mobileCompliancePagesRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileCompliancePagesRuntimeEvidence, "src/components/mobile/components/MobileCompliancePagesEditor.tsx");
const mobileCompliancePageExternalEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileCompliancePageExternalEvidence, "src/components/mobile/components/MobileCompliancePagesEditor.tsx");
const mobileSchedulerMonitorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileSchedulerMonitorRuntimeEvidence, "src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx");
const mobileSchedulerRecoverySafetyEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileSchedulerRecoverySafetyEvidence, "src/components/mobile/screens/MobileSchedulerMonitorScreen.tsx");
const commandCenterActiveInactiveRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(commandCenterActiveInactiveRuntimeEvidence, "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/ActiveInactiveAction.tsx");
const commandCenterAvailabilityRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(commandCenterAvailabilityRuntimeEvidence, "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction.tsx");
const commandCenterPricingRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(commandCenterPricingRuntimeEvidence, "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction.tsx");
const commandCenterTextCaseRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(commandCenterTextCaseRuntimeEvidence, "src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction.tsx");
const languageSelectorRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(languageSelectorRuntimeEvidence, "src/components/templates/main-app/projects/LanguageSelector.tsx");
const ownerAppUpdatePromptRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(ownerAppUpdatePromptRuntimeEvidence, "src/components/common/OwnerAppUpdatePrompt.tsx");
const ownerAppUpdateRefreshNativeEvidenceIsCurrent = isCurrentSingleSourceEvidence(ownerAppUpdateRefreshNativeEvidence, "src/components/common/OwnerAppUpdatePrompt.tsx");
const starRatingRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(starRatingRuntimeEvidence, "src/components/atoms/GuestFeedbackForm/StarRating.tsx");
const mediaAspectRatioRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mediaAspectRatioRuntimeEvidence, "src/components/shared/media/MediaAspectRatioSelector.tsx");
const ownerAssistantInputRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(ownerAssistantInputRuntimeEvidence, "src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantInput.tsx");
const reorderSortableItemRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(reorderSortableItemRuntimeEvidence, "src/components/templates/main-app/projects/editorView/ReorderSortableItem.tsx");
const billingHistoryEmailRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(billingHistoryEmailRuntimeEvidence, "src/components/templates/main-app/billing/BillingHistory.tsx");
const billingHistoryInvoiceExternalEvidenceIsCurrent = isCurrentSingleSourceEvidence(billingHistoryInvoiceExternalEvidence, "src/components/templates/main-app/billing/BillingHistory.tsx");
const analyticsEmptyStateRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsEmptyStateRuntimeEvidence, "src/components/analytics/EmptyState.tsx");
const analyticsRefreshRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsRefreshRuntimeEvidence, "src/components/analytics/RefreshButton.tsx");
const analyticsMetricCardRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsMetricCardRuntimeEvidence, "src/components/analytics/MetricCard.tsx");
const analyticsStatCardRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsStatCardRuntimeEvidence, "src/components/analytics/StatCard.tsx");
const mobileLocalizedLanguageRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileLocalizedLanguageRuntimeEvidence, "src/components/mobile/components/MobileLocalizedLanguageSelector.tsx");
const searchSuggestionsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(searchSuggestionsRuntimeEvidence, "src/components/molecules/SearchSuggestions/index.tsx");
const businessHealthSuggestedQuestionRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(businessHealthSuggestedQuestionRuntimeEvidence, "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSuggestedQuestions.tsx");
const ownerAssistantSourceDisclosureRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(ownerAssistantSourceDisclosureRuntimeEvidence, "src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure.tsx");
const mobileLinkCardRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(mobileLinkCardRuntimeEvidence, "src/components/mobile/components/MobileLinkCard.tsx");
const menuFilterChipsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(menuFilterChipsRuntimeEvidence, "src/components/templates/main-app/projects/b2cView/output/MenuFilterChips.tsx");
const analyticsDataTableSearchRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsDataTableSearchRuntimeEvidence, "src/components/analytics/DataTable.tsx");
const analyticsFeedbackListRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsFeedbackListRuntimeEvidence, "src/components/analytics/FeedbackList.tsx");
const analyticsKnowledgeGapsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsKnowledgeGapsRuntimeEvidence, "src/components/analytics/KnowledgeGaps.tsx");
const analyticsTopQuestionsRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(analyticsTopQuestionsRuntimeEvidence, "src/components/analytics/TopQuestions.tsx");
const skipToContentRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(skipToContentRuntimeEvidence, "src/components/shared/accessibility/SkipToContentLink.tsx");
const scrollToBottomRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(scrollToBottomRuntimeEvidence, "src/components/atoms/ScrollToBottomButton/ScrollToBottomButton.tsx");
const backToTopRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(backToTopRuntimeEvidence, "src/components/templates/main-app/projects/b2cView/output/BackToTop.tsx");
const emojiGridSearchRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(emojiGridSearchRuntimeEvidence, "src/components/atoms/IconPicker/EmojiGrid.tsx");
const todayPrimaryCardRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(todayPrimaryCardRuntimeEvidence, "src/components/templates/main-app/today/components/PrimaryCard/index.tsx");
const businessHealthHeaderRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(businessHealthHeaderRuntimeEvidence, "src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader.tsx");
const loadingMessageCancelRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(loadingMessageCancelRuntimeEvidence, "src/components/antdComponent/loadingMessage/index.tsx");
const aiButtonIconRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(aiButtonIconRuntimeEvidence, "src/components/atoms/aiButtonIcon/index.tsx");
const knowledgeBaseSourceFileRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(knowledgeBaseSourceFileRuntimeEvidence, "src/components/atoms/KbSourceFile/index.tsx");
const todayOperationalSectionRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(todayOperationalSectionRuntimeEvidence, "src/components/templates/main-app/today/components/OperationalSection/index.tsx");
const noSubscriptionViewPlansRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(noSubscriptionViewPlansRuntimeEvidence, "src/components/templates/main-app/billing/NoSubscriptionView.tsx");
const emptyProjectStateRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(emptyProjectStateRuntimeEvidence, "src/components/templates/main-app/projects/EmptyProjectState.tsx");
const feedbackIntelligenceDisclosureRuntimeEvidenceIsCurrent = isCurrentSingleSourceEvidence(feedbackIntelligenceDisclosureRuntimeEvidence, "src/components/analytics/FeedbackIntelligenceCard.tsx");
const reportLeadMonitorContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    reportLeadMonitorContinuationEvidence,
    "src/components/templates/main-app/platform/reportLeadMonitor/index.tsx",
);
const reportLeadMonitorNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    reportLeadMonitorNativeBoundaryEvidence,
    "src/components/templates/main-app/platform/reportLeadMonitor/index.tsx",
);
const websiteEnquiryMonitorContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    websiteEnquiryMonitorContinuationEvidence,
    "src/components/templates/main-app/platform/websiteEnquiryMonitor/index.tsx",
);
const websiteEnquiryMonitorNativeBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    websiteEnquiryMonitorNativeBoundaryEvidence,
    "src/components/templates/main-app/platform/websiteEnquiryMonitor/index.tsx",
);
const platformUserContinuationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    platformUserContinuationEvidence,
    "src/components/templates/platform/users/index.tsx",
);
const BULK_ACTIONS_SOURCE_FILE = "src/components/mobile/sheets/BulkActionsSheet.tsx";
const bulkActionsControlEvidenceIsCurrent = (
    bulkActionsControlEvidence?.result === "PASS"
    && bulkActionsControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(BULK_ACTIONS_SOURCE_FILE)
);
const MOBILE_MORE_SOURCE_FILE = "src/components/mobile/screens/MobileMoreScreen.tsx";
const mobileMoreControlEvidenceIsCurrent = (
    mobileMoreControlEvidence?.result === "PASS"
    && mobileMoreControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(MOBILE_MORE_SOURCE_FILE)
);
const mobileMoreSafetyBlockedControlEvidenceIsCurrent = (
    mobileMoreSafetyBlockedControlEvidence?.result === "PASS"
    && mobileMoreSafetyBlockedControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(MOBILE_MORE_SOURCE_FILE)
);
const MOBILE_MENU_RUNTIME_SOURCE_FILES = [
    "src/components/mobile/screens/MobileMenuScreen.tsx",
    "src/components/mobile/sheets/ItemEditSheet.tsx",
    "src/components/mobile/sheets/CategoryManagerSheet.tsx",
    "src/components/mobile/sheets/MobileCategoryEditSheet.tsx",
];
const currentMobileMenuSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of MOBILE_MENU_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const mobileMenuControlEvidenceIsCurrent = (
    mobileMenuControlEvidence?.result === "PASS"
    && mobileMenuControlEvidence?.sourceManifestSha256
        === currentMobileMenuSourceManifestSha256
);
const mobileMenuNativeBoundaryControlEvidenceIsCurrent = (
    mobileMenuNativeBoundaryControlEvidence?.result === "PASS"
    && mobileMenuNativeBoundaryControlEvidence?.sourceManifestSha256
        === currentMobileMenuSourceManifestSha256
);
const MOBILE_ITEM_EDIT_SOURCE_FILE = "src/components/mobile/sheets/ItemEditSheet.tsx";
const mobileItemEditAlternateFixtureEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileItemEditAlternateFixtureEvidence,
    MOBILE_ITEM_EDIT_SOURCE_FILE,
);
const mobileItemEditProviderBoundaryEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileItemEditProviderBoundaryEvidence,
    MOBILE_ITEM_EDIT_SOURCE_FILE,
);
const mobileItemProductTagCurrentIntegrationEvidenceIsCurrent = isCurrentSingleSourceEvidence(
    mobileItemProductTagCurrentIntegrationEvidence,
    MOBILE_ITEM_EDIT_SOURCE_FILE,
);
const MOBILE_SHARE_RUNTIME_SOURCE_FILES = [
    "src/components/mobile/screens/MobileShareScreen.tsx",
    "src/components/mobile/providers/MobileProjectsProvider.tsx",
    "src/components/mobile/MobileShell.tsx",
];
const currentMobileShareSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of MOBILE_SHARE_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const mobileShareControlEvidenceIsCurrent = (
    mobileShareControlEvidence?.result === "PASS"
    && mobileShareControlEvidence?.sourceManifestSha256
        === currentMobileShareSourceManifestSha256
);
const MOBILE_SHARE_FEATURE_DISABLED_SOURCE_FILES = [
    "src/components/mobile/screens/MobileShareScreen.tsx",
    "src/config/features.ts",
];
const currentMobileShareFeatureDisabledManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of MOBILE_SHARE_FEATURE_DISABLED_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const mobileShareFeatureDisabledControlEvidenceIsCurrent = (
    mobileShareFeatureDisabledControlEvidence?.result === "PASS"
    && mobileShareFeatureDisabledControlEvidence?.sourceManifestSha256
        === currentMobileShareFeatureDisabledManifestSha256
);
const MOBILE_SHARE_SOURCE_FILE = "src/components/mobile/screens/MobileShareScreen.tsx";
const mobileShareNotShippedControlEvidenceIsCurrent = (
    mobileShareNotShippedControlEvidence?.result === "PASS"
    && mobileShareNotShippedControlEvidence?.sourceManifestSha256
        === currentSingleSourceManifestSha256(MOBILE_SHARE_SOURCE_FILE)
);
const MOBILE_SHARE_NATIVE_BOUNDARY_SOURCE_FILES = [
    "src/components/mobile/screens/MobileShareScreen.tsx",
    "src/components/mobile/components/MobileLinkCard.tsx",
    "src/components/mobile/components/CommunicationKit.tsx",
];
const currentMobileShareNativeBoundaryManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of MOBILE_SHARE_NATIVE_BOUNDARY_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const mobileShareNativeBoundaryControlEvidenceIsCurrent = (
    mobileShareNativeBoundaryControlEvidence?.result === "PASS"
    && mobileShareNativeBoundaryControlEvidence?.sourceManifestSha256
        === currentMobileShareNativeBoundaryManifestSha256
);
const PRINTABLE_ASSET_RUNTIME_SOURCE_FILES = [
    "src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx",
    "src/components/mobile/screens/MobileShareScreen.tsx",
];
const currentPrintableAssetSourceManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of PRINTABLE_ASSET_RUNTIME_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const printableAssetControlEvidenceIsCurrent = (
    printableAssetControlEvidence?.result === "PASS"
    && printableAssetControlEvidence?.sourceManifestSha256
        === currentPrintableAssetSourceManifestSha256
);
const printableAssetNativeBoundaryControlEvidenceIsCurrent = (
    printableAssetNativeBoundaryControlEvidence?.result === "PASS"
    && printableAssetNativeBoundaryControlEvidence?.sourceManifestSha256
        === currentPrintableAssetSourceManifestSha256
);
const MOBILE_MORE_FEATURE_DISABLED_SOURCE_FILES = [
    MOBILE_MORE_SOURCE_FILE,
    "src/config/features.ts",
];
const currentMobileMoreFeatureDisabledManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of MOBILE_MORE_FEATURE_DISABLED_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const mobileMoreFeatureDisabledControlEvidenceIsCurrent = (
    mobileMoreFeatureDisabledControlEvidence?.result === "PASS"
    && mobileMoreFeatureDisabledControlEvidence?.sourceManifestSha256
        === currentMobileMoreFeatureDisabledManifestSha256
);
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
    "src/components/website/shared/StickyCta.tsx",
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
const WEBSITE_HOMEPAGE_SOURCE_FILES = [
    "src/components/website/home/BeforeAfterSection.tsx",
    "src/components/website/home/CreateMenuPreviewSection.tsx",
    "src/components/website/home/FaqSection.tsx",
    "src/components/website/home/FinalCtaSection.tsx",
    "src/components/website/home/HeroSection.tsx",
    "src/components/website/home/OwnerProofSection.tsx",
];
const currentWebsiteHomepageManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_HOMEPAGE_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteHomepageControlEvidenceIsCurrent = (
    websiteHomepageControlEvidence?.result === "PASS"
    && websiteHomepageControlEvidence?.sourceManifestSha256
        === currentWebsiteHomepageManifestSha256
);
const WEBSITE_FAQ_SOURCE_FILES = [
    "src/components/website/faq/FaqPage.tsx",
];
const currentWebsiteFaqManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_FAQ_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteFaqControlEvidenceIsCurrent = (
    websiteFaqControlEvidence?.result === "PASS"
    && websiteFaqControlEvidence?.sourceManifestSha256
        === currentWebsiteFaqManifestSha256
);
const WEBSITE_INDUSTRY_SOURCE_FILES = [
    "src/components/website/industries/IndustryLandingPage.tsx",
    "src/content/websiteIndustries.ts",
];
const currentWebsiteIndustryManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_INDUSTRY_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteIndustryControlEvidenceIsCurrent = (
    websiteIndustryControlEvidence?.result === "PASS"
    && websiteIndustryControlEvidence?.sourceManifestSha256
        === currentWebsiteIndustryManifestSha256
);
const WEBSITE_INFORMATIONAL_SOURCE_FILES = [
    "src/components/website/about/AboutPage.tsx",
    "src/components/website/product/ProductPage.tsx",
    "src/components/website/trust-security/TrustSecurityPage.tsx",
    "src/components/website/legal/RefundPolicyPage.tsx",
    "src/components/website/legal/TermsOfServicePage.tsx",
    "src/components/website/developers/DevelopersPage.tsx",
    "src/components/website/get-started/GetStartedPage.tsx",
    "src/components/website/shared/WebsitePageHero.tsx",
];
const currentWebsiteInformationalManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_INFORMATIONAL_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteInformationalControlEvidenceIsCurrent = (
    websiteInformationalControlEvidence?.result === "PASS"
    && websiteInformationalControlEvidence?.sourceManifestSha256
        === currentWebsiteInformationalManifestSha256
);
const WEBSITE_WHATSAPP_SOURCE_FILES = [
    "src/components/website/whatsapp/WhatsAppOnboardingPage.tsx",
];
const currentWebsiteWhatsappManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_WHATSAPP_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteWhatsappControlEvidenceIsCurrent = (
    websiteWhatsappControlEvidence?.result === "PASS"
    && websiteWhatsappControlEvidence?.sourceManifestSha256
        === currentWebsiteWhatsappManifestSha256
);
const WEBSITE_RESOURCE_ARTICLE_SOURCE_FILES = [
    "src/components/website/resources/ArticleLayout.tsx",
    "src/components/website/resources/ArticleSection.tsx",
    "src/components/website/resources/ResourceTrackedLink.tsx",
];
const currentWebsiteResourceArticleManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_RESOURCE_ARTICLE_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteResourceArticleControlEvidenceIsCurrent = (
    websiteResourceArticleControlEvidence?.result === "PASS"
    && websiteResourceArticleControlEvidence?.sourceManifestSha256
        === currentWebsiteResourceArticleManifestSha256
);
const WEBSITE_PUBLIC_FEATURE_SOURCE_FILES = [
    "src/components/website/features/BusinessHealthFeaturePage.tsx",
    "src/components/website/ai-menu-manager/AiMenuManagerPage.tsx",
    "src/components/website/features/FeatureDetailPage.tsx",
    "src/components/website/features/FeatureDetailJourney.tsx",
    "src/components/website/features/FeaturesPage.tsx",
    "src/components/website/multi-location/MultiLocationPage.tsx",
    "src/components/website/toolsHub/ToolsHubPage.tsx",
    "src/components/website/shared/WebsiteLink.tsx",
];
const currentWebsitePublicFeatureManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_PUBLIC_FEATURE_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websitePublicFeatureControlEvidenceIsCurrent = (
    websitePublicFeatureControlEvidence?.result === "PASS"
    && websitePublicFeatureControlEvidence?.sourceManifestSha256
        === currentWebsitePublicFeatureManifestSha256
);
const WEBSITE_FOOTER_SOURCE_FILES = [
    "src/components/website/Footer.tsx",
    "src/components/website/SchemaMarkup.tsx",
];
const currentWebsiteFooterManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of WEBSITE_FOOTER_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const websiteFooterControlEvidenceIsCurrent = (
    websiteFooterControlEvidence?.result === "PASS"
    && websiteFooterControlEvidence?.sourceManifestSha256
        === currentWebsiteFooterManifestSha256
);
const LOCAL_MOBILE_OWNER_SOURCE_FILES = [
    "src/app/(website)/create-menu/PreviewClient.tsx",
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
    "src/components/mobile/components/MobileProjectSelectorSheet.tsx",
    "src/components/mobile/components/MobileLinkCard.tsx",
    "src/components/mobile/components/CommunicationKit.tsx",
    "src/lib/communication/messageTemplates.ts",
    "src/components/mobile/components/MobileQrCodeSheet.tsx",
    "src/components/mobile/components/MobileCompliancePagesEditor.tsx",
    "src/components/mobile/components/MobileTempStatusConfigurator.tsx",
    "src/components/mobile/screens/MobileDomainSettingsScreen.tsx",
    "src/components/mobile/screens/MobileNotificationSettingsScreen.tsx",
    "src/components/mobile/screens/MobileResellerDashboardScreen.tsx",
    "src/components/mobile/screens/MobileResellerOnboardingScreen.tsx",
    "src/components/mobile/screens/MobileResellerManagementScreen.tsx",
    "src/lib/reseller/resellerManagementProfile.ts",
    "src/components/mobile/screens/MobileBillingScreen.tsx",
    "src/components/mobile/screens/MobileLocationsScreen.tsx",
    "src/components/mobile/screens/MobileTransactionsScreen.tsx",
    "src/components/mobile/screens/MobileHelpScreen.tsx",
    "src/components/mobile/screens/MobileFeedbackScreen.tsx",
    "src/components/mobile/screens/MobileDigitalScreensScreen.tsx",
    "src/components/mobile/screens/MobileBasicSettingsScreen.tsx",
    "src/lib/validation/optionalContactEmail.ts",
    "src/components/mobile/sheets/ColorPickerSheet.tsx",
    "src/components/mobile/sheets/MobileOfficialPagePreviewSheet.tsx",
    "src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx",
    "src/lib/obp/ownerSocialMediaBoundary.ts",
    "src/app/client/obp/OBPResolvedSurface.tsx",
    "src/app/client/obp/OBPExternalLinks.tsx",
    "src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx",
    "src/lib/schema/index.ts",
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
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/SubjectProfileSelector.tsx",
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
const CURRENT_LOCAL_OWNER_SOURCE_FILES = [
    "scripts/verification/test-menulist-host-routing.ts",
    "src/components/atoms/OutletContextBanner/index.tsx",
    "src/components/molecules/StoreSwitcher/index.tsx",
    "src/components/organisms/appLayoutSwitcher/index.tsx",
    "src/components/organisms/appSettings/AdvancedSettings.tsx",
    "src/components/organisms/appSettings/EnhancedColorPicker.tsx",
    "src/components/organisms/appSettings/index.tsx",
    "src/components/organisms/dateFormatSwitcher/index.tsx",
    "src/components/organisms/timeFormatSwitcher/index.tsx",
    "src/components/mobile/components/MobileCompliancePagesEditor.tsx",
    "src/components/mobile/components/MenuQualitySignals.tsx",
    "src/components/mobile/components/MobileMenuCommandSheet.tsx",
    "src/components/mobile/components/MobileSettingsScreenHeader.tsx",
    "src/components/mobile/screens/MobileDigitalScreensScreen.tsx",
    "src/components/mobile/screens/MobileMoreScreen.tsx",
    "src/components/mobile/screens/MobileOfficialPageScreen.tsx",
    "src/lib/media/obpMediaCleanupJournal.ts",
    "src/components/mobile/screens/MobileSpecialMenuScreen.tsx",
    "src/components/mobile/screens/MobileMenuScreen.tsx",
    "src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx",
    "src/components/mobile/sheets/CategoryManagerSheet.tsx",
    "src/components/mobile/sheets/MobileCategoryEditSheet.tsx",
    "src/components/mobile/sheets/AIDefaultsSheet.tsx",
    "src/components/shared/media/MediaAspectRatioSelector.tsx",
    "src/components/templates/main-app/projects/ProjectsSubHeader.tsx",
    "src/components/templates/main-app/projects/editorView/AiImageGenerator/AspectRatioSelector.tsx",
    "src/components/templates/main-app/projects/b2cView/previewModal.tsx",
    "src/components/templates/main-app/projects/b2cView/index.tsx",
    "src/components/templates/main-app/projects/b2cView/sidebar/index.tsx",
    "src/components/templates/main-app/projects/b2cView/projectPublishState.ts",
    "src/components/templates/main-app/projects/b2cView/shareModal/index.tsx",
    "src/lib/obp/ownerPublicPresenceBoundary.ts",
    "src/constants/urls.ts",
];
const currentLocalOwnerManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of CURRENT_LOCAL_OWNER_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const currentLocalOwnerControlEvidenceIsCurrent = (
    currentLocalOwnerControlEvidence?.result === "PASS"
    && currentLocalOwnerControlEvidence?.sourceManifestSha256
        === currentLocalOwnerManifestSha256
);
const CURRENT_LOCAL_PUBLIC_SOURCE_FILES = [
    "src/app/client/obp/BrandOBPContent.tsx",
    "src/app/client/obp/OBPContent.tsx",
    "src/app/client/obp/OBPActions.tsx",
    "src/app/client/obp/OBPResolvedSurface.tsx",
    "src/app/client/obp/OBPThemeToggle.tsx",
    "src/components/customerApp/InstallPrompt.tsx",
    "src/constants/urls.ts",
];
const currentLocalPublicManifestSha256 = (() => {
    const hash = crypto.createHash("sha256");
    for (const relativePath of CURRENT_LOCAL_PUBLIC_SOURCE_FILES) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(path.join(ROOT, relativePath)));
        hash.update("\0");
    }
    return hash.digest("hex");
})();
const currentLocalPublicControlEvidenceIsCurrent = (
    currentLocalPublicControlEvidence?.result === "PASS"
    && currentLocalPublicControlEvidence?.sourceManifestSha256
        === currentLocalPublicManifestSha256
);
const controlEvidenceSets = [
    authenticatedOwnerControlEvidence,
    currentLocalOwnerControlEvidenceIsCurrent ? currentLocalOwnerControlEvidence : null,
    localPlatformControlEvidence,
    publicCustomerControlEvidence,
    currentLocalPublicControlEvidenceIsCurrent ? currentLocalPublicControlEvidence : null,
    creativeEditorControlEvidenceIsCurrent ? creativeEditorControlEvidence : null,
    creativeEditorNativeBoundaryEvidenceIsCurrent ? creativeEditorNativeBoundaryEvidence : null,
    creativeEditorNotShippedEvidenceIsCurrent ? creativeEditorNotShippedEvidence : null,
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
    websiteHomepageControlEvidenceIsCurrent ? websiteHomepageControlEvidence : null,
    websiteFaqControlEvidenceIsCurrent ? websiteFaqControlEvidence : null,
    websiteIndustryControlEvidenceIsCurrent ? websiteIndustryControlEvidence : null,
    websiteInformationalControlEvidenceIsCurrent ? websiteInformationalControlEvidence : null,
    websiteWhatsappControlEvidenceIsCurrent ? websiteWhatsappControlEvidence : null,
    websiteResourceArticleControlEvidenceIsCurrent ? websiteResourceArticleControlEvidence : null,
    websitePublicFeatureControlEvidenceIsCurrent ? websitePublicFeatureControlEvidence : null,
    websiteFooterControlEvidenceIsCurrent ? websiteFooterControlEvidence : null,
    platformNotificationMonitorControlEvidenceIsCurrent ? platformNotificationMonitorControlEvidence : null,
    platformNotificationMonitorNativeBoundaryControlEvidenceIsCurrent ? platformNotificationMonitorNativeBoundaryControlEvidence : null,
    ownerNotificationMonitorControlEvidenceIsCurrent ? ownerNotificationMonitorControlEvidence : null,
    ownerNotificationMonitorSafetyBlockedControlEvidenceIsCurrent ? ownerNotificationMonitorSafetyBlockedControlEvidence : null,
    ownerNotificationMonitorNativeBoundaryControlEvidenceIsCurrent ? ownerNotificationMonitorNativeBoundaryControlEvidence : null,
    opsControlRoomContinuationEvidenceIsCurrent ? opsControlRoomContinuationEvidence : null,
    opsControlRoomSafetyBlockedEvidenceIsCurrent ? opsControlRoomSafetyBlockedEvidence : null,
    resellerDesktopOnboardingContinuationEvidenceIsCurrent ? resellerDesktopOnboardingContinuationEvidence : null,
    mobileResellerOnboardingContinuationEvidenceIsCurrent ? mobileResellerOnboardingContinuationEvidence : null,
    mobileResellerManagementContinuationEvidenceIsCurrent ? mobileResellerManagementContinuationEvidence : null,
    mobileResellerDashboardContinuationEvidenceIsCurrent ? mobileResellerDashboardContinuationEvidence : null,
    desktopResellerManagementContinuationEvidenceIsCurrent ? desktopResellerManagementContinuationEvidence : null,
    desktopResellerOfflineFeatureDisabledEvidenceIsCurrent ? desktopResellerOfflineFeatureDisabledEvidence : null,
    mobileResellerOfflineFeatureDisabledEvidenceIsCurrent ? mobileResellerOfflineFeatureDisabledEvidence : null,
    platformAssetTemplateLifecycleEvidenceIsCurrent ? platformAssetTemplateLifecycleEvidence : null,
    reportLeadMonitorContinuationEvidenceIsCurrent ? reportLeadMonitorContinuationEvidence : null,
    reportLeadMonitorNativeBoundaryEvidenceIsCurrent ? reportLeadMonitorNativeBoundaryEvidence : null,
    websiteEnquiryMonitorContinuationEvidenceIsCurrent ? websiteEnquiryMonitorContinuationEvidence : null,
    websiteEnquiryMonitorNativeBoundaryEvidenceIsCurrent ? websiteEnquiryMonitorNativeBoundaryEvidence : null,
    platformUserContinuationEvidenceIsCurrent ? platformUserContinuationEvidence : null,
    desktopAiImageGeneratorControlEvidenceIsCurrent ? desktopAiImageGeneratorControlEvidence : null,
    desktopAiImageGeneratorProviderBlockedEvidenceIsCurrent ? desktopAiImageGeneratorProviderBlockedEvidence : null,
    desktopAiImageGeneratorNativeBoundaryEvidenceIsCurrent ? desktopAiImageGeneratorNativeBoundaryEvidence : null,
    desktopPosSyncContinuationEvidenceIsCurrent ? desktopPosSyncContinuationEvidence : null,
    desktopPosSyncProviderBlockedEvidenceIsCurrent ? desktopPosSyncProviderBlockedEvidence : null,
    desktopPosSyncNativeBoundaryEvidenceIsCurrent ? desktopPosSyncNativeBoundaryEvidence : null,
    mobileSharedControlContinuationEvidenceIsCurrent ? mobileSharedControlContinuationEvidence : null,
    mobileSharedNativeBoundaryEvidenceIsCurrent ? mobileSharedNativeBoundaryEvidence : null,
    desktopProjectShareContinuationEvidenceIsCurrent ? desktopProjectShareContinuationEvidence : null,
    desktopProjectShareExternalHandoffEvidenceIsCurrent ? desktopProjectShareExternalHandoffEvidence : null,
    desktopProjectShareNativeBoundaryEvidenceIsCurrent ? desktopProjectShareNativeBoundaryEvidence : null,
    desktopMenuCardExportContinuationEvidenceIsCurrent ? desktopMenuCardExportContinuationEvidence : null,
    desktopMenuCardExportProviderBlockedEvidenceIsCurrent ? desktopMenuCardExportProviderBlockedEvidence : null,
    desktopMenuCardExportNativeBoundaryEvidenceIsCurrent ? desktopMenuCardExportNativeBoundaryEvidence : null,
    desktopMenuCardExportFixtureBlockedEvidenceIsCurrent ? desktopMenuCardExportFixtureBlockedEvidence : null,
    desktopActiveSubscriptionLifecycleEvidenceIsCurrent ? desktopActiveSubscriptionLifecycleEvidence : null,
    desktopActiveSubscriptionProviderBlockedEvidenceIsCurrent ? desktopActiveSubscriptionProviderBlockedEvidence : null,
    desktopActiveSubscriptionFeatureDisabledEvidenceIsCurrent ? desktopActiveSubscriptionFeatureDisabledEvidence : null,
    desktopTraditionalEditorContinuationEvidenceIsCurrent ? desktopTraditionalEditorContinuationEvidence : null,
    desktopTraditionalEditorFixtureBlockedEvidenceIsCurrent ? desktopTraditionalEditorFixtureBlockedEvidence : null,
    desktopCategoryEditorContinuationEvidenceIsCurrent ? desktopCategoryEditorContinuationEvidence : null,
    desktopCategoryEditorProviderBlockedEvidenceIsCurrent ? desktopCategoryEditorProviderBlockedEvidence : null,
    desktopCategoryEditorFixtureBlockedEvidenceIsCurrent ? desktopCategoryEditorFixtureBlockedEvidence : null,
    desktopAiMenuManagerContinuationEvidenceIsCurrent ? desktopAiMenuManagerContinuationEvidence : null,
    desktopAiMenuManagerProviderBlockedEvidenceIsCurrent ? desktopAiMenuManagerProviderBlockedEvidence : null,
    desktopAiMenuManagerFixtureBlockedEvidenceIsCurrent ? desktopAiMenuManagerFixtureBlockedEvidence : null,
    desktopPastActivityFeatureDisabledEvidenceIsCurrent ? desktopPastActivityFeatureDisabledEvidence : null,
    desktopResellerOnboardingProviderResultEvidenceIsCurrent ? desktopResellerOnboardingProviderResultEvidence : null,
    mobileExtractionReviewFixtureBlockedEvidenceIsCurrent ? mobileExtractionReviewFixtureBlockedEvidence : null,
    desktopAiEditProviderResultEvidenceIsCurrent ? desktopAiEditProviderResultEvidence : null,
    desktopAiEditNativeBoundaryEvidenceIsCurrent ? desktopAiEditNativeBoundaryEvidence : null,
    desktopAiEditFixtureBlockedEvidenceIsCurrent ? desktopAiEditFixtureBlockedEvidence : null,
    mediaImageAdjustNativeBoundaryEvidenceIsCurrent ? mediaImageAdjustNativeBoundaryEvidence : null,
    batchImageGenerationProviderResultEvidenceIsCurrent ? batchImageGenerationProviderResultEvidence : null,
    platformSentrySafetyBlockedEvidenceIsCurrent ? platformSentrySafetyBlockedEvidence : null,
    platformSentryExternalHandoffEvidenceIsCurrent ? platformSentryExternalHandoffEvidence : null,
    platformFontPresetFixtureBlockedEvidenceIsCurrent ? platformFontPresetFixtureBlockedEvidence : null,
    platformFontPresetNativeBoundaryEvidenceIsCurrent ? platformFontPresetNativeBoundaryEvidence : null,
    mobileBillingAlternateLifecycleEvidenceIsCurrent ? mobileBillingAlternateLifecycleEvidence : null,
    mobileMenuAlternateFixtureEvidenceIsCurrent ? mobileMenuAlternateFixtureEvidence : null,
    mobileMenuUploadNativeExtractionEvidenceIsCurrent ? mobileMenuUploadNativeExtractionEvidence : null,
    desktopDomainSettingsExternalBoundaryEvidenceIsCurrent ? desktopDomainSettingsExternalBoundaryEvidence : null,
    mobileHoursAlternateStateEvidenceIsCurrent ? mobileHoursAlternateStateEvidence : null,
    mobileFeedbackFixtureBlockedEvidenceIsCurrent ? mobileFeedbackFixtureBlockedEvidence : null,
    phoneOtpProviderBoundaryEvidenceIsCurrent ? phoneOtpProviderBoundaryEvidence : null,
    mobileDomainSettingsExternalBoundaryEvidenceIsCurrent ? mobileDomainSettingsExternalBoundaryEvidence : null,
    growthOsEntitlementProviderBoundaryEvidenceIsCurrent ? growthOsEntitlementProviderBoundaryEvidence : null,
    analyticsGuideExternalHandoffEvidenceIsCurrent ? analyticsGuideExternalHandoffEvidence : null,
    publicObpExternalHandoffEvidenceIsCurrent ? publicObpExternalHandoffEvidence : null,
    publicObpPlaceholderFixtureEvidenceIsCurrent ? publicObpPlaceholderFixtureEvidence : null,
    mobileResellerOnboardingProviderResultEvidenceIsCurrent ? mobileResellerOnboardingProviderResultEvidence : null,
    printableAssetAlternateStateBoundaryEvidenceIsCurrent ? printableAssetAlternateStateBoundaryEvidence : null,
    loginClaimLifecycleBoundaryEvidenceIsCurrent ? loginClaimLifecycleBoundaryEvidence : null,
    mobileShareAlternateNativeBoundaryEvidenceIsCurrent ? mobileShareAlternateNativeBoundaryEvidence : null,
    desktopUseMenuListAlternateStateEvidenceIsCurrent ? desktopUseMenuListAlternateStateEvidence : null,
    desktopProjectLifecycleCurrentBrowserEvidenceIsCurrent ? desktopProjectLifecycleCurrentBrowserEvidence : null,
    desktopProjectEditAlternateProviderEvidenceIsCurrent ? desktopProjectEditAlternateProviderEvidence : null,
    desktopProjectEditLanguageFixtureEvidenceIsCurrent ? desktopProjectEditLanguageFixtureEvidence : null,
    desktopSpecialMenuLanguageProviderEvidenceIsCurrent ? desktopSpecialMenuLanguageProviderEvidence : null,
    desktopStoreCustomizationFixtureEvidenceIsCurrent ? desktopStoreCustomizationFixtureEvidence : null,
    currentOwnerSettingsProjectReboundEvidenceIsCurrent ? currentOwnerSettingsProjectReboundEvidence : null,
    ownerProjectProviderBoundaryEvidenceIsCurrent ? ownerProjectProviderBoundaryEvidence : null,
    ownerSettingsNativeBoundaryEvidenceIsCurrent ? ownerSettingsNativeBoundaryEvidence : null,
    ownerSettingsAlternateFixtureEvidenceIsCurrent ? ownerSettingsAlternateFixtureEvidence : null,
    billingCancellationLifecycleEvidenceIsCurrent ? billingCancellationLifecycleEvidence : null,
    currentOwnerMediaAnalyticsLifecycleEvidenceIsCurrent ? currentOwnerMediaAnalyticsLifecycleEvidence : null,
    analyticsWizardExternalHandoffEvidenceIsCurrent ? analyticsWizardExternalHandoffEvidence : null,
    ownerMediaNativeBoundaryEvidenceIsCurrent ? ownerMediaNativeBoundaryEvidence : null,
    ownerMediaProviderBoundaryEvidenceIsCurrent ? ownerMediaProviderBoundaryEvidence : null,
    ownerMediaFixtureBlockedEvidenceIsCurrent ? ownerMediaFixtureBlockedEvidence : null,
    publicImageViewerInternalHandlersEvidenceIsCurrent ? publicImageViewerInternalHandlersEvidence : null,
    ownerMediaDestructiveSafetyEvidenceIsCurrent ? ownerMediaDestructiveSafetyEvidence : null,
    pricingOnboardingAlternateLifecycleEvidenceIsCurrent ? pricingOnboardingAlternateLifecycleEvidence : null,
    publicBusinessActionExternalHandoffEvidenceIsCurrent ? publicBusinessActionExternalHandoffEvidence : null,
    publicBusinessActionFixtureEvidenceIsCurrent ? publicBusinessActionFixtureEvidence : null,
    feedbackQrNativeAndExternalEvidenceIsCurrent ? feedbackQrNativeAndExternalEvidence : null,
    currentAnalyticsSettingsDraftEvidenceIsCurrent ? currentAnalyticsSettingsDraftEvidence : null,
    ownerAlternateFeatureFixtureEvidenceIsCurrent ? ownerAlternateFeatureFixtureEvidence : null,
    ownerAiGenerationProviderBoundaryEvidenceIsCurrent ? ownerAiGenerationProviderBoundaryEvidence : null,
    digitalScreenOwnerUploadNativeEvidenceIsCurrent ? digitalScreenOwnerUploadNativeEvidence : null,
    ownerAlternateLifecycleComponentEvidenceIsCurrent ? ownerAlternateLifecycleComponentEvidence : null,
    ownerNativeArtifactComponentEvidenceIsCurrent ? ownerNativeArtifactComponentEvidence : null,
    ownerProviderDependentComponentEvidenceIsCurrent ? ownerProviderDependentComponentEvidence : null,
    publicSharingExternalComponentEvidenceIsCurrent ? publicSharingExternalComponentEvidence : null,
    currentBehavioralContractControlEvidenceIsCurrent ? currentBehavioralContractControlEvidence : null,
    remainingAlternateFixtureComponentEvidenceIsCurrent ? remainingAlternateFixtureComponentEvidence : null,
    remainingProviderDependentComponentEvidenceIsCurrent ? remainingProviderDependentComponentEvidence : null,
    remainingNativeArtifactComponentEvidenceIsCurrent ? remainingNativeArtifactComponentEvidence : null,
    currentAdjacentContractComponentEvidenceIsCurrent ? currentAdjacentContractComponentEvidence : null,
    aiSearchExternalBoundaryEvidenceIsCurrent ? aiSearchExternalBoundaryEvidence : null,
    notificationPreferredChannelBrowserEvidenceIsCurrent ? notificationPreferredChannelBrowserEvidence : null,
    notificationWhatsAppFixtureEvidenceIsCurrent ? notificationWhatsAppFixtureEvidence : null,
    businessSettingsReversibleBrowserEvidenceIsCurrent ? businessSettingsReversibleBrowserEvidence : null,
    feedbackReviewExternalHandoffEvidenceIsCurrent ? feedbackReviewExternalHandoffEvidence : null,
    platformPullApiKeyBrowserEvidenceIsCurrent ? platformPullApiKeyBrowserEvidence : null,
    platformPullApiKeyNativeClipboardEvidenceIsCurrent ? platformPullApiKeyNativeClipboardEvidence : null,
    socialMediaDraftBrowserEvidenceIsCurrent ? socialMediaDraftBrowserEvidence : null,
    compliancePageLifecycleBrowserEvidenceIsCurrent ? compliancePageLifecycleBrowserEvidence : null,
    googleListingReminderBrowserEvidenceIsCurrent ? googleListingReminderBrowserEvidence : null,
    googleListingNativeClipboardEvidenceIsCurrent ? googleListingNativeClipboardEvidence : null,
    googleListingExternalHandoffEvidenceIsCurrent ? googleListingExternalHandoffEvidence : null,
    businessSettingsSaveLifecycleEvidenceIsCurrent ? businessSettingsSaveLifecycleEvidence : null,
    timeSlotPresetEntryBrowserEvidenceIsCurrent ? timeSlotPresetEntryBrowserEvidence : null,
    workingHoursDraftBrowserEvidenceIsCurrent ? workingHoursDraftBrowserEvidence : null,
    businessCopyProviderBoundaryEvidenceIsCurrent ? businessCopyProviderBoundaryEvidence : null,
    businessCopyRepairFixtureEvidenceIsCurrent ? businessCopyRepairFixtureEvidence : null,
    websiteAuthenticatedDashboardEvidenceIsCurrent ? websiteAuthenticatedDashboardEvidence : null,
    websiteLogoutSafetyEvidenceIsCurrent ? websiteLogoutSafetyEvidence : null,
    transactionsPaginationFixtureEvidenceIsCurrent ? transactionsPaginationFixtureEvidence : null,
    feedbackCardExternalReplyEvidenceIsCurrent ? feedbackCardExternalReplyEvidence : null,
    feedbackCardNativeReplyCopyEvidenceIsCurrent ? feedbackCardNativeReplyCopyEvidence : null,
    messagePreviewSuccessFixtureEvidenceIsCurrent ? messagePreviewSuccessFixtureEvidence : null,
    messagePreviewWhatsAppHandoffEvidenceIsCurrent ? messagePreviewWhatsAppHandoffEvidence : null,
    obpMenuCtaAlternateLifecycleEvidenceIsCurrent ? obpMenuCtaAlternateLifecycleEvidence : null,
    obpMenuCtaCommentEvidenceIsCurrent ? obpMenuCtaCommentEvidence : null,
    menuBreadcrumbAlternateLayoutEvidenceIsCurrent ? menuBreadcrumbAlternateLayoutEvidence : null,
    globalErrorRuntimeEvidenceIsCurrent ? globalErrorRuntimeEvidence : null,
    rootErrorRuntimeEvidenceIsCurrent ? rootErrorRuntimeEvidence : null,
    storeAccessRecoveryRuntimeEvidenceIsCurrent ? storeAccessRecoveryRuntimeEvidence : null,
    mobileTextCaseReversibleEvidenceIsCurrent ? mobileTextCaseReversibleEvidence : null,
    mobileTextCaseMaskBoundaryEvidenceIsCurrent ? mobileTextCaseMaskBoundaryEvidence : null,
    mobileTextCaseApplySafetyEvidenceIsCurrent ? mobileTextCaseApplySafetyEvidence : null,
    decisionBlocksReversibleEvidenceIsCurrent ? decisionBlocksReversibleEvidence : null,
    decisionBlocksSaveSafetyEvidenceIsCurrent ? decisionBlocksSaveSafetyEvidence : null,
    decisionChoicePosterDesktopEvidenceIsCurrent ? decisionChoicePosterDesktopEvidence : null,
    decisionChoicePosterMobileEvidenceIsCurrent ? decisionChoicePosterMobileEvidence : null,
    mobileNotificationReversibleEvidenceIsCurrent ? mobileNotificationReversibleEvidence : null,
    mobileNotificationWhatsAppFixtureEvidenceIsCurrent ? mobileNotificationWhatsAppFixtureEvidence : null,
    mobileNotificationSaveSafetyEvidenceIsCurrent ? mobileNotificationSaveSafetyEvidence : null,
    mobileAdvancedSocialEditorEvidenceIsCurrent ? mobileAdvancedSocialEditorEvidence : null,
    mobileAdvancedSocialExternalEvidenceIsCurrent ? mobileAdvancedSocialExternalEvidence : null,
    mobileAdvancedSocialRemoveFixtureEvidenceIsCurrent ? mobileAdvancedSocialRemoveFixtureEvidence : null,
    creativeEditorAlternateDraftQrEvidenceIsCurrent ? creativeEditorAlternateDraftQrEvidence : null,
    businessHealthProjectScopeCurrentEvidenceIsCurrent ? businessHealthProjectScopeCurrentEvidence : null,
    publicTruthOwnerCheckCurrentEvidenceIsCurrent ? publicTruthOwnerCheckCurrentEvidence : null,
    publicTruthMonitorCurrentEvidenceIsCurrent ? publicTruthMonitorCurrentEvidence : null,
    verticalSidebarCurrentEvidenceIsCurrent ? verticalSidebarCurrentEvidence : null,
    horizontalSidebarCurrentEvidenceIsCurrent ? horizontalSidebarCurrentEvidence : null,
    appBreadcrumbCurrentEvidenceIsCurrent ? appBreadcrumbCurrentEvidence : null,
    analyticsExportRuntimeEvidenceIsCurrent ? analyticsExportRuntimeEvidence : null,
    projectConfirmModalRuntimeEvidenceIsCurrent ? projectConfirmModalRuntimeEvidence : null,
    errorRecoveryAlertRuntimeEvidenceIsCurrent ? errorRecoveryAlertRuntimeEvidence : null,
    projectSelectorRuntimeEvidenceIsCurrent ? projectSelectorRuntimeEvidence : null,
    aiSearchActionButtonsRuntimeEvidenceIsCurrent ? aiSearchActionButtonsRuntimeEvidence : null,
    aiSearchSearchBarRuntimeEvidenceIsCurrent ? aiSearchSearchBarRuntimeEvidence : null,
    aiSearchLocalResultsRuntimeEvidenceIsCurrent ? aiSearchLocalResultsRuntimeEvidence : null,
    welcomeModalRuntimeEvidenceIsCurrent ? welcomeModalRuntimeEvidence : null,
    upgradeConfirmationRuntimeEvidenceIsCurrent ? upgradeConfirmationRuntimeEvidence : null,
    messageReferencesRuntimeEvidenceIsCurrent ? messageReferencesRuntimeEvidence : null,
    creditPackRuntimeEvidenceIsCurrent ? creditPackRuntimeEvidence : null,
    creditPackSignInExternalEvidenceIsCurrent ? creditPackSignInExternalEvidence : null,
    privacyPolicyMailtoBoundaryEvidenceIsCurrent ? privacyPolicyMailtoBoundaryEvidence : null,
    pricingPlansModalRuntimeEvidenceIsCurrent ? pricingPlansModalRuntimeEvidence : null,
    editSpecialMenuScheduleRuntimeEvidenceIsCurrent ? editSpecialMenuScheduleRuntimeEvidence : null,
    menuFiltersRuntimeEvidenceIsCurrent ? menuFiltersRuntimeEvidence : null,
    menuLanguageSwitcherRuntimeEvidenceIsCurrent ? menuLanguageSwitcherRuntimeEvidence : null,
    transactionDetailsRuntimeEvidenceIsCurrent ? transactionDetailsRuntimeEvidence : null,
    articleViewModalRecoveryRuntimeEvidenceIsCurrent ? articleViewModalRecoveryRuntimeEvidence : null,
    publicCookieConsentRuntimeEvidenceIsCurrent ? publicCookieConsentRuntimeEvidence : null,
    masterUpdateBannerRuntimeEvidenceIsCurrent ? masterUpdateBannerRuntimeEvidence : null,
    dateRangeSelectorRuntimeEvidenceIsCurrent ? dateRangeSelectorRuntimeEvidence : null,
    installInstructionsRuntimeEvidenceIsCurrent ? installInstructionsRuntimeEvidence : null,
    installPromptRuntimeEvidenceIsCurrent ? installPromptRuntimeEvidence : null,
    lucideIconGridRuntimeEvidenceIsCurrent ? lucideIconGridRuntimeEvidence : null,
    mobileTempStatusConfiguratorRuntimeEvidenceIsCurrent ? mobileTempStatusConfiguratorRuntimeEvidence : null,
    mobileMenuCommandSheetRuntimeEvidenceIsCurrent ? mobileMenuCommandSheetRuntimeEvidence : null,
    mobileCompliancePagesRuntimeEvidenceIsCurrent ? mobileCompliancePagesRuntimeEvidence : null,
    mobileCompliancePageExternalEvidenceIsCurrent ? mobileCompliancePageExternalEvidence : null,
    mobileSchedulerMonitorRuntimeEvidenceIsCurrent ? mobileSchedulerMonitorRuntimeEvidence : null,
    mobileSchedulerRecoverySafetyEvidenceIsCurrent ? mobileSchedulerRecoverySafetyEvidence : null,
    commandCenterActiveInactiveRuntimeEvidenceIsCurrent ? commandCenterActiveInactiveRuntimeEvidence : null,
    commandCenterAvailabilityRuntimeEvidenceIsCurrent ? commandCenterAvailabilityRuntimeEvidence : null,
    commandCenterPricingRuntimeEvidenceIsCurrent ? commandCenterPricingRuntimeEvidence : null,
    commandCenterTextCaseRuntimeEvidenceIsCurrent ? commandCenterTextCaseRuntimeEvidence : null,
    languageSelectorRuntimeEvidenceIsCurrent ? languageSelectorRuntimeEvidence : null,
    ownerAppUpdatePromptRuntimeEvidenceIsCurrent ? ownerAppUpdatePromptRuntimeEvidence : null,
    ownerAppUpdateRefreshNativeEvidenceIsCurrent ? ownerAppUpdateRefreshNativeEvidence : null,
    starRatingRuntimeEvidenceIsCurrent ? starRatingRuntimeEvidence : null,
    mediaAspectRatioRuntimeEvidenceIsCurrent ? mediaAspectRatioRuntimeEvidence : null,
    ownerAssistantInputRuntimeEvidenceIsCurrent ? ownerAssistantInputRuntimeEvidence : null,
    reorderSortableItemRuntimeEvidenceIsCurrent ? reorderSortableItemRuntimeEvidence : null,
    billingHistoryEmailRuntimeEvidenceIsCurrent ? billingHistoryEmailRuntimeEvidence : null,
    billingHistoryInvoiceExternalEvidenceIsCurrent ? billingHistoryInvoiceExternalEvidence : null,
    analyticsEmptyStateRuntimeEvidenceIsCurrent ? analyticsEmptyStateRuntimeEvidence : null,
    analyticsRefreshRuntimeEvidenceIsCurrent ? analyticsRefreshRuntimeEvidence : null,
    analyticsMetricCardRuntimeEvidenceIsCurrent ? analyticsMetricCardRuntimeEvidence : null,
    analyticsStatCardRuntimeEvidenceIsCurrent ? analyticsStatCardRuntimeEvidence : null,
    mobileLocalizedLanguageRuntimeEvidenceIsCurrent ? mobileLocalizedLanguageRuntimeEvidence : null,
    searchSuggestionsRuntimeEvidenceIsCurrent ? searchSuggestionsRuntimeEvidence : null,
    businessHealthSuggestedQuestionRuntimeEvidenceIsCurrent ? businessHealthSuggestedQuestionRuntimeEvidence : null,
    ownerAssistantSourceDisclosureRuntimeEvidenceIsCurrent ? ownerAssistantSourceDisclosureRuntimeEvidence : null,
    menuFilterChipsRuntimeEvidenceIsCurrent ? menuFilterChipsRuntimeEvidence : null,
    analyticsDataTableSearchRuntimeEvidenceIsCurrent ? analyticsDataTableSearchRuntimeEvidence : null,
    analyticsFeedbackListRuntimeEvidenceIsCurrent ? analyticsFeedbackListRuntimeEvidence : null,
    analyticsKnowledgeGapsRuntimeEvidenceIsCurrent ? analyticsKnowledgeGapsRuntimeEvidence : null,
    analyticsTopQuestionsRuntimeEvidenceIsCurrent ? analyticsTopQuestionsRuntimeEvidence : null,
    skipToContentRuntimeEvidenceIsCurrent ? skipToContentRuntimeEvidence : null,
    scrollToBottomRuntimeEvidenceIsCurrent ? scrollToBottomRuntimeEvidence : null,
    backToTopRuntimeEvidenceIsCurrent ? backToTopRuntimeEvidence : null,
    emojiGridSearchRuntimeEvidenceIsCurrent ? emojiGridSearchRuntimeEvidence : null,
    todayPrimaryCardRuntimeEvidenceIsCurrent ? todayPrimaryCardRuntimeEvidence : null,
    businessHealthHeaderRuntimeEvidenceIsCurrent ? businessHealthHeaderRuntimeEvidence : null,
    loadingMessageCancelRuntimeEvidenceIsCurrent ? loadingMessageCancelRuntimeEvidence : null,
    aiButtonIconRuntimeEvidenceIsCurrent ? aiButtonIconRuntimeEvidence : null,
    knowledgeBaseSourceFileRuntimeEvidenceIsCurrent ? knowledgeBaseSourceFileRuntimeEvidence : null,
    todayOperationalSectionRuntimeEvidenceIsCurrent ? todayOperationalSectionRuntimeEvidence : null,
    noSubscriptionViewPlansRuntimeEvidenceIsCurrent ? noSubscriptionViewPlansRuntimeEvidence : null,
    emptyProjectStateRuntimeEvidenceIsCurrent ? emptyProjectStateRuntimeEvidence : null,
    feedbackIntelligenceDisclosureRuntimeEvidenceIsCurrent ? feedbackIntelligenceDisclosureRuntimeEvidence : null,
    remainingCurrentComponentControlEvidenceIsCurrent ? remainingCurrentComponentControlEvidence : null,
    remainingCurrentBrowserControlEvidenceIsCurrent ? remainingCurrentBrowserControlEvidence : null,
    remainingCurrentNativeBoundaryEvidenceIsCurrent ? remainingCurrentNativeBoundaryEvidence : null,
    remainingCurrentExternalBoundaryEvidenceIsCurrent ? remainingCurrentExternalBoundaryEvidence : null,
    remainingCurrentProviderBoundaryEvidenceIsCurrent ? remainingCurrentProviderBoundaryEvidence : null,
    remainingCurrentNotTriggerableEvidenceIsCurrent ? remainingCurrentNotTriggerableEvidence : null,
    remainingCurrentAlternateLifecycleEvidenceIsCurrent ? remainingCurrentAlternateLifecycleEvidence : null,
    remainingCurrentSafetyBoundaryEvidenceIsCurrent ? remainingCurrentSafetyBoundaryEvidence : null,
    remainingCurrentFixtureBoundaryEvidenceIsCurrent ? remainingCurrentFixtureBoundaryEvidence : null,
    currentPrintableDesktopBrowserEvidenceIsCurrent ? currentPrintableDesktopBrowserEvidence : null,
    currentItemProductTagDesktopBrowserEvidenceIsCurrent ? currentItemProductTagDesktopBrowserEvidence : null,
    currentPrintableAlternateLifecycleEvidenceIsCurrent ? currentPrintableAlternateLifecycleEvidence : null,
    currentPrintableSafetyEvidenceIsCurrent ? currentPrintableSafetyEvidence : null,
    currentPrintableFixtureEvidenceIsCurrent ? currentPrintableFixtureEvidence : null,
    currentPrintableNativeEvidenceIsCurrent ? currentPrintableNativeEvidence : null,
    currentPrintableExternalEvidenceIsCurrent ? currentPrintableExternalEvidence : null,
    bulkActionsControlEvidenceIsCurrent ? bulkActionsControlEvidence : null,
    mobileMoreControlEvidenceIsCurrent ? mobileMoreControlEvidence : null,
    mobileMoreFeatureDisabledControlEvidenceIsCurrent ? mobileMoreFeatureDisabledControlEvidence : null,
    mobileMoreSafetyBlockedControlEvidenceIsCurrent ? mobileMoreSafetyBlockedControlEvidence : null,
    mobileMenuControlEvidenceIsCurrent ? mobileMenuControlEvidence : null,
    mobileMenuNativeBoundaryControlEvidenceIsCurrent ? mobileMenuNativeBoundaryControlEvidence : null,
    mobileItemEditAlternateFixtureEvidenceIsCurrent ? mobileItemEditAlternateFixtureEvidence : null,
    mobileItemEditProviderBoundaryEvidenceIsCurrent ? mobileItemEditProviderBoundaryEvidence : null,
    mobileItemProductTagCurrentIntegrationEvidenceIsCurrent ? mobileItemProductTagCurrentIntegrationEvidence : null,
    mobileShareControlEvidenceIsCurrent ? mobileShareControlEvidence : null,
    mobileShareFeatureDisabledControlEvidenceIsCurrent ? mobileShareFeatureDisabledControlEvidence : null,
    mobileShareNotShippedControlEvidenceIsCurrent ? mobileShareNotShippedControlEvidence : null,
    mobileShareNativeBoundaryControlEvidenceIsCurrent ? mobileShareNativeBoundaryControlEvidence : null,
    printableAssetControlEvidenceIsCurrent ? printableAssetControlEvidence : null,
    printableAssetNativeBoundaryControlEvidenceIsCurrent ? printableAssetNativeBoundaryControlEvidence : null,
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
    ["button", /<(?:button|Button|FloatingBubble|IconButton|WebsiteButton)\b/],
    ["link", /<(?:a|Link|NavLink)\b/],
    ["form", /<(?:form\b|Form(?!\.)\b)/],
    ["input", /<(?:input|Input|InputNumber|SearchBar|TextArea|textarea)\b/],
    ["selection", /<(?:select|Select|Checkbox|Radio|Switch|DatePicker|TimePicker|Segmented|ColorPicker|Rate|Slider|RangePicker|TreeSelect|Tree)\b/],
    ["disclosure", /<(?:Collapse|Tabs|Dropdown|Menu|Popover|AccordionTrigger)\b/],
    ["dialog-action-surface", /<(?:Modal|Drawer|Popconfirm|Popup)\b/],
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
        && apiAnonymousBoundaryEvidence.handlers === 141
        && apiAnonymousBoundaryEvidence.methodProbes === 162
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

function controlRuntimeEvidence(source, controlAction, product, isPageReachable) {
    const matchedEvidence = controlEvidenceBySourceAction.get(`${source}|${controlAction}`);
    if (!matchedEvidence) {
        if (product !== "MenuList" || !isPageReachable) return {};
        return {
            test_type: "current-source-interaction-pending-boundary",
            test_result: "BLOCKED_CURRENT_SOURCE_INTERACTION_PENDING",
            regression_test_added: "NO",
            final_verification_status: "CURRENT_SOURCE_CONTROL_REQUIRES_BROWSER_OR_DETERMINISTIC_FIXTURE_INTERACTION",
            evidence_or_notes: "Current source and route reachability are inventoried; no browser or deterministic interaction evidence is credited for this control.",
        };
    }
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
    const isProductSeparationBoundary = values.product_area
        && values.product_area !== "MenuList";
    rows.push(makeRow({
        inventory_id: id,
        role: isProductSeparationBoundary ? "SEPARATION_BOUNDARY_ONLY" : "DERIVE_FROM_RUNTIME_GUARD",
        tenant_state: isProductSeparationBoundary ? "PRODUCT_HOST_BOUNDARY" : "DERIVE_FROM_RUNTIME_GUARD",
        store_state: isProductSeparationBoundary ? "OUT_OF_SCOPE_EXCEPT_ISOLATION" : "DERIVE_FROM_RUNTIME_GUARD",
        subscription_or_entitlement_state: isProductSeparationBoundary ? "OUT_OF_SCOPE_EXCEPT_ISOLATION" : "DERIVE_FROM_RUNTIME_GUARD",
        feature_flag_state: "CURRENT_AND_MATERIAL_ALTERNATE",
        viewport: "DERIVE_FROM_SURFACE",
        test_result: isProductSeparationBoundary ? "PASS_OUT_OF_SCOPE_PRODUCT_BOUNDARY" : "NOT_RUN",
        regression_test_added: "NO",
        final_verification_status: isProductSeparationBoundary
            ? "OUT_OF_SCOPE_PRODUCT_BOUNDARY_INVENTORIED"
            : "DISCOVERED_UNTESTED",
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
                ...controlRuntimeEvidence(rel, controlAction, controlProduct, reachableRoutes.length > 0),
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
