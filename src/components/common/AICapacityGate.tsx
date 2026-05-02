'use client';

import { AICapacityError } from '@services/ai/capacityError';
import { Button, Flex, Typography } from 'antd';
import React, { useCallback } from 'react';
import { FaBolt } from 'react-icons/fa';

const { Text } = Typography;

/**
 * AICapacityGate — Calm upsell CTA wrapper for AI action buttons
 *
 * Wraps AI action triggers. When the action fails with a 402 capacity error,
 * shows a calm CTA to purchase an enhancement pack instead of an error notification.
 *
 * Usage:
 * ```tsx
 * <AICapacityGate onPurchase={() => setIsCreditsModalOpen(true)}>
 *   {(handleAction) => (
 *     <Button onClick={() => handleAction(originalAction)}>Generate Image</Button>
 *   )}
 * </AICapacityGate>
 * ```
 *
 * Or use the static helper for imperative error handling:
 * ```tsx
 * try { await generateImage(); }
 * catch (e) { if (AICapacityGate.isCapacityError(e)) showUpsell(); }
 * ```
 *
 * Doctrine: No credits, tokens, or units. Calm language only.
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */

interface AICapacityGateProps {
    children: React.ReactNode;
    onPurchase: () => void;
    isExhausted?: boolean;
}

const AICapacityGate: React.FC<AICapacityGateProps> & {
    isCapacityError: (error: unknown) => boolean;
    ExhaustedCTA: React.FC<{ onPurchase: () => void; compact?: boolean }>;
} = ({ children, onPurchase, isExhausted }) => {
    if (isExhausted) {
        return <AICapacityGate.ExhaustedCTA onPurchase={onPurchase} />;
    }
    return <>{children}</>;
};

/**
 * Static helper to check if an error is a capacity error.
 * Use in catch blocks to distinguish capacity errors from real errors.
 */
AICapacityGate.isCapacityError = (error: unknown): boolean => {
    if (error instanceof AICapacityError) return true;
    if (error && typeof error === 'object' && 'name' in error) {
        return (error as any).name === 'AICapacityError';
    }
    return false;
};

/**
 * Calm upsell CTA shown when AI capacity is exhausted.
 * No error language, no "ran out", no "insufficient".
 */
const ExhaustedCTA: React.FC<{ onPurchase: () => void; compact?: boolean }> = ({ onPurchase, compact }) => {
    const handleClick = useCallback(() => onPurchase(), [onPurchase]);

    if (compact) {
        return (
            <Button
                type="primary"
                ghost
                size="small"
                icon={<FaBolt />}
                onClick={handleClick}
            >
                Get Enhancements
            </Button>
        );
    }

    return (
        <Flex vertical align="center" gap={8} style={{ padding: '12px 16px' }}>
            <Text type="secondary" style={{ textAlign: 'center' }}>
                Get more enhancements for images, descriptions, and translations.
            </Text>
            <Button
                type="primary"
                ghost
                icon={<FaBolt />}
                onClick={handleClick}
            >
                Get Enhancements
            </Button>
        </Flex>
    );
};

AICapacityGate.ExhaustedCTA = ExhaustedCTA;

export default AICapacityGate;
