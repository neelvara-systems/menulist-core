'use client'

import {
    BRAND_COLOR_PRESETS,
    DEFAULTS,
    getCompatibleLayouts,
    HOME_STYLES,
    HomeStyle,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
} from '@config/designSystem';
import { publishProject } from '@database/projects';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuCheckCircle, LuChevronDown, LuExternalLink, LuPalette, LuXCircle } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, List, NavBar, Switch, Tag, Text, TextArea, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

const ColorPickerSheet = dynamic(() => import('../sheets/ColorPickerSheet'), { ssr: false });

interface QuickPreset {
    key: string;
    label: string;
    description: string;
    homeStyle: HomeStyle;
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
        homeStyle: HomeStyle.SIMPLE,
        mood: MenuMood.CLEAN,
        layout: MenuLayout.LIST,
        accentColor: '#22c55e',
        emoji: '🌿',
    },
    {
        key: 'warm',
        label: 'Warm & Cozy',
        description: 'Inviting, family-friendly',
        homeStyle: HomeStyle.SIMPLE,
        mood: MenuMood.WARM,
        layout: MenuLayout.CARD,
        accentColor: '#f97316',
        emoji: '🍂',
    },
    {
        key: 'bold',
        label: 'Bold & Modern',
        description: 'Eye-catching, energetic',
        homeStyle: HomeStyle.BOLD,
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
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
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

    const homeStyle = draftProjectData?.config?.design?.home?.style || DEFAULTS.home.style;
    const menuMood = draftProjectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood;
    const menuLayout = draftProjectData?.config?.design?.menu?.layout || DEFAULTS.menu.layout;
    const showImages = draftProjectData?.config?.design?.menu?.showImages ?? true;
    const showCategoryTabs = draftProjectData?.config?.design?.menu?.showCategoryTabs ?? false;
    const brandAccentColor = draftProjectData?.config?.design?.brand?.accentColor;
    const specialNote = draftProjectData?.menuSettings?.specialNote ?? '';
    const compatibleLayouts = useMemo(() => getCompatibleLayouts(menuMood), [menuMood]);
    const defaultMoodColor = MENU_MOODS[menuMood]?.accentColor || '#059669';

    const hasChanges = useMemo(() => {
        if (!draftProjectData || !savedProjectData) return false;
        return JSON.stringify(draftProjectData) !== JSON.stringify(savedProjectData);
    }, [draftProjectData, savedProjectData]);

    const menuUrl = useMemo(() => generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        draftProjectData?.name || selectedProjectSummary?.name || undefined,
        false,
    ), [draftProjectData?.name, selectedProjectSummary?.name, storeDetails?.customDomain, storeDetails?.subdomain]);
    const isProjectSelectorClickable = projectsList.length > 1 && !isPublishing;
    const projectStatusTag = useMemo(() => {
        if (selectedProjectSummary?.deleted === true) {
            return (
                <Tag color="error" style={{ marginInlineEnd: 0 }}>
                    <Flex align="center" gap={4}>
                        <LuXCircle size={13} />
                        <span>{tProjectSelector('statusDeleted')}</span>
                    </Flex>
                </Tag>
            );
        }

        if (selectedProjectSummary?.active === false) {
            return (
                <Tag color="error" style={{ marginInlineEnd: 0 }}>
                    <Flex align="center" gap={4}>
                        <LuXCircle size={13} />
                        <span>{tProjectSelector('statusInactive')}</span>
                    </Flex>
                </Tag>
            );
        }

        return (
            <Tag color="success" style={{ marginInlineEnd: 0 }}>
                <Flex align="center" gap={4}>
                    <LuCheckCircle size={13} />
                    <span>{tProjectSelector('statusActive')}</span>
                </Flex>
            </Tag>
        );
    }, [selectedProjectSummary?.active, selectedProjectSummary?.deleted, tProjectSelector]);

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

    const handleHomeStyleChange = (style: HomeStyle) => updateDesign(['config', 'design', 'home', 'style'], style);
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
    const handleShowImagesChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showImages'], show);
    const handleCategoryTabsChange = (show: boolean) => updateDesign(['config', 'design', 'menu', 'showCategoryTabs'], show);
    const handleBrandColorChange = (color: string | undefined) => updateDesign(['config', 'design', 'brand', 'accentColor'], color);
    const handleServiceChargeChange = (note: string) => {
        const normalized = note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim();
        setDraftProjectData((prev: any) => ({
            ...prev,
            menuSettings: { ...prev?.menuSettings, specialNote: normalized },
        }));
    };

    const applyQuickPreset = (preset: QuickPreset) => {
        setDraftProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = cloneProjectData(prev);
            if (!copy.config) copy.config = {};
            if (!copy.config.design) copy.config.design = {};
            copy.config.design.home = { ...copy.config.design.home, style: preset.homeStyle };
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
            <NavBar
                onBack={onBack}
                backIcon={<LuArrowLeft size={20} />}
                right={
                    <Button fill="none" onClick={() => window.open(menuUrl, '_blank')}>
                        <Flex align="center" gap={6}>
                            <LuExternalLink size={16} />
                            <Text>{t('preview')}</Text>
                        </Flex>
                    </Button>
                }
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 128px' }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />
                {isProjectSelectorClickable ? (
                    <Button
                        block
                        onClick={() => setIsProjectSelectorOpen(true)}
                        size="large"
                        style={{
                            height: 'auto',
                            justifyContent: 'flex-start',
                            paddingBlock: 12,
                            paddingInline: 14,
                        }}
                    >
                        <Flex gap={6} style={{ width: '100%' }} vertical>
                            <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                <Text strong style={{ flex: 1, textAlign: 'left' }}>
                                    {selectedProjectSummary?.name || draftProjectData?.name || tProjectSelector('untitled')}
                                </Text>
                                <Flex align="center" gap={8}>
                                    {projectStatusTag}
                                    <LuChevronDown color={token.colorTextSecondary} size={14} />
                                </Flex>
                            </Flex>
                            <Text style={{ fontSize: 12, textAlign: 'left' }} type="secondary">
                                Design changes save only to this menu.
                            </Text>
                        </Flex>
                    </Button>
                ) : (
                    <Card size="small">
                        <Flex gap={6} vertical>
                            <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                <Text strong style={{ flex: 1, textAlign: 'left' }}>
                                    {selectedProjectSummary?.name || draftProjectData?.name || tProjectSelector('untitled')}
                                </Text>
                                {projectStatusTag}
                            </Flex>
                            <Text style={{ fontSize: 12 }} type="secondary">
                                Design changes save only to this menu.
                            </Text>
                        </Flex>
                    </Card>
                )}
                <Card size="small" title={<Text strong>Current style</Text>}>
                    <List>
                        <List.Item
                            title={<Text>{t('homePageStyle')}</Text>}
                            extra={<Text>{HOME_STYLES[homeStyle]?.label || homeStyle}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('menuMood')}</Text>}
                            extra={<Text>{MENU_MOODS[menuMood]?.label || menuMood}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('menuLayout')}</Text>}
                            extra={<Text>{MENU_LAYOUTS[menuLayout]?.label || menuLayout}</Text>}
                        />
                        <List.Item
                            title={<Text>{t('showItemImages')}</Text>}
                            extra={<Tag color={showImages ? 'success' : 'default'}>{showImages ? t('on') : t('off')}</Tag>}
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
                                homeStyle === preset.homeStyle &&
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

                <SectionCard title={t('homePageStyle')} subtitle={t('homePageStyleSubtitle')}>
                    <Flex gap={8} vertical>
                        {Object.entries(HOME_STYLES).map(([key, config]) => {
                            const styleKey = key as HomeStyle;
                            const isSelected = homeStyle === styleKey;
                            return (
                                <OptionRow
                                    key={key}
                                    label={config.label}
                                    description={config.description}
                                    isSelected={isSelected}
                                    onSelect={() => handleHomeStyleChange(styleKey)}
                                    previewColor={config.background}
                                />
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
                            extra={<Switch checked={showImages} onChange={handleShowImagesChange} />}
                            title={<Text>{t('showItemImages')}</Text>}
                            description={<Text type="secondary">{t('showItemImagesDesc')}</Text>}
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
