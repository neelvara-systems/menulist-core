'use client'

import { checkCustomDomainAvailability } from '@database/stores';
import { normalizeBaseUrl } from '@constant/urls';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCheckCircle2, LuCopy, LuExternalLink, LuGlobe, LuSearch, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, NavBar, Tag, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileCustomDomainScreenProps {
    onBack: () => void;
}

export default function MobileCustomDomainScreen({ onBack }: MobileCustomDomainScreenProps) {
    const t = useTranslations('BusinessSettings');
    const common = useTranslations('Common');
    const tMobile = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [domainInput, setDomainInput] = useState(storeDetails?.customDomain || '');
    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [domainAvailability, setDomainAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string } | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);
    const activeDomain = storeDetails?.customDomain || domainStatus?.domain;
    const normalizedDomainInput = domainInput.trim().toLowerCase();
    const canCheckDomain = !activeDomain && normalizedDomainInput.length >= 4;
    const canConnectDomain = Boolean(
        !activeDomain
        && domainAvailability?.available
        && domainAvailability?.normalized === normalizedDomainInput
    );

    const refreshStatus = useCallback(async () => {
        if (!storeDetails?.customDomain) return;
        setStatusLoading(true);
        try {
            const response = await fetch('/api/domain');
            const data = await response.json();
            setDomainStatus(data);
            if (data?.verified) {
                setStoreDetails({ ...storeDetails, domainVerified: true });
            }
        } catch {
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            setStatusLoading(false);
        }
    }, [common, setStoreDetails, storeDetails]);

    useEffect(() => {
        void refreshStatus();
    }, [refreshStatus]);

    const addDomain = async () => {
        if (!domainInput.trim()) return;
        setLoading(true);
        try {
            const response = await fetch('/api/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domainAvailability?.normalized || domainInput.trim() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || common('error'));
            setStoreDetails({ ...storeDetails, customDomain: data.domain, domainVerified: false });
            setDomainInput(data.domain);
            setDomainStatus({ hasDomain: true, domain: data.domain, verified: false, config: data.verification });
            Toast.show({ content: t('domainAdded'), duration: 1200 });
        } catch (error: any) {
            Toast.show({ content: error?.message || common('error'), duration: 1800 });
        } finally {
            setLoading(false);
        }
    };

    const checkDomain = async () => {
        if (!normalizedDomainInput) return;
        setCheckingAvailability(true);
        try {
            const data = await checkCustomDomainAvailability(normalizedDomainInput, storeDetails?.storeId);
            setDomainAvailability(data);
            if (data?.normalized) {
                setDomainInput(data.normalized);
            }
        } catch {
            setDomainAvailability({ available: false, reason: common('error') });
        } finally {
            setCheckingAvailability(false);
        }
    };

    const removeDomain = async () => {
        setLoading(true);
        try {
            await fetch('/api/domain', { method: 'DELETE' });
            setStoreDetails({ ...storeDetails, customDomain: undefined, domainVerified: undefined });
            setDomainInput('');
            setDomainStatus(null);
            Toast.show({ content: tMobile('saved'), duration: 1200 });
        } catch {
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            setLoading(false);
        }
    };

    const activeDomainUrl = activeDomain ? normalizeBaseUrl(activeDomain) : '';

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('customDomainSubtitle')}
                    title={t('customDomain')}
                />

                {activeDomain ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Flex align="center" gap={8} justify="space-between">
                                <Flex align="center" gap={8}>
                                    <LuGlobe size={18} />
                                    <Text strong>{activeDomain}</Text>
                                </Flex>
                                <Tag color={domainStatus?.verified || storeDetails?.domainVerified ? 'success' : 'warning'}>
                                    {domainStatus?.verified || storeDetails?.domainVerified ? t('verificationComplete') : t('checkVerification')}
                                </Tag>
                            </Flex>
                            <Text type="secondary">
                                {domainStatus?.verified || storeDetails?.domainVerified
                                    ? t('menuLiveAt')
                                    : t('waitingDnsVerification', { domain: activeDomain })}
                            </Text>
                            <Flex align="center" gap={8} wrap>
                                <Button fill="outline" loading={statusLoading} onClick={() => void refreshStatus()} size="small">{t('checkVerification')}</Button>
                                <Button fill="none" onClick={() => navigator.clipboard.writeText(activeDomainUrl)} size="small"><LuCopy size={16} /></Button>
                                <Button fill="none" onClick={() => window.open(activeDomainUrl, '_blank')} size="small"><LuExternalLink size={16} /></Button>
                                <Button
                                    color="danger"
                                    fill="none"
                                    loading={loading}
                                    onClick={() => {
                                        void Dialog.confirm({
                                            cancelText: common('cancel'),
                                            confirmText: t('removeDomain'),
                                            content: t('removeDomainConfirmDesc', { domain: activeDomain }),
                                            onConfirm: removeDomain,
                                            title: t('removeDomainConfirmTitle'),
                                        });
                                    }}
                                    size="small"
                                >
                                    <LuTrash2 size={16} />
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('customDomain')}</Text>
                        <Text type="secondary">Enter a domain you already own, like menu.yourbrand.com or yourbrand.com. Do not add http:// or https://.</Text>
                        <Input onChange={(value) => {
                            setDomainInput(value);
                            setDomainAvailability(null);
                        }} placeholder={t('domainPlaceholder')} value={domainInput} />
                        {domainAvailability ? (
                            <Text type="secondary">
                                {domainAvailability.available ? 'Domain is available to connect' : domainAvailability.reason}
                            </Text>
                        ) : null}
                        <Flex gap={8}>
                            <Button block disabled={!canCheckDomain} fill="outline" loading={checkingAvailability} onClick={() => void checkDomain()} size="large">
                                <Flex align="center" gap={6}><LuSearch size={16} /><Text>{t('checkAvailability')}</Text></Flex>
                            </Button>
                            {canConnectDomain ? (
                                <Button block color="primary" loading={loading} onClick={() => void addDomain()} size="large">
                                    {t('connectDomain')}
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                </Card>

                {domainStatus?.config ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text strong>{t('configureDnsRecords')}</Text>
                            <Text type="secondary">{t('configureDnsRecordsDesc')}</Text>
                            <Text>{JSON.stringify(domainStatus.config)}</Text>
                        </Flex>
                    </Card>
                ) : null}

                {(domainStatus?.verified || storeDetails?.domainVerified) ? (
                    <Card>
                        <Flex gap={6} vertical>
                            <Flex align="center" gap={8}>
                                <LuCheckCircle2 color="#16a34a" size={18} />
                                <Text strong>{t('customDomainActive')}</Text>
                            </Flex>
                            <Text type="secondary">{t('autoRedirect')}</Text>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Flex>
    );
}
