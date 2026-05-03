import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource, type AnalyticsEntrySource } from '@lib/analytics/sourceAttribution';
import { Button, Card, Flex, message, theme, Tooltip, Typography } from 'antd';
import React from 'react';
import { FaFacebook, FaInstagram, FaLine, FaLinkedin, FaTelegram, FaVk, FaWeixin, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { LuClipboard, LuShare2 } from 'react-icons/lu';

const { Text } = Typography;

interface SocialShareViewProps {
    shareUrl: string;
}

interface SocialPlatform {
    name: string;
    icon: React.ReactNode;
    color: string;
    shareUrl: (url: string) => string;
}

function withEntrySource(url: string, entrySource: string): string {
    const normalizedSource = entrySource.toLowerCase();
    const supportedSources = new Set(['whatsapp', 'facebook', 'instagram', 'google']);
    return withAnalyticsSource(url, supportedSources.has(normalizedSource) ? normalizedSource as AnalyticsEntrySource : 'other');
}

function SocialShareView({ shareUrl }: SocialShareViewProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    // Define social media platforms with their sharing URLs
    const socialPlatforms: SocialPlatform[] = [
        // Global platforms (most commonly used)
        {
            name: 'WhatsApp',
            icon: <FaWhatsapp />,
            color: '#25D366',
            shareUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
        },
        {
            name: 'Facebook',
            icon: <FaFacebook />,
            color: '#3b5998',
            shareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        },
        {
            name: 'Instagram',
            icon: <FaInstagram />,
            color: '#E1306C',
            shareUrl: (url) => url, // Instagram doesn't have direct sharing URL, will just copy
        },
        {
            name: 'LinkedIn',
            icon: <FaLinkedin />,
            color: '#0077B5',
            shareUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        },
        {
            name: 'Twitter',
            icon: <FaXTwitter />,
            color: '#000000',
            shareUrl: (url) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
        },
        // International platforms
        {
            name: 'WeChat',
            icon: <FaWeixin />,
            color: '#07C160',
            shareUrl: (url) => url, // WeChat requires a QR code, so we'll just copy
        },
        {
            name: 'LINE',
            icon: <FaLine />,
            color: '#00C300',
            shareUrl: (url) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
        },
        {
            name: 'Telegram',
            icon: <FaTelegram />,
            color: '#0088cc',
            shareUrl: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
        },
        {
            name: 'VK',
            icon: <FaVk />,
            color: '#4C75A3',
            shareUrl: (url) => `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
        },
    ];

    const handleCopyPlatformLink = async (platform: string) => {
        try {
            const urlWithUTM = withEntrySource(shareUrl, platform);
            await navigator.clipboard.writeText(urlWithUTM);
            message.success(`Link with ${platform} tracking copied!`);
        } catch (err) {
            message.error('Failed to copy link');
        }
    };

    const handleShareOnPlatform = (platform: SocialPlatform) => {
        const urlWithUTM = withEntrySource(shareUrl, platform.name);
        window.open(platform.shareUrl(urlWithUTM), '_blank');
    };

    return (
        <Flex vertical gap={24} style={{ padding: '8px 0' }}>
            <Text strong style={{ marginBottom: '0' }}>
                Share your {labels.offeringLower} directly on social media platforms:
            </Text>

            <div style={{
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                msOverflowStyle: 'none',
                paddingBottom: '12px'
            }}>
                <Flex gap={16} style={{
                    padding: '4px 0',
                    minWidth: 'max-content',
                    paddingLeft: '8px',
                    paddingRight: '8px'
                }}>
                    {socialPlatforms.map((platform) => (
                        <Card
                            key={platform.name}
                            onClick={(e) => {
                                handleShareOnPlatform(platform);
                                e.stopPropagation();
                            }}
                            hoverable
                            styles={{
                                body: {
                                    padding: '20px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }
                            }}
                            style={{
                                width: '170px',
                                borderRadius: '16px',
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                boxShadow: token.boxShadowTertiary,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div style={{
                                fontSize: '40px',
                                color: platform.color,
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'center',
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                            }}>
                                {platform.icon}
                            </div>

                            <Text strong style={{ fontSize: '16px', marginBottom: '16px' }}>
                                {platform.name}
                            </Text>

                            <Flex vertical gap={8} style={{ width: '100%' }}>
                                <Tooltip title={`Copy link with ${platform.name} tracking`}>
                                    <Button
                                        icon={<LuClipboard />}
                                        onClick={(e) => {
                                            handleCopyPlatformLink(platform.name);
                                            e.stopPropagation();
                                        }}
                                        style={{
                                            borderRadius: '8px',
                                            width: '100%',
                                            background: token.colorBgContainer,
                                            borderColor: token.colorBorderSecondary
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </Tooltip>

                                <Tooltip title={`Share on ${platform.name}`}>
                                    <Button
                                        type="primary"
                                        icon={<LuShare2 />}
                                        onClick={(e) => {
                                            handleShareOnPlatform(platform);
                                            e.stopPropagation();
                                        }}
                                        style={{
                                            borderRadius: '8px',
                                            width: '100%',
                                            background: platform.color,
                                            borderColor: platform.color,
                                            fontWeight: 500
                                        }}
                                    >
                                        Share
                                    </Button>
                                </Tooltip>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            </div>

            <Text type="secondary" style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
                Track which platforms drive the most traffic with platform-specific links
            </Text>
        </Flex>
    );
}

export default SocialShareView;
