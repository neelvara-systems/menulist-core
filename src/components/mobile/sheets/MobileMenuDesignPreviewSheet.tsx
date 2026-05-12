'use client'

import { resolveRenderLanguage } from '@lib/localization/languageResolver';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import MainContentRenderer from '@template/website/mainContentRenderer';
import type { Project } from '@template/main-app/projects/types';
import { PageType } from '@template/main-app/projects/b2cView/types';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuEye, LuX } from 'react-icons/lu';
import { Button, Flex, NavBar, Popup, Tag, Text } from '../antd';

interface MobileMenuDesignPreviewSheetProps {
    businessType?: string;
    onClose: () => void;
    projectData: Project | null;
    storeDetails?: StoreDataType | null;
    visible: boolean;
}

export default function MobileMenuDesignPreviewSheet({
    businessType,
    onClose,
    projectData,
    storeDetails,
    visible,
}: MobileMenuDesignPreviewSheetProps) {
    const t = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const effectiveStoreDetails = useMemo(() => (storeDetails || {}) as StoreDataType, [storeDetails]);
    const initialLanguage = useMemo(() => {
        if (!projectData) return 'en';
        return resolveRenderLanguage(
            null,
            getProjectDefaultLanguage(projectData, effectiveStoreDetails),
            projectData.languages || ['en'],
        );
    }, [effectiveStoreDetails, projectData]);
    const [activeLanguage, setActiveLanguage] = useState(initialLanguage);
    const [activePage, setActivePage] = useState<PageType>(PageType.MENU);

    useEffect(() => {
        if (!visible) return;
        setActiveLanguage(initialLanguage);
        setActivePage(PageType.MENU);
    }, [initialLanguage, visible]);

    if (!projectData) return null;

    return (
        <Popup
            bodyStyle={{
                background: token.colorBgLayout,
                height: '100vh',
                maxHeight: '100vh',
                minHeight: '100vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
            zIndex={1200}
        >
            <Flex style={{ background: token.colorBgLayout, height: '100%', minHeight: '100%' }} vertical>
                <NavBar
                    backIcon={<LuX size={20} />}
                    onBack={onClose}
                    right={(
                        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                            {t('previewOnlyBadge')}
                        </Tag>
                    )}
                >
                    {t('previewSheetTitle')}
                </NavBar>

                <Flex
                    align="flex-start"
                    gap={10}
                    style={{
                        background: token.colorPrimaryBg,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        color: token.colorText,
                        flex: '0 0 auto',
                        padding: '10px 14px',
                    }}
                >
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            background: token.colorBgContainer,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 999,
                            color: token.colorPrimary,
                            flex: '0 0 auto',
                            height: 30,
                            width: 30,
                        }}
                    >
                        <LuEye size={16} />
                    </Flex>
                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                        <Text strong>{t('previewSheetNoteTitle')}</Text>
                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.45 }}>
                            {t('previewSheetNoteDesc')}
                        </Text>
                    </Flex>
                </Flex>

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <MainContentRenderer
                        activeDeviceType="mobile"
                        activeLanguage={activeLanguage}
                        activePage={activePage}
                        businessType={businessType}
                        fromPage="mobile-design-preview"
                        previewMode
                        projectData={projectData}
                        restoreStoredLanguage={false}
                        setActiveLanguage={setActiveLanguage}
                        setActivePage={setActivePage}
                        storeDetails={effectiveStoreDetails}
                    />
                </div>
            </Flex>
        </Popup>
    );
}
