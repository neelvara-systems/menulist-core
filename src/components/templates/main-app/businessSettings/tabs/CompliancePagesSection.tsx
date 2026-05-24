'use client';

import { Alert, Button, Card, Input, Space, Tag, Typography, notification, theme } from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { LuExternalLink, LuFileText, LuLoader, LuRotateCcw } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

type ComplianceTab = 'privacy' | 'terms' | 'refund';
type CompliancePageData = { content: string; customContent?: string; source: string; systemContent?: string } | null;

export default function CompliancePagesSection({ domain }: { domain?: string }) {
    const [activeTab, setActiveTab] = useState<ComplianceTab>('privacy');
    const [privacyData, setPrivacyData] = useState<CompliancePageData>(null);
    const [termsData, setTermsData] = useState<CompliancePageData>(null);
    const [refundData, setRefundData] = useState<CompliancePageData>(null);
    const [customText, setCustomText] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { token } = theme.useToken();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/compliance');
                if (res.data?.privacy) setPrivacyData(res.data.privacy);
                if (res.data?.terms) setTermsData(res.data.terms);
                if (res.data?.refund) setRefundData(res.data.refund);
            } catch {
                // Public pages still fall back to system-generated content.
            } finally {
                setLoadingData(false);
            }
        };
        void fetchData();
    }, []);

    const dataMap: Record<ComplianceTab, typeof privacyData> = { privacy: privacyData, terms: termsData, refund: refundData };
    const labelMap: Record<ComplianceTab, string> = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', refund: 'Refund & Cancellation Policy' };
    const currentData = dataMap[activeTab];
    const pageLabel = labelMap[activeTab];
    const pageUrl = domain ? `https://${domain}/${activeTab}` : `/${activeTab}`;

    const handleStartEdit = () => {
        setCustomText(currentData?.customContent || '');
        setEditMode(true);
    };

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

    const handleReset = async () => {
        setResetting(true);
        try {
            await axios.post('/api/compliance', {
                type: activeTab,
                action: 'reset',
            });
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
                Manage the privacy, terms, and refund pages linked from your official business page.
            </Paragraph>

            <Space style={{ marginBottom: 12 }} wrap>
                {(['privacy', 'terms', 'refund'] as ComplianceTab[]).map((tab) => (
                    <Button
                        key={tab}
                        size="small"
                        type={activeTab === tab ? 'primary' : 'default'}
                        onClick={() => { setActiveTab(tab); setEditMode(false); }}
                    >
                        {labelMap[tab]}
                    </Button>
                ))}
            </Space>

            {loadingData ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <LuLoader style={{ animation: 'spin 1s linear infinite' }} />
                    <Text type="secondary" style={{ marginLeft: 8 }}>Loading...</Text>
                </div>
            ) : editMode ? (
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
                        rows={10}
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
                <div>
                    <Card
                        size="small"
                        style={{ background: token.colorFillSecondary, maxHeight: 160, overflow: 'auto', marginBottom: 12 }}
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
                        <Space wrap>
                            <Button size="small" onClick={handleStartEdit}>
                                Use my own content
                            </Button>
                            {currentData?.source === 'custom' ? (
                                <Button
                                    size="small"
                                    icon={<LuRotateCcw />}
                                    loading={resetting}
                                    onClick={handleReset}
                                >
                                    Reset to default
                                </Button>
                            ) : null}
                            <Button
                                size="small"
                                icon={<LuExternalLink />}
                                onClick={() => window.open(pageUrl, '_blank')}
                            >
                                View page
                            </Button>
                        </Space>
                    </div>
                </div>
            )}
        </div>
    );
}
