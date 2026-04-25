'use client'

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface UseDeviceTypeReturn {
    deviceType: DeviceType;
    isHandheld: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    hasMounted: boolean;
}

const useDeviceType = (): UseDeviceTypeReturn => {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
    const [isHandheld, setIsHandheld] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);

        const detectHandheld = () => {
            const screenShortEdge = Math.min(window.screen.width, window.screen.height);
            const coarsePointer = typeof window.matchMedia === 'function'
                ? window.matchMedia('(pointer: coarse)').matches
                : false;
            const touchCapable = navigator.maxTouchPoints > 0;
            const userAgentDataMobile = typeof navigator !== 'undefined' && 'userAgentData' in navigator
                ? (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile
                : undefined;
            const userAgentMobile = /Android|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // Device-class detection for shell selection:
            // - keeps phones in the mobile shell when rotated
            // - avoids reclassifying a narrow desktop browser window as "mobile"
            return Boolean(userAgentDataMobile)
                || userAgentMobile
                || (coarsePointer && touchCapable && screenShortEdge < MOBILE_BREAKPOINT);
        };

        const checkDevice = () => {
            const width = window.innerWidth;
            if (width < MOBILE_BREAKPOINT) {
                setDeviceType('mobile');
            } else if (width < TABLET_BREAKPOINT) {
                setDeviceType('tablet');
            } else {
                setDeviceType('desktop');
            }

            setIsHandheld(detectHandheld());
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return {
        deviceType,
        isHandheld,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop' || deviceType === 'tablet',
        hasMounted,
    };
};

export default useDeviceType;
