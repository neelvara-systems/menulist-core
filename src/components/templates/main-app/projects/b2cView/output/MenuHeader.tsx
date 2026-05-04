/**
 * Menu Page Header (New Design System)
 * 
 * Header with logo, language selector, and live indicator.
 * No Ant Design - uses Tailwind only.
 */

import LiveIndicator from '@atoms/LiveIndicator';
import { LOGO_SMALL } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuGlobe } from 'react-icons/lu';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';
import { DeviceTypes, PageType } from '../types';

interface MenuHeaderProps {
    activeDeviceType: DeviceTypes;
    projectData: Project;
    activeLanguage: string;
    setActiveLanguage: (lang: string) => void;
    setActivePage: (page: PageType) => void;
    moodConfig: MenuMoodConfig;
    restoreStoredLanguage?: boolean;
}

function MenuHeader({
    activeDeviceType,
    projectData,
    activeLanguage,
    setActiveLanguage,
    setActivePage,
    moodConfig,
    restoreStoredLanguage = true,
}: MenuHeaderProps) {
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const isMobile = activeDeviceType === 'mobile';
    const hasMultipleLanguages = projectData.languages?.length > 1;

    // Get current language info
    const currentLang = GlobalLanguagesList.find(gl => gl.code === activeLanguage);
    const currentLangCode = activeLanguage?.toUpperCase().slice(0, 2) || 'EN';

    // L3: Persist language preference to localStorage
    useEffect(() => {
        if (activeLanguage) {
            try {
                localStorage.setItem('menulist_preferred_language', activeLanguage);
            } catch (e) {
                // localStorage not available (private browsing, etc.)
            }
        }
    }, [activeLanguage]);

    // L3: Restore language preference on mount
    useEffect(() => {
        if (!restoreStoredLanguage) return;

        try {
            const savedLang = localStorage.getItem('menulist_preferred_language');
            if (savedLang && projectData.languages?.includes(savedLang) && savedLang !== activeLanguage) {
                setActiveLanguage(savedLang);
            }
        } catch (e) {
            // localStorage not available
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData.languages, restoreStoredLanguage]); // Only re-run when available languages change

    return (
        <header
            className="flex items-center justify-between py-2 md:py-3 mb-2"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: isMobile ? '8px 0 10px' : '12px 0',
                marginBottom: 10,
                borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}`,
                fontFamily: moodConfig.bodyFont,
                color: moodConfig.bodyColor,
            }}
        >
            {/* Logo — decorative only.
                G-02 (§11 PUBLIC-ROUTING-DOCTRINE): the old intro screen is
                retired from the public path (D-01), so the header logo no longer
                triggers a HOME transition. Header-logo destination for the public
                surface is handled separately per D-12 when that gap ships.
                Editor preview drives activePage via the sidebar tabs. */}
            <div
                className="flex items-center gap-2"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: '0 0 auto',
                    minWidth: 0,
                }}
            >
                <img
                    src={LOGO_SMALL}
                    alt="Logo"
                    style={{
                        height: isMobile ? 24 : 32,
                        width: 'auto',
                        display: 'block',
                    }}
                />
            </div>

            {/* Live Indicator - shows "🟢 Live · updated just now" */}
            <div
                style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <LiveIndicator
                    modifiedOn={(projectData as any)?.modifiedOn}
                    style={{
                        maxWidth: '100%',
                        fontSize: isMobile ? 11 : 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                />
            </div>

            <div
                className="flex items-center gap-3"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: '0 0 auto',
                }}
            >
                {/* Language Selector */}
                {hasMultipleLanguages && (
                    <div className="relative" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm min-h-[44px]"
                            style={{
                                minHeight: 44,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 12px',
                                borderRadius: 10,
                                background: moodConfig.itemStyle.background,
                                color: moodConfig.bodyColor,
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                fontFamily: moodConfig.bodyFont,
                                fontSize: 14,
                                cursor: 'pointer',
                            }}
                            aria-label="Select language"
                            aria-expanded={showLangDropdown}
                        >
                            <LuGlobe size={16} />
                            <span className="font-medium">{currentLangCode}</span>
                            <LuChevronDown size={14} className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
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
                )}
            </div>
        </header>
    );
}

export default MenuHeader;
