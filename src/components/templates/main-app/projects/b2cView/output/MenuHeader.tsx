/**
 * Menu Page Header (New Design System)
 * 
 * Operational menu header with language selector and live indicator.
 * No Ant Design - uses Tailwind only.
 */

import LiveIndicator from '@atoms/LiveIndicator';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { Project } from '../../types';
import { MenuMoodConfig } from '../designSystem';
import { DeviceTypes } from '../types';
import MenuLanguageSwitcher from './MenuLanguageSwitcher';

interface MenuHeaderProps {
    activeDeviceType: DeviceTypes;
    projectData: Project;
    activeLanguage: string;
    setActiveLanguage: (lang: string) => void;
    moodConfig: MenuMoodConfig;
    restoreStoredLanguage?: boolean;
    placement?: 'top' | 'bottom';
    showLive?: boolean;
    showLanguageSelector?: boolean;
}

function MenuHeader({
    activeDeviceType,
    projectData,
    activeLanguage,
    setActiveLanguage,
    moodConfig,
    restoreStoredLanguage = true,
    placement = 'top',
    showLive = true,
    showLanguageSelector = true,
}: MenuHeaderProps) {
    const isMobile = activeDeviceType === 'mobile';
    const isBottomPlacement = placement === 'bottom';
    const t = createPublicCustomerTranslator(activeLanguage);

    return (
        <header
            className="flex items-center justify-between py-2 md:py-3 mb-2"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: showLanguageSelector ? 'space-between' : 'center',
                gap: 12,
                padding: isBottomPlacement
                    ? (isMobile ? '10px 0' : '12px 0')
                    : (isMobile ? '8px 0 10px' : '12px 0'),
                marginBottom: isBottomPlacement ? 0 : 10,
                borderBottom: isBottomPlacement ? 'none' : `1px solid ${moodConfig.itemStyle.borderColor}`,
                fontFamily: moodConfig.bodyFont,
                color: moodConfig.bodyColor,
                flexWrap: isBottomPlacement && isMobile ? 'wrap' : 'nowrap',
            }}
        >
            {/* Live Indicator - shows "🟢 Live · updated just now" */}
            {showLive && (
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
                        activeLanguage={activeLanguage}
                        modifiedOn={projectData?.lastPublishedAt}
                        label={isBottomPlacement ? t('menu.published') : t('menu.live')}
                        style={{
                            maxWidth: '100%',
                            fontSize: isMobile ? 11 : 12,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    />
                </div>
            )}

            {showLanguageSelector && (
                <MenuLanguageSwitcher
                    projectData={projectData}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={setActiveLanguage}
                    moodConfig={moodConfig}
                    restoreStoredLanguage={restoreStoredLanguage}
                />
            )}
        </header>
    );
}

export default MenuHeader;
