import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '@constant/common';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export type ErrorPageThemeSettings = {
    darkMode: boolean;
    primaryColor: string;
};

export type ErrorPageThemeSource = 'global-error-boundary' | 'error-page-theme-wrapper';

const REDUX_PERSIST_STORAGE_KEY = 'persist:nextjs';

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const getOptionalThemeColor = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') return fallback;
    return value.trim().length > 0 ? value : fallback;
};

export const getDefaultErrorPageTheme = (): ErrorPageThemeSettings => ({
    darkMode: true,
    primaryColor: DEFAULT_DARK_COLOR,
});

export const readPersistedErrorPageTheme = (source: ErrorPageThemeSource): ErrorPageThemeSettings => {
    if (typeof window === 'undefined') {
        return getDefaultErrorPageTheme();
    }

    let readPhase = 'local-storage';
    let persistedState: string | null = null;
    let clientThemeConfig: string | null = null;

    try {
        persistedState = window.localStorage.getItem(REDUX_PERSIST_STORAGE_KEY);
        if (!persistedState) {
            return getDefaultErrorPageTheme();
        }

        readPhase = 'persisted-state-json';
        const parsedPersistedState = JSON.parse(persistedState);
        if (!isRecord(parsedPersistedState)) {
            throw new Error('error_page_theme_persisted_state_shape_invalid');
        }

        if (parsedPersistedState.clientThemeConfig === undefined || parsedPersistedState.clientThemeConfig === null) {
            return getDefaultErrorPageTheme();
        }

        if (typeof parsedPersistedState.clientThemeConfig !== 'string') {
            throw new Error('error_page_theme_client_theme_config_shape_invalid');
        }

        clientThemeConfig = parsedPersistedState.clientThemeConfig;
        readPhase = 'client-theme-config-json';
        const parsedThemeConfig = JSON.parse(clientThemeConfig);
        if (!isRecord(parsedThemeConfig)) {
            throw new Error('error_page_theme_client_theme_config_payload_invalid');
        }

        const darkMode = typeof parsedThemeConfig.darkMode === 'boolean'
            ? parsedThemeConfig.darkMode
            : true;

        return {
            darkMode,
            primaryColor: darkMode
                ? getOptionalThemeColor(parsedThemeConfig.darkColor, DEFAULT_DARK_COLOR)
                : getOptionalThemeColor(parsedThemeConfig.lightColor, DEFAULT_LIGHT_COLOR),
        };
    } catch (error) {
        logRuntimeFailure('error_page_theme_persisted_state_read_failed', error, {
            themeSource: source,
            readPhase,
            ...getBoundedRuntimeStringContext('persistedState', persistedState),
            ...getBoundedRuntimeStringContext('clientThemeConfig', clientThemeConfig),
        });

        return getDefaultErrorPageTheme();
    }
};
