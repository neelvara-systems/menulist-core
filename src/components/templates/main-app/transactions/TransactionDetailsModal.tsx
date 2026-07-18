'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';

import { formatAiOperationActionLabel, formatAiOperationCredits, getAiOperationOwnerSummary } from '@lib/ai/operationPresentation';
import type { AiOperationHistoryRow } from '@lib/ai/operationHistoryClientContract';
import { getFormatedDateAndTime } from '@util/dateTime';
import { formatInrPaise, formatNumber, formatProcessingTime } from '@util/formatters';
import { Button, Collapse, Descriptions, Divider, Modal, Tag } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import React from 'react';
import DescriptionDetailsView from './transaction-details/DescriptionDetailsView';
import ImageProcessingDetailsView from './transaction-details/ImageProcessingDetailsView';
import LanguageDetailsView from './transaction-details/LanguageDetailsView';

export type TransactionDetails = AiOperationHistoryRow;

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
    const t = useTranslations('Transactions');
    const { data: session } = useSession();
    const platformRole = session?.platformRole || session?.user.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const formatOptionalPaise = (value?: number) => (
        value === undefined || value === null ? t('notRecorded') : formatInrPaise(value)
    );

    const renderModalContent = () => {
        if (!transaction) return null;

        const { action, processingTime = 0, createdOn, unitsConsumed } = transaction;
        const consumedUnits = Number(unitsConsumed || 0);

        const basicInfo = (
            <Descriptions title="" column={1}>
                <Descriptions.Item label={t('action')}>
                    <Tag color={action === AI_ACTIONS_TYPES.IMAGE_PROCESSING
                        ? 'blue'
                        : action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
                            || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
                            || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
                            ? 'green'
                            : 'purple'}>
                        {formatAiOperationActionLabel(action, t)}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('result')}>{getAiOperationOwnerSummary(transaction, t)}</Descriptions.Item>
                <Descriptions.Item label={t('createdOn')}>{getFormatedDateAndTime(formatter, createdOn)}</Descriptions.Item>
                <Descriptions.Item label={t('processingTime')}>{formatProcessingTime(processingTime)}</Descriptions.Item>
                <Descriptions.Item label={t('creditsUsed')}>
                    {consumedUnits > 0 ? <Tag color="green">{formatAiOperationCredits(consumedUnits, t)}</Tag> : <Tag>{formatAiOperationCredits(consumedUnits, t)}</Tag>}
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
                            label: t('platformDebug'),
                            children: (
                                <>
                                    <Descriptions column={1}>
                                        <Descriptions.Item label={t('model')}>{transaction.model || t('notRecorded')}</Descriptions.Item>
                                        <Descriptions.Item label={t('tokenCreditsAudit')}>
                                            {formatNumber(Number(transaction.totalCredits || 0))}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('ownerChargeRecorded')}>
                                            {formatOptionalPaise(transaction.totalCharge)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('actualProviderCost')}>
                                            {formatOptionalPaise(transaction.realCostPaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('configuredOwnerCharge')}>
                                            {formatOptionalPaise(transaction.ourChargePaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('configuredMargin')}>
                                            {formatOptionalPaise(transaction.marginPaise)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('totalTokens')}>
                                            {formatNumber(Number(transaction.totalTokenCount || 0))}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('promptTokens')}>
                                            {formatNumber(Number(transaction.promptTokenCount || 0))}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('outputTokens')}>
                                            {formatNumber(Number(transaction.candidatesTokenCount || 0))}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={t('projectId')}>{transaction.projectId || t('notRecorded')}</Descriptions.Item>
                                        <Descriptions.Item label={t('fileId')}>{transaction.fileId || t('notRecorded')}</Descriptions.Item>
                                    </Descriptions>
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
        } else if (
            action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION
            || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION
            || action === AI_ACTIONS_TYPES.ITEM_TRANSLATION
        ) {
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
            title={t('transactionDetails')}
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    {t('close')}
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
