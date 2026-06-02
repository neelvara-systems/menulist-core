'use client'

import { getMenuUrl } from '@constant/urls';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuSearch, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, NavBar, Tag, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileSubdomainScreenProps {
    onBack: () => void;
}

export default function MobileSubdomainScreen({ onBack }: MobileSubdomainScreenProps) {
    const t = useTranslations('BusinessSettings');
    const common = useTranslations('Common');
    const tMobile = useTranslations('MobileSettings');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [value, setValue] = useState(storeDetails?.subdomain || '');
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string; preview?: string } | null>(null);

    const fullUrl = useMemo(() => storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null, [storeDetails?.subdomain]);
    const subdomainLocked = Boolean(storeDetails?.lastPublishedAt);
    const currentSubdomain = (storeDetails?.subdomain || '').trim().toLowerCase();
    const normalizedInputSubdomain = value.trim().toLowerCase();
    const hasSubdomainChanged = normalizedInputSubdomain !== currentSubdomain;
    const canCheck = !subdomainLocked && normalizedInputSubdomain.length >= 3 && (!storeDetails?.subdomain || hasSubdomainChanged);
    const canSave = Boolean(
        !subdomainLocked
        && availability?.available
        && availability?.normalized === normalizedInputSubdomain
        && (!storeDetails?.subdomain || hasSubdomainChanged)
    );

    const checkAvailability = useCallback(async (input: string) => {
        if (subdomainLocked) {
            setAvailability(null);
            return;
        }
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
    }, [subdomainLocked, t]);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || value.trim();
        if (!storeDetails?.storeId || !nextSubdomain) return;
        if (subdomainLocked) {
            Toast.show({ content: t('subdomainLockedMessage'), duration: 1500 });
            return;
        }
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
    }, [availability?.normalized, common, setStoreDetails, storeDetails, subdomainLocked, t, tMobile, value]);

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={tMobile('subdomainIntro')}
                onBack={onBack}
                title={t('subdomain')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
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
                                        <Tag color="processing">{fullUrl?.replace(/^https?:\/\//, '')}</Tag>
                                        <Button fill="none" onClick={() => navigator.clipboard.writeText(fullUrl)} size="small" style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}><LuCopy size={16} /></Button>
                                        <Button fill="none" onClick={() => window.open(fullUrl, '_blank')} size="small" style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}><LuExternalLink size={16} /></Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ) : null}

                        {subdomainLocked ? (
                            <Card>
                                <Flex gap={6} vertical>
                                    <Text strong>{t('subdomainLockedMessage')}</Text>
                                    <Text type="secondary">{t('subdomainChangeWarning')}</Text>
                                </Flex>
                            </Card>
                        ) : (
                            <>
                                <Card>
                                    <Flex gap={8} vertical>
                                        <Text type="secondary">{t('subdomainLabel')}</Text>
                                        <Text type="secondary">This becomes your MenuList web address. Keep it short, readable, and based on your business name.</Text>
                                        <Input onChange={setValue} placeholder="your-business" value={value} />
                                        <Text type="secondary">{t('subdomainHelp')}</Text>
                                        {availability ? (
                                            <Flex align="center" gap={8}>
                                                {availability.available ? <LuCheck color={token.colorSuccess} size={16} /> : <LuX color={token.colorError} size={16} />}
                                                <Text type="secondary">{availability.available ? t('isAvailable', { name: availability.preview }) : availability.reason}</Text>
                                            </Flex>
                                        ) : null}
                                    </Flex>
                                </Card>

                                <Flex gap={8}>
                                    <Button block disabled={!canCheck} fill="outline" loading={checking} onClick={() => void checkAvailability(value)} size="large">
                                        <Flex align="center" gap={6}>
                                            <LuSearch size={16} />
                                            <Text>{t('checkAvailability')}</Text>
                                        </Flex>
                                    </Button>
                                    <Button block color="primary" disabled={!canSave} loading={saving} onClick={() => void saveSubdomain()} size="large">
                                        {common('save')}
                                    </Button>
                                </Flex>
                            </>
                        )}

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
