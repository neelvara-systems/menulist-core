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
}

function MenuHeader({
    activeDeviceType,
    projectData,
    activeLanguage,
    setActiveLanguage,
    setActivePage,
    moodConfig,
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
        try {
            const savedLang = localStorage.getItem('menulist_preferred_language');
            if (savedLang && projectData.languages?.includes(savedLang) && savedLang !== activeLanguage) {
                setActiveLanguage(savedLang);
            }
        } catch (e) {
            // localStorage not available
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectData.languages]); // Only re-run when available languages change

    return (
        <header
            className="flex items-center justify-between py-2 md:py-3 mb-2"
            style={{ borderBottom: `1px solid ${moodConfig.itemStyle.borderColor}` }}
        >
            {/* Logo */}
            <button
                onClick={() => setActivePage(PageType.HOME)}
                className="flex items-center gap-2"
            >
                <img
                    src={LOGO_SMALL}
                    alt="Logo"
                    style={{
                        height: isMobile ? 24 : 32,
                        width: 'auto',
                    }}
                />
            </button>

            {/* Live Indicator - shows "🟢 Live · updated just now" */}
            <LiveIndicator modifiedOn={(projectData as any)?.modifiedOn} style={{ fontSize: isMobile ? 10 : 12 }} />

            <div className="flex items-center gap-3">
                {/* Language Selector */}
                {hasMultipleLanguages && (
                    <div className="relative">
                        <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm min-h-[44px]"
                            style={{
                                background: moodConfig.itemStyle.background,
                                color: moodConfig.bodyColor,
                                border: `1px solid ${moodConfig.itemStyle.borderColor}`,
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
                                    onClick={() => setShowLangDropdown(false)}
                                />
                                <div
                                    className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[120px]"
                                    style={{
                                        background: moodConfig.background,
                                        border: `1px solid ${moodConfig.itemStyle.borderColor}`,
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
                                                    color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
                                                    fontWeight: isActive ? 600 : 400,
                                                    background: isActive ? `${moodConfig.accentColor}10` : 'transparent',
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
