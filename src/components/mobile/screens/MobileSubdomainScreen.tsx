'use client'

import { getMenuUrl } from '@constant/urls';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuSearch, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, NavBar, Tag, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileSubdomainScreenProps {
    onBack: () => void;
}

export default function MobileSubdomainScreen({ onBack }: MobileSubdomainScreenProps) {
    const t = useTranslations('BusinessSettings');
    const common = useTranslations('Common');
    const tMobile = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [value, setValue] = useState(storeDetails?.subdomain || '');
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string; preview?: string } | null>(null);

    const fullUrl = useMemo(() => storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null, [storeDetails?.subdomain]);

    const checkAvailability = useCallback(async (input: string) => {
        if (!input || input.trim().length < 3) {
            setAvailability(null);
            return;
        }
        setChecking(true);
        try {
            const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(input.trim())}`);
            const data = await response.json();
            setAvailability(data);
            if (data?.normalized) setValue(data.normalized);
        } catch {
            setAvailability({ available: false, reason: t('checkAvailabilityFailed') });
        } finally {
            setChecking(false);
        }
    }, []);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || value.trim();
        if (!storeDetails?.storeId || !nextSubdomain) return;
        setSaving(true);
        try {
            await updateStore({ storeId: storeDetails.storeId, subdomain: nextSubdomain } as any);
            setStoreDetails({ ...storeDetails, subdomain: nextSubdomain });
            Toast.show({ content: tMobile('saved'), duration: 1200 });
        } catch {
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            setSaving(false);
        }
    }, [availability?.normalized, common, setStoreDetails, storeDetails, tMobile, value]);

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro subtitle={tMobile('subdomainIntro')} title={t('subdomain')} />
                {storeDetails?.isMaster === false ? (
                    <Card>
                        <Flex gap={6} vertical>
                            <Text strong>{t('outletSubdomainInfo')}</Text>
                            <Text type="secondary">{t('outletSubdomainDesc')}</Text>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        {fullUrl ? (
                            <Card>
                                <Flex gap={8} vertical>
                                    <Text type="secondary">{t('yourCurrentLink')}</Text>
                                    <Flex align="center" gap={8} wrap>
                                        <Tag color="processing">{storeDetails.subdomain}.menulist.ai</Tag>
                                        <Button fill="none" onClick={() => navigator.clipboard.writeText(fullUrl)} size="small"><LuCopy size={16} /></Button>
                                        <Button fill="none" onClick={() => window.open(fullUrl, '_blank')} size="small"><LuExternalLink size={16} /></Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ) : null}

                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('subdomainLabel')}</Text>
                                <Input onChange={setValue} placeholder="your-business" value={value} />
                                <Text type="secondary">{t('subdomainHelp')}</Text>
                                {availability ? (
                                    <Flex align="center" gap={8}>
                                        {availability.available ? <LuCheck color="#16a34a" size={16} /> : <LuX color="#dc2626" size={16} />}
                                        <Text type="secondary">{availability.available ? t('isAvailable', { name: availability.preview }) : availability.reason}</Text>
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>

                        <Flex gap={8}>
                            <Button block fill="outline" loading={checking} onClick={() => void checkAvailability(value)} size="large">
                                <Flex align="center" gap={6}>
                                    <LuSearch size={16} />
                                    <Text>{t('checkAvailability')}</Text>
                                </Flex>
                            </Button>
                            <Button block color="primary" disabled={!availability?.available} loading={saving} onClick={() => void saveSubdomain()} size="large">
                                {common('save')}
                            </Button>
                        </Flex>

                        {!storeDetails?.subdomain ? (
                            <Card>
                                <Flex gap={6} vertical>
                                    <Text strong>{t('noSubdomainSet')}</Text>
                                    <Text type="secondary">{t('noSubdomainDesc')}</Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </>
                )}
            </Flex>
        </Flex>
    );
}
