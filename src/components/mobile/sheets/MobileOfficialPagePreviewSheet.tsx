'use client'

import DeviceFrame from '@template/main-app/projects/b2cView/deviceFrame';
import OfficialPagePreview from '@template/main-app/projects/b2cView/officialPage/officialPagePreview';
import { PageType } from '@template/main-app/projects/b2cView/types';
import type { StoreDataType } from '@type/platform/store';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuEye, LuX } from 'react-icons/lu';
import { Flex, NavBar, Popup, Tag, Text } from '../antd';

interface MobileOfficialPagePreviewSheetProps {
    activeLanguage: string;
    hasFeedbackTarget?: boolean;
    onClose: () => void;
    storeDetails: StoreDataType;
    visible: boolean;
}

export default function MobileOfficialPagePreviewSheet({
    activeLanguage,
    hasFeedbackTarget = false,
    onClose,
    storeDetails,
    visible,
}: MobileOfficialPagePreviewSheetProps) {
    const t = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();

    return (
        <Popup
            bodyStyle={{
                background: token.colorBgLayout,
                height: '100vh',
                maxHeight: '100vh',
                overflow: 'hidden',
                padding: 0,
            }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
            zIndex={1200}
        >
            <Flex style={{ background: token.colorBgLayout, height: '100%', minHeight: 0 }} vertical>
                <NavBar
                    backIcon={<LuX size={20} />}
                    onBack={onClose}
                    right={(
                        <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                            {t('previewOnlyBadge')}
                        </Tag>
                    )}
                >
                    {t('previewOfficialPageSheetTitle')}
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
                            {t('previewOfficialPageSheetNoteDesc')}
                        </Text>
                    </Flex>
                </Flex>

                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                    <DeviceFrame
                        activeDeviceType="mobile"
                        activePage={PageType.OBP}
                        backgroundColor={token.colorBgLayout}
                        fromPage="mobile-design-preview"
                    >
                        <OfficialPagePreview
                            activeDeviceType="mobile"
                            activeLanguage={activeLanguage}
                            hasFeedbackTarget={hasFeedbackTarget}
                            storeDetails={storeDetails}
                        />
                    </DeviceFrame>
                </div>
            </Flex>
        </Popup>
    );
}
