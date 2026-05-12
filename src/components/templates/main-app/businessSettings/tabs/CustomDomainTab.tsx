'use client';
import { FEATURE_FLAGS } from '@config/features';
import { normalizeBaseUrl } from '@constant/urls';
import { Alert, Button, Card, Col, Divider, Input, Row, Space, Steps, Tag, Typography, notification } from 'antd';
import axios from 'axios';
import { memo, useCallback, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuFileText, LuGlobe, LuLoader, LuRefreshCw, LuRotateCcw, LuTrash2 } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface CustomDomainTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
    onStoreUpdate?: (updates: any) => void;
}

type DomainStatus = 'none' | 'adding' | 'pending' | 'verified' | 'error';

interface DnsRecord {
    type: string;
    name: string;
    value: string;
}

function CustomDomainTab({ scrollRef, storeDetails, onStoreUpdate }: CustomDomainTabProps) {
    const [status, setStatus] = useState<DomainStatus>('none');
    const [domainInput, setDomainInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
    const [copied, setCopied] = useState<string | null>(null);
    const activeDomainUrl = storeDetails?.customDomain ? normalizeBaseUrl(storeDetails.customDomain) : '';

    // Initialize from store data
    useEffect(() => {
        if (storeDetails?.customDomain) {
            if (storeDetails.domainVerified) {
                setStatus('verified');
            } else {
                setStatus('pending');
            }
            setDomainInput(storeDetails.customDomain);
        }
    }, [storeDetails]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    // Add domain
    const handleAddDomain = useCallback(async () => {
        if (!domainInput || domainInput.length < 4) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axios.post('/api/domain', { domain: domainInput });
            setStatus('pending');

            // Extract DNS records from Vercel config
            const config = res.data?.verification;
            if (config) {
                const records: DnsRecord[] = [];
                // CNAME record for the domain
                records.push({
                    type: 'CNAME',
                    name: domainInput.startsWith('www.') ? 'www' : '@',
                    value: 'cname.vercel-dns.com',
                });
                // If there's a TXT verification record
                if (config.verificationRecords) {
                    config.verificationRecords.forEach((r: any) => {
                        records.push({
                            type: r.type || 'TXT',
                            name: r.domain || '_vercel',
                            value: r.value || r.reason || '',
                        });
                    });
                }
                setDnsRecords(records);
            } else {
                // Default CNAME instruction
                setDnsRecords([{
                    type: 'CNAME',
                    name: domainInput.startsWith('www.') ? 'www' : '@',
                    value: 'cname.vercel-dns.com',
                }]);
            }

            onStoreUpdate?.({ customDomain: domainInput, domainVerified: false });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add domain. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [domainInput, onStoreUpdate]);

    // Check verification
    const handleCheckVerification = useCallback(async () => {
        setChecking(true);
        setError(null);

        try {
            const res = await axios.get('/api/domain');
            if (res.data?.verified) {
                setStatus('verified');
                onStoreUpdate?.({ domainVerified: true });
            } else {
                setError('Domain not verified yet. Please check your DNS settings and try again in a few minutes.');
            }
        } catch {
            setError('Could not check verification status.');
        } finally {
            setChecking(false);
        }
    }, [onStoreUpdate]);

    // Remove domain
    const handleRemoveDomain = useCallback(async () => {
        setLoading(true);
        try {
            await axios.delete('/api/domain');
            setStatus('none');
            setDomainInput('');
            setDnsRecords([]);
            onStoreUpdate?.({ customDomain: null, domainVerified: false });
        } catch {
            setError('Failed to remove domain.');
        } finally {
            setLoading(false);
        }
    }, [onStoreUpdate]);

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>Custom Domain</Title>
            <Divider />

            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Connect your own domain (like <strong>yourbusiness.com</strong>) to your MenuList page.
                Customers will see your domain instead of menulist.ai.
            </Paragraph>

            {/* ── State: No domain ── */}
            {status === 'none' && (
                <>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={16}>
                            <Input
                                size="large"
                                placeholder="yourbusiness.com"
                                value={domainInput}
                                onChange={(e) => setDomainInput(e.target.value.toLowerCase().trim())}
                                prefix={<LuGlobe />}
                                onPressEnter={handleAddDomain}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Button
                                type="primary"
                                size="large"
                                loading={loading}
                                onClick={handleAddDomain}
                                disabled={!domainInput || domainInput.length < 4}
                                style={{ width: '100%' }}
                            >
                                Connect Domain
                            </Button>
                        </Col>
                    </Row>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        You must own the domain and have access to its DNS settings (usually from your domain registrar like GoDaddy, Namecheap, Google Domains, etc.)
                    </Text>
                </>
            )}

            {/* ── State: Pending verification ── */}
            {status === 'pending' && (
                <>
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message={`Waiting for DNS verification: ${storeDetails?.customDomain || domainInput}`}
                        description="Follow the steps below to verify your domain. DNS changes can take up to 48 hours to propagate."
                    />

                    <Steps
                        direction="vertical"
                        current={1}
                        size="small"
                        style={{ marginBottom: 16 }}
                        items={[
                            { title: 'Domain added', description: storeDetails?.customDomain || domainInput, status: 'finish' },
                            {
                                title: 'Configure DNS records',
                                description: 'Add the following records in your domain registrar',
                                status: 'process',
                            },
                            { title: 'Verification complete', description: 'Your domain will be live', status: 'wait' },
                        ]}
                    />

                    {/* DNS Records Table */}
                    <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                        <Title level={5} style={{ margin: '0 0 12px 0', fontSize: 14 }}>
                            DNS Records to Add
                        </Title>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Value</th>
                                        <th style={{ padding: '8px', width: 60 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(dnsRecords.length > 0 ? dnsRecords : [{
                                        type: 'CNAME',
                                        name: '@',
                                        value: 'cname.vercel-dns.com',
                                    }]).map((record, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px' }}>
                                                <Tag color="blue">{record.type}</Tag>
                                            </td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                                                {record.name}
                                            </td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                {record.value}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={copied === `${i}` ? <LuCheck /> : <LuCopy />}
                                                    onClick={() => handleCopy(record.value, `${i}`)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Space>
                        <Button
                            type="primary"
                            icon={checking ? <LuLoader /> : <LuRefreshCw />}
                            loading={checking}
                            onClick={handleCheckVerification}
                        >
                            Check Verification
                        </Button>
                        <Button
                            danger
                            icon={<LuTrash2 />}
                            loading={loading}
                            onClick={handleRemoveDomain}
                        >
                            Remove Domain
                        </Button>
                    </Space>
                </>
            )}

            {/* ── State: Verified ── */}
            {status === 'verified' && (
                <>
                    <Alert
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="Custom domain is active"
                        description={
                            <Space direction="vertical" size={4}>
                                <Text>
                                    Your menu is live at{' '}
                                    <a
                                        href={activeDomainUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontWeight: 600 }}
                                    >
                                        {storeDetails?.customDomain}
                                    </a>
                                </Text>
                                <Text type="secondary">
                                    Visitors to your menulist.ai link will automatically redirect here.
                                </Text>
                            </Space>
                        }
                    />

                    <Space>
                        <Button
                            icon={<LuExternalLink />}
                            onClick={() => window.open(activeDomainUrl, '_blank')}
                        >
                            Open
                        </Button>
                        <Button
                            icon={copied === 'url' ? <LuCheck /> : <LuCopy />}
                            onClick={() => handleCopy(activeDomainUrl, 'url')}
                        >
                            {copied === 'url' ? 'Copied' : 'Copy Link'}
                        </Button>
                        <Button
                            danger
                            icon={<LuTrash2 />}
                            loading={loading}
                            onClick={handleRemoveDomain}
                        >
                            Remove Domain
                        </Button>
                    </Space>
                </>
            )}

            {/* Error display */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    closable
                    style={{ marginTop: 12 }}
                    message={error}
                    onClose={() => setError(null)}
                />
            )}

            {/* ── Compliance Pages Section ── */}
            {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (status === 'verified' || status === 'pending' || storeDetails?.customDomain) && (
                <>
                    <Divider style={{ margin: '24px 0 16px' }} />
                    <CompliancePagesSection domain={storeDetails?.customDomain} />
                </>
            )}
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// Compliance Pages Section
// @see __docs__/compliance-pages/compliance-pages_impl.md
// ═══════════════════════════════════════════════════════════════

type ComplianceTab = 'privacy' | 'terms' | 'refund';
type CompliancePageData = { content: string; customContent?: string; source: string; systemContent?: string } | null;

function CompliancePagesSection({ domain }: { domain?: string }) {
    const [activeTab, setActiveTab] = useState<ComplianceTab>('privacy');
    const [privacyData, setPrivacyData] = useState<CompliancePageData>(null);
    const [termsData, setTermsData] = useState<CompliancePageData>(null);
    const [refundData, setRefundData] = useState<CompliancePageData>(null);
    const [customText, setCustomText] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Fetch compliance data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/compliance');
                if (res.data?.privacy) setPrivacyData(res.data.privacy);
                if (res.data?.terms) setTermsData(res.data.terms);
                if (res.data?.refund) setRefundData(res.data.refund);
            } catch {
                // Silently handle — pages will still auto-generate
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const dataMap: Record<ComplianceTab, typeof privacyData> = { privacy: privacyData, terms: termsData, refund: refundData };
    const labelMap: Record<ComplianceTab, string> = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', refund: 'Refund & Cancellation Policy' };
    const currentData = dataMap[activeTab];
    const pageLabel = labelMap[activeTab];
    const pageUrl = domain ? `https://${domain}/${activeTab}` : null;

    // Enter edit mode
    const handleStartEdit = () => {
        setCustomText(currentData?.customContent || '');
        setEditMode(true);
    };

    // Save custom override
    const handleSave = async () => {
        if (!customText || customText.trim().length < 100) {
            notification.error({ message: 'Content must be at least 100 characters.' });
            return;
        }
        setSaving(true);
        try {
            await axios.post('/api/compliance', {
                type: activeTab,
                action: 'override',
                content: customText,
            });
            const refreshRes = await axios.get('/api/compliance');
            if (refreshRes.data?.privacy) setPrivacyData(refreshRes.data.privacy);
            if (refreshRes.data?.terms) setTermsData(refreshRes.data.terms);
            if (refreshRes.data?.refund) setRefundData(refreshRes.data.refund);
            setEditMode(false);
            notification.success({ message: `${pageLabel} updated.` });
        } catch (err: any) {
            notification.error({ message: err.response?.data?.error || 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

    // Reset to system default
    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await axios.post('/api/compliance', {
                type: activeTab,
                action: 'reset',
            });
            // Refresh data
            const refreshRes = await axios.get('/api/compliance');
            if (refreshRes.data?.privacy) setPrivacyData(refreshRes.data.privacy);
            if (refreshRes.data?.terms) setTermsData(refreshRes.data.terms);
            if (refreshRes.data?.refund) setRefundData(refreshRes.data.refund);
            setEditMode(false);
            notification.success({ message: `${pageLabel} reset to default.` });
        } catch (err: any) {
            notification.error({ message: err.response?.data?.error || 'Failed to reset.' });
        } finally {
            setResetting(false);
        }
    };

    return (
        <div>
            <Title level={5} style={{ margin: '0 0 8px' }}>
                <LuFileText style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Compliance Pages
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                Privacy policy and terms pages on your domain for platform verification (Meta, Google, payment providers).
            </Paragraph>

            {/* Tab switcher */}
            <Space style={{ marginBottom: 12 }}>
                <Button
                    size="small"
                    type={activeTab === 'privacy' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('privacy'); setEditMode(false); }}
                >
                    Privacy Policy
                </Button>
                <Button
                    size="small"
                    type={activeTab === 'terms' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('terms'); setEditMode(false); }}
                >
                    Terms & Conditions
                </Button>
                <Button
                    size="small"
                    type={activeTab === 'refund' ? 'primary' : 'default'}
                    onClick={() => { setActiveTab('refund'); setEditMode(false); }}
                >
                    Refund Policy
                </Button>
            </Space>

            {loadingData ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <LuLoader style={{ animation: 'spin 1s linear infinite' }} />
                    <Text type="secondary" style={{ marginLeft: 8 }}>Loading...</Text>
                </div>
            ) : editMode ? (
                /* ── Edit Mode ── */
                <div>
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Your content appears first"
                        description="Custom text must be plain text only. MenuList baseline policy content and platform disclosures stay appended automatically."
                    />
                    <Input.TextArea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        rows={12}
                        maxLength={15000}
                        showCount
                        placeholder={`Paste your ${pageLabel.toLowerCase()} text here...`}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Space style={{ marginTop: 12 }}>
                        <Button type="primary" loading={saving} onClick={handleSave}>
                            Save
                        </Button>
                        <Button onClick={() => setEditMode(false)}>
                            Cancel
                        </Button>
                    </Space>
                </div>
            ) : (
                /* ── View Mode ── */
                <div>
                    <Card
                        size="small"
                        style={{ background: '#fafafa', maxHeight: 200, overflow: 'auto', marginBottom: 12 }}
                    >
                        <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {currentData?.content
                                ? currentData.content.slice(0, 500) + (currentData.content.length > 500 ? '...' : '')
                                : 'Auto-generated from your business information.'}
                        </Text>
                    </Card>

                    <Space size={4} style={{ marginBottom: 8 }}>
                        <Tag color={currentData?.source === 'custom' ? 'orange' : 'green'}>
                            {currentData?.source === 'custom' ? 'Custom + MenuList baseline' : 'MenuList baseline only'}
                        </Tag>
                    </Space>

                    <div>
                        <Space>
                            <Button size="small" onClick={handleStartEdit}>
                                Use my own content
                            </Button>
                            {currentData?.source === 'custom' && (
                                <Button
                                    size="small"
                                    icon={<LuRotateCcw />}
                                    loading={resetting}
                                    onClick={handleReset}
                                >
                                    Reset to default
                                </Button>
                            )}
                            {pageUrl && (
                                <Button
                                    size="small"
                                    icon={<LuExternalLink />}
                                    onClick={() => window.open(pageUrl, '_blank')}
                                >
                                    View page
                                </Button>
                            )}
                        </Space>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(CustomDomainTab);
