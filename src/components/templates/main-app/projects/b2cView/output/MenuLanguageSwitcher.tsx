import GlobalLanguagesList from '@data/languages';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';

interface MenuLanguageSwitcherProps {
    projectData: Project;
    activeLanguage: string;
    setActiveLanguage: (lang: string) => void;
    moodConfig: MenuMoodConfig;
    restoreStoredLanguage?: boolean;
    compact?: boolean;
    style?: React.CSSProperties;
}

function MenuLanguageSwitcher({
    projectData,
    activeLanguage,
    setActiveLanguage,
    moodConfig,
    restoreStoredLanguage = true,
    compact = false,
    style,
}: MenuLanguageSwitcherProps) {
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const hasMultipleLanguages = projectData.languages?.length > 1;
    const currentLangCode = activeLanguage?.toUpperCase().slice(0, 2) || 'EN';

    useEffect(() => {
        if (activeLanguage) {
            try {
                localStorage.setItem('menulist_preferred_language', activeLanguage);
            } catch {
                // Local storage may be unavailable in private browsing.
            }
        }
    }, [activeLanguage]);

    useEffect(() => {
        if (!restoreStoredLanguage) return;

        try {
            const savedLang = localStorage.getItem('menulist_preferred_language');
            if (savedLang && projectData.languages?.includes(savedLang) && savedLang !== activeLanguage) {
                setActiveLanguage(savedLang);
            }
        } catch {
            // Local storage may be unavailable in private browsing.
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData.languages, restoreStoredLanguage]);

    if (!hasMultipleLanguages) return null;

    return (
        <div
            className="relative"
            style={{
                position: 'relative',
                flex: '0 0 auto',
                ...style,
            }}
        >
            <button
                type="button"
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 rounded-lg text-sm min-h-[44px]"
                style={{
                    minHeight: 44,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: compact ? 5 : 6,
                    padding: compact ? '8px 10px' : '8px 12px',
                    borderRadius: 10,
                    background: moodConfig.itemStyle.background,
                    color: moodConfig.bodyColor,
                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                    fontFamily: moodConfig.bodyFont,
                    fontSize: 14,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Select language"
                aria-expanded={showLangDropdown}
            >
                <LuGlobe size={16} />
                <span className="font-medium">{currentLangCode}</span>
                <LuChevronDown
                    size={14}
                    className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`}
                />
            </button>

            {showLangDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9998,
                        }}
                        onClick={() => setShowLangDropdown(false)}
                    />
                    <div
                        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[120px]"
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 'calc(100% + 4px)',
                            zIndex: 9999,
                            minWidth: 140,
                            padding: 4,
                            borderRadius: 10,
                            background: moodConfig.background,
                            border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.2)',
                        }}
                    >
                        {projectData.languages?.map((lang: string) => {
                            const langInfo = GlobalLanguagesList.find(gl => gl.code === lang);
                            const isActive = lang === activeLanguage;
                            return (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => {
                                        setActiveLanguage(lang);
                                        setShowLangDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 min-h-[44px] flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    style={{
                                        width: '100%',
                                        minHeight: 44,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 12px',
                                        border: 0,
                                        borderRadius: 8,
                                        color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                        fontWeight: isActive ? 600 : 400,
                                        background: isActive ? `${moodConfig.accentColor}10` : 'transparent',
                                        fontFamily: moodConfig.bodyFont,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                    dir={langInfo?.direction || 'ltr'}
                                >
                                    <span className="text-sm">{langInfo?.nativeName || lang}</span>
                                    {langInfo?.name && langInfo.name !== langInfo.nativeName && (
                                        <span className="text-xs opacity-60">({langInfo.name})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default MenuLanguageSwitcher;
