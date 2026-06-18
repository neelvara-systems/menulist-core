import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { Button, Card, Flex, Segmented, theme } from 'antd'
import dynamic from 'next/dynamic';
import { useContext, useMemo, useState } from 'react';
import ShareLinkCard from '../../../ShareLinkCard';
import AIDefaultsModal from '../../editorView/AIDefaultsModal';
import { pageOptions, PageType } from '../types'
import { MobileAntdAppBridge } from '@/components/mobile/antd';

const MobileDesignEditorScreen = dynamic(() => import('@/components/mobile/screens/MobileDesignEditorScreen'), { ssr: false });
const MobileOfficialPageScreen = dynamic(() => import('@/components/mobile/screens/MobileOfficialPageScreen'), { ssr: false });

interface B2CSidebarProps {
    activePage: PageType;
    setActivePage: (page: PageType) => void;
    projectData: any;
    setProjectData: (data: any) => void;
    storeDraft: any;
    setStoreDraft: (data: any) => void;
    obpPhotoDeleteResetToken: number;
    onObpPhotoDeleteQueueChange: (photoUrls: string[]) => void;
    setActiveLanguage: (language: string) => void;
}

function B2CSidebar({
    activePage,
    setActivePage,
    projectData,
    setProjectData,
    storeDraft,
    setStoreDraft,
    obpPhotoDeleteResetToken,
    onObpPhotoDeleteQueueChange,
    setActiveLanguage,
}: B2CSidebarProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [isAIDefaultsOpen, setIsAIDefaultsOpen] = useState(false);
    const currentStoreDetails = storeDraft || storeDetails;
    const sidebarTitle = activePage === PageType.OBP
        ? 'Official page settings'
        : `${labels.offeringTitle} design`;
    const pageUrl = useMemo(() => {
        if (!currentStoreDetails?.subdomain && !currentStoreDetails?.customDomain) return '';
        if (!projectData?.name) return '';
        return generateProjectUrl(
            currentStoreDetails?.subdomain,
            currentStoreDetails?.customDomain,
            projectData.name,
            projectData?.isDefault,
        );
    }, [currentStoreDetails?.customDomain, currentStoreDetails?.subdomain, projectData?.isDefault, projectData?.name]);

    return (
        <Flex gap={12} vertical>
            <Card
                size="small"
                title={sidebarTitle}
                style={{ width: 430, height: 'calc(100vh - 120px)', overflow: 'hidden' }}
                styles={{ body: { background: token.colorBgLayout, height: 'calc(100% - 42px)', overflow: 'hidden', padding: 12 } }}
            >
                <MobileAntdAppBridge />
                <Flex vertical gap={12} style={{ height: '100%', minHeight: 0 }}>
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

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
                        {activePage === PageType.OBP && storeDraft ? (
                            <MobileOfficialPageScreen
                                embedded
                                embeddedPhotoDeleteResetToken={obpPhotoDeleteResetToken}
                                embeddedProjectsList={projectData ? [projectData] : []}
                                embeddedSelectedProjectId={projectData?.projectId || null}
                                embeddedStoreDetails={storeDraft}
                                onBack={() => undefined}
                                onEmbeddedLanguageChange={setActiveLanguage}
                                onEmbeddedPhotoDeleteQueueChange={onObpPhotoDeleteQueueChange}
                                onEmbeddedStoreDetailsChange={setStoreDraft}
                            />
                        ) : null}

                        {activePage === PageType.MENU ? (
                            <MobileDesignEditorScreen
                                embedded
                                embeddedProjectData={projectData}
                                embeddedStoreDetails={currentStoreDetails}
                                onBack={() => undefined}
                                onEmbeddedProjectDataChange={setProjectData}
                            />
                        ) : null}
                    </div>
                </Flex>
            </Card>
            <AIDefaultsModal
                businessType={currentStoreDetails?.businessType}
                businessCategory={currentStoreDetails?.businessCategory}
                onClose={() => setIsAIDefaultsOpen(false)}
                open={isAIDefaultsOpen}
                projectData={projectData}
                setProjectData={setProjectData}
            />
        </Flex>
    )
}

export default B2CSidebar
