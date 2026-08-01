'use client'

import { useTranslations } from 'next-intl';
import { Card, Flex, Select, Text } from '../antd';
import { getStoreLanguageLabel } from '../utils/localizedStoreContent';

interface MobileLocalizedLanguageSelectorProps {
    helperText?: string;
    languages: string[];
    onChange: (languageCode: string) => void;
    selectedLanguage: string;
    title?: string;
}

export default function MobileLocalizedLanguageSelector({
    helperText,
    languages,
    onChange,
    selectedLanguage,
    title,
}: MobileLocalizedLanguageSelectorProps) {
    const t = useTranslations('BusinessSettings');

    if (languages.length <= 1) {
        return null;
    }

    return (
        <Card>
            <Flex gap={10} vertical>
                <Text strong>{title || t('contentLanguageTitle')}</Text>
                <Select
                    onChange={(value: string) => {
                        if (typeof value === 'string') onChange(value);
                    }}
                    options={languages.map((languageCode) => ({
                        label: getStoreLanguageLabel(languageCode),
                        value: languageCode,
                    }))}
                    value={selectedLanguage}
                />
                <Text type="secondary">{helperText || t('contentLanguageHelper')}</Text>
            </Flex>
        </Card>
    );
}
