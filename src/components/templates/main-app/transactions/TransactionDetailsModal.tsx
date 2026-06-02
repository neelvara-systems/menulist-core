'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';

import { formatAiOperationActionLabel, formatAiOperationCredits, getAiOperationOwnerSummary } from '@lib/ai/operationPresentation';
import { getFormatedDateAndTime, type DateLike } from '@util/dateTime';
import { formatInrPaise, formatProcessingTime } from '@util/formatters';
import { Button, Collapse, Descriptions, Divider, Modal, Tag, Typography } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import React from 'react';
import { LanguageType } from '../projects/types';
import DescriptionDetailsView from './transaction-details/DescriptionDetailsView';
import ImageProcessingDetailsView from './transaction-details/ImageProcessingDetailsView';
import LanguageDetailsView from './transaction-details/LanguageDetailsView';

export interface TransactionDetails {
    id: string;
    action: string;
    processingTime: number;
    totalCharge?: number;
    totalCredits?: number;
    unitsConsumed?: number;
    realCostPaise?: number;
    ourChargePaise?: number;
    marginPaise?: number;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    model?: string;
    fileId?: string;
    projectId?: string;
    geminiResponse?: string;
    createdOn: DateLike;
    contentLength?: "Small" | "Medium" | "Large"; // Add contentLength
    // Fields for language operations
    inputStrings?: Record<string, string>;
    targetLang?: LanguageType | LanguageType[]; // Can be single object or array
    sourceLang?: LanguageType;
    // Fields for image processing
    files?: Array<{ uid: string; name: string; type: string; url: string }>;
    targetLanguages?: LanguageType[];
    clientResponse?: any;
    // Fields for AI generation operations
    generationConfig?: any;
    itemsList?: any[];
}

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: TransactionDetails | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
    isOpen,
    onClose,
    transaction
}) => {

    const formatter = useFormatter();
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const formatOptionalPaise = (value?: number) => (
        value === undefined || value === null ? 'Not recorded' : formatInrPaise(value)
    );

    const renderModalContent = () => {
        if (!transaction) return null;

        const { action, processingTime, createdOn, unitsConsumed } = transaction;
        const consumedUnits = Number(unitsConsumed || 0);

        const basicInfo = (
            <Descriptions title="" column={1}>
                <Descriptions.Item label="Action">
                    <Tag color={action === 'image_processing' ? 'blue' : action === 'language_addition' ? 'green' : 'purple'}>
                        {formatAiOperationActionLabel(action)}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Result">{getAiOperationOwnerSummary(transaction)}</Descriptions.Item>
                <Descriptions.Item label="Created On">{getFormatedDateAndTime(formatter, createdOn)}</Descriptions.Item>
                <Descriptions.Item label="Processing Time">{formatProcessingTime(processingTime)}</Descriptions.Item>
                <Descriptions.Item label="Credits Used">
                    {consumedUnits > 0 ? <Tag color="green">{formatAiOperationCredits(consumedUnits)}</Tag> : <Tag>{formatAiOperationCredits(consumedUnits)}</Tag>}
                </Descriptions.Item>
            </Descriptions>
        );

        const platformDebugInfo = isPlatform ? (
            <>
                <Divider />
                <Collapse
                    ghost
                    items={[
                        {
                            key: 'platform-debug',
                            label: 'Platform debug',
                            children: (
                                <>
                                    <Descriptions column={1}>
                                        <Descriptions.Item label="Model">{transaction.model || 'Not recorded'}</Descriptions.Item>
                                        <Descriptions.Item label="Token Credits (Audit)">
                                            {Number(transaction.totalCredits || 0).toLocaleString()}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Owner Charge Recorded">
                                            {formatOptionalPaise(transaction.totalCharge)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Actual Provider Cost">
                                            {formatOptionalPaise(transaction.realCostPaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Configured Owner Charge">
                                            {formatOptionalPaise(transaction.ourChargePaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Configured Margin">
                                            {formatOptionalPaise(transaction.marginPaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Total Tokens">
                                            {Number(transaction.totalTokenCount || 0).toLocaleString()}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Prompt Tokens">
                                            {Number(transaction.promptTokenCount || 0).toLocaleString()}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Output Tokens">
                                            {Number(transaction.candidatesTokenCount || 0).toLocaleString()}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Project ID">{transaction.projectId || 'Not recorded'}</Descriptions.Item>
                                        <Descriptions.Item label="File ID">{transaction.fileId || 'Not recorded'}</Descriptions.Item>
                                    </Descriptions>
                                    <Typography.Text strong>Full AI transaction object</Typography.Text>
                                    <pre style={{ background: '#f5f5f5', borderRadius: 6, fontSize: 11, marginTop: 8, maxHeight: 320, overflow: 'auto', padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {JSON.stringify(transaction, null, 2)}
                                    </pre>
                                </>
                            ),
                        },
                    ]}
                />
            </>
        ) : null;

        // Different content based on action type
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
            // Description generation operations
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <DescriptionDetailsView transaction={transaction} />
                    {platformDebugInfo}
                </>
            );
        } else if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) {
            // Language operations
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <LanguageDetailsView transaction={transaction} />
                    {platformDebugInfo}
                </>
            );
        } else if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) {
            // Image processing
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <ImageProcessingDetailsView transaction={transaction} />
                    {platformDebugInfo}
                </>
            );
        } else {
            // Generic fallback for any other transaction type
            return (
                <>
                    {basicInfo}
                    {platformDebugInfo}
                </>
            );
        }
    };

    return (
        <Modal
            centered
            title="Transaction Details"
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    Close
                </Button>
            ]}
            width={800}
            styles={{ body: { maxHeight: 'calc(100vh - 250px)', overflow: 'auto', paddingRight: '16px' } }}
        >
            {renderModalContent()}
        </Modal>
    );
};

export default TransactionDetailsModal;
