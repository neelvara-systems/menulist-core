'use client'

import { FEATURE_FLAGS } from '@config/features';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useContext } from 'react';
import { LuLink, LuMapPin } from 'react-icons/lu';
import { SiGooglemybusiness } from 'react-icons/si';
import { Card, Flex, NavBar, Tag, Text, Title } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileIntegrationsScreenProps {
    onBack: () => void;
}

export default function MobileIntegrationsScreen({ onBack }: MobileIntegrationsScreenProps) {
    const tBusiness = useTranslations('BusinessSettings');
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    if (!FEATURE_FLAGS.ENABLE_GBP_SYNC) {
        return null;
    }

    const gbp = storeDetails?.gbp;
    const gbpState = storeDetails?.gbpState;
    const isConnected = gbp?.isConnected ?? false;
    const linkHealthy = gbpState?.linkStatus === 'OK';
    const hoursHealthy = gbpState?.hoursStatus === 'OK';

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{tBusiness('integrations')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle="Review your external integrations and make sure your public business data stays aligned."
                    title={tBusiness('integrations')}
                />
                <Card>
                    <Flex align="center" gap={10}>
                        <SiGooglemybusiness color="#4285F4" size={22} />
                        <Flex gap={2} vertical>
                            <Title level={5} style={{ margin: 0 }}>Google Business Profile</Title>
                            <Text type="secondary">Keep your menu link and hours aligned with Google.</Text>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>Connection</Text>
                            <Tag color={isConnected ? 'success' : 'default'}>
                                {isConnected ? 'Connected' : 'Not connected'}
                            </Tag>
                        </Flex>

                        {gbp?.locationName ? (
                            <Flex align="center" gap={8}>
                                <LuMapPin color="#64748b" size={16} />
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
                                        <LuLink color="#64748b" size={16} />
                                        <Text>Menu link</Text>
                                    </Flex>
                                    <Tag color={linkHealthy ? 'success' : 'warning'}>
                                        {gbp?.menuLinkMode === 'MANAGED' ? 'Managed' : 'Off'}
                                    </Tag>
                                </Flex>
                                <Flex align="center" justify="space-between">
                                    <Text>Hours sync</Text>
                                    <Tag color={hoursHealthy ? 'success' : 'warning'}>
                                        {hoursHealthy ? 'Synced' : 'Needs review'}
                                    </Tag>
                                </Flex>
                            </>
                        ) : (
                            <Text type="secondary">
                                Google Business Profile sync is not available on this account yet.
                            </Text>
                        )}
                    </Flex>
                </Card>
            </Flex>
        </Flex>
    );
}
