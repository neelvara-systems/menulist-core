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
import { getProjectData, getProjectsList, publishProject } from '@database/projects';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, NavBar, Switch, TextArea, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowLeft, LuCheck, LuExternalLink, LuPalette } from 'react-icons/lu';

const ColorPickerSheet = dynamic(() => import('../sheets/ColorPickerSheet'), { ssr: false });

// ── Quick Start Presets ──────────────────────────────────────────
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

// ── Service Charge Limit (Constitutional G06) ────────────────────
const SERVICE_CHARGE_MAX_LENGTH = 140;

interface MobileDesignEditorScreenProps {
    onBack: () => void;
}

export default function MobileDesignEditorScreen({ onBack }: MobileDesignEditorScreenProps) {
    const t = useTranslations('MobileDesignEditor');
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    // ── State ────────────────────────────────────────────────────
    const [projectData, setProjectData] = useState<any>(null);
    const [originalData, setOriginalData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    // ── Derived design values ────────────────────────────────────
    const homeStyle = projectData?.config?.design?.home?.style || DEFAULTS.home.style;
    const menuMood = projectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood;
    const menuLayout = projectData?.config?.design?.menu?.layout || DEFAULTS.menu.layout;
    const showImages = projectData?.config?.design?.menu?.showImages ?? true;
    const showCategoryTabs = projectData?.config?.design?.menu?.showCategoryTabs ?? false;
    const brandAccentColor = projectData?.config?.design?.brand?.accentColor;
    const serviceChargeNote = projectData?.menuSettings?.serviceChargeNote ?? '';
    const compatibleLayouts = useMemo(() => getCompatibleLayouts(menuMood), [menuMood]);
    const defaultMoodColor = MENU_MOODS[menuMood]?.accentColor || '#059669';

    const hasChanges = useMemo(() => {
        if (!projectData || !originalData) return false;
        return JSON.stringify(projectData) !== JSON.stringify(originalData);
    }, [projectData, originalData]);

    // ── Menu URL for preview ─────────────────────────────────────
    const menuUrl = useMemo(() => generateProjectUrl(
        storeDetails?.subdomain,
        storeDetails?.customDomain,
        undefined,
    ), [storeDetails?.subdomain, storeDetails?.customDomain]);

    // ── Load project data ────────────────────────────────────────
    const fetchProject = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await getProjectsList();
            const projects = result?.projects || [];
            const defaultProject = projects.find((p: any) => p.isDefault) || projects[0];
            if (defaultProject?.projectId) {
                const fullProject = await getProjectData(defaultProject.projectId);
                setProjectData(JSON.parse(JSON.stringify(fullProject)));
                setOriginalData(JSON.parse(JSON.stringify(fullProject)));
            }
        } catch (err) {
            console.error('Failed to load project:', err);
            Toast.show({ content: t('failedToLoad'), duration: 2000 });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (storeDetails?.storeId) fetchProject();
    }, [storeDetails?.storeId, fetchProject]);

    // ── Updaters ─────────────────────────────────────────────────
    const updateDesign = useCallback((path: string[], value: any) => {
        setProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = JSON.parse(JSON.stringify(prev));
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
        setProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = JSON.parse(JSON.stringify(prev));
            if (!copy.config) copy.config = {};
            if (!copy.config.design) copy.config.design = {};
            if (!copy.config.design.menu) copy.config.design.menu = {};
            copy.config.design.menu.mood = mood;
            // If current layout is incompatible with new mood, reset to first compatible
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
        setProjectData((prev: any) => ({
            ...prev,
            menuSettings: { ...prev?.menuSettings, serviceChargeNote: normalized },
        }));
    };

    // ── Quick Preset ─────────────────────────────────────────────
    const applyQuickPreset = (preset: QuickPreset) => {
        setProjectData((prev: any) => {
            if (!prev) return prev;
            const copy = JSON.parse(JSON.stringify(prev));
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

    // ── Publish ──────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!projectData) return;
        setIsPublishing(true);
        try {
            const updated = await publishProject(projectData);
            const updatedCopy = JSON.parse(JSON.stringify(updated));
            setProjectData(updatedCopy);
            setOriginalData(updatedCopy);
            Toast.show({ content: t('designPublished'), icon: 'success', duration: 2000 });

            // 🩺 Post-publish health verification (fire-and-forget, same as desktop)
            // Also triggers STORE_PUBLISHED lifecycle message on first publish
            try {
                const { verifyMenuPublish } = await import('@lib/firebase/functions');
                const slug = storeDetails?.subdomain || storeDetails?.subDomain;
                if (slug && storeDetails?.storeId && storeDetails?.tenantId) {
                    verifyMenuPublish({
                        storeId: String(storeDetails.storeId),
                        tenantId: String(storeDetails.tenantId),
                        publicMenuUrl: `https://${slug}.menulist.ai`,
                    });
                }
            } catch { /* non-blocking */ }
        } catch (err) {
            console.error('Publish failed:', err);
            Toast.show({ content: t('failedToPublish'), duration: 2000 });
        } finally {
            setIsPublishing(false);
        }
    };

    // ── Loading state ────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DotLoading /></div>
            </div>
        );
    }

    if (!projectData) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />}>{t('title')}</NavBar>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center', color: '#6b7280' }}>
                    {t('noMenuFound')}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--adm-color-background, #f5f5f5)' }}>
            <NavBar
                onBack={onBack}
                backIcon={<LuArrowLeft size={20} />}
                right={
                    <button
                        onClick={() => window.open(menuUrl, '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '14px' }}
                    >
                        <LuExternalLink size={16} />
                        {t('preview')}
                    </button>
                }
            >
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 128px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ── Quick Start Presets ────────────────────── */}
                <SectionCard title={t('quickStart')} subtitle={t('quickStartSubtitle')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {QUICK_PRESETS.map((preset) => {
                            const isActive =
                                homeStyle === preset.homeStyle &&
                                menuMood === preset.mood &&
                                menuLayout === preset.layout;
                            return (
                                <button
                                    key={preset.key}
                                    onClick={() => applyQuickPreset(preset)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '12px 8px',
                                        borderRadius: '12px',
                                        border: '2px solid',
                                        borderColor: isActive ? '#3b82f6' : '#e5e7eb',
                                        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                                        transition: 'all 0.2s',
                                        transform: 'scale(1)',
                                    }}
                                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
                                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                                >
                                    <span style={{ fontSize: '24px' }}>{preset.emoji}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937' }}>{preset.label}</span>
                                    <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.4, textAlign: 'center' }}>{preset.description}</span>
                                </button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ── Home Page Style ────────────────────────── */}
                <SectionCard title={t('homePageStyle')} subtitle={t('homePageStyleSubtitle')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    </div>
                </SectionCard>

                {/* ── Menu Mood ──────────────────────────────── */}
                <SectionCard title={t('menuMood')} subtitle={t('menuMoodSubtitle')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    </div>
                </SectionCard>

                {/* ── Menu Layout ────────────────────────────── */}
                <SectionCard title={t('menuLayout')} subtitle={t('menuLayoutSubtitle')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {Object.entries(MENU_LAYOUTS).map(([key, config]) => {
                            const layoutKey = key as MenuLayout;
                            const isSelected = menuLayout === layoutKey;
                            const isCompatible = compatibleLayouts.includes(layoutKey);
                            return (
                                <button
                                    key={key}
                                    onClick={() => isCompatible && handleLayoutChange(layoutKey)}
                                    disabled={!isCompatible}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '2px solid',
                                        borderColor: !isCompatible ? '#e5e7eb' : isSelected ? '#3b82f6' : '#e5e7eb',
                                        backgroundColor: !isCompatible ? '#f9fafb' : isSelected ? '#eff6ff' : '#ffffff',
                                        transition: 'all 0.2s',
                                        opacity: !isCompatible ? 0.3 : 1,
                                        transform: 'scale(1)',
                                    }}
                                    onMouseDown={(e) => { if (isCompatible) e.currentTarget.style.transform = 'scale(0.95)' }}
                                    onMouseUp={(e) => { if (isCompatible) e.currentTarget.style.transform = 'scale(1)' }}
                                    onMouseLeave={(e) => { if (isCompatible) e.currentTarget.style.transform = 'scale(1)' }}
                                >
                                    {isSelected && <LuCheck size={14} color="#3b82f6" />}
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#2563eb' : '#1f2937' }}>
                                        {config.label}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{config.description}</span>
                                </button>
                            );
                        })}
                    </div>
                    {compatibleLayouts.length < Object.keys(MENU_LAYOUTS).length && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {t('layoutIncompatibleHint')}
                        </p>
                    )}
                </SectionCard>

                {/* ── Brand Color ────────────────────────────── */}
                <SectionCard title={t('brandColor')} subtitle={t('brandColorSubtitle')}>
                    <button
                        onClick={() => setIsColorPickerOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%',
                            padding: '8px 0',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                        }}
                        onMouseDown={(e) => { e.currentTarget.style.backgroundColor = 'var(--adm-color-hover, #f5f5f5)' }}
                        onMouseUp={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '2px solid #e5e7eb',
                                flexShrink: 0,
                                backgroundColor: brandAccentColor || defaultMoodColor
                            }}
                        />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontSize: '14px', color: '#1f2937', margin: 0 }}>
                                {brandAccentColor
                                    ? BRAND_COLOR_PRESETS.find(p => p.color === brandAccentColor)?.name || brandAccentColor.toUpperCase()
                                    : t('usingMoodDefault')}
                            </p>
                        </div>
                        <LuPalette size={18} color="#9ca3af" />
                    </button>
                </SectionCard>

                {/* ── Display Options ────────────────────────── */}
                <SectionCard title={t('displayOptions')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{t('showItemImages')}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('showItemImagesDesc')}</p>
                            </div>
                            <Switch checked={showImages} onChange={handleShowImagesChange} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{t('categoryTabs')}</p>
                                <p style={{ fontSize: '12px', color: '#6b7280' }}>{t('categoryTabsDesc')}</p>
                            </div>
                            <Switch checked={showCategoryTabs} onChange={handleCategoryTabsChange} />
                        </div>
                    </div>
                </SectionCard>

                {/* ── Service Charge Note ────────────────────── */}
                <SectionCard title={t('pricingNote')} subtitle={t('pricingNoteSubtitle')}>
                    <TextArea
                        value={serviceChargeNote}
                        onChange={handleServiceChargeChange}
                        placeholder={t('pricingNotePlaceholder')}
                        maxLength={SERVICE_CHARGE_MAX_LENGTH}
                        showCount
                        autoSize={{ minRows: 2, maxRows: 3 }}
                        style={{ '--font-size': '14px' } as React.CSSProperties}
                    />
                </SectionCard>
            </div>

            {/* ── Bottom Action Bar ──────────────────────────── */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--adm-color-background, #fff)',
                borderTop: '1px solid var(--adm-color-border, #e5e7eb)',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                zIndex: 50
            }}>
                <Button
                    block
                    fill="outline"
                    onClick={() => { window.open(menuUrl, '_blank'); }}
                    style={{ flex: 1 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <LuExternalLink size={16} />
                        {t('preview')}
                    </span>
                </Button>
                <Button
                    block
                    color="primary"
                    loading={isPublishing}
                    disabled={!hasChanges || isPublishing}
                    onClick={handlePublish}
                    style={{ flex: 2 }}
                >
                    {hasChanges ? t('publishChanges') : t('noChanges')}
                </Button>
            </div>

            {/* ── Color Picker Sheet ─────────────────────────── */}
            <ColorPickerSheet
                visible={isColorPickerOpen}
                onClose={() => setIsColorPickerOpen(false)}
                value={brandAccentColor}
                onChange={handleBrandColorChange}
                defaultMoodColor={defaultMoodColor}
            />
        </div>
    );
}

// ── Reusable Section Card ────────────────────────────────────────
function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Card style={{ borderRadius: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{title}</p>
                    {subtitle && <p style={{ fontSize: '12px', color: '#6b7280' }}>{subtitle}</p>}
                </div>
                {children}
            </div>
        </Card>
    );
}

// ── Reusable Option Row ──────────────────────────────────────────
function OptionRow({ label, description, isSelected, onSelect, previewColor }: {
    label: string;
    description: string;
    isSelected: boolean;
    onSelect: () => void;
    previewColor?: string;
}) {
    return (
        <button
            onClick={onSelect}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                transition: 'all 0.2s',
                transform: 'scale(1)',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
            {previewColor && (
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        border: '1px solid #e5e7eb',
                        backgroundColor: previewColor
                    }}
                />
            )}
            <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? '#2563eb' : '#1f2937' }}>{label}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>{description}</p>
            </div>
            {isSelected && <LuCheck size={18} color="#3b82f6" style={{ flexShrink: 0 }} />}
        </button>
    );
}
