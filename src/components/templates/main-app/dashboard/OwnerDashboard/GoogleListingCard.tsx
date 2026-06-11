'use client';

/**
 * GoogleListingCard — Dashboard status indicator for Google link
 *
 * Shows whether the owner has set their OBP URL as the Google Business
 * Profile "Website" field. Compact card with single action.
 *
 * Hidden when:
 * - OBP is not enabled
 * - GBP auto-sync is enabled (fully automated, no manual step needed)
 *
 * @see __docs__/gbp-sync/gbp-sync_spec.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { StoreDataType } from '@type/platform/store';
import { updateStore } from '@database/stores';
import { Button, Card, Flex, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuStore } from 'react-icons/lu';

const { Text } = Typography;
// Google Business Profile blue is a brand cue; surrounding card chrome uses Ant tokens.
const GOOGLE_BUSINESS_PROFILE_BLUE = '#4285F4';

interface GoogleListingCardProps {
    storeDetails: StoreDataType;
    onStoreUpdate?: (updates: Partial<StoreDataType>) => void;
}

export default function GoogleListingCard({ storeDetails, onStoreUpdate }: GoogleListingCardProps) {
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;
    if (FEATURE_FLAGS.ENABLE_GBP_SYNC) return null;

    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
    if (!obpUrl) return null;

    const isUpdated = storeDetails?.publicPresence?.googleLinkUpdated === true;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(obpUrl);
            setCopied(true);
            message.success(t('googleListing.linkCopied'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            message.error(t('googleListing.couldNotCopy'));
        }
    };

    const handleMarkDone = async () => {
        setSaving(true);
        try {
            const updates = {
                storeId: storeDetails.storeId,
                publicPresence: {
                    ...(storeDetails.publicPresence || {}),
                    googleLinkUpdated: true,
                    googleLinkUpdatedAt: new Date().toISOString(),
                },
            };
            await updateStore(updates);
            onStoreUpdate?.({
                publicPresence: {
                    ...(storeDetails.publicPresence || {}),
                    googleLinkUpdated: true,
                    googleLinkUpdatedAt: new Date().toISOString(),
                },
            } as any);
            message.success(t('googleListing.markedUpdated'));
        } catch {
            message.error(t('googleListing.couldNotSave'));
        } finally {
            setSaving(false);
        }
    };

    // Already done — compact success
    if (isUpdated) {
        return (
            <Card size="small">
                <Flex align="center" gap={10}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: token.colorSuccessBg,
                            flexShrink: 0,
                        }}
                    >
                        <LuCheck size={16} style={{ color: token.colorSuccess }} />
                    </Flex>
                    <Flex vertical style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13 }}>{t('googleListing.title')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('googleListing.updatedDescription')}</Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    // Not done — action card
    return (
        <Card size="small">
            <Flex align="center" gap={10}>
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: token.colorPrimaryBg,
                        flexShrink: 0,
                    }}
                >
                    <LuStore size={16} style={{ color: GOOGLE_BUSINESS_PROFILE_BLUE }} />
                </Flex>
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13 }}>{t('googleListing.setOfficialLink')}</Text>
                    <Text
                        type="secondary"
                        style={{
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t('googleListing.updateProfileWebsite', { url: obpUrl })}
                    </Text>
                </Flex>
                <Flex gap={6} wrap="wrap" justify="flex-end">
                    <Button
                        size="small"
                        icon={copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                        onClick={handleCopy}
                        style={{ minHeight: 32 }}
                    >
                        {copied ? t('googleListing.copied') : t('googleListing.copy')}
                    </Button>
                    <Button
                        size="small"
                        icon={<LuExternalLink size={12} />}
                        onClick={() => window.open('https://business.google.com/', '_blank', 'noopener,noreferrer')}
                        style={{ minHeight: 32 }}
                    >
                        {t('googleListing.openGoogle')}
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        onClick={handleMarkDone}
                        loading={saving}
                        style={{ minHeight: 32 }}
                    >
                        {t('googleListing.done')}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}
