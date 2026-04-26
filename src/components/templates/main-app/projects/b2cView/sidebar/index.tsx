import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Card, Divider, Flex, Segmented, theme } from 'antd'
import { useContext, useMemo } from 'react';
import ShareLinkCard from '../../../ShareLinkCard';
import { DEFAULTS } from '../designSystem'
import BrandColorPicker from '../designSystem/BrandColorPicker'
import HomePageSettingsNew from '../homePage/homePageSettingsNew'
import MenuPageSettingsNew from '../menuPage/menuPageSettingsNew'
import { pageOptions, PageType } from '../types'

interface B2CSidebarProps {
    activePage: PageType;
    setActivePage: (page: PageType) => void;
    projectData: any;
    setProjectData: (data: any) => void;
}

function B2CSidebar({ activePage, setActivePage, projectData, setProjectData }: B2CSidebarProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const pageUrl = useMemo(() => {
        if (!storeDetails?.subdomain && !storeDetails?.customDomain) return '';
        if (!projectData?.name) return '';
        return generateProjectUrl(
            storeDetails?.subdomain,
            storeDetails?.customDomain,
            projectData.name,
            projectData?.isDefault,
        );
    }, [projectData?.isDefault, projectData?.name, storeDetails?.customDomain, storeDetails?.subdomain]);

    return (
        <Flex gap={12} vertical>
            <Card
                size="small"
                title={`Customise your ${labels.offeringLower}`}
                style={{ width: 400, height: 'calc(100vh - 120px)', overflowY: 'scroll' }}
                styles={{ body: { background: token.colorBgLayout } }}
            >
                <Flex vertical gap={12}>
                    <Segmented
                        value={activePage}
                        onChange={setActivePage}
                        options={pageOptions}
                        block
                        size="large"
                        style={{ border: `1px solid ${token.colorBorder}` }}
                    />

                    {activePage === PageType.MENU && pageUrl ? (
                        <ShareLinkCard
                            title={`${labels.offeringTitle} Link`}
                            description={`Share this public link when you want customers to open your ${labels.offeringLower} directly`}
                            url={pageUrl}
                            shortUrl={pageUrl.replace(/^https?:\/\//, '')}
                            sharePrefix={labels.shareMessagePrefix}
                            copySuccessLabel={`${labels.offeringTitle} link`}
                        />
                    ) : null}

                    {activePage === PageType.HOME && (
                        <HomePageSettingsNew
                            projectData={projectData}
                            setProjectData={setProjectData}
                        />
                    )}

                    {activePage === PageType.MENU && (
                        <MenuPageSettingsNew
                            projectData={projectData}
                            setProjectData={setProjectData}
                        />
                    )}

                    <Divider style={{ margin: '8px 0' }} />

                    <BrandColorPicker
                        value={projectData?.config?.design?.brand?.accentColor}
                        onChange={(color) => {
                            setProjectData({
                                ...projectData,
                                config: {
                                    ...projectData?.config,
                                    design: {
                                        ...projectData?.config?.design,
                                        brand: {
                                            ...projectData?.config?.design?.brand,
                                            accentColor: color,
                                        },
                                    },
                                },
                            });
                        }}
                        currentMood={projectData?.config?.design?.menu?.mood || DEFAULTS.menu.mood}
                    />
                </Flex>
            </Card>
        </Flex>
    )
}

export default B2CSidebar
