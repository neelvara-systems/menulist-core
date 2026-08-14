import { Alert, Card, Divider, Flex, Form, Input, Switch, theme, Typography } from 'antd';
import { normalizeGuestFeedbackReviewUrl } from '@lib/feedback/guestFeedbackSubmitResponse';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { LuCheckCircle, LuExternalLink, LuInfo } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

interface FeedbackSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    feedbackEnabled?: boolean;
    setFeedbackEnabled: (enabled: boolean) => void;
    feedbackDefaults?: {
        collectComment: boolean;
        collectCommentRequired: boolean;
        collectName: boolean;
        collectNameRequired: boolean;
        collectPhone: boolean;
        collectPhoneRequired: boolean;
        collectEmail: boolean;
        collectEmailRequired: boolean;
    };
    setFeedbackDefaults: (defaults: {
        collectComment: boolean;
        collectCommentRequired: boolean;
        collectName: boolean;
        collectNameRequired: boolean;
        collectPhone: boolean;
        collectPhoneRequired: boolean;
        collectEmail: boolean;
        collectEmailRequired: boolean;
    }) => void;
    reviewUrl?: string;
    setReviewUrl: (url: string) => void;
}

const FeedbackSettingsTab: React.FC<FeedbackSettingsTabProps> = ({
    scrollRef,
    feedbackEnabled = true,
    setFeedbackEnabled,
    feedbackDefaults = {
        collectComment: true,
        collectCommentRequired: false,
        collectName: false,
        collectNameRequired: false,
        collectPhone: true,
        collectPhoneRequired: false,
        collectEmail: true,
        collectEmailRequired: false,
    },
    setFeedbackDefaults,
    reviewUrl = '',
    setReviewUrl,
}) => {
    const t = useTranslations('FeedbackSettings');
    const { token } = theme.useToken();

    const normalizedReviewUrl = useMemo(
        () => normalizeGuestFeedbackReviewUrl(reviewUrl),
        [reviewUrl],
    );
    const showUrlError = reviewUrl.trim().length > 0 && !normalizedReviewUrl;
    const showUrlSuccess = reviewUrl.trim().length > 0 && Boolean(normalizedReviewUrl);
    const fieldCardStyle = {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 12,
        padding: 12,
    } as const;

    const renderContactField = ({
        checked,
        description,
        keyName,
        mandatoryChecked,
        mandatoryDescription,
        mandatoryLabel,
        label,
    }: {
        checked: boolean;
        description: string;
        keyName: 'collectComment' | 'collectName' | 'collectPhone' | 'collectEmail';
        mandatoryChecked: boolean;
        mandatoryDescription: string;
        mandatoryLabel: string;
        label: string;
    }) => (
        <Flex gap={12} style={fieldCardStyle} vertical>
            <Flex align="center" justify="space-between" gap={16}>
                <Flex style={{ minWidth: 0, flex: 1 }} vertical>
                    <Text strong>{label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {description}
                    </Text>
                </Flex>
                <Switch
                    aria-label={label}
                    checked={checked}
                    onChange={(nextChecked) => setFeedbackDefaults({
                        ...feedbackDefaults,
                        [keyName]: nextChecked,
                        [`${keyName}Required`]: nextChecked ? mandatoryChecked : false,
                    })}
                    disabled={!feedbackEnabled}
                />
            </Flex>
            {checked ? (
                <Flex align="center" justify="space-between" gap={16}>
                    <Flex style={{ minWidth: 0, flex: 1 }} vertical>
                        <Text>{mandatoryLabel}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {mandatoryDescription}
                        </Text>
                    </Flex>
                    <Switch
                        aria-label={mandatoryLabel}
                        checked={mandatoryChecked}
                        onChange={(nextChecked) => setFeedbackDefaults({
                            ...feedbackDefaults,
                            [`${keyName}Required`]: nextChecked,
                        })}
                        disabled={!feedbackEnabled}
                    />
                </Flex>
            ) : null}
        </Flex>
    );

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
                        aria-label={t('enableFeedback')}
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
                {renderContactField({
                    checked: feedbackDefaults.collectComment,
                    description: t('collectCommentDesc'),
                    keyName: 'collectComment',
                    mandatoryChecked: feedbackDefaults.collectCommentRequired,
                    mandatoryDescription: t('requireCommentDesc'),
                    mandatoryLabel: t('requireComment'),
                    label: t('collectComment'),
                })}
                {renderContactField({
                    checked: feedbackDefaults.collectName,
                    description: t('collectNameDesc'),
                    keyName: 'collectName',
                    mandatoryChecked: feedbackDefaults.collectNameRequired,
                    mandatoryDescription: t('requireNameDesc'),
                    mandatoryLabel: t('requireName'),
                    label: t('collectName'),
                })}
                {renderContactField({
                    checked: feedbackDefaults.collectPhone,
                    description: t('collectPhoneDesc'),
                    keyName: 'collectPhone',
                    mandatoryChecked: feedbackDefaults.collectPhoneRequired,
                    mandatoryDescription: t('requirePhoneDesc'),
                    mandatoryLabel: t('requirePhone'),
                    label: t('collectPhone'),
                })}
                {renderContactField({
                    checked: feedbackDefaults.collectEmail,
                    description: t('collectEmailDesc'),
                    keyName: 'collectEmail',
                    mandatoryChecked: feedbackDefaults.collectEmailRequired,
                    mandatoryDescription: t('requireEmailDesc'),
                    mandatoryLabel: t('requireEmail'),
                    label: t('collectEmail'),
                })}

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
                        help={showUrlError ? t('googleReviewUrlError') : undefined}
                    >
                        <Input
                            aria-label={t('googleReviewUrl')}
                            placeholder={t('googleReviewUrlPlaceholder')}
                            value={reviewUrl}
                            onChange={(e) => setReviewUrl(e.target.value)}
                            disabled={!feedbackEnabled}
                            prefix={showUrlSuccess ? <LuCheckCircle style={{ color: token.colorSuccess }} /> : undefined}
                            suffix={
                                normalizedReviewUrl ? (
                                    <a
                                        aria-label={t('googleReviewUrl')}
                                        href={normalizedReviewUrl}
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
                            message={t('googleReviewHowToTitle')}
                            description={
                                <ol style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 12 }}>
                                    <li>{t('googleReviewHowToStep1')}</li>
                                    <li>{t('googleReviewHowToStep2')}</li>
                                    <li>{t('googleReviewHowToStep3')}</li>
                                    <li>{t('googleReviewHowToStep4')}</li>
                                </ol>
                            }
                            style={{ borderRadius: 8 }}
                        />
                    )}

                    {/* Confirmation: What this enables */}
                    {showUrlSuccess && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {t('googleReviewConfirm')}
                        </Text>
                    )}
                </Flex>
            </Flex>
        </Card>
    );
};

export default FeedbackSettingsTab;
