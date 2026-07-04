'use client';

import { getDefaultErrorPageTheme, readPersistedErrorPageTheme } from '@lib/runtime/errorPageTheme';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useEffect, useState } from 'react';
import { poppinsFont } from 'src/fonts/poppins';

interface ErrorPageThemeWrapperProps {
    children: React.ReactNode;
}

/**
 * Theme wrapper for error pages (404, 403, 500, global-error)
 * Reads theme directly from localStorage since these pages render outside Redux providers
 */
export default function ErrorPageThemeWrapper({ children }: ErrorPageThemeWrapperProps) {
    const [themeSettings, setThemeSettings] = useState(getDefaultErrorPageTheme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setThemeSettings(readPersistedErrorPageTheme('error-page-theme-wrapper'));
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
