'use client'

import {
    BRAND_COLOR_PRESETS,
    DEFAULTS,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
    resolveMenuDesignConfig,
} from '@config/designSystem';
import useViewportInfo from '@hook/useViewportInfo';
import { assertProjectUpdateSucceeded, publishProject, uploadFile } from '@database/projects';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedDraftText, getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from '@lib/localization/text';
import {
    findMatchingMenuDesignPreset,
    getMenuDesignPresetPatch,
    getOwnerSelectableMenuLayoutEntries,
    getOwnerSelectableMenuLayouts,
    getPreferredMenuLayoutForMood,
    getRecommendedMenuDesignPresets,
    type MenuDesignPreset,
} from '@lib/menu/menuDesignPresets';
import { getMenuSpecialNoteSuggestions } from '@lib/menu/specialNoteSuggestions';
import { getDataUrlMimeType, getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { isDataUrl } from '@lib/media/mediaStorage';
import { prepareMediaImage, type MediaImageCropIntent } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaPublicContextPreview from '@/components/shared/media/MediaPublicContextPreview';
import MenuStylePresetPreview from '@/components/shared/menuDesign/MenuStylePresetPreview';
import { generateProjectUrl } from '@lib/utils/slugify';
import {
    MENULIST_ANSWERLATTICE_EVENTS,
    MENULIST_ANSWERLATTICE_TARGETS,
    emitMenuListAnswerlatticeWorkflowEvent,
    getMenuListAnswerlatticeTargetProps,
    isVerifiedMenuPublishResult,
} from '@lib/answerlattice/referenceClients/menuListGuidedResolution';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuCheck, LuChevronDown, LuEye, LuLink2, LuPalette, LuX } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, Collapse, DotLoading, Flex, List, NavBar, Popup, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import {
    getBoundedMobileProjectStringContext,
    getMobileProjectLogContext,
    getMobileProjectStoreLogContext,
    logMobileProjectFailure,
    type MobileProjectLogContext,
} from '../utils/mobileProjectDiagnostics';
import { openMobilePublicLink } from '../utils/openMobilePublicLink';
import { MENU_SHEET_BODY_STYLE, MENU_SHEET_CONTAINER_STYLE } from '../sheets/menuSheetLayout';

const ColorPickerSheet = dynamic(() => import('../sheets/ColorPickerSheet'), { ssr: false });
const MobileMenuDesignPreviewSheet = dynamic(() => import('../sheets/MobileMenuDesignPreviewSheet'), { ssr: false });

const SERVICE_CHARGE_MAX_LENGTH = 140;
const MOBILE_DESIGN_LINK_COPY_UNAVAILABLE = 'mobile_design_link_copy_unavailable';
const MOBILE_DESIGN_LINK_COPY_FALLBACK_FAILED = 'mobile_design_link_copy_fallback_failed';

const hasMobileDesignClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileDesignCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileDesignLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileDesignClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileDesignCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_DESIGN_LINK_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_DESIGN_LINK_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface MobileDesignEditorScreenProps {
    embedded?: boolean;
    embeddedProjectData?: any;
    embeddedStoreDetails?: any;
    onEmbeddedProjectDataChange?: (projectData: any) => void;
    onBack: () => void;
}

function cloneProjectData<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export default function MobileDesignEditorScreen({
    embedded = false,
    embeddedProjectData,
    embeddedStoreDetails,
    onEmbeddedProjectDataChange,
    onBack,
}: MobileDesignEditorScreenProps) {
    const t = useTranslations('MobileDesignEditor');
    const tSettings = useTranslations('Settings');
    const tShare = useTranslations('MobileShare');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const labels = useOfferingLabels();
    const { storeDetails: contextStoreDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const storeDetails = embeddedStoreDetails || contextStoreDetails;
    const mobileProjects = useMobileProjects();
    const loadingProjects = embedded ? false : mobileProjects.isLoading;
    const projectsList = embedded ? [] : mobileProjects.projectsList;
    const selectedProject = embedded ? embeddedProjectData : mobileProjects.selectedProject;
    const selectedProjectId = embedded
        ? (embeddedProjectData?.projectId || embeddedProjectData?.id || null)
        : mobileProjects.selectedProjectId;
    const selectedProjectSummary = embedded
        ? (embeddedProjectData ? {
            active: embeddedProjectData.active,
            deleted: embeddedProjectData.deleted,
            isDefault: embeddedProjectData.isDefault,
            isSpecialMenu: embeddedProjectData.isSpecialMenu,
            name: embeddedProjectData.name,
            projectId: embeddedProjectData.projectId || embeddedProjectData.id || 'current',
            projectImage: embeddedProjectData.projectImage || null,
            specialMenuBaseProjectId: embeddedProjectData.specialMenuBaseProjectId,
            specialMenuEndsAt: embeddedProjectData.specialMenuEndsAt,
            specialMenuStatus: embeddedProjectData.specialMenuStatus,
        } : null)
        : mobileProjects.selectedProjectSummary;
    const selectProject = mobileProjects.selectProject;
    const upsertCachedProject = embedded
        ? (project: any) => onEmbeddedProjectDataChange?.(cloneProjectData(project))
        : mobileProjects.upsertCachedProject;

    const [draftProjectData, setDraftProjectData] = useState<any>(null);
    const [savedProjectData, setSavedProjectData] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [isPreviewSheetOpen, setIsPreviewSheetOpen] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [isRecommendedStylesSheetOpen, setIsRecommendedStylesSheetOpen] = useState(false);
    const [selectedRecommendedPresetKey, setSelectedRecommendedPresetKey] = useState<string>('');
    const [backgroundImageDraft, setBackgroundImageDraft] = useState<{
        crop?: MediaImageCropIntent;
        fileName?: string;
        sourceDataUrl?: string;
    } | null>(null);
    const [isBackgroundAdjustOpen, setIsBackgroundAdjustOpen] = useState(false);
    const lastEmbeddedSyncKeyRef = useRef('');

    const menuDesign = resolveMenuDesignConfig(draftProjectData?.config?.design?.menu);
    const menuMood = menuDesign.mood;
    const menuLayout = menuDesign.layout;
    const showItemPrices = menuDesign.showItemPrices ?? true;
    const showImages = menuDesign.showImages ?? true;
    const showCategoryIcons = menuDesign.showCategoryIcons ?? true;
    const showCategoryTabs = menuDesign.showCategoryTabs ?? false;
    const backgroundImage = menuDesign.backgroundImage;
    const brandAccentColor = draftProjectData?.config?.design?.brand?.accentColor;
    const specialNoteLanguage = draftProjectData?.defaultLanguage || 'en';
    const specialNote = getLocalizedDraftText(draftProjectData?.menuSettings?.specialNote, specialNoteLanguage, '');
    const compatibleLayouts = useMemo(() => getOwnerSelectableMenuLayouts(menuMood), [menuMood]);
    const layoutEntries = useMemo(() => getOwnerSelectableMenuLayoutEntries(menuMood), [menuMood]);
    const defaultMoodColor = MENU_MOODS[menuMood]?.accentColor || '#059669';
    const toneBackground = MENU_MOODS[menuMood]?.background || token.colorBgContainer;
    const specialNoteSuggestions = useMemo(() => getMenuSpecialNoteSuggestions(t), [t]);
    const recommendedPresets = useMemo(() => getRecommendedMenuDesignPresets({
        businessType: storeDetails?.businessType,
        businessCategory: storeDetails?.businessCategory,
    }), [storeDetails?.businessCategory, storeDetails?.businessType]);
    const selectedQuickPreset = useMemo(() => findMatchingMenuDesignPreset({
        mood: menuMood,
        layout: menuLayout,
        accentColor: brandAccentColor,
        showItemPrices,
        showImages,
        showCategoryIcons,
        showCategoryTabs,
    }), [brandAccentColor, menuLayout, menuMood, showCategoryIcons, showCategoryTabs, showImages, showItemPrices]);
    const selectedRecommendedPreset = useMemo(() => (
        recommendedPresets.find((preset) => preset.key === selectedRecommendedPresetKey)
        || recommendedPresets[0]
        || null
    ), [recommendedPresets, selectedRecommendedPresetKey]);
    const resolvedProjectName = useMemo(
        () => getLocalizedText(
            draftProjectData?.name || selectedProjectSummary?.name,
            undefined,
            getPrimaryLocalizedLanguage(draftProjectData?.name || selectedProjectSummary?.name, 'en'),
            undefined,
        ),
        [draftProjectData?.name, selectedProjectSummary?.name]
    );

    const hasChanges = useMemo(() => {
        if (!draftProjectData || !savedProjectData) return false;
        return JSON.stringify(draftProjectData) !== JSON.stringify(savedProjectData);
    }, [draftProjectData, savedProjectData]);

    const menuUrl = useMemo(() => generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        resolvedProjectName || undefined,
        false,
    ), [resolvedProjectName, storeDetails?.customDomain, storeDetails?.subdomain]);
    const isProjectSelectorClickable = projectsList.length > 1 && !isPublishing;

    const buildMobileDesignLogContext = useCallback((
        flow: string,
        metadata: MobileProjectLogContext = {},
    ): MobileProjectLogContext => ({
        surface: 'mobile_design_editor',
        flow,
        ...getMobileProjectLogContext(draftProjectData?.projectId || selectedProjectId, draftProjectData?.masterProjectId),
        ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
        ...getBoundedMobileProjectStringContext('menuUrl', menuUrl),
        ...getBoundedMobileProjectStringContext('layout', menuDesign.layout),
        ...getBoundedMobileProjectStringContext('mood', menuDesign.mood),
        embedded,
        hasBrandAccentColor: Boolean(brandAccentColor),
        hasMenuBackgroundImage: Boolean(menuDesign.backgroundImage),
        projectCount: projectsList.length,
        supportsNativeShare,
        ...metadata,
    }), [
        brandAccentColor,
        draftProjectData?.masterProjectId,
        draftProjectData?.projectId,
        embedded,
        menuDesign.backgroundImage,
        menuDesign.layout,
        menuDesign.mood,
        menuUrl,
        projectsList.length,
        selectedProjectId,
        storeDetails?.storeId,
        storeDetails?.tenantId,
        supportsNativeShare,
    ]);

    useEffect(() => {
        if (!selectedProject) {
            setDraftProjectData(null);
            setSavedProjectData(null);
            return;
        }

        const cloned = cloneProjectData(selectedProject);
        if (embedded) {
            lastEmbeddedSyncKeyRef.current = JSON.stringify(cloned);
        }
        setDraftProjectData(cloned);
        setSavedProjectData(cloneProjectData(cloned));
        setBackgroundImageDraft(null);
        setIsBackgroundAdjustOpen(false);
    }, [embedded, selectedProject]);

    useEffect(() => {
        if (!embedded || !draftProjectData || !onEmbeddedProjectDataChange) return;
        const nextKey = JSON.stringify(draftProjectData);
        if (nextKey === lastEmbeddedSyncKeyRef.current) return;
        lastEmbeddedSyncKeyRef.current = nextKey;
        onEmbeddedProjectDataChange(cloneProjectData(draftProjectData));
    }, [draftProjectData, embedded, onEmbeddedProjectDataChange]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const updateDesign = useCallback((path: string[], value: any) => {
        setDraftProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = cloneProjectData(prev);
            let obj = copy;
            for (let i = 0; i < path.length - 1; i++) {
                if (!obj[path[i]]) obj[path[i]] = {};
                obj = obj[path[i]];
            }
            obj[path[path.length - 1]] = value;
            return copy;
        });
    }, []);

    const handleMoodChange = (mood: MenuMood) => {
        setDraftProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = cloneProjectData(prev);
            if (!copy.config) copy.config = {};
            if (!copy.config.design) copy.config.design = {};
            if (!copy.config.design.menu) copy.config.design.menu = {};
            copy.config.design.menu.mood = mood;
            copy.config.design.menu.layout = getPreferredMenuLayoutForMood(mood);
            return copy;
        });
    };
    const handleLayoutChange = (layout: MenuLayout) => {
        if (!compatibleLayouts.includes(layout)) return;
        updateDesign(['config', 'design', 'menu', 'layout'], layout);
    };
    const handleShowItemPricesChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showItemPrices'], show);
    const handleShowImagesChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showImages'], show);
    const handleShowCategoryIconsChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showCategoryIcons'], show);
    const handleCategoryTabsChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showCategoryTabs'], show);
    const handleBrandColorChange = (color: string | undefined) => updateDesign(['config', 'design', 'brand', 'accentColor'], color);
    const handleBackgroundImageChange = (imageUrl: string) => updateDesign(['config', 'design', 'menu', 'backgroundImage'], imageUrl);
    const handleBackgroundImageRemove = () => {
        setBackgroundImageDraft(null);
        setIsBackgroundAdjustOpen(false);
        handleBackgroundImageChange('');
    };
    const handleBackgroundImageSelect = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'menuBackground');
            handleBackgroundImageChange(prepared.dataUrl);
            setBackgroundImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
        } catch (error) {
            logMobileProjectFailure('mobile_design_background_image_prepare_failed', error, {
                ...getMobileProjectLogContext(draftProjectData?.projectId || selectedProjectId, draftProjectData?.masterProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileProjectStringContext('fileName', file.name),
                embedded,
            });
            Toast.show({ content: 'Could not prepare background image.', duration: 1800 });
        }
        return false;
    };
    const handleServiceChargeChange = (note: string) => {
        // Preserve inter-word/trailing spaces in the controlled input. The
        // public resolver trims/collapses whitespace after persistence.
        const normalized = note.slice(0, SERVICE_CHARGE_MAX_LENGTH);
        setDraftProjectData((prev: any) => ({
            ...prev,
            menuSettings: {
                ...prev?.menuSettings,
                specialNote: updateLocalizedText(
                    prev?.menuSettings?.specialNote,
                    normalized,
                    specialNoteLanguage,
                    'en',
                ),
            },
        }));
    };

    const applyQuickPreset = (preset: MenuDesignPreset) => {
        setDraftProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = cloneProjectData(prev);
            if (!copy.config) copy.config = {};
            if (!copy.config.design) copy.config.design = {};
            const patch = getMenuDesignPresetPatch(preset);
            copy.config.design.menu = {
                ...copy.config.design.menu,
                ...patch.menu,
            };
            copy.config.design.brand = { ...copy.config.design.brand, ...patch.brand };
            return copy;
        });
        setIsRecommendedStylesSheetOpen(false);
        Toast.show({ content: t('appliedStyle', { name: preset.label }), duration: 1500 });
    };

    const openRecommendedStylesSheet = () => {
        const currentRecommendedPreset = recommendedPresets.find((preset) => preset.key === selectedQuickPreset?.key);
        setSelectedRecommendedPresetKey(currentRecommendedPreset?.key || recommendedPresets[0]?.key || '');
        setIsRecommendedStylesSheetOpen(true);
    };

    const applySelectedRecommendedStyle = () => {
        if (!selectedRecommendedPreset) return;
        applyQuickPreset(selectedRecommendedPreset);
    };

    const handleSave = async () => {
        if (!draftProjectData || isPublishing || !hasChanges) return;
        setIsPublishing(true);
        try {
            const normalizedDraft = cloneProjectData(draftProjectData);
            if (!normalizedDraft.config) normalizedDraft.config = {};
            if (!normalizedDraft.config.design) normalizedDraft.config.design = {};
            normalizedDraft.config.design.menu = resolveMenuDesignConfig(normalizedDraft.config.design.menu);
            const menuBackgroundImage = normalizedDraft.config.design.menu.backgroundImage;
            if (isDataUrl(menuBackgroundImage)) {
                normalizedDraft.config.design.menu.backgroundImage = await uploadFile({
                    url: menuBackgroundImage,
                    type: getDataUrlMimeType(menuBackgroundImage, 'image/jpeg'),
                    uid: normalizedDraft.projectId || selectedProjectId || 'menu-background',
                }, 'assets');
            }

            const updated = await publishProject(normalizedDraft, {
                expectedModifiedOn: normalizedDraft.modifiedOn,
            });
            assertProjectUpdateSucceeded(
                updated,
                normalizedDraft.projectId,
                'mobile_design_publish_project_update_rejected',
            );
            const updatedCopy = cloneProjectData(updated);
            setDraftProjectData(updatedCopy);
            setSavedProjectData(cloneProjectData(updatedCopy));
            upsertCachedProject(updatedCopy);
            if (updatedCopy.lastPublishedAt) {
                setStoreDetails((current: any) => (
                    current && String(current.storeId) === String(storeDetails?.storeId)
                        ? { ...current, lastPublishedAt: updatedCopy.lastPublishedAt }
                        : current
                ));
            }
            Toast.show({ content: t('designPublished'), icon: 'success', duration: 2000 });
            emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_COMPLETED);

            let verificationPublicMenuUrl: string | undefined;
            try {
                const { verifyMenuPublish } = await import('@lib/firebase/functions');
                const hasTenantUrl = Boolean(storeDetails?.subdomain || storeDetails?.customDomain);
                if (hasTenantUrl && storeDetails?.storeId && storeDetails?.tenantId) {
                    verificationPublicMenuUrl = generateProjectUrl(
                        storeDetails?.subdomain,
                        storeDetails?.customDomain,
                        updatedCopy?.name || selectedProjectSummary?.name || undefined,
                        Boolean(updatedCopy?.isDefault ?? normalizedDraft.isDefault),
                    );
                    void verifyMenuPublish({
                        storeId: String(storeDetails.storeId),
                        tenantId: String(storeDetails.tenantId),
                        publicMenuUrl: verificationPublicMenuUrl,
                    }).then((verificationResult) => {
                        if (isVerifiedMenuPublishResult(verificationResult)) {
                            emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_VERIFIED);
                        }
                    }).catch((error) => {
                        logMobileProjectFailure('mobile_design_publish_verification_failed', error, buildMobileDesignLogContext('publish_verification', {
                            ...getBoundedMobileProjectStringContext('publicMenuUrl', verificationPublicMenuUrl),
                            hasStoreSlug: Boolean(storeDetails?.subdomain),
                            hasCustomDomain: Boolean(storeDetails?.customDomain),
                        }));
                    });
                }
            } catch (error) {
                logMobileProjectFailure('mobile_design_publish_verification_setup_failed', error, buildMobileDesignLogContext('publish_verification', {
                    ...getBoundedMobileProjectStringContext('publicMenuUrl', verificationPublicMenuUrl),
                    hasStoreSlug: Boolean(storeDetails?.subdomain),
                    hasCustomDomain: Boolean(storeDetails?.customDomain),
                }));
                return;
            }
        } catch (err) {
            logMobileProjectFailure('mobile_design_publish_failed', err, buildMobileDesignLogContext('publish'));
            Toast.show({ content: t('failedToPublish'), duration: 2000 });
        } finally {
            setIsPublishing(false);
        }
    };

    const handleReset = () => {
        if (!savedProjectData || isPublishing || !hasChanges) return;
        setDraftProjectData(cloneProjectData(savedProjectData));
        setBackgroundImageDraft(null);
        setIsBackgroundAdjustOpen(false);
    };

    const withSource = useCallback((url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    ), []);

    const handleCopyLink = useCallback(async (value: string, label: string) => {
        try {
            await copyMobileDesignLink(value);
            Toast.show({ content: tShare('copiedLabel', { label }), duration: 1200 });
        } catch (error) {
            logMobileProjectFailure('mobile_design_link_copy_failed', error, buildMobileDesignLogContext('copy_link', {
                ...getBoundedMobileProjectStringContext('copyLabel', label),
                ...getBoundedMobileProjectStringContext('copyValue', value),
                hasClipboardWrite: hasMobileDesignClipboardWrite(),
                hasCopyFallback: hasMobileDesignCopyFallback(),
            }));
            Toast.show({ content: tShare('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    }, [buildMobileDesignLogContext, tShare]);

    const handleNativeShare = useCallback(async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({ text, title: label, url });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            logMobileProjectFailure('mobile_design_native_share_failed', error, buildMobileDesignLogContext('native_share', {
                ...getBoundedMobileProjectStringContext('shareLabel', label),
                ...getBoundedMobileProjectStringContext('shareText', text),
                ...getBoundedMobileProjectStringContext('shareUrl', url),
            }));
            Toast.show({ content: tShare('couldNotCopy'), duration: 1500 });
        }
    }, [buildMobileDesignLogContext, tShare]);

    if (loadingProjects) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />} />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading />
                </Flex>
            </Flex>
        );
    }

    if (!draftProjectData) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />} />
                <Flex align="center" justify="center" style={{ flex: 1, padding: '0 24px' }}>
                    <Text type="secondary" style={{ textAlign: 'center' }}>{t('noMenuFound')}</Text>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            {!embedded ? (
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
            ) : null}

            <Flex
                gap={16}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: embedded ? '0 0 24px' : '16px 16px 190px',
                }}
                vertical
            >
                {!embedded && projectsList.length > 1 ? (
                    <ProjectSelectorTrigger
                        clickable={isProjectSelectorClickable}
                        currentProject={{
                            active: selectedProjectSummary?.active !== false,
                            deleted: selectedProjectSummary?.deleted === true,
                            id: selectedProjectId || 'current',
                            isDefault: selectedProjectSummary?.isDefault,
                            isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                            name: selectedProjectSummary?.name || draftProjectData?.name || tProjectSelector('untitled'),
                            projectImage: selectedProjectSummary?.projectImage || draftProjectData?.projectImage || null,
                            specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
                            specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                                ? (projectsList || []).find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                                : undefined,
                            specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
                            specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
                        }}
                        helperText="Changes save only to this menu."
                        onClick={isProjectSelectorClickable ? () => setIsProjectSelectorOpen(true) : undefined}
                    />
                ) : null}
                {!embedded && menuUrl ? (
                    <div {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLIC_LINK)}>
                    <MobileLinkCard
                        compact={isCompactHandheld}
                        description={tShare('directOfferingLinkDesc', { offering: labels.offeringLower })}
                        icon={<LuLink2 color={token.colorText} size={18} />}
                        label={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                        onCopy={() => void handleCopyLink(withSource(menuUrl, 'copy'), tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                        onOpen={() => {
                            const opened = openMobilePublicLink(withSource(menuUrl, 'direct'), {
                                flow: 'design_menu_link_open',
                                metadata: buildMobileDesignLogContext('open_menu_link'),
                                source: 'mobile_design_editor',
                            });
                            if (opened) {
                                emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLIC_LINK_OPENED);
                            }
                        }}
                        onShare={supportsNativeShare ? () => void handleNativeShare({
                            label: tShare('directOfferingLink', { offering: labels.offeringTitle }),
                            text: tShare('directOfferingLinkDesc', { offering: labels.offeringLower }),
                            url: withSource(menuUrl, 'share'),
                        }) : undefined}
                        onShowQr={() => setIsQrSheetOpen(true)}
                        value={menuUrl}
                    />
                    </div>
                ) : null}
                <Card size="small" title={<Text strong>Current style</Text>}>
                    <List>
                        <List.Item
                            title={<Text>{t('menuMood')}</Text>}
                            extra={<Text>{MENU_MOODS[menuMood]?.label || menuMood}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('menuLayout')}</Text>}
                            extra={<Text>{MENU_LAYOUTS[menuLayout]?.label || menuLayout}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('recommendedStyle')}</Text>}
                            extra={<Text>{selectedQuickPreset?.label || t('customStyle')}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('showItemPrices')}</Text>}
                            extra={<Tag color={showItemPrices ? 'success' : 'default'}>{showItemPrices ? t('on') : t('off')}</Tag>}
                        />
                        <List.Item
                            title={<Text>{t('showItemImages')}</Text>}
                            extra={<Tag color={showImages ? 'success' : 'default'}>{showImages ? t('on') : t('off')}</Tag>}
                        />
                        <List.Item
                            title={<Text>{t('showCategoryIcons')}</Text>}
                            extra={<Tag color={showCategoryIcons ? 'success' : 'default'}>{showCategoryIcons ? t('on') : t('off')}</Tag>}
                        />
                        <List.Item
                            title={<Text>{t('background')}</Text>}
                            extra={<Tag color={backgroundImage ? 'success' : 'default'}>{backgroundImage ? t('image') : t('off')}</Tag>}
                        />
                    </List>
                </Card>
                <SectionCard title={t('quickStart')} subtitle={t('quickStartSubtitle')}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Flex gap={6} style={{ minWidth: 0 }} vertical>
                            {selectedQuickPreset ? (
                                <>
                                    <Text strong>{selectedQuickPreset.label}</Text>
                                    <Flex gap={6} wrap>
                                        <Tag>{MENU_MOODS[selectedQuickPreset.mood]?.label}</Tag>
                                        <Tag>
                                            <Flex align="center" gap={5}>
                                                <span
                                                    aria-hidden
                                                    style={{
                                                        background: MENU_MOODS[selectedQuickPreset.mood]?.background,
                                                        border: `1px solid ${token.colorBorderSecondary}`,
                                                        borderRadius: 999,
                                                        display: 'inline-block',
                                                        height: 8,
                                                        width: 8,
                                                    }}
                                                />
                                                {t('backgroundColor')}
                                            </Flex>
                                        </Tag>
                                        <Tag>{MENU_LAYOUTS[selectedQuickPreset.layout]?.label}</Tag>
                                        <Tag>
                                            <Flex align="center" gap={5}>
                                                <span
                                                    aria-hidden
                                                    style={{
                                                        backgroundColor: selectedQuickPreset.accentColor,
                                                        borderRadius: 999,
                                                        display: 'inline-block',
                                                        height: 8,
                                                        width: 8,
                                                    }}
                                                />
                                                {selectedQuickPreset.accentColor.toUpperCase()}
                                            </Flex>
                                        </Tag>
                                    </Flex>
                                </>
                            ) : (
                                <Text type="secondary">{t('recommendedStyleHelper')}</Text>
                            )}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('recommendedStyleCustomNote')}
                            </Text>
                        </Flex>
                        <Button
                            fill="outline"
                            onClick={openRecommendedStylesSheet}
                            size="small"
                            style={{ flex: '0 0 auto' }}
                        >
                            <Flex align="center" gap={4}>
                                <LuChevronDown size={14} />
                                <Text>{t('change')}</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </SectionCard>

                <Collapse>
                    <Collapse.Panel
                        key="fine-tune-style"
                        title={(
                            <Flex gap={2} vertical>
                                <Text strong>Fine tune style</Text>
                                <Text type="secondary">Optional. Recommended styles are enough for most menus.</Text>
                            </Flex>
                        )}
                    >
                        <Flex gap={12} vertical>
                <SectionCard title={t('menuMood')} subtitle={t('menuMoodSubtitle')}>
                    <Flex gap={8} vertical>
                        {Object.entries(MENU_MOODS).map(([key, config]) => {
                            const moodKey = key as MenuMood;
                            const isSelected = menuMood === moodKey;
                            return (
                                <OptionRow
                                    key={key}
                                    label={config.label}
                                    description={config.description}
                                    isSelected={isSelected}
                                    onSelect={() => handleMoodChange(moodKey)}
                                    backgroundColor={config.background}
                                    previewColor={config.accentColor}
                                />
                            );
                        })}
                    </Flex>
                </SectionCard>

                <SectionCard title={t('menuLayout')} subtitle={t('menuLayoutSubtitle')}>
                    <Flex gap={8} vertical>
                        {layoutEntries.map(([key, config]) => {
                            const layoutKey = key as MenuLayout;
                            const isSelected = menuLayout === layoutKey;
                            const isCompatible = compatibleLayouts.includes(layoutKey);
                            return (
                                <Card
                                    key={key}
                                    onClick={() => (isCompatible ? handleLayoutChange(layoutKey) : undefined)}
                                    style={{
                                        backgroundColor: !isCompatible
                                            ? token.colorFillAlter
                                            : isSelected
                                                ? token.colorPrimaryBg
                                                : token.colorBgContainer,
                                        borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                                        cursor: isCompatible ? 'pointer' : 'not-allowed',
                                        opacity: !isCompatible ? 0.4 : 1,
                                        width: '100%',
                                    }}
                                >
                                    <Flex align="center" gap={12}>
                                        <LayoutPreview layout={layoutKey} selected={isSelected} />
                                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>{config.label}</Text>
                                            <Text type="secondary">{config.description}</Text>
                                        </Flex>
                                    </Flex>
                                </Card>
                            );
                        })}
                    </Flex>
                </SectionCard>

                <Card onClick={() => setIsColorPickerOpen(true)}>
                    <Flex align="center" justify="space-between" gap={12}>
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Text strong>{t('brandColor')}</Text>
                            <Text type="secondary">{t('brandColorSubtitle')}</Text>
                        </Flex>
                        <Flex align="center" gap={10} style={{ flex: '0 0 auto' }}>
                            <span
                                aria-hidden
                                style={{
                                    backgroundColor: brandAccentColor || defaultMoodColor,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 999,
                                    display: 'inline-block',
                                    height: 32,
                                    width: 32,
                                }}
                            />
                            <Text strong>
                                {brandAccentColor
                                    ? BRAND_COLOR_PRESETS.find((preset) => preset.color === brandAccentColor)?.name || brandAccentColor.toUpperCase()
                                    : (brandAccentColor || defaultMoodColor).toUpperCase()}
                            </Text>
                            <LuPalette color={token.colorTextTertiary} size={18} />
                        </Flex>
                    </Flex>
                </Card>

                <SectionCard title={t('displayOptions')}>
                    <List>
                        <List.Item
                            extra={<Switch checked={showItemPrices} onChange={handleShowItemPricesChange} />}
                            title={<Text>{t('showItemPrices')}</Text>}
                            description={<Text type="secondary">{t('showItemPricesDesc')}</Text>}
                        />
                        <List.Item
                            extra={<Switch checked={showImages} onChange={handleShowImagesChange} />}
                            title={<Text>{t('showItemImages')}</Text>}
                            description={<Text type="secondary">{t('showItemImagesDesc')}</Text>}
                        />
                        <List.Item
                            extra={<Switch checked={showCategoryIcons} onChange={handleShowCategoryIconsChange} />}
                            title={<Text>{t('showCategoryIcons')}</Text>}
                            description={<Text type="secondary">{t('showCategoryIconsDesc')}</Text>}
                        />
                        <List.Item
                            extra={<Switch checked={showCategoryTabs} onChange={handleCategoryTabsChange} />}
                            title={<Text>{t('categoryTabs')}</Text>}
                            description={<Text type="secondary">{t('categoryTabsDesc')}</Text>}
                        />
                    </List>
                </SectionCard>
                        </Flex>
                    </Collapse.Panel>
                </Collapse>

                <SectionCard title={t('background')} subtitle={t('backgroundImagePriorityNote')}>
                    <Flex gap={12} vertical>
                        <Card style={{ borderColor: token.colorBorderSecondary }}>
                            <Flex align="center" gap={12}>
                                <span
                                    aria-hidden
                                    style={{
                                        background: toneBackground,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 12,
                                        display: 'inline-block',
                                        height: 40,
                                        width: 56,
                                    }}
                                />
                                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                    <Text strong>{t('toneBackgroundColor', { tone: MENU_MOODS[menuMood]?.label || menuMood })}</Text>
                                    <Text type="secondary">{toneBackground.toUpperCase()}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                        <Card style={{ borderColor: token.colorBorderSecondary }}>
                            <Flex gap={12} vertical>
                                <MediaImageCard
                                    accept={getMediaProfileAcceptAttribute('menuBackground')}
                                    alt={t('background')}
                                    canAdjust={Boolean(backgroundImageDraft?.sourceDataUrl)}
                                    helperText={t('backgroundUploadFormats')}
                                    imageType="menuBackground"
                                    imageUrl={backgroundImage}
                                    onAdjust={() => setIsBackgroundAdjustOpen(true)}
                                    onRemove={backgroundImage ? handleBackgroundImageRemove : undefined}
                                    onSelectFile={(file) => { void handleBackgroundImageSelect(file); }}
                                    placeholderDescription={t('backgroundUploadFormats')}
                                    placeholderTitle={t('noBackgroundImage')}
                                />
                                <MediaPublicContextPreview
                                    accentColor={brandAccentColor || defaultMoodColor}
                                    imageType="menuBackground"
                                    imageUrl={backgroundImage}
                                    subtitle={t('background')}
                                    title={resolvedProjectName || t('title')}
                                />
                            </Flex>
                        </Card>
                        <Flex gap={4} vertical>
                            <Text type="secondary">{t('backgroundReadabilityNote')}</Text>
                            <Text type="secondary">{t('backgroundDesktopNote')}</Text>
                        </Flex>
                    </Flex>
                </SectionCard>

                <SectionCard title={t('pricingNote')} subtitle={t('pricingNoteSubtitle')}>
                    <TextArea
                        autoSize={{ minRows: 2, maxRows: 3 }}
                        maxLength={SERVICE_CHARGE_MAX_LENGTH}
                        onChange={handleServiceChargeChange}
                        placeholder={t('pricingNotePlaceholder')}
                        showCount
                        value={specialNote}
                    />
                    <Flex gap={8} style={{ marginTop: 12 }} wrap="wrap">
                        {specialNoteSuggestions.map((suggestion) => (
                            <Tag
                                key={suggestion}
                                color={specialNote === suggestion ? 'primary' : undefined}
                                onClick={() => handleServiceChargeChange(suggestion)}
                                style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                            >
                                {suggestion}
                            </Tag>
                        ))}
                    </Flex>
                    <Text type="secondary" style={{ marginTop: 8 }}>
                        {t('specialNoteHelper')}
                    </Text>
                </SectionCard>
            </Flex>

            {!embedded ? (
                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: 0,
                        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                    vertical
                >
                    <Button
                        block
                        color="primary"
                        disabled={isPublishing}
                        fill="outline"
                        icon={<LuEye size={18} />}
                        onClick={() => setIsPreviewSheetOpen(true)}
                        size="large"
                    >
                        {hasChanges ? t('previewChanges') : t('previewMenu')}
                    </Button>
                    {hasChanges ? (
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35, textAlign: 'center' }}>
                            {t('previewUnsavedHint')}
                        </Text>
                    ) : null}
                    <Flex gap={12}>
                        <Button block disabled={!hasChanges || isPublishing} fill="outline" onClick={handleReset} size="large">
                            {tSettings('reset')}
                        </Button>
                        <Button
                            {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLISH)}
                            block
                            color="primary"
                            disabled={!hasChanges || isPublishing}
                            loading={isPublishing}
                            onClick={() => void handleSave()}
                            size="large"
                        >
                            {tSettings('saveChanges')}
                        </Button>
                    </Flex>
                </Flex>
            ) : null}

            <ColorPickerSheet
                businessBrandColor={storeDetails?.publicPresence?.accentColor}
                currentToneLabel={MENU_MOODS[menuMood]?.label}
                defaultMoodColor={defaultMoodColor}
                onChange={handleBrandColorChange}
                onClose={() => setIsColorPickerOpen(false)}
                value={brandAccentColor}
                visible={isColorPickerOpen}
            />
            <MediaImageAdjustModal
                fileName={backgroundImageDraft?.fileName}
                imageType="menuBackground"
                initialCrop={backgroundImageDraft?.crop}
                onApply={(prepared) => {
                    handleBackgroundImageChange(prepared.dataUrl);
                    setBackgroundImageDraft({
                        crop: prepared.crop,
                        fileName: prepared.sourceName || backgroundImageDraft?.fileName,
                        sourceDataUrl: prepared.sourceDataUrl || backgroundImageDraft?.sourceDataUrl,
                    });
                }}
                onClose={() => setIsBackgroundAdjustOpen(false)}
                open={isBackgroundAdjustOpen}
                sourceDataUrl={backgroundImageDraft?.sourceDataUrl}
            />

            <Popup
                bodyStyle={MENU_SHEET_BODY_STYLE}
                destroyOnClose
                onMaskClick={() => setIsRecommendedStylesSheetOpen(false)}
                position="bottom"
                visible={isRecommendedStylesSheetOpen}
            >
                <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                    <NavBar onBack={() => setIsRecommendedStylesSheetOpen(false)}>
                        {t('quickStart')}
                    </NavBar>

                    <Flex gap={14} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                        <Flex gap={8} vertical>
                            {recommendedPresets.map((preset) => {
                                const isSelected = selectedRecommendedPreset?.key === preset.key;
                                return (
                                    <Card
                                        key={preset.key}
                                        onClick={() => setSelectedRecommendedPresetKey(preset.key)}
                                        style={{
                                            backgroundColor: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                                            borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                                            borderWidth: isSelected ? 2 : 1,
                                        }}
                                    >
                                        <Flex gap={10} vertical>
                                            <Flex align="center" gap={12}>
                                                <Text style={{ fontSize: 18 }}>{preset.emoji}</Text>
                                                <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Text strong>{preset.label}</Text>
                                                    <Text type="secondary">{preset.description}</Text>
                                                </Flex>
                                                {isSelected ? <LuCheck color={token.colorPrimary} size={18} /> : null}
                                            </Flex>
                                            <MenuStylePresetPreview compact preset={preset} selected={isSelected} />
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>

                        <Button block color="primary" disabled={!selectedRecommendedPreset} onClick={applySelectedRecommendedStyle}>
                            {t('applyStyle')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>

            <MobileProjectSelectorSheet
                currentProjectId={selectedProjectId}
                currentProjectName={selectedProjectSummary?.name || draftProjectData?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />
            <MobileQrCodeSheet
                activePlanType={(storeDetails as any)?.activePlanType}
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('linkCopied')}
                diagnosticSource="mobile_design_editor_qr"
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={buildQrCodeFilename(`${getStoreContextName(storeDetails as any, 'menu')}-${labels.offeringLower}-direct-link`, 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={tShare('directOfferingLinkDesc', { offering: labels.offeringLower })}
                imageAlt={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                url={withSource(menuUrl, 'qr')}
                visible={isQrSheetOpen}
            />
            <MobileMenuDesignPreviewSheet
                businessType={storeDetails?.businessType}
                onClose={() => setIsPreviewSheetOpen(false)}
                projectData={draftProjectData}
                storeDetails={storeDetails}
                visible={isPreviewSheetOpen}
            />
        </Flex>
    );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Card>
            <Flex gap={12} vertical>
                <Flex gap={2} vertical>
                    <Text strong>{title}</Text>
                    {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
                </Flex>
                {children}
            </Flex>
        </Card>
    );
}

function LayoutPreview({ layout, selected }: { layout: MenuLayout; selected: boolean }) {
    const { token } = theme.useToken();
    const accent = selected ? token.colorPrimary : token.colorTextTertiary;
    const line = selected ? token.colorPrimaryBorder : token.colorBorderSecondary;
    const fill = selected ? token.colorPrimaryBg : token.colorFillQuaternary;
    const previewWidth = 96;
    const boxStyle = {
        backgroundColor: fill,
        border: `1px solid ${line}`,
        borderRadius: 6,
    };

    if (layout === MenuLayout.GRID) {
        return (
            <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(2, 1fr)', width: previewWidth }}>
                {[0, 1].map((item) => (
                    <Flex key={item} gap={5} style={{ ...boxStyle, minHeight: 30, padding: 5 }} vertical>
                        <div style={{ backgroundColor: accent, borderRadius: 4, height: 9, opacity: 0.55 }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '72%' }} />
                    </Flex>
                ))}
            </div>
        );
    }

    if (layout === MenuLayout.CARD) {
        return (
            <Flex gap={4} style={{ width: previewWidth }} vertical>
                {[0, 1].map((item) => (
                    <Flex key={item} gap={5} style={{ ...boxStyle, minHeight: 30, padding: 5 }} vertical>
                        <div style={{ backgroundColor: accent, borderRadius: 4, height: 9, opacity: 0.55 }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '72%' }} />
                    </Flex>
                ))}
            </Flex>
        );
    }

    if (layout === MenuLayout.TABS) {
        return (
            <Flex gap={4} style={{ width: previewWidth }} vertical>
                <Flex gap={3}>
                    {[0, 1, 2].map((item) => (
                        <div
                            key={item}
                            style={{
                                backgroundColor: item === 0 ? accent : fill,
                                borderRadius: 999,
                                height: 8,
                                width: 18,
                            }}
                        />
                    ))}
                </Flex>
                {[0, 1].map((item) => <div key={item} style={{ ...boxStyle, height: 12 }} />)}
            </Flex>
        );
    }

    return (
        <Flex gap={4} style={{ width: previewWidth }} vertical>
            {[0, 1].map((item) => (
                <Flex key={item} gap={4} style={{ ...boxStyle, padding: 4 }}>
                    <div style={{ backgroundColor: accent, borderRadius: 4, height: 10, width: 12 }} />
                    <Flex gap={3} style={{ flex: 1 }} vertical>
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '88%' }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '58%' }} />
                    </Flex>
                </Flex>
            ))}
        </Flex>
    );
}

function OptionRow({
    backgroundColor,
    label,
    description,
    isSelected,
    onSelect,
    previewColor,
}: {
    backgroundColor?: string;
    label: string;
    description: string;
    isSelected: boolean;
    onSelect: () => void;
    previewColor?: string;
}) {
    const { token } = theme.useToken();
    return (
        <Card
            onClick={onSelect}
            style={{
                backgroundColor: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
            }}
        >
            <Flex align="center" gap={12}>
                {previewColor ? (
                    <Flex gap={5} style={{ flex: '0 0 auto' }} vertical>
                        <span
                            aria-label="Tone background"
                            style={{
                                background: backgroundColor || token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 999,
                                display: 'inline-block',
                                height: 12,
                                width: 34,
                            }}
                        />
                        <span
                            aria-label="Tone accent"
                            style={{
                                backgroundColor: previewColor,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 999,
                                display: 'inline-block',
                                height: 12,
                                width: 34,
                            }}
                        />
                    </Flex>
                ) : null}
                <Flex gap={2} style={{ flex: 1 }} vertical>
                    <Text strong style={{ color: isSelected ? token.colorPrimary : token.colorText }}>{label}</Text>
                    <Text type="secondary">{description}</Text>
                </Flex>
                {isSelected ? <LuCheck color={token.colorPrimary} size={18} /> : null}
            </Flex>
        </Card>
    );
}
