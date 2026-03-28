'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';

import { getFormatedDateAndTime } from '@util/dateTime';
import { formatCurrency, formatProcessingTime } from '@util/formatters';
import { Button, Descriptions, Divider, Modal, Tag } from 'antd';
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
    totalCharge: number;
    createdOn: string;
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

    const renderModalContent = () => {
        if (!transaction) return null;

        const { action, processingTime, totalCharge, createdOn } = transaction;

        const basicInfo = (
            <Descriptions title="" column={1}>
                <Descriptions.Item label="Action">
                    <Tag color={action === 'image_processing' ? 'blue' : action === 'language_addition' ? 'green' : 'purple'}>
                        {action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Created On">{getFormatedDateAndTime(formatter, createdOn)}</Descriptions.Item>
                <Descriptions.Item label="Processing Time">{formatProcessingTime(processingTime)}</Descriptions.Item>
                <Descriptions.Item label="Total Charge">{formatCurrency(totalCharge, 'INR')}</Descriptions.Item>
            </Descriptions>
        );

        // Different content based on action type
        if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION || action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
            // Description generation operations
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <DescriptionDetailsView transaction={transaction} />
                </>
            );
        } else if (action === AI_ACTIONS_TYPES.LANGUAGE_ADDITION || action === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) {
            // Language operations
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <LanguageDetailsView transaction={transaction} />
                </>
            );
        } else if (action === AI_ACTIONS_TYPES.IMAGE_PROCESSING) {
            // Image processing
            return (
                <>
                    {basicInfo}
                    <Divider />
                    <ImageProcessingDetailsView transaction={transaction} />
                </>
            );
        } else {
            // Generic fallback for any other transaction type
            return basicInfo;
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
