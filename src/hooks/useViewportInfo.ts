'use client'

import { useEffect, useState } from 'react';

interface ViewportInfo {
    width: number;
    height: number;
    isLandscape: boolean;
    isCompactHandheld: boolean;
}

const HANDHELD_SHORT_EDGE_MAX = 768;
const HANDHELD_LANDSCAPE_WIDTH_MAX = 960;

function readViewportInfo(): ViewportInfo {
    if (typeof window === 'undefined') {
        return {
            width: 0,
            height: 0,
            isLandscape: false,
            isCompactHandheld: false,
        };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const shortEdge = Math.min(width, height);
    const isLandscape = width > height;
    const coarsePointer = typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false;
    const touchCapable = navigator.maxTouchPoints > 0;
    const isCompactHandheld = isLandscape
        && shortEdge < HANDHELD_SHORT_EDGE_MAX
        && width <= HANDHELD_LANDSCAPE_WIDTH_MAX
        && coarsePointer
        && touchCapable;

    return {
        width,
        height,
        isLandscape,
        isCompactHandheld,
    };
}

export default function useViewportInfo(): ViewportInfo {
    const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => readViewportInfo());

    useEffect(() => {
        const updateViewportInfo = () => {
            setViewportInfo(readViewportInfo());
        };

        updateViewportInfo();
        window.addEventListener('resize', updateViewportInfo);
        window.addEventListener('orientationchange', updateViewportInfo);

        return () => {
            window.removeEventListener('resize', updateViewportInfo);
            window.removeEventListener('orientationchange', updateViewportInfo);
        };
    }, []);

    return viewportInfo;
}
