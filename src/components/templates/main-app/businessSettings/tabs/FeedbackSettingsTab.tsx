import { Alert, Card, Divider, Flex, Form, Input, Switch, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuCheckCircle, LuExternalLink, LuInfo } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

/**
 * Validates a Google Review URL format.
 * Accepted formats:
 * - https://search.google.com/local/writereview?placeid=...
 * - https://g.page/r/.../review
 * - https://www.google.com/maps/place/...
 * - https://maps.google.com/...
 * - https://maps.app.goo.gl/...
 */
function validateGoogleReviewUrl(url: string): { valid: boolean; type?: string } {
    if (!url.trim()) return { valid: true }; // Empty is OK (optional field)
    try {
        const parsed = new URL(url.trim());
        const host = parsed.hostname.toLowerCase();
        if (host.includes('google.com') && parsed.pathname.includes('/local/writereview')) {
            return { valid: true, type: 'review_direct' };
        }
        if (host === 'g.page' && url.includes('/review')) {
            return { valid: true, type: 'g_page' };
        }
        if (host.includes('google.com') && parsed.pathname.includes('/maps/place')) {
            return { valid: true, type: 'maps_place' };
        }
        if (host.includes('google.com') && parsed.pathname.includes('/maps')) {
            return { valid: true, type: 'maps_generic' };
        }
        if (host === 'maps.app.goo.gl') {
            return { valid: true, type: 'maps_short' };
        }
        // Allow any Google-related URL as fallback
        if (host.includes('google') || host.includes('goo.gl')) {
            return { valid: true, type: 'google_other' };
        }
        return { valid: false };
    } catch {
        return { valid: false };
    }
}

interface FeedbackSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    feedbackEnabled?: boolean;
    setFeedbackEnabled: (enabled: boolean) => void;
    feedbackDefaults?: {
        collectName: boolean;
        collectPhone: boolean;
        collectEmail: boolean;
    };
    setFeedbackDefaults: (defaults: {
        collectName: boolean;
        collectPhone: boolean;
        collectEmail: boolean;
    }) => void;
    reviewUrl?: string;
    setReviewUrl: (url: string) => void;
}

const FeedbackSettingsTab: React.FC<FeedbackSettingsTabProps> = ({
    scrollRef,
    feedbackEnabled = true,
    setFeedbackEnabled,
    feedbackDefaults = { collectName: false, collectPhone: true, collectEmail: true },
    setFeedbackDefaults,
    reviewUrl = '',
    setReviewUrl,
}) => {
    const t = useTranslations('FeedbackSettings');

    const urlValidation = useMemo(() => validateGoogleReviewUrl(reviewUrl), [reviewUrl]);
    const showUrlError = reviewUrl.trim().length > 0 && !urlValidation.valid;
    const showUrlSuccess = reviewUrl.trim().length > 0 && urlValidation.valid;

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>{t('title')}</Title>
            <Divider />

            {/* Master Toggle */}
            <Flex vertical gap={16}>
                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text strong>{t('enableFeedback')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('enableFeedbackDesc')}
                        </Text>
                    </Flex>
                    <Switch
                        checked={feedbackEnabled}
                        onChange={setFeedbackEnabled}
                    />
                </Flex>

                <Divider style={{ margin: '8px 0' }} />

                {/* Contact Fields Section */}
                <Flex vertical gap={8}>
                    <Text strong>{t('contactFields')}</Text>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                        {t('contactFieldsDesc')}
                    </Paragraph>
                </Flex>

                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text>{t('collectName')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('collectNameDesc')}
                        </Text>
                    </Flex>
                    <Switch
                        checked={feedbackDefaults.collectName}
                        onChange={(checked) => setFeedbackDefaults({
                            ...feedbackDefaults,
                            collectName: checked,
                        })}
                        disabled={!feedbackEnabled}
                    />
                </Flex>

                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text>{t('collectPhone')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('collectPhoneDesc')}
                        </Text>
                    </Flex>
                    <Switch
                        checked={feedbackDefaults.collectPhone}
                        onChange={(checked) => setFeedbackDefaults({
                            ...feedbackDefaults,
                            collectPhone: checked,
                        })}
                        disabled={!feedbackEnabled}
                    />
                </Flex>

                <Flex justify="space-between" align="center">
                    <Flex vertical>
                        <Text>{t('collectEmail')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('collectEmailDesc')}
                        </Text>
                    </Flex>
                    <Switch
                        checked={feedbackDefaults.collectEmail}
                        onChange={(checked) => setFeedbackDefaults({
                            ...feedbackDefaults,
                            collectEmail: checked,
                        })}
                        disabled={!feedbackEnabled}
                    />
                </Flex>

                <Divider style={{ margin: '8px 0' }} />

                {/* Google Review URL */}
                <Flex vertical gap={8}>
                    <Text strong>{t('googleReviewUrl')}</Text>
                    <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                        {t('googleReviewUrlDesc')}
                    </Paragraph>
                    <Form.Item
                        style={{ margin: 0 }}
                        validateStatus={showUrlError ? 'error' : showUrlSuccess ? 'success' : undefined}
                        help={showUrlError ? 'Please enter a valid Google review or Maps URL' : undefined}
                    >
                        <Input
                            placeholder={t('googleReviewUrlPlaceholder')}
                            value={reviewUrl}
                            onChange={(e) => setReviewUrl(e.target.value)}
                            disabled={!feedbackEnabled}
                            prefix={showUrlSuccess ? <LuCheckCircle style={{ color: '#52c41a' }} /> : undefined}
                            suffix={
                                reviewUrl ? (
                                    <a
                                        href={reviewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit' }}
                                    >
                                        <LuExternalLink />
                                    </a>
                                ) : null
                            }
                        />
                    </Form.Item>

                    {/* Help: How to get Google Review link */}
                    {!reviewUrl && feedbackEnabled && (
                        <Alert
                            type="info"
                            showIcon
                            icon={<LuInfo size={14} />}
                            message="How to get your Google Review link"
                            description={
                                <ol style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 12 }}>
                                    <li>Search your business on Google Maps</li>
                                    <li>Click your business listing</li>
                                    <li>Copy the URL from the address bar</li>
                                    <li>Paste it here</li>
                                </ol>
                            }
                            style={{ borderRadius: 8 }}
                        />
                    )}

                    {/* Confirmation: What this enables */}
                    {showUrlSuccess && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Customers who give positive feedback will be redirected to leave a Google review.
                        </Text>
                    )}
                </Flex>
            </Flex>
        </Card>
    );
};

export default FeedbackSettingsTab;
