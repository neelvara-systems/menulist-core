'use client'

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
    helperText = 'Choose which language you want to edit on this screen.',
    languages,
    onChange,
    selectedLanguage,
    title = 'Content language',
}: MobileLocalizedLanguageSelectorProps) {
    if (languages.length <= 1) {
        return null;
    }

    return (
        <Card>
            <Flex gap={10} vertical>
                <Text strong>{title}</Text>
                <Select
                    onChange={(value) => {
                        if (typeof value === 'string') onChange(value);
                    }}
                    options={languages.map((languageCode) => ({
                        label: getStoreLanguageLabel(languageCode),
                        value: languageCode,
                    }))}
                    value={selectedLanguage}
                />
                <Text type="secondary">{helperText}</Text>
            </Flex>
        </Card>
    );
}
