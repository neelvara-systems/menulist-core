'use client';

import GlobalLanguagesList from '@data/languages';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import { useSearchParams } from 'next/navigation';
import styles from './obp.module.scss';

const ATTRIBUTION_PARAMS = [
    'entry_source',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
];

let reportedLanguageSwitcherAttributionFailure = false;

interface OBPLanguageSwitcherProps {
    activeLanguage: string;
    ariaLabel: string;
    baseUrl: string;
    languages: string[];
}

function logLanguageSwitcherAttributionFailure(
    error: unknown,
    context: {
        baseUrl: string;
        languageCode: string;
        languageUrl: string;
        hasSearchParams: boolean;
    },
): void {
    if (reportedLanguageSwitcherAttributionFailure) return;
    reportedLanguageSwitcherAttributionFailure = true;

    logAnalyticsFailure('obp_language_switcher_attribution_preserve_failed', error, {
        ...getBoundedAnalyticsStringContext('baseUrl', context.baseUrl),
        ...getBoundedAnalyticsStringContext('languageCode', context.languageCode),
        ...getBoundedAnalyticsStringContext('languageUrl', context.languageUrl),
        attributionParamCount: ATTRIBUTION_PARAMS.length,
        hasSearchParams: context.hasSearchParams,
    });
}

export default function OBPLanguageSwitcher({
    activeLanguage,
    ariaLabel,
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
        } catch (error) {
            logLanguageSwitcherAttributionFailure(error, {
                baseUrl,
                languageCode,
                languageUrl,
                hasSearchParams: true,
            });
            return languageUrl;
        }
    };

    return (
        <nav className={styles.languageSwitcher} aria-label={ariaLabel}>
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
