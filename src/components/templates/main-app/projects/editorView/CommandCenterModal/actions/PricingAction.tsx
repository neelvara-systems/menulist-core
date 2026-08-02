import { Alert, Flex, InputNumber, Radio, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type {
    ImpactSummary,
    PricingConfig,
    PricingMethod,
    SelectedItemInfo,
} from '../../../types/commandCenter.types';
import { computePricingPreview, validatePricingConfig } from '../utils/bulkOperations';

const { Text } = Typography;

const PRICING_METHODS: Array<{ value: PricingMethod; label: string; usesCurrency?: boolean }> = [
    { value: 'increasePercent', label: 'Increase by %' },
    { value: 'decreasePercent', label: 'Decrease by %' },
    { value: 'addFlat', label: 'Add flat amount', usesCurrency: true },
    { value: 'reduceFlat', label: 'Reduce flat amount', usesCurrency: true },
    { value: 'setFixed', label: 'Set fixed price', usesCurrency: true },
];

interface PricingActionProps {
    selectedItems: SelectedItemInfo[];
    currencySymbol: string;
    onPreviewChange: (preview: ImpactSummary | null) => void;
    onConfigReady: (config: PricingConfig | null) => void;
}

export default function PricingAction({
    selectedItems,
    currencySymbol,
    onPreviewChange,
    onConfigReady,
}: PricingActionProps) {
    const { token } = theme.useToken();
    const [method, setMethod] = useState<PricingMethod>('increasePercent');
    const [value, setValue] = useState<number | null>(null);

    const config: PricingConfig | null = useMemo(() => {
        if (value === null || value <= 0) return null;
        return { method, value };
    }, [method, value]);

    const validation = useMemo(() => {
        if (!config) return { valid: false, error: undefined };
        return validatePricingConfig(config);
    }, [config]);

    const preview = useMemo(() => {
        if (!config || !validation.valid) return null;
        return computePricingPreview(selectedItems, config);
    }, [config, validation.valid, selectedItems]);

    useEffect(() => {
        onPreviewChange(preview);
    }, [onPreviewChange, preview]);

    useEffect(() => {
        onConfigReady(config && validation.valid ? config : null);
    }, [config, onConfigReady, validation.valid]);

    const currentMethod = PRICING_METHODS.find((m) => m.value === method);
    const currentSymbol = currentMethod?.usesCurrency ? currencySymbol : '%';

    return (
        <Flex vertical gap={16}>
            {/* Method selector */}
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Change method</Text>
                <Radio.Group
                    value={method}
                    onChange={(e) => {
                        setMethod(e.target.value);
                        setValue(null);
                    }}
                >
                    <Flex vertical gap={6}>
                        {PRICING_METHODS.map((m) => (
                            <Radio key={m.value} value={m.value} style={{ fontSize: 13 }}>
                                {m.label}
                            </Radio>
                        ))}
                    </Flex>
                </Radio.Group>
            </Flex>

            {/* Value input */}
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Value</Text>
                <InputNumber
                    value={value}
                    onChange={(v) => setValue(v as number | null)}
                    min={1}
                    max={method === 'increasePercent' ? 200 : method === 'decreasePercent' ? 80 : 99999}
                    placeholder={`Enter ${currentSymbol === '%' ? 'percentage' : 'amount'}`}
                    addonAfter={currentSymbol}
                    style={{ width: '100%' }}
                    size="large"
                />
            </Flex>

            {/* Validation error */}
            {validation.error && (
                <Alert
                    type="error"
                    message={validation.error}
                    showIcon
                    style={{ padding: '6px 12px', fontSize: 12 }}
                />
            )}

            {/* Warnings */}
            {preview?.warnings && preview.warnings.length > 0 && !validation.error && (
                <Flex vertical gap={4}>
                    {preview.warnings.map((w, i) => (
                        <Alert
                            key={i}
                            type="warning"
                            message={w}
                            showIcon
                            style={{ padding: '6px 12px', fontSize: 12 }}
                        />
                    ))}
                </Flex>
            )}

            {/* Info note */}
            <Text type="secondary" style={{ fontSize: 11 }}>
                Prices rounded to nearest whole number. Attributes (variants) will also be updated.
            </Text>
        </Flex>
    );
}
