"use client";
import { useAppSelector } from "@hook/useAppSelector";
import { isRtlLocale } from '@lib/localization/config';
import { getDarkColorState, getDarkModeState, getLightColorState, getRTLDirectionState } from '@reduxSlices/clientThemeConfig';
import { App, ConfigProvider, theme, type ThemeConfig } from "antd";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { poppinsFont } from "src/fonts/poppins";
import {
    DEFAULT_ANTD_LOCALE,
    loadAntdLocale,
} from './antdLocaleLoader';
import antdComponentTheme from "./componentTheme";
import {
    projectPersistedThemeBoolean,
    projectPersistedThemeColor,
    resolveAntdLocaleKey,
} from './themeBoundary';

const DEFAULT_APP_BORDER_RADIUS = 8;

type AntdClientProps = PropsWithChildren<{
    removeComponent?: boolean;
}>;

const AntdClient = ({ children, removeComponent = false }: AntdClientProps) => {
    const isDarkMode = projectPersistedThemeBoolean(useAppSelector(getDarkModeState));
    const lightThemeColor = projectPersistedThemeColor(useAppSelector(getLightColorState), 'light');
    const darkThemeColor = projectPersistedThemeColor(useAppSelector(getDarkColorState), 'dark');
    const isRTLDirection = projectPersistedThemeBoolean(useAppSelector(getRTLDirectionState));
    const { token } = theme.useToken();
    const appLocale = useLocale();
    const [antdLocale, setAntdLocale] = useState(DEFAULT_ANTD_LOCALE)
    const direction = isRTLDirection || isRtlLocale(appLocale) ? "rtl" : "ltr";
    const antdThemeConfig = useMemo<ThemeConfig>(() => ({
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            colorPrimary: isDarkMode ? darkThemeColor : lightThemeColor,
            borderRadius: DEFAULT_APP_BORDER_RADIUS,
            wireframe: false,
            fontSize: 13,
            fontFamily: poppinsFont.style.fontFamily
        },
        components: removeComponent ? {} : antdComponentTheme(token),
    }), [darkThemeColor, isDarkMode, lightThemeColor, removeComponent, token]);

    useEffect(() => {
        const normalizedLocale = resolveAntdLocaleKey(appLocale);
        let isCurrent = true;

        void loadAntdLocale(normalizedLocale)
            .then((selectedLocale) => {
                if (isCurrent) setAntdLocale(selectedLocale);
            })
            .catch(() => {
                if (isCurrent) setAntdLocale(DEFAULT_ANTD_LOCALE);
            });

        return () => {
            isCurrent = false;
        };
    }, [appLocale]);

    useEffect(() => {
        ConfigProvider.config({
            theme: antdThemeConfig,
            holderRender: (holderChildren) => (
                <ConfigProvider
                    direction={direction}
                    locale={antdLocale}
                    theme={antdThemeConfig}
                >
                    {holderChildren}
                </ConfigProvider>
            ),
        });
    }, [antdLocale, antdThemeConfig, direction]);

    return (
        <>
            <ConfigProvider
                direction={direction}
                locale={antdLocale}
                theme={antdThemeConfig}
            >
                <App>
                    <ConfigProvider
                        theme={{
                            token: {
                                borderRadius: DEFAULT_APP_BORDER_RADIUS,
                            }
                        }}
                    >
                        {children}
                    </ConfigProvider>
                </App>
            </ConfigProvider>
        </>
    )
}

export default AntdClient;
