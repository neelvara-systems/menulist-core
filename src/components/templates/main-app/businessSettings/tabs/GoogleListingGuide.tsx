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
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { Alert, Button, Card, Divider, Flex, Steps, Typography, message, theme } from 'antd';
import { useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuGlobe, LuStore } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

const GOOGLE_LISTING_GUIDE_COPY_UNAVAILABLE = 'google_listing_guide_copy_unavailable';
const GOOGLE_LISTING_GUIDE_COPY_FALLBACK_FAILED = 'google_listing_guide_copy_fallback_failed';

const hasGoogleListingGuideClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasGoogleListingGuideCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyGoogleListingGuideLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasGoogleListingGuideClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasGoogleListingGuideCopyFallback()) {
        throw clipboardWriteError || new Error(GOOGLE_LISTING_GUIDE_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(GOOGLE_LISTING_GUIDE_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface GoogleListingGuideProps {
    businessName?: string;
    subdomain?: string;
    customDomain?: string;
    descriptor?: string;
    googleLinkUpdated?: boolean;
    knownFor?: string;
    onMarkDone: () => void;
    onDismiss: () => void;
}

export default function GoogleListingGuide({
    businessName,
    subdomain,
    customDomain,
    descriptor,
    googleLinkUpdated,
    knownFor,
    onMarkDone,
    onDismiss,
}: GoogleListingGuideProps) {
    const [copied, setCopied] = useState(false);
    const [profileKitCopied, setProfileKitCopied] = useState(false);
    const { token } = theme.useToken();

    // Hide if GBP auto-sync is enabled (this guide becomes unnecessary)
    if (FEATURE_FLAGS.ENABLE_GBP_SYNC) return null;

    // Hide if OBP is not enabled
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const obpUrl = generateOBPUrl(subdomain, customDomain);
    if (!obpUrl) return null;
    const menuUrl = `${obpUrl.replace(/\/$/, '')}/menu`;
    const profileKitRows = [
        businessName?.trim() ? { label: 'Business name', value: businessName.trim() } : null,
        descriptor?.trim() ? { label: 'Short description', value: descriptor.trim() } : null,
        knownFor?.trim() ? { label: 'Known for', value: knownFor.trim() } : null,
        { label: 'Website field', value: obpUrl },
        { label: 'Menu link', value: menuUrl },
    ].filter(Boolean) as Array<{ label: string; value: string }>;
    const profileKitText = [
        ...profileKitRows.map((row) => `${row.label}: ${row.value}`),
        'Use only the fields Google Business Profile asks for.',
    ].join('\n');
    const buildGoogleListingGuideLogContext = (
        action: string,
        metadata: Record<string, boolean | number | string | undefined> = {},
    ) => ({
        surface: 'google_listing_guide',
        action,
        ...getBoundedStoreStringContext('subdomain', subdomain),
        ...getBoundedStoreStringContext('customDomain', customDomain),
        ...getBoundedStoreStringContext('obpUrl', obpUrl),
        ...metadata,
    });

    const handleCopy = async () => {
        try {
            await copyGoogleListingGuideLink(obpUrl);
            setCopied(true);
            message.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure('google_listing_guide_link_copy_failed', error, buildGoogleListingGuideLogContext('copy_obp_link', {
                hasClipboardWrite: hasGoogleListingGuideClipboardWrite(),
                hasCopyFallback: hasGoogleListingGuideCopyFallback(),
            }));
            message.error('Could not copy link');
        }
    };

    const handleCopyProfileKit = async () => {
        try {
            await copyGoogleListingGuideLink(profileKitText);
            setProfileKitCopied(true);
            message.success('Google profile kit copied');
            setTimeout(() => setProfileKitCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure('google_listing_guide_profile_kit_copy_failed', error, buildGoogleListingGuideLogContext('copy_profile_kit', {
                hasBusinessName: Boolean(businessName?.trim()),
                hasClipboardWrite: hasGoogleListingGuideClipboardWrite(),
                hasCopyFallback: hasGoogleListingGuideCopyFallback(),
                hasDescriptor: Boolean(descriptor?.trim()),
                hasKnownFor: Boolean(knownFor?.trim()),
                kitLineCount: profileKitRows.length,
            }));
            message.error('Could not copy profile kit');
        }
    };

    const handleOpenGoogle = () => {
        try {
            const opened = window.open('https://business.google.com/', '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('google_listing_guide_open_blocked');
            }
        } catch (error) {
            logStoreDataFailure('google_listing_guide_open_failed', error, buildGoogleListingGuideLogContext('open_google_profile', {
                target: 'google_business_profile',
            }));
            message.error('Could not open Google Business Profile');
        }
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

            <Divider style={{ margin: '0 0 16px' }} />

            <Flex
                vertical
                gap={10}
                style={{
                    padding: 12,
                    background: token.colorFillTertiary,
                    borderRadius: 8,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 16,
                }}
            >
                <Flex align="center" justify="space-between" gap={12} wrap="wrap">
                    <Flex vertical style={{ minWidth: 180 }}>
                        <Text strong style={{ fontSize: 13 }}>Google profile handoff kit</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Use these fields in Google Business Profile where they are available.
                        </Text>
                    </Flex>
                    <Button
                        size="small"
                        icon={profileKitCopied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                        type={profileKitCopied ? 'primary' : 'default'}
                        onClick={handleCopyProfileKit}
                    >
                        {profileKitCopied ? 'Copied' : 'Copy kit'}
                    </Button>
                </Flex>

                <Flex vertical gap={6}>
                    {profileKitRows.map((row) => (
                        <Flex key={row.label} gap={8} align="flex-start">
                            <Text type="secondary" style={{ width: 108, flexShrink: 0, fontSize: 12 }}>
                                {row.label}
                            </Text>
                            <Text style={{ fontSize: 12, wordBreak: 'break-word' }}>
                                {row.value}
                            </Text>
                        </Flex>
                    ))}
                </Flex>
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
                        Takes less than 30 seconds. Customers clicking &quot;Website&quot; on Google will see your latest published menu and info.
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
