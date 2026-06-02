'use client';

/**
 * GoogleListingGuide — Pre-API bridge for GBP link control
 *
 * Guides owners to manually set their OBP URL as the "Website" field
 * on their Google Business Profile. This is the interim solution before
 * GBP API access is approved and ENABLE_GBP_SYNC becomes true.
 *
 * When GBP auto-sync is enabled, this component hides itself.
 *
 * @see __docs__/gbp-sync/gbp-sync_spec.md — Full GBP sync spec
 * @see __docs__/official-business-page/ — OBP infrastructure
 */

import { FEATURE_FLAGS } from '@config/features';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Alert, Button, Card, Divider, Flex, Steps, Typography, message, theme } from 'antd';
import { useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuStore } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface GoogleListingGuideProps {
    subdomain?: string;
    customDomain?: string;
    googleLinkUpdated?: boolean;
    onMarkDone: () => void;
    onDismiss: () => void;
}

export default function GoogleListingGuide({
    subdomain,
    customDomain,
    googleLinkUpdated,
    onMarkDone,
    onDismiss,
}: GoogleListingGuideProps) {
    const [copied, setCopied] = useState(false);
    const { token } = theme.useToken();

    // Hide if GBP auto-sync is enabled (this guide becomes unnecessary)
    if (FEATURE_FLAGS.ENABLE_GBP_SYNC) return null;

    // Hide if OBP is not enabled
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const obpUrl = generateOBPUrl(subdomain, customDomain);
    if (!obpUrl) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(obpUrl);
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error('Could not copy link');
        }
    };

    const handleOpenGoogle = () => {
        window.open('https://business.google.com/', '_blank', 'noopener,noreferrer');
    };

    // Already confirmed — show compact success state
    if (googleLinkUpdated) {
        return (
            <Card size="small">
                <Flex align="center" gap={12}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: token.colorSuccessBg,
                            flexShrink: 0,
                        }}
                    >
                        <LuCheck size={18} style={{ color: token.colorSuccess }} />
                    </Flex>
                    <Flex vertical style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13 }}>Google listing updated</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Your Google Business Profile website points to your official page.
                        </Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="small">
            <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
                <LuStore size={18} style={{ color: token.colorPrimary }} />
                <Title level={5} style={{ margin: 0 }}>
                    Make this your official link on Google
                </Title>
            </Flex>

            <Paragraph type="secondary" style={{ fontSize: 13, margin: '0 0 16px' }}>
                So customers always see the correct menu and information when they find you on Google.
            </Paragraph>

            {/* OBP URL with copy */}
            <Flex
                align="center"
                gap={8}
                style={{
                    padding: '8px 12px',
                    background: token.colorFillSecondary,
                    borderRadius: 8,
                    border: `1px solid ${token.colorBorder}`,
                    marginBottom: 16,
                }}
            >
                <LuGlobe size={14} style={{ color: token.colorPrimary, flexShrink: 0 }} />
                <Text
                    style={{
                        flex: 1,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {obpUrl}
                </Text>
                <Button
                    size="small"
                    icon={copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                    type={copied ? 'primary' : 'default'}
                    onClick={handleCopy}
                >
                    {copied ? 'Copied' : 'Copy link'}
                </Button>
            </Flex>

            {/* Simple steps */}
            <Steps
                direction="vertical"
                size="small"
                current={-1}
                style={{ marginBottom: 16 }}
                items={[
                    {
                        title: <Text style={{ fontSize: 13 }}>Open your Google Business Profile</Text>,
                        description: <Text type="secondary" style={{ fontSize: 12 }}>Go to business.google.com and select your business</Text>,
                    },
                    {
                        title: <Text style={{ fontSize: 13 }}>Edit your profile &rarr; Website</Text>,
                        description: <Text type="secondary" style={{ fontSize: 12 }}>Find the &quot;Website&quot; field in your business information</Text>,
                    },
                    {
                        title: <Text style={{ fontSize: 13 }}>Paste your official link</Text>,
                        description: <Text type="secondary" style={{ fontSize: 12 }}>Replace the current website with the link above</Text>,
                    },
                ]}
            />

            <Alert
                type="info"
                showIcon={false}
                message={
                    <Text style={{ fontSize: 12 }}>
                        Takes less than 30 seconds. Customers clicking &quot;Website&quot; on Google will see your always-updated menu and info.
                    </Text>
                }
                style={{ marginBottom: 16, borderRadius: 8 }}
            />

            {/* Actions */}
            <Flex gap={8} wrap="wrap">
                <Button
                    type="primary"
                    icon={<LuExternalLink size={14} />}
                    onClick={handleOpenGoogle}
                >
                    Open Google Business Profile
                </Button>
                <Button onClick={onMarkDone}>
                    Done updating
                </Button>
                <Button type="text" size="small" onClick={onDismiss}>
                    Remind me later
                </Button>
            </Flex>
        </Card>
    );
}
