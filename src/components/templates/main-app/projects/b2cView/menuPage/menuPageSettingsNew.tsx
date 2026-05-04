/**
 * Menu Page Settings (New Design System)
 * 
 * Two decisions only: Menu Mood + Menu Layout
 * Layout options are filtered based on mood compatibility.
 * Advanced options are collapsed and hidden by default.
 */

import { Collapse, Divider, Flex, Input, Switch, Typography } from 'antd';
import { getLocalizedDraftText, updateLocalizedText } from '@lib/localization/text';
import { useTranslations } from 'next-intl';
import { LuFileText, LuImage, LuList, LuSettings2 } from 'react-icons/lu';
import { Project } from '../../types';
import {
    getCompatibleLayouts,
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
}

const MenuPageSettingsNew: React.FC<MenuPageSettingsNewProps> = ({
    projectData,
    setProjectData,
}) => {
    const t = useTranslations('MobileDesignEditor');
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

    // G06 Constitutional limit: 140 characters max
    const SERVICE_CHARGE_MAX_LENGTH = 140;

    const handleMoodChange = (mood: MenuMood) => {
        const compatibleLayouts = getCompatibleLayouts(mood);
        const nextLayout = compatibleLayouts.includes(currentLayout)
            ? currentLayout
            : compatibleLayouts[0];

        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...projectData?.config?.design?.menu,
                        mood,
                        layout: nextLayout,
                    },
                },
            },
        });
    };

    const handleLayoutChange = (layout: MenuLayout) => {
        if (!getCompatibleLayouts(currentMood).includes(layout)) return;

        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    menu: {
                        ...projectData?.config?.design?.menu,
                        layout,
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
                        ...projectData?.config?.design?.menu,
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
                        ...projectData?.config?.design?.menu,
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
                        ...projectData?.config?.design?.menu,
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
                        ...projectData?.config?.design?.menu,
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
                        ...projectData?.config?.design?.menu,
                        backgroundImage,
                    },
                },
            },
        });
    };

    // G06 - Service Charge Note (Constitutional trust disclosure)
    const handlespecialNoteChange = (note: string) => {
        // HARD ENFORCEMENT: 140 character limit + trim whitespace
        // Prevents silent whitespace abuse and visually empty disclosures
        const normalizedNote = note.slice(0, SERVICE_CHARGE_MAX_LENGTH).trim();
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
                    <Text>{t('categoryTabsNavigation')}</Text>
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
