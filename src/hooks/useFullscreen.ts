import { useAppDispatch } from '@hook/useAppDispatch';
import { getMobileUiLocaleText } from '@lib/localization/mobileUiLocale';
import { toggleFullscreenMode } from '@reduxSlices/clientThemeConfig';
import { showErrorToast, showSuccessToast } from '@reduxSlices/toast';
import { useCallback, useEffect } from 'react';

export const useFullscreen = () => {
    const dispatch = useAppDispatch();

    // Reset fullscreen state on mount
    useEffect(() => {
        dispatch(toggleFullscreenMode(false));
    }, [dispatch]);

    // Listen to fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = Boolean(document.fullscreenElement);
            dispatch(toggleFullscreenMode(isFullscreen));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [dispatch]);

    const toggleFullscreen = useCallback(async () => {
        const localeText = getMobileUiLocaleText();
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                dispatch(showSuccessToast(localeText.fullscreenEnabled));
            } else {
                await document.exitFullscreen();
                dispatch(showSuccessToast(localeText.fullscreenDisabled));
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
            dispatch(showErrorToast(localeText.fullscreenUnsupported));
        }
    }, [dispatch]);

    return { toggleFullscreen };
};
