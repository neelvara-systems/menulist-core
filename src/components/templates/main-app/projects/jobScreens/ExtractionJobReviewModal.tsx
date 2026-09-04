'use client';

import type { ComparisonEngineOutput } from '@lib/extraction/comparisonEngine.types';
import type { ReviewPreviewState } from '@lib/extraction/reviewPreview';
import { getReviewPreviewIdentity } from '@lib/extraction/reviewPreview';
import { Modal } from 'antd';
import ExtractionJobReviewScreen from './ExtractionJobReviewScreen';

interface ExtractionJobReviewModalProps {
    open: boolean;
    projectId: string;
    jobId: string;
    tenantId: unknown;
    storeId: unknown;
    comparisonResult: ComparisonEngineOutput;
    primaryLang: string;
    onSaveComplete: (appliedChangesCount: number, appliedPreview: ReviewPreviewState) => void;
    onDiscard: () => void;
}

/**
 * ExtractionJobReviewModal
 * 
 * Modal wrapper for the ExtractionJobReviewScreen component.
 * Displayed when a re-extraction job is PREVIEW_READY and requires user approval.
 * 
 * Flow:
 * - Re-extraction completes → Job status = PREVIEW_READY
 * - Comparison engine runs on client → comparisonResult generated
 * - This modal displays the ExtractionJobReviewScreen for user to approve/reject changes
 * - User saves → onSaveComplete called → changes written to Firestore
 * - User discards → onDiscard called → job cancelled
 */
export default function ExtractionJobReviewModal({
    open,
    projectId,
    jobId,
    tenantId,
    storeId,
    comparisonResult,
    primaryLang,
    onSaveComplete,
    onDiscard,
}: ExtractionJobReviewModalProps) {
    return (
        <Modal
            destroyOnHidden
            closable={false}
            open={open}
            maskClosable={false}
            footer={null}
            width="min(1200px, calc(100vw - 32px))"
            style={{ top: 16 }}
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 132px)',
                    overflowY: 'auto',
                    padding: 0,
                },
            }}
            title="Review Extracted Changes"
        >
            <ExtractionJobReviewScreen
                key={getReviewPreviewIdentity(projectId, jobId)}
                projectId={projectId}
                jobId={jobId}
                tenantId={tenantId}
                storeId={storeId}
                comparisonResult={comparisonResult}
                primaryLang={primaryLang}
                onSaveComplete={onSaveComplete}
                onDiscard={onDiscard}
            />
        </Modal>
    );
}
