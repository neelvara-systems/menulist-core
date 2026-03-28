import { Descriptions, Divider, Table, Typography } from 'antd';
import React from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface LanguageDetailsViewProps {
    transaction: TransactionDetails;
}

const LanguageDetailsView: React.FC<LanguageDetailsViewProps> = ({ transaction }) => {
    const { sourceLang, targetLang, inputStrings, clientResponse } = transaction;

    // Type guard for single target language
    const singleTargetLang = !Array.isArray(targetLang) ? targetLang : undefined;

    return (
        <>
            <Descriptions title="Language Information" column={1}>
                <Descriptions.Item label="Source Language">
                    {sourceLang && `${sourceLang.name} (${sourceLang.code})`}
                </Descriptions.Item>
                <Descriptions.Item label="Target Language">
                    {singleTargetLang && `${singleTargetLang.name} (${singleTargetLang.code})`}
                </Descriptions.Item>
            </Descriptions>

            {inputStrings && Object.keys(inputStrings).length > 0 && (
                <>
                    <Divider />
                    <Typography.Title level={5}>Translation Details</Typography.Title>
                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table
                            dataSource={Object.entries(inputStrings).map(([key, value]) => ({
                                key,
                                sourceKey: key,
                                sourceText: value,
                                translatedText: clientResponse?.translations?.[key] || 'N/A'
                            }))}
                            columns={[
                                { title: 'Key', dataIndex: 'sourceKey', key: 'sourceKey' },
                                { title: 'Source Text', dataIndex: 'sourceText', key: 'sourceText' },
                                { title: 'Translated Text', dataIndex: 'translatedText', key: 'translatedText' }
                            ]}
                            pagination={false}
                            size="small"
                            scroll={{ y: 300 }}
                        />
                    </div>
                </>
            )}
        </>
    );
};

export default LanguageDetailsView;
