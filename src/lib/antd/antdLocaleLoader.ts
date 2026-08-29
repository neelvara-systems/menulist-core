import type { Locale } from 'antd/es/locale';
import en_US from 'antd/locale/en_US';

type AntdLocaleModule = { default: Locale };
type AntdLocaleLoader = () => Promise<AntdLocaleModule>;

export const DEFAULT_ANTD_LOCALE = en_US;

const localeLoaders: Record<string, AntdLocaleLoader> = {
    'ar-SA': () => import('antd/es/locale/ar_EG'),
    'en-GB': () => import('antd/es/locale/en_GB'),
    'fr-FR': () => import('antd/es/locale/fr_FR'),
    'pt-BR': () => import('antd/es/locale/pt_BR'),
    'de-DE': () => import('antd/es/locale/de_DE'),
    'it-IT': () => import('antd/es/locale/it_IT'),
    'ja-JP': () => import('antd/es/locale/ja_JP'),
    'zh-CN': () => import('antd/es/locale/zh_CN'),
    'id-ID': () => import('antd/es/locale/id_ID'),
    'vi-VN': () => import('antd/es/locale/vi_VN'),
    'th-TH': () => import('antd/es/locale/th_TH'),
    'ko-KR': () => import('antd/es/locale/ko_KR'),
    'tr-TR': () => import('antd/es/locale/tr_TR'),
    'ms-MY': () => import('antd/es/locale/ms_MY'),
    'nl-NL': () => import('antd/es/locale/nl_NL'),
    'pl-PL': () => import('antd/es/locale/pl_PL'),
    'uk-UA': () => import('antd/es/locale/uk_UA'),
    'cs-CZ': () => import('antd/es/locale/cs_CZ'),
    'ro-RO': () => import('antd/es/locale/ro_RO'),
    'el-GR': () => import('antd/es/locale/el_GR'),
    'hu-HU': () => import('antd/es/locale/hu_HU'),
    'sv-SE': () => import('antd/es/locale/sv_SE'),
    'da-DK': () => import('antd/es/locale/da_DK'),
    'fi-FI': () => import('antd/es/locale/fi_FI'),
    'zh-TW': () => import('antd/es/locale/zh_TW'),
    'he-IL': () => import('antd/es/locale/he_IL'),
    'fa-IR': () => import('antd/es/locale/fa_IR'),
    'es-ES': () => import('antd/es/locale/es_ES'),
    'hi-IN': () => import('antd/es/locale/hi_IN'),
    'kn-IN': () => import('antd/es/locale/kn_IN'),
    'ml-IN': () => import('antd/es/locale/ml_IN'),
    'ne-NP': () => import('antd/es/locale/ne_NP'),
    'ta-IN': () => import('antd/es/locale/ta_IN'),
    'bn-IN': () => import('antd/es/locale/bn_BD'),
    'ur-IN': () => import('antd/es/locale/ur_PK'),
};

export function hasLazyAntdLocale(locale: string): boolean {
    return Object.hasOwn(localeLoaders, locale);
}

export async function loadAntdLocale(locale: string): Promise<Locale> {
    if (locale === 'en-US') return DEFAULT_ANTD_LOCALE;

    const loader = localeLoaders[locale];
    if (!loader) return DEFAULT_ANTD_LOCALE;

    return (await loader()).default;
}
