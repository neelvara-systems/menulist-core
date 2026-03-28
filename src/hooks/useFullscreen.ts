import { useAppDispatch } from '@hook/useAppDispatch';
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
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                dispatch(showSuccessToast("Fullscreen mode enabled"));
            } else {
                await document.exitFullscreen();
                dispatch(showSuccessToast("Fullscreen mode disabled"));
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
            dispatch(showErrorToast("Your browser does not support fullscreen mode"));
        }
    }, [dispatch]);

    return { toggleFullscreen };
};
