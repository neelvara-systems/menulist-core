"use client";
import { useAppSelector } from "@hook/useAppSelector";
import { getDarkColorState, getDarkModeState, getLightColorState, getRTLDirectionState } from '@reduxSlices/clientThemeConfig';
import { App, ConfigProvider, theme } from "antd";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { poppinsFont } from "src/fonts/poppins";
import antdComponentTheme from "./componentTheme";

// Import all locales statically
import ar_EG from 'antd/es/locale/ar_EG';
import bn_BD from 'antd/es/locale/bn_BD';
import es_ES from 'antd/es/locale/es_ES';
import fr_FR from 'antd/es/locale/fr_FR';
import hi_IN from 'antd/es/locale/hi_IN';
import ta_IN from 'antd/es/locale/ta_IN';
import en_GB from 'antd/locale/en_GB';
import en_US from 'antd/locale/en_US';

const DEFAULT_APP_BORDER_RADIUS = 8;

// Map of supported locales
const localeMap = {
    'ar-SA': ar_EG,
    'en-US': en_US,
    'en-GB': en_GB,
    'fr-FR': fr_FR,
    'es-ES': es_ES,
    'hi-IN': hi_IN,
    'ta-IN': ta_IN,
    'bn-IN': bn_BD,
};

const AntdClient = ({ children, removeComponent }: any) => {
    const isDarkMode = useAppSelector(getDarkModeState)
    const lightThemeColor = useAppSelector(getLightColorState)
    const darkThemeColor = useAppSelector(getDarkColorState)
    const isRTLDirection = useAppSelector(getRTLDirectionState)
    const { token } = theme.useToken();
    const appLocale = useLocale();
    const [antdLocale, setAntdLocale] = useState(en_US)

    const getAntdLocale = (locale: string) => {
        // Convert locale format if needed (e.g., 'en_US' to 'en-US')
        const normalizedLocale = locale.replace('_', '-');
        const selectedLocale = localeMap[normalizedLocale] || en_US;
        setAntdLocale(selectedLocale);
    }

    useEffect(() => {
        if (appLocale) {
            getAntdLocale(appLocale);
        }
    }, [appLocale]);

    return (
        <>
            <ConfigProvider
                direction={isRTLDirection ? "rtl" : "ltr"}
                locale={antdLocale}
                theme={{
                    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        colorPrimary: isDarkMode ? darkThemeColor : lightThemeColor,
                        borderRadius: DEFAULT_APP_BORDER_RADIUS,
                        wireframe: false,
                        fontSize: 13,
                        fontFamily: poppinsFont.style.fontFamily
                    },
                    components: removeComponent ? {} : antdComponentTheme(token),
                }}
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
