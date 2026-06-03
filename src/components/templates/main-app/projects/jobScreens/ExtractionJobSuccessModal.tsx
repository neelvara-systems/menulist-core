'use client';

import { useOfferingLabels } from '@hook/useOfferingLabels';
import type { OwnerDetectedDetail } from '@lib/menu-intake-identity/ownerPresentation';
import { Button, Flex, Modal, Progress, theme, Typography } from 'antd';
import { LuCheckCircle, LuDollarSign, LuFileText, LuLayoutGrid, LuList } from 'react-icons/lu';

const { Text, Title } = Typography;

interface ExtractionStats {
    qualityScore?: number;
    qualityDetails?: {
        categoryQuality: number;
        itemQuality: number;
        priceQuality: number;
        descriptionQuality: number;
    };
    categoriesCount?: number;
    itemsCount?: number;
    profileHighlights?: OwnerDetectedDetail[];
}

interface ExtractionJobSuccessModalProps {
    open: boolean;
    onClose: () => void;
    extractionStats?: ExtractionStats | null;
}

/**
 * ExtractionJobSuccessModal
 * 
 * Displayed when an extraction job completes successfully.
 * Applies to both:
 * - First extraction: Server auto-saves → job completed → this modal shown
 * - Re-extraction: User reviews + saves → job completed → this modal shown
 * 
 * On close, navigates user to the Editor view to review the merged data.
 */
export default function ExtractionJobSuccessModal({
    open,
    onClose,
    extractionStats,
}: ExtractionJobSuccessModalProps) {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();

    const qualityScore = extractionStats?.qualityScore ?? 0;
    const qualityDetails = extractionStats?.qualityDetails;
    const categoriesCount = extractionStats?.categoriesCount ?? 0;
    const itemsCount = extractionStats?.itemsCount ?? 0;
    const profileHighlights = extractionStats?.profileHighlights || [];

    const getScoreColor = (score: number) => {
        if (score >= 80) return token.colorSuccess;
        if (score >= 50) return token.colorWarning;
        return token.colorError;
    };
    const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

    const qualityBreakdown = qualityDetails ? [
        { label: 'Categories', value: qualityDetails.categoryQuality, max: 25, icon: <LuLayoutGrid size={14} /> },
        { label: titleCase(labels.itemsPlural), value: qualityDetails.itemQuality, max: 10, icon: <LuList size={14} /> },
        { label: 'Prices', value: qualityDetails.priceQuality, max: 50, icon: <LuDollarSign size={14} /> },
        { label: 'Descriptions', value: qualityDetails.descriptionQuality, max: 25, icon: <LuFileText size={14} /> },
    ] : [];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={520}
        >
            <Flex vertical align="center" gap={16} style={{ padding: '24px 0 8px' }}>
                <LuCheckCircle size={56} style={{ color: token.colorSuccess }} />
                <Title level={4} style={{ margin: 0 }}>Extraction Complete</Title>
                <Text type="secondary" style={{ textAlign: 'center' }}>
                    All uploaded files have been processed and merged into your {labels.offeringPhrase}.
                </Text>

                {extractionStats && (
                    <Flex vertical gap={16} style={{
                        width: '100%',
                        padding: 16,
                        background: token.colorBgLayout,
                        borderRadius: token.borderRadiusLG,
                        marginTop: 4,
                    }}>
                        {/* Summary counts */}
                        <Flex justify="center" gap={32}>
                            <Flex vertical align="center" gap={2}>
                                <Text strong style={{ fontSize: 24, lineHeight: 1 }}>
                                    {categoriesCount}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Categories</Text>
                            </Flex>
                            <Flex vertical align="center" gap={2}>
                                <Text strong style={{ fontSize: 24, lineHeight: 1 }}>
                                    {itemsCount}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{titleCase(labels.itemsPlural)}</Text>
                            </Flex>
                            <Flex vertical align="center" gap={2}>
                                <Text strong style={{
                                    fontSize: 24,
                                    lineHeight: 1,
                                    color: getScoreColor(qualityScore),
                                }}>
                                    {qualityScore}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Quality</Text>
                            </Flex>
                        </Flex>

                        {/* Quality breakdown */}
                        {qualityBreakdown.length > 0 && (
                            <Flex vertical gap={6}>
                                {qualityBreakdown.map(({ label, value, max, icon }) => (
                                    <Flex key={label} align="center" gap={8}>
                                        <Flex align="center" gap={4} style={{ width: 110 }}>
                                            {icon}
                                            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                                        </Flex>
                                        <Progress
                                            percent={Math.round((value / max) * 100)}
                                            size="small"
                                            strokeColor={getScoreColor(Math.round((value / max) * 100))}
                                            style={{ flex: 1, margin: 0 }}
                                            format={() => `${value}/${max}`}
                                        />
                                    </Flex>
                                ))}
                            </Flex>
                        )}

                        {profileHighlights.length > 0 && (
                            <Flex vertical gap={8}>
                                <Text strong>Details picked up</Text>
                                <Flex gap={8} wrap="wrap">
                                    {profileHighlights.map((detail) => (
                                        <Flex
                                            align="center"
                                            gap={6}
                                            key={detail.key}
                                            style={{
                                                background: token.colorBgContainer,
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 6,
                                                padding: '6px 8px',
                                            }}
                                        >
                                            {detail.color ? (
                                                <span
                                                    aria-hidden="true"
                                                    style={{
                                                        background: detail.color,
                                                        border: '1px solid rgba(0,0,0,0.12)',
                                                        borderRadius: 999,
                                                        display: 'inline-block',
                                                        height: 12,
                                                        width: 12,
                                                    }}
                                                />
                                            ) : null}
                                            <Text style={{ fontSize: 12 }}>
                                                {detail.label}: {detail.value}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Flex>
                        )}
                    </Flex>
                )}

                <Button
                    type="primary"
                    size="large"
                    onClick={onClose}
                    style={{ marginTop: 8 }}
                >
                    View in Editor
                </Button>
            </Flex>
        </Modal>
    );
}
