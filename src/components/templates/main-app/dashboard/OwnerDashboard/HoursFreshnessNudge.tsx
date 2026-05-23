'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getHoursConfidenceState } from '@lib/outputControl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Flex, Typography, theme } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { LuClock, LuX } from 'react-icons/lu';

const { Text } = Typography;
const { useToken } = theme;

/**
 * HoursFreshnessNudge — Minimal correction trigger for stale hours.
 *
 * Shows ONLY when hours confidence is RISKY or BROKEN.
 * Nudges owner to update hours so "Open Now" badge is restored.
 * Dismissible per store — respects owner's choice.
 *
 * Part of Silent Correction Systems — the correction loop.
 * Without this, the system detects + degrades but never helps the owner fix it.
 *
 * Feature flag: ENABLE_OUTPUT_CONTROL (same flag — this is part of output control)
 *
 * @see __docs__/silent-correction-systems/README.md
 * @see __docs__/constitution/18-silent-correction-doctrine.md
 */
export default function HoursFreshnessNudge() {
    const { token } = useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [dismissed, setDismissed] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (storeDetails?.storeId) {
            const dismissKey = `hours_nudge_dismissed_${storeDetails.storeId}`;
            const dismissedAt = localStorage.getItem(dismissKey);
            if (dismissedAt) {
                // Re-show after 30 days (give owner another chance)
                const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
                if (daysSinceDismiss < 30) {
                    setDismissed(true);
                }
            }
            setInitialized(true);
        }
    }, [storeDetails?.storeId]);

    if (!FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL) return null;
    if (!storeDetails) return null;
    if (!initialized) return null;
    if (dismissed) return null;

    // Check hours confidence
    const confidenceState = getHoursConfidenceState({
        workingHours: storeDetails.workingHours,
        hoursLastUpdatedAt: (storeDetails as any).hoursLastUpdatedAt || (storeDetails as any).modifiedOn,
        timeZone: storeDetails.timeZone,
    });

    // Only show for RISKY or BROKEN — TRUSTED means hours are fresh
    if (confidenceState === 'TRUSTED') return null;

    const handleDismiss = () => {
        setDismissed(true);
        const dismissKey = `hours_nudge_dismissed_${storeDetails.storeId}`;
        localStorage.setItem(dismissKey, Date.now().toString());
    };

    const message = confidenceState === 'RISKY'
        ? 'Your hours may be outdated. Update them to show accurate open status to customers.'
        : 'Your hours are missing or invalid. Update them so customers can see when you\'re open.';

    return (
        <Card
            size="small"
            style={{
                background: `color-mix(in srgb, ${token.colorWarningBg} 82%, ${token.colorBgContainer})`,
                borderColor: token.colorWarningBorder,
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
                            background: `color-mix(in srgb, ${token.colorWarningBg} 64%, ${token.colorBgContainer})`,
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    >
                        <LuClock size={18} style={{ color: token.colorWarning }} />
                    </Flex>
                    <Flex vertical gap={4} style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 14 }}>
                            {confidenceState === 'RISKY' ? 'Hours may be outdated' : 'Hours need updating'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {message}
                        </Text>
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
