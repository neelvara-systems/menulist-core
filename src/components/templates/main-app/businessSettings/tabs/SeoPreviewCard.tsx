'use client';

import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Flex, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuExternalLink, LuGlobe, LuMessageCircle } from 'react-icons/lu';

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

function clampText(lines: number) {
    return {
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: lines,
        display: '-webkit-box',
        overflow: 'hidden',
    };
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
    const visibleUrl = stripProtocol(previewUrl);
    const previewTitle = metaTitle?.trim() || `${normalizedName} | Menu`;
    const previewDescription = metaDescription?.trim() || tagline?.trim() || `View the menu for ${normalizedName}`;
    const keywordList = normalizeKeywords(keywords);
    const previewImageHeight = logoUrl ? 156 : 112;

    return (
        <div
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                padding: 16,
            }}
        >
            <Flex gap={16} vertical>
                <Flex gap={4} vertical>
                    <Text strong style={{ fontSize: 16 }}>{t('previewCardTitle')}</Text>
                    <Text type="secondary">{t('previewCardHelp')}</Text>
                </Flex>

                <div
                    style={{
                        background: '#efeae2',
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: 18,
                        overflow: 'hidden',
                        padding: 14,
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                background: '#25D366',
                                borderRadius: 999,
                                display: 'flex',
                                height: 28,
                                justifyContent: 'center',
                                width: 28,
                            }}
                        >
                            <LuMessageCircle color="#fff" size={16} />
                        </div>
                        <Text strong>{t('whatsAppPreview')}</Text>
                    </div>

                    <div
                        style={{
                            background: '#fff',
                            border: '1px solid rgba(17, 27, 33, 0.08)',
                            borderRadius: 16,
                            boxShadow: '0 1px 2px rgba(17, 27, 33, 0.08)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                background: logoUrl
                                    ? '#f8fafc'
                                    : 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%)',
                                display: 'flex',
                                height: previewImageHeight,
                                justifyContent: 'center',
                                overflow: 'hidden',
                                width: '100%',
                            }}
                        >
                            {logoUrl ? (
                                <img
                                    alt={normalizedName}
                                    src={logoUrl}
                                    style={{ height: '100%', objectFit: 'cover', width: '100%' }}
                                />
                            ) : (
                                <Flex align="center" gap={10} vertical>
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            background: '#fff',
                                            borderRadius: 999,
                                            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.12)',
                                            display: 'flex',
                                            height: 44,
                                            justifyContent: 'center',
                                            width: 44,
                                        }}
                                    >
                                        <LuGlobe color={token.colorPrimary} size={22} />
                                    </div>
                                    <Text type="secondary">{normalizedName}</Text>
                                </Flex>
                            )}
                        </div>

                        <Flex gap={6} style={{ padding: 14 }} vertical>
                            <Text
                                style={{
                                    color: '#667781',
                                    fontSize: 12,
                                    ...clampText(1),
                                }}
                            >
                                {visibleUrl}
                            </Text>
                            <Text strong style={{ fontSize: 15, lineHeight: 1.35, ...clampText(2) }}>{previewTitle}</Text>
                            <Text type="secondary" style={{ lineHeight: 1.45, ...clampText(3) }}>{previewDescription}</Text>
                            <Flex align="center" gap={6}>
                                <LuExternalLink color="#667781" size={14} />
                                <Text style={{ color: '#667781', fontSize: 12 }}>{t('previewTapHint')}</Text>
                            </Flex>
                        </Flex>
                    </div>
                </div>

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
                        <LuGlobe color={token.colorPrimary} size={16} />
                        <Text strong>{t('metaPreview')}</Text>
                    </Flex>

                    <Flex gap={10} style={{ padding: 14 }} vertical>
                        <ResolvedMetaItem
                            label="Open Graph / Twitter title"
                            tone="primary"
                            token={token}
                            value={previewTitle}
                        />
                        <ResolvedMetaItem
                            label="Open Graph / Twitter description"
                            tone="neutral"
                            token={token}
                            value={previewDescription}
                        />
                        <ResolvedMetaItem
                            label={t('canonicalUrl')}
                            mono
                            tone="neutral"
                            token={token}
                            value={previewUrl}
                        />
                        <div
                            style={{
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 14,
                                padding: 12,
                            }}
                        >
                            <Flex gap={8} vertical>
                                <MetaPill label={t('keywords')} token={token} tone="neutral" />
                                {keywordList.length ? (
                                    <Flex gap={8} wrap="wrap">
                                        {keywordList.map((keyword) => (
                                            <div
                                                key={keyword}
                                                style={{
                                                    background: token.colorBgLayout,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 999,
                                                    maxWidth: '100%',
                                                    padding: '5px 10px',
                                                }}
                                            >
                                                <Text style={{ ...clampText(1) }}>{keyword}</Text>
                                            </div>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text type="secondary">{t('notSet')}</Text>
                                )}
                            </Flex>
                        </div>
                    </Flex>
                </div>
            </Flex>
        </div>
    );
}

function MetaPill({
    label,
    token,
    tone,
}: {
    label: string;
    token: ReturnType<typeof theme.useToken>['token'];
    tone: 'primary' | 'neutral';
}) {
    const background = tone === 'primary' ? token.colorPrimaryBg : token.colorFillSecondary;
    const color = tone === 'primary' ? token.colorPrimary : token.colorTextSecondary;

    return (
        <div
            style={{
                alignItems: 'center',
                background,
                borderRadius: 999,
                color,
                display: 'inline-flex',
                fontSize: 12,
                fontWeight: 600,
                maxWidth: 'fit-content',
                padding: '4px 10px',
            }}
        >
            {label}
        </div>
    );
}

function ResolvedMetaItem({
    label,
    mono = false,
    token,
    tone,
    value,
}: {
    label: string;
    mono?: boolean;
    token: ReturnType<typeof theme.useToken>['token'];
    tone: 'primary' | 'neutral';
    value: string;
}) {
    return (
        <div
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 14,
                padding: 12,
            }}
        >
            <Flex gap={8} vertical>
                <MetaPill label={label} token={token} tone={tone} />
                <Text
                    style={{
                        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace' : undefined,
                        fontSize: mono ? 13 : 15,
                        fontWeight: mono ? 500 : 600,
                        lineBreak: 'anywhere',
                        lineHeight: 1.45,
                        ...clampText(mono ? 2 : 3),
                    }}
                >
                    {value}
                </Text>
            </Flex>
        </div>
    );
}
