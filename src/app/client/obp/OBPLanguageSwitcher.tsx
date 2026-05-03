import GlobalLanguagesList from '@data/languages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import styles from './obp.module.scss';

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
    const normalizedLanguages = Array.from(new Set(languages.filter(Boolean)));
    if (normalizedLanguages.length <= 1) return null;

    return (
        <nav className={styles.languageSwitcher} aria-label="Language">
            {normalizedLanguages.map((languageCode) => {
                const language = GlobalLanguagesList.find((entry) => entry.code === languageCode);
                const isActive = languageCode === activeLanguage;
                return (
                    <a
                        key={languageCode}
                        href={appendPublicLanguageParam(baseUrl, languageCode)}
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
