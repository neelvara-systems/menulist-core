'use client';

import { getMenuUrl } from '@constant/urls';
import { Alert, Button, Card, Divider, Input, List, Space, Steps, Tag, Typography } from 'antd';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuRefreshCw, LuSearch, LuTrash2, LuX } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface DomainSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
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

function DomainSettingsTab({ scrollRef, storeDetails, onStoreUpdate }: DomainSettingsTabProps) {
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
    const [domainLoading, setDomainLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [domainStatus, setDomainStatus] = useState<any>(null);
    const [copiedDnsValue, setCopiedDnsValue] = useState<string | null>(null);
    const [domainLinkCopied, setDomainLinkCopied] = useState(false);

    const subdomainUrl = storeDetails?.subdomain ? getMenuUrl(storeDetails.subdomain) : null;
    const activeDomain = storeDetails?.customDomain || domainStatus?.domain;
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
                onStoreUpdate?.({ domainVerified: true });
            }
        } catch {
            setDomainError(t('dnsVerificationDesc'));
        } finally {
            setStatusLoading(false);
        }
    }, [onStoreUpdate, storeDetails?.customDomain, t]);

    useEffect(() => {
        void refreshDomainStatus();
    }, [refreshDomainStatus]);

    const handleAddDomain = useCallback(async () => {
        if (!domainInput.trim()) return;
        setDomainLoading(true);
        setDomainError(null);
        try {
            const res = await axios.post('/api/domain', { domain: domainInput.trim() });
            const nextDomain = res.data?.domain || domainInput.trim();
            setDomainInput(nextDomain);
            setDomainStatus({
                hasDomain: true,
                domain: nextDomain,
                verified: false,
                config: res.data?.verification,
            });
            onStoreUpdate?.({ customDomain: nextDomain, domainVerified: false });
        } catch (err: any) {
            setDomainError(err.response?.data?.error || 'Failed to add domain.');
        } finally {
            setDomainLoading(false);
        }
    }, [domainInput, onStoreUpdate]);

    const handleRemoveDomain = useCallback(async () => {
        setDomainLoading(true);
        setDomainError(null);
        try {
            await axios.delete('/api/domain');
            setDomainStatus(null);
            setDomainInput('');
            onStoreUpdate?.({ customDomain: null, domainVerified: false });
        } catch {
            setDomainError('Failed to remove domain.');
        } finally {
            setDomainLoading(false);
        }
    }, [onStoreUpdate]);

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
                    This is usually created from your business name during setup. You can change it here if needed.
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
                                <Tag color="blue" icon={<LuGlobe />}>{storeDetails.subdomain}.menulist.ai</Tag>
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

                        <Input
                            addonAfter=".menulist.ai"
                            placeholder="your-business"
                            value={subdomainValue}
                            onBlur={(event) => void checkAvailability(event.target.value)}
                            onChange={(event) => setSubdomainValue(event.target.value.toLowerCase().trim())}
                        />
                        <Text type="secondary">{t('subdomainHelp')}</Text>

                        {availability ? (
                            <Text type={availability.available ? 'success' : 'danger'}>
                                {availability.available ? `${availability.preview} ${t('isAvailable', { name: '' }).replace(' is available', '')} ${t('open') ? '' : ''}` : availability.reason}
                            </Text>
                        ) : null}

                        <Space wrap>
                            <Button
                                disabled={!subdomainValue || subdomainValue.length < 3}
                                icon={<LuSearch />}
                                loading={checkingSubdomain}
                                onClick={() => void checkAvailability(subdomainValue)}
                            >
                                {t('checkAvailability')}
                            </Button>
                            <Button
                                disabled={!availability?.available}
                                loading={savingSubdomain}
                                onClick={() => void saveSubdomain()}
                                type="primary"
                            >
                                {t('copy') ? 'Save' : 'Save'}
                            </Button>
                        </Space>

                        {!storeDetails?.subdomain ? (
                            <Alert
                                description={t('noSubdomainDesc')}
                                message={t('noSubdomainSet')}
                                showIcon
                                type="warning"
                            />
                        ) : null}
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
                                    navigator.clipboard.writeText(`https://${activeDomain}`);
                                    setDomainLinkCopied(true);
                                    setTimeout(() => setDomainLinkCopied(false), 2000);
                                }}
                            >
                                {domainLinkCopied ? t('copied') : t('copy')}
                            </Button>
                            <Button icon={<LuExternalLink />} onClick={() => window.open(`https://${activeDomain}`, '_blank')}>
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
                                message={`${t('menuLiveAt')} https://${activeDomain}`}
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
                            onChange={(event) => setDomainInput(event.target.value.toLowerCase().trim())}
                        />
                        <Button
                            disabled={!domainInput || domainInput.length < 4}
                            loading={domainLoading}
                            onClick={() => void handleAddDomain()}
                            type="primary"
                        >
                            {t('connectDomain')}
                        </Button>
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
