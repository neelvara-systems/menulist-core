'use client'

import {
    BRAND_COLOR_PRESETS,
    DEFAULTS,
    getCompatibleLayouts,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
} from '@config/designSystem';
import useViewportInfo from '@hook/useViewportInfo';
import { publishProject } from '@database/projects';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getLocalizedDraftText, getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from '@lib/localization/text';
import { generateProjectUrl } from '@lib/utils/slugify';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuLink2, LuPalette } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, List, NavBar, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

const ColorPickerSheet = dynamic(() => import('../sheets/ColorPickerSheet'), { ssr: false });

interface QuickPreset {
    key: string;
    label: string;
    description: string;
    mood: MenuMood;
    layout: MenuLayout;
    accentColor: string;
    emoji: string;
}

const QUICK_PRESETS: QuickPreset[] = [
    {
        key: 'fresh',
        label: 'Fresh & Clean',
        description: 'Professional, modern look',
        mood: MenuMood.CLEAN,
        layout: MenuLayout.LIST,
        accentColor: '#22c55e',
        emoji: '🌿',
    },
    {
        key: 'warm',
        label: 'Warm & Cozy',
        description: 'Inviting, family-friendly',
        mood: MenuMood.WARM,
        layout: MenuLayout.CARD,
        accentColor: '#f97316',
        emoji: '🍂',
    },
    {
        key: 'bold',
        label: 'Bold & Modern',
        description: 'Eye-catching, energetic',
        mood: MenuMood.BOLD,
        layout: MenuLayout.GRID,
        accentColor: '#3b82f6',
        emoji: '⚡',
    },
];

const SERVICE_CHARGE_MAX_LENGTH = 140;

interface MobileDesignEditorScreenProps {
    onBack: () => void;
}

function cloneProjectData<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export default function MobileDesignEditorScreen({ onBack }: MobileDesignEditorScreenProps) {
    const t = useTranslations('MobileDesignEditor');
    const tSettings = useTranslations('Settings');
    const tShare = useTranslations('MobileShare');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        isLoading: loadingProjects,
        projectsList,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
        upsertCachedProject,
    } = useMobileProjects();

    const [draftProjectData, setDraftProjectData] = useState<any>(null);
    const [savedProjectData, setSavedProjectData] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);

    const menuMood = draftProjectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood;
    const menuLayout = draftProjectData?.config?.design?.menu?.layout || DEFAULTS.menu.layout;
    const showItemPrices = draftProjectData?.config?.design?.menu?.showItemPrices ?? true;
    const showImages = draftProjectData?.config?.design?.menu?.showImages ?? true;
    const showCategoryIcons = draftProjectData?.config?.design?.menu?.showCategoryIcons ?? true;
    const showCategoryTabs = draftProjectData?.config?.design?.menu?.showCategoryTabs ?? false;
    const brandAccentColor = draftProjectData?.config?.design?.brand?.accentColor;
    const specialNoteLanguage = draftProjectData?.defaultLanguage || 'en';
    const specialNote = getLocalizedDraftText(draftProjectData?.menuSettings?.specialNote, specialNoteLanguage, '');
    const compatibleLayouts = useMemo(() => getCompatibleLayouts(menuMood), [menuMood]);
    const defaultMoodColor = MENU_MOODS[menuMood]?.accentColor || '#059669';
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

    useEffect(() => {
        if (!selectedProject) {
            setDraftProjectData(null);
            setSavedProjectData(null);
            return;
        }

        const cloned = cloneProjectData(selectedProject);
        setDraftProjectData(cloned);
        setSavedProjectData(cloneProjectData(cloned));
    }, [selectedProject]);

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
            const compatible = getCompatibleLayouts(mood);
            const currentLayout = copy.config.design.menu.layout || DEFAULTS.menu.layout;
            if (!compatible.includes(currentLayout)) {
                copy.config.design.menu.layout = compatible[0];
            }
            return copy;
        });
    };
    const handleLayoutChange = (layout: MenuLayout) => updateDesign(['config', 'design', 'menu', 'layout'], layout);
    const handleShowItemPricesChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showItemPrices'], show);
    const handleShowImagesChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showImages'], show);
    const handleShowCategoryIconsChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showCategoryIcons'], show);
    const handleCategoryTabsChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showCategoryTabs'], show);
    const handleBrandColorChange = (color: string | undefined) => updateDesign(['config', 'design', 'brand', 'accentColor'], color);
    const handleServiceChargeChange = (note: string) => {
        const normalized = note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim();
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

    const applyQuickPreset = (preset: QuickPreset) => {
        setDraftProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = cloneProjectData(prev);
            if (!copy.config) copy.config = {};
            if (!copy.config.design) copy.config.design = {};
            copy.config.design.menu = {
                ...copy.config.design.menu,
                mood: preset.mood,
                layout: preset.layout,
            };
            copy.config.design.brand = { ...copy.config.design.brand, accentColor: preset.accentColor };
            return copy;
        });
        Toast.show({ content: t('appliedStyle', { name: preset.label }), duration: 1500 });
    };

    const handleSave = async () => {
        if (!draftProjectData || isPublishing || !hasChanges) return;
        setIsPublishing(true);
        try {
            const updated = await publishProject(draftProjectData);
            const updatedCopy = cloneProjectData(updated);
            setDraftProjectData(updatedCopy);
            setSavedProjectData(cloneProjectData(updatedCopy));
            upsertCachedProject(updatedCopy);
            Toast.show({ content: t('designPublished'), icon: 'success', duration: 2000 });

            try {
                const { verifyMenuPublish } = await import('@lib/firebase/functions');
                const slug = storeDetails?.subdomain;
                if (slug && storeDetails?.storeId && storeDetails?.tenantId) {
                    verifyMenuPublish({
                        storeId: String(storeDetails.storeId),
                        tenantId: String(storeDetails.tenantId),
                        publicMenuUrl: generateProjectUrl(
                            slug,
                            storeDetails?.customDomain,
                            updatedCopy?.name || selectedProjectSummary?.name || undefined,
                            false,
                        ),
                    });
                }
            } catch {
                return;
            }
        } catch (err) {
            console.error('Publish failed:', err);
            Toast.show({ content: t('failedToPublish'), duration: 2000 });
        } finally {
            setIsPublishing(false);
        }
    };

    const handleReset = () => {
        if (!savedProjectData || isPublishing || !hasChanges) return;
        setDraftProjectData(cloneProjectData(savedProjectData));
    };

    const withSource = useCallback((url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    ), []);

    const handleCopyLink = useCallback(async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: tShare('copiedLabel', { label }), duration: 1200 });
        } catch {
            Toast.show({ content: tShare('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    }, [tShare]);

    const handleNativeShare = useCallback(async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({ text, title: label, url });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: tShare('couldNotCopy'), duration: 1500 });
        }
    }, [tShare]);

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
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 128px' }} vertical>
                <ProjectSelectorTrigger
                    clickable={isProjectSelectorClickable}
                    currentProject={{
                        active: selectedProjectSummary?.active !== false,
                        deleted: selectedProjectSummary?.deleted === true,
                        id: selectedProjectId || 'current',
                        isDefault: selectedProjectSummary?.isDefault,
                        isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                        name: selectedProjectSummary?.name || draftProjectData?.name || tProjectSelector('untitled'),
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
                {menuUrl ? (
                    <MobileLinkCard
                        compact={isCompactHandheld}
                        description={tShare('directOfferingLinkDesc', { offering: labels.offeringLower })}
                        icon={<LuLink2 color={token.colorText} size={18} />}
                        label={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                        onCopy={() => void handleCopyLink(withSource(menuUrl, 'copy'), tShare('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                        onOpen={() => window.location.assign(withSource(menuUrl, 'direct'))}
                        onShare={supportsNativeShare ? () => void handleNativeShare({
                            label: tShare('directOfferingLink', { offering: labels.offeringTitle }),
                            text: tShare('directOfferingLinkDesc', { offering: labels.offeringLower }),
                            url: withSource(menuUrl, 'share'),
                        }) : undefined}
                        onShowQr={() => setIsQrSheetOpen(true)}
                        value={menuUrl}
                    />
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
                            title={<Text>{t('categoryTabs')}</Text>}
                            extra={<Tag color={showCategoryTabs ? 'success' : 'default'}>{showCategoryTabs ? t('on') : t('off')}</Tag>}
                        />
                    </List>
                </Card>
                <SectionCard title={t('quickStart')} subtitle={t('quickStartSubtitle')}>
                    <Flex gap={8} wrap>
                        {QUICK_PRESETS.map((preset) => {
                            const isActive =
                                menuMood === preset.mood &&
                                menuLayout === preset.layout;
                            return (
                                <Card
                                    key={preset.key}
                                    onClick={() => applyQuickPreset(preset)}
                                    style={{
                                        backgroundColor: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                                        borderColor: isActive ? token.colorPrimary : token.colorBorderSecondary,
                                        flex: '1 1 30%',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Flex align="center" gap={6} vertical>
                                        <Text>{preset.emoji}</Text>
                                        <Text strong>{preset.label}</Text>
                                        <Text type="secondary">{preset.description}</Text>
                                    </Flex>
                                </Card>
                            );
                        })}
                    </Flex>
                </SectionCard>

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
                                    previewColor={config.accentColor}
                                />
                            );
                        })}
                    </Flex>
                </SectionCard>

                <SectionCard title={t('menuLayout')} subtitle={t('menuLayoutSubtitle')}>
                    <Flex gap={8} wrap>
                        {Object.entries(MENU_LAYOUTS).map(([key, config]) => {
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
                                        opacity: !isCompatible ? 0.4 : 1,
                                        flex: '1 1 45%',
                                    }}
                                >
                                    <Flex align="center" gap={6} vertical>
                                        {isSelected ? <LuCheck color={token.colorPrimary} size={14} /> : null}
                                        <Text strong>{config.label}</Text>
                                        <Text type="secondary">{config.description}</Text>
                                    </Flex>
                                </Card>
                            );
                        })}
                    </Flex>
                    {compatibleLayouts.length < Object.keys(MENU_LAYOUTS).length ? (
                        <Text type="secondary">{t('layoutIncompatibleHint')}</Text>
                    ) : null}
                </SectionCard>

                <SectionCard title={t('brandColor')} subtitle={t('brandColorSubtitle')}>
                    <List>
                        <List.Item
                            onClick={() => setIsColorPickerOpen(true)}
                            prefix={
                                <Card
                                    size="small"
                                    style={{
                                        backgroundColor: brandAccentColor || defaultMoodColor,
                                        borderRadius: 999,
                                        height: 32,
                                        width: 32,
                                    }}
                                />
                            }
                            extra={<LuPalette color={token.colorTextTertiary} size={18} />}
                            title={
                                <Text>
                                    {brandAccentColor
                                        ? BRAND_COLOR_PRESETS.find((preset) => preset.color === brandAccentColor)?.name || brandAccentColor.toUpperCase()
                                        : t('usingMoodDefault')}
                                </Text>
                            }
                        />
                    </List>
                </SectionCard>

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

                <SectionCard title={t('pricingNote')} subtitle={t('pricingNoteSubtitle')}>
                    <TextArea
                        autoSize={{ minRows: 2, maxRows: 3 }}
                        maxLength={SERVICE_CHARGE_MAX_LENGTH}
                        onChange={handleServiceChargeChange}
                        placeholder={t('pricingNotePlaceholder')}
                        showCount
                        value={specialNote}
                    />
                </SectionCard>
            </Flex>

            <Flex
                gap={12}
                style={{
                    backdropFilter: 'blur(10px)',
                    backgroundColor: token.colorBgContainer,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    bottom: 0,
                    padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                    position: 'sticky',
                    zIndex: 20,
                }}
            >
                <Button block disabled={!hasChanges || isPublishing} fill="outline" onClick={handleReset} size="large">
                    {tSettings('reset')}
                </Button>
                <Button block color="primary" disabled={!hasChanges || isPublishing} loading={isPublishing} onClick={() => void handleSave()} size="large">
                    {tSettings('saveChanges')}
                </Button>
            </Flex>

            <ColorPickerSheet
                defaultMoodColor={defaultMoodColor}
                onChange={handleBrandColorChange}
                onClose={() => setIsColorPickerOpen(false)}
                value={brandAccentColor}
                visible={isColorPickerOpen}
            />

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
                copyErrorMessage={tShare('couldNotCopy')}
                copySuccessMessage={tShare('linkCopied')}
                downloadSuccessMessage={tShare('qrDownloaded')}
                filename={buildQrCodeFilename(`${storeDetails?.name || 'menu'}-${labels.offeringLower}-direct-link`, 'qr')}
                generatingLabel={tShare('generatingQr')}
                helperText={tShare('directOfferingLinkDesc', { offering: labels.offeringLower })}
                imageAlt={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={tShare('qrFailed')}
                title={tShare('directOfferingLink', { offering: labels.offeringTitle })}
                url={withSource(menuUrl, 'qr')}
                visible={isQrSheetOpen}
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

function OptionRow({
    label,
    description,
    isSelected,
    onSelect,
    previewColor,
}: {
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
                    <Card
                        size="small"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: previewColor,
                        }}
                    />
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
