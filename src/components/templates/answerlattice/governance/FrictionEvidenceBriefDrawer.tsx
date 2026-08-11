'use client';

import {
    ANSWERLATTICE_FRICTION_REVIEW_PATHS,
    AnswerlatticeFrictionReviewPath,
    buildAnswerlatticeFrictionEvidenceBrief,
    isAnswerlatticeFrictionReviewPath,
} from '@lib/answerlattice/frictionEvidenceBrief';
import { getAnswerlatticeFrictionReviewDestination } from '@lib/answerlattice/frictionReviewRouting';
import { copyAnswerlatticeSupportTextToClipboard } from '@lib/answerlattice/supportClipboard';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import type {
    AnswerlatticeFrictionEntitySummary,
    AnswerlatticeSupportMetricWindow,
} from '@type/answerlattice';
import { Alert, Button, Drawer, Flex, Grid, message, Select, Space, Tag, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuClipboardCopy, LuDownload, LuFileText, LuX } from 'react-icons/lu';

const { Paragraph, Text } = Typography;

const REVIEW_PATH_OPTIONS = Object.entries(ANSWERLATTICE_FRICTION_REVIEW_PATHS).map(
    ([value, config]) => ({
        label: config.label,
        value,
    }),
);

interface FrictionEvidenceBriefDrawerProps {
    entity: AnswerlatticeFrictionEntitySummary | null;
    metricWindow: AnswerlatticeSupportMetricWindow | null;
    onClose: () => void;
    open: boolean;
    sourceLastUpdated?: string;
}

export default function FrictionEvidenceBriefDrawer({
    entity,
    metricWindow,
    onClose,
    open,
    sourceLastUpdated,
}: FrictionEvidenceBriefDrawerProps) {
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [reviewPath, setReviewPath] = useState<AnswerlatticeFrictionReviewPath>('investigate_further');

    useEffect(() => {
        if (open) setReviewPath('investigate_further');
    }, [entity?.entityId, open]);

    const brief = useMemo(() => {
        if (!entity || !metricWindow) return null;
        try {
            return buildAnswerlatticeFrictionEvidenceBrief({
                entity,
                reviewPath,
                sourceLastUpdated,
                window: metricWindow,
            });
        } catch (error) {
            logRuntimeFailure('answerlattice_friction_evidence_brief_projection_failed', error);
            return null;
        }
    }, [entity, metricWindow, reviewPath, sourceLastUpdated]);
    const reviewDestination = useMemo(() => (
        entity
            ? getAnswerlatticeFrictionReviewDestination(reviewPath, entity.entityId)
            : null
    ), [entity, reviewPath]);

    const copyBrief = async () => {
        if (!brief) return;
        try {
            await copyAnswerlatticeSupportTextToClipboard(brief.markdown, {
                fallbackFailed: 'answerlattice_friction_evidence_brief_copy_fallback_failed',
                unavailable: 'answerlattice_friction_evidence_brief_clipboard_unavailable',
            });
            message.success('Evidence brief copied.');
        } catch (error) {
            logRuntimeFailure('answerlattice_friction_evidence_brief_copy_failed', error);
            message.error('Could not copy the evidence brief.');
        }
    };

    const downloadBrief = () => {
        if (!brief || typeof document === 'undefined' || typeof URL === 'undefined') return;
        let objectUrl = '';
        let anchor: HTMLAnchorElement | null = null;
        try {
            objectUrl = URL.createObjectURL(new Blob([brief.markdown], { type: 'text/markdown;charset=utf-8' }));
            anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = brief.fileName;
            anchor.rel = 'noopener';
            document.body.appendChild(anchor);
            anchor.click();
            message.success('Evidence brief downloaded.');
        } catch (error) {
            logRuntimeFailure('answerlattice_friction_evidence_brief_download_failed', error);
            message.error('Could not download the evidence brief.');
        } finally {
            anchor?.remove();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    };

    const continueReview = () => {
        if (!reviewDestination) return;
        if (reviewDestination.kind === 'internal_route') {
            onClose();
            router.push(reviewDestination.href);
            return;
        }
        if (reviewDestination.kind === 'local_export') {
            void copyBrief();
            return;
        }
        onClose();
    };

    return (
        <Drawer
            destroyOnHidden
            onClose={onClose}
            open={open && Boolean(entity)}
            title={(
                <Space>
                    <LuFileText />
                    Friction evidence brief
                </Space>
            )}
            width="min(680px, 100vw)"
            styles={{ body: { paddingBottom: 32 } }}
        >
            {entity ? (
                <Flex vertical gap={16}>
                    <Alert
                        showIcon
                        type="info"
                        message="Evidence for owner review, not an automatic diagnosis"
                        description="Choose where this evidence should go next. The selection is included in the brief but is not saved as product truth."
                    />

                    <Flex gap={8} wrap>
                        <Tag>{entity.entityType}</Tag>
                        <Tag color="blue">{entity.last7d.queryCount} evidence events</Tag>
                        <Tag>{entity.trendDirection}</Tag>
                    </Flex>

                    <div>
                        <Text strong>Owner review path</Text>
                        <Select
                            aria-label="Owner review path"
                            onChange={(value) => {
                                if (isAnswerlatticeFrictionReviewPath(value)) setReviewPath(value);
                            }}
                            options={REVIEW_PATH_OPTIONS}
                            size="large"
                            style={{ display: 'block', marginTop: 8, minHeight: 44, width: '100%' }}
                            value={reviewPath}
                        />
                        {reviewDestination ? (
                            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                {reviewDestination.helperText}
                            </Text>
                        ) : null}
                    </div>

                    {brief ? (
                        <>
                            <Paragraph
                                style={{
                                    background: token.colorBgLayout,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    fontFamily: token.fontFamilyCode,
                                    marginBottom: 0,
                                    maxHeight: isMobile ? '48vh' : 420,
                                    overflow: 'auto',
                                    overflowWrap: 'anywhere',
                                    padding: 12,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {brief.markdown}
                            </Paragraph>

                            <Flex gap={8} vertical={isMobile}>
                                <Button
                                    block={isMobile}
                                    icon={reviewDestination?.kind === 'internal_route'
                                        ? <LuArrowRight />
                                        : reviewDestination?.kind === 'close'
                                            ? <LuX />
                                            : <LuClipboardCopy />}
                                    onClick={continueReview}
                                    style={{ minHeight: 44 }}
                                    type="primary"
                                >
                                    {reviewDestination?.actionLabel || 'Continue review'}
                                </Button>
                                {reviewDestination?.kind !== 'local_export' ? (
                                    <Button
                                        block={isMobile}
                                        icon={<LuClipboardCopy />}
                                        onClick={() => void copyBrief()}
                                        style={{ minHeight: 44 }}
                                    >
                                        Copy brief
                                    </Button>
                                ) : null}
                                <Button
                                    block={isMobile}
                                    icon={<LuDownload />}
                                    onClick={downloadBrief}
                                    style={{ minHeight: 44 }}
                                >
                                    Download Markdown
                                </Button>
                            </Flex>
                        </>
                    ) : (
                        <Alert
                            showIcon
                            type="error"
                            message="This evidence brief could not be prepared from the current snapshot."
                        />
                    )}
                </Flex>
            ) : null}
        </Drawer>
    );
}
