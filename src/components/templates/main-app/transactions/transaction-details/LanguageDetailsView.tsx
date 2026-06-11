import { Descriptions, Divider, Table, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface LanguageDetailsViewProps {
    transaction: TransactionDetails;
}

const LanguageDetailsView: React.FC<LanguageDetailsViewProps> = ({ transaction }) => {
    const t = useTranslations('Transactions');
    const { sourceLang, targetLang, inputStrings, clientResponse } = transaction;

    // Type guard for single target language
    const singleTargetLang = !Array.isArray(targetLang) ? targetLang : undefined;

    return (
        <>
            <Descriptions title={t('languageInformation')} column={1}>
                <Descriptions.Item label={t('sourceLanguage')}>
                    {sourceLang && `${sourceLang.name} (${sourceLang.code})`}
                </Descriptions.Item>
                <Descriptions.Item label={t('targetLanguage')}>
                    {singleTargetLang && `${singleTargetLang.name} (${singleTargetLang.code})`}
                </Descriptions.Item>
            </Descriptions>

            {inputStrings && Object.keys(inputStrings).length > 0 && (
                <>
                    <Divider />
                    <Typography.Title level={5}>{t('translationDetails')}</Typography.Title>
                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        <Table
                            dataSource={Object.entries(inputStrings).map(([key, value]) => ({
                                key,
                                sourceKey: key,
                                sourceText: value,
                                translatedText: clientResponse?.translations?.[key] || t('notAvailable')
                            }))}
                            columns={[
                                { title: t('key'), dataIndex: 'sourceKey', key: 'sourceKey' },
                                { title: t('sourceText'), dataIndex: 'sourceText', key: 'sourceText' },
                                { title: t('translatedText'), dataIndex: 'translatedText', key: 'translatedText' }
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
