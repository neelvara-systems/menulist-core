'use client';

import { FEATURE_FLAGS } from '@config/features';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Flex, Typography, message } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuLink, LuX } from 'react-icons/lu';

const { Text } = Typography;

/**
 * BehaviorNudgeCard — Dashboard reinforcement card for official link adoption.
 * 
 * Shows a calm nudge to encourage owners to use MenuList link instead of PDFs.
 * Dismissible — once dismissed, never shows again for this store.
 * 
 * @see __docs__/behavior-engineering/behavior-engineering_impl.md (Screen 4)
 */
export default function BehaviorNudgeCard() {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Read localStorage in useEffect to avoid SSR hydration mismatch
    useEffect(() => {
        if (storeDetails?.storeId) {
            const dismissKey = `behavior_nudge_dismissed_${storeDetails.storeId}`;
            if (localStorage.getItem(dismissKey)) {
                setDismissed(true);
            }
            setInitialized(true);
        }
    }, [storeDetails?.storeId]);

    if (!FEATURE_FLAGS.ENABLE_BEHAVIOR_NUDGES) return null;
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;
    if (!storeDetails) return null;
    if (!initialized) return null;
    if (dismissed) return null;

    const obpUrl = generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain);
    if (!obpUrl) return null;

    const handleDismiss = () => {
        setDismissed(true);
        const dismissKey = `behavior_nudge_dismissed_${storeDetails.storeId}`;
        localStorage.setItem(dismissKey, Date.now().toString());
    };

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

    return (
        <Card
            size="small"
            style={{
                background: '#f0f5ff',
                borderColor: '#d6e4ff',
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
                            background: '#e6f4ff',
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    >
                        <LuLink size={18} style={{ color: '#1677ff' }} />
                    </Flex>
                    <Flex vertical gap={4} style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 14 }}>
                            This is your official customer menu link
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Use this instead of sending menu photos or PDFs. Customers will always see your latest menu.
                        </Text>
                        <Flex gap={8} align="center" style={{ marginTop: 4 }}>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: '#1677ff',
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
                                {copied ? 'Copied' : 'Copy'}
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
