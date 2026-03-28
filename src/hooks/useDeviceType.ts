'use client'

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface UseDeviceTypeReturn {
    deviceType: DeviceType;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    hasMounted: boolean;
}

const useDeviceType = (): UseDeviceTypeReturn => {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        const checkDevice = () => {
            const width = window.innerWidth;
            if (width < MOBILE_BREAKPOINT) {
                setDeviceType('mobile');
            } else if (width < TABLET_BREAKPOINT) {
                setDeviceType('tablet');
            } else {
                setDeviceType('desktop');
            }
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return {
        deviceType,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop' || deviceType === 'tablet',
        hasMounted,
    };
};

export default useDeviceType;
