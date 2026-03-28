'use client';
import { getMenuUrl } from '@constant/urls';
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Space, Tag, Typography } from 'antd';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { memo, useCallback, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuX } from 'react-icons/lu';

const { Text, Title } = Typography;

interface SubdomainTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    currentSubdomain?: string;
    isMaster?: boolean;
}

function SubdomainTab({ scrollRef, currentSubdomain, isMaster }: SubdomainTabProps) {
    const t = useTranslations('BusinessSettings');
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{
        available?: boolean;
        reason?: string;
        normalized?: string;
        preview?: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    const checkAvailability = useCallback(async (value: string) => {
        if (!value || value.length < 3) {
            setAvailability(null);
            return;
        }

        setChecking(true);
        try {
            const res = await axios.get(`/api/subdomain/check?subdomain=${encodeURIComponent(value)}`);
            setAvailability(res.data);
        } catch {
            setAvailability({ available: false, reason: 'Could not check availability' });
        } finally {
            setChecking(false);
        }
    }, []);

    // Debounce check
    useEffect(() => {
        if (!availability) return;
        // Reset on mount
    }, []);

    const fullUrl = currentSubdomain ? getMenuUrl(currentSubdomain) : null;

    const handleCopy = () => {
        if (fullUrl) {
            navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Only master stores can set subdomains
    if (isMaster === false) {
        return (
            <Card size="small" ref={scrollRef}>
                <Title level={5} style={{ margin: 'unset' }}>{t('subdomain')}</Title>
                <Divider />
                <Alert
                    type="info"
                    showIcon
                    message={t('outletSubdomainInfo')}
                    description={t('outletSubdomainDesc')}
                />
            </Card>
        );
    }

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>{t('subdomain')}</Title>
            <Divider />

            {/* Current subdomain display */}
            {currentSubdomain && (
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        {t('yourCurrentLink')}
                    </Text>
                    <Space>
                        <Tag
                            icon={<LuGlobe />}
                            color="blue"
                            style={{ fontSize: 14, padding: '4px 12px' }}
                        >
                            {currentSubdomain}.menulist.ai
                        </Tag>
                        <Button
                            size="small"
                            type="text"
                            icon={copied ? <LuCheck /> : <LuCopy />}
                            onClick={handleCopy}
                        >
                            {copied ? t('copied') : t('copy')}
                        </Button>
                        <Button
                            size="small"
                            type="text"
                            icon={<LuExternalLink />}
                            onClick={() => window.open(fullUrl!, '_blank')}
                        >
                            {t('open')}
                        </Button>
                    </Space>
                </div>
            )}

            <Row gutter={[16, 0]}>
                <Col xs={24} md={16}>
                    <Form.Item
                        name="subdomain"
                        label={t('subdomainLabel')}
                        extra={
                            <Text type="secondary">
                                {t('subdomainHelp')}
                            </Text>
                        }
                        rules={[
                            { min: 3, message: t('minChars') },
                            { max: 63, message: t('maxChars') },
                            {
                                pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
                                message: t('subdomainPattern'),
                            },
                        ]}
                        validateStatus={
                            availability?.available === true ? 'success' :
                                availability?.available === false ? 'error' : undefined
                        }
                        help={
                            availability?.available === true ? (
                                <Text type="success">
                                    <LuCheck style={{ marginRight: 4 }} />
                                    {availability.preview} is available
                                </Text>
                            ) :
                                availability?.available === false ? (
                                    <Text type="danger">
                                        <LuX style={{ marginRight: 4 }} />
                                        {availability.reason}
                                    </Text>
                                ) : undefined
                        }
                    >
                        <Input
                            addonBefore="https://"
                            addonAfter=".menulist.ai"
                            placeholder="your-business"
                            onBlur={(e) => checkAvailability(e.target.value)}
                            style={{ maxWidth: 500 }}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'center', paddingTop: 30 }}>
                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.subdomain !== curr.subdomain}>
                        {({ getFieldValue }) => (
                            <Button
                                loading={checking}
                                onClick={() => checkAvailability(getFieldValue('subdomain'))}
                                disabled={!getFieldValue('subdomain') || getFieldValue('subdomain')?.length < 3}
                            >
                                {t('checkAvailability')}
                            </Button>
                        )}
                    </Form.Item>
                </Col>
            </Row>

            {!currentSubdomain && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                    message={t('noSubdomainSet')}
                    description={t('noSubdomainDesc')}
                />
            )}
        </Card>
    );
}

export default memo(SubdomainTab);
