'use client';

import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '@constant/common';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useEffect, useState } from 'react';
import { poppinsFont } from 'src/fonts/poppins';

/**
 * Reads theme settings directly from localStorage (Redux Persist storage)
 * This is used for error pages that render outside the normal provider hierarchy
 */
function getPersistedTheme(): { darkMode: boolean; primaryColor: string } {
    // Default values
    const defaults = { darkMode: true, primaryColor: DEFAULT_DARK_COLOR };

    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const persistedState = localStorage.getItem('persist:nextjs');
        if (!persistedState) {
            return defaults;
        }

        const parsed = JSON.parse(persistedState);
        if (!parsed.clientThemeConfig) {
            return defaults;
        }

        const themeConfig = JSON.parse(parsed.clientThemeConfig);
        return {
            darkMode: themeConfig.darkMode ?? true,
            primaryColor: themeConfig.darkMode
                ? (themeConfig.darkColor ?? DEFAULT_DARK_COLOR)
                : (themeConfig.lightColor ?? DEFAULT_LIGHT_COLOR)
        };
    } catch {
        return defaults;
    }
}

interface ErrorPageThemeWrapperProps {
    children: React.ReactNode;
}

/**
 * Theme wrapper for error pages (404, 403, 500, global-error)
 * Reads theme directly from localStorage since these pages render outside Redux providers
 */
export default function ErrorPageThemeWrapper({ children }: ErrorPageThemeWrapperProps) {
    const [themeSettings, setThemeSettings] = useState({ darkMode: true, primaryColor: DEFAULT_DARK_COLOR });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setThemeSettings(getPersistedTheme());
        setMounted(true);
    }, []);

    // Prevent flash of wrong theme
    if (!mounted) {
        return null;
    }

    // Theme-aware colors
    const bgColor = themeSettings.darkMode ? '#141414' : '#ffffff';
    const textColor = themeSettings.darkMode ? '#ffffff' : '#000000';

    return (
        <ConfigProvider
            theme={{
                algorithm: themeSettings.darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: themeSettings.primaryColor,
                    colorBgContainer: bgColor,
                    colorText: textColor,
                    borderRadius: 5,
                    wireframe: false,
                    fontSize: 13,
                    fontFamily: poppinsFont.style.fontFamily
                },
            }}
        >
            <div style={{
                minHeight: '100vh',
                backgroundColor: bgColor,
                color: textColor,
            }}>
                {children}
            </div>
        </ConfigProvider>
    );
}
