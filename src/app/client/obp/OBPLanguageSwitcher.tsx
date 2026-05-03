'use client';

import GlobalLanguagesList from '@data/languages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import { useSearchParams } from 'next/navigation';
import styles from './obp.module.scss';

const ATTRIBUTION_PARAMS = [
    'src',
    'source',
    'entry_source',
    'utm_source',
    'utm_medium',
    'utm_campaign',
];

interface OBPLanguageSwitcherProps {
    activeLanguage: string;
    baseUrl: string;
    languages: string[];
}

export default function OBPLanguageSwitcher({
    activeLanguage,
    baseUrl,
    languages,
}: OBPLanguageSwitcherProps) {
    const searchParams = useSearchParams();
    const normalizedLanguages = Array.from(new Set(languages.filter(Boolean)));
    if (normalizedLanguages.length <= 1) return null;

    const buildLanguageHref = (languageCode: string) => {
        const languageUrl = appendPublicLanguageParam(baseUrl, languageCode);
        if (!searchParams) return languageUrl;

        try {
            const parsed = new URL(languageUrl, 'https://menulist.ai');
            ATTRIBUTION_PARAMS.forEach((key) => {
                const value = searchParams.get(key);
                if (value) parsed.searchParams.set(key, value);
            });
            return languageUrl.startsWith('/')
                ? `${parsed.pathname}${parsed.search}${parsed.hash}`
                : parsed.toString();
        } catch {
            return languageUrl;
        }
    };

    return (
        <nav className={styles.languageSwitcher} aria-label="Language">
            {normalizedLanguages.map((languageCode) => {
                const language = GlobalLanguagesList.find((entry) => entry.code === languageCode);
                const isActive = languageCode === activeLanguage;
                return (
                    <a
                        key={languageCode}
                        href={buildLanguageHref(languageCode)}
                        className={`${styles.languageOption} ${isActive ? styles.languageOptionActive : ''}`}
                        aria-current={isActive ? 'true' : undefined}
                        dir={language?.direction || 'ltr'}
                    >
                        {language?.nativeName || languageCode.toUpperCase()}
                    </a>
                );
            })}
        </nav>
    );
}
