'use client';

/**
 * Extraction Job Review Screen
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 7
 * 
 * Displays comparison preview for re-extraction jobs.
 * User can toggle items to approve/reject before saving.
 */

import { applyExtractionChanges, discardExtractionChanges, isAcknowledgedApplyChangesResult } from '@lib/extraction/applyChanges';
import {
    MENULIST_ANSWERLATTICE_TARGETS,
    getMenuListAnswerlatticeTargetProps,
} from '@lib/answerlattice/referenceClients/menuListGuidedResolution';
import { updateApplyPlan } from '@lib/extraction/comparisonEngine';
import type {
    ComparisonEngineOutput,
    PreviewCategoryRow,
    PreviewItemRow
} from '@lib/extraction/comparisonEngine.types';
import { clearMenuProcessingJobDismissal, markMenuProcessingJobAsDismissed } from '@lib/extraction/menuProcessingDismissal';
import {
    getMenuProcessingJobLogContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import {
    countApprovedChanges,
    createReviewPreviewSession,
    getReviewPreviewIdentity,
    hasAnyPreviewChanges,
    resolveReviewPreviewSession,
    setAllPreviewApprovals,
    setPreviewCategoryApproval,
    setPreviewItemApproval,
    setSafePreviewApprovals,
    updateReviewPreviewSession,
} from '@lib/extraction/reviewPreview';
import type { ReviewPreviewState } from '@lib/extraction/reviewPreview';
import { Alert, Button, Card, Checkbox, Empty, Flex, App, Space, Tag, theme, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuChevronDown, LuChevronRight, LuDollarSign, LuPlus, LuRefreshCw, LuX } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ExtractionJobReviewScreenProps {
    projectId: string;
    jobId: string;
    tenantId: unknown;
    storeId: unknown;
    comparisonResult: ComparisonEngineOutput;
    primaryLang: string;
    onSaveComplete: (appliedChangesCount: number, appliedPreview: ReviewPreviewState) => void;
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

function ReviewNeededTag({ matchType }: { matchType?: string }) {
    if (matchType !== 'weak') return null;
    return <Tag color="orange">Needs review</Tag>;
}

function PriceChangeDisplay({ from, to }: { from?: string; to?: string }) {
    const { token } = theme.useToken();

    return (
        <Space size={4}>
            <Text type="secondary" delete>{from || '(none)'}</Text>
            <Text>→</Text>
            <Text strong style={{ color: token.colorSuccess }}>{to}</Text>
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
                <ReviewNeededTag matchType={category.matchType} />
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
    const { token } = theme.useToken();
    const name = item.extractedItem.name[primaryLang] || Object.values(item.extractedItem.name)[0] || 'Unnamed';
    const categoryName = item.extractedItem.categoryName || 'Unknown Category';

    return (
        <Flex justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
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
                <ReviewNeededTag matchType={item.matchType} />
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

const MAX_AUTO_EXPANDED_REVIEW_ROWS = 50;

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
    tenantId,
    storeId,
    comparisonResult,
    primaryLang,
    onSaveComplete,
    onDiscard,
}: ExtractionJobReviewScreenProps) {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const dismissalScope = useMemo(() => ({ tenantId, storeId }), [storeId, tenantId]);
    const reviewIdentity = getReviewPreviewIdentity(projectId, jobId);
    const activeReviewIdentityRef = useRef(reviewIdentity);
    activeReviewIdentityRef.current = reviewIdentity;
    const isMountedRef = useRef(false);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const [previewSession, setPreviewSession] = useState(() => (
        createReviewPreviewSession(projectId, jobId, comparisonResult.preview)
    ));
    const preview = resolveReviewPreviewSession(
        previewSession,
        projectId,
        jobId,
        comparisonResult.preview,
    ).preview;
    const setPreview = useCallback((update: (current: typeof preview) => typeof preview) => {
        setPreviewSession((current) => updateReviewPreviewSession(
            current,
            projectId,
            jobId,
            comparisonResult.preview,
            update,
        ));
    }, [comparisonResult.preview, jobId, projectId]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Calculate totals
    const totalChanges = useMemo(() => {
        return countApprovedChanges(preview);
    }, [preview]);

    // Toggle handlers
    const toggleCategory = useCallback((index: number, type: 'new' | 'updated', approved: boolean) => {
        setPreview(prev => setPreviewCategoryApproval(prev, index, type, approved));
    }, []);

    const toggleItem = useCallback((index: number, type: 'new' | 'updated' | 'override', approved: boolean) => {
        setPreview(prev => setPreviewItemApproval(prev, index, type, approved));
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
            messageApi.warning('No changes selected');
            return;
        }

        setIsSaving(true);
        setActionError(null);
        const submittedReviewIdentity = reviewIdentity;
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
                expectedChangeCount: totalChanges,
                primaryLang,
            });

            if (!isMountedRef.current || activeReviewIdentityRef.current !== submittedReviewIdentity) {
                return;
            }

            if (isAcknowledgedApplyChangesResult(result, {
                appliedChangeCount: totalChanges,
                jobId,
                mode: applyPlan.mode,
                projectId,
            })) {
                messageApi.success(`Applied ${totalChanges} changes`);
                onSaveComplete(totalChanges, preview);
            } else {
                const errorMessage = 'Failed to apply changes';
                setActionError(errorMessage);
                messageApi.error(errorMessage);
            }
        } catch (error: unknown) {
            if (!isMountedRef.current || activeReviewIdentityRef.current !== submittedReviewIdentity) {
                return;
            }
            logMenuProcessingFailure('desktop_extraction_review_apply_failed', error, {
                ...getMenuProcessingProjectLogContext(projectId),
                ...getMenuProcessingJobLogContext(jobId),
            });
            const errorMessage = 'Failed to save changes';
            setActionError(errorMessage);
            messageApi.error(errorMessage);
        } finally {
            if (isMountedRef.current && activeReviewIdentityRef.current === submittedReviewIdentity) {
                setIsSaving(false);
            }
        }
    }, [comparisonResult, preview, projectId, jobId, primaryLang, reviewIdentity, totalChanges, onSaveComplete]);

    // Discard handler
    const handleDiscard = useCallback(async () => {
        const submittedReviewIdentity = reviewIdentity;
        markMenuProcessingJobAsDismissed(dismissalScope, jobId);
        setIsDiscarding(true);
        setActionError(null);
        try {
            await discardExtractionChanges(jobId);
            if (!isMountedRef.current || activeReviewIdentityRef.current !== submittedReviewIdentity) {
                return;
            }
            messageApi.info('Changes discarded');
            onDiscard();
        } catch (error: unknown) {
            clearMenuProcessingJobDismissal(dismissalScope, jobId);
            if (!isMountedRef.current || activeReviewIdentityRef.current !== submittedReviewIdentity) {
                return;
            }
            logMenuProcessingFailure('desktop_extraction_review_discard_failed', error, {
                ...getMenuProcessingJobLogContext(jobId),
            });
            const errorMessage = 'Failed to discard changes';
            setActionError(errorMessage);
            messageApi.error(errorMessage);
        } finally {
            if (isMountedRef.current && activeReviewIdentityRef.current === submittedReviewIdentity) {
                setIsDiscarding(false);
            }
        }
    }, [dismissalScope, jobId, onDiscard, reviewIdentity]);

    // Check if there are any changes to show
    const hasAnyChanges = hasAnyPreviewChanges(preview);

    if (!hasAnyChanges) {
        return (
            <Card>
                <Empty
                    description="No changes detected"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button loading={isDiscarding} onClick={handleDiscard}>Close</Button>
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
                    style={{ marginBottom: 16, borderColor: token.colorWarning }}
                    title={
                        <Flex align="center" gap={8}>
                            <LuAlertTriangle color={token.colorWarning} />
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
                icon={<LuPlus color={token.colorSuccess} />}
                count={preview.newCategories.length}
                color="green"
                defaultOpen={preview.newCategories.length <= MAX_AUTO_EXPANDED_REVIEW_ROWS}
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
                icon={<LuRefreshCw color={token.colorPrimary} />}
                count={preview.updatedCategories.length}
                color="blue"
                defaultOpen={preview.updatedCategories.length <= MAX_AUTO_EXPANDED_REVIEW_ROWS}
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
                icon={<LuPlus color={token.colorSuccess} />}
                count={preview.newItems.length}
                color="green"
                defaultOpen={preview.newItems.length <= MAX_AUTO_EXPANDED_REVIEW_ROWS}
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
                icon={<LuRefreshCw color={token.colorPrimary} />}
                count={preview.updatedItems.length}
                color="blue"
                defaultOpen={preview.updatedItems.length <= MAX_AUTO_EXPANDED_REVIEW_ROWS}
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
                icon={<LuDollarSign color={token.colorWarning} />}
                count={preview.overrideSuggestions.length}
                color="orange"
                defaultOpen={preview.overrideSuggestions.length <= MAX_AUTO_EXPANDED_REVIEW_ROWS}
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
                            <LuX color={token.colorTextTertiary} />
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
                    {...getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_IMPORT_REVIEW_APPLY)}
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
