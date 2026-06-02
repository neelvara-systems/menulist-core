'use client'

import { FEATURE_FLAGS } from '@config/features';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext } from 'react';
import { LuLink, LuMapPin } from 'react-icons/lu';
import { Card, Flex, Tag, Text } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileIntegrationsScreenProps {
    onBack: () => void;
}

export default function MobileIntegrationsScreen({ onBack }: MobileIntegrationsScreenProps) {
    const tBusiness = useTranslations('BusinessSettings');
    const t = useTranslations('MobileIntegrations');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const infoContent = (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{tBusiness('integrations')}</Text>
                <Text type="secondary">{t('subtitle')}</Text>
            </Flex>
            <Flex gap={2} vertical>
                <Text strong>{t('googleBusinessProfile')}</Text>
                <Text type="secondary">{t('googleBusinessProfileDesc')}</Text>
            </Flex>
        </Flex>
    );

    if (!FEATURE_FLAGS.ENABLE_GBP_SYNC) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    infoContent={infoContent}
                    onBack={onBack}
                    title={tBusiness('integrations')}
                />
                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <Card>
                        <Flex gap={8} vertical>
                            <Text strong>{t('googleBusinessProfile')}</Text>
                            <Text type="secondary">{t('notAvailable')}</Text>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    const gbp = storeDetails?.gbp;
    const gbpState = storeDetails?.gbpState;
    const isConnected = gbp?.isConnected ?? false;
    const linkHealthy = gbpState?.linkStatus === 'OK';
    const hoursHealthy = gbpState?.hoursStatus === 'OK';

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                infoContent={infoContent}
                onBack={onBack}
                title={tBusiness('integrations')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('connection')}</Text>
                            <Tag color={isConnected ? 'success' : 'default'}>
                                {isConnected ? t('connected') : t('notConnected')}
                            </Tag>
                        </Flex>

                        {gbp?.locationName ? (
                            <Flex align="center" gap={8}>
                                <LuMapPin color={token.colorTextTertiary} size={16} />
                                <Flex gap={2} vertical>
                                    <Text strong>{gbp.locationName}</Text>
                                    {gbp.locationAddress ? <Text type="secondary">{gbp.locationAddress}</Text> : null}
                                </Flex>
                            </Flex>
                        ) : null}

                        {isConnected ? (
                            <>
                                <Flex align="center" justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuLink color={token.colorTextTertiary} size={16} />
                                        <Text>{t('menuLink')}</Text>
                                    </Flex>
                                    <Tag color={linkHealthy ? 'success' : 'warning'}>
                                        {gbp?.menuLinkMode === 'MANAGED' ? t('managed') : t('off')}
                                    </Tag>
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text>{t('hoursSync')}</Text>
                                    <Tag color={hoursHealthy ? 'success' : 'warning'}>
                                        {hoursHealthy ? t('synced') : t('needsReview')}
                                    </Tag>
                                </Flex>
                            </>
                        ) : (
                            <Text type="secondary">
                                {t('notAvailable')}
                            </Text>
                        )}
                    </Flex>
                </Card>
            </Flex>
        </Flex>
    );
}
