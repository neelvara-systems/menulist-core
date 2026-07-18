"use client";
import { useAppSelector } from "@hook/useAppSelector";
import { isRtlLocale } from '@lib/localization/config';
import { getDarkColorState, getDarkModeState, getLightColorState, getRTLDirectionState } from '@reduxSlices/clientThemeConfig';
import { App, ConfigProvider, theme, type ThemeConfig } from "antd";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { poppinsFont } from "src/fonts/poppins";
import antdComponentTheme from "./componentTheme";

// Import all locales statically
import ar_EG from 'antd/es/locale/ar_EG';
import bn_BD from 'antd/es/locale/bn_BD';
import cs_CZ from 'antd/es/locale/cs_CZ';
import da_DK from 'antd/es/locale/da_DK';
import de_DE from 'antd/es/locale/de_DE';
import el_GR from 'antd/es/locale/el_GR';
import es_ES from 'antd/es/locale/es_ES';
import fa_IR from 'antd/es/locale/fa_IR';
import fi_FI from 'antd/es/locale/fi_FI';
import fr_FR from 'antd/es/locale/fr_FR';
import he_IL from 'antd/es/locale/he_IL';
import hi_IN from 'antd/es/locale/hi_IN';
import hu_HU from 'antd/es/locale/hu_HU';
import id_ID from 'antd/es/locale/id_ID';
import it_IT from 'antd/es/locale/it_IT';
import ja_JP from 'antd/es/locale/ja_JP';
import kn_IN from 'antd/es/locale/kn_IN';
import ko_KR from 'antd/es/locale/ko_KR';
import ml_IN from 'antd/es/locale/ml_IN';
import ms_MY from 'antd/es/locale/ms_MY';
import ne_NP from 'antd/es/locale/ne_NP';
import nl_NL from 'antd/es/locale/nl_NL';
import pl_PL from 'antd/es/locale/pl_PL';
import pt_BR from 'antd/es/locale/pt_BR';
import ro_RO from 'antd/es/locale/ro_RO';
import sv_SE from 'antd/es/locale/sv_SE';
import ta_IN from 'antd/es/locale/ta_IN';
import th_TH from 'antd/es/locale/th_TH';
import tr_TR from 'antd/es/locale/tr_TR';
import uk_UA from 'antd/es/locale/uk_UA';
import ur_PK from 'antd/es/locale/ur_PK';
import vi_VN from 'antd/es/locale/vi_VN';
import zh_CN from 'antd/es/locale/zh_CN';
import zh_TW from 'antd/es/locale/zh_TW';
import en_GB from 'antd/locale/en_GB';
import en_US from 'antd/locale/en_US';

const DEFAULT_APP_BORDER_RADIUS = 8;

// Map of supported locales
const localeMap = {
    'ar-SA': ar_EG,
    'en-US': en_US,
    'en-GB': en_GB,
    'fr-FR': fr_FR,
    'pt-BR': pt_BR,
    'de-DE': de_DE,
    'it-IT': it_IT,
    'ja-JP': ja_JP,
    'zh-CN': zh_CN,
    'id-ID': id_ID,
    'vi-VN': vi_VN,
    'th-TH': th_TH,
    'ko-KR': ko_KR,
    'tr-TR': tr_TR,
    'ms-MY': ms_MY,
    'nl-NL': nl_NL,
    'pl-PL': pl_PL,
    'uk-UA': uk_UA,
    'cs-CZ': cs_CZ,
    'ro-RO': ro_RO,
    'el-GR': el_GR,
    'hu-HU': hu_HU,
    'sv-SE': sv_SE,
    'da-DK': da_DK,
    'fi-FI': fi_FI,
    'zh-TW': zh_TW,
    'he-IL': he_IL,
    'fa-IR': fa_IR,
    'es-ES': es_ES,
    'hi-IN': hi_IN,
    'kn-IN': kn_IN,
    'ml-IN': ml_IN,
    'ne-NP': ne_NP,
    'ta-IN': ta_IN,
    'bn-IN': bn_BD,
    'ur-IN': ur_PK,
};

const AntdClient = ({ children, removeComponent }: any) => {
    const isDarkMode = useAppSelector(getDarkModeState)
    const lightThemeColor = useAppSelector(getLightColorState)
    const darkThemeColor = useAppSelector(getDarkColorState)
    const isRTLDirection = useAppSelector(getRTLDirectionState)
    const { token } = theme.useToken();
    const appLocale = useLocale();
    const [antdLocale, setAntdLocale] = useState(en_US)
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
