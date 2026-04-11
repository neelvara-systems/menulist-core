'use client'

import { getMenuUrl } from '@constant/urls';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Input as AntInput, List as AntList, Steps, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    LuCheck,
    LuCheckCircle2,
    LuCopy,
    LuExternalLink,
    LuGlobe,
    LuSearch,
    LuTrash2,
    LuX,
} from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, NavBar, Tag, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileDomainSettingsScreenProps {
    onBack: () => void;
}

export default function MobileDomainSettingsScreen({ onBack }: MobileDomainSettingsScreenProps) {
    const t = useTranslations('BusinessSettings');
    const common = useTranslations('Common');
    const tMobile = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    const [subdomainValue, setSubdomainValue] = useState(storeDetails?.subdomain || '');
    const [domainInput, setDomainInput] = useState(storeDetails?.customDomain || '');
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [savingSubdomain, setSavingSubdomain] = useState(false);
    const [domainLoading, setDomainLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [availability, setAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string; preview?: string } | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);

    const subdomainUrl = useMemo(
        () => (storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null),
        [storeDetails?.subdomain]
    );
    const currentSubdomain = (storeDetails?.subdomain || '').trim().toLowerCase();
    const normalizedInputSubdomain = subdomainValue.trim().toLowerCase();
    const hasSubdomainChanged = normalizedInputSubdomain !== currentSubdomain;
    const canCheckSubdomain = normalizedInputSubdomain.length >= 3 && (!storeDetails?.subdomain || hasSubdomainChanged);
    const canSaveSubdomain = Boolean(
        availability?.available
        && availability?.normalized === normalizedInputSubdomain
        && (!storeDetails?.subdomain || hasSubdomainChanged)
    );
    const activeDomain = storeDetails?.customDomain || domainStatus?.domain;
    const liveUrl = activeDomain ? `https://${activeDomain}` : subdomainUrl;
    const customDomainVerified = Boolean(domainStatus?.verified || storeDetails?.domainVerified);
    const dnsRecords = useMemo(() => {
        const records: { type: string; name: string; value: string }[] = [];
        const config = domainStatus?.config;
        if (Array.isArray(config?.verificationRecords)) {
            config.verificationRecords.forEach((record: any) => {
                records.push({
                    type: record.type || 'TXT',
                    name: record.domain || record.name || '_vercel',
                    value: record.value || record.reason || '',
                });
            });
        }
        if (records.length === 0 && activeDomain) {
            records.push({
                type: 'CNAME',
                name: activeDomain.startsWith('www.') ? 'www' : '@',
                value: 'cname.vercel-dns.com',
            });
        }
        return records;
    }, [activeDomain, domainStatus?.config]);

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

    const checkAvailability = useCallback(async (input: string) => {
        if (!input || input.trim().length < 3) {
            setAvailability(null);
            return;
        }
        setCheckingSubdomain(true);
        try {
            const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(input.trim())}`);
            const data = await response.json();
            setAvailability(data);
            if (data?.normalized) setSubdomainValue(data.normalized);
        } catch {
            setAvailability({ available: false, reason: t('checkAvailabilityFailed') });
        } finally {
            setCheckingSubdomain(false);
        }
    }, []);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || subdomainValue.trim();
        if (!storeDetails?.storeId || !nextSubdomain) return;
        setSavingSubdomain(true);
        try {
            await updateStore({ storeId: storeDetails.storeId, subdomain: nextSubdomain } as any);
            setStoreDetails({ ...storeDetails, subdomain: nextSubdomain });
            Toast.show({ content: tMobile('saved'), duration: 1200 });
        } catch {
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            setSavingSubdomain(false);
        }
    }, [availability?.normalized, common, setStoreDetails, storeDetails, subdomainValue, tMobile]);

    const addDomain = async () => {
        if (!domainInput.trim()) return;
        setDomainLoading(true);
        try {
            const response = await fetch('/api/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domainInput.trim() }),
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
            setDomainLoading(false);
        }
    };

    const removeDomain = async () => {
        setDomainLoading(true);
        try {
            await fetch('/api/domain', { method: 'DELETE' });
            setStoreDetails({ ...storeDetails, customDomain: undefined, domainVerified: undefined });
            setDomainInput('');
            setDomainStatus(null);
            Toast.show({ content: tMobile('saved'), duration: 1200 });
        } catch {
            Toast.show({ content: common('error'), duration: 1500 });
        } finally {
            setDomainLoading(false);
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('domainSettingsSubtitle')}
                    title={t('domain')}
                />
                <Card>
                    <Flex gap={6} vertical>
                        <Text strong>{liveUrl ? t('yourCurrentLink') : t('domain')}</Text>
                        {liveUrl ? <Tag color={activeDomain ? (customDomainVerified ? 'success' : 'warning') : 'processing'}>{liveUrl.replace(/^https?:\/\//, '')}</Tag> : <Text type="secondary">{t('noSubdomainDesc')}</Text>}
                        {liveUrl ? (
                            <Flex gap={8} wrap>
                                <Button fill="outline" onClick={() => navigator.clipboard.writeText(liveUrl)} size="small">
                                    <Flex align="center" gap={6}><LuCopy size={16} /><Text>{t('copy')}</Text></Flex>
                                </Button>
                                <Button fill="outline" onClick={() => window.open(liveUrl, '_blank')} size="small">
                                    <Flex align="center" gap={6}><LuExternalLink size={16} /><Text>{t('open')}</Text></Flex>
                                </Button>
                            </Flex>
                        ) : null}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text strong>{t('subdomain')}</Text>
                        <Text type="secondary">{t('subdomainSetupNote')}</Text>
                        {storeDetails?.isMaster === false ? (
                            <>
                                <Text>{storeDetails?.subdomain ? `${storeDetails.subdomain}.menulist.ai` : t('outletSubdomainInfo')}</Text>
                                <Text type="secondary">{t('outletSubdomainDesc')}</Text>
                            </>
                        ) : (
                            <>
                                <AntInput
                                    addonAfter=".menulist.ai"
                                    onChange={(event) => {
                                        setSubdomainValue(event.target.value.toLowerCase().trim());
                                        setAvailability(null);
                                    }}
                                    placeholder={t('subdomainPlaceholder')}
                                    value={subdomainValue}
                                />
                                <Text type="secondary">{t('subdomainHelp')}</Text>
                                {availability ? (
                                    <Flex align="center" gap={8}>
                                        {availability.available ? <LuCheck color="#16a34a" size={16} /> : <LuX color="#dc2626" size={16} />}
                                        <Text type="secondary">{availability.available ? t('isAvailable', { name: availability.preview }) : availability.reason}</Text>
                                    </Flex>
                                ) : null}
                                {!storeDetails?.subdomain ? (
                                    <Alert
                                        description={t('noSubdomainDesc')}
                                        message={t('noSubdomainSet')}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}
                                <Flex gap={8}>
                                    <Button block disabled={!canCheckSubdomain} fill="outline" loading={checkingSubdomain} onClick={() => void checkAvailability(subdomainValue)} size="large">
                                        <Flex align="center" gap={6}>
                                            <LuSearch size={16} />
                                            <Text>{t('checkAvailability')}</Text>
                                        </Flex>
                                    </Button>
                                    <Button block color="primary" disabled={!canSaveSubdomain} loading={savingSubdomain} onClick={() => void saveSubdomain()} size="large">
                                        {common('save')}
                                    </Button>
                                </Flex>
                            </>
                        )}
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text strong>{t('customDomain')}</Text>
                        <Text type="secondary">{t('customDomainDesc')}</Text>
                        <Text type="secondary">{t('dnsOwnershipNote')}</Text>
                        {activeDomain ? (
                            <>
                                <Flex align="center" gap={8} justify="space-between">
                                    <Flex align="center" gap={8}>
                                        <LuGlobe size={18} />
                                        <Text strong>{activeDomain}</Text>
                                    </Flex>
                                    <Tag color={customDomainVerified ? 'success' : 'warning'}>
                                        {customDomainVerified ? t('verificationComplete') : t('checkVerification')}
                                    </Tag>
                                </Flex>
                                <Text type="secondary">
                                    {customDomainVerified ? t('menuLiveAt') : t('waitingDnsVerification', { domain: activeDomain })}
                                </Text>
                                <Flex gap={8} wrap>
                                    <Button fill="outline" loading={statusLoading} onClick={() => void refreshStatus()} size="small">
                                        <Flex align="center" gap={6}><LuSearch size={16} /><Text>{t('checkVerification')}</Text></Flex>
                                    </Button>
                                    <Button fill="outline" onClick={() => navigator.clipboard.writeText(`https://${activeDomain}`)} size="small">
                                        <Flex align="center" gap={6}><LuCopy size={16} /><Text>{t('copy')}</Text></Flex>
                                    </Button>
                                    <Button fill="outline" onClick={() => window.open(`https://${activeDomain}`, '_blank')} size="small">
                                        <Flex align="center" gap={6}><LuExternalLink size={16} /><Text>{t('open')}</Text></Flex>
                                    </Button>
                                    <Button
                                        color="danger"
                                        fill="outline"
                                        loading={domainLoading}
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
                                        <Flex align="center" gap={6}><LuTrash2 size={16} /><Text>{t('removeDomain')}</Text></Flex>
                                    </Button>
                                </Flex>
                                {!customDomainVerified ? (
                                    <Steps
                                        current={1}
                                        direction="vertical"
                                        items={[
                                            { title: t('domainAdded'), status: 'finish' },
                                            { title: t('configureDnsRecords'), description: t('dnsVerificationDesc'), status: 'process' },
                                            { title: t('verificationComplete'), description: t('verificationCompleteDesc'), status: 'wait' },
                                        ]}
                                        size="small"
                                    />
                                ) : null}
                            </>
                        ) : (
                            <>
                                <Input onChange={setDomainInput} placeholder={t('domainPlaceholder')} value={domainInput} />
                                <Button block color="primary" loading={domainLoading} onClick={() => void addDomain()} size="large">
                                    {t('connectDomain')}
                                </Button>
                            </>
                        )}
                    </Flex>
                </Card>

                {domainStatus?.config ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text strong>{t('configureDnsRecords')}</Text>
                            <Text type="secondary">{t('configureDnsRecordsDesc')}</Text>
                            <AntList
                                bordered
                                dataSource={dnsRecords}
                                renderItem={(record) => (
                                    <AntList.Item>
                                        <Flex gap={6} vertical style={{ width: '100%' }}>
                                            <Tag>{record.type}</Tag>
                                            <Typography.Text code>{record.name}</Typography.Text>
                                            <Typography.Text code>{record.value}</Typography.Text>
                                        </Flex>
                                    </AntList.Item>
                                )}
                            />
                        </Flex>
                    </Card>
                ) : null}

                {customDomainVerified ? (
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
