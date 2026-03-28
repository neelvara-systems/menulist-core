/**
 * Home Page Settings (New Design System)
 * 
 * Simplified settings with just ONE decision: Home Style
 * Advanced options are collapsed and hidden by default.
 */

import { Collapse, Flex, Typography } from 'antd';
import { LuSettings2 } from 'react-icons/lu';
import { Project } from '../../types';
import { DEFAULTS, HomeStyle } from '../designSystem';
import HomeStyleSelector from '../designSystem/HomeStyleSelector';
import BackgroundSettings from '../menuPage/backgroundSettings';

const { Text } = Typography;

interface HomePageSettingsNewProps {
    projectData: Project;
    setProjectData: (project: Project) => void;
}

const HomePageSettingsNew: React.FC<HomePageSettingsNewProps> = ({
    projectData,
    setProjectData,
}) => {
    const currentStyle = projectData?.config?.design?.home?.style || DEFAULTS.home.style;

    const handleStyleChange = (style: HomeStyle) => {
        setProjectData({
            ...projectData,
            config: {
                ...projectData?.config,
                design: {
                    ...projectData?.config?.design,
                    home: {
                        ...projectData?.config?.design?.home,
                        style,
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
                    home: {
                        ...projectData?.config?.design?.home,
                        backgroundImage,
                    },
                },
            },
        });
    };

    return (
        <Flex vertical gap={16}>
            <HomeStyleSelector
                value={currentStyle}
                onChange={handleStyleChange}
            />

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
                                    Advanced (optional)
                                </Text>
                            </Flex>
                        ),
                        children: (
                            <Flex vertical gap={12}>
                                <BackgroundSettings
                                    from="home-advanced"
                                    config={{
                                        backgroundImage: projectData?.config?.design?.home?.backgroundImage,
                                    }}
                                    onUpdate={(config) => {
                                        if (config.backgroundImage !== undefined) {
                                            handleBackgroundImageChange(config.backgroundImage);
                                        }
                                    }}
                                />
                            </Flex>
                        ),
                    },
                ]}
            />
        </Flex>
    );
};

export default HomePageSettingsNew;
