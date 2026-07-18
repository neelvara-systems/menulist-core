import { Descriptions, Divider, Table, Typography } from 'antd';
import { formatAiOperationHistoryLanguage, getAiOperationHistoryJsonObject } from '@lib/ai/operationHistoryClientContract';
import { useTranslations } from 'next-intl';
import React from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface LanguageDetailsViewProps {
    transaction: TransactionDetails;
}

const LanguageDetailsView: React.FC<LanguageDetailsViewProps> = ({ transaction }) => {
    const t = useTranslations('Transactions');
    const { sourceLang, targetLang, targetLanguages, inputStrings, clientResponse } = transaction;
    const response = getAiOperationHistoryJsonObject(clientResponse);
    const translations = getAiOperationHistoryJsonObject(response?.translations);
    const languageSummary = getAiOperationHistoryJsonObject(transaction.languageSummary);
    const compactSourceLanguage = typeof languageSummary?.sourceLang === 'string'
        ? languageSummary.sourceLang
        : undefined;
    const resolvedTargetLanguages = targetLanguages?.length
        ? targetLanguages
        : Array.isArray(targetLang)
            ? targetLang
            : targetLang
                ? [targetLang]
                : [];

    return (
        <>
            <Descriptions title={t('languageInformation')} column={1}>
                <Descriptions.Item label={t('sourceLanguage')}>
                    {formatAiOperationHistoryLanguage(sourceLang || compactSourceLanguage) || t('notRecorded')}
                </Descriptions.Item>
                <Descriptions.Item label={t('targetLanguage')}>
                    {resolvedTargetLanguages
                        .map((language) => formatAiOperationHistoryLanguage(language))
                        .filter(Boolean)
                        .join(', ') || t('notRecorded')}
                </Descriptions.Item>
            </Descriptions>

            {inputStrings && Object.keys(inputStrings).length > 0 && (
                <>
                    <Divider />
                    <Typography.Title level={5}>{t('translationDetails')}</Typography.Title>
                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        {translations ? (
                            <Table
                                dataSource={Object.entries(inputStrings).map(([key, value]) => ({
                                    key,
                                    sourceKey: key,
                                    sourceText: value,
                                    translatedText: typeof translations[key] === 'string' ? translations[key] : t('notAvailable')
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
                        ) : (
                            <Typography.Text>{t('noTranslationRowsRecorded')}</Typography.Text>
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default LanguageDetailsView;
