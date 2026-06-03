import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Card, Divider, Flex, Segmented, theme } from 'antd'
import { useContext, useMemo, useState } from 'react';
import ShareLinkCard from '../../../ShareLinkCard';
import AIDefaultsModal from '../../editorView/AIDefaultsModal';
import { normalizeMenuMood } from '../designSystem'
import BrandColorPicker from '../designSystem/BrandColorPicker'
import MenuPageSettingsNew from '../menuPage/menuPageSettingsNew'
import OfficialPageSettings from '../officialPage/officialPageSettings'
import { pageOptions, PageType } from '../types'

interface B2CSidebarProps {
    activePage: PageType;
    setActivePage: (page: PageType) => void;
    projectData: any;
    setProjectData: (data: any) => void;
    storeDraft: any;
    setStoreDraft: (data: any) => void;
    setActiveLanguage: (language: string) => void;
}

function B2CSidebar({ activePage, setActivePage, projectData, setProjectData, storeDraft, setStoreDraft, setActiveLanguage }: B2CSidebarProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [isAIDefaultsOpen, setIsAIDefaultsOpen] = useState(false);
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

                    {activePage === PageType.MENU ? (
                        <Card
                            size="small"
                            title="Generation defaults"
                            extra={<Button onClick={() => setIsAIDefaultsOpen(true)} size="small" type="link">Open</Button>}
                        >
                            <Flex vertical gap={4}>
                                <span>Set the default writing and photo style for this menu.</span>
                            </Flex>
                        </Card>
                    ) : null}

                    {activePage === PageType.OBP && storeDraft ? (
                        <OfficialPageSettings
                            onLanguageChange={setActiveLanguage}
                            storeDetails={storeDraft}
                            onStoreDraftChange={setStoreDraft}
                        />
                    ) : null}

                    {activePage === PageType.MENU && (
                        <>
                            <MenuPageSettingsNew
                                businessCategory={storeDetails?.businessCategory}
                                businessType={storeDetails?.businessType}
                                projectData={projectData}
                                setProjectData={setProjectData}
                            />

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
                                currentMood={normalizeMenuMood(projectData?.config?.design?.menu?.mood)}
                            />
                        </>
                    )}
                </Flex>
            </Card>
            <AIDefaultsModal
                businessType={storeDetails?.businessType}
                businessCategory={storeDetails?.businessCategory}
                onClose={() => setIsAIDefaultsOpen(false)}
                open={isAIDefaultsOpen}
                projectData={projectData}
                setProjectData={setProjectData}
            />
        </Flex>
    )
}

export default B2CSidebar
