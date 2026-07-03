'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getBoundedStoreStringContext, logStoreDataFailure } from '@database/stores/storeDiagnostics';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Flex, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuLink, LuX } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;
const BEHAVIOR_NUDGE_COPY_UNAVAILABLE = 'owner_dashboard_behavior_nudge_copy_unavailable';
const BEHAVIOR_NUDGE_COPY_FALLBACK_FAILED = 'owner_dashboard_behavior_nudge_copy_fallback_failed';

const hasBehaviorNudgeClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasBehaviorNudgeCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyBehaviorNudgeLink = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasBehaviorNudgeClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasBehaviorNudgeCopyFallback()) {
        throw clipboardWriteError || new Error(BEHAVIOR_NUDGE_COPY_UNAVAILABLE);
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
            throw new Error(BEHAVIOR_NUDGE_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

/**
 * BehaviorNudgeCard — Dashboard reinforcement card for official link adoption.
 * 
 * Shows a calm nudge to encourage owners to use MenuList link instead of PDFs.
 * Dismissible — once dismissed, never shows again for this store.
 * 
 * @see __docs__/behavior-engineering/behavior-engineering_impl.md (Screen 4)
 */
export default function BehaviorNudgeCard() {
    const { token } = useToken();
    const t = useTranslations('Dashboard.owner');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Read localStorage in useEffect to avoid SSR hydration mismatch
    useEffect(() => {
        if (storeDetails?.storeId) {
            const dismissKey = `behavior_nudge_dismissed_${storeDetails.storeId}`;
            try {
                setDismissed(Boolean(localStorage.getItem(dismissKey)));
            } catch (error) {
                setDismissed(false);
                logStoreDataFailure('owner_dashboard_behavior_nudge_dismiss_load_failed', error, {
                    surface: 'owner_dashboard_behavior_nudge_card',
                    action: 'load_dismiss_state',
                    ...getBoundedStoreStringContext('storeId', storeDetails.storeId),
                    ...getBoundedStoreStringContext('tenantId', (storeDetails as any)?.tenantId),
                    ...getBoundedStoreStringContext('dismissKey', dismissKey),
                });
            } finally {
                setInitialized(true);
            }
        }
    }, [storeDetails?.storeId]);

    if (!FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES) return null;
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;
    if (!storeDetails) return null;
    if (!initialized) return null;
    if (dismissed) return null;

    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
    if (!obpUrl) return null;
    const buildBehaviorNudgeLogContext = (
        action: string,
        metadata: Record<string, boolean | number | string | undefined> = {},
    ) => ({
        surface: 'owner_dashboard_behavior_nudge_card',
        action,
        ...getBoundedStoreStringContext('storeId', storeDetails?.storeId),
        ...getBoundedStoreStringContext('tenantId', (storeDetails as any)?.tenantId),
        ...getBoundedStoreStringContext('subdomain', storeDetails?.subdomain),
        ...getBoundedStoreStringContext('customDomain', storeDetails?.customDomain),
        ...getBoundedStoreStringContext('obpUrl', obpUrl),
        ...metadata,
    });

    const handleDismiss = () => {
        setDismissed(true);
        const dismissKey = `behavior_nudge_dismissed_${storeDetails.storeId}`;
        try {
            localStorage.setItem(dismissKey, Date.now().toString());
        } catch (error) {
            logStoreDataFailure('owner_dashboard_behavior_nudge_dismiss_save_failed', error, buildBehaviorNudgeLogContext('save_dismiss_state', {
                ...getBoundedStoreStringContext('dismissKey', dismissKey),
            }));
        }
    };

    const handleCopy = async () => {
        try {
            await copyBehaviorNudgeLink(obpUrl);
            setCopied(true);
            message.success(t('behaviorNudge.linkCopied'));
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logStoreDataFailure('owner_dashboard_behavior_nudge_copy_failed', error, buildBehaviorNudgeLogContext('copy_obp_link', {
                hasClipboardWrite: hasBehaviorNudgeClipboardWrite(),
                hasCopyFallback: hasBehaviorNudgeCopyFallback(),
            }));
            message.error(t('behaviorNudge.couldNotCopy'));
        }
    };

    return (
        <Card
            size="small"
            style={{
                background: `color-mix(in srgb, ${token.colorInfoBg} 80%, ${token.colorBgContainer})`,
                borderColor: token.colorInfoBorder,
                marginBottom: 16,
            }}
        >
            <Flex justify="space-between" align="flex-start">
                <Flex gap={12} align="flex-start" style={{ flex: 1 }}>
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${token.colorInfoBg} 65%, ${token.colorBgContainer})`,
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    >
                        <LuLink size={18} style={{ color: token.colorInfo }} />
                    </Flex>
                    <Flex vertical gap={4} style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 14 }}>
                            {t('behaviorNudge.title')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('behaviorNudge.description')}
                        </Text>
                        <Flex gap={8} align="center" style={{ marginTop: 4 }}>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: token.colorInfo,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 250,
                                }}
                            >
                                {obpUrl}
                            </Text>
                            <Button
                                icon={copied ? <LuCheck size={12} /> : <LuCopy size={12} />}
                                onClick={handleCopy}
                                type={copied ? 'primary' : 'default'}
                                size="small"
                            >
                                {copied ? t('behaviorNudge.copied') : t('behaviorNudge.copy')}
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
                <Button
                    type="text"
                    icon={<LuX size={14} />}
                    onClick={handleDismiss}
                    size="small"
                    style={{ marginTop: -4, marginRight: -8 }}
                />
            </Flex>
        </Card>
    );
}
