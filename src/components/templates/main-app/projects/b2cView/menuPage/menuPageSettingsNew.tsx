/**
 * Menu Page Settings (New Design System)
 * 
 * Two decisions only: Menu Mood + Menu Layout
 * Layout options are filtered based on mood compatibility.
 * Advanced options are collapsed and hidden by default.
 */

import { Collapse, Divider, Flex, Input, Switch, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { LuFileText, LuImage, LuList, LuSettings2 } from 'react-icons/lu';
import { Project } from '../../types';
import {
    DEFAULTS,
    MenuLayout,
    MenuMood
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
    const currentMood = projectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood;
    const currentLayout = projectData?.config?.design?.menu?.layout || DEFAULTS.menu.layout;
    const showImages = projectData?.config?.design?.menu?.showImages ?? true;
    const showCategoryIcons = projectData?.config?.design?.menu?.showCategoryIcons ?? true;
    const showCategoryTabs = projectData?.config?.design?.menu?.showCategoryTabs ?? false;
    // G06 - Service charge note is at menuSettings level (pricing truth, not design)
    const specialNote = projectData?.menuSettings?.specialNote ?? '';

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
                        ...projectData?.config?.design?.menu,
                        mood,
                    },
                },
            },
        });
    };

    const handleLayoutChange = (layout: MenuLayout) => {
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
                specialNote: normalizedNote,
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
            />

            <Divider style={{ margin: '4px 0' }} />

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
