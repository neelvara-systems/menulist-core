'use client';

/**
 * Extraction Job Review Screen
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 7
 * 
 * Displays comparison preview for re-extraction jobs.
 * User can toggle items to approve/reject before saving.
 */

import { applyExtractionChanges, discardExtractionChanges } from '@lib/extraction/applyChanges';
import { updateApplyPlan } from '@lib/extraction/comparisonEngine';
import type {
    ComparisonEngineOutput,
    PreviewCategoryRow,
    PreviewItemRow
} from '@lib/extraction/comparisonEngine.types';
import {
    countApprovedChanges,
    hasAnyPreviewChanges,
    setAllPreviewApprovals,
    setSafePreviewApprovals,
} from '@lib/extraction/reviewPreview';
import { Alert, Button, Card, Checkbox, Empty, Flex, message, Space, Tag, theme, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuChevronDown, LuChevronRight, LuDollarSign, LuPlus, LuRefreshCw, LuX } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ExtractionJobReviewScreenProps {
    projectId: string;
    jobId: string;
    comparisonResult: ComparisonEngineOutput;
    primaryLang: string;
    onSaveComplete: () => void;
    onDiscard: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ChangeTag({ type }: { type: 'NEW' | 'UPDATE' | 'OVERRIDE' }) {
    const colors = {
        NEW: 'green',
        UPDATE: 'blue',
        OVERRIDE: 'orange',
    };
    const icons = {
        NEW: <LuPlus size={12} />,
        UPDATE: <LuRefreshCw size={12} />,
        OVERRIDE: <LuDollarSign size={12} />,
    };
    return (
        <Tag color={colors[type]} icon={icons[type]}>
            {type}
        </Tag>
    );
}

function MatchScoreBadge({ score, matchType }: { score: number; matchType?: string }) {
    if (!score || score === 0) return null;

    const percent = Math.round(score * 100);
    const color = matchType === 'weak' ? 'warning' : 'success';

    return (
        <Tag color={color === 'warning' ? 'orange' : 'green'}>
            {percent}% match
        </Tag>
    );
}

function PriceChangeDisplay({ from, to }: { from?: string; to?: string }) {
    return (
        <Space size={4}>
            <Text type="secondary" delete>{from || '(none)'}</Text>
            <Text>→</Text>
            <Text strong style={{ color: '#52c41a' }}>{to}</Text>
        </Space>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY ROW
// ═══════════════════════════════════════════════════════════════════════════

function CategoryRow({
    category,
    primaryLang,
    onToggle,
}: {
    category: PreviewCategoryRow;
    primaryLang: string;
    onToggle: (approved: boolean) => void;
}) {
    const name = category.extractedCategory.name[primaryLang] || Object.values(category.extractedCategory.name)[0] || 'Unnamed';

    return (
        <Flex justify="space-between" align="center" style={{ padding: '8px 0' }}>
            <Flex align="center" gap={8}>
                <Checkbox
                    checked={category.approved}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <ChangeTag type={category.changeType} />
                <Text strong>{name}</Text>
                {category.matchScore && category.matchScore < 1 && (
                    <MatchScoreBadge score={category.matchScore} matchType={category.matchType} />
                )}
            </Flex>
            {category.warnings && category.warnings.length > 0 && (
                <Tag color="orange" icon={<LuAlertTriangle size={12} />}>
                    {category.warnings[0]}
                </Tag>
            )}
        </Flex>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM ROW
// ═══════════════════════════════════════════════════════════════════════════

function ItemRow({
    item,
    primaryLang,
    onToggle,
}: {
    item: PreviewItemRow;
    primaryLang: string;
    onToggle: (approved: boolean) => void;
}) {
    const name = item.extractedItem.name[primaryLang] || Object.values(item.extractedItem.name)[0] || 'Unnamed';
    const categoryName = item.extractedItem.categoryName || 'Unknown Category';

    return (
        <Flex justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Flex align="center" gap={8}>
                <Checkbox
                    checked={item.approved}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <ChangeTag type={item.changeType} />
                <div>
                    <Text strong>{name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>in {categoryName}</Text>
                </div>
            </Flex>
            <Flex align="center" gap={8}>
                {item.changes?.price && (
                    <PriceChangeDisplay from={item.changes.price.from} to={item.changes.price.to} />
                )}
                {item.matchScore && item.matchScore < 1 && (
                    <MatchScoreBadge score={item.matchScore} matchType={item.matchType} />
                )}
                {item.isLocalOnly && (
                    <Tag color="purple">Local Only</Tag>
                )}
                {item.warnings && item.warnings.length > 0 && (
                    <Tag color="orange" icon={<LuAlertTriangle size={12} />}>
                        {item.warnings[0]}
                    </Tag>
                )}
            </Flex>
        </Flex>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ReviewSection({
    title,
    icon,
    count,
    color,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ReactNode;
    count: number;
    color: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (count === 0) return null;

    return (
        <Card
            size="small"
            style={{ marginBottom: 16 }}
            title={
                <Flex
                    align="center"
                    gap={8}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <LuChevronDown /> : <LuChevronRight />}
                    {icon}
                    <Text strong>{title}</Text>
                    <Tag color={color}>{count}</Tag>
                </Flex>
            }
        >
            {isOpen && children}
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ExtractionJobReviewScreen({
    projectId,
    jobId,
    comparisonResult,
    primaryLang,
    onSaveComplete,
    onDiscard,
}: ExtractionJobReviewScreenProps) {
    const { token } = theme.useToken();
    const [preview, setPreview] = useState(comparisonResult.preview);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Calculate totals
    const totalChanges = useMemo(() => {
        return countApprovedChanges(preview);
    }, [preview]);

    // Toggle handlers
    const toggleCategory = useCallback((index: number, type: 'new' | 'updated', approved: boolean) => {
        setPreview(prev => {
            const key = type === 'new' ? 'newCategories' : 'updatedCategories';
            const updated = [...prev[key]];
            updated[index] = { ...updated[index], approved };
            return { ...prev, [key]: updated };
        });
    }, []);

    const toggleItem = useCallback((index: number, type: 'new' | 'updated' | 'override', approved: boolean) => {
        setPreview(prev => {
            const keyMap = {
                new: 'newItems',
                updated: 'updatedItems',
                override: 'overrideSuggestions',
            } as const;
            const key = keyMap[type];
            const updated = [...prev[key]];
            updated[index] = { ...updated[index], approved };
            return { ...prev, [key]: updated };
        });
    }, []);

    // Select all / deselect all
    const selectAll = useCallback(() => {
        setActionError(null);
        setPreview(prev => setAllPreviewApprovals(prev, true));
    }, []);

    const deselectAll = useCallback(() => {
        setActionError(null);
        setPreview(prev => setAllPreviewApprovals(prev, false));
    }, []);

    const selectSafeOnly = useCallback(() => {
        setActionError(null);
        setPreview(prev => setSafePreviewApprovals(prev));
    }, []);

    // Save handler
    const handleSave = useCallback(async () => {
        if (totalChanges === 0) {
            message.warning('No changes selected');
            return;
        }

        setIsSaving(true);
        setActionError(null);
        try {
            // Build updated apply plan from current preview state
            const updatedOutput: ComparisonEngineOutput = {
                ...comparisonResult,
                preview,
            };
            const applyPlan = updateApplyPlan(updatedOutput);

            const result = await applyExtractionChanges({
                projectId,
                applyPlan,
                jobId,
                primaryLang,
            });

            if (result.success) {
                message.success(`Applied ${totalChanges} changes`);
                onSaveComplete();
            } else {
                const errorMessage = result.error || 'Failed to apply changes';
                setActionError(errorMessage);
                message.error(errorMessage);
            }
        } catch (error: any) {
            console.error('[ExtractionJobReviewScreen] Save error:', error);
            const errorMessage = error.message || 'Failed to save changes';
            setActionError(errorMessage);
            message.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    }, [comparisonResult, preview, projectId, jobId, primaryLang, totalChanges, onSaveComplete]);

    // Discard handler
    const handleDiscard = useCallback(async () => {
        setIsDiscarding(true);
        setActionError(null);
        try {
            await discardExtractionChanges(jobId);
            message.info('Changes discarded');
            onDiscard();
        } catch (error: any) {
            console.error('[ExtractionJobReviewScreen] Discard error:', error);
            const errorMessage = error.message || 'Failed to discard changes';
            setActionError(errorMessage);
            message.error(errorMessage);
        } finally {
            setIsDiscarding(false);
        }
    }, [jobId, onDiscard]);

    // Check if there are any changes to show
    const hasAnyChanges = hasAnyPreviewChanges(preview);

    if (!hasAnyChanges) {
        return (
            <Card>
                <Empty
                    description="No changes detected"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button onClick={onDiscard}>Close</Button>
                </Empty>
            </Card>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            {/* Header */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Review Extracted Changes</Title>
                    <Text type="secondary">
                        {totalChanges} change{totalChanges !== 1 ? 's' : ''} selected •
                        {preview.unchangedCount} item{preview.unchangedCount !== 1 ? 's' : ''} unchanged
                    </Text>
                </div>
                <Space>
                    <Button size="small" onClick={selectSafeOnly}>Approve Safe Only</Button>
                    <Button size="small" onClick={selectAll}>Select All</Button>
                    <Button size="small" onClick={deselectAll}>Deselect All</Button>
                </Space>
            </Flex>

            {actionError && (
                <Alert
                    showIcon
                    type="error"
                    message="Could not finish review"
                    description={actionError}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
                <Card
                    size="small"
                    style={{ marginBottom: 16, borderColor: '#faad14' }}
                    title={
                        <Flex align="center" gap={8}>
                            <LuAlertTriangle color="#faad14" />
                            <Text strong>Warnings ({preview.warnings.length})</Text>
                        </Flex>
                    }
                >
                    {preview.warnings.map((warning, idx) => (
                        <Paragraph key={idx} style={{ margin: '4px 0' }}>
                            <Text type="warning">{warning.name}:</Text> {warning.reason}
                        </Paragraph>
                    ))}
                </Card>
            )}

            {/* New Categories */}
            <ReviewSection
                title="New Categories"
                icon={<LuPlus color="#52c41a" />}
                count={preview.newCategories.length}
                color="green"
            >
                {preview.newCategories.map((cat, idx) => (
                    <CategoryRow
                        key={cat.extractedCategory.id}
                        category={cat}
                        primaryLang={primaryLang}
                        onToggle={(approved) => toggleCategory(idx, 'new', approved)}
                    />
                ))}
            </ReviewSection>

            {/* Updated Categories */}
            <ReviewSection
                title="Updated Categories"
                icon={<LuRefreshCw color="#1890ff" />}
                count={preview.updatedCategories.length}
                color="blue"
            >
                {preview.updatedCategories.map((cat, idx) => (
                    <CategoryRow
                        key={cat.existingCategoryId || cat.extractedCategory.id}
                        category={cat}
                        primaryLang={primaryLang}
                        onToggle={(approved) => toggleCategory(idx, 'updated', approved)}
                    />
                ))}
            </ReviewSection>

            {/* New Items */}
            <ReviewSection
                title="New Items"
                icon={<LuPlus color="#52c41a" />}
                count={preview.newItems.length}
                color="green"
            >
                {preview.newItems.map((item, idx) => (
                    <ItemRow
                        key={item.extractedItem.id}
                        item={item}
                        primaryLang={primaryLang}
                        onToggle={(approved) => toggleItem(idx, 'new', approved)}
                    />
                ))}
            </ReviewSection>

            {/* Updated Items */}
            <ReviewSection
                title="Updated Items"
                icon={<LuRefreshCw color="#1890ff" />}
                count={preview.updatedItems.length}
                color="blue"
            >
                {preview.updatedItems.map((item, idx) => (
                    <ItemRow
                        key={item.existingItemId || item.extractedItem.id}
                        item={item}
                        primaryLang={primaryLang}
                        onToggle={(approved) => toggleItem(idx, 'updated', approved)}
                    />
                ))}
            </ReviewSection>

            {/* Price Overrides (Outlet mode) */}
            <ReviewSection
                title="Price Overrides"
                icon={<LuDollarSign color="#fa8c16" />}
                count={preview.overrideSuggestions.length}
                color="orange"
            >
                {preview.overrideSuggestions.map((item, idx) => (
                    <ItemRow
                        key={item.masterItemId || item.extractedItem.id}
                        item={item}
                        primaryLang={primaryLang}
                        onToggle={(approved) => toggleItem(idx, 'override', approved)}
                    />
                ))}
            </ReviewSection>

            {/* Ignored */}
            {preview.ignored.length > 0 && (
                <Card
                    size="small"
                    style={{ marginBottom: 16, opacity: 0.7 }}
                    title={
                        <Flex align="center" gap={8}>
                            <LuX color="#999" />
                            <Text type="secondary">Ignored ({preview.ignored.length})</Text>
                        </Flex>
                    }
                >
                    {preview.ignored.map((item, idx) => (
                        <Text key={idx} type="secondary" style={{ display: 'block', padding: '4px 0' }}>
                            {item.name}: {item.reason}
                        </Text>
                    ))}
                </Card>
            )}

            {/* Actions */}
            <Flex
                align="center"
                gap={12}
                justify="flex-end"
                style={{
                    background: token.colorBgElevated,
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    bottom: 0,
                    margin: '8px -16px -16px',
                    padding: '12px 16px',
                    position: 'sticky',
                    zIndex: 2,
                }}
            >
                <Button
                    onClick={handleDiscard}
                    loading={isDiscarding}
                    disabled={isSaving}
                >
                    Discard All
                </Button>
                <Button
                    type="primary"
                    icon={<LuCheck />}
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={isDiscarding || totalChanges === 0}
                >
                    Apply {totalChanges} Change{totalChanges !== 1 ? 's' : ''}
                </Button>
            </Flex>
        </div>
    );
}

export default ExtractionJobReviewScreen;
