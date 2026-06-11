'use client';

import { getMenuUrl, normalizeBaseUrl, PLATFORM_DOMAIN } from '@constant/urls';
import { checkCustomDomainAvailability } from '@database/stores';
import { Alert, Button, Card, Divider, Input, List, Space, Steps, Tag, Typography } from 'antd';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuRefreshCw, LuSearch, LuTrash2 } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface DomainSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
    onStoreStateUpdate?: (updates: any) => void;
    onStoreUpdate?: (updates: any) => void;
}

function normalizeDnsRecords(config: any, domain: string) {
    const records: { type: string; name: string; value: string }[] = [];

    if (!config) return records;

    if (Array.isArray(config?.verificationRecords)) {
        config.verificationRecords.forEach((record: any) => {
            records.push({
                type: record.type || 'TXT',
                name: record.domain || record.name || '_vercel',
                value: record.value || record.reason || '',
            });
        });
    }

    if (Array.isArray(config?.configuredBy)) {
        config.configuredBy.forEach((record: any) => {
            records.push({
                type: record.type || 'CNAME',
                name: record.name || (domain.startsWith('www.') ? 'www' : '@'),
                value: record.value || '',
            });
        });
    }

    if (records.length === 0) {
        records.push({
            type: 'CNAME',
            name: domain.startsWith('www.') ? 'www' : '@',
            value: 'cname.vercel-dns.com',
        });
    }

    return records;
}

function DomainSettingsTab({ scrollRef, storeDetails, onStoreStateUpdate, onStoreUpdate }: DomainSettingsTabProps) {
    const t = useTranslations('BusinessSettings');
    const [subdomainValue, setSubdomainValue] = useState(storeDetails?.subdomain || '');
    const [availability, setAvailability] = useState<{
        available?: boolean;
        reason?: string;
        normalized?: string;
        preview?: string;
    } | null>(null);
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [savingSubdomain, setSavingSubdomain] = useState(false);
    const [subdomainCopied, setSubdomainCopied] = useState(false);

    const [domainInput, setDomainInput] = useState(storeDetails?.customDomain || '');
    const [domainAvailability, setDomainAvailability] = useState<{ available?: boolean; reason?: string; normalized?: string } | null>(null);
    const [domainLoading, setDomainLoading] = useState(false);
    const [checkingDomain, setCheckingDomain] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);
    const [copiedDnsValue, setCopiedDnsValue] = useState<string | null>(null);
    const [domainLinkCopied, setDomainLinkCopied] = useState(false);

    const subdomainUrl = storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null;
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
    const normalizedDomainInput = domainInput.trim().toLowerCase();
    const canCheckDomain = !activeDomain && normalizedDomainInput.length >= 4;
    const canConnectDomain = Boolean(
        !activeDomain
        && domainAvailability?.available
        && domainAvailability?.normalized === normalizedDomainInput
    );
    const customDomainVerified = Boolean(domainStatus?.verified || storeDetails?.domainVerified);
    const dnsRecords = useMemo(
        () => normalizeDnsRecords(domainStatus?.config || domainStatus?.verification, activeDomain || domainInput),
        [activeDomain, domainInput, domainStatus]
    );

    useEffect(() => {
        if (storeDetails?.customDomain) {
            setDomainInput(storeDetails.customDomain);
        }
    }, [storeDetails?.customDomain]);

    const checkAvailability = useCallback(async (value: string) => {
        if (!value || value.trim().length < 3) {
            setAvailability(null);
            return;
        }

        setCheckingSubdomain(true);
        try {
            const res = await axios.get(`/api/subdomain/check?subdomain=${encodeURIComponent(value.trim())}`);
            setAvailability(res.data);
            if (res.data?.normalized) {
                setSubdomainValue(res.data.normalized);
            }
        } catch {
            setAvailability({ available: false, reason: 'Could not check availability' });
        } finally {
            setCheckingSubdomain(false);
        }
    }, []);

    const saveSubdomain = useCallback(async () => {
        const nextSubdomain = availability?.normalized || subdomainValue.trim();
        if (!nextSubdomain) return;
        setSavingSubdomain(true);
        try {
            onStoreUpdate?.({ subdomain: nextSubdomain });
            setAvailability((previous) => previous ? { ...previous, normalized: nextSubdomain, preview: nextSubdomain } : previous);
        } finally {
            setSavingSubdomain(false);
        }
    }, [availability?.normalized, onStoreUpdate, subdomainValue]);

    const refreshDomainStatus = useCallback(async () => {
        if (!storeDetails?.customDomain) return;
        setStatusLoading(true);
        setDomainError(null);
        try {
            const res = await axios.get('/api/domain');
            setDomainStatus(res.data);
            if (res.data?.verified) {
                onStoreStateUpdate?.({ domainVerified: true });
            }
        } catch {
            setDomainError(t('dnsVerificationDesc'));
        } finally {
            setStatusLoading(false);
        }
    }, [onStoreStateUpdate, storeDetails?.customDomain, t]);

    useEffect(() => {
        void refreshDomainStatus();
    }, [refreshDomainStatus]);

    const handleAddDomain = useCallback(async () => {
        if (!domainInput.trim()) return;
        setDomainLoading(true);
        setDomainError(null);
        try {
            const res = await axios.post('/api/domain', { domain: domainAvailability?.normalized || domainInput.trim() });
            const nextDomain = res.data?.domain || domainInput.trim();
            setDomainInput(nextDomain);
            setDomainAvailability({ available: true, normalized: nextDomain });
            setDomainStatus({
                hasDomain: true,
                domain: nextDomain,
                verified: false,
                config: res.data?.verification,
            });
            onStoreStateUpdate?.({ customDomain: nextDomain, domainVerified: false });
        } catch (err: any) {
            setDomainError(err.response?.data?.error || 'Failed to add domain.');
        } finally {
            setDomainLoading(false);
        }
    }, [domainInput, onStoreStateUpdate]);

    const handleCheckDomain = useCallback(async () => {
        if (!normalizedDomainInput) return;
        setCheckingDomain(true);
        setDomainError(null);
        try {
            const result = await checkCustomDomainAvailability(normalizedDomainInput, storeDetails?.storeId);
            setDomainAvailability(result);
            if (result?.normalized) {
                setDomainInput(result.normalized);
            }
        } catch {
            setDomainAvailability({ available: false, reason: 'Could not check domain right now.' });
        } finally {
            setCheckingDomain(false);
        }
    }, [normalizedDomainInput, storeDetails?.storeId]);

    const handleRemoveDomain = useCallback(async () => {
        setDomainLoading(true);
        setDomainError(null);
        try {
            await axios.delete('/api/domain');
            setDomainStatus(null);
            setDomainInput('');
            onStoreStateUpdate?.({ customDomain: undefined, domainVerified: undefined });
        } catch {
            setDomainError('Failed to remove domain.');
        } finally {
            setDomainLoading(false);
        }
    }, [onStoreStateUpdate]);

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>{t('domain')}</Title>
            <Text type="secondary">{t('customDomainDesc')}</Text>
            <Divider />

            <Alert
                message={subdomainUrl || (activeDomain ? `https://${activeDomain}` : t('noSubdomainSet'))}
                showIcon
                style={{ marginBottom: 16 }}
                type={activeDomain ? (customDomainVerified ? 'success' : 'warning') : 'info'}
            />

            <Card size="small" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ marginTop: 0 }}>{t('subdomain')}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                    {t('subdomainSetupNote')}
                </Paragraph>

                {storeDetails?.isMaster === false ? (
                    <Alert
                        description={t('outletSubdomainDesc')}
                        message={t('outletSubdomainInfo')}
                        showIcon
                        type="info"
                    />
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {subdomainUrl ? (
                            <Space wrap>
                                <Tag color="blue" icon={<LuGlobe />}>{subdomainUrl.replace(/^https?:\/\//, '')}</Tag>
                                <Button
                                    icon={subdomainCopied ? <LuCheck /> : <LuCopy />}
                                    onClick={() => {
                                        navigator.clipboard.writeText(subdomainUrl);
                                        setSubdomainCopied(true);
                                        setTimeout(() => setSubdomainCopied(false), 2000);
                                    }}
                                >
                                    {subdomainCopied ? t('copied') : t('copy')}
                                </Button>
                                <Button icon={<LuExternalLink />} onClick={() => window.open(subdomainUrl, '_blank')}>
                                    {t('open')}
                                </Button>
                            </Space>
                        ) : null}

                        {/*
                         * G-08 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): once the store
                         * has ever been published, the subdomain is a permanent
                         * URL anchor. Renaming it would break every printed QR,
                         * every shared link, and every indexed page. The editor
                         * is hidden post-publish; pre-publish stores keep the
                         * full flow. Server-side enforcement lives in updateStore.
                         */}
                        {storeDetails?.lastPublishedAt ? (
                            <Alert
                                message={t('subdomainLockedMessage')}
                                description={t('subdomainLockedDescription')}
                                showIcon
                                type="info"
                            />
                        ) : (
                            <>
                                <Input
                                    addonAfter={`.${PLATFORM_DOMAIN}`}
                                    placeholder={t('subdomainPlaceholder')}
                                    value={subdomainValue}
                                    onBlur={(event) => void checkAvailability(event.target.value)}
                                    onChange={(event) => {
                                        setSubdomainValue(event.target.value.toLowerCase().trim());
                                        setAvailability(null);
                                    }}
                                />
                                <Text type="secondary">{t('subdomainHelp')}</Text>

                                {availability ? (
                                    <Text type={availability.available ? 'success' : 'danger'}>
                                        {availability.available ? `${availability.preview} ${t('isAvailable', { name: '' }).replace(' is available', '')} ${t('open') ? '' : ''}` : availability.reason}
                                    </Text>
                                ) : null}

                                <Space wrap>
                                    <Button
                                        disabled={!canCheckSubdomain}
                                        icon={<LuSearch />}
                                        loading={checkingSubdomain}
                                        onClick={() => void checkAvailability(subdomainValue)}
                                    >
                                        {t('checkAvailability')}
                                    </Button>
                                    {canSaveSubdomain ? (
                                        <Button
                                            loading={savingSubdomain}
                                            onClick={() => void saveSubdomain()}
                                            type="primary"
                                        >
                                            {t('saveChanges')}
                                        </Button>
                                    ) : null}
                                </Space>

                                {!storeDetails?.subdomain ? (
                                    <Alert
                                        description={t('noSubdomainDesc')}
                                        message={t('noSubdomainSet')}
                                        showIcon
                                        type="warning"
                                    />
                                ) : null}
                            </>
                        )}
                    </Space>
                )}
            </Card>

            <Card size="small">
                <Title level={5} style={{ marginTop: 0 }}>{t('customDomain')}</Title>
                <Paragraph type="secondary">{t('dnsOwnershipNote')}</Paragraph>

                {activeDomain ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Space wrap>
                            <Tag color={customDomainVerified ? 'success' : 'warning'} icon={<LuGlobe />}>
                                {activeDomain}
                            </Tag>
                            <Button
                                icon={domainLinkCopied ? <LuCheck /> : <LuCopy />}
                                onClick={() => {
                                    navigator.clipboard.writeText(normalizeBaseUrl(activeDomain));
                                    setDomainLinkCopied(true);
                                    setTimeout(() => setDomainLinkCopied(false), 2000);
                                }}
                            >
                                {domainLinkCopied ? t('copied') : t('copy')}
                            </Button>
                            <Button icon={<LuExternalLink />} onClick={() => window.open(normalizeBaseUrl(activeDomain), '_blank')}>
                                {t('open')}
                            </Button>
                            <Button danger icon={<LuTrash2 />} loading={domainLoading} onClick={() => void handleRemoveDomain()}>
                                Remove
                            </Button>
                        </Space>

                        <Steps
                            current={customDomainVerified ? 2 : 1}
                            direction="vertical"
                            items={[
                                { title: t('domainAdded'), status: 'finish' },
                                { title: t('configureDnsRecords'), description: t('dnsVerificationDesc'), status: customDomainVerified ? 'finish' : 'process' },
                                { title: t('verificationComplete'), description: t('verificationCompleteDesc'), status: customDomainVerified ? 'finish' : 'wait' },
                            ]}
                            size="small"
                        />

                        {!customDomainVerified ? (
                            <>
                                <List
                                    bordered
                                    dataSource={dnsRecords}
                                    renderItem={(record, index) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    icon={copiedDnsValue === `${index}` ? <LuCheck /> : <LuCopy />}
                                                    key={`copy-${index}`}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(record.value);
                                                        setCopiedDnsValue(`${index}`);
                                                        setTimeout(() => setCopiedDnsValue(null), 2000);
                                                    }}
                                                    size="small"
                                                    type="text"
                                                >
                                                    {copiedDnsValue === `${index}` ? t('copied') : t('copy')}
                                                </Button>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                description={<Text code>{`${record.name} -> ${record.value}`}</Text>}
                                                title={<Space><Tag>{record.type}</Tag><Text>{record.name}</Text></Space>}
                                            />
                                        </List.Item>
                                    )}
                                />
                                <Space wrap>
                                    <Button icon={<LuRefreshCw />} loading={statusLoading} onClick={() => void refreshDomainStatus()} type="primary">
                                        {t('checkVerification')}
                                    </Button>
                                </Space>
                            </>
                        ) : (
                            <Alert
                                description={t('autoRedirect')}
                                message={`${t('menuLiveAt')} ${normalizeBaseUrl(activeDomain)}`}
                                showIcon
                                type="success"
                            />
                        )}
                    </Space>
                ) : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Input
                            placeholder={t('domainPlaceholder')}
                            prefix={<LuGlobe />}
                            value={domainInput}
                            onChange={(event) => {
                                setDomainInput(event.target.value.toLowerCase().trim());
                                setDomainAvailability(null);
                            }}
                        />
                        {domainAvailability ? (
                            <Text type={domainAvailability.available ? 'success' : 'danger'}>
                                {domainAvailability.available ? 'Domain is available to connect' : domainAvailability.reason}
                            </Text>
                        ) : null}
                        <Space wrap>
                            <Button
                                disabled={!canCheckDomain}
                                icon={<LuSearch />}
                                loading={checkingDomain}
                                onClick={() => void handleCheckDomain()}
                            >
                                {t('checkAvailability')}
                            </Button>
                            {canConnectDomain ? (
                                <Button
                                    loading={domainLoading}
                                    onClick={() => void handleAddDomain()}
                                    type="primary"
                                >
                                    {t('connectDomain')}
                                </Button>
                            ) : null}
                        </Space>
                    </Space>
                )}

                {domainError ? (
                    <Alert
                        message={domainError}
                        showIcon
                        style={{ marginTop: 16 }}
                        type="error"
                    />
                ) : null}
            </Card>
        </Card>
    );
}

export default memo(DomainSettingsTab);
