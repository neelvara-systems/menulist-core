'use client';

import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Card, Flex, Tag, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuGlobe, LuMessageCircle } from 'react-icons/lu';

const { Text } = Typography;

interface SeoPreviewCardProps {
    businessName?: string;
    canonicalUrl?: string;
    customDomain?: string;
    keywords?: string[] | string;
    logoUrl?: string;
    metaDescription?: string;
    metaTitle?: string;
    subdomain?: string;
    tagline?: string;
}

function normalizeKeywords(keywords?: string[] | string) {
    if (Array.isArray(keywords)) return keywords.map((item) => item.trim()).filter(Boolean);
    return String(keywords || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function stripProtocol(url: string) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default function SeoPreviewCard({
    businessName,
    canonicalUrl,
    customDomain,
    keywords,
    logoUrl,
    metaDescription,
    metaTitle,
    subdomain,
    tagline,
}: SeoPreviewCardProps) {
    const t = useTranslations('SEO');
    const { token } = theme.useToken();
    const normalizedName = businessName?.trim() || 'Your business';
    const fallbackUrl = generateOBPUrl(subdomain, customDomain);
    const previewUrl = canonicalUrl?.trim() || fallbackUrl || 'https://your-public-link.com';
    const previewTitle = metaTitle?.trim() || `${normalizedName} | Menu`;
    const previewDescription = metaDescription?.trim() || tagline?.trim() || `View the menu for ${normalizedName}`;
    const keywordList = normalizeKeywords(keywords);

    return (
        <Card
            size="small"
            title={t('previewCardTitle')}
            styles={{ body: { paddingTop: 12 } }}
        >
            <Flex gap={16} vertical>
                <Text type="secondary">{t('previewCardHelp')}</Text>

                <div
                    style={{
                        background: token.colorBgLayout,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        overflow: 'hidden',
                    }}
                >
                    <Flex
                        align="center"
                        gap={8}
                        style={{
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            padding: '10px 14px',
                        }}
                    >
                        <LuMessageCircle color="#25D366" size={16} />
                        <Text strong>{t('whatsAppPreview')}</Text>
                    </Flex>

                    <Flex gap={12} style={{ padding: 14 }}>
                        <div
                            style={{
                                alignItems: 'center',
                                background: logoUrl ? token.colorBgContainer : token.colorPrimaryBg,
                                borderRadius: 14,
                                display: 'flex',
                                flexShrink: 0,
                                height: 68,
                                justifyContent: 'center',
                                overflow: 'hidden',
                                width: 68,
                            }}
                        >
                            {logoUrl ? (
                                <img
                                    alt={normalizedName}
                                    src={logoUrl}
                                    style={{ height: '100%', objectFit: 'cover', width: '100%' }}
                                />
                            ) : (
                                <LuGlobe color={token.colorPrimary} size={24} />
                            )}
                        </div>

                        <Flex gap={4} style={{ minWidth: 0, width: '100%' }} vertical>
                            <Text
                                strong
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {stripProtocol(previewUrl)}
                            </Text>
                            <Text strong style={{ fontSize: 15 }}>{previewTitle}</Text>
                            <Text type="secondary">{previewDescription}</Text>
                        </Flex>
                    </Flex>
                </div>

                <div
                    style={{
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        overflow: 'hidden',
                    }}
                >
                    <Flex
                        align="center"
                        gap={8}
                        style={{
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            padding: '10px 14px',
                        }}
                    >
                        <LuGlobe color={token.colorPrimary} size={16} />
                        <Text strong>{t('metaPreview')}</Text>
                    </Flex>

                    <Flex gap={12} style={{ padding: 14 }} vertical>
                        <PreviewRow label="og:title / twitter:title" value={previewTitle} />
                        <PreviewRow label="og:description / twitter:description" value={previewDescription} />
                        <PreviewRow
                            label={t('canonicalUrl')}
                            value={previewUrl}
                        />
                        <Flex gap={8} vertical>
                            <Text strong>{t('keywords')}</Text>
                            {keywordList.length ? (
                                <Flex gap={8} wrap="wrap">
                                    {keywordList.map((keyword) => (
                                        <Tag key={keyword}>{keyword}</Tag>
                                    ))}
                                </Flex>
                            ) : (
                                <Text type="secondary">{t('notSet')}</Text>
                            )}
                        </Flex>
                    </Flex>
                </div>
            </Flex>
        </Card>
    );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
    return (
        <Flex gap={4} vertical>
            <Text strong>{label}</Text>
            <Text copyable={{ text: value }}>{value}</Text>
        </Flex>
    );
}
