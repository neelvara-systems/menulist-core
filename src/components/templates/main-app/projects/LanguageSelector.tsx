import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import { getAvailableLanguagesForMaster, getAvailableLanguagesForOutlet } from '@lib/localization/languageResolver';
import { Flex, Select, Tag, Typography, App } from 'antd';
import { useTranslations } from 'next-intl';
import { LuPlus } from 'react-icons/lu';

const { Text } = Typography;

interface LanguageSelectorProps {
    selectedLanguages: string[];
    onLanguageToggle: (updatedLanguages: string[]) => void;
    title?: string;
    description?: string;
    style?: React.CSSProperties;
    hideSelected?: boolean;
    /** Store's activeLanguages for multi-chain governance filtering */
    storeActiveLanguages?: string[];
}

export function LanguageSelector({
    selectedLanguages,
    onLanguageToggle,
    title = "",
    description = "",
    style,
    hideSelected,
    storeActiveLanguages
}: LanguageSelectorProps) {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('LanguageSelector');

    // Multi-chain governance: Filter available languages based on store settings
    const availableLanguages = storeActiveLanguages && storeActiveLanguages.length > 0
        ? getAvailableLanguagesForOutlet(GlobalLanguagesList, storeActiveLanguages, selectedLanguages)
        : getAvailableLanguagesForMaster(GlobalLanguagesList, selectedLanguages);

    const removeLanguage = (languageCode: string) => {
        const updatedLanguages = [...selectedLanguages];
        const languageIndex = updatedLanguages.indexOf(languageCode);
        if (languageIndex < 0) return;
        if (updatedLanguages.length <= 1) {
            messageApi.warning(t('atLeastOneRequired'));
            return;
        }
        updatedLanguages.splice(languageIndex, 1);
        onLanguageToggle(updatedLanguages);
    };

    return (
        <Flex vertical style={{ ...style }}>
            {title && <Text strong>{title}</Text>}
            {description && <Text type="secondary" style={{ marginBottom: 8 }}>{description}</Text>}
            <Flex gap={6} wrap="wrap" justify='center' align='center'>
                {!hideSelected && selectedLanguages.map((lang, idx) => {
                    const langData = GlobalLanguagesList.find(al => al.code === lang);
                    return (
                        <Tag
                            key={idx}
                            role="button"
                            tabIndex={0}
                            aria-label={`Remove ${langData?.name ?? lang} language`}
                            onClick={() => removeLanguage(lang)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                removeLanguage(lang);
                            }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                margin: '0px',
                                transition: 'all 0.3s'
                            }}
                        >
                            {langData?.name} ({langData?.code})
                        </Tag>
                    );
                })}

                {selectedLanguages.length < LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT && (
                    <Select<string>
                        aria-label={t('addLanguagePlaceholder')}
                        style={{ width: 200 }}
                        placeholder={t('addLanguagePlaceholder')}
                        showSearch
                        optionFilterProp="label"
                        value={null}
                        suffixIcon={<LuPlus />}
                        onChange={(value) => {
                            const newLanguage = GlobalLanguagesList.find(lang => lang.code === value);
                            if (newLanguage && !selectedLanguages.includes(value)) {
                                // Enforce MAX_LANGUAGES limit
                                if (selectedLanguages.length >= LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT) {
                                    messageApi.warning(t('maxLanguagesWarning', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT }));
                                    return;
                                }
                                const updatedLanguages = [...selectedLanguages, value];
                                onLanguageToggle(updatedLanguages);
                            }
                        }}
                        options={availableLanguages.map(lang => ({
                            label: lang.nativeName !== lang.name
                                ? `${lang.nativeName} (${lang.name})`
                                : lang.name,
                            value: lang.code
                        }))}
                    />
                )}
            </Flex>
        </Flex>
    );
}

export default LanguageSelector;
