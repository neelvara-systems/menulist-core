/**
 * Menu Page Settings (New Design System)
 * 
 * Two decisions only: Menu Mood + Menu Layout
 * Layout options are filtered based on mood compatibility.
 * Advanced options are collapsed and hidden by default.
 */

import { Card, Collapse, Divider, Flex, Input, Switch, Typography, theme } from 'antd';
import MenuStylePresetPreview from '@/components/shared/menuDesign/MenuStylePresetPreview';
import { getLocalizedDraftText, updateLocalizedText } from '@lib/localization/text';
import {
    findMatchingMenuDesignPreset,
    getMenuDesignPresetPatch,
    getOwnerSelectableMenuLayouts,
    getPreferredMenuLayoutForMood,
    getRecommendedMenuDesignPresets,
    type MenuDesignPreset,
} from '@lib/menu/menuDesignPresets';
import { getMenuSpecialNoteSuggestions } from '@lib/menu/specialNoteSuggestions';
import { useTranslations } from 'next-intl';
import { LuFileText, LuImage, LuList, LuSettings2, LuSparkles } from 'react-icons/lu';
import { Project } from '../../types';
import {
    MenuLayout,
    MenuMood,
    resolveMenuDesignConfig
} from '../designSystem';
import MenuLayoutSelector from '../designSystem/MenuLayoutSelector';
import MenuMoodSelector from '../designSystem/MenuMoodSelector';
import BackgroundSettings from './backgroundSettings';

const { Text } = Typography;

interface MenuPageSettingsNewProps {
    projectData: Project;
    setProjectData: (project: Project) => void;
    businessType?: string;
    businessCategory?: string;
}

const MenuPageSettingsNew: React.FC<MenuPageSettingsNewProps> = ({
    projectData,
    setProjectData,
    businessType,
    businessCategory,
}) => {
    const t = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const menuDesign = resolveMenuDesignConfig(projectData?.config?.design?.menu);
    const currentMood = menuDesign.mood;
    const currentLayout = menuDesign.layout;
    const showItemPrices = menuDesign.showItemPrices ?? true;
    const showImages = menuDesign.showImages ?? true;
    const showCategoryIcons = menuDesign.showCategoryIcons ?? true;
    const showCategoryTabs = menuDesign.showCategoryTabs ?? false;
    // G06 - Service charge note is at menuSettings level (pricing truth, not design)
    const specialNoteLanguage = projectData?.defaultLanguage || 'en';
    const specialNote = getLocalizedDraftText(projectData?.menuSettings?.specialNote, specialNoteLanguage, '');
    const previewTitle = getLocalizedDraftText(projectData?.name, specialNoteLanguage, 'Your digital menu');
    const specialNoteSuggestions = getMenuSpecialNoteSuggestions(t);
    const recommendedPresets = getRecommendedMenuDesignPresets({ businessType, businessCategory });
    const selectedPreset = findMatchingMenuDesignPreset({
        mood: currentMood,
        layout: currentLayout,
        accentColor: projectData?.config?.design?.brand?.accentColor,
        showItemPrices,
        showImages,
        showCategoryIcons,
        showCategoryTabs,
    });

    // G06 Constitutional limit: 140 characters max
    const SERVICE_CHARGE_MAX_LENGTH = 140;

    const handleMoodChange = (mood: MenuMood) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        mood,
                        layout: getPreferredMenuLayoutForMood(mood),
                    },
                },
            },
        });
    };

    const handleLayoutChange = (layout: MenuLayout) => {
        if (!getOwnerSelectableMenuLayouts(currentMood).includes(layout)) return;

        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        layout,
                    },
                },
            },
        });
    };

    const handlePresetApply = (preset: MenuDesignPreset) => {
        const patch = getMenuDesignPresetPatch(preset);
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        ...patch.menu,
                    },
                    brand: {
                        ...projectData?.config?.design?.brand,
                        ...patch.brand,
                    },
                },
            },
        });
    };

    const handleShowImagesChange = (show: boolean) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        showImages: show,
                    },
                },
            },
        });
    };

    const handleShowItemPricesChange = (show: boolean) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        showItemPrices: show,
                    },
                },
            },
        });
    };

    const handleShowCategoryTabsChange = (show: boolean) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        showCategoryTabs: show,
                    },
                },
            },
        });
    };

    const handleShowCategoryIconsChange = (show: boolean) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        showCategoryIcons: show,
                    },
                },
            },
        });
    };

    const handleBackgroundImageChange = (backgroundImage: string) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...menuDesign,
                        backgroundImage,
                    },
                },
            },
        });
    };

    // G06 - Service Charge Note (Constitutional trust disclosure)
    const handlespecialNoteChange = (note: string) => {
        // Keep spaces while the owner types. Public rendering already trims and
        // collapses whitespace; the editor only owns the hard length boundary.
        const normalizedNote = note.slice(0, SERVICE_CHARGE_MAX_LENGTH);
        setProjectData({
            ...projectData,
            menuSettings: {
                ...projectData?.menuSettings,
                specialNote: updateLocalizedText(
                    projectData?.menuSettings?.specialNote,
                    normalizedNote,
                    specialNoteLanguage,
                    'en',
                ),
            },
        });
    };

    return (
        <Flex vertical gap={20}>
            <Card
                size="small"
                title={(
                    <Flex align="center" gap={8}>
                        <LuSparkles size={14} />
                        <Text>{t('quickStart')}</Text>
                    </Flex>
                )}
                styles={{ body: { padding: 12 } }}
            >
                <Flex vertical gap={10}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {selectedPreset
                            ? `${selectedPreset.label}: ${selectedPreset.description}`
                            : t('recommendedStyleHelper')}
                    </Text>
                    <Flex vertical gap={10}>
                        {recommendedPresets.map((preset) => {
                            const isSelected = selectedPreset?.key === preset.key;
                            return (
                                <button
                                    key={preset.key}
                                    onClick={() => handlePresetApply(preset)}
                                    style={{
                                        background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                        borderRadius: 10,
                                        color: token.colorText,
                                        cursor: 'pointer',
                                        padding: 12,
                                        textAlign: 'left',
                                    }}
                                    type="button"
                                >
                                    <Flex gap={12} vertical>
                                        <Flex align="flex-start" gap={10}>
                                            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{preset.emoji}</span>
                                            <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                                <Text strong>{preset.label}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{preset.description}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{preset.recommendedFor}</Text>
                                            </Flex>
                                        </Flex>
                                        <MenuStylePresetPreview compact preset={preset} selected={isSelected} />
                                    </Flex>
                                </button>
                            );
                        })}
                    </Flex>
                </Flex>
            </Card>

            <Divider style={{ margin: '4px 0' }} />

            <MenuMoodSelector
                value={currentMood}
                onChange={handleMoodChange}
            />

            <Divider style={{ margin: '4px 0' }} />

            <MenuLayoutSelector
                value={currentLayout}
                onChange={handleLayoutChange}
                currentMood={currentMood}
            />

            <Divider style={{ margin: '4px 0' }} />

            <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                    <LuList size={16} />
                    <Text>{t('showItemPrices')}</Text>
                </Flex>
                <Switch
                    checked={showItemPrices}
                    onChange={handleShowItemPricesChange}
                />
            </Flex>

            <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                    <LuImage size={16} />
                    <Text>{t('showItemImages')}</Text>
                </Flex>
                <Switch
                    checked={showImages}
                    onChange={handleShowImagesChange}
                />
            </Flex>

            <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                    <LuImage size={16} />
                    <Text>{t('showCategoryIcons')}</Text>
                </Flex>
                <Switch
                    checked={showCategoryIcons}
                    onChange={handleShowCategoryIconsChange}
                />
            </Flex>

            <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                    <LuList size={16} />
                    <Text>{t('categoryTabs')}</Text>
                </Flex>
                <Switch
                    checked={showCategoryTabs}
                    onChange={handleShowCategoryTabsChange}
                />
            </Flex>

            <Collapse
                ghost
                size="small"
                items={[
                    {
                        key: 'advanced',
                        label: (
                            <Flex align="center" gap={8}>
                                <LuSettings2 size={14} />
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {t('advancedOptional')}
                                </Text>
                            </Flex>
                        ),
                        children: (
                            <Flex vertical gap={12}>
                                <BackgroundSettings
                                    from="menu-advanced"
                                    config={{
                                        backgroundImage: projectData?.config?.design?.menu?.backgroundImage,
                                    }}
                                    previewAccentColor={projectData?.config?.design?.brand?.accentColor}
                                    previewSubtitle={t('background')}
                                    previewTitle={previewTitle}
                                    onUpdate={(config) => {
                                        if (config.backgroundImage !== undefined) {
                                            handleBackgroundImageChange(config.backgroundImage);
                                        }
                                    }}
                                />

                                {/* G06 - Special Note (Constitutional Trust Disclosure) */}
                                <Divider style={{ margin: '8px 0' }} />
                                <Flex vertical gap={4}>
                                    <Flex align="center" gap={8}>
                                        <LuFileText size={14} />
                                        <Text style={{ fontSize: 13 }}>{t('pricingNote')}</Text>
                                    </Flex>
                                    <Input.TextArea
                                        value={specialNote}
                                        onChange={(e) => handlespecialNoteChange(e.target.value)}
                                        placeholder={t('pricingNotePlaceholder')}
                                        maxLength={SERVICE_CHARGE_MAX_LENGTH}
                                        showCount
                                        autoSize={{ minRows: 2, maxRows: 3 }}
                                        style={{ fontSize: 13 }}
                                    />
                                    <Flex gap={8} wrap="wrap">
                                        {specialNoteSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => handlespecialNoteChange(suggestion)}
                                                style={{
                                                    background: specialNote === suggestion ? token.colorPrimaryBg : token.colorBgContainer,
                                                    border: `1px solid ${specialNote === suggestion ? token.colorPrimary : token.colorBorder}`,
                                                    borderRadius: 999,
                                                    color: specialNote === suggestion ? token.colorPrimary : token.colorText,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    lineHeight: 1.4,
                                                    padding: '6px 10px',
                                                }}
                                                type="button"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </Flex>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {t('specialNoteHelper')}
                                    </Text>
                                </Flex>
                            </Flex>
                        ),
                    },
                ]}
            />
        </Flex>
    );
};

export default MenuPageSettingsNew;
