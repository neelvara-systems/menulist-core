'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

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
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { generateConfiguredStoreOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { StoreDataType } from '@type/platform/store';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { Button, Card, Flex, Typography, App, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuCheck, LuCopy, LuExternalLink, LuStore } from 'react-icons/lu';

const { Text } = Typography;
// Google Business Profile blue is a brand cue; surrounding card chrome uses Ant tokens.
const GOOGLE_BUSINESS_PROFILE_BLUE = '#4285F4';
const OWNER_GOOGLE_LISTING_COPY_UNAVAILABLE = 'owner_dashboard_google_listing_copy_unavailable';
const OWNER_GOOGLE_LISTING_COPY_FALLBACK_FAILED = 'owner_dashboard_google_listing_copy_fallback_failed';

const hasOwnerGoogleListingClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasOwnerGoogleListingCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyOwnerGoogleListingLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasOwnerGoogleListingClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasOwnerGoogleListingCopyFallback()) {
        throw clipboardWriteError || new Error(OWNER_GOOGLE_LISTING_COPY_UNAVAILABLE);
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
            throw new Error(OWNER_GOOGLE_LISTING_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface GoogleListingCardProps {
    storeDetails: StoreDataType;
    onStoreUpdate?: (updates: Partial<StoreDataType>) => void;
}

export default function GoogleListingCard({ storeDetails, onStoreUpdate }: GoogleListingCardProps) {
    const { message: messageApi } = App.useApp();
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');
    const { tenantDetails } = useContext(PlatformGlobalDataContext);

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;
    if (FEATURE_FLAGS.ENABLE_GBP_SYNC) return null;

    const obpUrl = generateConfiguredStoreOBPUrl(storeDetails, tenantDetails?.storesList);
    if (!obpUrl) return null;

    const isUpdated = storeDetails?.publicPresence?.googleLinkUpdated === true;
    const buildGoogleListingCardLogContext = (
        action: string,
        metadata: Record<string, boolean | number | string | undefined> = {},
    ) => ({
        surface: 'owner_dashboard_google_listing_card',
        action,
        googleLinkUpdated: isUpdated,
        ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStoreStringContext('tenantId', (storeDetails as any)?.tenantId),
        ...getBoundedStoreStringContext('subdomain', storeDetails?.subdomain),
        ...getBoundedStoreStringContext('customDomain', storeDetails?.customDomain),
        ...getBoundedStoreStringContext('obpUrl', obpUrl),
        ...metadata,
    });

    const handleCopy = async () => {
        try {
            await copyOwnerGoogleListingLink(obpUrl);
            setCopied(true);
            messageApi.success(t('googleListing.linkCopied'));
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure('owner_dashboard_google_listing_copy_failed', error, buildGoogleListingCardLogContext('copy_obp_link', {
                hasClipboardWrite: hasOwnerGoogleListingClipboardWrite(),
                hasCopyFallback: hasOwnerGoogleListingCopyFallback(),
            }));
            messageApi.error(t('googleListing.couldNotCopy'));
        }
    };

    const handleOpenGoogle = () => {
        try {
            openIsolatedBrowserUrl('https://business.google.com/');
        } catch (error) {
            logStoreDataFailure('owner_dashboard_google_listing_open_failed', error, buildGoogleListingCardLogContext('open_google_profile', {
                target: 'google_business_profile',
            }));
            messageApi.error(t('googleListing.couldNotOpen'));
        }
    };

    const handleMarkDone = async () => {
        setSaving(true);
        try {
            const googleLinkUpdatedAt = new Date().toISOString();
            const nextPublicPresence = {
                ...(storeDetails.publicPresence || {}),
                googleLinkUpdated: true,
                googleLinkUpdatedAt,
            };
            const updates = {
                storeId: storeDetails.storeId,
                publicPresence: {
                    googleLinkUpdated: true,
                    googleLinkUpdatedAt,
                },
            };
            const writeResult = await updateStore(updates);
            assertStoreUpdateSucceeded(
                writeResult,
                storeDetails.storeId,
                'owner_dashboard_google_listing_store_update_rejected',
            );
            onStoreUpdate?.({
                publicPresence: nextPublicPresence,
            } as any);
            messageApi.success(t('googleListing.markedUpdated'));
        } catch (error) {
            logStoreDataFailure('owner_dashboard_google_listing_mark_done_failed', error, buildGoogleListingCardLogContext('mark_google_link_done'));
            messageApi.error(t('googleListing.couldNotSave'));
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
                        onClick={handleOpenGoogle}
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
